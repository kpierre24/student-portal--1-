import { describe, it, expect, beforeEach } from 'vitest';
import { paymentService } from '../services/paymentService';

describe('paymentService — Financial Ledger & Receipt Generation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records a new payment transaction and automatically generates a corresponding receipt', () => {
    const { transaction, receipt } = paymentService.recordPaymentTransaction({
      invoiceId: 'inv-101',
      amount: 450,
      paymentMethod: 'Bank Transfer',
      paymentReference: 'REF-BANK-9988',
      recordedBy: 'Bursar Office',
    });

    expect(transaction.amount).toBe(450);
    expect(transaction.paymentMethod).toBe('Bank Transfer');
    expect(transaction.status).toBe('Completed');
    expect(transaction.receiptNumber).toMatch(/^RCP-\d+$/);

    expect(receipt.paymentId).toBe(transaction.id);
    expect(receipt.amountPaid).toBe(450);
    expect(receipt.issuedBy).toBe('Bursar Office');

    const storedTransactions = paymentService.getTransactions();
    expect(storedTransactions).toHaveLength(1);
    expect(storedTransactions[0].id).toBe(transaction.id);
  });

  it('filters out demo payments from stored transaction history', () => {
    const mockData = [
      { id: 'tx-real', amount: 100, isDemo: false },
      { id: 'tx-demo', amount: 100, isDemo: true, isDemoData: true },
    ];
    localStorage.setItem('hteim_student_transactions', JSON.stringify(mockData));

    const transactions = paymentService.getTransactions();
    expect(transactions).toHaveLength(1);
    expect(transactions[0].id).toBe('tx-real');
  });
});
