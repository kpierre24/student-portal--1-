import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Users, 
  Clock, 
  FileText, 
  Download, 
  CheckCircle2, 
  GraduationCap, 
  Layers, 
  Calendar, 
  ChevronRight,
  Award,
  Sparkles,
  Edit3,
  Trash2,
  X,
  MapPin,
  Save,
  Tag,
  Lock,
  ShieldAlert,
  BrainCircuit,
  Filter,
  UserCheck,
  AlertTriangle,
  Bookmark
} from 'lucide-react';
import { EmptyState } from './UXPrimitives';
import { InteractiveFlashcards } from './InteractiveFlashcards';
import { Course } from '../types';
import { UserRole } from '../lib/userAuth';
import { 
  AcademicYear, 
  Term, 
  MasterCourse, 
  CourseOffering, 
  AcademicStructureData,
  OfferingStudentEnrollment,
  OfferingAttendanceSession,
  OfferingAssignment,
  AcademicStanding
} from '../types/academicEngine';
import { 
  DEFAULT_ACADEMIC_YEARS, 
  DEFAULT_TERMS, 
  DEFAULT_MASTER_COURSES, 
  DEFAULT_COURSE_OFFERINGS,
  INITIAL_ACADEMIC_STRUCTURE
} from '../data/defaultAcademicData';
import { isMatchingLesson } from '../data';
import { CourseOfferingDetailModal } from '../features/academics/CourseOfferingDetailModal';
import { ScheduleOfferingModal } from '../features/academics/ScheduleOfferingModal';
import { MasterCourseCatalogView } from '../features/academics/MasterCourseCatalogView';
import { AcademicCalendarView } from '../features/academics/AcademicCalendarView';
import { portalApi } from '../services/api/portalApiClient';

interface CoursesTabProps {
  userRole?: UserRole;
  courses?: Course[];
  setCourses?: React.Dispatch<React.SetStateAction<Course[]>>;
  uniqueStudents?: { name: string; email?: string; photoUrl?: string; levelId?: string; attendanceRate?: number; avgScore?: number; totalScore?: number; percentage?: number; standing?: string; notes?: string; id?: string }[];
  students?: any[];
  records?: any[];
  setRecords?: React.Dispatch<React.SetStateAction<any[]>>;
  classDays?: any[];
  effectiveClassDays?: any[];
  customAssignments?: any[];
  setCustomAssignments?: React.Dispatch<React.SetStateAction<any[]>>;
  submissions?: any[];
  setSubmissions?: React.Dispatch<React.SetStateAction<any[]>>;
  libraryResources?: any[];
  rubricScores?: Record<string, any>;
  facultyTeachers?: any[];
  onNavigate?: (tab: any) => void;
  appUser?: any;
}

