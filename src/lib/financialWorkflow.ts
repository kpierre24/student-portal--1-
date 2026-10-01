import { 
  Invoice, 
  InvoiceLine,
  PaymentTransaction, 
  Receipt, 
  PaymentRecord, 
  FinancialAdjustment, 
  FinancialAuditLog,
  FinancialAdjustmentType,
  PaymentAllocation,
  RefundRecord,
  RefundAllocation
} from '../types';
import { INITIAL_PAYMENTS } from '../data/initialPortalData';
import { MANUAL_ALIASES } from '../features/students/studentCanonicalization';
import { portalApiClient } from '../services/api/portalApiClient';
import { generateUUID, getNextSequenceNumber } from './idGenerator';

// Storage Keys
const INVOICES_STORAGE_KEY = 'hteim_student_invoices';
const TRANSACTIONS_STORAGE_KEY = 'hteim_student_transactions';
const RECEIPTS_STORAGE_KEY = 'hteim_student_receipts';
const ADJUSTMENTS_STORAGE_KEY = 'hteim_financial_adjustments';
const REFUNDS_STORAGE_KEY = 'hteim_financial_refunds';
const AUDIT_LOGS_STORAGE_KEY = 'hteim_financial_audit_logs';

/**
 * Loads all invoices from local storage or bootstraps from initial payment records.
 */
export function getInvoices(paymentRecords: PaymentRecord[] = []): Invoice[] {
  const saved = localStorage.getItem(INVOICES_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Error loading invoices from storage', e);
    }
  }

  // Bootstrap initial dataset
  const source = paymentRecords.length > 0 ? paymentRecords : INITIAL_PAYMENTS;
  const bootstrapped = bootstrapFromPaymentRecords(source);
  saveInvoices(bootstrapped.invoices);
  saveTransactions(bootstrapped.transactions);
  saveReceipts(bootstrapped.receipts);
  saveAdjustments(bootstrapped.adjustments);
  return bootstrapped.invoices;
}

export function saveInvoices(invoices: Invoice[]): void {
  localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
}

export function getTransactions(): PaymentTransaction[] {
  const saved = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error('Error loading transactions', e);
    }
  }
  return [];
}

export function saveTransactions(transactions: PaymentTransaction[]): void {
  localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
}

export function getReceipts(): Receipt[] {
  const saved = localStorage.getItem(RECEIPTS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error('Error loading receipts', e);
    }
  }
  return [];
}

export function saveReceipts(receipts: Receipt[]): void {
  localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(receipts));
}

export function getAdjustments(): FinancialAdjustment[] {
  const saved = localStorage.getItem(ADJUSTMENTS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error('Error loading financial adjustments', e);
    }
  }
  return [];
}

export function saveAdjustments(adjustments: FinancialAdjustment[]): void {
  localStorage.setItem(ADJUSTMENTS_STORAGE_KEY, JSON.stringify(adjustments));
}

export function getRefunds(): RefundRecord[] {
  const saved = localStorage.getItem(REFUNDS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error('Error loading refunds', e);
    }
  }
  return [];
}

export function saveRefunds(refunds: RefundRecord[]): void {
  localStorage.setItem(REFUNDS_STORAGE_KEY, JSON.stringify(refunds));
}

export function getAuditLogs(): FinancialAuditLog[] {
  const saved = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error('Error loading audit logs', e);
    }
  }
  return [];
}

export function saveAuditLogs(logs: FinancialAuditLog[]): void {
  localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs));
}

export function logFinancialAudit(log: Omit<FinancialAuditLog, 'id' | 'timestamp'>): FinancialAuditLog {
  const logs = getAuditLogs();
  const newLog: FinancialAuditLog = {
    id: generateUUID(),
    timestamp: new Date().toISOString(),
    ...log
  };
  logs.unshift(newLog);
  saveAuditLogs(logs);
  return newLog;
}

/**
 * Core Authoritative Financial Ledger Calculation Engine:
 *
 *   balance =
 *     invoice total
 *     - payments
 *     - approved adjustments
 *     + applicable charges
 *
 * Hierarchy:
 *   invoice -> invoice_lines
 *   payment -> payment_allocation
 *   refund  -> refund_allocation
 *   financial_adjustment
 */
