import React from 'react';
import { 
  X, 
  Download, 
  Printer, 
  Mail, 
  Plus, 
  History,
  ShieldCheck,
  CreditCard,
  DollarSign,
  FileText
} from 'lucide-react';
import { Invoice } from '../types';

interface InvoiceDetailsProps {
  invoice: Invoice;
  onClose: () => void;
}

export const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoice, onClose }) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider">{invoice.invoiceNumber}</h3>
            <p className="text-xs text-gray-500 uppercase font-medium">Billed to: {invoice.studentName}</p>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Status & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
              invoice.status === 'Paid' ? 'bg-emerald-500 text-white' : 
              invoice.status === 'Partially Paid' ? 'bg-blue-500 text-white' : 
              'bg-amber-500 text-white'
            }`}>
              {invoice.status.toUpperCase()}
            </div>
            
            <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Verified Institutional Record
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-sm">
              <Mail className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>

        {/* Ledger Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Invoice Total</p>
            <p className="text-xl font-black text-gray-900 dark:text-white">${invoice.totalTuition.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Total Paid</p>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">${invoice.amountPaid.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Outstanding</p>
            <p className="text-xl font-black text-amber-700 dark:text-amber-300">${invoice.outstandingBalance.toLocaleString()}</p>
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-500" />
            Billing Line Items
          </h4>
          <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/30">
                <tr>
                  <th className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {invoice.lines.map((line, idx) => (
                  <tr key={line.id || idx}>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{line.description}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white text-right">${line.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
                {invoice.discounts > 0 && (
                  <tr className="bg-emerald-50/30 dark:bg-emerald-900/5">
                    <td className="px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 italic">Discounts/Scholarships Applied</td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-right">-${invoice.discounts.toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
        <button className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <History className="w-4 h-4" />
          View Audit Log
        </button>
        
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
            <DollarSign className="w-4 h-4" />
            Apply Adjustment
          </button>
          <button className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-md">
            <CreditCard className="w-4 h-4" />
            Post Payment
          </button>
        </div>
      </div>
    </div>
  );
};
