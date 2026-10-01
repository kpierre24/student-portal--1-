-- ============================================================================
-- DATABASE SEQUENCES & UUID INTERNAL IDS MIGRATION
-- HTEIM School of Ministry Portal
--
-- 1. Internal IDs: Always UUID (gen_random_uuid())
-- 2. Human-Facing Document Numbers: Database Sequences
--    - Invoices:    INV-2026-000001
--    - Payments:    PAY-2026-000001
--    - Refunds:     REF-2026-000001
--    - Adjustments: ADJ-2026-000001
--    - Receipts:    RCP-2026-000001
-- ============================================================================

-- 1. Database Sequences for Human-Facing Document Numbers
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.payment_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.refund_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.adjustment_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START WITH 1 INCREMENT BY 1;

-- 2. Document Sequences Registry Table (Multi-Year & Atomic RPC Support)
CREATE TABLE IF NOT EXISTS public.document_sequences (
  sequence_type VARCHAR(50) PRIMARY KEY,
  prefix VARCHAR(10) NOT NULL,
  year VARCHAR(4) NOT NULL DEFAULT '2026',
  current_value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial sequences if not present
INSERT INTO public.document_sequences (sequence_type, prefix, year, current_value)
VALUES 
  ('invoice', 'INV', '2026', 0),
  ('payment', 'PAY', '2026', 0),
  ('refund', 'REF', '2026', 0),
  ('adjustment', 'ADJ', '2026', 0),
  ('receipt', 'RCP', '2026', 0)
ON CONFLICT (sequence_type) DO NOTHING;

-- 3. Atomic Database Sequence Generator Function
CREATE OR REPLACE FUNCTION public.get_next_document_number(p_type TEXT, p_year TEXT DEFAULT '2026')
RETURNS TEXT AS $$
DECLARE
  v_next_val BIGINT;
  v_prefix TEXT;
  v_formatted TEXT;
BEGIN
  -- Standardize prefix
  CASE LOWER(p_type)
    WHEN 'invoice' THEN v_prefix := 'INV';
    WHEN 'payment' THEN v_prefix := 'PAY';
    WHEN 'refund' THEN v_prefix := 'REF';
    WHEN 'adjustment' THEN v_prefix := 'ADJ';
    WHEN 'receipt' THEN v_prefix := 'RCP';
    ELSE v_prefix := UPPER(p_type);
  END CASE;

  -- Atomic update with row lock
  UPDATE public.document_sequences
  SET current_value = current_value + 1,
      year = COALESCE(p_year, '2026'),
      updated_at = NOW()
  WHERE sequence_type = LOWER(p_type)
  RETURNING current_value, prefix INTO v_next_val, v_prefix;

  IF NOT FOUND THEN
    v_next_val := 1;
    INSERT INTO public.document_sequences (sequence_type, prefix, year, current_value)
    VALUES (LOWER(p_type), v_prefix, COALESCE(p_year, '2026'), v_next_val);
  END IF;

  -- Format as PRE-YYYY-000001 (6 digits zero-padded)
  v_formatted := v_prefix || '-' || COALESCE(p_year, '2026') || '-' || LPAD(v_next_val::TEXT, 6, '0');
  RETURN v_formatted;
END;
$$ LANGUAGE plpgsql;

-- 4. Specific Helper Functions
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_year TEXT DEFAULT '2026')
RETURNS TEXT AS $$
BEGIN
  RETURN public.get_next_document_number('invoice', p_year);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.next_payment_number(p_year TEXT DEFAULT '2026')
RETURNS TEXT AS $$
BEGIN
  RETURN public.get_next_document_number('payment', p_year);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.next_refund_number(p_year TEXT DEFAULT '2026')
RETURNS TEXT AS $$
BEGIN
  RETURN public.get_next_document_number('refund', p_year);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.next_adjustment_number(p_year TEXT DEFAULT '2026')
RETURNS TEXT AS $$
BEGIN
  RETURN public.get_next_document_number('adjustment', p_year);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.next_receipt_number(p_year TEXT DEFAULT '2026')
RETURNS TEXT AS $$
BEGIN
  RETURN public.get_next_document_number('receipt', p_year);
END;
$$ LANGUAGE plpgsql;

-- 5. Add Human-Facing Sequence Columns to Tables if Missing
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_number TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS refund_number TEXT;
ALTER TABLE public.financial_adjustments ADD COLUMN IF NOT EXISTS adjustment_number TEXT;

-- Create indexes on document numbers
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_payments_payment_number ON public.payments (payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON public.payments (receipt_number);
CREATE INDEX IF NOT EXISTS idx_refunds_refund_number ON public.refunds (refund_number);
CREATE INDEX IF NOT EXISTS idx_financial_adjustments_adj_number ON public.financial_adjustments (adjustment_number);

-- 6. Trigger to automatically assign human-facing sequence numbers on insert if omitted
CREATE OR REPLACE FUNCTION public.trg_fn_assign_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR TRIM(NEW.invoice_number) = '' THEN
    NEW.invoice_number := public.next_invoice_number('2026');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_invoice_number ON public.invoices;
CREATE TRIGGER trg_assign_invoice_number
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_assign_invoice_number();

CREATE OR REPLACE FUNCTION public.trg_fn_assign_payment_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_number IS NULL OR TRIM(NEW.payment_number) = '' THEN
    NEW.payment_number := public.next_payment_number('2026');
  END IF;
  IF NEW.receipt_number IS NULL OR TRIM(NEW.receipt_number) = '' THEN
    NEW.receipt_number := public.next_receipt_number('2026');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_payment_number ON public.payments;
CREATE TRIGGER trg_assign_payment_number
BEFORE INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_assign_payment_number();

CREATE OR REPLACE FUNCTION public.trg_fn_assign_refund_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.refund_number IS NULL OR TRIM(NEW.refund_number) = '' THEN
    NEW.refund_number := public.next_refund_number('2026');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_refund_number ON public.refunds;
CREATE TRIGGER trg_assign_refund_number
BEFORE INSERT ON public.refunds
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_assign_refund_number();

CREATE OR REPLACE FUNCTION public.trg_fn_assign_adjustment_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.adjustment_number IS NULL OR TRIM(NEW.adjustment_number) = '' THEN
    NEW.adjustment_number := public.next_adjustment_number('2026');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_adjustment_number ON public.financial_adjustments;
CREATE TRIGGER trg_assign_adjustment_number
BEFORE INSERT ON public.financial_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_assign_adjustment_number();