export function recalculateInvoiceLedger(
  invoice: Invoice,
  transactions: PaymentTransaction[] = getTransactions(),
  adjustments: FinancialAdjustment[] = getAdjustments(),
  refunds: RefundRecord[] = getRefunds()
): Invoice {
  // 1. Calculate invoice total from invoice_lines
  let invoiceTotal = 0;
  if (Array.isArray(invoice.lines) && invoice.lines.length > 0) {
    invoiceTotal = invoice.lines.reduce((acc, line) => {
      const lineTotal = Number(line.totalAmount ?? (Number(line.quantity || 1) * Number(line.unitAmount || 0)));
      return acc + (isNaN(lineTotal) ? 0 : lineTotal);
    }, 0);
  } else {
    invoiceTotal = Number(invoice.totalTuition || 750);
  }

  // 2. Payments allocated to this invoice (completed status only)
  const invoiceTransactions = transactions.filter(
    t => (t.invoiceId === invoice.id || t.allocations?.some(a => a.invoiceId === invoice.id)) && t.status === 'Completed'
  );

  const totalPaid = invoiceTransactions.reduce((acc, t) => {
    if (t.allocations && t.allocations.length > 0) {
      const alloc = t.allocations.find(a => a.invoiceId === invoice.id);
      return acc + (alloc ? Number(alloc.allocatedAmount || 0) : 0);
    }
    return acc + Number(t.amount || 0);
  }, 0);

  // 3. Refunds allocated to this invoice (approved / processed only)
  const invoiceRefunds = refunds.filter(
    r => (r.status === 'approved' || r.status === 'processed') &&
      r.allocations?.some(a => a.invoiceId === invoice.id)
  );

  const totalRefundsFromRecords = invoiceRefunds.reduce((acc, r) => {
    const alloc = r.allocations?.find(a => a.invoiceId === invoice.id);
    return acc + (alloc ? Number(alloc.allocatedAmount || 0) : 0);
  }, 0);

  // Also include legacy refund adjustment entries
  const refundAdjustments = adjustments.filter(
    a => a.invoiceId === invoice.id && a.type === 'refund' && a.status !== 'rejected' && a.status !== 'void'
  );
  const totalRefundsFromAdjustments = refundAdjustments.reduce((acc, a) => acc + Number(a.amount || 0), 0);
  const totalRefunds = totalRefundsFromRecords + totalRefundsFromAdjustments;

  // Net payments applied to this invoice
  const netPayments = Math.max(0, totalPaid - totalRefunds);

  // 4. Approved adjustments: credits (discounts, scholarships, fee waivers) and charges (late fee, applicable charges)
  const invoiceAdjustments = adjustments.filter(
    a => a.invoiceId === invoice.id && a.type !== 'refund' && a.status !== 'rejected' && a.status !== 'void'
  );

  let discounts = 0;
  let scholarships = 0;
  let applicableCharges = 0;

  invoiceAdjustments.forEach(adj => {
    const amt = Number(adj.amount || 0);
    if (isNaN(amt) || amt <= 0) return;

    if (adj.isCharge === true || adj.type === 'applicable_charge' || adj.type === 'late_fee') {
      applicableCharges += amt;
    } else if (adj.type === 'scholarship') {
      scholarships += amt;
    } else {
      // discount, fee_waiver, adjustment
      discounts += amt;
    }
  });

  const approvedAdjustments = discounts + scholarships;

  // 5. Authoritative Balance Calculation:
  // balance = invoice total - payments - approved adjustments + applicable charges
  const netTuition = Math.max(0, (invoiceTotal + applicableCharges) - approvedAdjustments);
  const outstandingBalance = Math.max(0, (invoiceTotal + applicableCharges) - netPayments - approvedAdjustments);

  // Status computation
  let status: Invoice['status'] = 'Unpaid';
  if (outstandingBalance <= 0) {
    status = 'Paid';
  } else if (netPayments > 0 || approvedAdjustments > 0) {
    status = 'Partially Paid';
  } else if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
    status = 'Past Due';
  }

  return {
    ...invoice,
    totalTuition: invoiceTotal,
    applicableCharges,
    discounts,
    scholarships,
    refunds: totalRefunds,
    adjustments: applicableCharges,
    netTuition,
    amountPaid: netPayments,
    outstandingBalance,
    status,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Record a payment with payment_allocation:
 * payment -> payment_allocation
 * Recalculates balance authoritatively.
 */
export function recordPaymentTransaction(params: {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentReference?: string;
  paymentDate?: string;
  notes?: string;
  recordedBy?: string;
  actorRole?: string;
}): { transaction: PaymentTransaction; receipt: Receipt; updatedInvoice: Invoice } {
  const invoices = getInvoices();
  const transactions = getTransactions();
  const receipts = getReceipts();
  const adjustments = getAdjustments();
  const refunds = getRefunds();

  const invoiceIndex = invoices.findIndex(i => i.id === params.invoiceId || (i.invoiceNumber && i.invoiceNumber === params.invoiceId));
  if (invoiceIndex === -1) {
    throw new Error(`Invoice not found: ${params.invoiceId}`);
  }

  const invoice = invoices[invoiceIndex];
  const paymentDate = params.paymentDate || new Date().toISOString().split('T')[0];
  const transactionId = generateUUID(); // UUID internal ID
  const paymentNumber = getNextSequenceNumber('payment'); // Database sequence: PAY-2026-000001
  const receiptNumber = getNextSequenceNumber('receipt'); // Database sequence: RCP-2026-000001
  const verificationCode = `HTEIM-VERIFY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // 1. Create Payment Transaction with allocation
  const allocation: PaymentAllocation = {
    id: generateUUID(), // UUID internal ID
    paymentId: transactionId,
    invoiceId: invoice.id,
    allocatedAmount: Number(params.amount),
    notes: params.notes || 'Institutional tuition payment allocation'
  };

  const newTransaction: PaymentTransaction = {
    id: transactionId,
    paymentNumber,
    invoiceId: invoice.id,
    studentName: invoice.studentName,
    studentId: invoice.studentId,
    amount: Number(params.amount),
    paymentDate,
    paymentMethod: params.paymentMethod,
    paymentReference: params.paymentReference || paymentNumber,
    receiptNumber,
    status: 'Completed',
    allocations: [allocation],
    notes: params.notes || '',
    recordedBy: params.recordedBy || 'Finance Office',
    reconciliationStatus: 'Unreconciled',
    createdAt: new Date().toISOString()
  };
  transactions.unshift(newTransaction);
  saveTransactions(transactions);

  // 2. Authoritative Recalculation Engine:
  // balance = invoice total - payments - approved adjustments + applicable charges
  const updatedInvoice = recalculateInvoiceLedger(invoice, transactions, adjustments, refunds);
  invoices[invoiceIndex] = updatedInvoice;
  saveInvoices(invoices);

  // 3. Generate Official Receipt
  const newReceipt: Receipt = {
    id: generateUUID(), // UUID internal ID
    receiptNumber,
    paymentId: newTransaction.id,
    invoiceId: invoice.id,
    studentName: invoice.studentName,
    studentId: invoice.studentId,
    amountPaid: newTransaction.amount,
    paymentDate,
    paymentMethod: newTransaction.paymentMethod,
    paymentReference: newTransaction.paymentReference,
    issuedAt: new Date().toISOString(),
    issuedBy: params.recordedBy || 'Bursar & Finance Office',
    academicTerm: invoice.term || '2026 Semester 1',
    courseOrModule: invoice.moduleTrack,
    totalTuitionBilled: updatedInvoice.totalTuition,
    discountsAndScholarships: updatedInvoice.discounts + updatedInvoice.scholarships,
    balanceRemaining: updatedInvoice.outstandingBalance,
    verificationCode,
    notes: params.notes || 'Institutional Official Tuition Receipt'
  };
  receipts.unshift(newReceipt);
  saveReceipts(receipts);

  // 4. Audit Log
  logFinancialAudit({
    action: 'PAYMENT_RECORDED',
    actorName: params.recordedBy || 'Finance Bursar',
    actorRole: params.actorRole || 'finance_officer',
    studentId: invoice.studentId,
    studentName: invoice.studentName,
    entityId: newTransaction.id,
    entityType: 'transaction',
    amount: newTransaction.amount,
    details: `Posted payment of $${newTransaction.amount} via ${newTransaction.paymentMethod} (Receipt: ${receiptNumber}, Ref: ${newTransaction.paymentReference}) for invoice ${invoice.id}. Server recomputed balance: $${updatedInvoice.outstandingBalance}.`
  });

  // 5. Asynchronous server synchronization (Relational Supabase Tables)
  // Does NOT submit calculated balances; server calculates them!
  portalApiClient.recordPayment({
    id: newTransaction.id,
    invoiceId: invoice.id,
    studentId: invoice.studentId,
    studentName: invoice.studentName,
    amount: newTransaction.amount,
    paymentMethod: newTransaction.paymentMethod,
    paymentDate: newTransaction.paymentDate,
    reference: newTransaction.paymentReference,
    notes: newTransaction.notes,
    allocations: [{
      invoiceId: invoice.id,
      allocatedAmount: newTransaction.amount
    }]
  }).catch((err) => {
    console.warn('Background server payment sync notice:', err.message);
  });

  return { transaction: newTransaction, receipt: newReceipt, updatedInvoice };
}

/**
 * Apply a financial adjustment (Scholarship, Discount, Fee Waiver, Applicable Charge, Late Fee)
 * Updates the financial ledger and recalculates balance authoritatively.
 */
export function applyFinancialAdjustment(params: {
  invoiceId: string;
  type: FinancialAdjustmentType;
  categoryName: string;
  amount: number;
  authorizedBy: string;
  actorRole?: string;
  notes?: string;
  receiptOrDocRef?: string;
  isCharge?: boolean;
}): { adjustment: FinancialAdjustment; updatedInvoice: Invoice } {
  const invoices = getInvoices();
  const adjustments = getAdjustments();
  const transactions = getTransactions();
  const refunds = getRefunds();

  const invoiceIndex = invoices.findIndex(i => i.id === params.invoiceId || (i.invoiceNumber && i.invoiceNumber === params.invoiceId));
  if (invoiceIndex === -1) {
    throw new Error(`Invoice not found: ${params.invoiceId}`);
  }

  const invoice = invoices[invoiceIndex];
  const adjId = generateUUID(); // UUID internal ID
  const adjustmentNumber = getNextSequenceNumber('adjustment'); // Database sequence: ADJ-2026-000001
  const isCharge = params.isCharge === true || params.type === 'applicable_charge' || params.type === 'late_fee';

  const newAdjustment: FinancialAdjustment = {
    id: adjId,
    adjustmentNumber,
    invoiceId: invoice.id,
    studentId: invoice.studentId,
    studentName: invoice.studentName,
    type: params.type,
    isCharge,
    categoryName: params.categoryName,
    amount: Number(params.amount),
    status: 'approved',
    appliedDate: new Date().toISOString().split('T')[0],
    authorizedBy: params.authorizedBy,
    notes: params.notes || '',
    receiptOrDocRef: params.receiptOrDocRef,
    createdAt: new Date().toISOString()
  };

  adjustments.unshift(newAdjustment);
  saveAdjustments(adjustments);

  // Authoritative Recalculation Engine:
  // balance = invoice total - payments - approved adjustments + applicable charges
  const updatedInvoice = recalculateInvoiceLedger(invoice, transactions, adjustments, refunds);
  invoices[invoiceIndex] = updatedInvoice;
  saveInvoices(invoices);

  // Audit
  logFinancialAudit({
    action: isCharge ? 'CHARGE_APPLIED' : params.type === 'scholarship' ? 'SCHOLARSHIP_AWARDED' : params.type === 'refund' ? 'REFUND_ISSUED' : 'ADJUSTMENT_APPLIED',
    actorName: params.authorizedBy,
    actorRole: params.actorRole || 'finance_officer',
    studentId: invoice.studentId,
    studentName: invoice.studentName,
    entityId: newAdjustment.id,
    entityType: 'adjustment',
    amount: newAdjustment.amount,
    details: `Applied ${params.type.toUpperCase()} of $${newAdjustment.amount} (${params.categoryName}) to Invoice ${invoice.id}. Recomputed balance: $${updatedInvoice.outstandingBalance}.`
  });

  // Asynchronous server synchronization (Supabase tables)
  portalApiClient.applyFinancialAdjustment({
    id: newAdjustment.id,
    invoiceId: invoice.id,
    studentId: invoice.studentId,
    studentName: invoice.studentName,
    type: newAdjustment.type,
    isCharge: newAdjustment.isCharge,
    categoryName: newAdjustment.categoryName,
    amount: newAdjustment.amount,
    authorizedBy: newAdjustment.authorizedBy,
    notes: newAdjustment.notes,
    receiptOrDocRef: newAdjustment.receiptOrDocRef
  }).catch((err) => {
    console.warn('Background server adjustment sync notice:', err.message);
  });

  return { adjustment: newAdjustment, updatedInvoice };
}

/**
 * Record a refund with refund_allocation:
 * refund -> refund_allocation
 * Reduces payments, which recalculates the authoritative balance.
 */
export function recordRefundTransaction(params: {
  invoiceId: string;
  paymentId?: string;
  amount: number;
  reason: string;
  authorizedBy: string;
  notes?: string;
}): { refund: RefundRecord; updatedInvoice: Invoice } {
  const invoices = getInvoices();
  const refunds = getRefunds();
  const transactions = getTransactions();
  const adjustments = getAdjustments();

  const invoiceIndex = invoices.findIndex(i => i.id === params.invoiceId || (i.invoiceNumber && i.invoiceNumber === params.invoiceId));
  if (invoiceIndex === -1) {
    throw new Error(`Invoice not found: ${params.invoiceId}`);
  }

  const invoice = invoices[invoiceIndex];
  const refundId = generateUUID(); // UUID internal ID
  const refundNumber = getNextSequenceNumber('refund'); // Database sequence: REF-2026-000001

  const allocation: RefundAllocation = {
    id: generateUUID(), // UUID internal ID
    refundId,
    invoiceId: invoice.id,
    allocatedAmount: Number(params.amount)
  };

  const newRefund: RefundRecord = {
    id: refundId,
    refundNumber,
    paymentId: params.paymentId,
    studentId: invoice.studentId,
    studentName: invoice.studentName,
    amount: Number(params.amount),
    reason: params.reason,
    status: 'approved',
    refundDate: new Date().toISOString().split('T')[0],
    approvedBy: params.authorizedBy,
    notes: params.notes || '',
    allocations: [allocation],
    createdAt: new Date().toISOString()
  };

  refunds.unshift(newRefund);
  saveRefunds(refunds);

  // Authoritative recalculation
  const updatedInvoice = recalculateInvoiceLedger(invoice, transactions, adjustments, refunds);
  invoices[invoiceIndex] = updatedInvoice;
  saveInvoices(invoices);

  logFinancialAudit({
    action: 'REFUND_ISSUED',
    actorName: params.authorizedBy,
    actorRole: 'admin',
    studentId: invoice.studentId,
    studentName: invoice.studentName,
    entityId: newRefund.id,
    entityType: 'refund',
    amount: newRefund.amount,
    details: `Processed refund of $${newRefund.amount} for invoice ${invoice.id}. Reason: ${params.reason}. Recomputed balance: $${updatedInvoice.outstandingBalance}.`
  });

  // Asynchronous server sync
  portalApiClient.recordRefund({
    id: newRefund.id,
    refundNumber: newRefund.refundNumber,
    paymentId: newRefund.paymentId,
    studentId: newRefund.studentId,
    studentName: newRefund.studentName,
    amount: newRefund.amount,
    reason: newRefund.reason,
    allocations: [allocation]
  }).catch((err) => {
    console.warn('Background server refund sync notice:', err.message);
  });

  return { refund: newRefund, updatedInvoice };
}

/**
 * Reconcile a transaction with bank or gateway record
 */
export function reconcilePayment(params: {
  transactionId: string;
  status: 'Reconciled' | 'Discrepancy' | 'Unreconciled';
  depositBatchId?: string;
  reconciledBy: string;
  notes?: string;
}): PaymentTransaction {
  const transactions = getTransactions();
  const txIndex = transactions.findIndex(t => t.id === params.transactionId);
  if (txIndex === -1) {
    throw new Error(`Transaction not found: ${params.transactionId}`);
  }

  const tx = transactions[txIndex];
  const updatedTx: PaymentTransaction = {
    ...tx,
    reconciliationStatus: params.status,
    depositBatchId: params.depositBatchId || tx.depositBatchId,
    reconciledBy: params.reconciledBy,
    reconciledAt: new Date().toISOString(),
    notes: params.notes ? `${tx.notes ? tx.notes + ' | ' : ''}Reconciliation Note: ${params.notes}` : tx.notes
  };

  transactions[txIndex] = updatedTx;
  saveTransactions(transactions);

  logFinancialAudit({
    action: 'PAYMENT_RECONCILED',
    actorName: params.reconciledBy,
    actorRole: 'finance_admin',
    studentId: tx.studentId,
    studentName: tx.studentName,
    entityId: tx.id,
    entityType: 'transaction',
    amount: tx.amount,
    details: `Updated reconciliation status to ${params.status} for Transaction ${tx.id} (Deposit Batch: ${params.depositBatchId || 'N/A'}).`
  });

  return updatedTx;
}

/**
 * Computes complete Student Financial Profile
 */
export function calculateStudentFinancialProfile(studentName: string) {
  const norm = (studentName || '').toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
  const canonical = (MANUAL_ALIASES[norm] || studentName || '').toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
  const allInvoices = getInvoices();
  const allTransactions = getTransactions();
  const allReceipts = getReceipts();
  const allAdjustments = getAdjustments();

  const isNameMatch = (targetName?: string) => {
    if (!targetName) return false;
    const tNorm = targetName.toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
    if (tNorm === norm || tNorm === canonical) return true;
    const tCanonical = (MANUAL_ALIASES[tNorm] || targetName).toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
    if (tCanonical === canonical || tCanonical === norm) return true;
    const n1 = norm.replace(/[^a-z]/g, '');
    const n2 = tNorm.replace(/[^a-z]/g, '');
    if (n1 && n2 && (n1.includes(n2) || n2.includes(n1) || (n1.slice(0, 5) === n2.slice(0, 5) && n1.length >= 4))) {
      return true;
    }
    return false;
  };

  const studentInvoices = allInvoices.filter(i => isNameMatch(i.studentName));
  const studentTransactions = allTransactions.filter(t => isNameMatch(t.studentName));
  const studentReceipts = allReceipts.filter(r => isNameMatch(r.studentName));
  const studentAdjustments = allAdjustments.filter(a => isNameMatch(a.studentName));

  const totalTuition = studentInvoices.reduce((acc, i) => acc + (i.totalTuition || 0), 0);
  const discounts = studentInvoices.reduce((acc, i) => acc + (i.discounts || 0), 0);
  const scholarships = studentInvoices.reduce((acc, i) => acc + (i.scholarships || 0), 0);
  const refunds = studentInvoices.reduce((acc, i) => acc + (i.refunds || 0), 0);
  const netTuition = studentInvoices.reduce((acc, i) => acc + (i.netTuition || 0), 0);
  const amountPaid = studentTransactions
    .filter(t => t.status === 'Completed')
    .reduce((acc, t) => acc + t.amount, 0);
  const outstandingBalance = Math.max(0, netTuition - amountPaid);

  return {
    studentName,
    totalTuition,
    discounts,
    scholarships,
    refunds,
    netTuition,
    amountPaid,
    outstandingBalance,
    invoices: studentInvoices,
    transactions: studentTransactions,
    receipts: studentReceipts,
    adjustments: studentAdjustments
  };
}

/**
 * Bootstrap normalized financial model from initial records
 * Pre-populates lines (invoice_lines) and allocations (payment_allocation)
 */
export function bootstrapFromPaymentRecords(records: PaymentRecord[]): {
  invoices: Invoice[];
  transactions: PaymentTransaction[];
  receipts: Receipt[];
  adjustments: FinancialAdjustment[];
} {
  const invoices: Invoice[] = [];
  const transactions: PaymentTransaction[] = [];
  const receipts: Receipt[] = [];
  const adjustments: FinancialAdjustment[] = [];

  records.forEach((p, idx) => {
    const invoiceId = generateUUID(); // UUID internal ID
    const invoiceNumber = getNextSequenceNumber('invoice'); // Database sequence: INV-2026-000001
    const studentId = p.studentId || `HTEIM-2026-${(idx + 1).toString().padStart(4, '0')}`;

    let scholarships = 0;
    let discounts = 0;
    const notesLower = (p.notes || '').toLowerCase();
    const isScholarship = p.paymentMethod === 'Scholarship' || notesLower.includes('scholarship') || notesLower.includes('financial aid');

    if (isScholarship) {
      scholarships = p.totalTuition;
      adjustments.push({
        id: generateUUID(), // UUID internal ID
        adjustmentNumber: getNextSequenceNumber('adjustment'), // Database sequence: ADJ-2026-000001
        invoiceId,
        studentId,
        studentName: p.studentName,
        type: 'scholarship',
        isCharge: false,
        categoryName: 'Five-Fold Ministry Full Tuition Grant',
        amount: p.totalTuition,
        status: 'approved',
        appliedDate: '2026-01-15',
        authorizedBy: 'Apostolic Council',
        notes: 'Full institutional scholarship award'
      });
    } else if (notesLower.includes('discount')) {
      discounts = Math.max(0, p.totalTuition - p.amountPaid);
      if (discounts > 0) {
        adjustments.push({
          id: generateUUID(), // UUID internal ID
          adjustmentNumber: getNextSequenceNumber('adjustment'), // Database sequence: ADJ-2026-000001
          invoiceId,
          studentId,
          studentName: p.studentName,
          type: 'discount',
          isCharge: false,
          categoryName: 'Early Bird Ministry Registration Discount',
          amount: discounts,
          status: 'approved',
          appliedDate: '2026-01-15',
          authorizedBy: 'Admissions Office',
          notes: 'Standard curriculum incentive discount'
        });
      }
    }

    // Define invoice lines:
    // invoice -> invoice_lines
    const initialLines: InvoiceLine[] = [
      {
        id: generateUUID(), // UUID internal ID
        invoiceId,
        lineType: 'tuition',
        description: 'Core Ministry Curriculum Tuition',
        quantity: 1,
        unitAmount: p.totalTuition || 1200,
        totalAmount: p.totalTuition || 1200,
        createdAt: '2026-01-15T00:00:00Z'
      }
    ];

    const amountPaid = isScholarship ? 0 : p.amountPaid;

    const baseInvoice: Invoice = {
      id: invoiceId,
      invoiceNumber,
      studentId,
      studentName: p.studentName,
      email: p.email,
      phone: p.phone,
      moduleTrack: p.moduleTrack || 'School of Ministry Core Modules',
      term: '2026 Semester 1',
      academicYear: '2026-2027',
      issueDate: '2026-01-15',
      dueDate: '2026-05-15',
      lines: initialLines,
      totalTuition: p.totalTuition || 1200,
      discounts,
      scholarships,
      refunds: 0,
      adjustments: 0,
      netTuition: Math.max(0, (p.totalTuition || 1200) - discounts - scholarships),
      amountPaid,
      outstandingBalance: Math.max(0, (p.totalTuition || 1200) - discounts - scholarships - amountPaid),
      paymentPlan: p.paymentPlan || (amountPaid === p.totalTuition ? 'Pay In Full' : 'Monthly Installments'),
      status: (p.totalTuition || 1200) - discounts - scholarships - amountPaid <= 0 ? 'Paid' : amountPaid > 0 ? 'Partially Paid' : 'Unpaid',
      notes: p.notes,
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-04-15T00:00:00Z'
    };

    invoices.push(baseInvoice);

    if (amountPaid > 0) {
      const transactionId = generateUUID(); // UUID internal ID
      const paymentNumber = getNextSequenceNumber('payment'); // Database sequence: PAY-2026-000001
      const receiptNumber = p.receiptNumber || getNextSequenceNumber('receipt'); // Database sequence: RCP-2026-000001
      const paymentDate = p.lastPaymentDate && p.lastPaymentDate !== 'N/A' ? formatBootstrapDate(p.lastPaymentDate) : '2026-04-08';

      // payment -> payment_allocation
      const allocation: PaymentAllocation = {
        id: generateUUID(), // UUID internal ID
        paymentId: transactionId,
        invoiceId: baseInvoice.id,
        allocatedAmount: amountPaid,
        notes: 'Initial bootstrap payment allocation'
      };

      const transaction: PaymentTransaction = {
        id: transactionId,
        paymentNumber,
        invoiceId: baseInvoice.id,
        studentName: p.studentName,
        studentId: baseInvoice.studentId,
        amount: amountPaid,
        paymentDate,
        paymentMethod: p.paymentMethod || 'Bank Transfer',
        paymentReference: paymentNumber,
        receiptNumber,
        status: 'Completed',
        allocations: [allocation],
        notes: p.notes || 'Invoiced registration payment',
        recordedBy: 'Finance Bursar',
        reconciliationStatus: 'Reconciled',
        reconciledAt: paymentDate,
        reconciledBy: 'Pastor Samuel Selkridge (Bursar)',
        createdAt: `${paymentDate}T12:00:00Z`
      };
      transactions.push(transaction);

      const receipt: Receipt = {
        id: generateUUID(), // UUID internal ID
        receiptNumber,
        paymentId: transaction.id,
        invoiceId: baseInvoice.id,
        studentName: p.studentName,
        studentId: baseInvoice.studentId,
        amountPaid,
        paymentDate,
        paymentMethod: transaction.paymentMethod,
        paymentReference: transaction.paymentReference,
        issuedAt: `${paymentDate}T12:00:00Z`,
        issuedBy: 'HTEIM Bursar & Finance Office',
        academicTerm: '2026 Semester 1',
        courseOrModule: baseInvoice.moduleTrack,
        totalTuitionBilled: baseInvoice.totalTuition,
        discountsAndScholarships: discounts + scholarships,
        balanceRemaining: baseInvoice.outstandingBalance,
        verificationCode: `HTEIM-VERIFY-${receiptNumber.replace(/[^0-9]/g, '')}`,
        notes: 'Official Institutional Tuition Receipt'
      };
      receipts.push(receipt);
    }
  });

  return { invoices, transactions, receipts, adjustments };
}

function formatBootstrapDate(dateStr: string): string {
  if (!dateStr || dateStr === 'N/A') return '2026-04-15';
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  return '2026-04-15';
}

/**
 * CSV Exporters
 */
export function exportInvoicesToCSV(): void {
  const invoices = getInvoices();
  const headers = ['Invoice ID', 'Student Name', 'Student ID', 'Module Track', 'Term', 'Issue Date', 'Due Date', 'Total Tuition', 'Discounts', 'Scholarships', 'Refunds', 'Applicable Charges', 'Net Tuition', 'Amount Paid', 'Outstanding Balance', 'Status'];
  const rows = invoices.map(i => [
    i.id,
    `"${i.studentName.replace(/"/g, '""')}"`,
    i.studentId,
    `"${i.moduleTrack.replace(/"/g, '""')}"`,
    i.term || '2026 Semester 1',
    i.issueDate,
    i.dueDate,
    i.totalTuition,
    i.discounts,
    i.scholarships,
    i.refunds || 0,
    i.adjustments || 0,
    i.netTuition,
    i.amountPaid,
    i.outstandingBalance,
    i.status
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, `HTEIM_Invoices_Report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
}

export function exportTransactionsToCSV(): void {
  const transactions = getTransactions();
  const headers = ['Transaction ID', 'Invoice ID', 'Student Name', 'Student ID', 'Amount', 'Payment Date', 'Payment Method', 'Payment Reference', 'Receipt Number', 'Status', 'Reconciliation Status', 'Recorded By'];
  const rows = transactions.map(t => [
    t.id,
    t.invoiceId,
    `"${t.studentName.replace(/"/g, '""')}"`,
    t.studentId,
    t.amount,
    t.paymentDate,
    t.paymentMethod,
    t.paymentReference || '',
    t.receiptNumber,
    t.status,
    t.reconciliationStatus || 'Unreconciled',
    t.recordedBy || 'Finance Office'
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, `HTEIM_Transactions_Ledger_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
}

export function exportAuditLogsToCSV(): void {
  const logs = getAuditLogs();
  const headers = ['Audit ID', 'Timestamp', 'Action', 'Actor Name', 'Actor Role', 'Student Name', 'Entity Type', 'Entity ID', 'Amount', 'Details'];
  const rows = logs.map(l => [
    l.id,
    l.timestamp,
    l.action,
    l.actorName,
    l.actorRole,
    `"${l.studentName.replace(/"/g, '""')}"`,
    l.entityType,
    l.entityId,
    l.amount || 0,
    `"${l.details.replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, `HTEIM_Financial_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
}

function downloadBlob(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
