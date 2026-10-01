import { useState, useCallback } from 'react';
import { GradeRecord, GradeInputData, GradeTransitionData, GradeOverrideData, CanonicalGradeStage } from '../types';
import {
  recordGradeApi,
  transitionGradeLifecycleApi,
  overrideGradeApi,
  normalizeGradeStage,
  calculateGradeCategory,
} from '../services/gradesService';

interface UseGradeMutationsProps {
  onGradeUpdated?: (updatedRecord: GradeRecord) => void;
  setGrades?: React.Dispatch<React.SetStateAction<GradeRecord[]>>;
}

export function useGradeMutations({ onGradeUpdated, setGrades }: UseGradeMutationsProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Save or update a student's score and feedback
   */
  const recordGrade = useCallback(
    async (input: GradeInputData, currentRecord?: GradeRecord | null): Promise<GradeRecord | null> => {
      setIsLoading(true);
      setError(null);

      try {
        let serverResult: any = null;
        try {
          serverResult = await recordGradeApi(input);
        } catch (apiErr: any) {
          console.warn('API grade record endpoint failed, applying client state:', apiErr.message);
          if (apiErr.message?.includes('403') || apiErr.message?.includes('Access denied') || apiErr.message?.includes('LOCKED')) {
            throw apiErr; // Elevate server security denial
          }
        }

        const maxPts = currentRecord?.maxPoints || 100;
        const scorePct = maxPts > 0 ? Math.round((input.score / maxPts) * 100) : 0;

        const updatedRecord: GradeRecord = {
          id: currentRecord?.id || input.submissionId,
          submissionId: input.submissionId,
          studentId: input.studentId || currentRecord?.studentId,
          studentName: currentRecord?.studentName || 'Student',
          assignmentId: input.assignmentId || currentRecord?.assignmentId || 'asg_gen',
          assignmentTitle: currentRecord?.assignmentTitle || 'Assignment',
          courseCode: input.courseCode || currentRecord?.courseCode || 'GENERAL',
          score: input.score,
          maxPoints: maxPts,
          percentage: scorePct,
          feedback: input.feedback || currentRecord?.feedback,
          status: serverResult?.status ? normalizeGradeStage(serverResult.status) : 'GRADED',
          rubricScores: input.rubricScores || currentRecord?.rubricScores,
          overrideReason: input.overrideReason || currentRecord?.overrideReason,
          updatedAt: new Date().toISOString(),
        };

        if (setGrades) {
          setGrades((prev) => {
            const exists = prev.some((g) => g.id === updatedRecord.id || g.submissionId === updatedRecord.submissionId);
            if (exists) {
              return prev.map((g) =>
                g.id === updatedRecord.id || g.submissionId === updatedRecord.submissionId ? updatedRecord : g
              );
            }
            return [updatedRecord, ...prev];
          });
        }

        if (onGradeUpdated) onGradeUpdated(updatedRecord);
        return updatedRecord;
      } catch (err: any) {
        const msg = err.message || 'Failed to record grade';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [onGradeUpdated, setGrades]
  );

  /**
   * Transition lifecycle stage (SUBMITTED -> GRADED -> MODERATION -> RELEASED -> LOCKED)
   */
  const transitionStage = useCallback(
    async (
      transitionData: GradeTransitionData,
      currentRecord?: GradeRecord | null
    ): Promise<GradeRecord | null> => {
      setIsLoading(true);
      setError(null);

      try {
        let serverResult: any = null;
        try {
          serverResult = await transitionGradeLifecycleApi(transitionData);
        } catch (apiErr: any) {
          console.warn('API transition endpoint failed, applying client transition:', apiErr.message);
          if (apiErr.message?.includes('403') || apiErr.message?.includes('Access denied')) {
            throw apiErr; // Elevate server security denial
          }
        }

        const targetStage = serverResult?.status
          ? normalizeGradeStage(serverResult.status)
          : transitionData.targetStatus;

        if (!currentRecord) {
          setIsLoading(false);
          return null;
        }

        const updatedRecord: GradeRecord = {
          ...currentRecord,
          status: targetStage,
          updatedAt: new Date().toISOString(),
        };

        if (setGrades) {
          setGrades((prev) =>
            prev.map((g) => (g.id === updatedRecord.id || g.submissionId === updatedRecord.submissionId ? updatedRecord : g))
          );
        }

        if (onGradeUpdated) onGradeUpdated(updatedRecord);
        return updatedRecord;
      } catch (err: any) {
        const msg = err.message || 'Failed to transition grade stage';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [onGradeUpdated, setGrades]
  );

  /**
   * Perform administrative grade override (for locked/final grades)
   */
  const overrideGrade = useCallback(
    async (
      overrideData: GradeOverrideData,
      currentRecord?: GradeRecord | null
    ): Promise<GradeRecord | null> => {
      setIsLoading(true);
      setError(null);

      try {
        let serverResult: any = null;
        try {
          serverResult = await overrideGradeApi(overrideData);
        } catch (apiErr: any) {
          console.warn('API override endpoint failed, applying client override:', apiErr.message);
          if (apiErr.message?.includes('403') || apiErr.message?.includes('Access denied')) {
            throw apiErr; // Elevate server security denial
          }
        }

        const maxPts = currentRecord?.maxPoints || 100;
        const scorePct = maxPts > 0 ? Math.round((overrideData.score / maxPts) * 100) : 0;

        if (!currentRecord) {
          setIsLoading(false);
          return null;
        }

        const updatedRecord: GradeRecord = {
          ...currentRecord,
          score: overrideData.score,
          percentage: scorePct,
          feedback: overrideData.feedback || currentRecord.feedback,
          overrideReason: overrideData.reason,
          status: serverResult?.status ? normalizeGradeStage(serverResult.status) : currentRecord.status,
          updatedAt: new Date().toISOString(),
        };

        if (setGrades) {
          setGrades((prev) =>
            prev.map((g) => (g.id === updatedRecord.id || g.submissionId === updatedRecord.submissionId ? updatedRecord : g))
          );
        }

        if (onGradeUpdated) onGradeUpdated(updatedRecord);
        return updatedRecord;
      } catch (err: any) {
        const msg = err.message || 'Failed to override grade';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [onGradeUpdated, setGrades]
  );

  return {
    recordGrade,
    transitionStage,
    overrideGrade,
    isLoading,
    error,
    setError,
  };
}
