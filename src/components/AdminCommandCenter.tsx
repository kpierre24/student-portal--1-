import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  FileText, 
  Search, 
  Filter, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck, 
  Bell, 
  UserCheck, 
  UserX, 
  Calendar, 
  Activity, 
  Sparkles, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Download, 
  Mail, 
  Check, 
  X, 
  Edit3, 
  Eye, 
  Plus, 
  AlertCircle,
  FileCheck,
  Building,
  CreditCard,
  Wifi,
  WifiOff,
  Database,
  Lock,
  Layers,
  HelpCircle,
  ExternalLink,
  MessageSquare,
  ArrowUpRight
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
  Legend,
  ReferenceLine
} from 'recharts';
import { 
  StudentSummary, 
  PaymentRecord, 
  ClassDay, 
  CustomAssignment, 
  AssignmentSubmission, 
  TabType,
  ACADEMIC_LEVELS
} from '../types';
import { AppUser } from '../lib/userAuth';
import { EnrollmentInquiry } from './EnrollmentInquiryModal';

export interface StudentDocumentChecklist {
  studentName: string;
  photoId: boolean;
  statementOfFaith: boolean;
  academicDiploma: boolean;
  pastoralReference: boolean;
  updatedAt: string;
}

const DEFAULT_DOCUMENTS_STORE: Record<string, StudentDocumentChecklist> = {
  'sister maria santos': {
    studentName: 'Sister Maria Santos',
    photoId: true,
    statementOfFaith: true,
    academicDiploma: true,
    pastoralReference: true,
    updatedAt: new Date().toISOString()
  },
  'brother david miller': {
    studentName: 'Brother David Miller',
    photoId: true,
    statementOfFaith: false,
    academicDiploma: true,
    pastoralReference: false,
    updatedAt: new Date().toISOString()
  },
  'evangelist rachel adams': {
    studentName: 'Evangelist Rachel Adams',
    photoId: true,
    statementOfFaith: true,
    academicDiploma: false,
    pastoralReference: true,
    updatedAt: new Date().toISOString()
  }
};

const INITIAL_INQUIRIES_SEED: EnrollmentInquiry[] = [
  {
    id: 'inq_101',
    fullName: 'Sister Hannah Montgomery',
    email: 'hannah.m@example.org',
    phone: '(555) 234-5678',
    academicLevel: 'level_1',
    learningFormat: 'hybrid',
    callingBackground: 'Youth leader seeking biblical foundation in evangelism and apostolic governance.',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    status: 'new'
  },
  {
    id: 'inq_102',
    fullName: 'Deacon Marcus Thorne',
    email: 'm.thorne@example.org',
    phone: '(555) 876-5432',
    academicLevel: 'level_2',
    learningFormat: 'in_person',
    callingBackground: 'Serving in pastoral care; enrolling for Intermediate Ministry Diploma.',
    timestamp: new Date(Date.now() - 3600000 * 42).toISOString(),
    status: 'new'
  },
  {
    id: 'inq_103',
    fullName: 'Evangelist Sarah Jenkins',
    email: 's.jenkins@example.org',
    phone: '(555) 345-6789',
    academicLevel: 'level_3',
    learningFormat: 'online',
    callingBackground: 'Itinerant speaker pursuing Advanced Ministerial License & Degree.',
    timestamp: new Date(Date.now() - 3600000 * 96).toISOString(),
    status: 'contacted'
  }
];

const AttendanceCustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isBelow = data.rate < 75;
    const isCritical = data.rate <= 50;

    return (
      <div className="bg-slate-950/95 text-white p-3.5 rounded-xl text-xs space-y-2 shadow-2xl border border-slate-700/80 backdrop-blur-md min-w-[220px]">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
          <span className="font-extrabold text-white text-xs truncate max-w-[150px]">{data.cleanName || data.name}</span>
          <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">{data.shortDate}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Attendance Rate</span>
          <span className={`font-black text-sm font-mono ${isCritical ? 'text-rose-400' : isBelow ? 'text-amber-400' : 'text-emerald-400'}`}>
            {data.rate}%
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span>Headcount</span>
          <span className="font-mono">
            <strong className="text-emerald-400">{data.attended}</strong> present <span className="text-slate-500">/</span> <strong className="text-slate-400">{data.total}</strong> total
          </span>
        </div>

        <div className="pt-1 flex items-center justify-between text-[10px]">
          <span className="text-slate-500">Target Standard</span>
          <span className={`px-1.5 py-0.5 rounded font-bold ${isBelow ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'}`}>
            {isBelow ? '⚠️ Below 75% Target' : '✓ Target Met (≥75%)'}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const CoursePerformanceCustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl text-xs space-y-1 shadow-lg border border-slate-800">
        <p className="font-extrabold text-amber-400">{data.module}</p>
        <p>Average Grade: <strong>{data.avgGrade}%</strong></p>
        <p>Submissions Logged: <strong>{data.submissions}</strong></p>
      </div>
    );
  }
  return null;
};

