import React, { useState } from 'react';
import {
  Award,
  Percent,
  RotateCcw,
  Sliders,
  DollarSign,
  PlusCircle,
  X,
  Check,
  Building,
  User,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { Invoice, FinancialAdjustment, FinancialAdjustmentType } from '../../types';
import { applyFinancialAdjustment } from '../../lib/financialWorkflow';
import { useAccessibleModal } from '../../lib/useAccessibleModal';

interface FinancialAdjustmentModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onAdjustmentApplied: (result: { adjustment: FinancialAdjustment; updatedInvoice: Invoice }) => void;
  userEmail?: string;
  userRole?: string;
}

export const FinancialAdjustmentModal: React.FC<FinancialAdjustmentModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onAdjustmentApplied,
  userEmail,
  userRole
}) => {
  const dialogRef = useAccessibleModal(isOpen, onClose);

  const [type, setType] = useState<FinancialAdjustmentType>('scholarship');
  const [categoryName, setCategoryName] = useState<string>('Five-Fold Ministry Full Tuition Grant');
  const [amount, setAmount] = useState<string>('600');
  const [authorizedBy, setAuthorizedBy] = useState<string>(userEmail || 'Apostolic Council & Bursar');
  const [receiptOrDocRef, setReceiptOrDocRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (invoice && isOpen) {
      if (type === 'scholarship') {
        setCategoryName('Five-Fold Ministry Full Tuition Grant');
        setAmount(invoice.outstandingBalance > 0 ? invoice.outstandingBalance.toString() : '600');
      } else if (type === 'discount') {
        setCategoryName('Early Registration Curriculum Incentive');
        setAmount('200');
      } else if (type === 'refund') {
        setCategoryName('Tuition Overpayment Refund');
        setAmount('100');
      } else {
        setCategoryName('Administrative Fee Adjustment');
        setAmount('150');
      }
    }
  }, [type, invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid adjustment amount greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const isCharge = type === 'applicable_charge';
      const result = applyFinancialAdjustment({
        invoiceId: invoice.id,
        type,
        isCharge,
        categoryName: categoryName.trim(),
        amount: numAmount,
        authorizedBy: authorizedBy.trim(),
        actorRole: userRole || 'finance_officer',
        notes: notes.trim(),
        receiptOrDocRef: receiptOrDocRef.trim()
      });

      onAdjustmentApplied(result);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply adjustment');
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
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                Financial Aid, Scholarship & Adjustment
              </h3>
              <p className="text-xs text-slate-400">
                Invoice #{invoice.id} • {invoice.studentName}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          {/* Adjustment Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Adjustment Type *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setType('scholarship')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'scholarship'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Award className="w-4 h-4 mb-1" />
                <p className="text-[11px] font-black uppercase">Scholarship</p>
                <p className="text-[9px] opacity-75">Tuition Grant</p>
              </button>

              <button
                type="button"
                onClick={() => setType('discount')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'discount'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Percent className="w-4 h-4 mb-1" />
                <p className="text-[11px] font-black uppercase">Discount</p>
                <p className="text-[9px] opacity-75">Early Bird/Promo</p>
              </button>

              <button
                type="button"
                onClick={() => setType('fee_waiver')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'fee_waiver'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Sliders className="w-4 h-4 mb-1" />
                <p className="text-[11px] font-black uppercase">Fee Waiver</p>
                <p className="text-[9px] opacity-75">Credit Adjustment</p>
              </button>

              <button
                type="button"
                onClick={() => setType('applicable_charge')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'applicable_charge'
                    ? 'border-red-500 bg-red-500/10 text-red-500 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <PlusCircle className="w-4 h-4 mb-1" />
                <p className="text-[11px] font-black uppercase">Charge</p>
                <p className="text-[9px] opacity-75">Late/Incidental</p>
              </button>

              <button
                type="button"
                onClick={() => setType('refund')}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'refund'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <RotateCcw className="w-4 h-4 mb-1" />
                <p className="text-[11px] font-black uppercase">Refund</p>
                <p className="text-[9px] opacity-75">Overpayment</p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category / Name */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Category / Award Program *
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="e.g. Pastoral Endorsement Grant"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Adjustment Amount ($ USD) *
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Authorized By */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Authorized Official / Council *
              </label>
              <input
                type="text"
                value={authorizedBy}
                onChange={e => setAuthorizedBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="e.g. Apostolic Council"
                required
              />
            </div>

            {/* Doc Ref */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Board Minute / Doc Ref #
              </label>
              <input
                type="text"
                value={receiptOrDocRef}
                onChange={e => setReceiptOrDocRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="e.g. MIN-2026-04A"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Justification & Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="e.g. Awarded under Five-Fold Ministry development program."
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">
              Adjustment will update the net tuition and outstanding balance.
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
                <Check className="w-4 h-4" /> Apply Adjustment
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
