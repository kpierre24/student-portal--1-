import React from 'react';
import {
  User,
  BookOpen,
  FileText,
  Award,
  DollarSign,
  MessageSquare,
  Compass,
  Zap,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  Settings,
  HelpCircle,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Cloud,
  Moon,
  Sun,
  PlusCircle,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { TabType } from '../../types';
import { AppUser } from '../../lib/userAuth';

export type SearchCategory =
  | 'students'
  | 'courses'
  | 'assignments'
  | 'exams'
  | 'payments'
  | 'messages'
  | 'pages'
  | 'actions';

export interface SearchResultItem {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeTone?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  keywords?: string[];
  action: () => void;
  metadata?: Record<string, any>;
}

export interface SearchDataContext {
  appUser: AppUser | null;
  students?: Array<{
    id?: string;
    studentId?: string;
    name: string;
    email?: string;
    rate?: number;
    levelId?: string;
    status?: string;
    track?: string;
  }>;
  courses?: Array<{
    id?: string;
    code?: string;
    title: string;
    instructor?: string;
    moduleNumber?: number;
  }>;
  assignments?: Array<{
    id?: string;
    title: string;
    course?: string;
    dueDate?: string;
    status?: string;
    points?: number;
  }>;
  exams?: Array<{
    id?: string;
    title: string;
    course?: string;
    questionsCount?: number;
    durationMinutes?: number;
  }>;
  payments?: Array<{
    id?: string;
    studentName: string;
    amount?: number | string;
    status?: string;
    track?: string;
    receiptNo?: string;
    date?: string;
  }>;
  messages?: Array<{
    id?: string;
    sender: string;
    subject: string;
    preview?: string;
    date?: string;
    isUnread?: boolean;
  }>;
  onNavigate: (tab: TabType, extra?: any) => void;
  onOpenSettings?: () => void;
  onOpenBatchBroadcast?: () => void;
  onOpenLiveCheckin?: () => void;
  onOpenInstallApp?: () => void;
  onOpenOfflineDrawer?: () => void;
  onPushToCloud?: () => void;
  onToggleTheme?: () => void;
  onOpenIntro?: () => void;
  onOpenPresentation?: () => void;
  onOpenRoleSwitch?: () => void;
}

const DEFAULT_COURSES = [
  { code: 'SOM-MOD-1', title: 'Module 1: Introduction & Orientation to Ministry', instructor: 'HTEIM Academic Directorate' },
  { code: 'SOM-MOD-2', title: 'Module 2: Evangelism, Discipleship & Soul Winning', instructor: 'Evangelism Ministry Lead' },
  { code: 'SOM-MOD-3', title: 'Module 3: Ministerial Character, Ethics & Integrity', instructor: 'Pastor Senior Advisor' },
  { code: 'SOM-MOD-4', title: 'Module 4: Apostolic Governance, Order & Epistles', instructor: 'Dr. Faculty Director' },
  { code: 'SOM-MOD-5', title: 'Module 5: Prophetic Ministry, Prayer & Discernment', instructor: 'Prophetic Faculty Director' },
  { code: 'SOM-MOD-6', title: 'Module 6: School of Pastors & Expository Preaching', instructor: 'Rev. Academic Dean' },
];

const DEFAULT_PAGES: Array<{
  id: string;
  tab: TabType;
  title: string;
  subtitle: string;
  roles?: string[];
}> = [
  { id: 'page-home', tab: 'home', title: 'Home Dashboard', subtitle: 'Academic overview, announcements, and statistics' },
  { id: 'page-attendance', tab: 'attendance', title: 'Attendance Ledger', subtitle: 'Classroom attendance tracking and PIN check-in' },
  { id: 'page-courses', tab: 'courses', title: 'Curriculum & Courses', subtitle: '6 core ministry modules, syllabus, and lectures' },
  { id: 'page-assignments', tab: 'courses', title: 'Assignments & Homework', subtitle: 'Weekly ministry assignments and homework submissions' },
  { id: 'page-exams', tab: 'exams', title: 'Examinations & Quizzes', subtitle: 'Ministerial knowledge tests and graduation evaluations' },
  { id: 'page-grades', tab: 'reports', title: 'Academic Grades', subtitle: 'Transcript records, module grades, and honor distinction' },
  { id: 'page-payment', tab: 'payments', title: 'Financial Records & Tuition', subtitle: 'Tuition tracking, receipts, and payment statements' },
  { id: 'page-library', tab: 'library', title: 'Resource Library', subtitle: 'Theological PDF handouts, study guides, and audio lectures' },
  { id: 'page-reports', tab: 'reports', title: 'Executive Reports', subtitle: 'PDF grade cards, accreditation exports, and metrics' },
  { id: 'page-broadcast', tab: 'messages', title: 'Live Broadcast & Chapel', subtitle: 'Live ministerial streams and interactive notes' },
  { id: 'page-notes', tab: 'notes', title: 'Bible & Study Notes', subtitle: 'Scripture concordance and personal theology notes' },
  { id: 'page-schedule', tab: 'schedule', title: 'Academic Calendar', subtitle: 'Class schedule, module milestones, and live chapel events' },
  { id: 'page-messages', tab: 'messages', title: 'Messages & Communications', subtitle: 'Student faculty messaging and cohort announcements' },
];

export function buildSearchIndex(context: SearchDataContext): SearchResultItem[] {
  const {
    appUser,
    students = [],
    courses = DEFAULT_COURSES,
    assignments = [],
    exams = [],
    payments = [],
    messages = [],
    onNavigate,
    onOpenSettings,
    onOpenBatchBroadcast,
    onOpenLiveCheckin,
    onOpenInstallApp,
    onOpenOfflineDrawer,
    onPushToCloud,
    onToggleTheme,
    onOpenIntro,
    onOpenPresentation,
    onOpenRoleSwitch,
  } = context;

  const role = appUser?.role || 'student';
  const isFacultyOrAdmin = role === 'admin' || role === 'super_admin' || role === 'teacher' || role === 'lecturer';
  const results: SearchResultItem[] = [];

  // ================= 1. QUICK ACTIONS & COMMANDS =================
  if (isFacultyOrAdmin) {
    results.push({
      id: 'act-take-attendance',
      category: 'actions',
      title: 'Take Attendance',
      subtitle: 'Record classroom attendance & live check-ins for today',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      badge: 'Action',
      badgeTone: 'success',
      keywords: ['attendance', 'checkin', 'mark', 'present', 'absent', 'roster'],
      action: () => onNavigate('attendance'),
    });

    results.push({
      id: 'act-create-assignment',
      category: 'actions',
      title: 'Create Assignment',
      subtitle: 'Draft a new course assignment or ministerial reflection',
      icon: <PlusCircle className="h-4 w-4 text-[var(--color-primary)]" />,
      badge: 'Action',
      badgeTone: 'primary',
      keywords: ['assignment', 'homework', 'task', 'create', 'new', 'post'],
      action: () => onNavigate('courses'),
    });

    results.push({
      id: 'act-grade-submissions',
      category: 'actions',
      title: 'Grade Submissions',
      subtitle: 'Review student homework, term papers, and score rubrics',
      icon: <Award className="h-4 w-4 text-amber-500" />,
      badge: 'Action',
      badgeTone: 'accent',
      keywords: ['grade', 'evaluate', 'submissions', 'review', 'rubric', 'score'],
      action: () => onNavigate('reports'),
    });

    results.push({
      id: 'act-open-finance',
      category: 'actions',
      title: 'Open Finance & Payments',
      subtitle: 'View tuition ledger, balance sheets, and issue receipts',
      icon: <DollarSign className="h-4 w-4 text-emerald-600" />,
      badge: 'Finance',
      badgeTone: 'success',
      keywords: ['finance', 'payment', 'tuition', 'balance', 'receipt', 'scholarship'],
      action: () => onNavigate('payments'),
    });

    results.push({
      id: 'act-open-reports',
      category: 'actions',
      title: 'Open Academic Reports & Export',
      subtitle: 'Generate accreditation summaries, PDF transcripts, and statistics',
      icon: <FileSpreadsheet className="h-4 w-4 text-indigo-500" />,
      badge: 'Reports',
      badgeTone: 'info',
      keywords: ['report', 'export', 'pdf', 'transcript', 'accreditation', 'analytics'],
      action: () => onNavigate('reports'),
    });

    if (onOpenLiveCheckin) {
      results.push({
        id: 'act-pin-checkin',
        category: 'actions',
        title: 'Launch Live PIN & QR Check-in',
        subtitle: 'Display live 4-digit PIN code on screen for student self check-in',
        icon: <ShieldCheck className="h-4 w-4 text-sky-500" />,
        badge: 'Live',
        badgeTone: 'primary',
        keywords: ['pin', 'qr', 'live checkin', 'self attendance', 'kiosk'],
        action: onOpenLiveCheckin,
      });
    }

    if (onOpenBatchBroadcast) {
      results.push({
        id: 'act-broadcast',
        category: 'actions',
        title: 'Send Cohort Broadcast',
        subtitle: 'Post urgent announcements to all student notification feeds',
        icon: <Radio className="h-4 w-4 text-purple-500" />,
        badge: 'Announce',
        badgeTone: 'primary',
        keywords: ['broadcast', 'announcement', 'notify', 'alert', 'message'],
        action: onOpenBatchBroadcast,
      });
    }
  }

  // Common user actions
  results.push({
    id: 'act-install-app',
    category: 'actions',
    title: 'Install HTEIM App',
    subtitle: 'Setup offline standalone app on iPhone, Android, or Computer',
    icon: <Download className="h-4 w-4 text-indigo-500" />,
    badge: 'App',
    badgeTone: 'info',
    keywords: ['install', 'pwa', 'apk', 'mobile', 'download', 'app', 'offline'],
    action: () => (onOpenInstallApp ? onOpenInstallApp() : onNavigate('home')),
  });

  if (onOpenOfflineDrawer) {
    results.push({
      id: 'act-sync-status',
      category: 'actions',
      title: 'View Sync Status & Offline Queue',
      subtitle: 'Review buffered offline changes and sync with cloud database',
      icon: <Cloud className="h-4 w-4 text-emerald-500" />,
      badge: 'Sync',
      badgeTone: 'success',
      keywords: ['sync', 'offline', 'cloud', 'backup', 'queue', 'connection'],
      action: onOpenOfflineDrawer,
    });
  }

  if (onOpenRoleSwitch) {
    results.push({
      id: 'act-switch-role',
      category: 'actions',
      title: 'Switch Demonstration Role',
      subtitle: 'Switch view between Student, Faculty, Registrar, and Admin',
      icon: <Sparkles className="h-4 w-4 text-amber-500" />,
      badge: 'Demo',
      badgeTone: 'accent',
      keywords: ['role', 'switch', 'persona', 'admin', 'student', 'teacher', 'dean'],
      action: onOpenRoleSwitch,
    });
  }

  if (onOpenSettings && role === 'admin') {
    results.push({
      id: 'act-settings',
      category: 'actions',
      title: 'Portal Settings & Cloud Configuration',
      subtitle: 'Manage grading thresholds, academic cohorts, and Supabase backup',
      icon: <Settings className="h-4 w-4 text-slate-500" />,
      badge: 'Admin',
      badgeTone: 'warning',
      keywords: ['settings', 'config', 'grading', 'thresholds', 'supabase', 'backup'],
      action: onOpenSettings,
    });
  }

  // ================= 2. PAGES & VIEWS =================
  DEFAULT_PAGES.forEach((page) => {
    results.push({
      id: page.id,
      category: 'pages',
      title: page.title,
      subtitle: page.subtitle,
      icon: <Compass className="h-4 w-4 text-[var(--color-primary)]" />,
      badge: 'Page',
      badgeTone: 'primary',
      keywords: ['page', 'view', 'navigate', 'tab', page.tab, page.title.toLowerCase()],
      action: () => onNavigate(page.tab),
    });
  });

  // ================= 3. STUDENTS =================
  students.forEach((s) => {
    const rateText = s.rate !== undefined ? `${Math.round(s.rate)}% attendance` : undefined;
    results.push({
      id: `student-${s.id || s.name}`,
      category: 'students',
      title: s.name,
      subtitle: [s.email, s.levelId, rateText].filter(Boolean).join(' • '),
      icon: <User className="h-4 w-4 text-blue-600" />,
      badge: s.levelId || 'Student',
      badgeTone: 'info',
      keywords: ['student', s.name.toLowerCase(), s.email?.toLowerCase() || '', s.levelId?.toLowerCase() || ''],
      action: () => onNavigate('attendance', { studentName: s.name }),
    });
  });

  // ================= 4. COURSES =================
  courses.forEach((c) => {
    results.push({
      id: `course-${c.code || c.title}`,
      category: 'courses',
      title: c.title,
      subtitle: [c.code, c.instructor].filter(Boolean).join(' • '),
      icon: <BookOpen className="h-4 w-4 text-emerald-600" />,
      badge: c.code || 'Module',
      badgeTone: 'success',
      keywords: ['course', 'module', c.code?.toLowerCase() || '', c.title.toLowerCase(), c.instructor?.toLowerCase() || ''],
      action: () => onNavigate('courses', { courseCode: c.code }),
    });
  });

  // ================= 5. ASSIGNMENTS =================
  if (assignments.length > 0) {
    assignments.forEach((a) => {
      results.push({
        id: `assignment-${a.id || a.title}`,
        category: 'assignments',
        title: a.title,
        subtitle: [a.course, a.dueDate ? `Due: ${a.dueDate}` : undefined, a.status].filter(Boolean).join(' • '),
        icon: <FileText className="h-4 w-4 text-amber-600" />,
        badge: a.status || 'Assignment',
        badgeTone: 'warning',
        keywords: ['assignment', 'homework', a.title.toLowerCase(), a.course?.toLowerCase() || ''],
        action: () => onNavigate('courses'),
      });
    });
  } else {
    // Default assignment entries for quick navigation
    results.push({
      id: 'asg-reading-reflection',
      category: 'assignments',
      title: 'Ministerial Ethics & Integrity Reflection',
      subtitle: 'Module 3 Weekly Practicum • 50 Points',
      icon: <FileText className="h-4 w-4 text-amber-600" />,
      badge: 'Assignment',
      badgeTone: 'warning',
      keywords: ['ethics', 'reflection', 'homework', 'module 3'],
      action: () => onNavigate('courses'),
    });
    results.push({
      id: 'asg-evangelism-outreach',
      category: 'assignments',
      title: 'Community Soul-Winning Fieldwork Report',
      subtitle: 'Module 2 Practicum • 100 Points',
      icon: <FileText className="h-4 w-4 text-amber-600" />,
      badge: 'Assignment',
      badgeTone: 'warning',
      keywords: ['evangelism', 'fieldwork', 'outreach', 'module 2'],
      action: () => onNavigate('courses'),
    });
  }

  // ================= 6. EXAMINATIONS & QUIZZES =================
  if (exams.length > 0) {
    exams.forEach((e) => {
      results.push({
        id: `exam-${e.id || e.title}`,
        category: 'exams',
        title: e.title,
        subtitle: [e.course, e.questionsCount ? `${e.questionsCount} Questions` : undefined].filter(Boolean).join(' • '),
        icon: <Award className="h-4 w-4 text-purple-600" />,
        badge: 'Exam',
        badgeTone: 'accent',
        keywords: ['exam', 'quiz', 'test', e.title.toLowerCase(), e.course?.toLowerCase() || ''],
        action: () => onNavigate('exams'),
      });
    });
  } else {
    results.push({
      id: 'exam-module-1-quiz',
      category: 'exams',
      title: 'Module 1: Orientation & Foundations Quiz',
      subtitle: '25 Multiple Choice Questions • Passing: 75%',
      icon: <Award className="h-4 w-4 text-purple-600" />,
      badge: 'Exam',
      badgeTone: 'accent',
      keywords: ['orientation', 'quiz', 'foundations', 'exam'],
      action: () => onNavigate('exams'),
    });
    results.push({
      id: 'exam-midterm-doctrine',
      category: 'exams',
      title: 'Midterm Comprehensive Theological Examination',
      subtitle: 'Modules 1-3 Comprehensive Evaluation • 100 Points',
      icon: <Award className="h-4 w-4 text-purple-600" />,
      badge: 'Exam',
      badgeTone: 'accent',
      keywords: ['theological', 'midterm', 'comprehensive', 'exam'],
      action: () => onNavigate('exams'),
    });
  }

  // ================= 7. PAYMENTS =================
  if (payments.length > 0) {
    payments.forEach((p) => {
      results.push({
        id: `payment-${p.id || p.receiptNo || p.studentName}`,
        category: 'payments',
        title: `${p.studentName} — ${p.amount ? `$${p.amount}` : 'Tuition'}`,
        subtitle: [p.receiptNo ? `Receipt #${p.receiptNo}` : undefined, p.track, p.status].filter(Boolean).join(' • '),
        icon: <DollarSign className="h-4 w-4 text-emerald-600" />,
        badge: p.status || 'Payment',
        badgeTone: p.status === 'Paid' ? 'success' : 'warning',
        keywords: ['payment', 'tuition', p.studentName.toLowerCase(), p.receiptNo?.toLowerCase() || ''],
        action: () => onNavigate('payments'),
      });
    });
  }

  // ================= 8. MESSAGES =================
  if (messages.length > 0) {
    messages.forEach((m) => {
      results.push({
        id: `message-${m.id || m.subject}`,
        category: 'messages',
        title: m.subject,
        subtitle: `From: ${m.sender} • ${m.preview || ''}`,
        icon: <MessageSquare className="h-4 w-4 text-indigo-600" />,
        badge: m.isUnread ? 'New' : 'Message',
        badgeTone: m.isUnread ? 'primary' : 'info',
        keywords: ['message', 'chat', m.subject.toLowerCase(), m.sender.toLowerCase()],
        action: () => onNavigate('messages', { messageId: m.id }),
      });
    });
  } else {
    results.push({
      id: 'msg-faculty-broadcast',
      category: 'messages',
      title: 'Academic Dean Welcome & Cohort Orientation',
      subtitle: 'From: Rev. Academic Dean • Class milestones and live session dates',
      icon: <MessageSquare className="h-4 w-4 text-indigo-600" />,
      badge: 'Message',
      badgeTone: 'primary',
      keywords: ['message', 'welcome', 'dean', 'orientation'],
      action: () => onNavigate('messages'),
    });
  }

  return results;
}

export function searchFilter(
  items: SearchResultItem[],
  query: string,
  categoryFilter: string = 'all'
): SearchResultItem[] {
  const q = query.trim().toLowerCase();

  return items
    .filter((item) => {
      // Category filtering
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }

      if (!q) return true;

      // Text search
      const titleMatch = item.title.toLowerCase().includes(q);
      const subtitleMatch = item.subtitle ? item.subtitle.toLowerCase().includes(q) : false;
      const badgeMatch = item.badge ? item.badge.toLowerCase().includes(q) : false;
      const keywordMatch = item.keywords?.some((k) => k.includes(q)) ?? false;

      return titleMatch || subtitleMatch || badgeMatch || keywordMatch;
    })
    .sort((a, b) => {
      if (!q) return 0;
      // Prioritize exact or prefix title matches
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();

      if (aTitle.startsWith(q) && !bTitle.startsWith(q)) return -1;
      if (!aTitle.startsWith(q) && bTitle.startsWith(q)) return 1;

      if (aTitle.includes(q) && !bTitle.includes(q)) return -1;
      if (!aTitle.includes(q) && bTitle.includes(q)) return 1;

      return 0;
    });
}
