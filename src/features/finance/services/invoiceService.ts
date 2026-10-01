import { Invoice, PaymentTransaction, FinancialAdjustment, RefundRecord, FinancialAuditLog, PaymentRecord } from '../types';
import { isDemoPayment } from '../../../data/guards';
import { generateUUID, getNextSequenceNumber } from '../../../lib/idGenerator';

const INVOICES_STORAGE_KEY = 'hteim_student_invoices';
const ADJUSTMENTS_STORAGE_KEY = 'hteim_financial_adjustments';
const AUDIT_LOGS_STORAGE_KEY = 'hteim_financial_audit_logs';

export const invoiceService = {
  getInvoices(paymentRecords: PaymentRecord[] = []): Invoice[] {
    const saved = localStorage.getItem(INVOICES_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(i => !isDemoPayment(i));
        }
      } catch (e) {
        console.error('Error loading invoices from storage', e);
      }
    }
    return [];
  },

  saveInvoices(invoices: Invoice[]): void {
    const clean = invoices.filter(i => !isDemoPayment(i));
    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(clean));
  },

  getAdjustments(): FinancialAdjustment[] {
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
  },

  saveAdjustments(adjustments: FinancialAdjustment[]): void {
    localStorage.setItem(ADJUSTMENTS_STORAGE_KEY, JSON.stringify(adjustments));
  },

  recalculateInvoiceLedger(
    invoice: Invoice,
    transactions: PaymentTransaction[],
    adjustments: FinancialAdjustment[],
    refunds: RefundRecord[]
  ): Invoice {
    let invoiceTotal = 0;
    if (Array.isArray(invoice.lines) && invoice.lines.length > 0) {
      invoiceTotal = invoice.lines.reduce((acc, line) => {
        const lineTotal = Number(line.totalAmount ?? (Number(line.quantity || 1) * Number(line.unitAmount || 0)));
        return acc + (isNaN(lineTotal) ? 0 : lineTotal);
      }, 0);
    } else {
      invoiceTotal = Number(invoice.totalTuition || 750);
    }

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

    const invoiceRefunds = refunds.filter(
      r => (r.status === 'approved' || r.status === 'processed') &&
        r.allocations?.some(a => a.invoiceId === invoice.id)
    );

    const totalRefundsFromRecords = invoiceRefunds.reduce((acc, r) => {
      const alloc = r.allocations?.find(a => a.invoiceId === invoice.id);
      return acc + (alloc ? Number(alloc.allocatedAmount || 0) : 0);
    }, 0);

    const refundAdjustments = adjustments.filter(
      a => a.invoiceId === invoice.id && a.type === 'refund' && a.status !== 'rejected' && a.status !== 'void'
    );
    const totalRefundsFromAdjustments = refundAdjustments.reduce((acc, a) => acc + Number(a.amount || 0), 0);
    const totalRefunds = totalRefundsFromRecords + totalRefundsFromAdjustments;

    const netPayments = Math.max(0, totalPaid - totalRefunds);

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
        discounts += amt;
      }
    });

    const approvedAdjustments = discounts + scholarships;
    const netTuition = Math.max(0, (invoiceTotal + applicableCharges) - approvedAdjustments);
    const outstandingBalance = Math.max(0, (invoiceTotal + applicableCharges) - netPayments - approvedAdjustments);

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
  },

  applyFinancialAdjustment(params: {
    invoiceId: string;
    type: string;
    categoryName: string;
    amount: number;
    authorizedBy: string;
    notes?: string;
    isCharge?: boolean;
  }): { adjustment: FinancialAdjustment; updatedInvoice: Invoice } {
    const invoices = this.getInvoices();
    const adjustments = this.getAdjustments();
    
    // In a real app we'd fetch transactions and refunds too
    const transactions: any[] = []; 
    const refunds: any[] = [];

    const invoiceIndex = invoices.findIndex(i => i.id === params.invoiceId);
    if (invoiceIndex === -1) throw new Error(`Invoice not found: ${params.invoiceId}`);

    const invoice = invoices[invoiceIndex];
    const newAdjustment: FinancialAdjustment = {
      id: generateUUID(),
      invoiceId: invoice.id,
      studentId: invoice.studentId,
      type: params.type as any,
      isCharge: params.isCharge,
      categoryName: params.categoryName,
      amount: params.amount,
      status: 'approved',
      appliedDate: new Date().toISOString(),
      authorizedBy: params.authorizedBy,
      notes: params.notes,
      createdAt: new Date().toISOString()
    };

    adjustments.unshift(newAdjustment);
    this.saveAdjustments(adjustments);

    const updatedInvoice = this.recalculateInvoiceLedger(invoice, transactions, adjustments, refunds);
    invoices[invoiceIndex] = updatedInvoice;
    this.saveInvoices(invoices);

    return { adjustment: newAdjustment, updatedInvoice };
  },

  recordRefundTransaction(params: {
    invoiceId: string;
    amount: number;
    reason: string;
    authorizedBy: string;
  }): { refund: RefundRecord; updatedInvoice: Invoice } {
    const invoices = this.getInvoices();
    // This would normally save to a refunds storage
    
    const invoiceIndex = invoices.findIndex(i => i.id === params.invoiceId);
    if (invoiceIndex === -1) throw new Error(`Invoice not found: ${params.invoiceId}`);

    const invoice = invoices[invoiceIndex];
    const updatedInvoice = {
      ...invoice,
      refunds: (invoice.refunds || 0) + params.amount,
      outstandingBalance: invoice.outstandingBalance + params.amount,
      updatedAt: new Date().toISOString()
    };
    
    invoices[invoiceIndex] = updatedInvoice;
    this.saveInvoices(invoices);
    
    return { refund: {} as any, updatedInvoice };
  }
};
