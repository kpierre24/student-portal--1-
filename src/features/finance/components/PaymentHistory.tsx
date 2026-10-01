import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ArrowDownLeft, 
  CreditCard, 
  Download, 
  CheckCircle2
} from 'lucide-react';
import { PaymentTransaction, Invoice } from '../types';

interface PaymentHistoryProps {
  transactions?: PaymentTransaction[];
  invoices?: Invoice[];
  onSelectTransaction?: (tx: PaymentTransaction) => void;
  onDownloadReceipt?: (tx: PaymentTransaction) => void;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  transactions = [],
  invoices = [],
  onSelectTransaction,
  onDownloadReceipt
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      (tx.studentName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (tx.paymentReference?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (tx.paymentNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (tx.receiptNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesMethod = methodFilter === 'ALL' || tx.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transactions, reference..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            aria-label="Filter transactions by payment method"
            className="px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Methods</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="Check">Check</option>
            <option value="Scholarship">Scholarship</option>
          </select>
        </div>
      </div>

      {/* Transaction List / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">No payment transactions found</p>
                    <p className="text-xs text-slate-400">Transactions will appear here once recorded</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr 
                    key={tx.id}
                    onClick={() => onSelectTransaction?.(tx)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                          <ArrowDownLeft className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-xs font-mono">{tx.paymentNumber || tx.paymentReference || tx.id.slice(0, 8)}</p>
                          <p className="text-[11px] text-slate-400">Payment</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {tx.studentName || 'Direct Payment'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {tx.paymentDate ? new Date(tx.paymentDate).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        {tx.status || 'Completed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {onDownloadReceipt && (
                        <button
                          onClick={() => onDownloadReceipt(tx)}
                          className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="Download Receipt"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
