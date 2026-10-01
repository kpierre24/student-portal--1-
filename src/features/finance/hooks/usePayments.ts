import { useState, useEffect, useCallback } from 'react';
import { PaymentTransaction, Receipt, RefundRecord } from '../types';
import { paymentService } from '../services/paymentService';

export function usePayments() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshPayments = useCallback(() => {
    setLoading(true);
    setTransactions(paymentService.getTransactions());
    setReceipts(paymentService.getReceipts());
    setRefunds(paymentService.getRefunds());
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshPayments();
  }, [refreshPayments]);

  return {
    transactions,
    receipts,
    refunds,
    loading,
    refreshPayments
  };
}
