import { useState, useCallback } from 'react';
import { PaymentTransaction, Receipt, RefundRecord } from '../types';
import { paymentService } from '../services/paymentService';

/**
 * usePayments Hook
 * Adheres strictly to the architectural boundary:
 * - PostgreSQL (/api/payments) = Authoritative Data
 * - React State = UI State
 * - localStorage = Offline Drafts / Cache Fallback
 */
export function usePayments() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(() => paymentService.getTransactions());
  const [receipts, setReceipts] = useState<Receipt[]>(() => paymentService.getReceipts());
  const [refunds, setRefunds] = useState<RefundRecord[]>(() => paymentService.getRefunds());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPayments = useCallback(() => {
    setLoading(true);
    setTransactions(paymentService.getTransactions());
    setReceipts(paymentService.getReceipts());
    setRefunds(paymentService.getRefunds());
    setLoading(false);
  }, []);

  return {
    transactions,
    receipts,
    refunds,
    loading,
    error,
    refreshPayments
  };
}
