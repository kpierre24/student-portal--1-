-- ============================================================================
-- FINANCIAL ARCHITECTURE REBUILD MIGRATION
-- HTEIM School of Ministry Portal
-- Hierarchy:
--   invoice -> invoice_lines
--   payment -> payment_allocation
--   refund  -> refund_allocation
--   financial_adjustment
--
-- Authoritative Balance Calculation:
--   balance = invoice total - payments - approved adjustments + applicable charges
--   (Clients cannot submit totalTuition, amountPaid, discount, refund, balance)
-- ============================================================================

-- 1. Ensure existing invoices table has all required ledger tracking columns
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS module_track TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS term TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS balance_due NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discounts NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS scholarships NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS refunds NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS adjustments NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_plan TEXT DEFAULT 'Monthly Installments';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE;

-- Ensure payments table has transaction reference and student_name
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_reference TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS recorded_by_user_id TEXT;

-- 2. Create invoice_lines table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_lines') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
      CREATE TABLE public.invoice_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
        line_type TEXT NOT NULL DEFAULT 'tuition' 
          CHECK (line_type IN ('tuition', 'mandatory_fee', 'registration', 'course_material', 'applicable_charge', 'technology_fee', 'other')),
        description TEXT NOT NULL,
        quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
        unit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (unit_amount >= 0),
        total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    ELSE
      CREATE TABLE public.invoice_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
        line_type TEXT NOT NULL DEFAULT 'tuition' 
          CHECK (line_type IN ('tuition', 'mandatory_fee', 'registration', 'course_material', 'applicable_charge', 'technology_fee', 'other')),
        description TEXT NOT NULL,
        quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
        unit_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (unit_amount >= 0),
        total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON public.invoice_lines (invoice_id);

-- Auto-calculate total_amount on invoice_lines
CREATE OR REPLACE FUNCTION public.fn_calculate_invoice_line_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount := ROUND(COALESCE(NEW.quantity, 1.00) * COALESCE(NEW.unit_amount, 0.00), 2);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_line_total ON public.invoice_lines;
CREATE TRIGGER trg_invoice_line_total
BEFORE INSERT OR UPDATE ON public.invoice_lines
FOR EACH ROW
EXECUTE FUNCTION public.fn_calculate_invoice_line_total();


