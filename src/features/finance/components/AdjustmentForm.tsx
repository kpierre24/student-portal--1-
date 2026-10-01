import React, { useState } from 'react';
import { X, Save, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Invoice, FinancialAdjustmentType } from '../types';

interface AdjustmentFormProps {
  invoice: Invoice;
  onSave: (data: any) => void;
  onCancel: () => void;
  authorizedBy?: string;
}

export const AdjustmentForm: React.FC<AdjustmentFormProps> = ({ invoice, onSave, onCancel, authorizedBy }) => {
  const [type, setType] = useState<FinancialAdjustmentType>('scholarship');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [isCharge, setIsCharge] = useState(false);
  const [notes, setNotes] = useState('');

  const adjustmentTypes: { value: FinancialAdjustmentType; label: string; defaultCharge: boolean }[] = [
    { value: 'scholarship', label: 'Institutional Scholarship', defaultCharge: false },
    { value: 'discount', label: 'Student Discount', defaultCharge: false },
    { value: 'fee_waiver', label: 'Fee Waiver', defaultCharge: false },
    { value: 'applicable_charge', label: 'Applicable Charge', defaultCharge: true },
    { value: 'late_fee', label: 'Late Fee Penalty', defaultCharge: true },
    { value: 'adjustment', label: 'General Adjustment', defaultCharge: false }
  ];

  const handleTypeChange = (newType: FinancialAdjustmentType) => {
    setType(newType);
    const config = adjustmentTypes.find(t => t.value === newType);
    if (config) setIsCharge(config.defaultCharge);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden max-w-lg w-full">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-amber-50 dark:bg-amber-900/10">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">Financial Ledger Adjustment</h3>
        </div>
        <button onClick={onCancel} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Adjustment Type</label>
              <select 
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as FinancialAdjustmentType)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm font-medium"
              >
                {adjustmentTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Entry Mode</label>
              <select 
                value={isCharge ? 'charge' : 'credit'}
                onChange={(e) => setIsCharge(e.target.value === 'charge')}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm font-medium"
              >
                <option value="credit">Credit (Reduces Balance)</option>
                <option value="charge">Charge (Increases Balance)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Category / Reason</label>
            <input 
              type="text" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm"
              placeholder="e.g. Five-Fold Ministry Scholarship"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Adjustment Amount</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-lg font-bold text-gray-900 dark:text-white"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Supporting Notes</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm min-h-[80px]"
              placeholder="Authorization details or justification..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-[11px] text-red-700 dark:text-red-400 font-medium italic">
            Financial adjustments are permanent ledger entries. Ensure correct authorization before posting.
          </p>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Cancel</button>
        <button 
          onClick={() => onSave({ 
            invoiceId: invoice.id,
            type,
            categoryName: category,
            amount, 
            isCharge,
            notes,
            authorizedBy: authorizedBy || 'Apostolic Council'
          })}
          className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-lg transition-all"
        >
          <Save className="w-4 h-4" />
          Apply Adjustment
        </button>
      </div>
    </div>
  );
};
