import React, { useState } from 'react';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import { 
  User, Mail, Phone, Calendar, BookOpen, GraduationCap, Award, DollarSign, 
  FileText, Clock, AlertTriangle, CheckCircle2, XCircle, ShieldCheck, Download, 
  Plus, MessageSquare, MapPin, Send, History, Sparkles, Filter, Check, Eye, Lock,
  Printer, ArrowRight, Layers, FileCheck, HelpCircle
} from 'lucide-react';
import { 
  StudentSummary, PaymentRecord, AssignmentSubmission, CustomAssignment, 
  StudentTimelineEvent, StudentNote, ACADEMIC_LEVELS, GraduationChecklist,
  CertificateRecord, StudentEnrollmentStatus
} from '../types';

interface Student360ProfileModalProps {
  student: StudentSummary;
  onClose: () => void;
  payments?: PaymentRecord[];
  submissions?: AssignmentSubmission[];
  assignments?: CustomAssignment[];
  isStaff?: boolean;
  onAddNote?: (studentName: string, noteText: string, isPrivate: boolean) => void;
  onIssueCertificate?: (cert: CertificateRecord) => void;
  onUpdateEnrollmentStatus?: (studentName: string, status: StudentEnrollmentStatus, details?: { reason?: string; date?: string }) => void;
}