-- 3. Create payment_allocations table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_allocations') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
      CREATE TABLE public.payment_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
        invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
        allocated_amount NUMERIC(10, 2) NOT NULL CHECK (allocated_amount > 0),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    ELSE
      CREATE TABLE public.payment_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id TEXT NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
        invoice_id TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
        allocated_amount NUMERIC(10, 2) NOT NULL CHECK (allocated_amount > 0),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON public.payment_allocations (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice ON public.payment_allocations (invoice_id);


-- 4. Create refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number TEXT NOT NULL UNIQUE,
  payment_id UUID,
  student_id UUID,
  student_name TEXT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'approved' 
    CHECK (status IN ('pending', 'approved', 'processed', 'void', 'rejected')),
  refund_date DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_by_user_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_student ON public.refunds (student_id);
CREATE INDEX IF NOT EXISTS idx_refunds_number ON public.refunds (refund_number);


-- 5. Create refund_allocations table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'refund_allocations') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
      CREATE TABLE public.refund_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        refund_id UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
        invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
        payment_allocation_id UUID REFERENCES public.payment_allocations(id) ON DELETE SET NULL,
        allocated_amount NUMERIC(10, 2) NOT NULL CHECK (allocated_amount > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    ELSE
      CREATE TABLE public.refund_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        refund_id UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
        invoice_id TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
        payment_allocation_id UUID REFERENCES public.payment_allocations(id) ON DELETE SET NULL,
        allocated_amount NUMERIC(10, 2) NOT NULL CHECK (allocated_amount > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_refund_allocations_refund ON public.refund_allocations (refund_id);
CREATE INDEX IF NOT EXISTS idx_refund_allocations_invoice ON public.refund_allocations (invoice_id);


-- 6. Create financial_adjustments table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_adjustments') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
      CREATE TABLE public.financial_adjustments (
        id TEXT PRIMARY KEY,
        invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
        student_id UUID,
        student_name TEXT,
        adjustment_type TEXT NOT NULL 
          CHECK (adjustment_type IN ('scholarship', 'discount', 'fee_waiver', 'applicable_charge', 'late_fee', 'administrative_credit', 'administrative_charge', 'adjustment')),
        is_charge BOOLEAN NOT NULL DEFAULT FALSE,
        amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
        status TEXT NOT NULL DEFAULT 'approved' 
          CHECK (status IN ('pending', 'approved', 'rejected', 'void')),
        category_name TEXT,
        reason TEXT,
        receipt_or_doc_ref TEXT,
        authorized_by TEXT,
        applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    ELSE
      CREATE TABLE public.financial_adjustments (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
        student_id TEXT,
        student_name TEXT,
        adjustment_type TEXT NOT NULL 
          CHECK (adjustment_type IN ('scholarship', 'discount', 'fee_waiver', 'applicable_charge', 'late_fee', 'administrative_credit', 'administrative_charge', 'adjustment')),
        is_charge BOOLEAN NOT NULL DEFAULT FALSE,
        amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
        status TEXT NOT NULL DEFAULT 'approved' 
          CHECK (status IN ('pending', 'approved', 'rejected', 'void')),
        category_name TEXT,
        reason TEXT,
        receipt_or_doc_ref TEXT,
        authorized_by TEXT,
        applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_financial_adj_invoice ON public.financial_adjustments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_financial_adj_student ON public.financial_adjustments (student_id);
CREATE INDEX IF NOT EXISTS idx_financial_adj_status ON public.financial_adjustments (status);


-- 7. Authoritative Server Balance Recalculation Engine
-- Formula: balance = invoice total - payments - approved adjustments + applicable charges
CREATE OR REPLACE FUNCTION public.recalculate_invoice_financials_by_uuid(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_invoice_total NUMERIC(10, 2) := 0.00;
  v_payments_total NUMERIC(10, 2) := 0.00;
  v_refunds_total NUMERIC(10, 2) := 0.00;
  v_net_payments NUMERIC(10, 2) := 0.00;
  v_approved_credits NUMERIC(10, 2) := 0.00;
  v_discounts NUMERIC(10, 2) := 0.00;
  v_scholarships NUMERIC(10, 2) := 0.00;
  v_applicable_charges NUMERIC(10, 2) := 0.00;
  v_balance NUMERIC(10, 2) := 0.00;
  v_due_date DATE;
  v_new_status TEXT := 'unpaid';
BEGIN
  -- 1. Invoice total from invoice lines
  SELECT COALESCE(SUM(total_amount), 0.00)
  INTO v_invoice_total
  FROM public.invoice_lines
  WHERE invoice_id = p_invoice_id;

  -- 2. Payments allocated to this invoice (completed status only)
  SELECT COALESCE(SUM(pa.allocated_amount), 0.00)
  INTO v_payments_total
  FROM public.payment_allocations pa
  JOIN public.payments p ON p.id = pa.payment_id
  WHERE pa.invoice_id = p_invoice_id
    AND p.status = 'completed'
    AND p.deleted_at IS NULL;

  -- 3. Refunds allocated to this invoice (approved / processed status)
  SELECT COALESCE(SUM(ra.allocated_amount), 0.00)
  INTO v_refunds_total
  FROM public.refund_allocations ra
  JOIN public.refunds r ON r.id = ra.refund_id
  WHERE ra.invoice_id = p_invoice_id
    AND r.status IN ('approved', 'processed');

  -- Net payments applied to the invoice
  v_net_payments := GREATEST(0.00, v_payments_total - v_refunds_total);

  -- 4. Approved credit adjustments (discounts, scholarships, fee waivers)
  SELECT 
    COALESCE(SUM(amount), 0.00),
    COALESCE(SUM(CASE WHEN adjustment_type IN ('discount', 'fee_waiver', 'administrative_credit') THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN adjustment_type = 'scholarship' THEN amount ELSE 0 END), 0.00)
  INTO v_approved_credits, v_discounts, v_scholarships
  FROM public.financial_adjustments
  WHERE invoice_id = p_invoice_id
    AND status = 'approved'
    AND is_charge = FALSE;

  -- 5. Applicable charges (late fees, incidental curriculum charges)
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_applicable_charges
  FROM public.financial_adjustments
  WHERE invoice_id = p_invoice_id
    AND status = 'approved'
    AND is_charge = TRUE;

  -- 6. Authoritative Balance Calculation:
  -- balance = invoice total - payments - approved adjustments + applicable charges
  v_balance := GREATEST(0.00, (v_invoice_total + v_applicable_charges) - v_net_payments - v_approved_credits);

  -- Fetch due date
  SELECT due_date INTO v_due_date FROM public.invoices WHERE id = p_invoice_id;

  -- Determine calculated status
  IF v_balance <= 0.00 THEN
    v_new_status := 'paid';
  ELSIF v_net_payments > 0.00 OR v_approved_credits > 0.00 THEN
    v_new_status := 'partially_paid';
  ELSIF v_due_date IS NOT NULL AND v_due_date < CURRENT_DATE THEN
    v_new_status := 'overdue';
  ELSE
    v_new_status := 'unpaid';
  END IF;

  -- Update invoice cache columns authoritatively
  UPDATE public.invoices
  SET
    total_amount = v_invoice_total,
    net_amount = GREATEST(0.00, (v_invoice_total + v_applicable_charges) - v_approved_credits),
    paid_amount = v_net_payments,
    balance_due = v_balance,
    discounts = v_discounts,
    scholarships = v_scholarships,
    refunds = v_refunds_total,
    adjustments = v_applicable_charges,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;


-- Trigger to invoke recalculation from child tables
CREATE OR REPLACE FUNCTION public.fn_trigger_recalculate_invoice_financials()
RETURNS TRIGGER AS $$
DECLARE
  v_target_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target_id := OLD.invoice_id;
  ELSE
    v_target_id := NEW.invoice_id;
  END IF;

  IF v_target_id IS NOT NULL THEN
    PERFORM public.recalculate_invoice_financials_by_uuid(v_target_id);
  END IF;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Non-blocking in case of type cast during bulk migrations
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to child tables
DROP TRIGGER IF EXISTS trg_recalc_from_invoice_lines ON public.invoice_lines;
CREATE TRIGGER trg_recalc_from_invoice_lines
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_lines
FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_recalculate_invoice_financials();

DROP TRIGGER IF EXISTS trg_recalc_from_payment_allocations ON public.payment_allocations;
CREATE TRIGGER trg_recalc_from_payment_allocations
AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocations
FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_recalculate_invoice_financials();

DROP TRIGGER IF EXISTS trg_recalc_from_refund_allocations ON public.refund_allocations;
CREATE TRIGGER trg_recalc_from_refund_allocations
AFTER INSERT OR UPDATE OR DELETE ON public.refund_allocations
FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_recalculate_invoice_financials();

DROP TRIGGER IF EXISTS trg_recalc_from_financial_adjustments ON public.financial_adjustments;
CREATE TRIGGER trg_recalc_from_financial_adjustments
AFTER INSERT OR UPDATE OR DELETE ON public.financial_adjustments
FOR EACH ROW EXECUTE FUNCTION public.fn_trigger_recalculate_invoice_financials();


-- 8. Authoritative Summary View for Realtime Dynamic Ledger Queries
CREATE OR REPLACE VIEW public.v_invoice_financial_ledger AS
SELECT
  i.id AS invoice_id,
  i.invoice_number,
  i.student_id,
  i.student_name,
  i.due_date,
  COALESCE(lines.total, 0.00) AS invoice_total,
  COALESCE(charges.total, 0.00) AS applicable_charges,
  COALESCE(pmts.total, 0.00) AS payments_allocated,
  COALESCE(refs.total, 0.00) AS refunds_allocated,
  GREATEST(0.00, COALESCE(pmts.total, 0.00) - COALESCE(refs.total, 0.00)) AS net_payments,
  COALESCE(credits.total, 0.00) AS approved_adjustments,
  COALESCE(credits.discounts, 0.00) AS approved_discounts,
  COALESCE(credits.scholarships, 0.00) AS approved_scholarships,
  -- Formula: balance = invoice total - payments - approved adjustments + applicable charges
  GREATEST(
    0.00, 
    (COALESCE(lines.total, 0.00) + COALESCE(charges.total, 0.00)) 
    - GREATEST(0.00, COALESCE(pmts.total, 0.00) - COALESCE(refs.total, 0.00)) 
    - COALESCE(credits.total, 0.00)
  ) AS calculated_balance,
  CASE
    WHEN GREATEST(
      0.00, 
      (COALESCE(lines.total, 0.00) + COALESCE(charges.total, 0.00)) 
      - GREATEST(0.00, COALESCE(pmts.total, 0.00) - COALESCE(refs.total, 0.00)) 
      - COALESCE(credits.total, 0.00)
    ) <= 0.00 THEN 'paid'
    WHEN GREATEST(0.00, COALESCE(pmts.total, 0.00) - COALESCE(refs.total, 0.00)) > 0.00 
      OR COALESCE(credits.total, 0.00) > 0.00 THEN 'partially_paid'
    WHEN i.due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'unpaid'
  END AS calculated_status
FROM public.invoices i
LEFT JOIN (
  SELECT invoice_id, SUM(total_amount) AS total
  FROM public.invoice_lines
  GROUP BY invoice_id
) lines ON lines.invoice_id = i.id
LEFT JOIN (
  SELECT pa.invoice_id, SUM(pa.allocated_amount) AS total
  FROM public.payment_allocations pa
  JOIN public.payments p ON p.id = pa.payment_id
  WHERE p.status = 'completed' AND p.deleted_at IS NULL
  GROUP BY pa.invoice_id
) pmts ON pmts.invoice_id = i.id
LEFT JOIN (
  SELECT ra.invoice_id, SUM(ra.allocated_amount) AS total
  FROM public.refund_allocations ra
  JOIN public.refunds r ON r.id = ra.refund_id
  WHERE r.status IN ('approved', 'processed')
  GROUP BY ra.invoice_id
) refs ON refs.invoice_id = i.id
LEFT JOIN (
  SELECT 
    invoice_id, 
    SUM(amount) AS total,
    SUM(CASE WHEN adjustment_type IN ('discount', 'fee_waiver', 'administrative_credit') THEN amount ELSE 0 END) AS discounts,
    SUM(CASE WHEN adjustment_type = 'scholarship' THEN amount ELSE 0 END) AS scholarships
  FROM public.financial_adjustments
  WHERE status = 'approved' AND is_charge = FALSE
  GROUP BY invoice_id
) credits ON credits.invoice_id = i.id
LEFT JOIN (
  SELECT invoice_id, SUM(amount) AS total
  FROM public.financial_adjustments
  WHERE status = 'approved' AND is_charge = TRUE
  GROUP BY invoice_id
) charges ON charges.invoice_id = i.id;


-- 9. Backfill existing legacy invoices with initial lines & allocations defensively
DO $$
BEGIN
  -- Backfill invoice lines for existing invoices without lines
  INSERT INTO public.invoice_lines (invoice_id, line_type, description, quantity, unit_amount, total_amount)
  SELECT 
    i.id, 
    'tuition', 
    COALESCE(i.notes, 'Core Ministry Curriculum Tuition'), 
    1.00, 
    COALESCE(NULLIF(i.total_amount, 0), NULLIF(i.amount_due, 0), 750.00), 
    COALESCE(NULLIF(i.total_amount, 0), NULLIF(i.amount_due, 0), 750.00)
  FROM public.invoices i
  WHERE NOT EXISTS (
    SELECT 1 FROM public.invoice_lines il WHERE il.invoice_id = i.id
  );

  -- Backfill payment allocations for existing completed payments with an invoice_id
  INSERT INTO public.payment_allocations (payment_id, invoice_id, allocated_amount, notes)
  SELECT 
    p.id, 
    p.invoice_id, 
    p.amount,
    'Auto-allocated from legacy payment record'
  FROM public.payments p
  WHERE p.invoice_id IS NOT NULL 
    AND p.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_allocations pa WHERE pa.payment_id = p.id
    );
EXCEPTION WHEN OTHERS THEN
  -- Non-blocking during fresh initialization
  RAISE NOTICE 'Legacy backfill notice: %', SQLERRM;
END $$;
