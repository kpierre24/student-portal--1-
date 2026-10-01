import React, { useState } from 'react';
import { X, RefreshCw, AlertCircle, Save } from 'lucide-react';
import { Invoice } from '../types';

interface RefundFormProps {
  invoice: Invoice;
  onSave: (data: any) => void;
  onCancel: () => void;
  authorizedBy?: string;
}

export const RefundForm: React.FC<RefundFormProps> = ({ invoice, onSave, onCancel, authorizedBy }) => {
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden max-w-lg w-full">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-red-50 dark:bg-red-900/10">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-red-600" />
          <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">Issue Tuition Refund</h3>
        </div>
        <button onClick={onCancel} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Amount Paid to Date</p>
            <p className="text-xl font-black text-emerald-600">${invoice.amountPaid.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-500 uppercase">Max Refundable</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">${invoice.amountPaid.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Refund Amount</label>
            <input 
              type="number" 
              max={invoice.amountPaid}
              value={amount}
              onChange={(e) => setAmount(Math.min(invoice.amountPaid, Number(e.target.value)))}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-lg font-bold text-red-600"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Refund Reason</label>
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm font-medium"
            >
              <option value="">Select Reason...</option>
              <option value="Course Cancellation">Course Cancellation</option>
              <option value="Student Withdrawal">Student Withdrawal</option>
              <option value="Overpayment">Overpayment</option>
              <option value="Scholarship Retroactive">Retroactive Scholarship</option>
              <option value="Duplicate Payment">Duplicate Payment</option>
              <option value="Other">Other (Specify in notes)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Internal Notes</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm min-h-[80px]"
              placeholder="Administrative details or justification for this refund..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-[11px] text-red-700 dark:text-red-400 font-medium italic">
            Refunds are recorded as debt offsets in the ledger. This action is not reversible.
          </p>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Cancel</button>
        <button 
          onClick={() => onSave({ 
            invoiceId: invoice.id,
            amount, 
            reason,
            notes,
            authorizedBy: authorizedBy || 'Finance Office'
          })}
          disabled={!reason || amount <= 0}
          className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Issue Refund
        </button>
      </div>
    </div>
  );
};
