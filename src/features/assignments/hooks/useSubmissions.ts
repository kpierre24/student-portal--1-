import { useState, useMemo, useCallback } from 'react';
import { AssignmentSubmission } from '../../../types';
import { portalApi } from '../../../services/api/portalApiClient';
import {
  SubmissionFormData,
  GradeFormData,
  SubmissionStatusFilter,
} from '../types';
import {
  filterSubmissions,
  createSubmissionObject,
  gradeSubmissionObject,
  getStudentSubmission,
} from '../services/assignmentsService';

interface UseSubmissionsProps {
  initialSubmissions?: AssignmentSubmission[];
  assignmentId?: string;
  studentName?: string;
  onSubmissionsChange?: (submissions: AssignmentSubmission[]) => void;
}

export function useSubmissions({
  initialSubmissions = [],
  assignmentId,
  studentName,
  onSubmissionsChange,
}: UseSubmissionsProps = {}) {
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>(initialSubmissions);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubmissionStatusFilter>('all');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const handleSetSubmissions = useCallback(
    (newSubmissions: AssignmentSubmission[] | ((prev: AssignmentSubmission[]) => AssignmentSubmission[])) => {
      setSubmissions((prev) => {
        const updated = typeof newSubmissions === 'function' ? newSubmissions(prev) : newSubmissions;
        if (onSubmissionsChange) {
          onSubmissionsChange(updated);
        }
        return updated;
      });
    },
    [onSubmissionsChange]
  );

  const filteredSubmissions = useMemo(() => {
    return filterSubmissions(submissions, {
      assignmentId,
      studentName,
      search: searchQuery,
      statusFilter,
    });
  }, [submissions, assignmentId, studentName, searchQuery, statusFilter]);

  const selectedSubmission = useMemo(() => {
    if (!selectedSubmissionId) return null;
    return submissions.find((s) => s.id === selectedSubmissionId) || null;
  }, [submissions, selectedSubmissionId]);

  const submitAssignment = useCallback(
    (formData: SubmissionFormData): AssignmentSubmission => {
      const existing = getStudentSubmission(formData.assignmentId, formData.studentName, submissions);

      let updatedSubmission: AssignmentSubmission;
      if (existing) {
        updatedSubmission = {
          ...existing,
          submittedAt: new Date().toISOString(),
          studentFileUrl: formData.fileUrl || existing.studentFileUrl,
          studentFileName: formData.fileName || existing.studentFileName,
          studentFileType: formData.fileType || existing.studentFileType,
          studentFiles: formData.fileUrl
            ? [{ name: formData.fileName || 'Submission Document', url: formData.fileUrl, type: formData.fileType }]
            : existing.studentFiles,
          studentNotes: formData.studentNotes ?? existing.studentNotes,
          studentTypedResponse: formData.studentTypedResponse ?? existing.studentTypedResponse,
          status: 'Submitted',
          updatedAt: new Date().toISOString(),
        };

        handleSetSubmissions((prev) => prev.map((s) => (s.id === existing.id ? updatedSubmission : s)));
      } else {
        updatedSubmission = createSubmissionObject(formData);
        handleSetSubmissions((prev) => [updatedSubmission, ...prev]);
      }

      return updatedSubmission;
    },
    [submissions, handleSetSubmissions]
  );

  const gradeSubmission = useCallback(
    (gradeData: GradeFormData, customAssignments?: import('../../../types').CustomAssignment[]): AssignmentSubmission | null => {
      const target = submissions.find((s) => s.id === gradeData.submissionId);
      if (!target) return null;

      const graded = gradeSubmissionObject(target, gradeData);

      const asg = customAssignments?.find((a) => a.id === target.assignmentId);
      const isGroup = target.isGroupSubmission || asg?.isGroupAssignment;
      const groupObj = asg?.groups?.find(
        (g) => g.groupName === target.groupName || (target.studentName && g.memberNames.includes(target.studentName))
      );
      const groupMembers = target.groupMembers || groupObj?.memberNames || [];

      if (isGroup && groupMembers.length > 0) {
        handleSetSubmissions((prev) => {
          const updatedList = [...prev];
          
          groupMembers.forEach((memberName) => {
            const memberSubIndex = updatedList.findIndex(
              (s) => s.assignmentId === target.assignmentId &&
                (s.studentName || '').toLowerCase().trim() === memberName.toLowerCase().trim()
            );

            if (memberSubIndex !== -1) {
              updatedList[memberSubIndex] = {
                ...updatedList[memberSubIndex],
                score: gradeData.score,
                teacherFeedback: gradeData.teacherFeedback,
                teacherCorrectedFileUrl: gradeData.teacherCorrectedFileUrl || updatedList[memberSubIndex].teacherCorrectedFileUrl,
                teacherCorrectedFileName: gradeData.teacherCorrectedFileName || updatedList[memberSubIndex].teacherCorrectedFileName,
                status: 'Graded',
                updatedAt: new Date().toISOString(),
                isGroupSubmission: true,
                groupName: target.groupName || groupObj?.groupName,
                groupMembers,
              };
            } else {
              const newMemberSub: AssignmentSubmission = {
                id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                assignmentId: target.assignmentId,
                studentName: memberName,
                submittedAt: target.submittedAt || new Date().toISOString(),
                score: gradeData.score,
                teacherFeedback: gradeData.teacherFeedback,
                status: 'Graded',
                updatedAt: new Date().toISOString(),
                isGroupSubmission: true,
                groupName: target.groupName || groupObj?.groupName,
                groupMembers,
              };
              updatedList.unshift(newMemberSub);
            }
          });

          return updatedList;
        });
      } else {
        handleSetSubmissions((prev) => prev.map((s) => (s.id === target.id ? graded : s)));
      }

      portalApi.gradeSubmission({
        submissionId: target.id,
        assignmentId: target.assignmentId,
        studentName: target.studentName || '',
        score: gradeData.score,
        feedback: gradeData.teacherFeedback,
      } as any).catch((err) => console.warn('portalApi.gradeSubmission notice:', err));

      return graded;
    },
    [submissions, handleSetSubmissions]
  );

  const deleteSubmission = useCallback(
    (submissionId: string) => {
      handleSetSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      if (selectedSubmissionId === submissionId) {
        setSelectedSubmissionId(null);
      }
    },
    [handleSetSubmissions, selectedSubmissionId]
  );

  const getSubmissionForStudent = useCallback(
    (asgId: string, stName: string) => {
      return getStudentSubmission(asgId, stName, submissions);
    },
    [submissions]
  );

  return {
    submissions,
    setSubmissions: handleSetSubmissions,
    filteredSubmissions,
    selectedSubmission,
    selectedSubmissionId,
    setSelectedSubmissionId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    submitAssignment,
    gradeSubmission,
    deleteSubmission,
    getSubmissionForStudent,
  };
}
