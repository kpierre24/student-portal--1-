import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import hteimBannerAsset from '../assets/images/regenerated_image_1785852170450.png';
import biblicalHeroAsset from '../assets/images/caribbean_bible_school_clean_1786453783620.jpg';
import gillianSelkridgeAsset from '../assets/images/gill.png';
import samuelSelkridgeAsset from '../assets/images/samuel_selkridge_1786642928268.jpg';
import galeGrantAsset from '../assets/images/gale_grant_1786642942313.jpg';
import christyRubenAsset from '../assets/images/christy_ruben_1786642955859.jpg';
import garodAndrewsAsset from '../assets/images/Garod.png';
import { LogoImage } from './LogoImage';
import { 
  BookOpen, 
  GraduationCap, 
  Award, 
  Calendar, 
  Users, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Trophy, 
  Crown,
  TrendingUp, 
  BookMarked,
  Clock,
  MapPin,
  Compass,
  CheckCircle2,
  Lock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Sliders,
  PenSquare,
  DollarSign,
  Cloud,
  RefreshCw,
  Database,
  Copy,
  Check,
  Share2,
  AlertCircle,
  ExternalLink,
  AlertTriangle,
  UserX,
  MessageSquare,
  Filter,
  BarChart2,
  PieChart,
  Activity,
  CheckCircle,
  Send,
  Search,
  Bell,
  ShieldAlert,
  Flame,
  Radio,
  Bookmark,
  Quote,
  FileText,
  Layers,
  Video,
  UserCheck,
  Edit3,
  LogOut,
  Settings
} from 'lucide-react';
import { TabType, StudentSummary, ClassDay, PaymentRecord, CustomAssignment, AssignmentSubmission, QuizAssignment, FacultyTeacher } from '../types';
import { FacultyManagerModal } from './FacultyManagerModal';
import { syncFacultyImagesToSupabase } from '../lib/supabaseClient';
import { AppUser } from '../lib/userAuth';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  Cell, 
  AreaChart,
  Area
} from 'recharts';
import { EmptyState } from './UXPrimitives';
import { Modal } from './Modal';
import { EnrollmentInquiryModal } from './EnrollmentInquiryModal';
import { StudentStoriesSection, FaqSection } from './VisitorSections';
import { AdminCommandCenter } from './AdminCommandCenter';
import { GraduationCarousel } from './GraduationCarousel';
import { AdministratorDashboardView } from './dashboards/AdministratorDashboardView';
import { LecturerDashboardView } from './dashboards/LecturerDashboardView';
import { StudentDashboardView } from './dashboards/StudentDashboardView';
import { FinanceDashboardView } from './dashboards/FinanceDashboardView';

interface HomeTabProps {
  onNavigate: (tab: TabType) => void;
  appUser: AppUser | null;
  onOpenLogin: () => void;
  onLogout?: () => void;
  onOpenPresentationDemo?: () => void;
  studentsCount: number;
  students?: StudentSummary[];
  payments?: PaymentRecord[];
  classDays?: ClassDay[];
  records?: any[];
  coursesCount: number;
  classDaysCount: number;
  avgAttendanceRate: number;
  pendingAssignmentsCount?: number;
  uncollectedTuitionAmount?: number;
  libraryResourcesCount?: number;
  nextClassTitle?: string;
  isCloudSyncing?: boolean;
  cloudSyncError?: string | null;
  onPlayIntro?: () => void;
  lastSyncedTime?: string | null;
  onPushToCloud?: () => Promise<void>;
  userEmail?: string | null;
  supabaseTableMissing?: boolean;
  onVerifySetup?: () => Promise<void>;
  atRiskThreshold?: number;
  customAssignments?: CustomAssignment[];
  submissions?: AssignmentSubmission[];
  onTakeQuiz?: (quiz: QuizAssignment) => void;
  facultyTeachers?: FacultyTeacher[];
  onSaveFacultyTeachers?: (newList: FacultyTeacher[]) => void;
  onOpenSystemHealth?: () => void;
  onOpenAdminAuditModal?: () => void;
}

