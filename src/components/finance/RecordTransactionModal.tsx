import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  Calendar,
  FileText,
  X,
  Check,
  Building,
  User,
  Hash,
  Sparkles
} from 'lucide-react';
import { Invoice, Receipt, PaymentTransaction } from '../../types';
import { recordPaymentTransaction } from '../../lib/financialWorkflow';
import { useAccessibleModal } from '../../lib/useAccessibleModal';

interface RecordTransactionModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onTransactionRecorded: (result: { transaction: PaymentTransaction; receipt: Receipt; updatedInvoice: Invoice }) => void;
  userEmail?: string;
  userRole?: string;
}

export const RecordTransactionModal: React.FC<RecordTransactionModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onTransactionRecorded,
  userEmail,
  userRole
}) => {
  const dialogRef = useAccessibleModal(isOpen, onClose);

  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set default suggested payment amount when opening
  React.useEffect(() => {
    if (invoice) {
      setAmount(invoice.outstandingBalance > 0 ? invoice.outstandingBalance.toString() : '200');
      setPaymentReference(`REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid positive payment amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const result = recordPaymentTransaction({
        invoiceId: invoice.id,
        amount: numAmount,
        paymentMethod,
        paymentReference: paymentReference.trim(),
        paymentDate,
        notes: notes.trim(),
        recordedBy: userEmail || 'Finance Bursar',
        actorRole: userRole || 'finance_officer'
      });

      onTransactionRecorded(result);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                Record Tuition Payment
              </h3>
              <p className="text-xs text-slate-400">
                Post transaction to Invoice #{invoice.id} • {invoice.studentName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invoice Summary Pill */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Net Billed</span>
            <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
              ${invoice.netTuition.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Already Paid</span>
            <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ${invoice.amountPaid.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Balance Due</span>
            <p className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              ${invoice.outstandingBalance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Amount */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Payment Amount ($ USD) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Bank Transfer">Bank Transfer / Wire</option>
                <option value="Cash">Cash (Bursar Office)</option>
                <option value="Credit Card">Credit / Debit Card</option>
                <option value="Zelle">Zelle / QuickPay</option>
                <option value="Check">Cashier's Check / Cheque</option>
                <option value="Stripe">Stripe Online Portal</option>
                <option value="PayPal">PayPal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payment Reference */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Payment Reference / Check #
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={paymentReference}
                  onChange={e => setPaymentReference(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. WIRE-998231"
                />
              </div>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Payment Date *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Transaction Notes & Internal Memo
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="e.g. Deposit confirmation received from Republic Bank."
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">
              Generating transaction will issue an official verified receipt.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Post Payment
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
