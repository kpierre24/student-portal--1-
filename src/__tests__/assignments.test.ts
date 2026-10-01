import { describe, it, expect } from 'vitest';
import {
  filterAssignments,
  filterSubmissions,
  calculateAssignmentStats,
  createAssignmentObject,
  createSubmissionObject,
  gradeSubmissionObject,
  isAssignmentOverdue,
} from '../features/assignments/services/assignmentsService';
import { CustomAssignment, AssignmentSubmission } from '../types';

describe('assignmentsService unit tests', () => {
  const mockAssignments: CustomAssignment[] = [
    {
      id: 'asg_1',
      title: 'Hermeneutics Essay',
      courseCode: 'M101',
      description: 'Write 500 words on biblical context.',
      dueDate: '2026-12-31',
      maxPoints: 100,
      createdAt: '2026-01-01',
      published: true,
      type: 'document',
    },
    {
      id: 'asg_2',
      title: 'New Testament Quiz',
      courseCode: 'M102',
      description: 'Multiple choice quiz on Gospels.',
      dueDate: '2026-01-01',
      maxPoints: 50,
      createdAt: '2026-01-01',
      published: false,
      isDraft: true,
      type: 'quiz',
    },
  ];

  const mockSubmissions: AssignmentSubmission[] = [
    {
      id: 'sub_1',
      assignmentId: 'asg_1',
      studentName: 'John Doe',
      submittedAt: '2026-01-02T10:00:00Z',
      status: 'Submitted',
      updatedAt: '2026-01-02T10:00:00Z',
    },
    {
      id: 'sub_2',
      assignmentId: 'asg_1',
      studentName: 'Jane Smith',
      submittedAt: '2026-01-03T10:00:00Z',
      score: 95,
      teacherFeedback: 'Great work!',
      status: 'Graded',
      updatedAt: '2026-01-03T11:00:00Z',
    },
  ];

  it('correctly identifies overdue dates', () => {
    expect(isAssignmentOverdue('2020-01-01')).toBe(true);
    expect(isAssignmentOverdue('2099-01-01')).toBe(false);
  });

  it('filters assignments based on search, status, and role', () => {
    // Student should not see unpublished drafts
    const studentView = filterAssignments(mockAssignments, { userRole: 'student' });
    expect(studentView).toHaveLength(1);
    expect(studentView[0].id).toBe('asg_1');

    // Admin sees all
    const adminView = filterAssignments(mockAssignments, { userRole: 'admin' });
    expect(adminView).toHaveLength(2);

    // Search query filter
    const searched = filterAssignments(mockAssignments, { search: 'Quiz', userRole: 'admin' });
    expect(searched).toHaveLength(1);
    expect(searched[0].id).toBe('asg_2');
  });

  it('filters submissions based on assignmentId and status', () => {
    const filteredByAsg = filterSubmissions(mockSubmissions, { assignmentId: 'asg_1' });
    expect(filteredByAsg).toHaveLength(2);

    const gradedOnly = filterSubmissions(mockSubmissions, { statusFilter: 'graded' });
    expect(gradedOnly).toHaveLength(1);
    expect(gradedOnly[0].studentName).toBe('Jane Smith');
  });

  it('calculates assignment stats correctly', () => {
    const stats = calculateAssignmentStats(mockAssignments, mockSubmissions);
    expect(stats.totalAssignments).toBe(2);
    expect(stats.publishedCount).toBe(1);
    expect(stats.draftCount).toBe(1);
    expect(stats.totalSubmissions).toBe(2);
    expect(stats.gradedCount).toBe(1);
    expect(stats.pendingGradingCount).toBe(1);
    expect(stats.averageScore).toBe(95);
  });

  it('creates assignment object with defaults', () => {
    const asg = createAssignmentObject({
      title: 'Theology Research',
      courseCode: 'M103',
      description: 'Research paper on Grace.',
      dueDate: '2026-10-10',
      maxPoints: 100,
    });

    expect(asg.id).toBeDefined();
    expect(asg.title).toBe('Theology Research');
    expect(asg.published).toBe(true);
    expect(asg.type).toBe('document');
  });

  it('creates and grades submission objects', () => {
    const sub = createSubmissionObject({
      assignmentId: 'asg_1',
      studentName: 'Alice Cooper',
      fileUrl: 'https://example.com/essay.pdf',
      fileName: 'essay.pdf',
    });

    expect(sub.status).toBe('Submitted');
    expect(sub.studentFileUrl).toBe('https://example.com/essay.pdf');

    const graded = gradeSubmissionObject(sub, {
      submissionId: sub.id,
      score: 88,
      teacherFeedback: 'Well structured.',
      status: 'Graded',
    });

    expect(graded.score).toBe(88);
    expect(graded.status).toBe('Graded');
    expect(graded.teacherFeedback).toBe('Well structured.');
  });
});
