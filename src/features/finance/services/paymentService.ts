import { PaymentTransaction, Receipt, RefundRecord, FinancialAuditLog } from '../types';
import { isDemoPayment } from '../../../data/guards';
import { generateUUID } from '../../../lib/idGenerator';

const TRANSACTIONS_STORAGE_KEY = 'hteim_student_transactions';
const RECEIPTS_STORAGE_KEY = 'hteim_student_receipts';
const REFUNDS_STORAGE_KEY = 'hteim_financial_refunds';

export const paymentService = {
  getTransactions(): PaymentTransaction[] {
    const saved = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(t => !isDemoPayment(t));
      } catch (e) {
        console.error('Error loading transactions', e);
      }
    }
    return [];
  },

  saveTransactions(transactions: PaymentTransaction[]): void {
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
  },

  getReceipts(): Receipt[] {
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
  },

  saveReceipts(receipts: Receipt[]): void {
    localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(receipts));
  },

  getRefunds(): RefundRecord[] {
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
  },

  saveRefunds(refunds: RefundRecord[]): void {
    localStorage.setItem(REFUNDS_STORAGE_KEY, JSON.stringify(refunds));
  },

  recordPaymentTransaction(params: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    paymentReference?: string;
    notes?: string;
    recordedBy?: string;
  }): { transaction: PaymentTransaction; receipt: Receipt } {
    const transactions = this.getTransactions();
    const receipts = this.getReceipts();
    
    const transactionId = generateUUID();
    const newTransaction: PaymentTransaction = {
      id: transactionId,
      paymentNumber: `PAY-${Date.now()}`,
      invoiceId: params.invoiceId,
      studentId: 'HTEIM-UNKNOWN', // In a real app we'd lookup from invoice
      studentName: 'Unknown Student',
      amount: params.amount,
      paymentDate: new Date().toISOString(),
      paymentMethod: params.paymentMethod,
      paymentReference: params.paymentReference || '',
      receiptNumber: `RCP-${Date.now()}`,
      status: 'Completed',
      allocations: [{
        paymentId: transactionId,
        invoiceId: params.invoiceId,
        allocatedAmount: params.amount
      }],
      recordedBy: params.recordedBy || 'System',
      createdAt: new Date().toISOString()
    };

    transactions.unshift(newTransaction);
    this.saveTransactions(transactions);

    const newReceipt: Receipt = {
      id: generateUUID(),
      receiptNumber: newTransaction.receiptNumber,
      paymentId: newTransaction.id,
      invoiceId: params.invoiceId,
      studentName: newTransaction.studentName,
      studentId: newTransaction.studentId,
      amountPaid: newTransaction.amount,
      paymentDate: newTransaction.paymentDate,
      paymentMethod: newTransaction.paymentMethod,
      paymentReference: newTransaction.paymentReference,
      issuedAt: new Date().toISOString(),
      issuedBy: newTransaction.recordedBy,
      academicTerm: '2026 Semester 1',
      courseOrModule: 'Ministry Studies',
      totalTuitionBilled: 0,
      discountsAndScholarships: 0,
      balanceRemaining: 0,
      verificationCode: 'VERIFY-TBD'
    };

    receipts.unshift(newReceipt);
    this.saveReceipts(receipts);

    return { transaction: newTransaction, receipt: newReceipt };
  }
};
