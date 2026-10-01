import React, { useState } from 'react';
import { X, Plus, Trash2, Save, FileText } from 'lucide-react';
import { InvoiceLine, InvoiceLineType } from '../types';

interface InvoiceFormProps {
  onSave: (data: any) => void;
  onCancel: () => void;
  studentName?: string;
  studentId?: string;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSave, onCancel, studentName, studentId }) => {
  const [formData, setFormData] = useState({
    studentName: studentName || '',
    studentId: studentId || '',
    term: '2026 Semester 1',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });

  const [lines, setLines] = useState<InvoiceLine[]>([
    { lineType: 'tuition', description: 'Core Ministry Tuition', quantity: 1, unitAmount: 1200, totalAmount: 1200 }
  ]);

  const addLine = () => {
    setLines([...lines, { lineType: 'other', description: '', quantity: 1, unitAmount: 0, totalAmount: 0 }]);
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof InvoiceLine, value: any) => {
    const newLines = [...lines];
    newLines[idx] = { ...newLines[idx], [field]: value };
    
    if (field === 'quantity' || field === 'unitAmount') {
      newLines[idx].totalAmount = newLines[idx].quantity * newLines[idx].unitAmount;
    }
    
    setLines(newLines);
  };

  const total = lines.reduce((acc, l) => acc + l.totalAmount, 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden max-w-2xl w-full">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">Generate New Invoice</h3>
        </div>
        <button onClick={onCancel} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Student Name</label>
            <input 
              type="text" 
              value={formData.studentName}
              onChange={(e) => setFormData({...formData, studentName: e.target.value})}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm"
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Student ID</label>
            <input 
              type="text" 
              value={formData.studentId}
              onChange={(e) => setFormData({...formData, studentId: e.target.value})}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm"
              placeholder="HTEIM-2026-XXXX"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Issue Date</label>
            <input 
              type="date" 
              value={formData.issueDate}
              onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Due Date</label>
            <input 
              type="date" 
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Invoice Lines</h4>
            <button 
              onClick={addLine}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-3 h-3" />
              Add Line
            </button>
          </div>

          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-start p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                <div className="flex-1 space-y-1">
                  <input 
                    type="text" 
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => updateLine(idx, 'description', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm"
                  />
                  <select 
                    value={line.lineType}
                    onChange={(e) => updateLine(idx, 'lineType', e.target.value as InvoiceLineType)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-xs"
                  >
                    <option value="tuition">Tuition</option>
                    <option value="registration">Registration Fee</option>
                    <option value="course_material">Course Material</option>
                    <option value="mandatory_fee">Mandatory Fee</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="w-20">
                  <input 
                    type="number" 
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm"
                  />
                </div>
                <div className="w-32">
                  <input 
                    type="number" 
                    placeholder="Price"
                    value={line.unitAmount}
                    onChange={(e) => updateLine(idx, 'unitAmount', Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-right"
                  />
                </div>
                <button 
                  onClick={() => removeLine(idx)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-500 uppercase">Invoice Total</span>
          <span className="text-xl font-black text-gray-900 dark:text-white">${total.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400">Cancel</button>
          <button 
            onClick={() => onSave({ ...formData, lines, totalTuition: total })}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            Generate Invoice
          </button>
        </div>
      </div>
    </div>
  );
};
