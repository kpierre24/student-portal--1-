import { PaymentTransaction, Receipt, RefundRecord, FinancialAuditLog } from '../types';
import { isDemoPayment } from '../../../data/guards';
import { generateUUID } from '../../../lib/idGenerator';
import { safeStorage } from '../../../lib/safeStorage';

const TRANSACTIONS_STORAGE_KEY = 'hteim_student_transactions';
const RECEIPTS_STORAGE_KEY = 'hteim_student_receipts';
const REFUNDS_STORAGE_KEY = 'hteim_financial_refunds';

export const paymentService = {
  getTransactions(): PaymentTransaction[] {
    const saved = safeStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.filter(t => !isDemoPayment(t)).map(tx => {
            if (!tx.id || seen.has(tx.id)) {
              const fresh = generateUUID();
              seen.add(fresh);
              return { ...tx, id: fresh };
            }
            seen.add(tx.id);
            return tx;
          });
        }
      } catch (e) {
        console.error('Error loading transactions', e);
      }
    }
    return [];
  },

  saveTransactions(transactions: PaymentTransaction[]): void {
    const seen = new Set<string>();
    const clean = transactions.map(tx => {
      let id = tx.id;
      if (!id || seen.has(id)) {
        id = generateUUID();
      }
      seen.add(id);
      return { ...tx, id };
    });
    safeStorage.setJSON(TRANSACTIONS_STORAGE_KEY, clean);
  },

  getReceipts(): Receipt[] {
    const saved = safeStorage.getItem(RECEIPTS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.map(rc => {
            if (!rc.id || seen.has(rc.id)) {
              const fresh = generateUUID();
              seen.add(fresh);
              return { ...rc, id: fresh };
            }
            seen.add(rc.id);
            return rc;
          });
        }
      } catch (e) {
        console.error('Error loading receipts', e);
      }
    }
    return [];
  },

  saveReceipts(receipts: Receipt[]): void {
    const seen = new Set<string>();
    const clean = receipts.map(rc => {
      let id = rc.id;
      if (!id || seen.has(id)) {
        id = generateUUID();
      }
      seen.add(id);
      return { ...rc, id };
    });
    safeStorage.setJSON(RECEIPTS_STORAGE_KEY, clean);
  },

  getRefunds(): RefundRecord[] {
    const saved = safeStorage.getItem(REFUNDS_STORAGE_KEY);
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
    safeStorage.setJSON(REFUNDS_STORAGE_KEY, refunds);
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