export const DEFAULT_FACULTY_TEACHERS: FacultyTeacher[] = [
  {
    id: 'gillian-selkridge',
    name: 'Apostle Gillian Selkridge',
    title: 'Apostle & School Director',
    role: 'Apostolic Oversight & Ministerial Governance',
    bio: 'Visionary founder of Heaven Touching Earth International Ministries. Overseeing apostolic alignment, ministerial ethics, and five-fold leadership equipping across the 6 core modules.',
    module: 'Module 1 & 6: Apostolic Governance',
    image: gillianSelkridgeAsset,
    badgeColor: 'bg-[#023264]/20 text-[#023264] dark:bg-[#023264]/60 dark:text-[#bae6fd] border-[#025798]/40'
  },
  {
    id: 'samuel-selkridge',
    name: 'Pastor Samuel Selkridge',
    title: 'Senior Pastor & Faculty Dean',
    role: 'Exegetical Theology & Pastoral Care',
    bio: 'Senior Pastor and Dean of Faculty with decades of pastoral devotion. Teaching deep scriptural hermeneutics, flock care, and foundational Christian doctrine.',
    module: 'Module 2: Exegetical Theology & Doctrine',
    image: samuelSelkridgeAsset,
    badgeColor: 'bg-[#025798]/20 text-[#025798] dark:bg-[#025798]/60 dark:text-[#7dd3fc] border-[#0277b8]/40'
  },
  {
    id: 'gale-grant',
    name: 'Pastor Gale Grant',
    title: 'Senior Instructor & Curriculum Chair',
    role: 'Systematic Theology & Church Ethics',
    bio: 'Leading curriculum development and systematic theology. Specialized in biblical worldview, ministerial integrity, and structured church administration.',
    module: 'Module 3: Systematic Theology & Ethics',
    image: galeGrantAsset,
    badgeColor: 'bg-[#01883c]/20 text-[#01883c] dark:bg-[#01883c]/60 dark:text-[#a7f3d0] border-[#01883c]/40'
  },
  {
    id: 'christy-arthur',
    name: 'Pastor Christy Arthur',
    title: 'Lead Instructor & Student Mentor',
    role: 'Homiletics & Practical Preaching',
    bio: 'Dedicated to empowering ministers in the art of sermon preparation, spirit-led homiletics, pulpit decorum, and transformative community outreach.',
    module: 'Module 4: Homiletics & Practical Preaching',
    image: christyRubenAsset,
    badgeColor: 'bg-[#b38f53]/20 text-[#8c6a32] dark:bg-[#b38f53]/60 dark:text-[#dfc18b] border-[#b38f53]/40'
  },
  {
    id: 'garod-andrews',
    name: 'Prophet Garod Andrews',
    title: 'Lead Instructor & Prophetic Department Head',
    role: 'Prophetic Ministry & Spiritual Protocol',
    bio: 'Equipping saints in spiritual discernment, prophetic protocol, intercessory prayer warfare, and operating with spiritual authority.',
    module: 'Module 5: Prophetic Ministry & Intercession',
    image: garodAndrewsAsset,
    badgeColor: 'bg-[#0277b8]/20 text-[#0277b8] dark:bg-[#0277b8]/60 dark:text-[#bae6fd] border-[#0277b8]/40'
  }
];

