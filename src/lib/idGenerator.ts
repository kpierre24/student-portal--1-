/**
 * Authoritative ID & Database Sequence Generator
 * HTEIM School of Ministry Portal
 *
 * Rules:
 * 1. Internal IDs: Always UUID (e.g. crypto.randomUUID())
 * 2. Human-Facing Document Numbers: Database Sequences
 *    - Invoices:    INV-2026-000001
 *    - Payments:    PAY-2026-000001
 *    - Refunds:     REF-2026-000001
 *    - Adjustments: ADJ-2026-000001
 *    - Receipts:    RCP-2026-000001
 */

export type DocumentSequenceType = 'invoice' | 'payment' | 'refund' | 'adjustment' | 'receipt' | 'student';

const SEQUENCE_STORAGE_KEY = 'hteim_document_sequences';

export interface DocumentSequenceState {
  invoice: number;
  payment: number;
  refund: number;
  adjustment: number;
  receipt: number;
  student: number;
}

const PREFIX_MAP: Record<DocumentSequenceType, string> = {
  invoice: 'INV',
  payment: 'PAY',
  refund: 'REF',
  adjustment: 'ADJ',
  receipt: 'RCP',
  student: 'HTEIM'
};

/**
 * Generates an RFC-4122 compliant UUID v4 for all internal IDs.
 * Bypasses length-based or timestamp-based ID logic.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Standard RFC-4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Checks if a string conforms to the standard UUID pattern
 */
export function isUUID(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Formats a sequence number into the standard human-facing format:
 * PRE-YYYY-000001 (6 digits zero-padded)
 */
export function formatSequenceNumber(prefix: string, year: string, sequenceNumber: number): string {
  const padded = Math.max(1, sequenceNumber).toString().padStart(6, '0');
  return `${prefix.toUpperCase()}-${year}-${padded}`;
}

/**
 * Reads the current persistent sequence counters from storage
 */
export function getSequenceState(): DocumentSequenceState {
  if (typeof localStorage === 'undefined') {
    return { invoice: 1, payment: 1, refund: 1, adjustment: 1, receipt: 1, student: 1 };
  }

  const saved = localStorage.getItem(SEQUENCE_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        invoice: Number(parsed.invoice || 1),
        payment: Number(parsed.payment || 1),
        refund: Number(parsed.refund || 1),
        adjustment: Number(parsed.adjustment || 1),
        receipt: Number(parsed.receipt || 1),
        student: Number(parsed.student || 1)
      };
    } catch (e) {
      console.error('Error loading document sequences', e);
    }
  }

  // Scan existing storage to bootstrap sequences from existing max values
  return bootstrapSequencesFromExistingData();
}

/**
 * Saves current sequence state
 */
export function saveSequenceState(state: DocumentSequenceState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SEQUENCE_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Obtains the next sequence-backed human-facing document number:
 * e.g., INV-2026-000001, PAY-2026-000001, REF-2026-000001, ADJ-2026-000001, RCP-2026-000001
 */
export function getNextSequenceNumber(type: DocumentSequenceType, year: string = '2026'): string {
  const state = getSequenceState();
  const currentVal = (state[type] || 0) + 1;
  state[type] = currentVal;
  saveSequenceState(state);

  const prefix = PREFIX_MAP[type] || type.toUpperCase().slice(0, 3);
  return formatSequenceNumber(prefix, year, currentVal);
}

/**
 * Inspects existing invoices, payments, receipts, adjustments, refunds in localStorage
 * to ensure next sequence numbers start strictly above any previously existing record.
 */
function bootstrapSequencesFromExistingData(): DocumentSequenceState {
  const state: DocumentSequenceState = {
    invoice: 0,
    payment: 0,
    refund: 0,
    adjustment: 0,
    receipt: 0,
    student: 0
  };

  if (typeof localStorage === 'undefined') return state;

  try {
    // Invoices
    const rawInvoices = localStorage.getItem('hteim_student_invoices');
    if (rawInvoices) {
      const parsed = JSON.parse(rawInvoices);
      if (Array.isArray(parsed)) {
        parsed.forEach(i => {
          const num = extractSequenceNumber(i.invoiceNumber || i.id);
          if (num > state.invoice) state.invoice = num;
        });
      }
    }

    // Payments/Transactions
    const rawTx = localStorage.getItem('hteim_student_transactions');
    if (rawTx) {
      const parsed = JSON.parse(rawTx);
      if (Array.isArray(parsed)) {
        parsed.forEach(t => {
          const num = extractSequenceNumber(t.paymentNumber || t.id || t.paymentReference);
          if (num > state.payment) state.payment = num;
        });
      }
    }

    // Receipts
    const rawRc = localStorage.getItem('hteim_student_receipts');
    if (rawRc) {
      const parsed = JSON.parse(rawRc);
      if (Array.isArray(parsed)) {
        parsed.forEach(r => {
          const num = extractSequenceNumber(r.receiptNumber || r.id);
          if (num > state.receipt) state.receipt = num;
        });
      }
    }

    // Adjustments
    const rawAdj = localStorage.getItem('hteim_financial_adjustments');
    if (rawAdj) {
      const parsed = JSON.parse(rawAdj);
      if (Array.isArray(parsed)) {
        parsed.forEach(a => {
          const num = extractSequenceNumber(a.adjustmentNumber || a.id);
          if (num > state.adjustment) state.adjustment = num;
        });
      }
    }

    // Refunds
    const rawRef = localStorage.getItem('hteim_financial_refunds');
    if (rawRef) {
      const parsed = JSON.parse(rawRef);
      if (Array.isArray(parsed)) {
        parsed.forEach(r => {
          const num = extractSequenceNumber(r.refundNumber || r.id);
          if (num > state.refund) state.refund = num;
        });
      }
    }
  } catch (err) {
    console.error('Error scanning existing records for sequences', err);
  }

  saveSequenceState(state);
  return state;
}

function extractSequenceNumber(val?: string): number {
  if (!val || typeof val !== 'string') return 0;
  const match = val.match(/-(\d+)$/);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}