export const INITIAL_COURSES: Course[] = [
  {
    id: 'c_main',
    code: 'SOM-CORE',
    title: 'HTEIM School of Ministry Core Program',
    instructor: 'HTEIM Faculty Leadership',
    credits: 30,
    description: 'The primary ministerial training program consisting of 6 core modules: Introduction, Evangelism, Ministerial Ethics, Apostolic Ministry, Prophetic Ministry, and School of the Pastors and Teachers.',
    scheduleDays: 'Tuesdays & Thursdays (7:00 PM - 9:00 PM EST)',
    location: 'HTEIM Main Sanctuary & Live Streaming',
    topics: [
      'Module 1: Introduction & Biblical Hermeneutics',
      'Module 2: Evangelism & The Great Commission',
      'Module 3: Ministerial Ethics & Pastoral Integrity',
      'Module 4: Apostolic Governance & Five-Fold Ministry',
      'Module 5: Prophetic Ministry & Spiritual Discernment',
      'Module 6: School of the Pastors and Teachers'
    ],
    enrolledCount: 38
  },
  {
    id: 'm1',
    code: 'SOM-MOD-1',
    title: 'Module 1: Biblical Hermeneutics & Exegesis',
    instructor: 'Pastor Samuel Selkridge',
    credits: 5,
    description: 'Sound biblical interpretation, exegesis methodologies, historical-grammatical context, and delivering scriptural truth without doctrinal distortion.',
    scheduleDays: 'Tuesdays & Thursdays (7:00 PM - 9:00 PM EST)',
    location: 'Main Sanctuary Hall & Zoom Live',
    topics: ['Authority of Scripture & Canon', 'Historical-Grammatical Exegesis', 'The Christocentric Principle', 'Homiletical Application'],
    enrolledCount: 38
  },
  {
    id: 'm2',
    code: 'SOM-MOD-2',
    title: 'Module 2: Evangelism & The Great Commission',
    instructor: 'Pastor Christy Arthur',
    credits: 5,
    description: 'Practical soul-winning strategies, personal witnessing, the Matthew 28 mandate, street ministry, and follow-up discipleship.',
    scheduleDays: 'Mondays (7:00 PM - 9:00 PM EST) & Outreach',
    location: 'Outreach Training Room & Field',
    topics: ['The Matthew 28 Mandate', 'Effective Witnessing Protocols', 'Overcoming Objections in Soul Winning', 'Discipleship & Follow-up'],
    enrolledCount: 38
  },
  {
    id: 'm3',
    code: 'SOM-MOD-3',
    title: 'Module 3: Ministerial Ethics & Pastoral Integrity',
    instructor: 'Apostle Gillian Selkridge',
    credits: 5,
    description: 'High standards of character, financial integrity, church accountability, conflict resolution, confidentiality, and biblical servant leadership.',
    scheduleDays: 'Wednesdays (7:00 PM - 9:00 PM EST)',
    location: 'Leadership Conference Center',
    topics: ['Integrity of the Leader', 'Financial Stewardship & Transparency', 'Pastoral Counseling Ethics', 'Handling Church Conflict'],
    enrolledCount: 38
  },
  {
    id: 'm4',
    code: 'SOM-MOD-4',
    title: 'Module 4: Apostolic Governance & Five-Fold Ministry',
    instructor: 'Apostle Gillian Selkridge',
    credits: 5,
    description: 'Understanding the apostolic mandate, five-fold governance, spiritual authority according to Ephesians 4:11, and distinguishing true vs false apostolic marks.',
    scheduleDays: 'Fridays (7:00 PM - 9:30 PM EST)',
    location: 'Main Sanctuary & Global Apostolic Room',
    topics: ['Apostolic Foundation (Ephesians 2:20)', 'Marks and Signs of an Apostle', 'Five-Fold Synergy & Alignment', 'Apostolic Church Planting'],
    enrolledCount: 38
  },
  {
    id: 'm5',
    code: 'SOM-MOD-5',
    title: 'Module 5: Prophetic Ministry & Spiritual Discernment',
    instructor: 'Prophet Garod Andrews',
    credits: 5,
    description: 'The operation and biblical testing of prophecy, cultivating spiritual sensitivity, dream interpretation, and prophetic order according to 1 Cor 14.',
    scheduleDays: 'Class Session 9 & 10',
    location: 'Lecture Hall B',
    topics: ['The Gift of Prophecy vs Prophetic Office', 'Testing and Judging Prophecy', 'Spiritual Discernment & Warfare', 'Prophetic Protocol in Assembly'],
    enrolledCount: 38
  },
  {
    id: 'm6',
    code: 'SOM-MOD-6',
    title: 'Module 6: School of the Pastors and Teachers',
    instructor: 'Pastor Samuel Selkridge',
    credits: 5,
    description: 'Shepherding the flock, pastoral counseling, expository sermon preparation, sound biblical teaching, and nurturing believers unto maturity.',
    scheduleDays: 'Saturdays (9:00 AM - 1:00 PM EST)',
    location: 'Main Sanctuary & Online Broadcast',
    topics: ['Shepherding & Pastoral Care', 'Expository Preaching & Hermeneutics', 'Teaching Sound Doctrine', 'Building Sustainable Ministries'],
    enrolledCount: 38
  }
];

