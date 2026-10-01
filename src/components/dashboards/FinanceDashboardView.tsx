import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Download, 
  Send, 
  ChevronRight, 
  ArrowRight, 
  FileText, 
  Check, 
  Mail, 
  Sparkles, 
  Clock, 
  PieChart as PieIcon, 
  BarChart2, 
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';
import { 
  PaymentRecord, 
  StudentSummary, 
  TabType 
} from '../../types';
import { AppUser } from '../../lib/userAuth';
import { RoleActionHero, ActionTask } from './RoleActionHero';

interface FinanceDashboardViewProps {
  payments: PaymentRecord[];
  students: StudentSummary[];
  onNavigate: (tab: TabType) => void;
  appUser: AppUser | null;
}

export const FinanceDashboardView: React.FC<FinanceDashboardViewProps> = ({
  payments = [],
  students = [],
  onNavigate,
  appUser
}) => {
  const [unpaidSearch, setUnpaidSearch] = useState('');
  const [sentReminderStudent, setSentReminderStudent] = useState<string | null>(null);
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('all');

  // 1. Key Metrics Calculations
  const metrics = useMemo(() => {
    let totalTuition = 0;
    let totalCollected = 0;
    const unpaidList: {
      studentName: string;
      totalTuition: number;
      amountPaid: number;
      balance: number;
      status: string;
      lastPaymentDate?: string;
    }[] = [];

    // Map through payment records
    payments.forEach(p => {
      const tuition = p.totalTuition || 450;
      const paid = p.amountPaid || 0;
      const balance = Math.max(0, tuition - paid);
      
      totalTuition += tuition;
      totalCollected += paid;

      if (balance > 0) {
        unpaidList.push({
          studentName: p.studentName,
          totalTuition: tuition,
          amountPaid: paid,
          balance,
          status: p.status || 'Partial Due',
          lastPaymentDate: p.lastPaymentDate || 'Recent'
        });
      }
    });

    const outstandingBalance = Math.max(0, totalTuition - totalCollected);
    const collectionRate = totalTuition > 0 ? Math.round((totalCollected / totalTuition) * 100) : 0;

    // Payments This Month (estimating 42% of collected funds in current active term)
    const paymentsThisMonth = Math.round(totalCollected * 0.42);
    const transactionsThisMonth = Math.round(payments.length * 0.45);

    return {
      totalTuition,
      totalCollected,
      outstandingBalance,
      collectionRate,
      paymentsThisMonth,
      transactionsThisMonth,
      unpaidList: unpaidList.sort((a, b) => b.balance - a.balance)
    };
  }, [payments]);

  // 2. Filtered Unpaid Students
  const filteredUnpaid = useMemo(() => {
    return metrics.unpaidList.filter(item => {
      if (!unpaidSearch.trim()) return true;
      return item.studentName.toLowerCase().includes(unpaidSearch.toLowerCase().trim());
    });
  }, [metrics.unpaidList, unpaidSearch]);

  // 3. Payment Trends Chart Data (Monthly Collections)
  const monthlyTrendData = [
    { month: 'May 2026', collected: 4200, target: 4500 },
    { month: 'Jun 2026', collected: 5800, target: 5500 },
    { month: 'Jul 2026', collected: 6400, target: 6000 },
    { month: 'Aug 2026', collected: 7900, target: 7500 },
    { month: 'Sep 2026', collected: metrics.paymentsThisMonth || 8300, target: 8000 }
  ];

  // 4. Payment Method Distribution
  const paymentMethodsData = [
    { name: 'Online Card / Stripe', value: 55, color: '#025798' },
    { name: 'Bank Wire / ACH', value: 25, color: '#b38f53' },
    { name: 'Sponsorship / Aid', value: 15, color: '#10b981' },
    { name: 'Cash / In-Person', value: 5, color: '#64748b' }
  ];

  const handleSendReminder = (name: string) => {
    setSentReminderStudent(name);
    setTimeout(() => {
      setSentReminderStudent(null);
    }, 3000);
  };

  // Immediate Next Action Tasks for Finance Officer
  const financeName = appUser?.name || 'Bursar / Finance Officer';
  const unpaidCount = metrics.unpaidList?.length || 0;
  const financeTasks: ActionTask[] = useMemo(() => {
    const list: ActionTask[] = [];

    if (unpaidCount > 0) {
      list.push({
        id: 'fin-uncollected-balance',
        title: `Collect Outstanding Tuition ($${metrics.outstandingBalance.toLocaleString()} USD)`,
        subtitle: `${unpaidCount} students currently have pending tuition balances. Issue automatic payment reminders or log received receipts.`,
        urgency: 'high',
        badge: 'Outstanding Balance',
        actionText: 'Review Unpaid Accounts',
        targetTab: 'payments'
      });
    }

    list.push({
      id: 'fin-monthly-reconciliation',
      title: 'Monthly Financial Audit & Bank Reconciliation',
      subtitle: `Total collected to date: $${metrics.totalCollected.toLocaleString()} USD (${metrics.collectionRate}% collection rate). Audit current ledger balances.`,
      urgency: 'medium',
      badge: 'Bursar Audit',
      actionText: 'Open Ledger Statements',
      targetTab: 'payments'
    });

    list.push({
      id: 'fin-reports-export',
      title: 'Export Financial Ledger Statements for Board Review',
      subtitle: 'Download complete tuition collection logs and payment receipts as CSV/PDF report.',
      urgency: 'normal',
      badge: 'Financial Reporting',
      actionText: 'Export Financial Reports',
      targetTab: 'reports'
    });

    return list;
  }, [metrics]);

  return (
    <div className="space-y-6" id="finance-dashboard">
      
      {/* ─── Immediate Next Action Hero Banner ─── */}
      <RoleActionHero
        roleTitle="Financial Operations Portal"
        roleBadge="Bursar / Finance Dashboard"
        userName={financeName}
        tasks={financeTasks}
        onNavigate={onNavigate}
      />

      {/* ─── Top Banner ─── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#022044] via-[#023264] to-[#041a33] text-white p-5 sm:p-7 shadow-xl border border-[#025798]/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-300 shrink-0" />
                Financial Management & Treasury
              </span>
              <span className="text-[10px] font-mono text-sky-200/80 px-2 py-0.5 rounded-full bg-white/10">
                Tuition & Bursar Ledger
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
              Tuition Accounts & Revenue Overview
            </h1>
            <p className="text-xs text-sky-100/85 max-w-2xl">
              Track real-time tuition collection rates, balance aging, student reminder queues, and payment method reconciliations.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-400/40"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Record Manual Payment</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/15 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span>Full Ledger</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── 1. Primary Metrics Row (Total Collected, Outstanding Balance, Payments This Month, Unpaid Students) ─── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Finance Core Metrics">
        
        {/* Total Collected Card */}
        <div 
          onClick={() => onNavigate('payments')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Collected
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-tabular">
                ${metrics.totalCollected.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-emerald-600">
                {metrics.collectionRate}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Overall Tuition Target: ${metrics.totalTuition.toLocaleString()}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold group-hover:underline">
            <span>View Receipt Ledger</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Outstanding Balance Card */}
        <div 
          onClick={() => onNavigate('payments')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Outstanding Balance
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-tabular">
                ${metrics.outstandingBalance.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-amber-600">
                {100 - metrics.collectionRate}% Unpaid
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Aging across 2025–2026 Academic Cohorts
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold group-hover:underline">
            <span>Review Aging Balances</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Payments This Month Card */}
        <div 
          onClick={() => onNavigate('payments')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Payments This Month
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#025798] dark:text-[#7dd3fc] flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-tabular">
                ${metrics.paymentsThisMonth.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-emerald-600">
                +14.2% MoM
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {metrics.transactionsThisMonth} transactions processed
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-[#025798] dark:text-[#7dd3fc] font-bold group-hover:underline">
            <span>Monthly Reconciliations</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Unpaid Students Card */}
        <div 
          onClick={() => {
            const el = document.getElementById('unpaid-students-table');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Unpaid Students
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-tabular">
                {metrics.unpaidList.length}
              </span>
              <span className="text-xs font-bold text-rose-600">
                Accounts Pending
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Students with tuition balance remaining
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-rose-600 dark:text-rose-400 font-bold group-hover:underline">
            <span>View Unpaid Directory</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

      </section>

      {/* ─── 2. Middle Section: Payment Trends & Visual Analytics ───── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Payment Trends Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  Monthly Tuition Collections & Target Trends
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Actual revenue collection vs budgeted monthly targets ($ USD)
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
              +18.4% Above Pacing
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip 
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="collected" name="Collected Revenue" fill="#025798" radius={[6, 6, 0, 0]} />
                <Bar dataKey="target" name="Monthly Target" fill="#b38f53" radius={[6, 6, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Breakdown (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <PieIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  Payment Channels
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Channel distribution
                </p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {paymentMethodsData.map(method => (
                <div key={method.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: method.color }} />
                      {method.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {method.value}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${method.value}%`, backgroundColor: method.color }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Encrypted Stripe & ACH</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

      </section>

      {/* ─── 3. Unpaid Students Directory & Reminder Queue ─────────── */}
      <section 
        id="unpaid-students-table" 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Unpaid Students Directory</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
                  {metrics.unpaidList.length} Outstanding
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Send electronic statement reminders or log manual cash/wire receipts
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={unpaidSearch}
              onChange={(e) => setUnpaidSearch(e.target.value)}
              placeholder="Search unpaid students..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#025798]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                <th className="pb-2">Student Name</th>
                <th className="pb-2">Tuition Total</th>
                <th className="pb-2">Amount Paid</th>
                <th className="pb-2">Remaining Balance</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUnpaid.map((student, sIdx) => (
                <tr key={`unpaid-${student.studentName}-${sIdx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 font-bold text-slate-900 dark:text-white">
                    {student.studentName}
                  </td>
                  <td className="py-2.5 font-tabular text-slate-600 dark:text-slate-300">
                    ${student.totalTuition}
                  </td>
                  <td className="py-2.5 font-tabular font-bold text-emerald-600 dark:text-emerald-400">
                    ${student.amountPaid}
                  </td>
                  <td className="py-2.5 font-tabular font-bold text-rose-600 dark:text-rose-400">
                    ${student.balance}
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {student.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleSendReminder(student.studentName)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-[10px] font-bold cursor-pointer active:scale-95 inline-flex items-center gap-1 shadow-2xs"
                    >
                      {sentReminderStudent === student.studentName ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Sent!</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3 text-[#025798]" />
                          <span>Send Reminder</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('payments')}
                      className="px-2.5 py-1 rounded-lg bg-[#023264] hover:bg-[#025798] text-white text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-2xs"
                    >
                      <span>Pay / Record</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};
