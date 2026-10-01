-- Function 1: Atomic Invoice Upsert with Lines and Audit Log in a Single Transaction
CREATE OR REPLACE FUNCTION public.create_invoice_transaction(p_invoice jsonb, p_lines jsonb, p_audit_log jsonb DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_invoice_id UUID;
  v_line jsonb;
BEGIN
  -- Extract invoice ID
  v_invoice_id := (p_invoice->>'id')::UUID;

  -- Upsert invoice header
  INSERT INTO public.invoices (
    id, invoice_number, student_id, student_name, module_track, term, academic_year, due_date, payment_plan, notes, updated_at
  ) VALUES (
    v_invoice_id,
    p_invoice->>'invoice_number',
    (p_invoice->>'student_id')::UUID,
    p_invoice->>'student_name',
    COALESCE(p_invoice->>'module_track', 'Core Ministry Curriculum'),
    COALESCE(p_invoice->>'term', '2026 Semester 1'),
    COALESCE(p_invoice->>'academic_year', '2026-2027'),
    (p_invoice->>'due_date')::DATE,
    COALESCE(p_invoice->>'payment_plan', 'Monthly Installments'),
    COALESCE(p_invoice->>'notes', ''),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    invoice_number = EXCLUDED.invoice_number,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    module_track = EXCLUDED.module_track,
    term = EXCLUDED.term,
    academic_year = EXCLUDED.academic_year,
    due_date = EXCLUDED.due_date,
    payment_plan = EXCLUDED.payment_plan,
    notes = EXCLUDED.notes,
    updated_at = NOW();

  -- Delete existing line items
  DELETE FROM public.invoice_lines WHERE invoice_id = v_invoice_id;

  -- Insert new line items from the jsonb array
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO public.invoice_lines (
      id, invoice_id, line_type, description, quantity, unit_amount, total_amount, updated_at
    ) VALUES (
      (v_line->>'id')::UUID,
      v_invoice_id,
      COALESCE(v_line->>'line_type', 'tuition'),
      COALESCE(v_line->>'description', 'Curriculum Tuition'),
      (v_line->>'quantity')::NUMERIC(10,2),
      (v_line->>'unit_amount')::NUMERIC(10,2),
      (v_line->>'total_amount')::NUMERIC(10,2),
      NOW()
    );
  END LOOP;

  -- Perform authoritative recalculation
  PERFORM public.recalculate_invoice_financials_by_uuid(v_invoice_id);

  -- Insert audit log if provided
  IF p_audit_log IS NOT NULL THEN
    INSERT INTO public.audit_history (
      audit_id, actor_user_id, actor_role, action, entity_type, entity_id,
      old_values, new_values, changed_fields, reason, ip_address, user_agent, request_id, timestamp
    ) VALUES (
      COALESCE((p_audit_log->>'audit_id')::UUID, gen_random_uuid()),
      (p_audit_log->>'actor_user_id')::UUID,
      COALESCE(p_audit_log->>'actor_role', 'system'),
      p_audit_log->>'action',
      COALESCE(p_audit_log->>'entity_type', 'unknown'),
      COALESCE(p_audit_log->>'entity_id', 'system'),
      p_audit_log->'old_values',
      p_audit_log->'new_values',
      p_audit_log->'changed_fields',
      COALESCE(p_audit_log->>'reason', ''),
      p_audit_log->>'ip_address',
      p_audit_log->>'user_agent',
      p_audit_log->>'request_id',
      COALESCE((p_audit_log->>'timestamp')::TIMESTAMPTZ, NOW())
    );
  END IF;

  RETURN jsonb_build_object('status', 'success', 'invoice_id', v_invoice_id);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Invoice transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;


-- Function 2: Atomic Payment Registration with Allocations and Audit Log in a Single Transaction
CREATE OR REPLACE FUNCTION public.create_payment_transaction(p_payment jsonb, p_allocations jsonb, p_audit_log jsonb DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_payment_id UUID;
  v_alloc jsonb;
  v_inv_id UUID;
  v_affected_invoices UUID[] := '{}';
BEGIN
  v_payment_id := (p_payment->>'id')::UUID;

  -- Insert / Upsert payment
  INSERT INTO public.payments (
    id, payment_number, receipt_number, invoice_id, student_id, student_name, amount, payment_method, transaction_reference, payment_date, status, notes, recorded_by_user_id, updated_at
  ) VALUES (
    v_payment_id,
    p_payment->>'payment_number',
    COALESCE(p_payment->>'receipt_number', p_payment->>'payment_number'),
    (p_payment->>'invoice_id')::UUID,
    (p_payment->>'student_id')::UUID,
    p_payment->>'student_name',
    (p_payment->>'amount')::NUMERIC(10,2),
    COALESCE(p_payment->>'payment_method', 'bank_transfer'),
    COALESCE(p_payment->>'transaction_reference', p_payment->>'payment_number'),
    (p_payment->>'payment_date')::DATE,
    COALESCE(p_payment->>'status', 'completed'),
    COALESCE(p_payment->>'notes', ''),
    p_payment->>'recorded_by_user_id',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    payment_number = EXCLUDED.payment_number,
    receipt_number = EXCLUDED.receipt_number,
    invoice_id = EXCLUDED.invoice_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    amount = EXCLUDED.amount,
    payment_method = EXCLUDED.payment_method,
    transaction_reference = EXCLUDED.transaction_reference,
    payment_date = EXCLUDED.payment_date,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    recorded_by_user_id = EXCLUDED.recorded_by_user_id,
    updated_at = NOW();

  -- Insert allocations from the jsonb array
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
    v_inv_id := (v_alloc->>'invoice_id')::UUID;
    
    INSERT INTO public.payment_allocations (
      id, payment_id, invoice_id, allocated_amount, notes, created_at, updated_at
    ) VALUES (
      (v_alloc->>'id')::UUID,
      v_payment_id,
      v_inv_id,
      (v_alloc->>'allocated_amount')::NUMERIC(10,2),
      COALESCE(v_alloc->>'notes', ''),
      NOW(),
      NOW()
    );

    -- Track unique affected invoice IDs to recalculate later
    IF NOT (v_inv_id = ANY(v_affected_invoices)) THEN
      v_affected_invoices := array_append(v_affected_invoices, v_inv_id);
    END IF;
  END LOOP;

  -- Recalculate affected invoices
  FOREACH v_inv_id IN ARRAY v_affected_invoices LOOP
    PERFORM public.recalculate_invoice_financials_by_uuid(v_inv_id);
  END LOOP;

  -- Insert audit log if provided
  IF p_audit_log IS NOT NULL THEN
    INSERT INTO public.audit_history (
      audit_id, actor_user_id, actor_role, action, entity_type, entity_id,
      old_values, new_values, changed_fields, reason, ip_address, user_agent, request_id, timestamp
    ) VALUES (
      COALESCE((p_audit_log->>'audit_id')::UUID, gen_random_uuid()),
      (p_audit_log->>'actor_user_id')::UUID,
      COALESCE(p_audit_log->>'actor_role', 'system'),
      p_audit_log->>'action',
      COALESCE(p_audit_log->>'entity_type', 'unknown'),
      COALESCE(p_audit_log->>'entity_id', 'system'),
      p_audit_log->'old_values',
      p_audit_log->'new_values',
      p_audit_log->'changed_fields',
      COALESCE(p_audit_log->>'reason', ''),
      p_audit_log->>'ip_address',
      p_audit_log->>'user_agent',
      p_audit_log->>'request_id',
      COALESCE((p_audit_log->>'timestamp')::TIMESTAMPTZ, NOW())
    );
  END IF;

  RETURN jsonb_build_object('status', 'success', 'payment_id', v_payment_id);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Payment transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;


-- Function 3: Atomic Refund Registration with Allocations and Audit Log in a Single Transaction
CREATE OR REPLACE FUNCTION public.create_refund_transaction(p_refund jsonb, p_allocations jsonb, p_audit_log jsonb DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_refund_id UUID;
  v_alloc jsonb;
  v_inv_id UUID;
  v_affected_invoices UUID[] := '{}';
BEGIN
  v_refund_id := (p_refund->>'id')::UUID;

  -- Insert / Upsert refund
  INSERT INTO public.refunds (
    id, refund_number, payment_id, student_id, student_name, amount, reason, status, refund_date, approved_by_user_id, notes, created_at, updated_at
  ) VALUES (
    v_refund_id,
    p_refund->>'refund_number',
    (p_refund->>'payment_id')::UUID,
    (p_refund->>'student_id')::UUID,
    p_refund->>'student_name',
    (p_refund->>'amount')::NUMERIC(10,2),
    COALESCE(p_refund->>'reason', ''),
    COALESCE(p_refund->>'status', 'approved'),
    (p_refund->>'refund_date')::DATE,
    p_refund->>'approved_by_user_id',
    COALESCE(p_refund->>'notes', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    refund_number = EXCLUDED.refund_number,
    payment_id = EXCLUDED.payment_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    amount = EXCLUDED.amount,
    reason = EXCLUDED.reason,
    status = EXCLUDED.status,
    refund_date = EXCLUDED.refund_date,
    approved_by_user_id = EXCLUDED.approved_by_user_id,
    notes = EXCLUDED.notes,
    updated_at = NOW();

  -- Insert allocations from the jsonb array
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
    v_inv_id := (v_alloc->>'invoice_id')::UUID;
    
    INSERT INTO public.refund_allocations (
      id, refund_id, invoice_id, allocated_amount, notes, created_at, updated_at
    ) VALUES (
      (v_alloc->>'id')::UUID,
      v_refund_id,
      v_inv_id,
      (v_alloc->>'allocated_amount')::NUMERIC(10,2),
      COALESCE(v_alloc->>'notes', ''),
      NOW(),
      NOW()
    );

    -- Track unique affected invoice IDs to recalculate later
    IF NOT (v_inv_id = ANY(v_affected_invoices)) THEN
      v_affected_invoices := array_append(v_affected_invoices, v_inv_id);
    END IF;
  END LOOP;

  -- Recalculate affected invoices
  FOREACH v_inv_id IN ARRAY v_affected_invoices LOOP
    PERFORM public.recalculate_invoice_financials_by_uuid(v_inv_id);
  END LOOP;

  -- Insert audit log if provided
  IF p_audit_log IS NOT NULL THEN
    INSERT INTO public.audit_history (
      audit_id, actor_user_id, actor_role, action, entity_type, entity_id,
      old_values, new_values, changed_fields, reason, ip_address, user_agent, request_id, timestamp
    ) VALUES (
      COALESCE((p_audit_log->>'audit_id')::UUID, gen_random_uuid()),
      (p_audit_log->>'actor_user_id')::UUID,
      COALESCE(p_audit_log->>'actor_role', 'system'),
      p_audit_log->>'action',
      COALESCE(p_audit_log->>'entity_type', 'unknown'),
      COALESCE(p_audit_log->>'entity_id', 'system'),
      p_audit_log->'old_values',
      p_audit_log->'new_values',
      p_audit_log->'changed_fields',
      COALESCE(p_audit_log->>'reason', ''),
      p_audit_log->>'ip_address',
      p_audit_log->>'user_agent',
      p_audit_log->>'request_id',
      COALESCE((p_audit_log->>'timestamp')::TIMESTAMPTZ, NOW())
    );
  END IF;

  RETURN jsonb_build_object('status', 'success', 'refund_id', v_refund_id);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Refund transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Atomic Adjustment Registration with Audit Log in a Single Transaction
CREATE OR REPLACE FUNCTION public.create_adjustment_transaction(p_adj jsonb, p_audit_log jsonb DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_adj_id UUID;
  v_inv_id UUID;
BEGIN
  v_adj_id := (p_adj->>'id')::UUID;
  v_inv_id := (p_adj->>'invoice_id')::UUID;

  -- Insert / Upsert adjustment
  INSERT INTO public.financial_adjustments (
    id, adjustment_number, invoice_id, student_id, student_name, adjustment_type, is_charge, amount, status, category_name, reason, receipt_or_doc_ref, authorized_by, applied_date, notes, created_at, updated_at
  ) VALUES (
    v_adj_id,
    p_adj->>'adjustment_number',
    v_inv_id,
    (p_adj->>'student_id')::UUID,
    p_adj->>'student_name',
    COALESCE(p_adj->>'adjustment_type', 'adjustment'),
    (p_adj->>'is_charge')::BOOLEAN,
    (p_adj->>'amount')::NUMERIC(10,2),
    COALESCE(p_adj->>'status', 'approved'),
    p_adj->>'category_name',
    p_adj->>'reason',
    p_adj->>'receipt_or_doc_ref',
    p_adj->>'authorized_by',
    (p_adj->>'applied_date')::DATE,
    p_adj->>'notes',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    adjustment_number = EXCLUDED.adjustment_number,
    invoice_id = EXCLUDED.invoice_id,
    student_id = EXCLUDED.student_id,
    student_name = EXCLUDED.student_name,
    adjustment_type = EXCLUDED.adjustment_type,
    is_charge = EXCLUDED.is_charge,
    amount = EXCLUDED.amount,
    status = EXCLUDED.status,
    category_name = EXCLUDED.category_name,
    reason = EXCLUDED.reason,
    receipt_or_doc_ref = EXCLUDED.receipt_or_doc_ref,
    authorized_by = EXCLUDED.authorized_by,
    applied_date = EXCLUDED.applied_date,
    notes = EXCLUDED.notes,
    updated_at = NOW();

  -- Recalculate invoice
  PERFORM public.recalculate_invoice_financials_by_uuid(v_inv_id);

  -- Insert audit log if provided
  IF p_audit_log IS NOT NULL THEN
    INSERT INTO public.audit_history (
      audit_id, actor_user_id, actor_role, action, entity_type, entity_id,
      old_values, new_values, changed_fields, reason, ip_address, user_agent, request_id, timestamp
    ) VALUES (
      COALESCE((p_audit_log->>'audit_id')::UUID, gen_random_uuid()),
      (p_audit_log->>'actor_user_id')::UUID,
      COALESCE(p_audit_log->>'actor_role', 'system'),
      p_audit_log->>'action',
      COALESCE(p_audit_log->>'entity_type', 'unknown'),
      COALESCE(p_audit_log->>'entity_id', 'system'),
      p_audit_log->'old_values',
      p_audit_log->'new_values',
      p_audit_log->'changed_fields',
      COALESCE(p_audit_log->>'reason', ''),
      p_audit_log->>'ip_address',
      p_audit_log->>'user_agent',
      p_audit_log->>'request_id',
      COALESCE((p_audit_log->>'timestamp')::TIMESTAMPTZ, NOW())
    );
  END IF;

  RETURN jsonb_build_object('status', 'success', 'adjustment_id', v_adj_id);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Adjustment transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