export const Student360ProfileModal: React.FC<Student360ProfileModalProps> = ({
  student,
  onClose,
  payments = [],
  submissions = [],
  assignments = [],
  isStaff = true,
  onAddNote,
  onIssueCertificate,
  onUpdateEnrollmentStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'academic' | 'attendance' | 'assignments' | 'finance' | 'notes' | 'certificate'>('academic');
  
  // Local notes state
  const [notes, setNotes] = useState<StudentNote[]>([
    {
      id: 'note-1',
      studentName: student?.name || 'Student',
      author: 'Apostolic Ministry Dean',
      authorRole: 'admin',
      text: 'Demonstrates exceptional prophetic discernment during group exegesis labs.',
      createdAt: '2026-08-01 10:15',
      isPrivate: true
    },
    {
      id: 'note-2',
      studentName: student?.name || 'Student',
      author: 'Apostle Dr. H.E. Alexander',
      authorRole: 'teacher',
      text: 'Submitted revised Hermeneutics essay with thorough Scripture references.',
      createdAt: '2026-08-05 14:30',
      isPrivate: false
    }
  ]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(true);

  // Certificate printing view state
  const [showCertPrintModal, setShowCertPrintModal] = useState(false);

  // Student specific payments
  const safePayments = payments || [];
  const safeSubmissions = submissions || [];
  const safeAssignments = assignments || [];
  const studentNameLower = (student?.name || '').toLowerCase().trim();

  const studentPayments = safePayments.filter(p => p && p.studentName && (p?.studentName || '').toLowerCase().trim() === studentNameLower);
  const totalTuition = studentPayments.reduce((acc, p) => acc + (p.totalTuition || 0), 1200);
  const totalPaid = studentPayments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);
  const balance = Math.max(0, totalTuition - totalPaid);

  // Student specific submissions
  const studentSubmissions = safeSubmissions.filter(s => s && s.studentName && (s?.studentName || '').toLowerCase().trim() === studentNameLower);

  // Enrollment status state
  const [currentStatus, setCurrentStatus] = useState<StudentEnrollmentStatus>(
    student.enrollmentStatus || (student.isDroppedOut ? 'dropped_out' : 'active')
  );
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showDropoutModal, setShowDropoutModal] = useState(false);
  const [dropoutReasonInput, setDropoutReasonInput] = useState(student.dropoutReason || '');

  const isDroppedOut = currentStatus === 'dropped_out' || currentStatus === 'withdrawn';

  const handleSelectStatus = (newStatus: StudentEnrollmentStatus) => {
    if (newStatus === 'dropped_out' || newStatus === 'withdrawn') {
      setShowDropoutModal(true);
      setShowStatusMenu(false);
      return;
    }
    setCurrentStatus(newStatus);
    setShowStatusMenu(false);
    onUpdateEnrollmentStatus?.(student.name, newStatus);
  };

  const handleConfirmDropout = () => {
    setCurrentStatus('dropped_out');
    setShowDropoutModal(false);
    onUpdateEnrollmentStatus?.(student.name, 'dropped_out', {
      reason: dropoutReasonInput,
      date: new Date().toISOString().split('T')[0],
    });
  };

  // Academic level
  const currentLevel = ACADEMIC_LEVELS.find(l => l.id === student?.levelId) || ACADEMIC_LEVELS[0];

  // At-Risk & Readiness status
  const attRate = student?.rate ?? 80;
  const avgScore = student?.avgScore ?? null;
  const isAtRisk = !isDroppedOut && (attRate < 75 || (avgScore !== null && avgScore < 75) || balance > 0);
  
  let readinessStatus: 'On Track' | 'Needs Attention' | 'Critical' | 'Dropped Out' = isDroppedOut ? 'Dropped Out' : 'On Track';
  if (!isDroppedOut) {
    if (attRate <= 50 || (avgScore !== null && avgScore < 60)) {
      readinessStatus = 'Critical';
    } else if (attRiskCheck(attRate, avgScore, balance)) {
      readinessStatus = 'Needs Attention';
    }
  }

  function attRiskCheck(rate: number, score: number | null, bal: number) {
    return rate < 75 || (score !== null && score < 75) || bal > 300;
  }

  // Calculate 6 Module Completion Percentages
  const moduleCompletions = [
    { name: 'Module 1: Hermeneutics & Word', code: 'MOD-101', pct: attRate >= 75 ? 100 : 80, status: 'Completed' },
    { name: 'Module 2: Soul Winning & Evangelism', code: 'MOD-201', pct: attRate >= 75 ? 100 : 70, status: 'Completed' },
    { name: 'Module 3: Ministerial Ethics & Integrity', code: 'MOD-301', pct: Math.min(100, Math.round(attRate * 1.1)), status: 'In Progress' },
    { name: 'Module 4: Apostolic Governance & Five-Fold', code: 'MOD-401', pct: avgScore !== null ? Math.min(100, Math.round(avgScore)) : 0, status: avgScore !== null ? 'In Progress' : 'Upcoming' },
    { name: 'Module 5: Prophetic Ministry & Discernment', code: 'MOD-501', pct: attRate >= 80 ? 60 : 30, status: 'Upcoming' },
    { name: 'Module 6: School of Pastors & Teachers', code: 'MOD-601', pct: 0, status: 'Upcoming' },
  ];
  const overallModuleProgress = Math.round(moduleCompletions.reduce((acc, m) => acc + m.pct, 0) / 6);

  // Timeline events mock
  const timelineEvents: StudentTimelineEvent[] = [
    {
      id: 'evt-1',
      studentName: student.name,
      date: '2026-08-06 19:45',
      title: 'Graded Assignment Received',
      type: 'feedback',
      description: 'Hermeneutics Exegesis Paper graded: 92/100 by Apostle Dr. H.E. Alexander.',
      badgeColor: 'bg-emerald-500'
    },
    {
      id: 'evt-2',
      studentName: student.name,
      date: '2026-08-04 11:20',
      title: 'Tuition Installment Payment',
      type: 'payment',
      description: 'Paid $300.00 via Credit Card. Receipt #INV-HTEIM-2026-042 issued.',
      badgeColor: 'bg-indigo-500'
    },
    {
      id: 'evt-3',
      studentName: student.name,
      date: '2026-08-01 19:00',
      title: 'PIN Check-in Verified',
      type: 'checkin',
      description: 'Verified classroom attendance via time-expiring PIN #8841.',
      badgeColor: 'bg-amber-500'
    },
    {
      id: 'evt-4',
      studentName: student.name,
      date: '2026-07-28 18:30',
      title: 'Excused Absence Request Approved',
      type: 'excused_request',
      description: 'Ministry outreach absence approved by Faculty Dean.',
      badgeColor: 'bg-blue-500'
    }
  ];

  // Graduation Checklist
  const graduationChecklist: GraduationChecklist = {
    studentName: student.name,
    attendanceRate: attRate,
    meetsAttendance: attRate >= 75,
    averageGrade: avgScore ?? undefined,
    meetsGrade: avgScore !== null && avgScore >= 75,
    assignmentsCompleted: studentSubmissions.filter(s => s.status === 'Graded').length,
    totalAssignments: assignments.length || 4,
    meetsAssignments: true,
    tuitionPaid: balance === 0,
    isReadyForGraduation: attRate >= 75 && avgScore !== null && avgScore >= 75 && balance === 0
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const newNote: StudentNote = {
      id: `note-${Date.now()}`,
      studentName: student.name,
      author: 'Current Staff User',
      authorRole: 'admin',
      text: newNoteText.trim(),
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      isPrivate: isPrivateNote
    };
    setNotes([newNote, ...notes]);
    if (onAddNote) onAddNote(student.name, newNoteText, isPrivateNote);
    setNewNoteText('');
  };

  const dialogRef = useAccessibleModal(true, onClose);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`360 Degree Academic & Financial Profile: ${student.name}`}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-5xl w-full my-auto shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        
        {/* 1. Profile Top Banner & Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 border-b border-indigo-500/30 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.name} className="w-16 h-16 rounded-xl object-cover ring-2 ring-amber-400/80 shadow-lg" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg uppercase">
                  {student.name.slice(0, 2)}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black font-syne tracking-tight text-white">
                    {student.name}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${currentLevel.badgeBg}`}>
                    {currentLevel.badge}
                  </span>

                  {/* Interactive Enrollment Status Selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowStatusMenu(prev => !prev)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all border ${
                        currentStatus === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30'
                          : currentStatus === 'dropped_out'
                          ? 'bg-rose-500/30 text-rose-200 border-rose-400/60 hover:bg-rose-500/40 shadow-sm'
                          : currentStatus === 'withdrawn'
                          ? 'bg-amber-500/30 text-amber-200 border-amber-400/60 hover:bg-amber-500/40'
                          : 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                      }`}
                      title="Click to update student enrollment status"
                    >
                      <span>
                        {currentStatus === 'dropped_out' ? '🔴 Dropped Out' : currentStatus === 'withdrawn' ? '🟡 Withdrawn' : currentStatus === 'graduated' ? '🎓 Graduated' : currentStatus === 'leave_of_absence' ? '🔵 Leave' : '🟢 Active'}
                      </span>
                      <span className="text-[9px] opacity-70">▾</span>
                    </button>

                    {showStatusMenu && (
                      <div className="absolute left-0 top-full mt-1.5 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 text-xs font-bold text-white divide-y divide-slate-800">
                        <button
                          type="button"
                          onClick={() => handleSelectStatus('active')}
                          className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-emerald-400 cursor-pointer"
                        >
                          <span>🟢 Active Enrollment</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectStatus('dropped_out')}
                          className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-rose-400 cursor-pointer"
                        >
                          <span>🔴 Mark Dropped Out</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectStatus('withdrawn')}
                          className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-amber-400 cursor-pointer"
                        >
                          <span>🟡 Mark Withdrawn</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectStatus('leave_of_absence')}
                          className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-sky-400 cursor-pointer"
                        >
                          <span>🔵 Leave of Absence</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectStatus('graduated')}
                          className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-indigo-300 cursor-pointer"
                        >
                          <span>🎓 Graduated</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    readinessStatus === 'On Track' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' :
                    readinessStatus === 'Needs Attention' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' :
                    'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                  }`}>
                    {readinessStatus}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    {student.email || `${(student.name || '').toLowerCase().replace(/\s+/g, '.')}@hteim.edu`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                    {student.phone || '(868) 555-0188'}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    {student.enrolledModule || 'Module 3: Ministerial Ethics'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="bg-slate-950/80 p-2.5 px-3.5 rounded-xl border border-white/10 text-center">
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Attendance</p>
                <p className={`text-base font-black ${isDroppedOut ? 'text-rose-400' : attRate >= 75 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {attRate}%
                </p>
                {isDroppedOut && <p className="text-[9px] text-rose-400 font-bold uppercase">Dropped</p>}
              </div>

              <div className="bg-slate-950/80 p-2.5 px-3.5 rounded-xl border border-white/10 text-center">
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Average Grade</p>
                <p className="text-base font-black text-amber-400">
                  {avgScore !== null ? `${avgScore}%` : 'Not Yet Graded'}
                </p>
                {isDroppedOut && <p className="text-[9px] text-amber-300 font-bold uppercase">Archived</p>}
              </div>

              <div className="bg-slate-950/80 p-2.5 px-3.5 rounded-xl border border-white/10 text-center">
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Tuition Balance</p>
                <p className={`text-base font-black ${balance === 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                  ${balance}
                </p>
                {isDroppedOut && <p className="text-[9px] text-slate-400 font-medium uppercase">Settlement</p>}
              </div>
            </div>
          </div>

          {/* Dropped Out Notice Banner */}
          {isDroppedOut && (
            <div className="mt-4 p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-200">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <span className="font-extrabold uppercase tracking-wider text-rose-300">
                    Candidate Enrollment Status: Dropped Out
                  </span>
                  <p className="text-[11px] text-rose-300/80 mt-0.5">
                    {student.dropoutReason ? `Reason: ${student.dropoutReason}` : 'Student has officially withdrawn/dropped out from the cohort.'} {student.dropoutDate ? `· Date: ${student.dropoutDate}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectStatus('active')}
                className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/50 rounded-lg font-bold text-[11px] cursor-pointer shrink-0 transition-colors"
              >
                Reactivate Student
              </button>
            </div>
          )}

          {/* Navigation Bar inside 360 Modal */}
          <div className="flex items-center gap-1 mt-5 pt-3 border-t border-white/10 overflow-x-auto no-scrollbar">
            {[
              { id: 'academic', label: 'Academic Progress', icon: GraduationCap },
              { id: 'timeline', label: '360° Timeline', icon: Clock },
              { id: 'attendance', label: 'Attendance & QR/PIN', icon: ShieldCheck },
              { id: 'assignments', label: 'Assignments & Rubrics', icon: FileCheck },
              { id: 'finance', label: 'Tuition & Billing', icon: DollarSign },
              { id: 'notes', label: 'Notes & Files', icon: MessageSquare },
              { id: 'certificate', label: 'Graduation & Certs', icon: Award },
            ].map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-amber-400 text-slate-950 shadow-md scale-102'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Modal Body Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50 dark:bg-slate-900/50">

          {/* TAB 1: ACADEMIC PROGRESS */}
          {activeTab === 'academic' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Overall Completion Bar */}
              <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white font-syne flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-amber-500" />
                      6 Core Curriculum Modules Completion Rate
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Progress calculated across Hermeneutics, Evangelism, Ethics, Apostolic Governance, Prophetic Ministry & Pastors School.
                    </p>
                  </div>
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{overallModuleProgress}%</span>
                </div>

                <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${overallModuleProgress}%` }}
                  />
                </div>
              </div>

              {/* Module-by-Module Progress Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {moduleCompletions.map((mod, idx) => (
                  <div key={idx} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[10px] rounded">
                        {mod.code}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        mod.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                        mod.status === 'In Progress' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {mod.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">{mod.name}</h4>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span>Module Progress</span>
                        <span>{mod.pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${mod.pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Academic Metrics Triad */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Attendance Benchmark</span>
                    <span className="text-emerald-600 font-extrabold">Min. 75% Target</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{attRate}%</span>
                    {attRate >= 75 ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-rose-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {attRate >= 75 ? 'Satisfies HTEIM School of Ministry 75% attendance rule.' : 'Warning: Below the 75% minimum attendance requirement.'}
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Scripture Quiz Average</span>
                    <span className="text-amber-600 font-extrabold">Pass = 75%+</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{avgScore !== null ? `${avgScore}%` : 'Not Yet Graded'}</span>
                    <Award className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Evaluated across all interactive scripture quizzes and exegesis assignments.
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Graduation Readiness</span>
                    <span className="text-indigo-600 font-extrabold">Status</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{readinessStatus}</span>
                    <Sparkles className="w-6 h-6 text-indigo-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {readinessStatus === 'On Track' ? 'Ready for Level 3 Diploma certification.' : 'Requires faculty review or attendance make-up session.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white font-syne flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  Student 360° Activity Event Timeline
                </h3>
                <span className="text-xs text-slate-500 font-bold">{timelineEvents.length} Events Logged</span>
              </div>

              <div className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-6">
                {timelineEvents.map((evt) => (
                  <div key={evt.id} className="relative group">
                    <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full ${evt.badgeColor || 'bg-indigo-500'} ring-4 ring-white dark:ring-slate-900`} />
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">{evt.title}</h4>
                        <span className="text-[10px] font-mono text-slate-400">{evt.date}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{evt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ATTENDANCE & PIN/QR */}
          {activeTab === 'attendance' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white font-syne">Attendance History & Audit</h3>
                  <p className="text-xs text-slate-500">Canonical tracking with 75% threshold enforcement and PIN check-in audit.</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{attRate}%</span>
                  <p className="text-[10px] text-slate-400 font-bold">Overall Rate</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Class Session / Day</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Verification Method</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
                    {Object.entries(student.attendanceByDay || {}).map(([dayId, rawRecord], idx) => {
                      const record = (rawRecord || {}) as { present?: boolean; timestamp?: string; score?: string };
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="p-3 font-bold text-slate-900 dark:text-white uppercase">{dayId}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              record.present ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            }`}>
                              {record.present ? 'PRESENT' : 'ABSENT'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">
                            {record.present ? 'PIN Check-In Verified' : 'No Check-In Recorded'}
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {record.timestamp || '2026-08-04 19:05'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ASSIGNMENTS & RUBRICS */}
          {activeTab === 'assignments' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white font-syne">Submitted Homework & Rubric Evaluations</h3>
                <span className="text-xs text-slate-500 font-bold">{studentSubmissions.length} Submissions</span>
              </div>

              {studentSubmissions.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                  <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No custom document submissions yet.</p>
                  <p className="text-[11px] text-slate-400">When student uploads homework, status changes from Draft to Submitted / Graded.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentSubmissions.map(sub => (
                    <div key={sub.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 font-black text-[10px] rounded uppercase">
                            Status: {sub.status}
                          </span>
                          <p className="text-xs font-black text-slate-900 dark:text-white mt-1">
                            {sub.studentFileName || 'Hermeneutics Essay Assignment'}
                          </p>
                        </div>
                        <span className="text-base font-black text-emerald-600">{sub.score ?? 90} / 100</span>
                      </div>

                      {sub.teacherFeedback && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                          <p className="font-extrabold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Instructor Written Rubric Feedback:
                          </p>
                          <p className="italic">"{sub.teacherFeedback}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TUITION & BILLING */}
          {activeTab === 'finance' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white font-syne">Tuition Statement & Payment Plan</h3>
                    <p className="text-xs text-slate-500">Plan: Monthly Installments ($300 / mo)</p>
                  </div>
                  <button
                    onClick={() => alert(`Downloading Official Statement PDF for ${student.name}`)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Statement PDF</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                    <p className="text-[10px] text-slate-400 uppercase font-black">Total Tuition</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">${totalTuition}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <p className="text-[10px] text-emerald-600 uppercase font-black">Total Paid</p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">${totalPaid}</p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                    <p className="text-[10px] text-amber-600 uppercase font-black">Current Balance</p>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-300">${balance}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: NOTES & PRIVATE STAFF LOG */}
          {activeTab === 'notes' && (
            <div className="space-y-4 animate-fadeIn">
              <form onSubmit={handleAddNoteSubmit} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white font-syne flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  Add Instructor / Pastoral Note
                </h3>

                <textarea
                  rows={2}
                  required
                  placeholder="Record observations regarding attendance, homework progress, or spiritual growth..."
                  value={newNoteText ?? ''}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400"
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300 font-bold">
                    <input 
                      type="checkbox"
                      checked={isPrivateNote}
                      onChange={(e) => setIsPrivateNote(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Private Staff Note (Visible to Admins/Teachers only)</span>
                  </label>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Note</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {notes.map(n => (
                  <div key={n.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">{n.author}</span>
                        {n.isPrivate && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 text-[9px] font-black rounded uppercase flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Private
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{n.createdAt}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: CERTIFICATE & GRADUATION READINESS */}
          {activeTab === 'certificate' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-indigo-500/10 border border-amber-400/30 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-6 h-6 text-amber-500" />
                    <h3 className="text-base font-black text-slate-900 dark:text-white font-syne">
                      Graduation Requirement Audit & Certificate Generator
                    </h3>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    graduationChecklist.isReadyForGraduation ? 'bg-emerald-500 text-white shadow-xs' : 'bg-amber-400 text-slate-950'
                  }`}>
                    {graduationChecklist.isReadyForGraduation ? 'Graduation Verified ✓' : 'Requirements Pending'}
                  </span>
                </div>

                {/* Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    graduationChecklist.meetsAttendance ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-900 dark:text-emerald-200' : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}>
                    <span className="font-bold">Attendance Standard (≥75%):</span>
                    <span className="font-black">{attRate}% {graduationChecklist.meetsAttendance ? '✓' : '✕'}</span>
                  </div>

                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    graduationChecklist.meetsGrade
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                      : avgScore === null
                        ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}>
                    <span className="font-bold">Scripture Grade Average (≥75%):</span>
                    <span className="font-black">{avgScore !== null ? `${avgScore}% ${graduationChecklist.meetsGrade ? '✓' : '✕'}` : 'Not Yet Graded'}</span>
                  </div>

                  <div className="p-3 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <span className="font-bold">Assignments Completed:</span>
                    <span className="font-black">{graduationChecklist.assignmentsCompleted} / {graduationChecklist.totalAssignments} ✓</span>
                  </div>

                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    graduationChecklist.tuitionPaid ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-900 dark:text-emerald-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    <span className="font-bold">Tuition Account Paid In Full:</span>
                    <span className="font-black">{graduationChecklist.tuitionPaid ? '$0 Balance ✓' : `$${balance} Pending`}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowCertPrintModal(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:from-amber-300 hover:to-amber-500 transition-all cursor-pointer flex items-center gap-2 active:opacity-80 border border-amber-200"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Generate & Print Certificate of Completion</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 3. Modal Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            HTEIM School of Ministry • Student 360° Profile Record
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Close Profile
          </button>
        </div>

      </div>

      {/* Dropout Confirmation Modal Dialog */}
      {showDropoutModal && (
        <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Mark Candidate as Dropped Out
                </h3>
                <p className="text-xs text-slate-500">
                  Update official enrollment status for {student.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Marking this student as dropped out will indicate their inactive status across attendance rosters, examination gradebooks, and academic reports.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Reason / Administrative Notes (Optional)
              </label>
              <textarea
                value={dropoutReasonInput}
                onChange={(e) => setDropoutReasonInput(e.target.value)}
                placeholder="e.g. Relocated out of district, Personal family leave, Withdrew week 8..."
                rows={3}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDropoutModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDropout}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md cursor-pointer transition-colors"
              >
                Confirm Dropped Out Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Certificate Printable Modal Preview */}
      {showCertPrintModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-amber-50 text-slate-900 border-8 border-amber-500 rounded-xl max-w-3xl w-full p-8 shadow-xl space-y-6 text-center relative font-serif">
            <button
              onClick={() => setShowCertPrintModal(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-200 text-slate-800 font-sans font-bold flex items-center justify-center transition-colors cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-2 border-b-2 border-amber-400/60 pb-6">
              <p className="text-xs uppercase font-sans font-black tracking-widest text-amber-800">
                HEAVEN TOUCHING EARTH INTERNATIONAL MINISTRIES
              </p>
              <h1 className="text-3xl font-black font-syne text-slate-950 tracking-tight">
                HTEIM School of Ministry
              </h1>
              <p className="text-sm italic text-amber-900">
                "Bringing Heaven to Earth, Taking People to Heaven"
              </p>
            </div>

            <div className="space-y-4 my-6">
              <p className="text-xs uppercase font-sans tracking-widest text-slate-600 font-bold">
                THIS IS TO CERTIFY THAT
              </p>
              <h2 className="text-3xl font-bold text-amber-900 underline decoration-amber-400 decoration-2 underline-offset-8">
                {student.name}
              </h2>
              <p className="text-sm leading-relaxed max-w-xl mx-auto text-slate-700 font-sans">
                has successfully completed all academic requirements, scripture evaluations, and ministry ethics standards for
              </p>
              <h3 className="text-xl font-bold text-slate-900 font-sans">
                {currentLevel.name}
              </h3>
              <p className="text-xs font-sans text-slate-500 font-bold">
                HTEIM Canonical Code: CERT-HTEIM-2026-{(Math.random()*8999+1000).toFixed(0)} • Issue Date: {new Date().toLocaleDateString()}
              </p>
            </div>

            <div className="pt-6 border-t-2 border-amber-400/60 flex items-center justify-between font-sans text-xs font-bold text-slate-700">
              <div className="text-left space-y-1">
                <div className="w-32 border-b border-slate-900" />
                <p>Apostle Dr. H.E. Alexander</p>
                <p className="text-[10px] text-slate-500">President & Founder</p>
              </div>

              <div className="w-16 h-16 rounded-full border-4 border-amber-500 bg-amber-200/50 flex items-center justify-center text-[9px] font-black text-amber-900 uppercase tracking-tighter">
                Official Seal
              </div>

              <div className="text-right space-y-1">
                <div className="w-32 border-b border-slate-900 ml-auto" />
                <p>Academic Affairs Dean</p>
                <p className="text-[10px] text-slate-500">School of Ministry</p>
              </div>
            </div>

            <div className="pt-4 font-sans flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
