import { useMemo, useCallback } from 'react';
import { useInvoices } from './useInvoices';
import { usePayments } from './usePayments';
import { invoiceService } from '../services/invoiceService';
import { paymentService } from '../services/paymentService';

/**
 * useFinance Composite Hook
 * Adheres strictly to the architectural boundary:
 * - PostgreSQL (/api/invoices, /api/payments) = Authoritative Data
 * - React State = UI State
 * - localStorage = Offline Drafts / Cache Fallback
 */
export function useFinance() {
  const { invoices, loading: invoicesLoading, refreshInvoices } = useInvoices();
  const { transactions, refunds, loading: paymentsLoading, refreshPayments } = usePayments();

  const loading = invoicesLoading || paymentsLoading;

  const stats = useMemo(() => {
    const totalBilled = invoices.reduce((acc, inv) => acc + inv.totalTuition, 0);
    const totalCollected = transactions
      .filter(t => t.status === 'Completed')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalAdjustments = invoices.reduce((acc, inv) => acc + inv.adjustments, 0);
    const totalDiscounts = invoices.reduce((acc, inv) => acc + inv.discounts + inv.scholarships, 0);
    const totalOutstanding = invoices.reduce((acc, inv) => acc + inv.outstandingBalance, 0);

    return {
      totalBilled,
      totalCollected,
      totalAdjustments,
      totalDiscounts,
      totalOutstanding,
      collectionRate: totalBilled > 0 ? (totalCollected / (totalBilled - totalDiscounts + totalAdjustments)) * 100 : 0
    };
  }, [invoices, transactions]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshInvoices(), refreshPayments()]);
  }, [refreshInvoices, refreshPayments]);

  const recordPayment = async (params: any) => {
    const result = paymentService.recordPaymentTransaction(params);
    await refreshPayments();
    await refreshInvoices();
    return result;
  };

  const applyAdjustment = async (params: any) => {
    const result = invoiceService.applyFinancialAdjustment(params);
    await refreshAll();
    return result;
  };

  const recordRefund = async (params: any) => {
    const result = invoiceService.recordRefundTransaction(params);
    await refreshAll();
    return result;
  };

  return {
    invoices,
    transactions,
    refunds,
    stats,
    loading,
    refreshAll,
    recordPayment,
    applyAdjustment,
    recordRefund
  };
}