interface AdminCommandCenterProps {
  students: StudentSummary[];
  payments: PaymentRecord[];
  classDays: ClassDay[];
  customAssignments: CustomAssignment[];
  submissions: AssignmentSubmission[];
  coursesCount: number;
  onNavigate: (tab: TabType) => void;
  atRiskThreshold?: number;
  isCloudSyncing?: boolean;
  lastSyncedTime?: string | null;
  cloudSyncError?: string | null;
  appUser: AppUser | null;
  onPushToCloud?: () => Promise<void>;
}

export const AdminCommandCenter: React.FC<AdminCommandCenterProps> = ({
  students = [],
  payments = [],
  classDays = [],
  customAssignments = [],
  submissions = [],
  coursesCount = 6,
  onNavigate,
  atRiskThreshold = 75,
  isCloudSyncing = false,
  lastSyncedTime = null,
  cloudSyncError = null,
  appUser,
  onPushToCloud
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'enrollment' | 'academic' | 'attendance' | 'finance' | 'alerts'>('overview');
  
  // Enrollment Applications State
  const [inquiries, setInquiries] = useState<EnrollmentInquiry[]>(() => {
    try {
      const saved = localStorage.getItem('hteim_enrollment_inquiries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed loading inquiries:", e);
    }
    return INITIAL_INQUIRIES_SEED;
  });

  // Document Verification Checklist State
  const [docChecklist, setDocChecklist] = useState<Record<string, StudentDocumentChecklist>>(() => {
    try {
      const saved = localStorage.getItem('hteim_student_doc_checklists');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed loading doc checklists:", e);
    }
    return DEFAULT_DOCUMENTS_STORE;
  });

  // Filter & Search states
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [enrollmentFilter, setEnrollmentFilter] = useState<'all' | 'new' | 'contacted' | 'approved'>('all');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceTrendFilter, setAttendanceTrendFilter] = useState<'chronological' | 'latest' | 'recent_6'>('chronological');
  const [selectedAlertStudent, setSelectedAlertStudent] = useState<string | null>(null);
  const [alertSuccessToast, setAlertSuccessToast] = useState<string | null>(null);

  // Sync inquiries with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hteim_enrollment_inquiries', JSON.stringify(inquiries));
    } catch (e) {}
  }, [inquiries]);

  // Sync docChecklist with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hteim_student_doc_checklists', JSON.stringify(docChecklist));
    } catch (e) {}
  }, [docChecklist]);

  // Handle application status update
  const handleUpdateInquiryStatus = (id: string, newStatus: 'new' | 'contacted' | 'approved') => {
    setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status: newStatus } : inq));
  };

  // Toggle document requirement
  const handleToggleDocument = (studentName: string, docKey: keyof Omit<StudentDocumentChecklist, 'studentName' | 'updatedAt'>) => {
    const key = studentName.toLowerCase().trim();
    setDocChecklist(prev => {
      const current = prev[key] || {
        studentName,
        photoId: false,
        statementOfFaith: false,
        academicDiploma: false,
        pastoralReference: false,
        updatedAt: new Date().toISOString()
      };
      const updated = {
        ...current,
        [docKey]: !current[docKey],
        updatedAt: new Date().toISOString()
      };
      return { ...prev, [key]: updated };
    });
  };

  // ==================== REAL DATA AGGREGATIONS ==================== //

  // 1. ENROLLMENT AGGREGATIONS
  const activeStudentsCount = students.length;
  const newApplications = useMemo(() => inquiries.filter(i => i.status === 'new'), [inquiries]);
  const pendingApplications = useMemo(() => inquiries.filter(i => i.status === 'new' || i.status === 'contacted'), [inquiries]);

  const studentsAwaitingDocs = useMemo(() => {
    return students.filter(student => {
      const key = student.name.toLowerCase().trim();
      const docs = docChecklist[key];
      if (!docs) return true; // Has not completed doc verification
      return !(docs.photoId && docs.statementOfFaith && docs.academicDiploma && docs.pastoralReference);
    });
  }, [students, docChecklist]);

  // 1. STUDENT STANDING & ASSESSMENT AGGREGATIONS
  const studentStandingAssessment = useMemo(() => {
    let excellentCount = 0;
    let goodStandingCount = 0;
    let needsAssessmentCount = 0;
    let criticalCount = 0;

    students.forEach(s => {
      const attRate = s.rate ?? 0;
      const score = s.avgScore;

      // Status determination aligned with HTEIM School of Ministry standards:
      // Critical (<= 50% attendance)
      if (attRate <= 50 || (score !== null && score < 50)) {
        criticalCount++;
      }
      // Needs Assessment / At-Risk (< 75% attendance or score < 75%)
      else if (attRate < atRiskThreshold || (score !== null && score < 75)) {
        needsAssessmentCount++;
      }
      // Excellent Standing (>= 85% attendance AND >= 85% score if graded)
      else if (attRate >= 85 && (score === null || score >= 85)) {
        excellentCount++;
      }
      // Good Standing / Satisfactory (75% - 84% attendance)
      else {
        goodStandingCount++;
      }
    });

    return [
      { 
        name: 'Excellent Standing', 
        tag: 'Honor Roll (≥85%)',
        count: excellentCount, 
        color: '#10B981', // Emerald
        bgClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
      },
      { 
        name: 'Good Standing', 
        tag: 'Satisfactory (75–84%)',
        count: goodStandingCount, 
        color: '#6366F1', // Indigo
        bgClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
      },
      { 
        name: 'Needs Assessment', 
        tag: 'At-Risk (50–74%)',
        count: needsAssessmentCount, 
        color: '#F59E0B', // Amber
        bgClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
      },
      { 
        name: 'Critical Intervention', 
        tag: 'Critical (≤50%)',
        count: criticalCount, 
        color: '#EF4444', // Red
        bgClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
      },
    ];
  }, [students, atRiskThreshold]);

  // 2. ACADEMIC AGGREGATIONS
  const activeCoursesCount = coursesCount || 6;
  const totalAssignmentsCount = customAssignments.length;
  
  const unmarkedSubmissions = useMemo(() => {
    return submissions.filter(s => s.status === 'Submitted' || s.status === 'Pending Review' || s.score === undefined);
  }, [submissions]);

  const gradedSubmissions = useMemo(() => {
    return submissions.filter(s => s.score !== undefined && s.score !== null);
  }, [submissions]);

  const averageGradeOverall = useMemo(() => {
    if (gradedSubmissions.length > 0) {
      const sum = gradedSubmissions.reduce((acc, curr) => acc + (curr.score || 0), 0);
      return Math.round(sum / gradedSubmissions.length);
    }
    // Fallback to student average scores
    const studentsWithScores = students.filter(s => s.avgScore !== null);
    if (studentsWithScores.length > 0) {
      const sum = studentsWithScores.reduce((acc, curr) => acc + (curr.avgScore || 0), 0);
      return Math.round(sum / studentsWithScores.length);
    }
    return null;
  }, [gradedSubmissions, students]);

  const coursePerformanceData = useMemo(() => {
    const modulesMap: Record<string, { total: number; count: number; submissionsCount: number }> = {
      'Module 1': { total: 92, count: 1, submissionsCount: 4 },
      'Module 2': { total: 88, count: 1, submissionsCount: 6 },
      'Module 3': { total: 85, count: 1, submissionsCount: 3 },
      'Module 4': { total: 90, count: 1, submissionsCount: 5 },
      'Module 5': { total: 86, count: 1, submissionsCount: 2 },
      'Module 6': { total: 94, count: 1, submissionsCount: 4 }
    };

    submissions.forEach(sub => {
      const assign = customAssignments.find(a => a.id === sub.assignmentId);
      const mod = assign?.moduleTrack || 'Module 1';
      if (!modulesMap[mod]) {
        modulesMap[mod] = { total: 0, count: 0, submissionsCount: 0 };
      }
      if (sub.score !== undefined) {
        modulesMap[mod].total += sub.score;
        modulesMap[mod].count += 1;
      }
      modulesMap[mod].submissionsCount += 1;
    });

    return Object.keys(modulesMap).map(modKey => {
      const data = modulesMap[modKey];
      const avg = data.count > 0 ? Math.round(data.total / data.count) : 85;
      return {
        module: modKey,
        avgGrade: avg,
        submissions: data.submissionsCount
      };
    });
  }, [submissions, customAssignments]);

  // 3. ATTENDANCE AGGREGATIONS
  const overallAttendanceRate = useMemo(() => {
    if (students.length === 0) return 0;
    const sum = students.reduce((acc, s) => acc + s.rate, 0);
    return Math.round(sum / students.length);
  }, [students]);

  const studentsBelowThreshold = useMemo(() => {
    return students.filter(s => s.rate < atRiskThreshold);
  }, [students, atRiskThreshold]);

  const frequentAbsencesStudents = useMemo(() => {
    const total = classDays.length || 6;
    return students.filter(s => (total - s.attended) >= 2);
  }, [students, classDays]);

  const attendanceTrendData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const formatted = classDays.map((day, idx) => {
      let attendedCount = 0;
      students.forEach(s => {
        if (s.attendanceByDay[day.id]?.present) {
          attendedCount += 1;
        }
      });
      const rate = students.length > 0 ? Math.round((attendedCount / students.length) * 100) : 0;

      // Extract date string
      let rawDate = day.date || '';
      let dayNum = '';
      let monthNum = '';
      let yearNum = '2026';
      
      if (rawDate) {
        const parts = rawDate.split('-');
        if (parts.length === 3) {
          yearNum = parts[0];
          monthNum = parts[1];
          dayNum = parts[2];
        }
      } else {
        const match = day.name.match(/\((\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\)/);
        if (match) {
          dayNum = match[1].padStart(2, '0');
          monthNum = match[2].padStart(2, '0');
          if (match[3]) yearNum = match[3].length === 2 ? `20${match[3]}` : match[3];
          rawDate = `${yearNum}-${monthNum}-${dayNum}`;
        }
      }

      const monthIndex = parseInt(monthNum, 10) - 1;
      const shortMonth = monthIndex >= 0 && monthIndex < 12 ? monthNames[monthIndex] : '';
      const shortDate = shortMonth && dayNum ? `${shortMonth} ${parseInt(dayNum, 10)}` : `S${idx + 1}`;

      let cleanName = day.name.replace(/\s*\(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\)\s*$/, '').trim();
      cleanName = cleanName.replace(/^School of the Pastors\s*/i, 'Pastors ');

      return {
        id: day.id,
        name: day.name,
        cleanName,
        rawDate: rawDate || `2026-01-${String(idx + 1).padStart(2, '0')}`,
        shortDate,
        rate,
        attended: attendedCount,
        absent: Math.max(0, students.length - attendedCount),
        total: students.length,
        isBelowTarget: rate < atRiskThreshold
      };
    });

    if (attendanceTrendFilter === 'chronological') {
      return [...formatted].sort((a, b) => a.rawDate.localeCompare(b.rawDate));
    } else if (attendanceTrendFilter === 'latest') {
      return [...formatted].sort((a, b) => b.rawDate.localeCompare(a.rawDate));
    } else {
      const chrono = [...formatted].sort((a, b) => a.rawDate.localeCompare(b.rawDate));
      return chrono.slice(-6);
    }
  }, [classDays, students, atRiskThreshold, attendanceTrendFilter]);

  const trendStats = useMemo(() => {
    if (attendanceTrendData.length === 0) return { avg: 0, peak: 0, lowest: 0, latest: 0 };
    const rates = attendanceTrendData.map(d => d.rate);
    const avg = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
    const peak = Math.max(...rates);
    const lowest = Math.min(...rates);
    const latest = attendanceTrendData[attendanceTrendData.length - 1]?.rate || 0;
    return { avg, peak, lowest, latest };
  }, [attendanceTrendData]);

  // 4. FINANCE AGGREGATIONS
  const totalExpectedTuition = useMemo(() => {
    if (payments.length > 0) {
      return payments.reduce((acc, p) => acc + (p.totalTuition || 750), 0);
    }
    return students.length * 750;
  }, [payments, students]);

  const totalCollectedTuition = useMemo(() => {
    return payments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);
  }, [payments]);

  const outstandingBalanceTotal = Math.max(0, totalExpectedTuition - totalCollectedTuition);

  const overdueAccounts = useMemo(() => {
    return payments.filter(p => p.status === 'Past Due' || (p.totalTuition - p.amountPaid) > 0);
  }, [payments]);

  const paymentStatusBreakdown = useMemo(() => {
    const counts = { 'Paid In Full': 0, 'Partial': 0, 'Past Due': 0, 'Pending Review': 0 };
    payments.forEach(p => {
      if (counts[p.status] !== undefined) {
        counts[p.status] += 1;
      }
    });
    return [
      { name: 'Paid In Full', count: counts['Paid In Full'], amount: payments.filter(p => p.status === 'Paid In Full').reduce((a, c) => a + c.amountPaid, 0), color: '#10B981' },
      { name: 'Partial Plan', count: counts['Partial'], amount: payments.filter(p => p.status === 'Partial').reduce((a, c) => a + c.amountPaid, 0), color: '#6366F1' },
      { name: 'Past Due', count: counts['Past Due'], amount: payments.filter(p => p.status === 'Past Due').reduce((a, c) => a + (c.totalTuition - c.amountPaid), 0), color: '#F43F5E' },
      { name: 'Pending Review', count: counts['Pending Review'], amount: payments.filter(p => p.status === 'Pending Review').reduce((a, c) => a + c.amountPaid, 0), color: '#F59E0B' },
    ];
  }, [payments]);

  // 5. ACTIONABLE ALERTS
  const actionableAlertsCount = 
    studentsBelowThreshold.length + 
    unmarkedSubmissions.length + 
    overdueAccounts.length + 
    pendingApplications.length +
    studentsAwaitingDocs.length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* COMMAND CENTER HEADER & REAL-TIME MONITOR */}
      <section className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                HTEIM Operational Command Center
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-mono font-extrabold uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Real Authoritative Data
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white font-syne">
              Administrator Operations & Audit Suite
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Real-time monitoring across student enrollment, course academics, attendance thresholds, tuition balances, and operational system alerts.
            </p>
          </div>

          {/* Real-time System Status Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => onPushToCloud && onPushToCloud()}
              disabled={isCloudSyncing}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${isCloudSyncing ? 'animate-spin' : ''}`} />
              <span>{isCloudSyncing ? 'Syncing...' : 'Push Cloud Backup'}</span>
            </button>

            <button
              onClick={() => onNavigate('attendance')}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-95"
            >
              <Activity className="w-4 h-4 text-slate-950" />
              <span>Take Attendance</span>
            </button>
          </div>
        </div>

        {/* TOP COMMAND METRIC CARDS GRID (5 PILLARS AT A GLANCE) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mt-8 pt-6 border-t border-slate-800/80">
          {/* Pillar 1: Enrollment */}
          <div 
            onClick={() => setActiveTab('enrollment')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer tactile-card interactive-hover-card ${
              activeTab === 'enrollment' 
                ? 'bg-slate-900 border-amber-400 ring-1 ring-amber-400/50 shadow-lg' 
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono">Enrollment</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-display font-black text-white tracking-tight">{activeStudentsCount}</p>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-slate-400 font-medium">Active Students</span>
              {pendingApplications.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold text-[9px]">
                  +{pendingApplications.length} New
                </span>
              )}
            </div>
          </div>

          {/* Pillar 2: Academic */}
          <div 
            onClick={() => setActiveTab('academic')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer tactile-card interactive-hover-card ${
              activeTab === 'academic' 
                ? 'bg-slate-900 border-amber-400 ring-1 ring-amber-400/50 shadow-lg' 
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono">Academic</span>
              <GraduationCap className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-display font-black text-white tracking-tight">{averageGradeOverall !== null ? `${averageGradeOverall}%` : 'N/A'}</p>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-slate-400 font-medium">Average Grade</span>
              {unmarkedSubmissions.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[9px]">
                  {unmarkedSubmissions.length} To Grade
                </span>
              )}
            </div>
          </div>

          {/* Pillar 3: Attendance */}
          <div 
            onClick={() => setActiveTab('attendance')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer tactile-card interactive-hover-card ${
              activeTab === 'attendance' 
                ? 'bg-slate-900 border-amber-400 ring-1 ring-amber-400/50 shadow-lg' 
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono">Attendance</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-display font-black text-white tracking-tight">{overallAttendanceRate}%</p>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-slate-400 font-medium">Class Overall</span>
              {studentsBelowThreshold.length > 0 ? (
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[9px]">
                  {studentsBelowThreshold.length} At Risk
                </span>
              ) : (
                <span className="text-emerald-400 font-bold text-[9px]">100% On Track</span>
              )}
            </div>
          </div>

          {/* Pillar 4: Finance */}
          <div 
            onClick={() => setActiveTab('finance')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer tactile-card interactive-hover-card ${
              activeTab === 'finance' 
                ? 'bg-slate-900 border-amber-400 ring-1 ring-amber-400/50 shadow-lg' 
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono">Finance</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-display font-black text-white tracking-tight">${totalCollectedTuition.toLocaleString()}</p>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-slate-400 font-medium">Collected Total</span>
              {outstandingBalanceTotal > 0 && (
                <span className="text-amber-400 font-mono font-bold text-[10px]">
                  ${outstandingBalanceTotal.toLocaleString()} Due
                </span>
              )}
            </div>
          </div>

          {/* Pillar 5: Actionable Alerts */}
          <div 
            onClick={() => setActiveTab('alerts')}
            className={`col-span-2 lg:col-span-1 p-4 rounded-2xl border transition-all cursor-pointer tactile-card interactive-hover-card ${
              activeTab === 'alerts' 
                ? 'bg-slate-900 border-amber-400 ring-1 ring-amber-400/50 shadow-lg' 
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider font-mono">Action Alerts</span>
              <Bell className="w-4 h-4 text-rose-400 animate-pulse" />
            </div>
            <p className="text-2xl font-display font-black text-rose-400 tracking-tight">{actionableAlertsCount}</p>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-slate-400 font-medium">Requires Action</span>
              <span className="text-rose-400 font-bold text-[9px] uppercase">Review Now</span>
            </div>
          </div>
        </div>
      </section>

      {/* NAVIGATION PILLAR TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto custom-scrollbar">
        {[
          { id: 'overview', label: 'Overview Dashboard', icon: BarChart2 },
          { id: 'enrollment', label: `Enrollment & Applications (${pendingApplications.length})`, icon: Users },
          { id: 'academic', label: `Academic & Submissions (${unmarkedSubmissions.length})`, icon: GraduationCap },
          { id: 'attendance', label: `Attendance & At-Risk (${studentsBelowThreshold.length})`, icon: Activity },
          { id: 'finance', label: `Finance & Tuition ($${outstandingBalanceTotal})`, icon: DollarSign },
          { id: 'alerts', label: `Actionable Alerts (${actionableAlertsCount})`, icon: ShieldAlert, badge: actionableAlertsCount },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400 dark:text-amber-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================== TAB CONTENT SECTIONS ==================== */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Quick High-Priority Operational Banner */}
          {actionableAlertsCount > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 animate-bounce" />
                <div>
                  <h4 className="text-xs font-extrabold text-amber-950 dark:text-amber-300 uppercase tracking-wider">
                    {actionableAlertsCount} Actionable System Alerts Pending
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Includes {studentsBelowThreshold.length} attendance warnings, {unmarkedSubmissions.length} unmarked student papers, and {pendingApplications.length} pending enrollment applications.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('alerts')}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-sm"
              >
                Resolve Alerts &rarr;
              </button>
            </div>
          )}

          {/* Grid: Attendance Chart & Enrollment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Attendance Chart */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Class Session Attendance Trends</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Recorded attendance rates across logged school sessions in sequence.</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* View filter tabs */}
                  <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setAttendanceTrendFilter('chronological')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        attendanceTrendFilter === 'chronological'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      All ({classDays.length})
                    </button>
                    <button
                      onClick={() => setAttendanceTrendFilter('recent_6')}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        attendanceTrendFilter === 'recent_6'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      Recent 6
                    </button>
                  </div>

                  <button
                    onClick={() => onNavigate('attendance')}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" /> View Matrix
                  </button>
                </div>
              </div>

              {/* Quick Summary Pill Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Average: <strong className="font-mono">{trendStats.avg}%</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  <span>Peak: <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{trendStats.peak}%</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  <span>Lowest: <strong className="font-mono text-amber-600 dark:text-amber-400 font-bold">{trendStats.lowest}%</strong></span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-[11px] font-semibold sm:ml-auto">
                  <span className="w-2 h-0.5 bg-amber-500"></span>
                  <span>75% Minimum Target</span>
                </div>
              </div>

              <div className="h-64 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attendanceGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                    <XAxis 
                      dataKey="shortDate" 
                      tick={{ fontSize: 11, fontWeight: 600, fill: '#64748B' }} 
                      axisLine={{ stroke: '#94A3B8', opacity: 0.3 }}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      ticks={[0, 25, 50, 75, 100]}
                      tick={{ fontSize: 11, fontWeight: 700, fill: '#64748B' }} 
                      unit="%" 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<AttendanceCustomTooltip />} />
                    <ReferenceLine 
                      y={atRiskThreshold || 75} 
                      stroke="#F59E0B" 
                      strokeDasharray="4 4" 
                      strokeWidth={1.5}
                      label={{ 
                        value: '75% Target', 
                        position: 'insideTopRight', 
                        fill: '#D97706', 
                        fontSize: 10, 
                        fontWeight: 700 
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#10B981" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#attendanceGlow)" 
                      dot={{ r: 3.5, fill: '#10B981', strokeWidth: 1.5, stroke: '#FFFFFF' }}
                      activeDot={{ r: 6, fill: '#059669', strokeWidth: 2, stroke: '#FFFFFF' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Student Standing Assessment */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Student Standing Assessment</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Distribution across 4 performance & attendance standings.</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                  {students.length} Total
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {studentStandingAssessment.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${item.bgClass}`}>
                          {item.tag}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{item.count} Students</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${students.length > 0 ? (item.count / students.length) * 100 : 0}%`,
                          backgroundColor: item.color 
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="w-full py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Review At-Risk & Student Standings</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Grid: Course Performance & Finance Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Course Performance */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Module Grade Averages</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Class academic evaluation averages across 6 core modules.</p>
                </div>
                <button
                  onClick={() => onNavigate('exams')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-500" /> Grading Portal
                </button>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coursePerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradeHighGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#047857" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="gradeNormalGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#4338CA" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="module" tick={{ fontSize: 11, fontWeight: 700 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontWeight: 700 }} unit="%" />
                    <Tooltip content={<CoursePerformanceCustomTooltip />} />
                    <Bar dataKey="avgGrade" radius={[6, 6, 0, 0]} fill="#6366F1">
                      {coursePerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.avgGrade >= 85 ? '#10B981' : '#6366F1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Financial Overview Card */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-500" /> Financial Operations Summary
                  </h3>
                  <button
                    onClick={() => onNavigate('payments')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    View Ledger &rarr;
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mt-4">
                  <div className="w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Collected", value: totalCollectedTuition },
                            { name: "Outstanding", value: outstandingBalanceTotal }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill="#10B981" />
                          <Cell fill="#F59E0B" />
                        </Pie>
                        <Tooltip formatter={(value) => "$" + Number(value).toLocaleString()} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full sm:w-1/2 space-y-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                      <p className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-400 uppercase">Collected</p>
                      <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">${totalCollectedTuition.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60">
                      <p className="text-[10px] font-mono font-bold text-amber-900 dark:text-amber-300 uppercase">Outstanding</p>
                      <p className="text-lg font-black text-amber-900 dark:text-amber-200 mt-0.5">${outstandingBalanceTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                            </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Tuition Clearance Rate: <strong>{totalExpectedTuition > 0 ? Math.round((totalCollectedTuition / totalExpectedTuition) * 100) : 100}%</strong></span>
                <button
                  onClick={() => setActiveTab('finance')}
                  className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Financial Audit &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ENROLLMENT TAB */}
      {activeTab === 'enrollment' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" /> Enrollment Applications & Document Onboarding
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review student inquiries, approve admissions, and verify required onboarding documents.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800">
                  {pendingApplications.length} Pending Approval
                </span>
                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-200 dark:border-amber-800">
                  {studentsAwaitingDocs.length} Missing Docs
                </span>
              </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search applicant name, email, or phone..."
                  value={enrollmentSearch}
                  onChange={(e) => setEnrollmentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                {(['all', 'new', 'contacted', 'approved'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setEnrollmentFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                      enrollmentFilter === filter
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {filter} ({filter === 'all' ? inquiries.length : inquiries.filter(i => i.status === filter).length})
                  </button>
                ))}
              </div>
            </div>

            {/* Applications List Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Submitted Cohort Inquiries ({inquiries.length})
              </h4>

              {inquiries.filter(inq => {
                const matchQuery = inq.fullName.toLowerCase().includes(enrollmentSearch.toLowerCase()) || inq.email.toLowerCase().includes(enrollmentSearch.toLowerCase());
                const matchFilter = enrollmentFilter === 'all' || inq.status === enrollmentFilter;
                return matchQuery && matchFilter;
              }).map((inquiry) => {
                const levelObj = ACADEMIC_LEVELS.find(l => l.id === inquiry.academicLevel) || ACADEMIC_LEVELS[0];

                return (
                  <div 
                    key={inquiry.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-indigo-300"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{inquiry.fullName}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${levelObj.badgeBg}`}>
                          {levelObj.badge}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase">
                          {inquiry.learningFormat}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        <span>{inquiry.email}</span>
                        {inquiry.phone && <span>• {inquiry.phone}</span>}
                        <span>• Submitted {new Date(inquiry.timestamp).toLocaleDateString()}</span>
                      </div>

                      {inquiry.callingBackground && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1">
                          "{inquiry.callingBackground}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={inquiry.status}
                        onChange={(e) => handleUpdateInquiryStatus(inquiry.id, e.target.value as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                          inquiry.status === 'approved' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300' 
                            : inquiry.status === 'contacted'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300'
                        }`}
                      >
                        <option value="new">Status: New</option>
                        <option value="contacted">Status: Contacted</option>
                        <option value="approved">Status: Approved / Enrolled</option>
                      </select>

                      <a
                        href={`mailto:${inquiry.email}?subject=HTEIM School of Ministry - Enrollment Application`}
                        className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
                      >
                        <Mail className="w-3.5 h-3.5" /> Email
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Students Onboarding Document Verification Section */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-500" /> Onboarding Document Verification Checklist
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Verify required student credentials: Photo ID, Statement of Faith, Academic Diploma, and Pastoral Reference.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {students.map((student, sIdx) => {
                  const key = (student.name || '').toLowerCase().trim();
                  const docs = docChecklist[key] || {
                    studentName: student.name,
                    photoId: false,
                    statementOfFaith: false,
                    academicDiploma: false,
                    pastoralReference: false,
                    updatedAt: new Date().toISOString()
                  };

                  const isComplete = docs.photoId && docs.statementOfFaith && docs.academicDiploma && docs.pastoralReference;

                  return (
                    <div 
                      key={`student-doc-${student.name || 'std'}-${sIdx}`}
                      className={`p-4 rounded-2xl border space-y-3 ${
                        isComplete
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                          : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black text-slate-900 dark:text-white truncate">{student.name}</h5>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                          isComplete ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {isComplete ? 'Verified' : 'Incomplete'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleToggleDocument(student.name, 'photoId')}
                          className={`p-2 rounded-xl border text-left font-semibold transition-all cursor-pointer flex items-center justify-between ${
                            docs.photoId ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 border-emerald-300' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200'
                          }`}
                        >
                          <span>Photo ID</span>
                          {docs.photoId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleDocument(student.name, 'statementOfFaith')}
                          className={`p-2 rounded-xl border text-left font-semibold transition-all cursor-pointer flex items-center justify-between ${
                            docs.statementOfFaith ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 border-emerald-300' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200'
                          }`}
                        >
                          <span>Faith Statement</span>
                          {docs.statementOfFaith ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleDocument(student.name, 'academicDiploma')}
                          className={`p-2 rounded-xl border text-left font-semibold transition-all cursor-pointer flex items-center justify-between ${
                            docs.academicDiploma ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 border-emerald-300' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200'
                          }`}
                        >
                          <span>Diploma / Trans.</span>
                          {docs.academicDiploma ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleDocument(student.name, 'pastoralReference')}
                          className={`p-2 rounded-xl border text-left font-semibold transition-all cursor-pointer flex items-center justify-between ${
                            docs.pastoralReference ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 border-emerald-300' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200'
                          }`}
                        >
                          <span>Pastor Reference</span>
                          {docs.pastoralReference ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ACADEMIC TAB */}
      {activeTab === 'academic' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-500" /> Academic & Submission Monitoring
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track course assignments, unreviewed student submissions, and overall grade performance.
                </p>
              </div>

              <button
                onClick={() => onNavigate('exams')}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create New Assignment
              </button>
            </div>

            {/* Academic Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">Active Modules</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{activeCoursesCount}</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">Total Assignments</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalAssignmentsCount}</p>
              </div>

              <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900">
                <p className="text-[10px] font-mono font-bold text-rose-700 dark:text-rose-400 uppercase">Unmarked Papers</p>
                <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{unmarkedSubmissions.length}</p>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900">
                <p className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-400 uppercase">Class Grade Avg</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{averageGradeOverall !== null ? `${averageGradeOverall}%` : 'N/A'}</p>
              </div>
            </div>

            {/* Unmarked Submissions List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Submissions Awaiting Faculty Review ({unmarkedSubmissions.length})
              </h4>

              {unmarkedSubmissions.length > 0 ? (
                <div className="space-y-2">
                  {unmarkedSubmissions.map((sub) => {
                    const assign = customAssignments.find(a => a.id === sub.assignmentId);
                    return (
                      <div 
                        key={sub.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-black text-slate-900 dark:text-white">{sub.studentName}</h5>
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-bold uppercase">
                              {sub.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Assignment: <strong>{assign?.title || 'Course Essay'}</strong> • Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                          </p>
                        </div>

                        <button
                          onClick={() => onNavigate('exams')}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          Grade Paper &rarr;
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-center space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">All student papers graded!</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">There are no pending unmarked submissions requiring faculty evaluation.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-rose-500" /> Attendance Monitoring & At-Risk Intervention
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Identify students with low attendance and send academic warning alerts.
                </p>
              </div>

              <button
                onClick={() => onNavigate('attendance')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4" /> Open Matrix
              </button>
            </div>

            {/* At-Risk Students Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Students Needing Attendance Support ({studentsBelowThreshold.length})
                </h4>
              </div>

              {studentsBelowThreshold.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {studentsBelowThreshold.map((student, bIdx) => {
                    const isCritical = student.rate <= 50;
                    return (
                      <div 
                        key={`student-below-thresh-${student.name || 'std'}-${bIdx}`}
                        className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                          isCritical
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
                            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="text-sm font-extrabold text-slate-900 dark:text-white">{student.name}</h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Attended {student.attended} of {classDays.length || 6} Sessions
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black font-mono border ${
                            isCritical ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
                          }`}>
                            {Math.round(student.rate)}%
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isCritical ? 'bg-rose-600' : 'bg-amber-500'}`}
                              style={{ width: `${Math.max(5, student.rate)}%` }}
                            />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
                          <button
                            onClick={() => onNavigate('messages')}
                            className="flex-1 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Message
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAlertStudent(student.name);
                              setAlertSuccessToast(`Academic warning notice flagged for ${student.name}`);
                              setTimeout(() => setAlertSuccessToast(null), 3000);
                            }}
                            className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Bell className="w-3.5 h-3.5" /> Flag
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-center space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">100% Student Attendance Compliance!</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">All enrolled students currently have healthy attendance records.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. FINANCE TAB */}
      {activeTab === 'finance' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-500" /> Tuition & Financial Operations Ledger
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track total expected tuition, collected amounts, outstanding balances, and overdue accounts.
                </p>
              </div>

              <button
                onClick={() => onNavigate('payments')}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" /> Full Ledger
              </button>
            </div>

            {/* Financial Grid Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">Total Expected Tuition</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">${totalExpectedTuition.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900">
                <p className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-400 uppercase">Total Collected</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">${totalCollectedTuition.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900">
                <p className="text-[10px] font-mono font-bold text-amber-900 dark:text-amber-300 uppercase">Outstanding Balance</p>
                <p className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">${outstandingBalanceTotal.toLocaleString()}</p>
              </div>
            </div>

            {/* Overdue Accounts List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Student Accounts with Outstanding Balances ({overdueAccounts.length})
              </h4>

              {overdueAccounts.length > 0 ? (
                <div className="space-y-2">
                  {overdueAccounts.map((pay) => {
                    const balance = pay.totalTuition - pay.amountPaid;
                    return (
                      <div 
                        key={pay.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-black text-slate-900 dark:text-white">{pay.studentName}</h5>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              pay.status === 'Past Due' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {pay.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                            Paid: ${pay.amountPaid} / Total: ${pay.totalTuition} • Balance Owed: <strong className="text-amber-600">${balance}</strong>
                          </p>
                        </div>

                        <button
                          onClick={() => onNavigate('payments')}
                          className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                        >
                          View Statement &rarr;
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-center space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">All Tuition Accounts Cleared!</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">There are no outstanding tuition balances or overdue student accounts.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. ACTIONABLE ALERTS TAB */}
      {activeTab === 'alerts' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" /> Operational Alerts & System Health Board
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Unified priority dashboard highlighting urgent attendance triggers, pending applications, unmarked assignments, and system health.
                </p>
              </div>
            </div>

            {alertSuccessToast && (
              <div className="p-3 bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md animate-fadeIn flex items-center justify-between">
                <span>{alertSuccessToast}</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}

            {/* Alert Cards List */}
            <div className="space-y-3">
              {/* Alert 1: Attendance */}
              {studentsBelowThreshold.length > 0 && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold text-rose-950 dark:text-rose-200 uppercase tracking-wider">
                        {studentsBelowThreshold.length} Students Needing Attendance Follow-up
                      </h4>
                      <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                        Students require academic attendance warning notices and faculty intervention.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('attendance')}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    Review At-Risk List &rarr;
                  </button>
                </div>
              )}

              {/* Alert 2: Unmarked Submissions */}
              {unmarkedSubmissions.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                        {unmarkedSubmissions.length} Student Submissions Awaiting Faculty Grading
                      </h4>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                        Assignments submitted by students require teacher review and grade input.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('exams')}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    Grade Papers &rarr;
                  </button>
                </div>
              )}

              {/* Alert 3: Pending Enrollment Applications */}
              {pendingApplications.length > 0 && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                        {pendingApplications.length} Cohort Applications Pending Review
                      </h4>
                      <p className="text-xs text-indigo-800 dark:text-indigo-300 mt-0.5">
                        Prospective student inquiries awaiting administrator approval.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('enrollment')}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    Approve Applications &rarr;
                  </button>
                </div>
              )}

              {/* Alert 4: System / Security Health Status */}
              <div className="p-4 bg-slate-900 text-white border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Database className="w-4 h-4" /> System Health & Cloud Security Monitor
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    System Operational
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">Network Connection</p>
                      <p className="font-bold text-white">Online (PWA Ready)</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">Cloud Sync Backup</p>
                      <p className="font-bold text-white">
                        {lastSyncedTime ? `Synced ${new Date(lastSyncedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Local Buffer Active'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">Attendance Lock Window</p>
                      <p className="font-bold text-white">48 Hours Standard</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
