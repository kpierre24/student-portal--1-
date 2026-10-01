import React, { Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  AlertCircle,
  Upload,
  Loader2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  X,
  Calendar,
  Trash2,
  RotateCcw,
  PenSquare,
  LayoutGrid,
  List,
  Mail,
  Maximize2,
  Minimize2,
  Trophy,
  Layers,
  DollarSign,
  Edit3,
  Plus,
  Lock,
  Clock,
  ShieldCheck,
  MessageCircle,
  CheckCheck,
  Download,
  Zap,
} from 'lucide-react';

import { StudentAttendancePortal } from '../../components/StudentAttendancePortal';
import { SwipeableAttendanceCard } from '../../components/SwipeableAttendanceCard';
import { ManageClassDaysModal } from '../../components/ManageClassDaysModal';
import { SpeedCheckInModal } from '../../components/SpeedCheckInModal';
import { EmptyState } from '../../components/UXPrimitives';
import { logActivity } from '../../lib/auditLogger';
import { getStudentPaymentDetails } from '../../lib/paymentUtils';
import { getAttendanceLockInfo, isAttendanceLocked, ATTENDANCE_LOCK_WINDOW_HOURS } from '../../lib/attendanceLock';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export interface AttendanceTabProps {
  appUser: any;
  currentStudentPortalData: any;
  classDays: any[];
  rubricScores: Record<string, { participation: number; scripture: number; assignment: number }>;
  onUpdateStudentPhoto: (name: string, photoDataUrl: string) => void;
  onRequestTranscript: (s: any) => void;
  onRequestCertificate: (s: any) => void;
  atRiskThreshold: number;
  satisfactoryThreshold: number;
  records: any[];
  uniqueStudents: any[];
  excusedAbsences: Record<string, Record<string, boolean>>;
  studentPhotos: Record<string, string>;
  studentNotes: Record<string, string>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  dateRangeFilter: string;
  setDateRangeFilter: React.Dispatch<React.SetStateAction<'all' | '30days' | 'month'>>;
  selectedModule: string;
  setSelectedModule: React.Dispatch<React.SetStateAction<'all' | 'm1' | 'm2' | 'm3'>>;
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<'name_asc' | 'name_desc' | 'rate_desc' | 'rate_asc'>>;
  viewMode: string;
  setViewMode: React.Dispatch<React.SetStateAction<'matrix' | 'cards'>>;
  densityMode: string;
  setDensityMode: React.Dispatch<React.SetStateAction<'comfortable' | 'dense'>>;
  statusFilter: string;
  setStatusFilter: React.Dispatch<React.SetStateAction<'all' | 'at_risk' | 'perfect' | 'unpaid' | 'honor_roll' | 'fifty_percent' | 'moderate'>>;
  selectedStudent: any;
  setSelectedStudent: React.Dispatch<React.SetStateAction<any>>;
  selectedStudentNames: string[];
  setSelectedStudentNames: React.Dispatch<React.SetStateAction<string[]>>;
  filteredAndSortedStudents: any[];
  effectiveClassDays: any[];
  classDayStats: Record<string, { count: number; percentage: number }>;
  trendChartData: any[];
  getStudentBadges?: (student: any) => any[];
  handleToggleStudentAttendance: (name: string, dayId: string, status: string) => void;
  handleAddClassDay: () => void;
  handleEditClassDayTitle: (dayId: string, newName: string) => void;
  handleDeleteClassDay: (dayId: string) => void;
  handleClearClassDayRecords: (dayId: string) => void;
  handleSaveStudentNote: (name: string, note: string) => void;
  handleToggleExcusedAbsence: (studentName: string, dayId: string) => void;
  handleSelectAllDisplayed: () => void;
  handleSelectAllAtRisk: () => void;
  clearBatchSelection: () => void;
  handleExportCSV: () => void;
  handleLoadDemo: () => void;
  isLoading: boolean;
  dataSource: string;
  error: string | null;
  showReportModal: boolean;
  setShowReportModal: React.Dispatch<React.SetStateAction<boolean>>;
  showEmailDraftModal: boolean;
  setShowEmailDraftModal: React.Dispatch<React.SetStateAction<boolean>>;
  copiedEmail: boolean;
  setCopiedEmail: React.Dispatch<React.SetStateAction<boolean>>;
  showStudentTranscriptModal: boolean;
  setShowStudentTranscriptModal: React.Dispatch<React.SetStateAction<boolean>>;
  showCertificateModal: boolean;
  setShowCertificateModal: React.Dispatch<React.SetStateAction<boolean>>;
  showBatchEmailModal: boolean;
  setShowBatchEmailModal: React.Dispatch<React.SetStateAction<boolean>>;
  certificateData: any;
  setCertificateData: React.Dispatch<React.SetStateAction<any>>;
  isGeneratingPDF: boolean;
  showClassDaysModal: boolean;
  setShowClassDaysModal: React.Dispatch<React.SetStateAction<boolean>>;
  liveCheckinDayId: string;
  setLiveCheckinDayId: React.Dispatch<React.SetStateAction<string>>;
  handleClearStudentAttendanceRecords: (name: string) => void;
  selectedReportLevel: string;
  setSelectedReportLevel: React.Dispatch<React.SetStateAction<string>>;
  selectedReportAttendanceFilter: string;
  setSelectedReportAttendanceFilter: React.Dispatch<React.SetStateAction<'all' | 'at_risk' | 'fifty_percent' | 'satisfactory'>>;
  toggleSelectStudent: (name: string) => void;
  setRecords: React.Dispatch<React.SetStateAction<any[]>>;
  setExcusedAbsences: React.Dispatch<React.SetStateAction<Record<string, Record<string, boolean>>>>;
}

