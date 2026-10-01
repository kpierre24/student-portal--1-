import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Calendar, 
  Award, 
  UserCheck, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ArrowRight, 
  Edit3, 
  FileText, 
  Check, 
  Send, 
  Sparkles, 
  Search, 
  Filter,
  Video,
  Play
} from 'lucide-react';
import { 
  CustomAssignment, 
  AssignmentSubmission, 
  ClassDay, 
  StudentSummary, 
  TabType,
  FacultyTeacher
} from '../../types';
import { AppUser } from '../../lib/userAuth';
import { RoleActionHero, ActionTask } from './RoleActionHero';

interface LecturerDashboardViewProps {
  appUser: AppUser | null;
  classDays: ClassDay[];
  students: StudentSummary[];
  customAssignments: CustomAssignment[];
  submissions: AssignmentSubmission[];
  facultyTeachers?: FacultyTeacher[];
  onNavigate: (tab: TabType) => void;
  pendingAssignmentsCount?: number;
}

export const LecturerDashboardView: React.FC<LecturerDashboardViewProps> = ({
  appUser,
  classDays = [],
  students = [],
  customAssignments = [],
  submissions = [],
  facultyTeachers = [],
  onNavigate,
  pendingAssignmentsCount = 0
}) => {
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [gradedIds, setGradedIds] = useState<string[]>([]);

  // Lecturer assigned courses
  const lecturerName = appUser?.name || 'Rev. Dr. Faculty Instructor';
  const assignedCourses = useMemo(() => {
    return [
      {
        id: 'SOM-MOD-1',
        code: 'SOM-MOD-1',
        title: 'Foundations & Kingdom Alignment',
        role: 'Lead Instructor',
        enrolledCount: students.length,
        lessonsCount: 4,
        nextSession: 'Day 1: Kingdom Alignment & Covenant Order',
        room: 'Main Lecture Hall & Zoom Hybrid'
      },
      {
        id: 'SOM-MOD-2',
        code: 'SOM-MOD-2',
        title: 'Exegetical Theology & Evangelism',
        role: 'Senior Instructor',
        enrolledCount: students.length,
        lessonsCount: 4,
        nextSession: 'Day 5: The Great Commission Mandate',
        room: 'Hall A & Live Stream'
      }
    ];
  }, [students.length]);

  // Today's / Upcoming classes for this lecturer
  const todayClasses = useMemo(() => {
    if (classDays && classDays.length > 0) {
      return classDays.slice(-2).map((cd, idx) => ({
        id: cd.id,
        name: cd.name,
        date: (cd as any).date || 'Today (Tuesday)',
        time: idx === 0 ? '7:00 PM EST' : '8:30 PM EST',
        topic: idx === 0 ? 'Hermeneutics & Exegetical Exposition' : 'Homiletics & Pulpit Delivery Practicum',
        courseCode: idx === 0 ? 'SOM-MOD-1' : 'SOM-MOD-2',
        zoomActive: true,
        checkedInCount: Math.round(students.length * 0.85),
        totalStudents: students.length
      }));
    }
    return [
      {
        id: 'tc-1',
        name: 'School of the Pastors: Homiletics Lab',
        date: 'Today (Tuesday)',
        time: '7:00 PM EST',
        topic: 'Hermeneutics & Exegetical Exposition',
        courseCode: 'SOM-MOD-6',
        zoomActive: true,
        checkedInCount: 48,
        totalStudents: 58
      }
    ];
  }, [classDays, students.length]);

  // Attendance Pending Sessions (sessions where teacher needs to verify records)
  const attendancePendingSessions = useMemo(() => {
    return classDays.slice(0, 3).map(cd => ({
      id: cd.id,
      name: cd.name,
      date: (cd as any).date || 'Recent Class',
      status: 'Pending Instructor Review',
      unmarkedCount: 4
    }));
  }, [classDays]);

  // Assignments needing grading
  const assignmentsToGrade = useMemo(() => {
    return customAssignments.filter(a => a.type === 'document' || a.type === 'quiz');
  }, [customAssignments]);

  // Recent Student Submissions
  const recentSubmissions = useMemo(() => {
    if (submissions && submissions.length > 0) {
      return submissions.slice(0, 6).map(sub => {
        const matchingAssignment = customAssignments.find(a => a.id === sub.assignmentId);
        return {
          id: sub.id,
          studentName: sub.studentName,
          assignmentTitle: matchingAssignment?.title || (sub as any).assignmentTitle || 'Module Assignment Submission',
          submittedAt: sub.submittedAt,
          status: sub.status,
          grade: sub.score !== undefined ? `${sub.score}%` : (sub as any).grade || null,
          feedback: sub.teacherFeedback || (sub as any).feedback || null
        };
      });
    }
    // High-quality mock submissions if none exist
    return [
      {
        id: 'sub-1',
        studentName: 'Sister Maria Santos',
        assignmentTitle: 'Module 1 Essay: Kingdom Governance & Covenant',
        submittedAt: '2 hours ago',
        status: 'pending',
        grade: null,
        feedback: null
      },
      {
        id: 'sub-2',
        studentName: 'Brother David Miller',
        assignmentTitle: 'Module 2 Exegesis: Romans 12 Exposition Paper',
        submittedAt: '5 hours ago',
        status: 'pending',
        grade: null,
        feedback: null
      },
      {
        id: 'sub-3',
        studentName: 'Minister Caleb Washington',
        assignmentTitle: 'Module 3 Practicum: Ministerial Counseling Case Study',
        submittedAt: 'Yesterday, 8:45 PM',
        status: 'pending',
        grade: null,
        feedback: null
      },
      {
        id: 'sub-4',
        studentName: 'Evangelist Hannah Pierre',
        assignmentTitle: 'Module 1 Quiz: Biblical Citizenship Recitation',
        submittedAt: '2 days ago',
        status: 'graded',
        grade: '95%',
        feedback: 'Excellent grasp of foundational scriptures!'
      }
    ];
  }, [submissions, customAssignments]);

  const filteredSubmissions = useMemo(() => {
    return recentSubmissions.filter(sub => {
      if (!submissionSearch.trim()) return true;
      return (
        sub.studentName.toLowerCase().includes(submissionSearch.toLowerCase().trim()) ||
        sub.assignmentTitle.toLowerCase().includes(submissionSearch.toLowerCase().trim())
      );
    });
  }, [recentSubmissions, submissionSearch]);

  const handleQuickGrade = (subId: string) => {
    setGradedIds(prev => [...prev, subId]);
  };

  // Immediate Next Action Tasks for Lecturer
  const pendingSubmissionsCount = recentSubmissions.filter(s => s.status === 'pending' && !gradedIds.includes(s.id)).length;
  const lecturerTasks: ActionTask[] = useMemo(() => {
    const list: ActionTask[] = [];

    if (pendingSubmissionsCount > 0) {
      list.push({
        id: 'lecturer-grade-pending',
        title: `Grade Pending Submissions (${pendingSubmissionsCount} Submissions)`,
        subtitle: `Students have submitted coursework for Module 1 & 2. Review submissions and record grades/feedback.`,
        urgency: 'high',
        badge: 'Grading Action',
        actionText: 'Grade Submissions Now',
        targetTab: 'exams'
      });
    }

    list.push({
      id: 'lecturer-attendance',
      title: 'Record Live Session Class Attendance',
      subtitle: `Verify student check-in logs for recent class session. Ensure students below 75% attendance are identified.`,
      urgency: 'medium',
      badge: 'Attendance Roster',
      actionText: 'Open Attendance Register',
      targetTab: 'attendance'
    });

    list.push({
      id: 'lecturer-coursework',
      title: 'Publish Next Module Quiz / Essay Prompt',
      subtitle: 'Prepare coursework materials for upcoming Module 4: Apostolic Ministry & Five-Fold Order.',
      urgency: 'normal',
      badge: 'Course Creation',
      actionText: 'Create Quiz / Assignment',
      targetTab: 'exams'
    });

    return list;
  }, [pendingSubmissionsCount]);

  return (
    <div className="space-y-6" id="lecturer-dashboard">
      
      {/* ─── Immediate Next Action Hero Banner ─── */}
      <RoleActionHero
        roleTitle="Faculty Ministerial Portal"
        roleBadge="Lecturer / Instructor Dashboard"
        userName={lecturerName}
        tasks={lecturerTasks}
        onNavigate={onNavigate}
      />

      {/* ─── Top Banner ─── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#022044] via-[#023264] to-[#041a33] text-white p-5 sm:p-7 shadow-xl border border-[#025798]/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 inline-flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-amber-300 shrink-0" />
                Lecturer Faculty Portal
              </span>
              <span className="text-[10px] font-mono text-sky-200/80 px-2 py-0.5 rounded-full bg-white/10">
                Department of Biblical Instruction & Exegesis
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
              Peace & Blessings, {lecturerName}
            </h1>
            <p className="text-xs text-sky-100/85 max-w-2xl">
              Manage your assigned course syllabi, launch live classroom check-ins, record attendance, and grade student submissions.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-400/40"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Start Live Check-In</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('exams')}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 border border-amber-300"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Grading Queue ({pendingAssignmentsCount || 3})</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── 1. Primary Metrics Row ─────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Lecturer Core Metrics">
        
        {/* My Courses Card */}
        <div 
          onClick={() => onNavigate('courses')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              My Courses
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#025798] dark:text-[#7dd3fc] flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-tabular">
                {assignedCourses.length} Modules
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">
              {students.length} students enrolled in your cohort
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-[#025798] dark:text-[#7dd3fc] font-bold group-hover:underline">
            <span>Course Syllabus & Handouts</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Today's Classes Card */}
        <div 
          onClick={() => onNavigate('schedule')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today's Classes
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-tabular">
                {todayClasses.length} Scheduled
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                7:00 PM EST
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">
              Hybrid Broadcast & In-Person Hall
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold group-hover:underline">
            <span>Classroom Schedule</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Attendance Pending Card */}
        <div 
          onClick={() => onNavigate('attendance')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Attendance Pending
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-tabular">
                {attendancePendingSessions.length} Sessions
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                Awaiting Verification
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">
              Lock records prior to the 48h deadline
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold group-hover:underline">
            <span>Verify Check-Ins</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Assignments to Grade Card */}
        <div 
          onClick={() => onNavigate('exams')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assignments to Grade
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-tabular">
                {recentSubmissions.filter(s => s.status === 'pending').length}
              </span>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                Pending Grading
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">
              {assignmentsToGrade.length} active assignments published
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400 font-bold group-hover:underline">
            <span>Open Rubric Grading</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

      </section>

      {/* ─── 2. My Assigned Courses Grid ────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#023264] text-white flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                My Assigned Courses & Modules
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Curriculum syllabus, enrolled roster, and upcoming lesson topics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('courses')}
            className="text-xs font-bold text-[#025798] dark:text-[#7dd3fc] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>All 6 Modules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignedCourses.map(course => (
            <div
              key={course.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#023264]/10 text-[#025798] dark:bg-[#023264]/50 dark:text-[#7dd3fc] border border-[#025798]/30">
                    {course.code}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    {course.enrolledCount} Students Enrolled
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {course.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/80">
                  <span className="font-bold text-slate-700 dark:text-slate-200 block text-[11px] mb-0.5">Next Session:</span>
                  {course.nextSession}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="px-3 py-1.5 bg-[#023264] hover:bg-[#025798] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Take Attendance</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('courses')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>View Syllabus</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 3. Today's Classes & Live Check-In ──────────────────── */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Today's Teaching Schedule & Live Session
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Launch interactive QR/PIN student check-ins and broadcast lectures
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {todayClasses.map(session => (
            <div 
              key={session.id}
              className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-800/60 dark:to-indigo-950/20 border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-[#023264] text-white">
                    {session.courseCode}
                  </span>
                  <span className="text-xs font-black text-[#025798] dark:text-[#7dd3fc] font-mono">
                    {session.time}
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {session.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Topic: <strong>{session.topic}</strong>
                </p>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{session.checkedInCount} of {session.totalStudents} students verified present</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Start Check-In</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('library')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  title="Open Zoom Broadcast Link"
                >
                  <Video className="w-3.5 h-3.5 text-rose-500" />
                  <span>Zoom</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 4. Assignments to Grade & Recent Student Submissions ─── */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Recent Student Submissions & Grading Queue
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Evaluate student homework essays, scripture recitation responses, and rubrics
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={submissionSearch}
              onChange={(e) => setSubmissionSearch(e.target.value)}
              placeholder="Search submissions..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#025798]"
            />
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredSubmissions.map(sub => {
            const isGraded = gradedIds.includes(sub.id) || sub.status === 'graded';
            return (
              <div
                key={sub.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {sub.studentName}
                    </p>
                    <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold ${
                      isGraded 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {isGraded ? (sub.grade || 'Graded (100%)') : 'Pending Grading'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                    {sub.assignmentTitle}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Submitted: {sub.submittedAt}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isGraded ? (
                    <button
                      type="button"
                      onClick={() => handleQuickGrade(sub.id)}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs border border-amber-300"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Grade Now</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <Check className="w-3.5 h-3.5" />
                      <span>Evaluated</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onNavigate('exams')}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Open in Exams & Assignments Tab"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};
