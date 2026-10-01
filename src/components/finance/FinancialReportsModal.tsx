import React from 'react';
import {
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  X,
  Printer,
  DollarSign,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import {
  getInvoices,
  getTransactions,
  getAdjustments,
  exportInvoicesToCSV,
  exportTransactionsToCSV,
  exportAuditLogsToCSV
} from '../../lib/financialWorkflow';
import { useAccessibleModal } from '../../lib/useAccessibleModal';

interface FinancialReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FinancialReportsModal: React.FC<FinancialReportsModalProps> = ({
  isOpen,
  onClose
}) => {
  const dialogRef = useAccessibleModal(isOpen, onClose);
  const invoices = getInvoices();
  const transactions = getTransactions();
  const adjustments = getAdjustments();

  if (!isOpen) return null;

  // Aggregate Metrics
  const totalBilled = invoices.reduce((acc, i) => acc + (i.totalTuition || 0), 0);
  const totalDiscounts = invoices.reduce((acc, i) => acc + (i.discounts || 0), 0);
  const totalScholarships = invoices.reduce((acc, i) => acc + (i.scholarships || 0), 0);
  const netBilled = invoices.reduce((acc, i) => acc + (i.netTuition || 0), 0);
  const totalCollected = transactions
    .filter(t => t.status === 'Completed')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalOutstanding = Math.max(0, netBilled - totalCollected);
  const collectionRate = netBilled > 0 ? ((totalCollected / netBilled) * 100).toFixed(1) : '100';

  // Aging Analysis
  const now = new Date();
  let currentDue = 0; // < 30 days
  let pastDue30 = 0;  // 30 - 60 days
  let pastDue60 = 0;  // 60 - 90 days
  let pastDue90 = 0;  // > 90 days

  invoices.forEach(inv => {
    if (inv.outstandingBalance > 0) {
      const dueDate = new Date(inv.dueDate);
      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        currentDue += inv.outstandingBalance;
      } else if (diffDays <= 30) {
        pastDue30 += inv.outstandingBalance;
      } else if (diffDays <= 60) {
        pastDue60 += inv.outstandingBalance;
      } else {
        pastDue90 += inv.outstandingBalance;
      }
    }
  });

  // Method Breakdown
  const methodMap: Record<string, number> = {};
  transactions.forEach(t => {
    methodMap[t.paymentMethod] = (methodMap[t.paymentMethod] || 0) + t.amount;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div
        ref={dialogRef}
        className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none"
      >
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                Financial Reports & Institutional Analytics
              </h3>
              <p className="text-xs text-slate-400">
                Tuition revenue, outstanding aging schedule, collection rates & CSV data export.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-slate-900 dark:text-slate-100">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400">Total Billed</span>
              <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                ${netBilled.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400">Gross: ${totalBilled.toLocaleString()}</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-500">Collected</span>
              <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                ${totalCollected.toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-500 font-bold">{collectionRate}% Collection Rate</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-500">Outstanding</span>
              <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                ${totalOutstanding.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400">{invoices.filter(i => i.outstandingBalance > 0).length} students with balance</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-500">Scholarships & Aid</span>
              <p className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
                ${(totalScholarships + totalDiscounts).toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400">${totalScholarships} aid • ${totalDiscounts} disc</p>
            </div>
          </div>

          {/* Collection Progress Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Overall Tuition Collection Pace</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">{collectionRate}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, parseFloat(collectionRate))}%` }}
              />
            </div>
          </div>

          {/* Outstanding Balances Aging Schedule */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Tuition Aging Schedule & Past Due Breakdown
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Current / Not Due</span>
                <p className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                  ${currentDue.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400">Within payment term</p>
              </div>

              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">1 - 30 Days Overdue</span>
                <p className="text-base font-black font-mono text-amber-700 dark:text-amber-300 mt-1">
                  ${pastDue30.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400">First reminder cycle</p>
              </div>

              <div className="p-3 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-xl">
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase">31 - 60 Days Overdue</span>
                <p className="text-base font-black font-mono text-orange-700 dark:text-orange-300 mt-1">
                  ${pastDue60.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400">Second notice cycle</p>
              </div>

              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-xl">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">&gt; 60 Days Overdue</span>
                <p className="text-base font-black font-mono text-rose-700 dark:text-rose-300 mt-1">
                  ${pastDue90.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400">Requires bursar outreach</p>
              </div>
            </div>
          </div>

          {/* Payment Methods Distribution */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-500" />
              Collections by Payment Method
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(methodMap).map(([method, amount]) => (
                <div key={method} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">{method}</span>
                  <p className="text-base font-mono font-black text-slate-900 dark:text-white mt-0.5">
                    ${amount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {totalCollected > 0 ? ((amount / totalCollected) * 100).toFixed(1) : 0}% of total collections
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Export Center */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl space-y-3 print:hidden">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Export Financial Data to CSV
            </h4>
            <p className="text-xs text-slate-300">
              Download clean, comma-separated datasets for Excel, accountant audit packages, or external bursar review.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => exportInvoicesToCSV()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" /> Export Invoices CSV
              </button>
              <button
                onClick={() => exportTransactionsToCSV()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Download className="w-4 h-4" /> Export Transactions Ledger CSV
              </button>
              <button
                onClick={() => exportAuditLogsToCSV()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Download className="w-4 h-4" /> Export Audit Trail CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
