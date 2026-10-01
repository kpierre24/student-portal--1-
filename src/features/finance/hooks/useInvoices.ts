import { useState, useEffect, useCallback } from 'react';
import { Invoice, PaymentRecord } from '../types';
import { invoiceService } from '../services/invoiceService';

const EMPTY_PAYMENT_RECORDS: PaymentRecord[] = [];

export function useInvoices(paymentRecords: PaymentRecord[] = EMPTY_PAYMENT_RECORDS) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshInvoices = useCallback(() => {
    setLoading(true);
    const data = invoiceService.getInvoices(paymentRecords);
    setInvoices(data);
    setLoading(false);
  }, [paymentRecords]);

  useEffect(() => {
    refreshInvoices();
  }, [refreshInvoices]);

  const saveInvoices = (newInvoices: Invoice[]) => {
    invoiceService.saveInvoices(newInvoices);
    setInvoices(newInvoices);
  };

  return {
    invoices,
    loading,
    refreshInvoices,
    saveInvoices
  };
}
