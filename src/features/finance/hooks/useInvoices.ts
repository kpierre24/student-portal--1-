import { useState, useCallback } from 'react';
import { Invoice, PaymentRecord } from '../types';
import { invoiceService } from '../services/invoiceService';

const EMPTY_PAYMENT_RECORDS: PaymentRecord[] = [];

/**
 * useInvoices Hook
 * Adheres strictly to the architectural boundary:
 * - PostgreSQL (/api/invoices) = Authoritative Data
 * - React State = UI State
 * - localStorage = Offline Drafts / Cache Fallback
 */
export function useInvoices(paymentRecords: PaymentRecord[] = EMPTY_PAYMENT_RECORDS) {
  const [invoices, setInvoices] = useState<Invoice[]>(() => invoiceService.getInvoices(paymentRecords));
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const refreshInvoices = useCallback(() => {
    setLoading(true);
    const data = invoiceService.getInvoices(paymentRecords);
    setInvoices(data);
    setLoading(false);
  }, [paymentRecords]);

  const saveInvoices = (newInvoices: Invoice[]) => {
    setInvoices(newInvoices);
    invoiceService.saveInvoices(newInvoices);
  };

  return {
    invoices,
    loading,
    error,
    refreshInvoices,
    saveInvoices
  };
}