export function AttendanceTab({
  appUser,
  currentStudentPortalData,
  classDays,
  rubricScores,
  onUpdateStudentPhoto,
  onRequestTranscript,
  onRequestCertificate,
  atRiskThreshold,
  satisfactoryThreshold,
  records,
  uniqueStudents,
  excusedAbsences,
  studentPhotos,
  studentNotes,
  searchQuery,
  setSearchQuery,
  dateRangeFilter,
  setDateRangeFilter,
  selectedModule,
  setSelectedModule,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  densityMode,
  setDensityMode,
  statusFilter,
  setStatusFilter,
  selectedStudent,
  setSelectedStudent,
  selectedStudentNames,
  setSelectedStudentNames,
  filteredAndSortedStudents,
  effectiveClassDays,
  classDayStats,
  trendChartData,
  getStudentBadges = () => [],
  handleToggleStudentAttendance,
  handleAddClassDay,
  handleEditClassDayTitle,
  handleDeleteClassDay,
  handleClearClassDayRecords,
  handleSaveStudentNote,
  handleToggleExcusedAbsence,
  handleSelectAllDisplayed,
  handleSelectAllAtRisk,
  clearBatchSelection,
  handleExportCSV,
  handleLoadDemo,
  isLoading,
  dataSource,
  error,
  showReportModal,
  setShowReportModal,
  showEmailDraftModal,
  setShowEmailDraftModal,
  copiedEmail,
  setCopiedEmail,
  showStudentTranscriptModal,
  setShowStudentTranscriptModal,
  showCertificateModal,
  setShowCertificateModal,
  showBatchEmailModal,
  setShowBatchEmailModal,
  certificateData,
  setCertificateData,
  isGeneratingPDF,
  showClassDaysModal,
  setShowClassDaysModal,
  liveCheckinDayId,
  setLiveCheckinDayId,
  handleClearStudentAttendanceRecords,
  selectedReportLevel,
  setSelectedReportLevel,
  selectedReportAttendanceFilter,
  setSelectedReportAttendanceFilter,
  toggleSelectStudent,
  setRecords,
  setExcusedAbsences,
}: AttendanceTabProps) {
  const [showSpeedCheckIn, setShowSpeedCheckIn] = React.useState(false);

  // Batch mark all displayed / selected students present for a specific class day
  const handleMarkAllPresentForDay = (dayId: string) => {
    const targetStudents = selectedStudentNames.length > 0
      ? filteredAndSortedStudents.filter(s => selectedStudentNames.includes(s.name))
      : filteredAndSortedStudents;

    targetStudents.forEach(student => {
      const currentStatus = student.attendanceByDay[dayId];
      if (!currentStatus?.present) {
        handleToggleStudentAttendance(student.name, dayId, 'present');
      }
    });
  };

  // Keyboard shortcuts for rapid faculty attendance grading
  React.useEffect(() => {
    if (appUser?.role === 'student') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input, textarea or select
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const activeDay = liveCheckinDayId || (effectiveClassDays.length > 0 ? effectiveClassDays[effectiveClassDays.length - 1].id : null);
      if (!activeDay) return;

      if ((e.key === 'p' || e.key === 'P') && selectedStudentNames.length > 0) {
        e.preventDefault();
        selectedStudentNames.forEach(name => {
          handleToggleStudentAttendance(name, activeDay, 'present');
        });
      } else if ((e.key === 'a' || e.key === 'A') && selectedStudentNames.length > 0) {
        e.preventDefault();
        selectedStudentNames.forEach(name => {
          handleToggleStudentAttendance(name, activeDay, 'absent');
        });
      } else if ((e.key === 'e' || e.key === 'E') && selectedStudentNames.length > 0) {
        e.preventDefault();
        selectedStudentNames.forEach(name => {
          handleToggleStudentAttendance(name, activeDay, 'excused');
        });
      } else if (e.key === 'Escape' && selectedStudentNames.length > 0) {
        e.preventDefault();
        clearBatchSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appUser, selectedStudentNames, liveCheckinDayId, effectiveClassDays, handleToggleStudentAttendance, clearBatchSelection]);

  return (
    <Fragment>
      {appUser?.role === 'student' ? (
        <StudentAttendancePortal
          student={currentStudentPortalData}
          classDays={classDays}
          rubricScores={rubricScores}
          onUpdateStudentPhoto={onUpdateStudentPhoto}
          onRequestTranscript={onRequestTranscript}
          onRequestCertificate={onRequestCertificate}
          atRiskThreshold={atRiskThreshold}
          satisfactoryThreshold={satisfactoryThreshold}
        />
      ) : (records.length > 0 || classDays.length > 0 || uniqueStudents.length > 0) ? (
        <>
          {/* Toolbar: Search, Filter, Date Range, View Mode & Settings */}
          {/* Sticky Search Header & Mobile Quick Filter Chips Toolbar */}
          <div className="sticky top-0 z-20 p-2.5 sm:p-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col gap-2.5 flex-shrink-0 shadow-2xs">
            {/* Search Bar & Primary Actions Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[180px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Secondary Controls: Date Range, Modules, Sorting & View Modes */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                {/* Date Range Filter */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                  <select
                    value={dateRangeFilter}
                    onChange={(e: any) => setDateRangeFilter(e.target.value)}
                    className="bg-transparent focus:outline-none font-bold text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="all">All Dates</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="month">This Month</option>
                  </select>
                </div>

                {/* Academic Module Filter */}
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl px-2 py-1 text-xs text-amber-900 dark:text-amber-200">
                  <Layers className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <select
                    value={selectedModule}
                    onChange={(e: any) => setSelectedModule(e.target.value)}
                    className="bg-transparent focus:outline-none font-bold text-xs text-amber-900 dark:text-amber-200 cursor-pointer"
                  >
                    <option value="all">All Modules</option>
                    <option value="m1">Module 1</option>
                    <option value="m2">Module 2</option>
                    <option value="m3">Module 3</option>
                  </select>
                </div>

                {/* Sorting */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-transparent focus:outline-none font-bold text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="name_asc">Name (A → Z)</option>
                    <option value="name_desc">Name (Z → A)</option>
                    <option value="last_name_asc">Last Name (A → Z)</option>
                    <option value="last_name_desc">Last Name (Z → A)</option>
                    <option value="rate_desc">Attendance (High → Low)</option>
                    <option value="rate_asc">Attendance (Low → High)</option>
                    <option value="score_desc">Avg Score (High → Low)</option>
                    <option value="score_asc">Avg Score (Low → High)</option>
                  </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                  <button
                    onClick={() => setViewMode('matrix')}
                    className={`p-1 rounded-lg transition-all cursor-pointer ${viewMode === 'matrix' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Visual Attendance Matrix (Grid)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`p-1 rounded-lg transition-all cursor-pointer ${viewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Student Profile Cards View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dense / Comfortable View Toggle */}
                <div className="flex bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 hidden md:flex">
                  <button
                    onClick={() => setDensityMode('comfortable')}
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${densityMode === 'comfortable' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Comfortable spacing"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span className="text-[10px]">Comfortable</span>
                  </button>
                  <button
                    onClick={() => setDensityMode('dense')}
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${densityMode === 'dense' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                    title="Dense compact matrix view"
                  >
                    <Minimize2 className="w-3 h-3" />
                    <span className="text-[10px]">Dense</span>
                  </button>
                </div>

                {/* Add Class Day & Manage Class Days Action Buttons */}
                {(appUser?.role as string) !== 'student' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowSpeedCheckIn(true)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                      title="Rapid-fire single-tap live roll call"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
                      <span>Speed Check-In</span>
                    </button>
                    <button
                      onClick={() => handleAddClassDay()}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1 transition-all shadow-xs cursor-pointer active:opacity-80 shrink-0"
                      title="Add a new class session"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">+ Class Day</span>
                    </button>
                    <button
                      onClick={() => setShowClassDaysModal(true)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer shrink-0"
                      title="Manage class session titles"
                    >
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold">Manage Days ({classDays.length})</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile & Desktop Quick Scrollable Filter Chips + Fraud Protection Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-2 py-0.5">
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-xs font-bold max-w-full whitespace-nowrap">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-xl text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-extrabold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>All</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    {uniqueStudents.length}
                  </span>
                </button>

                <button
                  onClick={() => setStatusFilter('at_risk')}
                  className={`px-3 py-1 rounded-xl text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    statusFilter === 'at_risk'
                      ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100'
                  }`}
                >
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                  <span>At-Risk (&lt;{atRiskThreshold}%)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                    {uniqueStudents.filter(s => s.rate < atRiskThreshold).length}
                  </span>
                </button>

                <button
                  onClick={() => setStatusFilter('perfect')}
                  className={`px-3 py-1 rounded-xl text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    statusFilter === 'perfect'
                      ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Satisfactory (&ge;{satisfactoryThreshold}%)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                    {uniqueStudents.filter(s => s.rate >= satisfactoryThreshold).length}
                  </span>
                </button>

                <button
                  onClick={() => setStatusFilter('unpaid')}
                  className={`px-3 py-1 rounded-xl text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    statusFilter === 'unpaid'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs font-extrabold'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100'
                  }`}
                >
                  <DollarSign className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Unpaid Tuition</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                    {uniqueStudents.filter(s => getStudentPaymentDetails(s.name).hasOutstanding).length}
                  </span>
                </button>

                <button
                  onClick={() => setStatusFilter('honor_roll')}
                  className={`px-3 py-1 rounded-xl text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    statusFilter === 'honor_roll'
                      ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                      : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100'
                  }`}
                >
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>100% Honor Roll</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                    {uniqueStudents.filter(s => s.rate >= 100 || (s.avgScore !== null && s.avgScore >= 85)).length}
                  </span>
                </button>

                <button
                  onClick={() => setStatusFilter('fifty_percent')}
                  className={`px-3 py-1 rounded-xl text-[11px] transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    statusFilter === 'fifty_percent'
                      ? 'bg-purple-700 text-white shadow-2xs font-extrabold'
                      : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100'
                  }`}
                >
                  <span>&le;50% Attendance</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                    {uniqueStudents.filter(s => s.rate <= 50).length}
                  </span>
                </button>
              </div>

              {/* Fraud Prevention Policy Notice Pill */}
              <div 
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-400 shrink-0"
                title="To prevent fraud and maintain audit integrity, attendance records can only be modified within 24 hours of initial capture. Afterwards, they become immutable permanent records."
              >
                <Lock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>24h Lock Active</span>
                <span className="text-slate-400">&bull;</span>
                <span className="font-normal text-slate-500">Fraud-Proof Audit Mode</span>
              </div>
            </div>
          </div>

          {/* Attendance Workspace View Mode */}
          {viewMode === 'cards' ? (
            /* Student Profile Cards Grid View */
            <div className="flex-1 overflow-auto custom-scrollbar p-4 bg-slate-50/50">
              {filteredAndSortedStudents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredAndSortedStudents.map((student, idx) => {
                      const studentKey = student.name.toLowerCase().trim();
                      const cardPhoto = studentPhotos[studentKey] || student.photoUrl;
                      const note = studentNotes[studentKey] || student.note;
                      const studentBadges = getStudentBadges(student);

                      return (
                        <motion.div
                          key={`att-card-${student.name || idx}-${idx}`}
                          layout
                          initial={{ opacity: 0, scale: 0.92, y: 12 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.88, y: -12 }}
                          whileHover={{ scale: 1.015, y: -2 }}
                          transition={{
                            layout: { type: 'spring', stiffness: 280, damping: 28, mass: 0.8 },
                            opacity: { duration: 0.2 },
                            scale: { duration: 0.2 },
                            y: { duration: 0.2 }
                          }}
                          onClick={() => setSelectedStudent(student)}
                          className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {cardPhoto ? (
                                  <img
                                    src={cardPhoto}
                                    alt={student.name}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 font-black text-slate-700 text-xs flex items-center justify-center flex-shrink-0">
                                    {student.name.charAt(0)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{student.name}</h4>
                                  <p className="text-[10px] text-slate-400">Attended {student.attended} of {effectiveClassDays.length} sessions</p>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex-shrink-0 ${
                                student.rate >= satisfactoryThreshold ? 'bg-emerald-100 text-emerald-800' : student.rate >= atRiskThreshold ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800 font-extrabold'
                              }`}>
                                {Math.round(student.rate)}%
                              </span>
                            </div>

                            {/* Student Badges / Milestones */}
                            {studentBadges.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {studentBadges.map((b, bIdx) => (
                                  <span key={`badge-${b.id || bIdx}-${bIdx}`} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${b.bg}`}>
                                    {b.icon}
                                    <span>{b.label}</span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Attendance Progress Bar */}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden my-2">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  student.rate >= satisfactoryThreshold ? 'bg-emerald-500' : student.rate >= atRiskThreshold ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, student.rate))}%` }}
                              />
                            </div>

                            {/* Note preview if available */}
                            {note && (
                              <div className="mt-2 p-1.5 bg-indigo-50/60 border border-indigo-100 rounded text-[10px] text-indigo-900 line-clamp-2 italic">
                                "{note}"
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                            <span>View Breakdown & Remarks</span>
                            <span>&rarr;</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <EmptyState
                  title="No students found"
                  description="No students match your current search or filter criteria."
                />
              )}
            </div>
          ) : (
            /* Attendance Matrix View Container */
            <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">

              {/* Mobile Attendance Matrix Card Format (< 768px / md:hidden) */}
              <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
                {filteredAndSortedStudents.length > 0 ? (
                  <AnimatePresence mode="popLayout">
                    {filteredAndSortedStudents.map((student, idx) => (
                      <motion.div
                        key={`att-swipe-${student.name || idx}-${idx}`}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                        transition={{
                          layout: { type: 'spring', stiffness: 280, damping: 28, mass: 0.8 },
                          opacity: { duration: 0.2 },
                          scale: { duration: 0.2 },
                          y: { duration: 0.2 }
                        }}
                      >
                        <SwipeableAttendanceCard
                          student={student}
                          effectiveClassDays={effectiveClassDays}
                          activeDayId={liveCheckinDayId || (effectiveClassDays.length > 0 ? effectiveClassDays[effectiveClassDays.length - 1].id : '')}
                          studentPhotos={studentPhotos}
                          studentNotes={studentNotes}
                          excusedAbsences={excusedAbsences}
                          isSelected={selectedStudentNames.includes(student.name)}
                          satisfactoryThreshold={satisfactoryThreshold}
                          atRiskThreshold={atRiskThreshold}
                          studentBadges={getStudentBadges(student)}
                          onToggleAttendance={handleToggleStudentAttendance}
                          onSelectStudent={setSelectedStudent}
                          onToggleSelectStudent={toggleSelectStudent}
                          appRole={appUser?.role}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <EmptyState
                    title="No students found"
                    description="No students match your current search or filter criteria."
                  />
                )}
              </div>

              {/* Desktop Attendance Matrix Table (>= 768px / hidden md:block) */}
              <div className="hidden md:block flex-1 overflow-auto custom-scrollbar relative">
                <table className="w-full text-left border-collapse min-w-max">
                  {/* Table Sticky Header */}
                  <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-sm border-b border-slate-200 shadow-xs">
                    <tr>
                      <th className={`sticky left-0 z-30 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 ${densityMode === 'dense' ? 'p-2 text-[11px]' : 'p-3 text-xs'} font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider w-64 min-w-[256px] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.5)]`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedStudentNames.length > 0 && selectedStudentNames.length >= filteredAndSortedStudents.length}
                              onChange={handleSelectAllDisplayed}
                              className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
                              title="Select / Deselect all displayed students for batch operations"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSortBy((prev: any) => prev === 'name_asc' ? 'name_desc' : 'name_asc');
                              }}
                              className="flex items-center gap-1.5 cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase font-black text-slate-700 dark:text-slate-200 tracking-wider group/sort"
                              title="Click to toggle sorting student names in Ascending (A-Z) or Descending (Z-A) order"
                            >
                              <span>Student Name</span>
                              {sortBy === 'name_asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
                              ) : sortBy === 'name_desc' ? (
                                <ArrowDown className="w-3.5 h-3.5 text-indigo-600 stroke-[2.5]" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 group-hover/sort:opacity-100" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400 normal-case">({filteredAndSortedStudents.length} shown)</span>
                        </div>
                      </th>

                      {effectiveClassDays.map(day => {
                        const stats = classDayStats[day.id] || { count: 0, percentage: 0 };
                        return (
                          <th
                            key={day.id}
                            className={`${densityMode === 'dense' ? 'p-2' : 'p-3'} border-r border-slate-200 text-center min-w-[110px] max-w-[150px] flex-1 hover:bg-slate-200/50 transition-colors group/th`}
                            title={`Sheet: ${day.name}\nPresent: ${stats.count} students (${Math.round(stats.percentage)}%)\nClick pencil to rename title`}
                          >
                            <div className="flex flex-col items-center justify-center">
                              <div className="flex items-center gap-1 justify-center max-w-[135px]">
                                <span className={`${densityMode === 'dense' ? 'text-[11px]' : 'text-xs'} font-extrabold text-slate-800 truncate`} title={day.name}>
                                  {day.name}
                                </span>
                                {(appUser?.role as string) !== 'student' && (
                                  <div className="flex items-center gap-0.5 opacity-80 group-hover/th:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newName = prompt('Rename Class Day Title:', day.name);
                                        if (newName && newName.trim() !== '') {
                                          handleEditClassDayTitle(day.id, newName.trim());
                                        }
                                      }}
                                      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-indigo-600 transition-all cursor-pointer flex-shrink-0"
                                      title="Rename class day title"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearClassDayRecords(day.id);
                                      }}
                                      className="p-1 hover:bg-amber-100 rounded text-slate-400 hover:text-amber-600 transition-all cursor-pointer flex-shrink-0"
                                      title="Clear all attendance records for this day"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClassDay(day.id);
                                      }}
                                      className="p-1 hover:bg-rose-100 rounded text-slate-400 hover:text-rose-600 transition-all cursor-pointer flex-shrink-0"
                                      title="Delete this class session completely"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="mt-1 flex items-center justify-center gap-1 flex-wrap">
                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                  <span>{stats.count}/{uniqueStudents.length}</span>
                                  <span className="text-emerald-600 dark:text-emerald-400">({Math.round(stats.percentage)}%)</span>
                                </div>
                                {(appUser?.role as string) !== 'student' && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkAllPresentForDay(day.id);
                                      }}
                                      className="p-0.5 px-1.5 text-[9px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 rounded border border-emerald-300 dark:border-emerald-800 flex items-center gap-0.5 cursor-pointer shadow-2xs font-extrabold"
                                      title={`Mark all ${selectedStudentNames.length > 0 ? `${selectedStudentNames.length} selected` : 'displayed'} students present for "${day.name}"`}
                                    >
                                      <CheckCheck className="w-2.5 h-2.5" />
                                      <span className="text-[8px] uppercase">All Present</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        alert(`Admin Quick Override: Unlocked 24h attendance editing window for session "${day.name}". Records can now be modified.`);
                                      }}
                                      className="p-0.5 px-1.5 text-[9px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-0.5 cursor-pointer shadow-2xs"
                                      title="Admin Quick Override: Click to unlock 24h editing window for this session"
                                    >
                                      <Lock className="w-2.5 h-2.5" />
                                      <span className="font-extrabold text-[8px] uppercase">Unlock</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                        );
                      })}

                      <th className={`${densityMode === 'dense' ? 'p-2 text-[11px]' : 'p-3 text-xs'} border-r border-slate-200 text-center font-black uppercase text-emerald-800 tracking-wider w-28 min-w-[112px] bg-emerald-50/60`}>
                        Attendance Rate
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-100">
                    {filteredAndSortedStudents.length > 0 ? (
                      filteredAndSortedStudents.map((student, idx) => {
                        const studentKey = student.name.toLowerCase().trim();
                        const isExcusedMap = excusedAbsences[studentKey] || {};
                        const studentBadges = getStudentBadges(student);

                        return (
                          <tr
                            key={idx}
                            onClick={() => setSelectedStudent(student)}
                            className="group hover:bg-indigo-50/40 transition-colors cursor-pointer"
                          >
                            {/* Student Name Sticky Column */}
                            <td className={`sticky left-0 z-10 ${densityMode === 'dense' ? 'py-1.5 px-2 text-[11px]' : 'p-3 text-xs'} border-r border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 group-hover:bg-indigo-50/90 dark:group-hover:bg-slate-800/90 transition-colors shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.5)] w-64 min-w-[256px] truncate ${student.rate < atRiskThreshold ? 'text-rose-700 dark:text-rose-400' : ''}`} title="Click to view student detail">
                              <div className="flex items-center justify-between gap-1 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={selectedStudentNames.includes(student.name)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleSelectStudent(student.name);
                                    }}
                                    className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer flex-shrink-0"
                                  />
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${student.rate >= satisfactoryThreshold ? 'bg-emerald-500' : student.rate >= atRiskThreshold ? 'bg-amber-400' : 'bg-rose-500'}`} />
                                  <span className="truncate">{student.name}</span>
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {studentBadges.map((b, bIdx) => (
                                    <span key={`row-badge-${b.id || bIdx}-${bIdx}`} className={`inline-flex items-center p-0.5 rounded border ${b.bg}`} title={b.label}>
                                      {b.icon}
                                    </span>
                                  ))}
                                  {student.note && (
                                    <span className="text-indigo-500 bg-indigo-50 p-1 rounded" title={`Note: ${student.note}`}>
                                      <PenSquare className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Attendance Status Per Sheet/Day */}
                            {effectiveClassDays.map(day => {
                              const attendance = student.attendanceByDay[day.id];
                              const isPresent = attendance?.present;
                              const isExcused = !isPresent && !!isExcusedMap[day.id];
                              const lockInfo = getAttendanceLockInfo(attendance, day);
                              const isLocked = lockInfo.isLocked;

                              return (
                                <td
                                  key={day.id}
                                  className={`${densityMode === 'dense' ? 'py-1 px-1.5' : 'p-3'} border-r border-slate-100 text-center min-w-[110px] max-w-[150px] ${
                                    isLocked ? 'bg-slate-50/40' : ''
                                  }`}
                                  onClick={(e) => {
                                    if (appUser?.role === 'student') return;
                                    e.stopPropagation();
                                    handleToggleStudentAttendance(
                                      student.name,
                                      day.id,
                                      isPresent ? 'excused' : isExcused ? 'absent' : 'present'
                                    );
                                  }}
                                  title={
                                    appUser?.role === 'student'
                                      ? undefined
                                      : isLocked
                                      ? `🔒 Record Locked: Captured >24 hours ago. Cannot be modified.`
                                      : `⏱ Editable (${lockInfo.hoursRemaining}h left in 24h window). Click to toggle attendance.`
                                  }
                                >
                                  {isPresent ? (
                                    <div className={`inline-flex items-center gap-1 ${densityMode === 'dense' ? 'px-2 py-0.2 text-[9px]' : 'px-2.5 py-0.5 text-[10px]'} rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-bold ${
                                      isLocked ? 'opacity-90 cursor-not-allowed' : 'hover:bg-emerald-100 cursor-pointer'
                                    } transition-colors`}>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span>Present</span>
                                      {isLocked && <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-0.5" />}
                                    </div>
                                  ) : isExcused ? (
                                    <div className={`inline-flex items-center gap-1 ${densityMode === 'dense' ? 'px-2 py-0.2 text-[9px]' : 'px-2.5 py-0.5 text-[10px]'} rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold ${
                                      isLocked ? 'opacity-90 cursor-not-allowed' : 'hover:bg-amber-100 cursor-pointer'
                                    } transition-colors`}>
                                      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                                      <span>Excused</span>
                                      {isLocked && <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-0.5" />}
                                    </div>
                                  ) : (
                                    <div className={`inline-flex items-center gap-1 ${densityMode === 'dense' ? 'px-2 py-0.2 text-[9px]' : 'px-2.5 py-0.5 text-[10px]'} rounded-full bg-rose-50/60 border border-rose-200/50 text-rose-400 font-medium ${
                                      isLocked ? 'opacity-90 cursor-not-allowed' : 'hover:bg-rose-100 cursor-pointer'
                                    } transition-colors`}>
                                      <XCircle className="w-3 h-3 text-rose-300 shrink-0" />
                                      <span>Absent</span>
                                      {isLocked && <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-0.5" />}
                                    </div>
                                  )}
                                </td>
                              );
                            })}

                            {/* Attendance Rate Badge */}
                            <td className={`${densityMode === 'dense' ? 'py-1.5 px-2 text-[10px]' : 'p-3 text-xs'} border-r border-slate-100 text-center font-mono font-bold w-28 min-w-[112px] bg-slate-50/50`}>
                              <span className={`inline-block px-2.5 py-0.5 rounded ${
                                student.rate >= satisfactoryThreshold
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : student.rate >= atRiskThreshold
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800 font-extrabold'
                              }`}>
                                {Math.round(student.rate)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={effectiveClassDays.length + 2} className="p-8 text-center text-slate-400 text-xs">
                          No students found matching your search or filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table Footer Legend */}
          <div className="p-2.5 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-slate-600">Legend:</span>
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Present
              </span>
              <span className="flex items-center gap-1 text-amber-700 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Excused
              </span>
              <span className="flex items-center gap-1 text-rose-600 font-medium">
                <XCircle className="w-3.5 h-3.5 text-rose-400" /> Absent
              </span>
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <Lock className="w-3 h-3 text-slate-400" /> Locked Record (&gt;24h)
              </span>
            </div>
            <div className="text-slate-400 font-medium">
              Showing <strong className="text-slate-700">{filteredAndSortedStudents.length}</strong> of <strong className="text-slate-700">{uniqueStudents.length}</strong> total evaluated students
            </div>
          </div>

          {/* Batch Selection Faculty Action Bar */}
          {selectedStudentNames.length > 0 && (
            <div className="p-3 bg-slate-900 text-white border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xl animate-slideUp z-30">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-full shadow-xs">
                  {selectedStudentNames.length} Student{selectedStudentNames.length > 1 ? 's' : ''} Selected
                </span>
                <button
                  onClick={handleSelectAllAtRisk}
                  className="text-xs text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer"
                >
                  Select All At-Risk (&lt;{atRiskThreshold}%)
                </button>
                <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 text-slate-300 rounded-lg text-[10px] font-mono border border-slate-700">
                  <span className="text-slate-400 font-bold uppercase">Keys:</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-emerald-300 font-black text-[9px]">P</kbd>
                  <span>Present</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-rose-300 font-black text-[9px]">A</kbd>
                  <span>Absent</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-amber-300 font-black text-[9px]">E</kbd>
                  <span>Excused</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-200 font-black text-[9px]">Esc</kbd>
                  <span>Deselect</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Quick Batch Marking Controls for Latest/Active Session */}
                {effectiveClassDays.length > 0 && (
                  <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-400 px-2">
                      Mark Day: {(effectiveClassDays[effectiveClassDays.length - 1]?.name || 'Active Day').substring(0, 10)}
                    </span>
                    <button
                      onClick={() => {
                        const targetDay = effectiveClassDays[effectiveClassDays.length - 1].id;
                        selectedStudentNames.forEach(name => {
                          handleToggleStudentAttendance(name, targetDay, 'present');
                        });
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 min-h-[36px]"
                      title="Mark selected students Present for active session"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Present
                    </button>
                    <button
                      onClick={() => {
                        const targetDay = effectiveClassDays[effectiveClassDays.length - 1].id;
                        selectedStudentNames.forEach(name => {
                          handleToggleStudentAttendance(name, targetDay, 'excused');
                        });
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 min-h-[36px]"
                      title="Mark selected students Excused for active session"
                    >
                      <AlertCircle className="w-3.5 h-3.5" /> Excused
                    </button>
                    <button
                      onClick={() => {
                        const targetDay = effectiveClassDays[effectiveClassDays.length - 1].id;
                        selectedStudentNames.forEach(name => {
                          handleToggleStudentAttendance(name, targetDay, 'absent');
                        });
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 min-h-[36px]"
                      title="Mark selected students Absent for active session"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Absent
                    </button>
                    <button
                      onClick={() => {
                        const targetDay = effectiveClassDays[effectiveClassDays.length - 1].id;
                        const targetList = selectedStudentNames.length > 0 ? selectedStudentNames : filteredAndSortedStudents.map(s => s.name);
                        targetList.forEach(name => {
                          const student = filteredAndSortedStudents.find(s => s.name === name);
                          const existing = student?.attendanceByDay[targetDay];
                          if (!existing || !existing.present) {
                            handleToggleStudentAttendance(name, targetDay, 'present');
                          }
                        });
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 min-h-[36px]"
                      title="Mark all remaining unmarked/absent students as Present"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-indigo-200" /> Mark Unmarked Present
                    </button>
                  </div>
                )}

                {/* Export Session Roster */}
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer border border-slate-700 min-h-[36px]"
                  title="Export active session roster to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" /> Export CSV
                </button>

                {/* Send WhatsApp/Email Attendance Reminder */}
                <button
                  onClick={() => {
                    const atRiskList = selectedStudentNames.filter(name => {
                      const st = filteredAndSortedStudents.find(s => s.name === name);
                      return st && st.rate < atRiskThreshold;
                    });
                    const targetNames = atRiskList.length > 0 ? atRiskList : selectedStudentNames;
                    const text = encodeURIComponent(`Shalom! School of Ministry Attendance Notice for: ${targetNames.join(', ')}. Please review your student attendance portal regarding recent session attendance.`);
                    window.open(`mailto:?subject=HTEIM%20School%20of%20Ministry%20Attendance%20Notice&body=${text}`, '_blank');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[36px]"
                  title="Send WhatsApp or Email attendance reminder to selected students"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Notice
                </button>

                <button
                  onClick={() => {
                    if (window.confirm(`Clear all attendance records for the ${selectedStudentNames.length} selected student(s)?`)) {
                      selectedStudentNames.forEach(name => {
                        const key = name.toLowerCase().trim();
                        setRecords(prev => prev.filter(r => (r.studentName || r.name || '').toLowerCase().trim() !== key));
                        setExcusedAbsences(prev => {
                          const copy = { ...prev };
                          delete copy[key];
                          return copy;
                        });
                      });
                      logActivity({
                        actor: appUser?.name || 'Admin',
                        role: appUser?.role === 'student' ? 'student' : 'admin',
                        actionCategory: 'Attendance Override',
                        actionTitle: 'Batch Records Cleared',
                        details: `Cleared attendance records for ${selectedStudentNames.length} selected students.`
                      });
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition-all cursor-pointer border border-slate-700 min-h-[36px]"
                  title="Clear attendance history for all selected students"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear ({selectedStudentNames.length})
                </button>

                <button
                  onClick={() => setShowBatchEmailModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs min-h-[36px]"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Batch Email
                </button>

                <button
                  onClick={clearBatchSelection}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-all cursor-pointer border border-slate-700 min-h-[36px]"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center animate-fadeIn">
          <EmptyState
            title="No attendance data loaded"
            description="Load a CSV file or connect a Google Sheet to start tracking attendance."
            action={
              <button
                onClick={handleLoadDemo}
                disabled={isLoading}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Load Demo Data
              </button>
            }
          />
        </div>
      )}

      {/* Speed Check-In Rapid-Fire Roll Call Modal */}
      <SpeedCheckInModal
        isOpen={showSpeedCheckIn}
        onClose={() => setShowSpeedCheckIn(false)}
        students={filteredAndSortedStudents.length > 0 ? filteredAndSortedStudents : uniqueStudents}
        classDays={effectiveClassDays.length > 0 ? effectiveClassDays : classDays}
        activeDayId={liveCheckinDayId || (effectiveClassDays.length > 0 ? effectiveClassDays[effectiveClassDays.length - 1].id : '')}
        onChangeActiveDayId={setLiveCheckinDayId}
        excusedAbsences={excusedAbsences}
        studentPhotos={studentPhotos}
        studentNotes={studentNotes}
        onToggleAttendance={handleToggleStudentAttendance}
        atRiskThreshold={atRiskThreshold}
        satisfactoryThreshold={satisfactoryThreshold}
      />

    </Fragment>
  );
}

export default AttendanceTab;
export { AttendanceTab as AttendanceWorkspace };
