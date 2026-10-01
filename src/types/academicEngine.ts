/**
 * ============================================================================
 * ACADEMIC ENGINE DATA MODELS & TYPES
 * HTEIM School of Ministry
 * ============================================================================
 * Hierarchical structure:
 * Academic Year
 *    └── Semester / Term
 *         └── Course (Master catalog definition)
 *              └── Course Offering (Scheduled delivery instance)
 *                   ├── Lecturer
 *                   ├── Enrolled Students
 *                   ├── Attendance
 *                   ├── Assignments
 *                   ├── Exams
 *                   └── Grades
 */

import type { AcademicYearStatus, TermStatus } from './database';

export type OfferingStatus = 'upcoming' | 'active' | 'grading' | 'concluded';
export type StudentOfferingStatus = 'enrolled' | 'auditing' | 'completed' | 'at_risk' | 'withdrawn';
export type AcademicStanding = 'high_distinction' | 'satisfactory' | 'at_risk';

/**
 * 1. ACADEMIC YEAR
 * Represents an academic calendar year (e.g., 2025-2026).
 */
export interface AcademicYear {
  id: string;
  code: string; // e.g. "AY-2025-2026"
  name: string; // e.g. "2025–2026 Academic Year"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: AcademicYearStatus;
  theme?: string; // Spiritual or institutional theme
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 2. SEMESTER / TERM
 * Scheduled academic period within an Academic Year.
 */
export interface Term {
  id: string;
  academicYearId: string; // FK -> AcademicYear.id
  code: string; // e.g. "2026-SEM-1"
  name: string; // e.g. "2026 Semester 1 (Spring/Winter)"
  sequenceOrder: number; // 1, 2, 3
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: TermStatus;
  weeksCount: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 3. COURSE (MASTER CURRICULUM CATALOG DEFINITION)
 * The reusable curricular blueprint. Independent of any specific semester.
 * Allows the same course (e.g., "Biblical Hermeneutics") to be offered every year
 * without duplicating or rewriting the master definition.
 */
export interface MasterCourse {
  id: string;
  code: string; // e.g. "SOM-101", "SOM-MOD-1"
  title: string; // e.g. "Introduction", "School of Evangelism"
  coreModuleNumber: 1 | 2 | 3 | 4 | 5 | 6 | 'Elective';
  credits: number; // e.g. 5.0
  department: 'Biblical Studies' | 'Practical Ministry' | 'Leadership & Governance' | 'Theology & Ethics' | 'General';
  level: 'Foundation' | 'Diploma' | 'Degree' | 'Executive';
  description: string;
  learningOutcomes: string[];
  prerequisites: string[];
  syllabusOutline: {
    week: number;
    topic: string;
    description: string;
    scriptureReferences?: string[];
  }[];
  isActive: boolean;
  teachers?: string[]; // Array of teacher names (supports multiple teachers)
  instructors?: string[]; // Alias for compatibility
  createdAt?: string;
  updatedAt?: string;
}

/**
 * AUTHORIZED FACULTY TEACHERS FOR SCHOOL OF MINISTRY MODULES
 */
export interface AuthorizedFacultyTeacher {
  id: string;
  name: string;
  role: 'Apostle' | 'Pastor' | 'Prophet' | 'Teacher' | 'Evangelist';
  title: string;
  email: string;
  avatarUrl: string;
  bio: string;
  specialization: string;
}

export const AUTHORIZED_TEACHERS: AuthorizedFacultyTeacher[] = [
  {
    id: 't_gillian',
    name: 'Apostle Gillian Selkridge',
    role: 'Apostle',
    title: 'Apostle & Academic Overseer',
    email: 'apostle.gillian@hteim.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    bio: 'Presiding Apostle with apostolic oversight across ministerial networks, spiritual governance, and five-fold leadership training.',
    specialization: 'School of the Apostles, Apostolic Governance, Spiritual Authority'
  },
  {
    id: 't_samuel',
    name: 'Pastor Samuel Selkridge',
    role: 'Pastor',
    title: 'Dean of Ministry & Senior Pastor',
    email: 'pastor.samuel@hteim.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'Dean of the School of Ministry with over 25 years of pastoral counseling, hermeneutical instruction, and ministry development.',
    specialization: 'Introduction, School of the Pastor and Holy Spirit, Exegesis'
  },
  {
    id: 't_gale',
    name: 'Pastor Gale Grant',
    role: 'Pastor',
    title: 'Pastoral Faculty & Ethics Director',
    email: 'pastor.gale@hteim.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    bio: 'Dedicated teacher and pastoral counselor specializing in ministerial integrity, counseling ethics, and spiritual formation.',
    specialization: 'Ministerial Ethics, Pastoral Counseling, Integrity & Character'
  },
  {
    id: 't_christy',
    name: 'Pastor Christy Arthur',
    role: 'Pastor',
    title: 'Director of Evangelism & Pastoral Leadership',
    email: 'pastor.christy@hteim.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    bio: 'Evangelistic pioneer and pastoral mentor leading global outreach initiatives, soul-winning campaigns, and convert follow-up.',
    specialization: 'School of Evangelism, The Great Commission, Soul Winning'
  },
  {
    id: 't_garod',
    name: 'Prophet Garod Andrews',
    role: 'Prophet',
    title: 'Prophetic Faculty & Spiritual Discernment Mentor',
    email: 'prophet.garod@hteim.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    bio: 'Prophetic presbyter and conference speaker teaching scriptural prophetic protocols, spiritual warfare, and hearing the voice of God.',
    specialization: 'School of the Prophets, Prophetic Protocol, Spiritual Discernment'
  }
];

export const getFacultyTeacherByName = (name: string): AuthorizedFacultyTeacher | undefined => {
  const normalized = name.toLowerCase().trim();
  return AUTHORIZED_TEACHERS.find(t => 
    t.name.toLowerCase().trim() === normalized ||
    normalized.includes(t.name.toLowerCase().trim()) ||
    t.name.toLowerCase().includes(normalized)
  );
};

/**
 * 4. COURSE OFFERING (SCHEDULED DELIVERY INSTANCE)
 * A concrete, scheduled offering of a Course in a specific Academic Year & Term.
 * Contains:
 *  - Lecturer
 *  - Enrolled Students
 *  - Attendance
 *  - Assignments
 *  - Exams
 *  - Grades
 */
export interface CourseOfferingLecturer {
  id?: string;
  name: string;
  title: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  officeHours?: string;
}

export interface OfferingStudentEnrollment {
  studentId: string;
  studentName: string;
  studentNumber: string;
  email?: string;
  avatarUrl?: string;
  cohortLevel: string;
  enrolledAt: string;
  status: StudentOfferingStatus;
  attendanceRate: number; // % (Satisfactory >= 75%, At-risk < 75%)
  assignmentsScore: number; // %
  examsScore: number; // %
  finalGrade: number; // weighted %
  letterGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  standing: AcademicStanding; // high_distinction (>= 85%), satisfactory (>= 75%), at_risk (< 75%)
  notes?: string;
}

export interface OfferingAttendanceRecord {
  studentName: string;
  status: 'Present' | 'Absent' | 'Excused' | 'Tardy';
  checkInTime?: string;
  notes?: string;
}

export interface OfferingAttendanceSession {
  id: string;
  sessionNumber: number;
  date: string; // YYYY-MM-DD
  topic: string;
  location?: string;
  records: OfferingAttendanceRecord[];
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number; // %
}

export interface OfferingAssignment {
  id: string;
  title: string;
  description: string;
  type: 'essay' | 'exegesis' | 'reflection' | 'practicum' | 'quiz' | 'reading';
  maxPoints: number; // e.g. 100
  weight: number; // % weight of final grade (e.g. 20%)
  dueDate: string;
  submissionsCount: number;
  gradedCount: number;
  avgScore: number; // %
  rubricCriteria?: { name: string; maxPoints: number; description: string }[];
}

export interface OfferingExam {
  id: string;
  title: string;
  description: string;
  examType: 'quiz' | 'midterm' | 'final' | 'comprehensive';
  totalPoints: number;
  weight: number; // % weight of final grade (e.g. 30%)
  examDate: string;
  durationMinutes: number;
  status: 'scheduled' | 'active' | 'graded';
  avgScore: number; // %
  passingScore: number; // %
}

export interface OfferingGradeRecord {
  studentName: string;
  studentNumber: string;
  assignmentGrades: Record<string, number>; // assignmentId -> points
  examGrades: Record<string, number>; // examId -> points
  attendancePercentage: number;
  weightedScore: number; // 0-100%
  letterGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  standing: AcademicStanding;
  isPublished: boolean;
  facultyFeedback?: string;
}

export interface CourseOffering {
  id: string;
  courseId: string; // FK -> MasterCourse.id
  courseCode: string; // e.g. "SOM-101"
  courseTitle: string; // e.g. "Biblical Hermeneutics & Exegesis"
  academicYearId: string; // FK -> AcademicYear.id
  academicYearName: string; // e.g. "2025–2026 Academic Year"
  termId: string; // FK -> Term.id
  termName: string; // e.g. "2026 Semester 1"
  section: string; // e.g. "Section 01", "Main Sanctuary & Online"
  scheduleDays: string; // e.g. "Tuesdays & Thursdays (7:00 PM - 9:00 PM EST)"
  location: string; // e.g. "Main Sanctuary & Zoom Live Stream"
  zoomLink?: string;
  capacity: number;
  status: OfferingStatus;
  credits: number;
  
  // The 6 Operational Facets of Course Offering:
  lecturer: CourseOfferingLecturer;
  teachers?: string[]; // Multiple assigned teachers for this offering
  enrolledStudents: OfferingStudentEnrollment[];
  attendance: OfferingAttendanceSession[];
  assignments: OfferingAssignment[];
  exams: OfferingExam[];
  grades: OfferingGradeRecord[];

  createdAt?: string;
  updatedAt?: string;
}

/**
 * Complete Hierarchical Academic Structure
 */
export interface AcademicStructureData {
  academicYears: AcademicYear[];
  terms: Term[];
  masterCourses: MasterCourse[];
  courseOfferings: CourseOffering[];
  activeAcademicYearId: string;
  activeTermId: string;
  policyThresholds: {
    atRiskAttendance: number; // 75%
    criticalAttendance: number; // 50%
    highDistinctionGrade: number; // 85%
    satisfactoryGrade: number; // 75%
  };
}
