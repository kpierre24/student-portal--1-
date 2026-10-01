import React, { useState } from 'react';
import { X, CreditCard, DollarSign, Save, ShieldCheck } from 'lucide-react';
import { Invoice } from '../types';

interface PaymentFormProps {
  invoice: Invoice;
  onSave: (data: any) => void;
  onCancel: () => void;
  recordedBy?: string;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ invoice, onSave, onCancel, recordedBy }) => {
  const [amount, setAmount] = useState<number>(invoice.outstandingBalance);
  const [method, setMethod] = useState('Bank Transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden max-w-lg w-full">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/10">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">Post Payment Transaction</h3>
        </div>
        <button onClick={onCancel} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Outstanding Balance</p>
            <p className="text-xl font-black text-amber-600">${invoice.outstandingBalance.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-500 uppercase">Invoice #</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{invoice.invoiceNumber}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
              Payment Amount
              <span className="text-[10px] text-gray-400 font-normal italic">Enter numeric magnitude</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Method</label>
              <select 
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm font-medium"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Scholarship">Scholarship/Grant</option>
                <option value="Check">Personal Check</option>
                <option value="Zelle">Zelle / Transfer</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Reference #</label>
              <input 
                type="text" 
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm"
                placeholder="Ref, Check #, etc."
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Internal Notes</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm min-h-[80px]"
              placeholder="Record any specific details for this payment..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
            Recording this payment will update the institutional ledger and issue an official receipt to the student.
          </p>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Cancel</button>
        <button 
          onClick={() => onSave({ 
            invoiceId: invoice.id,
            amount, 
            paymentMethod: method, 
            paymentReference: reference,
            notes,
            recordedBy: recordedBy || 'Finance Admin'
          })}
          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg transition-all"
        >
          <Save className="w-4 h-4" />
          Post Payment
        </button>
      </div>
    </div>
  );
};