export const HomeTab: React.FC<HomeTabProps> = ({
  onNavigate,
  appUser,
  onOpenLogin,
  onLogout,
  onOpenPresentationDemo,
  studentsCount,
  students = [],
  payments = [],
  classDays = [],
  records = [],
  coursesCount,
  classDaysCount,
  avgAttendanceRate,
  pendingAssignmentsCount = 0,
  uncollectedTuitionAmount = 0,
  libraryResourcesCount = 6,
  nextClassTitle = 'Day 1',
  isCloudSyncing = false,
  cloudSyncError = null,
  onPlayIntro,
  lastSyncedTime = null,
  onPushToCloud,
  userEmail = null,
  supabaseTableMissing = false,
  onVerifySetup,
  atRiskThreshold = 75,
  customAssignments = [],
  submissions = [],
  onTakeQuiz,
  facultyTeachers: facultyTeachersProp,
  onSaveFacultyTeachers,
  onOpenSystemHealth,
  onOpenAdminAuditModal
}) => {
  const isStudent = appUser?.role === 'student';
  const isAdminOrTeacher = appUser?.role === 'admin' || appUser?.role === 'teacher';
  const isAdmin = appUser?.role === 'admin';

  // Current logged in student metrics (if student role)
  const currentStudent = useMemo(() => {
    if (!appUser || !students || students.length === 0) return null;
    const nameToMatch = appUser.name.toLowerCase().trim();
    return students.find(s => s.name.toLowerCase().trim() === nameToMatch) || null;
  }, [appUser, students]);

  // Attendance metrics calculation for current student
  const studentMetrics = useMemo(() => {
    if (!currentStudent) return null;
    const rate = currentStudent.rate ?? 0;
    const totalDays = classDays?.length || currentStudent.totalDays || 1;
    const attended = currentStudent.attended ?? 0;
    const isHonor = rate >= 85 || (currentStudent.avgScore !== null && currentStudent.avgScore >= 85);
    const isSat = rate >= atRiskThreshold;
    const isRisk = rate < atRiskThreshold;
    
    // Max allowable total absences to stay at or above atRiskThreshold (e.g. 75%)
    const maxAllowedAbsences = Math.floor(totalDays * (1 - atRiskThreshold / 100));
    const currentAbsences = Math.max(0, totalDays - attended);
    const remainingAbsences = Math.max(0, maxAllowedAbsences - currentAbsences);

    return {
      rate,
      totalDays,
      attended,
      isHonor,
      isSat,
      isRisk,
      remainingAbsences,
      avgScore: currentStudent.avgScore
    };
  }, [currentStudent, classDays, atRiskThreshold]);

  // Active Quiz Link Copy Toast State
  const [copiedQuizLink, setCopiedQuizLink] = useState<string | null>(null);

  // Active Published Quizzes computation
  const activeQuizzes = useMemo(() => {
    return customAssignments.filter(a => a.type === 'quiz' && a.quizData && a.quizData.isPublished !== false);
  }, [customAssignments]);

  // Internal Faculty Teachers State (Fallback if prop not provided)
  const [internalFacultyTeachers, setInternalFacultyTeachers] = useState<FacultyTeacher[]>(() => {
    try {
      const saved = localStorage.getItem('hteim_faculty_teachers_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error("Failed loading faculty teachers state:", err);
    }
    return DEFAULT_FACULTY_TEACHERS;
  });

  const facultyTeachers = (facultyTeachersProp && facultyTeachersProp.length > 0)
    ? facultyTeachersProp
    : internalFacultyTeachers;

  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);

  const handleSaveFacultyList = (newList: FacultyTeacher[]) => {
    setInternalFacultyTeachers(newList);
    try {
      localStorage.setItem('hteim_faculty_teachers_v1', JSON.stringify(newList));
    } catch (err) {
      console.error("Failed saving faculty teachers:", err);
    }

    if (onSaveFacultyTeachers) {
      onSaveFacultyTeachers(newList);
    } else {
      // Ensure images in newList are saved to Supabase Storage bucket
      syncFacultyImagesToSupabase(newList).then(syncedList => {
        setInternalFacultyTeachers(syncedList);
        try {
          localStorage.setItem('hteim_faculty_teachers_v1', JSON.stringify(syncedList));
        } catch (err) {
          console.error("Failed saving updated faculty list:", err);
        }
      });
    }
  };

  const handleResetFacultyList = () => {
    setInternalFacultyTeachers(DEFAULT_FACULTY_TEACHERS);
    try {
      localStorage.removeItem('hteim_faculty_teachers_v1');
    } catch (err) {
      console.error("Failed resetting faculty teachers:", err);
    }
    if (onSaveFacultyTeachers) {
      onSaveFacultyTeachers(DEFAULT_FACULTY_TEACHERS);
    }
  };

  // Showcase & Faculty Revolving Carousel State (Slide 0 = Opening Intro, Slide 1..N = Faculty Members)
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [isTeacherAutoplay, setIsTeacherAutoplay] = useState(true);

  const totalSlides = 1 + facultyTeachers.length;

  // Bounds safety check if slide count changes
  useEffect(() => {
    if (currentSlideIdx >= totalSlides) {
      setCurrentSlideIdx(0);
    }
  }, [totalSlides, currentSlideIdx]);

  useEffect(() => {
    if (!isTeacherAutoplay || totalSlides <= 0) return;
    const timer = setInterval(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % totalSlides);
    }, 5000);
    return () => clearInterval(timer);
  }, [isTeacherAutoplay, totalSlides]);

  const activeTeacherIdx = currentSlideIdx > 0 ? currentSlideIdx - 1 : 0;
  const activeTeacher = facultyTeachers[activeTeacherIdx] || facultyTeachers[0] || DEFAULT_FACULTY_TEACHERS[0];

  const handleNextSlide = () => {
    if (totalSlides <= 0) return;
    setCurrentSlideIdx((prev) => (prev + 1) % totalSlides);
  };

  const handlePrevSlide = () => {
    if (totalSlides <= 0) return;
    setCurrentSlideIdx((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  // Section visibility states
  const [adminTab, setAdminTab] = useState<'at_risk' | 'trends' | 'sync'>('at_risk');
  const [isAdminPanelExpanded, setIsAdminPanelExpanded] = useState(false);
  const [showInstitutionalShowcase, setShowInstitutionalShowcase] = useState(false);
  const [showAdminDeepAnalytics, setShowAdminDeepAnalytics] = useState(false);

  // At-Risk Notification Card State
  const [atRiskFilter, setAtRiskFilter] = useState<'all' | 'critical' | 'moderate'>('all');
  const [atRiskSearch, setAtRiskSearch] = useState('');
  const [sentAlertStudent, setSentAlertStudent] = useState<string | null>(null);

  // Module-Based Attendance Trends State
  const [trendChartType, setTrendChartType] = useState<'bar' | 'area'>('bar');

  // At-Risk Calculation
  const rawAtRiskStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    return students.filter(s => s.rate < atRiskThreshold).sort((a, b) => a.rate - b.rate);
  }, [students, atRiskThreshold]);

  const filteredAtRiskStudents = useMemo(() => {
    return rawAtRiskStudents.filter(s => {
      if (atRiskFilter === 'critical' && s.rate > 50) return false;
      if (atRiskFilter === 'moderate' && (s.rate <= 50 || s.rate >= atRiskThreshold)) return false;
      if (atRiskSearch.trim()) {
        return (s?.name || '').toLowerCase().includes(atRiskSearch.toLowerCase().trim());
      }
      return true;
    });
  }, [rawAtRiskStudents, atRiskFilter, atRiskSearch, atRiskThreshold]);

  // Module-Based Attendance Trend Data Computation
  const moduleTrendData = useMemo(() => {
    const modulesList = [
      { code: 'SOM-MOD-1', title: 'Mod 1: Intro', fullName: 'Module 1: Introduction' },
      { code: 'SOM-MOD-2', title: 'Mod 2: Evangelism', fullName: 'Module 2: Evangelism' },
      { code: 'SOM-MOD-3', title: 'Mod 3: Ethics', fullName: 'Module 3: Ministerial Ethics' },
      { code: 'SOM-MOD-4', title: 'Mod 4: Apostolic', fullName: 'Module 4: Apostolic Ministry' },
      { code: 'SOM-MOD-5', title: 'Mod 5: Prophetic', fullName: 'Module 5: Prophetic Ministry' },
      { code: 'SOM-MOD-6', title: 'Mod 6: Pastoral', fullName: 'Module 6: School of Pastors & Teachers' }
    ];

    const totalClassDays = classDays && classDays.length > 0 ? classDays : [];
    const numDays = totalClassDays.length;

    return modulesList.map((mod, idx) => {
      let modDays: ClassDay[] = [];
      if (numDays > 0) {
        const daysPerMod = Math.max(1, Math.ceil(numDays / 6));
        const start = idx * daysPerMod;
        modDays = totalClassDays.slice(start, start + daysPerMod);
      }

      let presentTotal = 0;
      let absentTotal = 0;
      let totalExpected = 0;

      if (students && students.length > 0 && modDays.length > 0) {
        students.forEach(st => {
          modDays.forEach(day => {
            totalExpected++;
            const att = st.attendanceByDay[day.id];
            if (att && att.present) {
              presentTotal++;
            } else {
              absentTotal++;
            }
          });
        });
      }

      const attendanceRate = totalExpected > 0 
        ? Math.round((presentTotal / totalExpected) * 100) 
        : Math.max(50, 88 - (idx * 4));

      const absenceRate = 100 - attendanceRate;

      return {
        code: mod.code,
        name: mod.title,
        fullName: mod.fullName,
        attendanceRate,
        absenceRate,
        presentCount: presentTotal,
        absentCount: absentTotal,
        totalClasses: modDays.length,
        isHighAbsence: attendanceRate < 75
      };
    });
  }, [classDays, students]);

  // Collapsible banner state
  const [isBannerCollapsed, setIsBannerCollapsed] = useState<boolean>(() => {
    return false;
  });

  const toggleBannerCollapse = () => {
    setIsBannerCollapsed(prev => !prev);
  };

  useEffect(() => {
    localStorage.setItem('hteim_home_banner_collapsed', String(isBannerCollapsed));
  }, [isBannerCollapsed]);

  // Metrics
  const activeStudents = studentsCount;
  const scheduledClasses = classDaysCount;
  const attendanceRate = Math.round(avgAttendanceRate || 0);

  // Find logged in student data
  const loggedInStudentData = useMemo(() => {
    if (!isStudent || !appUser) return null;
    const nameToMatch = (appUser.studentName || appUser.name || '').toLowerCase().trim();
    return students.find(s => (s?.name || '').toLowerCase().trim() === nameToMatch) || null;
  }, [isStudent, appUser, students]);

  // Find logged in student tuition statement
  const loggedInStudentPayment = useMemo(() => {
    if (!isStudent || !appUser) return null;
    const nameToMatch = (appUser.studentName || appUser.name || '').toLowerCase().trim();
    return payments.find(p => (p?.studentName || '').toLowerCase().trim() === nameToMatch) || null;
  }, [isStudent, appUser, payments]);

  // Active Role Dashboard View Controller
  const [selectedDashboardRole, setSelectedDashboardRole] = useState<'auto' | 'administrator' | 'lecturer' | 'student' | 'finance' | 'public'>('auto');

  // Resolved role dashboard based on auth or user override
  const resolvedRoleDashboard = useMemo(() => {
    if (selectedDashboardRole !== 'auto') {
      return selectedDashboardRole;
    }
    if (!appUser) return 'public';
    if (appUser.role === 'admin' || appUser.role === 'super_admin' || appUser.role === 'registrar') {
      return 'administrator';
    }
    if (appUser.role === 'lecturer' || appUser.role === 'teacher') {
      return 'lecturer';
    }
    if (appUser.role === 'student') {
      return 'student';
    }
    if (appUser.role === 'finance_officer') {
      return 'finance';
    }
    return 'public';
  }, [selectedDashboardRole, appUser]);

  const renderFacultyShowcaseBanner = () => (
    <section 
      className="bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl overflow-hidden my-2 transition-all"
      onMouseEnter={() => setIsTeacherAutoplay(false)}
      onMouseLeave={() => setIsTeacherAutoplay(true)}
    >
      {/* Banner Top Header Controls */}
      <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 sm:px-6 py-3.5 flex items-center justify-between flex-wrap gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-sm shrink-0">
            {currentSlideIdx === 0 ? <Sparkles className="w-4 h-4 text-slate-950" /> : <Users className="w-4 h-4 text-slate-950" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-extrabold text-white tracking-tight">
                {currentSlideIdx === 0 ? 'HTEIM School of Ministry — Opening Vision' : 'Course Faculty & Anointed Instructors'}
              </h2>
              <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1">
                <Flame className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                {currentSlideIdx === 0 ? 'Opening Intro' : `Instructor 0${currentSlideIdx} of 0${facultyTeachers.length}`}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {currentSlideIdx === 0 
                ? 'Anointed biblical instruction, exegesis, and ministerial governance' 
                : `Equipping saints with five-fold wisdom and ministerial excellence (${activeTeacher.name})`}
            </p>
          </div>
        </div>

        {/* Navigation, Autoplay & Admin Edit Controls */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsFacultyModalOpen(true)}
              className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-[11px] font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95 border border-amber-300"
              title="Manage Faculty Roster & Photos"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-950" />
              <span>Edit Faculty</span>
            </button>
          )}

          <button
            onClick={() => setIsTeacherAutoplay(!isTeacherAutoplay)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            title={isTeacherAutoplay ? "Pause auto-rotation" : "Resume auto-rotation"}
          >
            {isTeacherAutoplay ? (
              <>
                <Pause className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="hidden xs:inline text-[10px] font-bold">Autoplay</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="hidden xs:inline text-[10px] font-bold">Paused</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={handlePrevSlide}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono font-extrabold text-amber-400 px-1.5">
              0{currentSlideIdx + 1}/0{totalSlides}
            </span>
            <button
              onClick={handleNextSlide}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
              aria-label="Next Slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={toggleBannerCollapse}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer shrink-0"
            title={isBannerCollapsed ? "Expand Banner" : "Collapse Banner"}
          >
            {isBannerCollapsed ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronUp className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Main Banner Slide Content Area with AnimatePresence Smooth Fade */}
      {!isBannerCollapsed && (
        <div className="p-3 sm:p-6 md:p-8 relative">
          <AnimatePresence mode="wait">
            {currentSlideIdx === 0 ? (
              /* Slide 0: Opening Intro Hero Card */
              <motion.div
                key="opening-intro-slide"
                initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-8 md:p-10 min-h-[300px] flex flex-col justify-between shadow-2xl animate-radiant-glow"
              >
                <div className="absolute inset-0 z-0">
                  <img 
                    src={biblicalHeroAsset} 
                    alt="HTEIM School of Ministry" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-950/60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                </div>

                <div className="relative z-10 w-full max-w-4xl space-y-3 sm:space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 text-amber-300 text-[10px] sm:text-[11px] font-bold tracking-wide rounded-full border border-amber-400/30 backdrop-blur-md">
                    <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Heaven Touching Earth International Ministries</span>
                  </div>

                  <div className="space-y-1">
                    <h1 className="text-xl sm:text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-white font-syne">
                      Anointed Biblical Instruction & <br className="hidden sm:inline" />
                      <span className="inline-block mt-1 px-2.5 sm:px-3 py-0.5 sm:py-1 bg-amber-400 text-slate-950 font-black rounded-lg sm:rounded-xl text-sm sm:text-2xl md:text-4xl shadow-lg">
                        Ministerial Governance
                      </span>
                    </h1>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-0.5">
                    <span className="px-2.5 py-0.5 sm:py-1 bg-white/10 text-white border border-white/15 rounded-full text-[9px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md">
                      <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                      6 Core Modules
                    </span>
                    <span className="px-2.5 py-0.5 sm:py-1 bg-white/10 text-white border border-white/15 rounded-full text-[9px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md">
                      <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                      75% Standard
                    </span>
                    <span className="px-2.5 py-0.5 sm:py-1 bg-white/10 text-white border border-white/15 rounded-full text-[9px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md">
                      <Radio className="w-3.5 h-3.5 text-amber-400" />
                      Live Hybrid
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm md:text-base text-slate-200/95 leading-relaxed max-w-2xl font-medium line-clamp-3 sm:line-clamp-none">
                    "Bringing Heaven to Earth, Taking People to Heaven." Equipping saints through deep exegesis, high ministerial ethics, prophetic discernment, and five-fold apostolic oversight.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-2 flex-wrap">
                    {!appUser && (
                      <button
                        onClick={() => setIsEnrollmentModalOpen(true)}
                        className="px-4 py-2.5 sm:py-3 bg-[#b38f53] hover:bg-[#a07c42] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 border border-[#dfc18b]"
                      >
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>Apply for Enrollment</span>
                      </button>
                    )}

                    <button
                      onClick={() => onNavigate('courses')}
                      className="px-4 py-2.5 sm:py-3 bg-[#023264] hover:bg-[#025798] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 border border-[#0277b8]/40"
                    >
                      <BookOpen className="w-4 h-4 text-[#dfc18b]" /> 
                      <span>6 Core Modules</span>
                    </button>

                    <button
                      onClick={() => onNavigate('schedule')}
                      className="px-4 py-2.5 sm:py-3 bg-[#01883c]/90 hover:bg-[#01883c] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl backdrop-blur-md transition-all border border-[#01883c]/60 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Calendar className="w-4 h-4 text-[#a7f3d0]" /> 
                      <span>Class Schedule</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Slide 1..N: Faculty Instructor Cards */
              <motion.div
                key={`faculty-slide-${activeTeacher.id}`}
                initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="p-4 sm:p-6 md:p-7 relative overflow-hidden bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
                  <div className="md:col-span-4 lg:col-span-3 flex sm:flex-col items-center justify-center gap-4">
                    <div className="relative group w-24 h-24 sm:w-44 sm:h-52 md:w-full md:max-w-[240px] shrink-0">
                      <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-purple-600 to-indigo-600 rounded-2xl blur-sm opacity-40 group-hover:opacity-75 transition duration-500" />
                      <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-amber-400/50 bg-slate-950 shadow-2xl flex items-center justify-center">
                        <img 
                          src={activeTeacher.image || gillianSelkridgeAsset} 
                          alt={activeTeacher.name} 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = gillianSelkridgeAsset;
                          }}
                          className="w-full h-full object-cover object-top filter brightness-105 contrast-105 group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8 lg:col-span-9 space-y-3 sm:space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider border shadow-sm ${activeTeacher.badgeColor || 'bg-amber-400/20 text-amber-300 border-amber-400/40'}`}>
                        {activeTeacher.module}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-slate-200 border border-white/15 backdrop-blur-md">
                        {activeTeacher.role}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                        <span>{activeTeacher.name}</span>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      </h3>
                      <p className="text-xs sm:text-sm font-bold text-amber-300/90 mt-0.5">
                        {activeTeacher.title}
                      </p>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal bg-slate-950/40 p-3 sm:p-4 rounded-xl border border-slate-800/80">
                      "{activeTeacher.bio}"
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => onNavigate('courses')}
                        className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-slate-950" />
                        <span>View Syllabus & Lecture Notes</span>
                      </button>

                      <button
                        onClick={() => onNavigate('messages')}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-700"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                        <span>Send Direct Inquiry</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Roster Strip Indicators */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Showcase Roster ({facultyTeachers.length} Instructors)</span>
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalSlides }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIdx(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentSlideIdx 
                        ? 'w-5 bg-amber-400 shadow-xs' 
                        : 'w-1.5 bg-slate-700 hover:bg-slate-600'
                    }`}
                    aria-label={`Go to slide ${idx}`}
                  />
                ))}
              </div>
            </div>

            {/* Horizontal Scrollable Thumbnail Reel */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setCurrentSlideIdx(0)}
                className={`p-1.5 sm:p-2 rounded-xl text-left transition-all cursor-pointer flex items-center gap-2 border shrink-0 min-w-[140px] sm:min-w-0 sm:flex-1 ${
                  currentSlideIdx === 0
                    ? 'bg-amber-400/20 border-amber-400 text-white shadow-md ring-1 ring-amber-400'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-slate-950 flex items-center justify-center">
                  <img
                    src={biblicalHeroAsset}
                    alt="Opening Intro"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-[11px] font-extrabold truncate text-white">Opening Intro</p>
                  <p className="text-[8px] sm:text-[9px] text-amber-400 truncate font-mono">HTEIM Vision</p>
                </div>
              </button>

              {facultyTeachers.map((teacher, idx) => {
                const slideNum = idx + 1;
                const isActive = slideNum === currentSlideIdx;
                return (
                  <button
                    key={teacher.id}
                    onClick={() => setCurrentSlideIdx(slideNum)}
                    className={`p-1.5 sm:p-2 rounded-xl text-left transition-all cursor-pointer flex items-center gap-2 border shrink-0 min-w-[140px] sm:min-w-0 sm:flex-1 ${
                      isActive
                        ? 'bg-amber-400/20 border-amber-400 text-white shadow-md ring-1 ring-amber-400'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-slate-950">
                      <img
                        src={teacher.image || gillianSelkridgeAsset}
                        alt={teacher.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = gillianSelkridgeAsset;
                        }}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-[11px] font-extrabold truncate text-white">{teacher.name}</p>
                      <p className="text-[8px] sm:text-[9px] text-amber-400 truncate font-mono">Faculty 0{slideNum}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );

  const renderCurriculumBanner = () => (
    <section className="bg-gradient-to-r from-slate-900 via-[#022044] to-[#023264] text-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-800 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#b38f53]/30 border border-[#dfc18b]/40 text-[#dfc18b] flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-white tracking-wide">
              6-Module Core Curriculum Roadmap
            </h2>
            <p className="text-[11px] text-slate-300">
              Foundational theology, five-fold governance, ethics, & practical ministry
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('courses')}
          className="self-start sm:self-auto px-4 py-2 bg-[#dfc18b] hover:bg-[#c9a96e] text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
        >
          <span>Explore Full Syllabus</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 pt-0.5">
        {[
          { num: '01', title: 'Foundations' },
          { num: '02', title: 'Evangelism' },
          { num: '03', title: 'Ministerial Ethics' },
          { num: '04', title: 'Apostolic Order' },
          { num: '05', title: 'Prophetic Warfare' },
          { num: '06', title: 'Pastors Academy' }
        ].map((m) => (
          <button
            key={m.num}
            onClick={() => onNavigate('courses')}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl text-left shrink-0 transition-all cursor-pointer flex items-center gap-2 group"
          >
            <span className="text-[9px] font-mono font-black text-[#dfc18b] px-1.5 py-0.5 rounded bg-black/30">
              {m.num}
            </span>
            <span className="text-xs font-bold text-slate-100 group-hover:text-white whitespace-nowrap">
              {m.title}
            </span>
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <div className="space-y-6 pb-28 sm:pb-24 md:pb-12 animate-fadeIn material-screen" id="som-home-container">
      {/* ─── 1. Administrator Dashboard View ─────────────────────────────── */}
      {resolvedRoleDashboard === 'administrator' && (
        <AdministratorDashboardView
          students={students}
          payments={payments}
          classDays={classDays}
          customAssignments={customAssignments}
          submissions={submissions}
          coursesCount={coursesCount}
          onNavigate={onNavigate}
          atRiskThreshold={atRiskThreshold}
          isCloudSyncing={isCloudSyncing}
          lastSyncedTime={lastSyncedTime}
          onPushToCloud={onPushToCloud}
          appUser={appUser}
          onOpenSystemHealth={onOpenSystemHealth}
          onOpenAdminAuditModal={onOpenAdminAuditModal}
        />
      )}

      {/* ─── 2. Lecturer Dashboard View ─────────────────────────────────── */}
      {resolvedRoleDashboard === 'lecturer' && (
        <LecturerDashboardView
          appUser={appUser}
          classDays={classDays}
          students={students}
          customAssignments={customAssignments}
          submissions={submissions}
          facultyTeachers={facultyTeachers}
          onNavigate={onNavigate}
          pendingAssignmentsCount={pendingAssignmentsCount}
        />
      )}

      {/* ─── 3. Student Dashboard View ──────────────────────────────────── */}
      {resolvedRoleDashboard === 'student' && (
        <StudentDashboardView
          appUser={appUser}
          studentData={loggedInStudentData}
          paymentRecord={loggedInStudentPayment}
          classDays={classDays}
          customAssignments={customAssignments}
          submissions={submissions}
          onNavigate={onNavigate}
          onTakeQuiz={onTakeQuiz}
          atRiskThreshold={atRiskThreshold}
        />
      )}

      {/* ─── 4. Finance Dashboard View ──────────────────────────────────── */}
      {resolvedRoleDashboard === 'finance' && (
        <FinanceDashboardView
          payments={payments}
          students={students}
          onNavigate={onNavigate}
          appUser={appUser}
        />
      )}
      
      {/* ─── Authenticated User Secondary Sections ─────────────────────────────── */}
      {appUser ? (
        <div className="space-y-4">
          {/* Admin Deep Audit Console (Collapsible for teachers and administrators) */}
          {isAdminOrTeacher && (
            <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/40 via-purple-50/20 to-transparent dark:from-indigo-950/20 dark:to-transparent p-3 sm:p-4 shadow-2xs">
              <button
                type="button"
                onClick={() => setShowAdminDeepAnalytics(prev => !prev)}
                className="w-full flex items-center justify-between text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Advanced Operational Audit, Student Documents & Deep Cohort Metrics
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Admission document verification checklist, deep cohort charts, and system audit logs
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <span className="hidden sm:inline">{showAdminDeepAnalytics ? 'Collapse Audit Console' : 'Expand Audit Console'}</span>
                  {showAdminDeepAnalytics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showAdminDeepAnalytics && (
                <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/40 animate-fadeIn">
                  <AdminCommandCenter
                    students={students}
                    payments={payments}
                    classDays={classDays}
                    customAssignments={customAssignments}
                    submissions={submissions}
                    coursesCount={coursesCount}
                    onNavigate={onNavigate}
                    atRiskThreshold={atRiskThreshold}
                    isCloudSyncing={isCloudSyncing}
                    lastSyncedTime={lastSyncedTime}
                    cloudSyncError={cloudSyncError}
                    appUser={appUser}
                    onPushToCloud={onPushToCloud}
                  />
                </div>
              )}
            </div>
          )}

          {/* Institutional Vision, Faculty Directory & Graduation Highlights (Collapsible for authenticated users) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-3 sm:p-4 shadow-2xs">
            <button
              type="button"
              onClick={() => setShowInstitutionalShowcase(prev => !prev)}
              className="w-full flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Institutional Faculty Directory, 6-Module Roadmap & Graduation Highlights
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Apostolic leadership bios, curriculum milestones, and ceremony memories
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#025798] dark:text-[#7dd3fc]">
                <span className="hidden sm:inline">{showInstitutionalShowcase ? 'Hide Showcase' : 'Explore Showcase'}</span>
                {showInstitutionalShowcase ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showInstitutionalShowcase && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-6 animate-fadeIn">
                {renderFacultyShowcaseBanner()}
                {renderCurriculumBanner()}
                <GraduationCarousel
                  appUser={appUser}
                  onOpenEnrollmentModal={() => setIsEnrollmentModalOpen(true)}
                  onNavigateToCourses={() => onNavigate('courses')}
                />
              </div>
            )}
          </div>

          {/* Core Vision & Covenant Mandate */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row gap-5 md:items-center md:justify-between">
            <div className="space-y-1.5 max-w-xl">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">HTEIM Covenant Mandate</h3>
              <div className="border-l-2 border-slate-300 dark:border-slate-600 pl-3">
                <span className="font-semibold text-[10px] uppercase text-slate-600 dark:text-slate-300 block">Ephesians 2:20 Grounded</span>
                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed max-w-prose">
                  Built on the foundation of the apostles and prophets, Christ Jesus Himself being the chief cornerstone.
                </p>
              </div>
            </div>
            <div className="border-l-2 border-[#b38f53] pl-4 py-1.5 shrink-0">
              <span className="font-bold text-[10px] uppercase text-[#b38f53] dark:text-[#dfc18b] block tracking-wider">Vision Statement</span>
              <p className="text-slate-800 dark:text-slate-200 font-extrabold italic text-sm font-serif">
                "Bringing Heaven to Earth, Taking People to Heaven"
              </p>
            </div>
          </section>
        </div>
      ) : (
        /* ─── Visitor (Public / Unauthenticated) View ─────────────────────────────── */
        <div className="space-y-6">
          {renderFacultyShowcaseBanner()}

          {/* Dual-Track Quick Action Pathways */}
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:to-slate-900 border border-amber-400/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm space-y-3 interactive-hover-card">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-400 text-slate-950 font-black">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Admissions Open
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Apply for Enrollment
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Step into theological and ministerial training. Register for the upcoming hybrid cohort.
                </p>
              </div>
              <button
                onClick={() => setIsEnrollmentModalOpen(true)}
                className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2 border border-amber-300 active:scale-95"
              >
                <span>Start Application</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm space-y-3 interactive-hover-card">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#023264] text-white font-black">
                    <Lock className="w-4 h-4 text-[#dfc18b]" />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#025798] dark:text-[#7dd3fc]">
                    Enrolled Students
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Student & Staff Portal
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Sign in with your student PIN to view live attendance, quiz scores, homework, and tuition.
                </p>
              </div>
              <button
                onClick={onOpenLogin}
                className="w-full py-2.5 px-4 bg-[#023264] hover:bg-[#025798] text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-95 border border-[#b38f53]/30"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Portal Sign In</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm space-y-3 sm:col-span-2 md:col-span-1 interactive-hover-card">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#01883c] text-white font-black">
                    <BookOpen className="w-4 h-4 text-[#a7f3d0]" />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#01883c] dark:text-[#4ade80]">
                    Academic Syllabus
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  6 Core Curriculum
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Explore our comprehensive theological roadmap spanning foundations, ethics, and five-fold leadership.
                </p>
              </div>
              <button
                onClick={() => onNavigate('courses')}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Browse Curriculum</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {renderCurriculumBanner()}

          <GraduationCarousel
            appUser={appUser}
            onOpenEnrollmentModal={() => setIsEnrollmentModalOpen(true)}
            onNavigateToCourses={() => onNavigate('courses')}
          />

          <StudentStoriesSection />

          <FaqSection
            onOpenEnrollmentModal={() => setIsEnrollmentModalOpen(true)}
          />

          {/* Covenant Mandate */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
            <div className="space-y-2 max-w-xl">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">HTEIM Covenant Mandate</h3>
              <div className="border-l-2 border-slate-300 dark:border-slate-600 pl-3">
                <span className="font-semibold text-[10px] uppercase text-slate-600 dark:text-slate-300 block">Ephesians 2:20 Grounded</span>
                <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed max-w-prose">
                  Built on the foundation of the apostles and prophets, Christ Jesus Himself being the chief cornerstone.
                </p>
              </div>
            </div>
            <div className="border-l-2 border-[#b38f53] pl-4 py-2 shrink-0">
              <span className="font-bold text-[10px] uppercase text-[#b38f53] dark:text-[#dfc18b] block tracking-wider">Vision Statement</span>
              <p className="text-slate-800 dark:text-slate-200 font-extrabold italic text-sm font-serif">
                "Bringing Heaven to Earth, Taking People to Heaven"
              </p>
            </div>
          </section>
        </div>
      )}

      {/* Cohort Enrollment Application & Inquiry Modal with Combined Graduation Showcase */}
      <EnrollmentInquiryModal
        isOpen={isEnrollmentModalOpen}
        onClose={() => setIsEnrollmentModalOpen(false)}
        onNavigateToCourses={() => onNavigate('courses')}
      />

      {/* Admin Faculty & Instructors Manager Modal */}
      {isAdmin && (
        <FacultyManagerModal
          isOpen={isFacultyModalOpen}
          onClose={() => setIsFacultyModalOpen(false)}
          facultyList={facultyTeachers}
          onSaveFacultyList={handleSaveFacultyList}
          onResetToDefault={handleResetFacultyList}
        />
      )}



    </div>
  );
};
