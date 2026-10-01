import React, { Suspense } from 'react';
import { AssessmentsPage } from '../features/assessments';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { INITIAL_ASSIGNMENTS, INITIAL_SUBMISSIONS } from '../components/ExamsTab';
import { CustomAssignment } from '../types';
import { portalApi } from '../services/api/portalApiClient';
import { saveAuthoritativeState } from '../services/dataSyncService';

export interface ExamsPageProps {
  [key: string]: any;
}

export const ExamsPage: React.FC<ExamsPageProps> = (props) => {
  const appUser = props.appUser || (props.userRole ? {
    id: 'user_active',
    name: props.currentStudentName || '',
    email: 'student@hteim.org',
    role: props.userRole,
    studentName: props.currentStudentName || '',
  } : null);

  const assignments = props.customAssignments && props.customAssignments.length > 0
    ? props.customAssignments
    : INITIAL_ASSIGNMENTS;

  const submissions = props.submissions && props.submissions.length > 0
    ? props.submissions
    : INITIAL_SUBMISSIONS;

  const students = props.students || [];

  const handleGradeSubmission = (submissionId: string, score: number, feedback: string) => {
    if (props.setSubmissions) {
      props.setSubmissions((prev: any[]) => {
        let targetSub = prev.find((s) => s.id === submissionId);
        let parsedAsgId = '';
        let parsedStudentName = '';

        if (!targetSub && submissionId.startsWith('manual-grade|')) {
          const parts = submissionId.split('|');
          parsedAsgId = parts[1];
          parsedStudentName = parts[2];
          targetSub = prev.find(
            (s) => s.assignmentId === parsedAsgId &&
              (s.studentName || '').toLowerCase().trim() === parsedStudentName.toLowerCase().trim()
          );
        }

        const asgId = targetSub?.assignmentId || parsedAsgId;
        const studentNameVal = targetSub?.studentName || parsedStudentName;
        const asg = assignments.find((a) => a.id === asgId);

        const isGroup = targetSub?.isGroupSubmission || asg?.isGroupAssignment;
        const groupObj = asg?.groups?.find(
          (g) => g.groupName === targetSub?.groupName || (studentNameVal && g.memberNames.includes(studentNameVal))
        );
        const groupMembers = targetSub?.groupMembers || groupObj?.memberNames || [];

        if (isGroup && groupMembers.length > 0) {
          const updated = [...prev];
          groupMembers.forEach((memberName) => {
            const memberIdx = updated.findIndex(
              (s) => s.assignmentId === asgId &&
                (s.studentName || '').toLowerCase().trim() === memberName.toLowerCase().trim()
            );

            if (memberIdx !== -1) {
              updated[memberIdx] = {
                ...updated[memberIdx],
                score,
                teacherFeedback: feedback,
                status: 'Graded',
                updatedAt: new Date().toISOString(),
                isGroupSubmission: true,
                groupName: targetSub?.groupName || groupObj?.groupName,
                groupMembers,
              };
            } else {
              updated.unshift({
                id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                assignmentId: asgId,
                studentName: memberName,
                score,
                teacherFeedback: feedback,
                status: 'Graded',
                submittedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isGroupSubmission: true,
                groupName: targetSub?.groupName || groupObj?.groupName,
                groupMembers,
              });
            }
          });
          return updated;
        }

        let finalUpdated: any[] = [];
        if (targetSub) {
          finalUpdated = prev.map((sub) =>
            sub.id === targetSub.id
              ? {
                  ...sub,
                  score,
                  teacherFeedback: feedback,
                  status: 'Graded',
                  updatedAt: new Date().toISOString(),
                }
              : sub
          );
        } else {
          const existingIdx = prev.findIndex((s) => s.id === submissionId);
          if (existingIdx !== -1) {
            finalUpdated = prev.map((sub, idx) =>
              idx === existingIdx
                ? {
                    ...sub,
                    score,
                    teacherFeedback: feedback,
                    status: 'Graded',
                    updatedAt: new Date().toISOString(),
                  }
                : sub
            );
          } else {
            finalUpdated = [
              {
                id: submissionId.startsWith('manual-grade|') ? `sub-${Date.now()}` : submissionId,
                assignmentId: asgId || 'asg-general',
                studentName: studentNameVal || appUser?.studentName || appUser?.name || 'Student',
                score,
                teacherFeedback: feedback,
                status: 'Graded',
                submittedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              ...prev,
            ];
          }
        }

        // Persist graded submission permanently to database
        const activeEmail = appUser?.email || 'admin@hteim.org';
        saveAuthoritativeState(activeEmail, {
          records: props.records || [],
          classDays: props.effectiveClassDays || [],
          customAssignments: assignments,
          submissions: finalUpdated,
          rubricScores: props.rubricScores || {},
        } as any, 'Persist manual grades to database').catch((e) => console.warn('Save manual grade state notice:', e));

        portalApi.gradeSubmission({
          submissionId: targetSub?.id || (submissionId.startsWith('manual-grade|') ? `sub-${Date.now()}` : submissionId),
          assignmentId: asgId || 'asg-general',
          studentName: studentNameVal || appUser?.studentName || appUser?.name || 'Student',
          score,
          feedback,
        } as any).catch((e) => console.warn('portalApi.gradeSubmission notice:', e));

        return finalUpdated;
      });
    }
  };

  const handleSaveAssignment = (newAssignment: CustomAssignment) => {
    if (props.setCustomAssignments) {
      props.setCustomAssignments((prev: CustomAssignment[]) => {
        const existing = prev.findIndex((a) => a.id === newAssignment.id);
        const updatedList = existing !== -1
          ? prev.map((a, idx) => (idx === existing ? newAssignment : a))
          : [newAssignment, ...prev];

        // Persist permanently to Supabase database
        const activeEmail = appUser?.email || 'admin@hteim.org';
        saveAuthoritativeState(activeEmail, {
          records: props.records || [],
          classDays: props.effectiveClassDays || [],
          customAssignments: updatedList,
          submissions: props.submissions || [],
          rubricScores: props.rubricScores || {},
        } as any, 'Persist custom assignment to database').catch((e) => console.warn('Save assignment state notice:', e));

        portalApi.createAssignment({
          id: newAssignment.id,
          title: newAssignment.title,
          description: newAssignment.description || '',
          courseCode: newAssignment.courseCode || 'MIN-101',
          dueDate: newAssignment.dueDate,
          dueAt: newAssignment.dueDate,
          maxScore: newAssignment.maxPoints || 100,
          maxPoints: newAssignment.maxPoints || 100,
          isPublished: newAssignment.published !== false,
          rubric: {
            isGroupAssignment: newAssignment.isGroupAssignment,
            groups: newAssignment.groups,
            quizData: newAssignment.quizData,
            questions: newAssignment.quizData?.questions || [],
            settings: newAssignment.quizData?.settings || {},
          },
          quizData: newAssignment.quizData,
          isGroupAssignment: newAssignment.isGroupAssignment,
          groups: newAssignment.groups,
        } as any).catch((e) => console.warn('portalApi.createAssignment notice:', e));

        return updatedList;
      });
    }
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    if (props.setCustomAssignments) {
      props.setCustomAssignments((prev: CustomAssignment[]) => {
        const updatedList = prev.filter((a) => a.id !== assignmentId && a.quizData?.id !== assignmentId);

        const activeEmail = appUser?.email || 'admin@hteim.org';
        saveAuthoritativeState(activeEmail, {
          records: props.records || [],
          classDays: props.effectiveClassDays || [],
          customAssignments: updatedList,
          submissions: (props.submissions || []).filter((s: any) => s.assignmentId !== assignmentId),
          rubricScores: props.rubricScores || {},
        } as any, 'Delete assignment from database').catch((e) => console.warn('Delete assignment state notice:', e));

        portalApi.deleteAssignment(assignmentId).catch((e) => console.warn('portalApi.deleteAssignment notice:', e));

        return updatedList;
      });
    }
  };

  const handleSyncSheets = () => {
    if (props.onLoadSheets) {
      props.onLoadSheets();
    }
  };

  const allQuizSheets = props.allQuizSheets || (props.effectiveClassDays ? props.effectiveClassDays.map((d: any) => d.name || d.id) : []);

  return (
    <Suspense fallback={<DashboardSkeleton label="Loading Examinations & Assessment Hub..." />}>
      <ErrorBoundary label="Exams & Grading Workspace">
        <AssessmentsPage
          appUser={appUser}
          students={students}
          assignments={assignments}
          submissions={submissions}
          allQuizSheets={allQuizSheets}
          records={props.records || []}
          effectiveClassDays={props.effectiveClassDays || props.classDays || []}
          rubricScores={props.rubricScores || {}}
          onUpdateRubric={props.onUpdateRubric}
          onGradeSubmission={handleGradeSubmission}
          onSaveAssignment={handleSaveAssignment}
          onDeleteAssignment={handleDeleteAssignment}
          onSyncGoogleSheets={handleSyncSheets}
          isLoadingSheets={props.isLoadingSheets}
        />
      </ErrorBoundary>
    </Suspense>
  );
};

export default ExamsPage;
