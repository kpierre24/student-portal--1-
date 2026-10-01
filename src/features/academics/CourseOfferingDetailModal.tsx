import React, { useState } from 'react';
import { 
  X, 
  UserCheck, 
  Calendar, 
  FileText, 
  GraduationCap, 
  Award, 
  Users, 
  Clock, 
  MapPin, 
  Video, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  ChevronRight,
  Sparkles,
  Search,
  Percent,
  Download,
  ShieldCheck,
  Edit3
} from 'lucide-react';
import { 
  CourseOffering, 
  OfferingStudentEnrollment, 
  OfferingAttendanceSession, 
  OfferingAssignment, 
  OfferingExam, 
  OfferingGradeRecord,
  AcademicStanding,
  AUTHORIZED_TEACHERS,
  getFacultyTeacherByName
} from '../../types/academicEngine';
import { generateUUID, getNextSequenceNumber } from '../../lib/idGenerator';
import { UserRole } from '../../lib/userAuth';

interface CourseOfferingDetailModalProps {
  offering: CourseOffering | null;
  onClose: () => void;
  userRole?: UserRole;
  onUpdateOffering?: (updatedOffering: CourseOffering) => void;
  availableStudents?: { name: string; email?: string; photoUrl?: string; levelId?: string }[];
}

type OfferingTab = 'overview' | 'students' | 'attendance' | 'assignments' | 'exams' | 'grades';

