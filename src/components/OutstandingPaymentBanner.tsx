import React from 'react';
import { 
  AlertTriangle, 
  DollarSign, 
  X, 
  Receipt, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  Clock, 
  CreditCard 
} from 'lucide-react';
import { StudentPaymentSummary } from '../lib/paymentUtils';

interface OutstandingPaymentBannerProps {
  summary: StudentPaymentSummary;
  onClose: () => void;
  onViewStatement: () => void;
}

export const OutstandingPaymentBanner: React.FC<OutstandingPaymentBannerProps> = ({
  summary,
  onClose,
  onViewStatement
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div 
        className="relative bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-500/40 rounded-xl shadow-xl max-w-lg w-full overflow-hidden animate-scaleUp text-slate-900 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-banner-title"
      >
        {/* Top Banner Header */}
        <div className="bg-amber-50 dark:bg-amber-950/40 p-5 text-slate-900 dark:text-white flex items-center justify-between border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center border border-amber-200 dark:border-amber-800 flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-widest bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Account Notice
                </span>
              </div>
              <h3 id="payment-banner-title" className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
                Outstanding Tuition Balance
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
            title="Close Notice"
            aria-label="Close Notice">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Student Account ID Banner */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="space-y-0.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Logged-in Student</p>
              <p className="font-black text-slate-900 dark:text-slate-100 text-sm">{summary.studentName}</p>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">ID: {summary.studentId}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300/50">
              {summary.status || 'Payment Due'}
            </span>
          </div>

          {/* Highlighted Big Balance Box */}
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/30 border border-amber-500/40 rounded-xl p-5 text-center space-y-1.5 shadow-xs">
            <div className="flex items-center justify-center gap-1.5 text-amber-800 dark:text-amber-300 font-extrabold text-xs uppercase tracking-wider">
              <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Outstanding Balance Due
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-amber-700 dark:text-amber-300 tracking-tight">
              ${summary.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-amber-900/80 dark:text-amber-200/90 font-medium max-w-sm mx-auto">
              Please settle your pending balance with the administration or log tuition payments in the My Payments section.
            </p>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/70">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tuition</p>
              <p className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                ${summary.totalTuition.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Amount Paid</p>
              <p className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm mt-0.5">
                ${summary.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Information & Instruction Text */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 text-[11px] text-slate-600 dark:text-slate-300">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              You must close this notice to proceed into the student portal. You can view your full itemized tuition statement and payment receipts anytime under the <strong>My Payments</strong> tab.
            </span>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="p-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => {
              onViewStatement();
              onClose();
            }}
            className="w-full sm:flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-2 px-4 rounded-xl shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Receipt className="w-4 h-4" />
            <span>View My Payment Statement</span>
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold py-2 px-5 rounded-xl transition-all text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            I Acknowledge & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
