-- ============================================================================
-- FINANCIAL INTEGRITY, CONSTRAINTS & TRANSACTION FUNCTIONS MIGRATION
-- HTEIM School of Ministry Portal
-- ============================================================================

-- 1. Add Unique Constraints Defensively
DO $$
BEGIN
  -- Unique constraint on invoice_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'invoices' AND constraint_name = 'unique_invoice_number'
  ) THEN
    ALTER TABLE public.invoices ADD CONSTRAINT unique_invoice_number UNIQUE (invoice_number);
  END IF;

  -- Unique constraint on payment_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'payments' AND constraint_name = 'unique_payment_number'
  ) THEN
    ALTER TABLE public.payments ADD CONSTRAINT unique_payment_number UNIQUE (payment_number);
  END IF;

  -- Unique constraint on receipt_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'payments' AND constraint_name = 'unique_receipt_number'
  ) THEN
    ALTER TABLE public.payments ADD CONSTRAINT unique_receipt_number UNIQUE (receipt_number);
  END IF;

  -- Unique constraint on adjustment_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'financial_adjustments' AND constraint_name = 'unique_adjustment_number'
  ) THEN
    ALTER TABLE public.financial_adjustments ADD CONSTRAINT unique_adjustment_number UNIQUE (adjustment_number);
  END IF;
END $$;

-- 2. Add Foreign Key Constraints Defensively
DO $$
BEGIN
  -- Foreign key refunds -> students
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'refunds' AND constraint_name = 'fk_refunds_student'
  ) THEN
    ALTER TABLE public.refunds 
      ADD CONSTRAINT fk_refunds_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;

  -- Foreign key refunds -> payments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'refunds' AND constraint_name = 'fk_refunds_payment'
  ) THEN
    ALTER TABLE public.refunds 
      ADD CONSTRAINT fk_refunds_payment FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;
  END IF;

  -- Foreign key financial_adjustments -> students
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'financial_adjustments' AND constraint_name = 'fk_financial_adjustments_student'
  ) THEN
    ALTER TABLE public.financial_adjustments 
      ADD CONSTRAINT fk_financial_adjustments_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Add CHECK Constraints for Financial Amounts and Statuses Defensively
DO $$
BEGIN
  -- CHECK constraint for invoice status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'invoices' AND constraint_name = 'chk_invoices_status'
  ) THEN
    ALTER TABLE public.invoices 
      ADD CONSTRAINT chk_invoices_status CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled', 'unpaid', 'overdue'));
  END IF;

  -- CHECK constraint for invoice amounts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'invoices' AND constraint_name = 'chk_invoices_amounts'
  ) THEN
    ALTER TABLE public.invoices 
      ADD CONSTRAINT chk_invoices_amounts CHECK (
        total_amount >= 0 AND 
        net_amount >= 0 AND 
        paid_amount >= 0 AND 
        balance_due >= 0 AND 
        discounts >= 0 AND 
        scholarships >= 0 AND 
        refunds >= 0 AND 
        adjustments >= 0
      );
  END IF;

  -- CHECK constraint for payments status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'payments' AND constraint_name = 'chk_payments_status'
  ) THEN
    ALTER TABLE public.payments 
      ADD CONSTRAINT chk_payments_status CHECK (status IN ('pending', 'completed', 'failed', 'voided', 'refunded'));
  END IF;

  -- CHECK constraint for payments amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'payments' AND constraint_name = 'chk_payments_amount'
  ) THEN
    ALTER TABLE public.payments 
      ADD CONSTRAINT chk_payments_amount CHECK (amount > 0);
  END IF;
END $$;


-- ============================================================================
-- NATIVE POSTGRESQL ATOMIC TRANSACTION FUNCTIONS (RPC)
-- ============================================================================

-- Function 1: Atomic Invoice Upsert with Lines in a Single Transaction
CREATE OR REPLACE FUNCTION public.create_invoice_transaction(p_invoice jsonb, p_lines jsonb)
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

  RETURN jsonb_build_object('status', 'success', 'invoice_id', v_invoice_id);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Invoice transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;


-- Function 2: Atomic Payment Registration with Allocations in a Single Transaction
CREATE OR REPLACE FUNCTION public.create_payment_transaction(p_payment jsonb, p_allocations jsonb)
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

  RETURN jsonb_build_object('status', 'success', 'payment_id', v_payment_id);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Payment transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;


-- Function 3: Atomic Refund Registration with Allocations in a Single Transaction
CREATE OR REPLACE FUNCTION public.create_refund_transaction(p_refund jsonb, p_allocations jsonb)
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
      id, refund_id, invoice_id, payment_allocation_id, allocated_amount, created_at
    ) VALUES (
      (v_alloc->>'id')::UUID,
      v_refund_id,
      v_inv_id,
      (v_alloc->>'payment_allocation_id')::UUID,
      (v_alloc->>'allocated_amount')::NUMERIC(10,2),
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

  RETURN jsonb_build_object('status', 'success', 'refund_id', v_refund_id);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Refund transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