export const CoursesTab: React.FC<CoursesTabProps> = ({ 
  userRole = 'admin',
  courses: propCourses,
  setCourses: propSetCourses,
  uniqueStudents = [],
  students = [],
  records = [],
  setRecords,
  classDays = [],
  effectiveClassDays = [],
  customAssignments = [],
  setCustomAssignments,
  submissions = [],
  setSubmissions,
  libraryResources = [],
  rubricScores = {},
  facultyTeachers = [],
  onNavigate,
  appUser
}) => {
  const isStudent = userRole === 'student';
  const isTeacherOrAdmin = userRole === 'admin' || userRole === 'teacher';

  // Active Cohort Students roster
  const activeCohortStudents = useMemo(() => {
    return uniqueStudents && uniqueStudents.length > 0 ? uniqueStudents : (students || []);
  }, [uniqueStudents, students]);

  // Derive real attendance sessions from classDays and records
  const realAttendanceSessions: OfferingAttendanceSession[] = useMemo(() => {
    const sessionsList = (effectiveClassDays && effectiveClassDays.length > 0) ? effectiveClassDays : (classDays && classDays.length > 0 ? classDays : []);
    if (sessionsList.length === 0) {
      return DEFAULT_COURSE_OFFERINGS[0]?.attendance || [];
    }

    return sessionsList.map((session: any, idx: number) => {
      const sessionDate = session.date || `2026-0${Math.floor(idx / 4) + 1}-${String((idx % 4) * 7 + 5).padStart(2, '0')}`;
      const sessionTopic = session.name || `Session ${idx + 1}: Ministerial Lecture & Practicum`;
      const normSessionId = (session.id || '').toLowerCase().trim();
      const normSessionName = (session.name || '').toLowerCase().trim();

      const sessionRecords = activeCohortStudents.map((st: any) => {
        const studentNormName = (st.name || '').toLowerCase().trim();

        // 1. Direct lookup from uniqueStudents attendanceByDay if present
        const dayAttendance = st.attendanceByDay?.[session.id] ?? 
                              (session.name ? st.attendanceByDay?.[session.name] : undefined) ??
                              (normSessionId ? st.attendanceByDay?.[normSessionId] : undefined) ??
                              (normSessionName ? st.attendanceByDay?.[normSessionName] : undefined);

        // 2. Direct lookup from raw attendance records list
        const match = (records || []).find((r: any) => {
          const rName = (r.studentName || r.name || '').toLowerCase().trim();
          if (rName !== studentNormName) return false;
          if (r.classDay) {
            return r.classDay === session.id || 
                   r.classDay === session.name || 
                   isMatchingLesson(r.classDay, session.id) || 
                   (session.name && isMatchingLesson(r.classDay, session.name));
          }
          return r.date === session.date || r.sessionNumber === session.number || r.sessionId === session.id;
        });

        let status: 'Present' | 'Absent' | 'Excused' | 'Tardy' = 'Absent';
        if (dayAttendance !== undefined && dayAttendance !== null) {
          status = dayAttendance.present ? 'Present' : 'Absent';
        } else if (match) {
          const rawStatus = (match.status || '').toLowerCase().trim();
          if (match.present === true || rawStatus === 'present') {
            status = 'Present';
          } else if (rawStatus === 'tardy') {
            status = 'Tardy';
          } else if (rawStatus === 'excused') {
            status = 'Excused';
          } else {
            status = 'Absent';
          }
        }

        return {
          studentName: st.name,
          status,
          notes: match?.notes || (dayAttendance?.score ? `Quiz: ${dayAttendance.score}` : undefined)
        };
      });

      const presentCount = sessionRecords.filter((r: any) => r.status === 'Present' || r.status === 'Tardy').length;
      const absentCount = sessionRecords.filter((r: any) => r.status === 'Absent').length;
      const excusedCount = sessionRecords.filter((r: any) => r.status === 'Excused').length;
      const total = sessionRecords.length;
      const attendanceRate = total > 0 ? Number(((presentCount / total) * 100).toFixed(1)) : 0;

      return {
        id: session.id || `att_session_${idx + 1}`,
        sessionNumber: session.number || idx + 1,
        date: sessionDate,
        topic: sessionTopic,
        records: sessionRecords,
        presentCount,
        absentCount,
        excusedCount,
        attendanceRate
      };
    });
  }, [effectiveClassDays, classDays, records, activeCohortStudents]);

  // Derive real enrolled students for offering
  const realEnrolledStudents: OfferingStudentEnrollment[] = useMemo(() => {
    if (activeCohortStudents.length === 0) return [];
    return activeCohortStudents.map((s: any, idx: number) => {
      // Calculate exact attendance rate from sessions if available
      let computedRate = s.attendanceRate ?? s.percentage;
      if (realAttendanceSessions.length > 0) {
        let presentSessions = 0;
        let totalEvaluated = 0;
        realAttendanceSessions.forEach((sess) => {
          const stRec = sess.records.find((r: any) => r.studentName.toLowerCase().trim() === s.name.toLowerCase().trim());
          if (stRec) {
            totalEvaluated++;
            if (stRec.status === 'Present' || stRec.status === 'Tardy') {
              presentSessions++;
            }
          }
        });
        if (totalEvaluated > 0) {
          computedRate = (presentSessions / totalEvaluated) * 100;
        }
      }

      const attendanceRate = computedRate ?? (records && records.length > 0 ? 88.5 : 92.0);
      const avgScore = s.avgScore ?? s.totalScore ?? 85.0;
      const standing: AcademicStanding = attendanceRate < 75 ? 'at_risk' : (avgScore >= 85 ? 'high_distinction' : 'satisfactory');
      const letterGrade = avgScore >= 90 ? 'A' : avgScore >= 80 ? 'B' : avgScore >= 75 ? 'C' : avgScore >= 60 ? 'D' : 'F';

      return {
        studentId: s.id || s.email || `st_${idx + 1}`,
        studentName: s.name,
        studentNumber: `HTEIM-2026-${String(idx + 1).padStart(3, '0')}`,
        email: s.email || `${s.name.toLowerCase().replace(/\s+/g, '.')}@hteim.edu`,
        cohortLevel: s.levelId || 'Level 1 Foundation',
        enrolledAt: '2026-01-10',
        status: standing === 'at_risk' ? 'at_risk' : 'enrolled',
        attendanceRate: Number(attendanceRate.toFixed(1)),
        assignmentsScore: Number(avgScore.toFixed(1)),
        examsScore: Number(avgScore.toFixed(1)),
        finalGrade: Number(avgScore.toFixed(1)),
        letterGrade,
        standing,
        notes: s.notes || (standing === 'at_risk' ? 'At-risk attendance trigger active (< 75%). Pastoral contact initiated.' : 'Enrolled in 2026 School of Ministry cohort.')
      };
    });
  }, [activeCohortStudents, records, realAttendanceSessions]);

  // Derive real assignments from customAssignments and submissions
  const realAssignments: OfferingAssignment[] = useMemo(() => {
    if (!customAssignments || customAssignments.length === 0) {
      return DEFAULT_COURSE_OFFERINGS[0]?.assignments || [];
    }
    return customAssignments.map((asg: any, idx: number) => {
      const asgSubs = (submissions || []).filter((sub: any) => sub.assignmentId === asg.id);
      const gradedSubs = asgSubs.filter((sub: any) => sub.status === 'Graded');
      const totalScore = gradedSubs.reduce((acc: number, sub: any) => acc + (sub.score || 0), 0);
      const avgScore = gradedSubs.length > 0 ? Number((totalScore / gradedSubs.length).toFixed(1)) : 85;

      return {
        id: asg.id || `asg_${idx + 1}`,
        title: asg.title,
        description: asg.description || 'Ministerial exegesis and curriculum coursework.',
        type: (asg.type as any) || 'essay',
        maxPoints: asg.totalPoints || asg.maxPoints || 100,
        weight: asg.weight || 20,
        dueDate: asg.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        submissionsCount: asgSubs.length,
        gradedCount: gradedSubs.length,
        avgScore
      };
    });
  }, [customAssignments, submissions]);

  // --- Academic Engine Hierarchy State ---
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(() => {
    const saved = localStorage.getItem('hteim_academic_years');
    return saved ? JSON.parse(saved) : DEFAULT_ACADEMIC_YEARS;
  });

  const [terms, setTerms] = useState<Term[]>(() => {
    const saved = localStorage.getItem('hteim_academic_terms');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some(t => t.name.includes('April') || t.name.includes('Semester 1'))) {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_TERMS;
  });

  const [masterCourses, setMasterCourses] = useState<MasterCourse[]>(() => {
    const saved = localStorage.getItem('hteim_master_courses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 6 && parsed.some(c => c.title === 'Introduction' || c.title === 'School of Evangelism')) {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_MASTER_COURSES;
  });

  const [courseOfferings, setCourseOfferings] = useState<CourseOffering[]>(() => {
    const saved = localStorage.getItem('hteim_course_offerings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const somOnly = parsed.filter((o: CourseOffering) => 
            o.courseCode === 'SOM-CORE' || 
            o.courseTitle.toLowerCase().includes('school of ministry') ||
            o.courseId === 'crs_school_of_ministry'
          );
          if (somOnly.length > 0) return somOnly;
        }
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_COURSE_OFFERINGS;
  });

  // Active Filter: Academic Year and Term
  const [selectedTermId, setSelectedTermId] = useState<string>('term_2026_s1');
  const [activeTabMode, setActiveTabMode] = useState<'offerings' | 'catalog' | 'calendar'>('offerings');

  // Modal / Detail States
  const [selectedOffering, setSelectedOffering] = useState<CourseOffering | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [preselectedCourseForSchedule, setPreselectedCourseForSchedule] = useState<MasterCourse | null>(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Persist Academic Engine Data locally
  useEffect(() => {
    localStorage.setItem('hteim_academic_years', JSON.stringify(academicYears));
    localStorage.setItem('hteim_academic_terms', JSON.stringify(terms));
    localStorage.setItem('hteim_master_courses', JSON.stringify(masterCourses));
    localStorage.setItem('hteim_course_offerings', JSON.stringify(courseOfferings));
  }, [academicYears, terms, masterCourses, courseOfferings]);

  // Load authoritative academic structure on mount from Express API
  useEffect(() => {
    let isMounted = true;
    portalApi.getAcademicStructure().then(structure => {
      if (!isMounted || !structure) return;
      if (structure.academicYears?.length) setAcademicYears(structure.academicYears);
      if (structure.terms?.length) setTerms(structure.terms);
      if (structure.masterCourses?.length && structure.masterCourses.length >= 6) {
        setMasterCourses(structure.masterCourses);
      }
      if (structure.courseOfferings?.length) {
        const somOnly = structure.courseOfferings.filter((o: CourseOffering) => 
          o.courseCode === 'SOM-CORE' || 
          o.courseTitle.toLowerCase().includes('school of ministry') ||
          o.courseId === 'crs_school_of_ministry'
        );
        if (somOnly.length > 0) {
          setCourseOfferings(somOnly);
        }
      }
      if (structure.activeTermId) setSelectedTermId(structure.activeTermId);
    }).catch(err => {
      console.warn('Using local academic structure fallback:', err);
    });
    return () => { isMounted = false; };
  }, []);

  // Active Term and Year Objects
  const activeTerm = useMemo(() => {
    return terms.find(t => t.id === selectedTermId) || terms[0];
  }, [terms, selectedTermId]);

  const activeYear = useMemo(() => {
    return academicYears.find(ay => ay.id === activeTerm?.academicYearId) || academicYears[0];
  }, [academicYears, activeTerm]);

  // Enriched course offerings carrying live app data
  const enrichedOfferings = useMemo(() => {
    return courseOfferings.map(offering => {
      const enrolled = realEnrolledStudents.length > 0 ? realEnrolledStudents : offering.enrolledStudents;
      const attendance = realAttendanceSessions.length > 0 ? realAttendanceSessions : offering.attendance;
      const assignments = realAssignments.length > 0 ? realAssignments : offering.assignments;
      const capacity = Math.max(offering.capacity || 60, enrolled.length + 10);

      return {
        ...offering,
        enrolledStudents: enrolled,
        attendance,
        assignments,
        capacity
      };
    });
  }, [courseOfferings, realEnrolledStudents, realAttendanceSessions, realAssignments]);

  // Filter offerings: Under Course Offerings, only show the one course "School of Ministry"
  const filteredOfferings = useMemo(() => {
    return enrichedOfferings.filter(offering => {
      // Must be School of Ministry course
      const isSchoolOfMinistry = 
        offering.courseCode === 'SOM-CORE' || 
        offering.courseTitle.toLowerCase().includes('school of ministry') ||
        offering.courseId === 'crs_school_of_ministry';
      
      if (!isSchoolOfMinistry) return false;

      const matchesTerm = selectedTermId === 'all' || offering.termId === selectedTermId;
      const matchesSearch = 
        offering.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offering.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offering.lecturer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offering.section.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTerm && matchesSearch;
    });
  }, [enrichedOfferings, selectedTermId, searchQuery]);

  // Active Selected Offering with live data
  const activeSelectedOffering = useMemo(() => {
    if (!selectedOffering) return null;
    return enrichedOfferings.find(o => o.id === selectedOffering.id) || {
      ...selectedOffering,
      enrolledStudents: realEnrolledStudents.length > 0 ? realEnrolledStudents : selectedOffering.enrolledStudents,
      attendance: realAttendanceSessions.length > 0 ? realAttendanceSessions : selectedOffering.attendance,
      assignments: realAssignments.length > 0 ? realAssignments : selectedOffering.assignments,
    };
  }, [selectedOffering, enrichedOfferings, realEnrolledStudents, realAttendanceSessions, realAssignments]);

  // Handle updated offering from detail modal
  const handleUpdateOffering = (updatedOffering: CourseOffering) => {
    setCourseOfferings(prev => prev.map(o => o.id === updatedOffering.id ? updatedOffering : o));
    setSelectedOffering(updatedOffering);

    // Sync to Express API
    portalApi.saveCourseOffering(updatedOffering).catch(err => {
      console.warn('Failed to sync course offering to API:', err);
    });
  };

  // Handle updating a master course (e.g. editing appointed module teachers)
  const handleUpdateMasterCourse = (updatedCourse: MasterCourse) => {
    setMasterCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));

    // Sync to Express API
    portalApi.saveCourse(updatedCourse).catch(err => {
      console.warn('Failed to sync master course update to API:', err);
    });
  };

  // Handle scheduling new offering from master course
  const handleScheduleOffering = (newOffering: CourseOffering) => {
    setCourseOfferings(prev => [newOffering, ...prev]);
    setSelectedTermId(newOffering.termId);
    setActiveTabMode('offerings');
    setSelectedOffering(newOffering);

    // Sync to Express API
    portalApi.saveCourseOffering(newOffering).catch(err => {
      console.warn('Failed to sync new course offering to API:', err);
    });
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Academic Hierarchy Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80">
                Academic Engine & 6 Modules
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {activeYear?.name}
              </span>
              <span className="text-slate-300 dark:text-slate-700">&bull;</span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {activeTerm?.name}
              </span>
              <span className="text-slate-300 dark:text-slate-700">&bull;</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {activeCohortStudents.length} Active Cohort Students
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              6 Core Curriculum Modules & Courses
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Foundational ministerial training across the 6 Core Modules: Introduction, Evangelism, Apostles, Ethics, Pastor & Holy Spirit, and Prophets. Integrated directly with live attendance, coursework, and library resources.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowFlashcards(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <BrainCircuit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Scripture Flashcards
            </button>

            {isTeacherOrAdmin && (
              <button
                onClick={() => {
                  setPreselectedCourseForSchedule(null);
                  setShowScheduleModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Schedule Course Offering
              </button>
            )}
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center justify-between gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTabMode('offerings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTabMode === 'offerings'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Course Offerings ({courseOfferings.length})
            </button>

            <button
              onClick={() => setActiveTabMode('catalog')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTabMode === 'catalog'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Master Curriculum Catalog (6 Modules)
            </button>

            <button
              onClick={() => setActiveTabMode('calendar')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTabMode === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Academic Calendar & Terms
            </button>
          </div>

          {/* Term Filter dropdown when in Offerings view */}
          {activeTabMode === 'offerings' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Viewing Term:</span>
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Semesters & Terms</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: COURSE OFFERINGS (The Heart of the Engine) */}
      {activeTabMode === 'offerings' && (
        <div className="space-y-4">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search scheduled course offerings, lecturers, or sections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {filteredOfferings.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <GraduationCap className="w-10 h-10 mx-auto text-slate-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                No course offerings scheduled for this term
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Schedule an offering from the Master Curriculum Catalog to appoint a Lecturer, enroll students, and begin tracking attendance and grades.
              </p>
              {isTeacherOrAdmin && (
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 mt-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Schedule Offering
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredOfferings.map((offering) => {
                const atRiskEnrolled = offering.enrolledStudents.filter(
                  s => s.standing === 'at_risk' || s.attendanceRate < 75
                ).length;

                return (
                  <div
                    key={offering.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-700 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80">
                          {offering.courseCode}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {offering.termName}
                        </span>
                      </div>

                      {/* Course Title */}
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {offering.courseTitle}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {offering.section}
                      </p>

                      {/* Lecturer Card snippet */}
                      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <img
                          src={offering.lecturer.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'}
                          alt={offering.lecturer.name}
                          className="w-10 h-10 rounded-full object-cover border border-indigo-200 dark:border-indigo-800 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                            Appointed Lecturer
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {offering.lecturer.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {offering.lecturer.title}
                          </p>
                        </div>
                      </div>

                      {/* Schedule & Location */}
                      <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{offering.scheduleDays}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{offering.location}</span>
                        </div>
                      </div>

                      {/* Facet Summary stats */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                          <span className="text-[10px] text-slate-400 block font-medium">Enrolled</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {offering.enrolledStudents.length} / {offering.capacity}
                          </span>
                        </div>

                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                          <span className="text-[10px] text-slate-400 block font-medium">Sessions</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {offering.attendance.length}
                          </span>
                        </div>

                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                          <span className="text-[10px] text-slate-400 block font-medium">Coursework</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {offering.assignments.length + (offering.exams?.length || 0)}
                          </span>
                        </div>
                      </div>

                      {/* At-risk student badge if any */}
                      {atRiskEnrolled > 0 && (
                        <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{atRiskEnrolled} student(s) below 75% attendance threshold</span>
                        </div>
                      )}
                    </div>

                    {/* Action button: Open Deep Dive Workspace */}
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setSelectedOffering(offering)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
                      >
                        <span>Open Course Offering Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* VIEW 2: MASTER CURRICULUM CATALOG (6 Core Modules) */}
      {activeTabMode === 'catalog' && (
        <MasterCourseCatalogView
          masterCourses={masterCourses}
          courseOfferings={enrichedOfferings}
          onSelectCourseOffering={(offering) => setSelectedOffering(offering)}
          onScheduleCourse={(course) => {
            setPreselectedCourseForSchedule(course);
            setShowScheduleModal(true);
          }}
          onUpdateMasterCourse={handleUpdateMasterCourse}
          userRole={userRole}
          libraryResources={libraryResources}
          customAssignments={customAssignments}
          uniqueStudents={activeCohortStudents}
          onNavigate={onNavigate}
        />
      )}

      {/* VIEW 3: ACADEMIC CALENDAR & TERMS */}
      {activeTabMode === 'calendar' && (
        <AcademicCalendarView
          academicYears={academicYears}
          terms={terms}
          courseOfferings={enrichedOfferings}
          activeTermId={selectedTermId}
          onSelectTerm={(termId) => {
            setSelectedTermId(termId);
            setActiveTabMode('offerings');
          }}
          userRole={userRole}
        />
      )}

      {/* Course Offering Detail Deep-Dive Modal (The 6 Facets) */}
      {activeSelectedOffering && (
        <CourseOfferingDetailModal
          offering={activeSelectedOffering}
          onClose={() => setSelectedOffering(null)}
          userRole={userRole}
          onUpdateOffering={handleUpdateOffering}
          availableStudents={activeCohortStudents}
        />
      )}

      {/* Schedule Offering Modal */}
      {showScheduleModal && (
        <ScheduleOfferingModal
          masterCourses={masterCourses}
          academicYears={academicYears}
          terms={terms}
          preselectedCourse={preselectedCourseForSchedule}
          currentTermId={selectedTermId === 'all' ? terms[0]?.id : selectedTermId}
          currentYearId={activeYear?.id}
          onClose={() => setShowScheduleModal(false)}
          onSchedule={handleScheduleOffering}
        />
      )}

      {/* Interactive Scripture Flashcards Modal */}
      {showFlashcards && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setShowFlashcards(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <InteractiveFlashcards onClose={() => setShowFlashcards(false)} />
          </div>
        </div>
      )}

    </div>
  );
};
