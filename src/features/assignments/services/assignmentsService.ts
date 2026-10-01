import { CustomAssignment, AssignmentSubmission } from '../../../types';
import {
  AssignmentFormData,
  SubmissionFormData,
  GradeFormData,
  AssignmentStats,
  AssignmentStatusFilter,
  SubmissionStatusFilter,
} from '../types';

export function isAssignmentOverdue(dueDateStr: string): boolean {
  if (!dueDateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dueDateStr < today;
}

export function filterAssignments(
  assignments: CustomAssignment[] = [],
  filters: {
    search?: string;
    statusFilter?: AssignmentStatusFilter;
    courseCode?: string;
    userRole?: 'admin' | 'teacher' | 'student' | string;
    studentName?: string;
  } = {}
): CustomAssignment[] {
  const { search = '', statusFilter = 'all', courseCode = '', userRole = 'admin' } = filters;
  const today = new Date().toISOString().split('T')[0];

  return assignments.filter((assignment) => {
    // Role visibility check: students only see published assignments
    if (userRole === 'student' && assignment.published === false) {
      return false;
    }

    // Search query check
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchTitle = assignment.title.toLowerCase().includes(q);
      const matchCourse = assignment.courseCode?.toLowerCase().includes(q) ?? false;
      const matchDesc = assignment.description?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchCourse && !matchDesc) return false;
    }

    // Course code check
    if (courseCode && courseCode !== 'all') {
      if (assignment.courseCode?.toUpperCase() !== courseCode.toUpperCase()) return false;
    }

    // Status filter check
    if (statusFilter === 'published' && assignment.published === false) return false;
    if (statusFilter === 'draft' && assignment.published !== false && !assignment.isDraft) return false;
    if (statusFilter === 'overdue' && assignment.dueDate >= today) return false;
    if (statusFilter === 'active' && (assignment.dueDate < today || assignment.published === false)) return false;

    return true;
  });
}

export function filterSubmissions(
  submissions: AssignmentSubmission[] = [],
  filters: {
    assignmentId?: string;
    studentName?: string;
    search?: string;
    statusFilter?: SubmissionStatusFilter;
  } = {}
): AssignmentSubmission[] {
  const { assignmentId, studentName, search = '', statusFilter = 'all' } = filters;

  return submissions.filter((sub) => {
    // Assignment filter
    if (assignmentId && sub.assignmentId !== assignmentId) return false;

    // Student filter
    if (studentName) {
      const targetName = studentName.toLowerCase().trim();
      const currentName = (sub.studentName || sub.student?.name || '').toLowerCase().trim();
      if (targetName && currentName !== targetName) return false;
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const name = (sub.studentName || sub.student?.name || '').toLowerCase();
      const notes = (sub.studentNotes || '').toLowerCase();
      if (!name.includes(q) && !notes.includes(q)) return false;
    }

    // Status filter
    const statusLower = (sub.status || '').toLowerCase();
    if (statusFilter === 'submitted' && !statusLower.includes('submit')) return false;
    if (statusFilter === 'graded' && !statusLower.includes('grad')) return false;
    if (statusFilter === 'correction_returned' && !statusLower.includes('correct') && !statusLower.includes('return')) return false;
    if (statusFilter === 'pending_review' && (statusLower.includes('grad') || statusLower.includes('correct'))) return false;

    return true;
  });
}

export function getStudentSubmission(
  assignmentId: string,
  studentName: string,
  submissions: AssignmentSubmission[] = []
): AssignmentSubmission | null {
  if (!assignmentId || !studentName) return null;
  const target = studentName.toLowerCase().trim();

  return (
    submissions.find((s) => {
      if (s.assignmentId !== assignmentId) return false;
      const sName = (s.studentName || s.student?.name || '').toLowerCase().trim();
      return sName === target;
    }) || null
  );
}

export function calculateAssignmentStats(
  assignments: CustomAssignment[] = [],
  submissions: AssignmentSubmission[] = []
): AssignmentStats {
  const totalAssignments = assignments.length;
  let publishedCount = 0;
  let draftCount = 0;

  assignments.forEach((a) => {
    if (a.published !== false && !a.isDraft) {
      publishedCount++;
    } else {
      draftCount++;
    }
  });

  const totalSubmissions = submissions.length;
  let pendingGradingCount = 0;
  let gradedCount = 0;
  let totalScoreSum = 0;
  let gradedScoresCount = 0;

  submissions.forEach((sub) => {
    const statusLower = (sub.status || '').toLowerCase();
    if (statusLower.includes('grad') || statusLower.includes('correct')) {
      gradedCount++;
      if (typeof sub.score === 'number') {
        totalScoreSum += sub.score;
        gradedScoresCount++;
      }
    } else {
      pendingGradingCount++;
    }
  });

  const averageScore = gradedScoresCount > 0 ? Math.round(totalScoreSum / gradedScoresCount) : 0;

  return {
    totalAssignments,
    publishedCount,
    draftCount,
    totalSubmissions,
    pendingGradingCount,
    gradedCount,
    averageScore,
  };
}

export function createAssignmentObject(formData: AssignmentFormData): CustomAssignment {
  return {
    id: formData.id || `asg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: formData.title.trim(),
    courseCode: formData.courseCode || 'GENERAL',
    moduleTrack: formData.moduleTrack || 'Core Ministry',
    cohortId: formData.cohortId,
    description: formData.description.trim(),
    startDate: new Date().toISOString().split('T')[0],
    dueDate: formData.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    maxPoints: Number(formData.maxPoints) || 100,
    createdAt: new Date().toISOString(),
    teacherAttachmentUrl: formData.teacherAttachmentUrl,
    teacherAttachmentName: formData.teacherAttachmentName,
    type: formData.type || 'document',
    quizData: formData.quizData,
    published: formData.published ?? true,
    isDraft: formData.isDraft ?? false,
    isGroupAssignment: formData.isGroupAssignment,
    groups: formData.groups,
  };
}

export function createSubmissionObject(formData: SubmissionFormData): AssignmentSubmission {
  return {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    assignmentId: formData.assignmentId,
    studentId: formData.studentId,
    studentName: formData.studentName,
    student: {
      id: formData.studentId || `std_${Date.now()}`,
      name: formData.studentName,
    },
    submittedAt: new Date().toISOString(),
    studentFileUrl: formData.fileUrl,
    studentFileName: formData.fileName,
    studentFileType: formData.fileType || 'pdf',
    studentFiles: formData.fileUrl ? [{ name: formData.fileName || 'Submission Document', url: formData.fileUrl, type: formData.fileType }] : [],
    studentNotes: formData.studentNotes,
    studentTypedResponse: formData.studentTypedResponse,
    status: 'Submitted',
    updatedAt: new Date().toISOString(),
  };
}

export function gradeSubmissionObject(
  submission: AssignmentSubmission,
  gradeData: GradeFormData
): AssignmentSubmission {
  return {
    ...submission,
    score: gradeData.score,
    teacherFeedback: gradeData.teacherFeedback,
    teacherCorrectedFileUrl: gradeData.teacherCorrectedFileUrl,
    teacherCorrectedFileName: gradeData.teacherCorrectedFileName,
    teacherCorrectedFileType: gradeData.teacherCorrectedFileType,
    status: gradeData.status,
    updatedAt: new Date().toISOString(),
  };
}
