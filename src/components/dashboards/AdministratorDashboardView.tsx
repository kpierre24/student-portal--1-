import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Search, 
  Filter, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck, 
  Bell, 
  UserCheck, 
  Calendar, 
  Sparkles, 
  ChevronRight, 
  RefreshCw, 
  Download, 
  Mail, 
  Check, 
  X, 
  Eye, 
  Plus, 
  AlertCircle,
  CreditCard,
  Layers,
  Send,
  UserX,
  ExternalLink,
  Activity
} from 'lucide-react';
import { 
  StudentSummary, 
  PaymentRecord, 
  ClassDay, 
  CustomAssignment, 
  AssignmentSubmission, 
  TabType 
} from '../../types';
import { AppUser } from '../../lib/userAuth';
import { EnrollmentInquiry } from '../EnrollmentInquiryModal';
import { RoleActionHero, ActionTask } from './RoleActionHero';
import { AdministrativeDataOperationsCard } from '../../features/admin/AdministrativeDataOperationsCard';

interface AdministratorDashboardViewProps {
  students: StudentSummary[];
  payments: PaymentRecord[];
  classDays: ClassDay[];
  customAssignments: CustomAssignment[];
  submissions: AssignmentSubmission[];
  coursesCount: number;
  onNavigate: (tab: TabType) => void;
  atRiskThreshold: number;
  isCloudSyncing?: boolean;
  lastSyncedTime?: string | null;
  onPushToCloud?: () => Promise<void>;
  appUser: AppUser | null;
  onOpenSystemHealth?: () => void;
  onOpenAdminAuditModal?: () => void;
}