export const CourseOfferingDetailModal: React.FC<CourseOfferingDetailModalProps> = ({
  offering,
  onClose,
  userRole = 'admin',
  onUpdateOffering,
  availableStudents = []
}) => {
  if (!offering) return null;

  const [activeTab, setActiveTab] = useState<OfferingTab>('overview');
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  
  // Enroll Student Modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Quick Grade Modal state
  const [gradingStudent, setGradingStudent] = useState<OfferingStudentEnrollment | null>(null);
  const [gradeInput, setGradeInput] = useState<number>(85);
  const [gradeFeedback, setGradeFeedback] = useState('');

  // Quick Assignment Modal state
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [newAsgTitle, setNewAsgTitle] = useState('');
  const [newAsgDesc, setNewAsgDesc] = useState('');
  const [newAsgPoints, setNewAsgPoints] = useState(100);
  const [newAsgWeight, setNewAsgWeight] = useState(20);
  const [newAsgDueDate, setNewAsgDueDate] = useState('');

  // Quick Attendance Session state
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);

  const isTeacherOrAdmin = userRole === 'admin' || userRole === 'teacher';

  // Faculty Teachers State & Handlers
  const [showEditOfferingTeachers, setShowEditOfferingTeachers] = useState(false);
  const [selectedOfferingTeachers, setSelectedOfferingTeachers] = useState<string[]>(() => {
    return offering.teachers && offering.teachers.length > 0 
      ? [...offering.teachers]
      : AUTHORIZED_TEACHERS.map(t => t.name);
  });

  const handleToggleOfferingTeacher = (teacherName: string) => {
    setSelectedOfferingTeachers(prev => {
      const exists = prev.some(t => t.toLowerCase().trim() === teacherName.toLowerCase().trim());
      if (exists) {
        return prev.filter(t => t.toLowerCase().trim() !== teacherName.toLowerCase().trim());
      } else {
        return [...prev, teacherName];
      }
    });
  };

  const handleSaveOfferingTeachers = () => {
    if (!onUpdateOffering) return;
    const updatedOffering: CourseOffering = {
      ...offering,
      teachers: selectedOfferingTeachers
    };
    onUpdateOffering(updatedOffering);
    setShowEditOfferingTeachers(false);
  };

  // Filter students
  const filteredStudents = offering.enrolledStudents.filter(s => 
    s.studentName.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
    s.studentNumber.toLowerCase().includes(searchStudentQuery.toLowerCase())
  );

  // Calculate high distinction, satisfactory, at-risk counts
  const atRiskCount = offering.enrolledStudents.filter(s => s.standing === 'at_risk' || s.attendanceRate < 75).length;
  const highDistinctionCount = offering.enrolledStudents.filter(s => s.standing === 'high_distinction').length;
  const avgAttendance = offering.enrolledStudents.length > 0 
    ? Math.round(offering.enrolledStudents.reduce((acc, s) => acc + s.attendanceRate, 0) / offering.enrolledStudents.length) 
    : 0;
  const avgGrade = offering.enrolledStudents.length > 0
    ? Math.round(offering.enrolledStudents.reduce((acc, s) => acc + s.finalGrade, 0) / offering.enrolledStudents.length)
    : 0;

  // Handle student enrollment
  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError(null);
    if (!selectedStudentName.trim()) return;

    const exists = offering.enrolledStudents.some(
      s => s.studentName.toLowerCase() === selectedStudentName.toLowerCase()
    );
    if (exists) {
      setEnrollError(`Student '${selectedStudentName}' is already enrolled in this course offering.`);
      return;
    }

    const matched = availableStudents.find(
      s => s.name.toLowerCase() === selectedStudentName.toLowerCase()
    );

    const newEnrollment: OfferingStudentEnrollment = {
      studentId: generateUUID(),
      studentName: selectedStudentName.trim(),
      studentNumber: getNextSequenceNumber('student'),
      email: matched?.email || `${selectedStudentName.toLowerCase().replace(/\s+/g, '.')}@hteim.edu`,
      avatarUrl: matched?.photoUrl,
      cohortLevel: 'Level 1 Foundation',
      enrolledAt: new Date().toISOString().split('T')[0],
      status: 'enrolled',
      attendanceRate: 100,
      assignmentsScore: 85,
      examsScore: 85,
      finalGrade: 85,
      letterGrade: 'A',
      standing: 'high_distinction',
      notes: 'Enrolled via Academic Engine.'
    };

    const updatedOffering: CourseOffering = {
      ...offering,
      enrolledStudents: [...offering.enrolledStudents, newEnrollment],
      updatedAt: new Date().toISOString()
    };

    if (onUpdateOffering) onUpdateOffering(updatedOffering);
    setShowEnrollModal(false);
    setSelectedStudentName('');
    setEnrollError(null);
  };

  // Handle grade submission
  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingStudent) return;

    const numScore = Number(gradeInput);
    const standing: AcademicStanding = numScore >= 85 ? 'high_distinction' : numScore >= 75 ? 'satisfactory' : 'at_risk';
    const letterGrade: 'A' | 'B' | 'C' | 'D' | 'F' = numScore >= 90 ? 'A' : numScore >= 80 ? 'B' : numScore >= 70 ? 'C' : numScore >= 60 ? 'D' : 'F';

    const updatedStudents = offering.enrolledStudents.map(s => 
      s.studentId === gradingStudent.studentId ? {
        ...s,
        finalGrade: numScore,
        standing,
        letterGrade: letterGrade as any,
        notes: gradeFeedback || s.notes
      } : s
    );

    const updatedOffering: CourseOffering = {
      ...offering,
      enrolledStudents: updatedStudents,
      updatedAt: new Date().toISOString()
    };

    if (onUpdateOffering) onUpdateOffering(updatedOffering);
    setGradingStudent(null);
  };

  // Handle new assignment
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsgTitle.trim()) return;

    const newAsg: OfferingAssignment = {
      id: generateUUID(),
      title: newAsgTitle.trim(),
      description: newAsgDesc.trim() || 'Ministerial course assignment.',
      type: 'essay',
      maxPoints: Number(newAsgPoints) || 100,
      weight: Number(newAsgWeight) || 20,
      dueDate: newAsgDueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      submissionsCount: 0,
      gradedCount: 0,
      avgScore: 0
    };

    const updatedOffering: CourseOffering = {
      ...offering,
      assignments: [...offering.assignments, newAsg],
      updatedAt: new Date().toISOString()
    };

    if (onUpdateOffering) onUpdateOffering(updatedOffering);
    setShowAddAssignment(false);
    setNewAsgTitle('');
    setNewAsgDesc('');
  };

  // Handle new attendance session
  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTopic.trim()) return;

    const newSession: OfferingAttendanceSession = {
      id: generateUUID(),
      sessionNumber: offering.attendance.length + 1,
      date: sessionDate,
      topic: sessionTopic.trim(),
      records: offering.enrolledStudents.map(s => ({
        studentName: s.studentName,
        status: 'Present' as const
      })),
      presentCount: offering.enrolledStudents.length,
      absentCount: 0,
      excusedCount: 0,
      attendanceRate: 100
    };

    const updatedOffering: CourseOffering = {
      ...offering,
      attendance: [...offering.attendance, newSession],
      updatedAt: new Date().toISOString()
    };

    if (onUpdateOffering) onUpdateOffering(updatedOffering);
    setShowAddSession(false);
    setSessionTopic('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl my-8 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80">
                  {offering.courseCode}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {offering.termName}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 capitalize">
                  {offering.status}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {offering.courseTitle}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {offering.academicYearName} • {offering.section}
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Facet Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Lecturer & Overview
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'students'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Enrolled Students ({offering.enrolledStudents.length})
              {atRiskCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400">
                  {atRiskCount} at-risk
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'attendance'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Attendance ({offering.attendance.length} sessions)
            </button>

            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'assignments'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Assignments ({offering.assignments.length})
            </button>

            <button
              onClick={() => setActiveTab('exams')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'exams'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Exams ({offering.exams.length})
            </button>

            <button
              onClick={() => setActiveTab('grades')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'grades'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Award className="w-4 h-4" />
              Gradebook & Standing
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* TAB 1: OVERVIEW & LECTURER */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Lecturer Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Lead Lecturer & Instructor
                </h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <img
                    src={offering.lecturer.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                    alt={offering.lecturer.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-800"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {offering.lecturer.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-medium">
                        Instructor
                      </span>
                    </div>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                      {offering.lecturer.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                      {offering.lecturer.bio}
                    </p>
                    {offering.lecturer.officeHours && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium">
                        <Clock className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                        Office Hours: {offering.lecturer.officeHours}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Appointed Faculty Teachers Roster */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Appointed Faculty Instructors ({offering.teachers?.length || 0})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Authorized HTEIM teachers assigned to modules across this course offering.
                    </p>
                  </div>

                  {isTeacherOrAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowEditOfferingTeachers(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Manage Faculty</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(offering.teachers && offering.teachers.length > 0 ? offering.teachers : AUTHORIZED_TEACHERS.map(t => t.name)).map((tName) => {
                    const info = getFacultyTeacherByName(tName);
                    return (
                      <div
                        key={tName}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-xs"
                      >
                        <img
                          src={info?.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                          alt={tName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {tName}
                          </h4>
                          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 block truncate">
                            {info?.role || 'Faculty'}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {info?.specialization || 'School of Ministry'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Schedule & Logistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Schedule</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {offering.scheduleDays}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Location</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {offering.location}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Capacity</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-slate-200">
                    <span>{offering.enrolledStudents.length} / {offering.capacity} Enrolled</span>
                    <span className="text-xs text-slate-400 font-normal">
                      {Math.round((offering.enrolledStudents.length / offering.capacity) * 100)}% Full
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-purple-600 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (offering.enrolledStudents.length / offering.capacity) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Offering Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Avg Attendance</span>
                  <div className={`text-xl font-bold mt-0.5 ${avgAttendance >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {avgAttendance}%
                  </div>
                  <span className="text-[10px] text-slate-400">Policy: &ge; 75%</span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 font-medium">Avg Course Grade</span>
                  <div className={`text-xl font-bold mt-0.5 ${avgGrade >= 85 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {avgGrade}%
                  </div>
                  <span className="text-[10px] text-slate-400">Honors: &ge; 85%</span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 font-medium">High Distinction</span>
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {highDistinctionCount}
                  </div>
                  <span className="text-[10px] text-slate-400">Students (&ge;85%)</span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 font-medium">At-Risk Standing</span>
                  <div className={`text-xl font-bold mt-0.5 ${atRiskCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {atRiskCount}
                  </div>
                  <span className="text-[10px] text-slate-400">Flagged (&lt;75%)</span>
                </div>
              </div>

              {/* Course Definition Reference Notice */}
              <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs text-indigo-900 dark:text-indigo-200">
                <span className="font-semibold block mb-0.5">Master Course Blueprint:</span>
                This offering delivers the curriculum blueprint for <strong>{offering.courseCode} — {offering.courseTitle}</strong>. 
                The master course definition is preserved in the central catalog and can be offered repeatedly across multiple academic years with different lecturers and schedules.
              </div>
            </div>
          )}

          {/* TAB 2: ENROLLED STUDENTS */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search enrolled students..."
                    value={searchStudentQuery}
                    onChange={(e) => setSearchStudentQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {isTeacherOrAdmin && (
                  <button
                    onClick={() => setShowEnrollModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Enroll Student
                  </button>
                )}
              </div>

              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Users className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    No enrolled students found.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Enroll students in this course offering to begin tracking attendance and grades.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Number</th>
                        <th className="px-4 py-3 text-center">Attendance</th>
                        <th className="px-4 py-3 text-center">Grade</th>
                        <th className="px-4 py-3">Standing</th>
                        {isTeacherOrAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStudents.map((st, idx) => {
                        const isAtRisk = st.standing === 'at_risk' || st.attendanceRate < 75;
                        const isHonors = st.standing === 'high_distinction';

                        return (
                          <tr key={st.studentId ? `${st.studentId}-${idx}` : `st-row-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {st.studentName}
                              </div>
                              <div className="text-xs text-slate-400">
                                {st.cohortLevel}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">
                              {st.studentNumber}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                st.attendanceRate >= 75
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400'
                              }`}>
                                {st.attendanceRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-100">
                              {st.finalGrade}% ({st.letterGrade})
                            </td>
                            <td className="px-4 py-3">
                              {isHonors ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                  <Award className="w-3 h-3" /> High Distinction
                                </span>
                              ) : isAtRisk ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  <AlertTriangle className="w-3 h-3" /> At-Risk (&lt;75%)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Satisfactory
                                </span>
                              )}
                            </td>
                            {isTeacherOrAdmin && (
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => {
                                    setGradingStudent(st);
                                    setGradeInput(st.finalGrade || 85);
                                    setGradeFeedback(st.notes || '');
                                  }}
                                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                                >
                                  Grade
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ATTENDANCE SESSIONS */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Course Offering Attendance Sessions
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sessions evaluated dynamically against HTEIM's 75% attendance policy threshold.
                  </p>
                </div>

                {isTeacherOrAdmin && (
                  <button
                    onClick={() => setShowAddSession(true)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Session
                  </button>
                )}
              </div>

              {offering.attendance.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Calendar className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    No attendance sessions logged yet.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Log course sessions to monitor student attendance integrity.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {offering.attendance.map((sess) => {
                    const pCount = sess.records ? sess.records.filter((r: any) => r.status === 'Present' || r.status === 'Tardy').length : sess.presentCount;
                    const aCount = sess.records ? sess.records.filter((r: any) => r.status === 'Absent').length : sess.absentCount;
                    const eCount = sess.records ? sess.records.filter((r: any) => r.status === 'Excused').length : sess.excusedCount;
                    const tot = sess.records ? sess.records.length : (pCount + aCount + eCount);
                    const rate = tot > 0 ? Number(((pCount / tot) * 100).toFixed(1)) : sess.attendanceRate;

                    return (
                      <div 
                        key={sess.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                              Session {sess.sessionNumber}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {sess.date}
                            </span>
                          </div>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-1">
                            {sess.topic}
                          </h4>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                            <span>Present: <strong className="text-emerald-600">{pCount}</strong></span>
                            <span>Absent: <strong className="text-rose-600">{aCount}</strong></span>
                            <span>Excused: <strong className="text-amber-600">{eCount}</strong></span>
                            <span>Total Students: <strong className="text-slate-700 dark:text-slate-300">{tot}</strong></span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-lg font-bold ${rate >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {rate}%
                          </div>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Attendance Rate</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Course Offering Assignments
                  </h3>
                  <p className="text-xs text-slate-500">
                    Syllabus assignments, exegesis papers, and practical ministry field logs.
                  </p>
                </div>

                {isTeacherOrAdmin && (
                  <button
                    onClick={() => setShowAddAssignment(true)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Assignment
                  </button>
                )}
              </div>

              {offering.assignments.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    No assignments posted for this offering yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {offering.assignments.map((asg) => (
                    <div 
                      key={asg.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {asg.type}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                            {asg.title}
                          </h4>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {asg.weight}% Weight
                          </span>
                          <span className="block text-[10px] text-slate-400">{asg.maxPoints} pts</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {asg.description}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Due: <strong>{asg.dueDate}</strong></span>
                        <span>Avg: <strong className="text-slate-800 dark:text-slate-200">{asg.avgScore}%</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EXAMS */}
          {activeTab === 'exams' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Exams & Comprehensive Assessments
                  </h3>
                  <p className="text-xs text-slate-500">
                    Midterms, final examinations, and ministerial evaluations for this offering.
                  </p>
                </div>
              </div>

              {offering.exams.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <GraduationCap className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    No scheduled exams for this course offering.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {offering.exams.map((ex) => (
                    <div 
                      key={ex.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            ex.examType === 'final' 
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300' 
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                          }`}>
                            {ex.examType}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                            {ex.title}
                          </h4>
                        </div>
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                          {ex.weight}% Weight
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {ex.description}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Date: <strong>{ex.examDate}</strong> ({ex.durationMinutes} min)</span>
                        <span className="capitalize font-semibold text-emerald-600">{ex.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: GRADES & STANDING */}
          {activeTab === 'grades' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Authoritative Gradebook & Standing Calculation
                    </h3>
                    <p className="text-xs text-slate-500">
                      Weighted Formula: Assignments (40%) + Exams (40%) + Attendance (20%).
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-300">
                      <Award className="w-3.5 h-3.5" /> High Distinction &ge; 85%
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Satisfactory &ge; 75%
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" /> At-Risk &lt; 75%
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3 text-center">Assignments (40%)</th>
                      <th className="px-4 py-3 text-center">Exams (40%)</th>
                      <th className="px-4 py-3 text-center">Attendance (20%)</th>
                      <th className="px-4 py-3 text-center font-bold">Final Grade</th>
                      <th className="px-4 py-3 text-center">Academic Standing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {offering.enrolledStudents.map((st, idx) => (
                      <tr key={st.studentId ? `${st.studentId}-${idx}` : `st-enroll-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          {st.studentName}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs">
                          {st.assignmentsScore}%
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs">
                          {st.examsScore}%
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs">
                          <span className={st.attendanceRate >= 75 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {st.attendanceRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-slate-100">
                          {st.finalGrade}% ({st.letterGrade})
                        </td>
                        <td className="px-4 py-3 text-center">
                          {st.standing === 'high_distinction' ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
                              High Distinction
                            </span>
                          ) : st.standing === 'at_risk' ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                              At-Risk
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                              Satisfactory
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Course Offering ID: <code className="font-mono text-[11px]">{offering.id}</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition-colors"
          >
            Close
          </button>
        </div>

      </div>

      {/* Enroll Student Sub-Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Enroll Student in {offering.courseCode}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enrolls student into <strong>{offering.termName}</strong> under Lecturer <strong>{offering.lecturer.name}</strong>.
            </p>

            {enrollError && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>{enrollError}</span>
              </div>
            )}

            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Select Student or Enter Name
                </label>
                {availableStudents.length > 0 ? (
                  <select
                    value={selectedStudentName}
                    onChange={(e) => setSelectedStudentName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Student from Portal Roster --</option>
                    {availableStudents.map(st => (
                      <option key={st.name} value={st.name}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={selectedStudentName}
                    onChange={(e) => setSelectedStudentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade Student Sub-Modal */}
      {gradingStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              Grade {gradingStudent.studentName}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {offering.courseCode} — {offering.termName}
            </p>

            <form onSubmit={handleSaveGrade} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Final Score Percentage (0 - 100)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={gradeInput}
                  onChange={(e) => setGradeInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>&ge;85%: High Distinction</span>
                  <span>&ge;75%: Satisfactory</span>
                  <span>&lt;75%: At-Risk</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Faculty Feedback & Notes
                </label>
                <textarea
                  rows={3}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="Enter constructive ministerial feedback..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGradingStudent(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  Save Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Assignment Sub-Modal */}
      {showAddAssignment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Add New Assignment
            </h3>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Assignment Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exegesis of Romans 8"
                  value={newAsgTitle}
                  onChange={(e) => setNewAsgTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Max Points
                  </label>
                  <input
                    type="number"
                    value={newAsgPoints}
                    onChange={(e) => setNewAsgPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Weight (% of final)
                  </label>
                  <input
                    type="number"
                    value={newAsgWeight}
                    onChange={(e) => setNewAsgWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newAsgDueDate}
                  onChange={(e) => setNewAsgDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Description / Prompt
                </label>
                <textarea
                  rows={2}
                  value={newAsgDesc}
                  onChange={(e) => setNewAsgDesc(e.target.value)}
                  placeholder="Requirements and scripture prompt..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAssignment(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  Create Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Attendance Session Sub-Modal */}
      {showAddSession && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Log Attendance Session
            </h3>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Session Topic / Scripture Focus
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Session 5: Expository Exegesis in Practice"
                  value={sessionTopic}
                  onChange={(e) => setSessionTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Session Date
                </label>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSession(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  Log Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT FACULTY TEACHERS FOR OFFERING */}
      {showEditOfferingTeachers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Manage Appointed Faculty Teachers
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select authorized teachers assigned to deliver this School of Ministry offering.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditOfferingTeachers(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
              {AUTHORIZED_TEACHERS.map((teacher) => {
                const isSelected = selectedOfferingTeachers.some(
                  t => t.toLowerCase().trim() === teacher.name.toLowerCase().trim()
                );

                return (
                  <div
                    key={teacher.id}
                    onClick={() => handleToggleOfferingTeacher(teacher.name)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={teacher.avatarUrl}
                        alt={teacher.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {teacher.name}
                        </h4>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block truncate">
                          {teacher.title}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {teacher.specialization}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <span className="text-xs text-slate-500">
                {selectedOfferingTeachers.length} teacher{selectedOfferingTeachers.length !== 1 ? 's' : ''} selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditOfferingTeachers(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveOfferingTeachers}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Save Teachers
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