export const AdministratorDashboardView: React.FC<AdministratorDashboardViewProps> = ({
  students = [],
  payments = [],
  classDays = [],
  customAssignments = [],
  submissions = [],
  coursesCount,
  onNavigate,
  atRiskThreshold = 75,
  isCloudSyncing = false,
  lastSyncedTime = null,
  onPushToCloud,
  appUser,
  onOpenSystemHealth,
  onOpenAdminAuditModal
}) => {
  // State for search and filters
  const [atRiskSearch, setAtRiskSearch] = useState('');
  const [atRiskFilter, setAtRiskFilter] = useState<'all' | 'critical' | 'moderate'>('all');
  const [inquirySearch, setInquirySearch] = useState('');
  const [sentAlertStudent, setSentAlertStudent] = useState<string | null>(null);

  // 1. Total Students Metrics
  const totalStudents = students.length;
  const honorRollStudents = useMemo(() => students.filter(s => s.rate >= 85 || (s.avgScore !== null && s.avgScore >= 85)), [students]);
  const satisfactoryStudents = useMemo(() => students.filter(s => s.rate >= atRiskThreshold && s.rate < 85), [students, atRiskThreshold]);
  const atRiskStudents = useMemo(() => students.filter(s => s.rate < atRiskThreshold).sort((a, b) => a.rate - b.rate), [students, atRiskThreshold]);
  const criticalAtRisk = useMemo(() => atRiskStudents.filter(s => s.rate <= 50), [atRiskStudents]);

  // Filtered At-Risk list
  const filteredAtRisk = useMemo(() => {
    return atRiskStudents.filter(s => {
      if (atRiskFilter === 'critical' && s.rate > 50) return false;
      if (atRiskFilter === 'moderate' && s.rate <= 50) return false;
      if (atRiskSearch.trim()) {
        return s.name.toLowerCase().includes(atRiskSearch.toLowerCase().trim());
      }
      return true;
    });
  }, [atRiskStudents, atRiskFilter, atRiskSearch]);

  // 2. Active Courses & Modules
  const activeModules = [
    { code: 'SOM-MOD-1', title: 'Foundations & Kingdom Alignment', instructor: 'Apostle Gillian Selkridge', active: true, progress: 100 },
    { code: 'SOM-MOD-2', title: 'Evangelism & Discipleship', instructor: 'Pastor Samuel Selkridge', active: true, progress: 100 },
    { code: 'SOM-MOD-3', title: 'Ministerial Ethics & Integrity', instructor: 'Pastor Gale Grant', active: true, progress: 85 },
    { code: 'SOM-MOD-4', title: 'Apostolic Ministry & Five-Fold Order', instructor: 'Pastor Christy Arthur', active: true, progress: 70 },
    { code: 'SOM-MOD-5', title: 'Prophetic Discernment & Warfare', instructor: 'Prophet Garod Andrews', active: true, progress: 50 },
    { code: 'SOM-MOD-6', title: 'School of Pastors & Teachers', instructor: 'Pastor Samuel Selkridge', active: true, progress: 40 },
  ];

  // 3. Outstanding Fees & Financial Summary
  const financialMetrics = useMemo(() => {
    let totalTuition = 0;
    let totalCollected = 0;
    let unpaidCount = 0;

    payments.forEach(p => {
      totalTuition += (p.totalTuition || 0);
      totalCollected += (p.amountPaid || 0);
      const balance = (p.totalTuition || 0) - (p.amountPaid || 0);
      if (balance > 0) {
        unpaidCount++;
      }
    });

    const outstandingBalance = Math.max(0, totalTuition - totalCollected);
    const collectionRate = totalTuition > 0 ? Math.round((totalCollected / totalTuition) * 100) : 0;

    return {
      totalTuition,
      totalCollected,
      outstandingBalance,
      collectionRate,
      unpaidCount
    };
  }, [payments]);

  // 4. Pending Enrollments / Inquiries
  const [inquiries, setInquiries] = useState<EnrollmentInquiry[]>(() => {
    try {
      const saved = localStorage.getItem('hteim_enrollment_inquiries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed loading inquiries:", e);
    }
    // Default initial mock applicants
    return [
      {
        id: 'inq_101',
        fullName: 'Minister Caleb Washington',
        email: 'caleb.w@minister.org',
        phone: '+1 (868) 723-4567',
        academicLevel: 'level_2',
        learningFormat: 'hybrid',
        callingBackground: 'Associate Pastor & Youth Department Leader with 4 years serving.',
        timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
        status: 'new'
      },
      {
        id: 'inq_102',
        fullName: 'Evangelist Hannah Pierre',
        email: 'hannah.p@outreach.org',
        phone: '+1 (868) 689-1234',
        academicLevel: 'level_1',
        learningFormat: 'online',
        callingBackground: 'Street ministry evangelism and hospital intercession team leader.',
        timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
        status: 'new'
      },
      {
        id: 'inq_103',
        fullName: 'Brother Elijah Samuel',
        email: 'elijah.samuel@gmail.com',
        phone: '+1 (868) 490-8821',
        academicLevel: 'level_1',
        learningFormat: 'in_person',
        callingBackground: 'Worship ministry leader seeking deeper theological foundations.',
        timestamp: new Date(Date.now() - 72 * 3600000).toISOString(),
        status: 'new'
      }
    ];
  });

  const pendingInquiriesCount = useMemo(() => inquiries.filter(i => i.status === 'new').length, [inquiries]);

  const handleApproveInquiry = (id: string) => {
    setInquiries(prev => {
      const updated = prev.map(inq => inq.id === id ? { ...inq, status: 'approved' as const } : inq);
      try {
        localStorage.setItem('hteim_enrollment_inquiries', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // 5. Recent Payments Ledger
  const recentPayments = useMemo(() => {
    const list = [...payments];
    // Sort by latest payments
    return list.slice(0, 5);
  }, [payments]);

  // 6. Upcoming Classes
  const upcomingClassesList = useMemo(() => {
    if (classDays && classDays.length > 0) {
      return classDays.slice(-3).reverse();
    }
    return [
      { id: 'cd-1', name: 'Module 6: Pastoral Care & Preaching', date: '2026-09-08' },
      { id: 'cd-2', name: 'Module 5: Prophetic Protocol & Discernment', date: '2026-09-15' },
      { id: 'cd-3', name: 'Module 6: Practical Homiletics Lab', date: '2026-09-22' }
    ];
  }, [classDays]);

  const handleSendAtRiskAlert = (studentName: string) => {
    setSentAlertStudent(studentName);
    setTimeout(() => {
      setSentAlertStudent(null);
    }, 3000);
  };

  // Immediate Next Action Tasks for Administrator
  const adminName = appUser?.name || 'School Administrator';
  const adminTasks: ActionTask[] = useMemo(() => {
    const list: ActionTask[] = [];

    if (atRiskStudents.length > 0) {
      list.push({
        id: 'admin-at-risk-alert',
        title: `Review At-Risk Students (${atRiskStudents.length} Flagged Below ${atRiskThreshold}%)`,
        subtitle: `${criticalAtRisk.length} students critical (<= 50%). Send attendance alerts or issue counseling overrides.`,
        urgency: 'high',
        badge: 'At-Risk Warning System',
        actionText: 'Manage At-Risk Roster',
        targetTab: 'attendance'
      });
    }

    if (financialMetrics.unpaidCount > 0) {
      list.push({
        id: 'admin-uncollected-tuition',
        title: `Uncollected Tuition Balance ($${financialMetrics.outstandingBalance.toLocaleString()} USD)`,
        subtitle: `${financialMetrics.unpaidCount} student payment records require invoice follow-up or payment posting.`,
        urgency: 'medium',
        badge: 'Financial Audit',
        actionText: 'Audit Tuition Records',
        targetTab: 'payments'
      });
    }

    list.push({
      id: 'admin-reports',
      title: 'Generate Registrar Academic Transcripts & Reports',
      subtitle: 'Compile cohort attendance averages, honors lists, and export official CSV/PDF records.',
      urgency: 'normal',
      badge: 'Academic Records',
      actionText: 'Open Reports Center',
      targetTab: 'reports'
    });

    return list;
  }, [atRiskStudents.length, atRiskThreshold, criticalAtRisk.length, financialMetrics]);

  return (
    <div className="space-y-6" id="administrator-dashboard">
      
      {/* ─── Immediate Next Action Hero Banner ─── */}
      <RoleActionHero
        roleTitle="Executive Administration Portal"
        roleBadge="Administrator Command Center"
        userName={adminName}
        tasks={adminTasks}
        onNavigate={onNavigate}
      />

      {/* ─── Top Banner & Command Summary ─── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#022044] via-[#023264] to-[#041a33] text-white p-5 sm:p-7 shadow-xl border border-[#025798]/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#b38f53]/15 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-300 shrink-0" />
                Administrative Command Center
              </span>
              <span className="text-[10px] font-mono text-sky-200/80 px-2 py-0.5 rounded-full bg-white/10">
                School Year 2025–2026
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
              Institutional Operations & Oversight
            </h1>
            <p className="text-xs text-sky-100/85 max-w-2xl">
              Real-time synchronization across student rosters, curriculum pacing, outstanding balances, at-risk alerts, and admissions inquiries.
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="px-3.5 py-2 rounded-xl bg-[#b38f53] hover:bg-[#a07c42] text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 border border-[#dfc18b]"
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-950" />
              <span>Mark Attendance</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('students')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/15 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Users className="w-3.5 h-3.5 text-amber-300" />
              <span>Student Roster ({totalStudents})</span>
            </button>

            {onOpenSystemHealth && (
              <button
                type="button"
                onClick={onOpenSystemHealth}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs transition-all border border-emerald-400/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Open System Health & Readiness Center"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>System Health</span>
              </button>
            )}

            {onPushToCloud && (
              <button
                type="button"
                onClick={onPushToCloud}
                disabled={isCloudSyncing}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/15 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Backup and synchronize with Supabase cloud storage"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-sky-300 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                <span>{isCloudSyncing ? 'Syncing...' : 'Cloud Sync'}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── 1. Primary Metrics Row (Total Students, Active Courses, Outstanding Fees, Attendance Alerts) ─── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Administrator Core Metrics">
        
        {/* Total Students Card */}
        <div 
          onClick={() => onNavigate('students')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Students
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#025798] dark:text-[#7dd3fc] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-tabular">
                {totalStudents}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                100% Enrolled
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                <Award className="w-3 h-3" /> {honorRollStudents.length} Honor Roll
              </span>
              <span>•</span>
              <span className="text-slate-600 dark:text-slate-400">
                {satisfactoryStudents.length} Satisfactory
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-[#025798] dark:text-[#7dd3fc] font-bold group-hover:underline">
            <span>View Full Roster</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Active Courses Card */}
        <div 
          onClick={() => onNavigate('courses')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Courses
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-tabular">
                6 Modules
              </span>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                Core Equipping
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">
              Lead: Apostle Gillian Selkridge & Faculty
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400 font-bold group-hover:underline">
            <span>Curriculum Framework</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Outstanding Fees Card */}
        <div 
          onClick={() => onNavigate('payments')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Outstanding Fees
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-tabular">
                ${financialMetrics.outstandingBalance.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {financialMetrics.collectionRate}% Collected
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {financialMetrics.unpaidCount} student(s) with balance due
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold group-hover:underline">
            <span>Financial Statements</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Attendance Alerts Card */}
        <div 
          onClick={() => {
            const el = document.getElementById('attendance-alerts-container');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`border rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between ${
            atRiskStudents.length > 0 
              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Attendance Alerts
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-tabular">
                {atRiskStudents.length}
              </span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                &lt;{atRiskThreshold}% Standard
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {criticalAtRisk.length} critical at risk (&le;50%)
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-rose-600 dark:text-rose-400 font-bold group-hover:underline">
            <span>Review At-Risk Notices</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

      </section>

      {/* ─── 2. Administrative & Cloud Data Operations Hub ─── */}
      <AdministrativeDataOperationsCard
        isCloudSyncing={isCloudSyncing}
        lastSyncedTime={lastSyncedTime}
        onPushToCloud={onPushToCloud}
        onOpenAuditAndBackup={onOpenAdminAuditModal}
        onOpenSystemHealth={onOpenSystemHealth}
        currentActorName={appUser?.name || 'Administrator'}
      />

      {/* ─── 3. Middle Grid: Attendance Alerts & Pending Enrollments ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Attendance Alerts Detailed Panel (7 cols) */}
        <div 
          id="attendance-alerts-container" 
          className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>At-Risk Attendance Monitoring</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
                      {atRiskStudents.length} Flagged
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Students below the 75% attendance threshold for graduation commissioning
                  </p>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setAtRiskFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    atRiskFilter === 'all' 
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  All ({atRiskStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAtRiskFilter('critical')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    atRiskFilter === 'critical' 
                      ? 'bg-rose-600 text-white shadow-xs' 
                      : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                >
                  Critical &le;50% ({criticalAtRisk.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAtRiskFilter('moderate')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    atRiskFilter === 'moderate' 
                      ? 'bg-amber-600 text-white shadow-xs' 
                      : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  }`}
                >
                  Moderate ({atRiskStudents.length - criticalAtRisk.length})
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={atRiskSearch}
                onChange={(e) => setAtRiskSearch(e.target.value)}
                placeholder="Search at-risk students by name..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#025798]"
              />
            </div>

            {/* List of At-Risk Students */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredAtRisk.length > 0 ? (
                filteredAtRisk.map((student, sIdx) => {
                  const isCritical = student.rate <= 50;
                  return (
                    <div 
                      key={`at-risk-${student.name}-${sIdx}`}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {student.name}
                          </p>
                          <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold ${
                            isCritical 
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800' 
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          }`}>
                            {Math.round(student.rate)}% Rate
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Attended: <strong className="text-slate-700 dark:text-slate-300">{student.attended} of {student.totalDays}</strong> sessions • Needs {Math.max(1, Math.ceil(student.totalDays * (atRiskThreshold / 100)) - student.attended)} more sessions to reach 75%
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSendAtRiskAlert(student.name)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-[10px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          {sentAlertStudent === student.name ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Notice Sent!</span>
                            </>
                          ) : (
                            <>
                              <Bell className="w-3 h-3 text-rose-500" />
                              <span>Notify</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigate('students')}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="View Student Profile"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">No matching at-risk records found.</p>
                  <p className="text-[11px] text-slate-400">All students are currently meeting the attendance standard.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Automatic triggers sent every Tuesday & Thursday</span>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-[#025798] dark:text-[#7dd3fc] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Attendance Sessions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pending Enrollments Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Pending Enrollments</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                      {pendingInquiriesCount} New
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Prospective applicant inquiries & cohort applications
                  </p>
                </div>
              </div>
            </div>

            {/* Inquiries list */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {inquiries.length > 0 ? (
                inquiries.map(inq => (
                  <div
                    key={inq.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white">{inq.fullName}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{inq.email} • {inq.phone}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        inq.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {inq.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 italic bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                      "{inq.callingBackground}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <span className="font-semibold text-slate-500">
                        Format: <strong className="text-slate-700 dark:text-slate-300 uppercase">{inq.learningFormat}</strong>
                      </span>
                      {inq.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleApproveInquiry(inq.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve & Enroll</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <p>No enrollment applications currently pending.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Admissions Cycle 2026</span>
            <button
              type="button"
              onClick={() => onNavigate('students')}
              className="text-[#025798] dark:text-[#7dd3fc] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Cohorts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </section>

      {/* ─── 3. Bottom Grid: Recent Payments & Upcoming Classes ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Payments Ledger (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  Recent Tuition Payments
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Latest recorded installments, sponsorships, and online payments
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className="text-xs font-bold text-[#025798] dark:text-[#7dd3fc] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="pb-2">Student Name</th>
                  <th className="pb-2">Tuition Paid</th>
                  <th className="pb-2">Remaining</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentPayments.map(p => {
                  const balance = (p.totalTuition || 0) - (p.amountPaid || 0);
                  const isPaid = balance <= 0 || p.status === 'Paid In Full';
                  return (
                    <tr key={p.studentName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 font-bold text-slate-900 dark:text-white">
                        {p.studentName}
                      </td>
                      <td className="py-2.5 font-tabular font-bold text-emerald-600 dark:text-emerald-400">
                        ${p.amountPaid}
                      </td>
                      <td className="py-2.5 font-tabular text-slate-500 dark:text-slate-400">
                        ${balance}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          isPaid 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {isPaid ? 'Paid in Full' : 'Partial'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigate('payments')}
                          className="text-[11px] text-[#025798] dark:text-[#7dd3fc] font-bold hover:underline cursor-pointer"
                        >
                          Statement
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Classes Schedule (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  Upcoming Classes
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Scheduled lecture days and hybrid sessions
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('schedule')}
              className="text-xs font-bold text-[#025798] dark:text-[#7dd3fc] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {upcomingClassesList.map((session, idx) => (
              <div
                key={session.id || idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {session.name}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Date: <strong className="text-slate-700 dark:text-slate-300">{session.date || 'TBD'}</strong> • 7:00 PM EST (Live & In-Person)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="px-2.5 py-1 rounded-lg bg-[#023264] hover:bg-[#025798] text-white text-[10px] font-bold shrink-0 transition-colors cursor-pointer active:scale-95 shadow-2xs"
                >
                  Mark Attendance
                </button>
              </div>
            ))}
          </div>
        </div>

      </section>

    </div>
  );
};
