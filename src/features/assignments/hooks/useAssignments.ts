import { useState, useMemo, useCallback } from 'react';
import { CustomAssignment } from '../../../types';
import { portalApi } from '../../../services/api/portalApiClient';
import {
  AssignmentFormData,
  AssignmentStatusFilter,
  AssignmentStats,
} from '../types';
import {
  filterAssignments,
  calculateAssignmentStats,
  createAssignmentObject,
} from '../services/assignmentsService';

interface UseAssignmentsProps {
  initialAssignments?: CustomAssignment[];
  userRole?: 'admin' | 'teacher' | 'student' | string;
  studentName?: string;
  onAssignmentsChange?: (assignments: CustomAssignment[]) => void;
}

export function useAssignments({
  initialAssignments = [],
  userRole = 'admin',
  studentName = '',
  onAssignmentsChange,
}: UseAssignmentsProps = {}) {
  const [assignments, setAssignments] = useState<CustomAssignment[]>(initialAssignments);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssignmentStatusFilter>('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // Synchronize internal state if initialAssignments prop changes externally
  const handleSetAssignments = useCallback(
    (newAssignments: CustomAssignment[] | ((prev: CustomAssignment[]) => CustomAssignment[])) => {
      setAssignments((prev) => {
        const updated = typeof newAssignments === 'function' ? newAssignments(prev) : newAssignments;
        if (onAssignmentsChange) {
          onAssignmentsChange(updated);
        }
        return updated;
      });
    },
    [onAssignmentsChange]
  );

  const filteredAssignments = useMemo(() => {
    return filterAssignments(assignments, {
      search: searchQuery,
      statusFilter,
      courseCode: selectedCourse,
      userRole,
      studentName,
    });
  }, [assignments, searchQuery, statusFilter, selectedCourse, userRole, studentName]);

  const stats: AssignmentStats = useMemo(() => {
    return calculateAssignmentStats(assignments, []);
  }, [assignments]);

  const selectedAssignment = useMemo(() => {
    if (!selectedAssignmentId) return null;
    return assignments.find((a) => a.id === selectedAssignmentId) || null;
  }, [assignments, selectedAssignmentId]);

  const addAssignment = useCallback(
    (formData: AssignmentFormData): CustomAssignment => {
      const newAsg = createAssignmentObject(formData);
      handleSetAssignments((prev) => [newAsg, ...prev]);

      portalApi.createAssignment({
        id: newAsg.id,
        title: newAsg.title,
        description: newAsg.description || '',
        courseCode: newAsg.courseCode || 'MIN-101',
        dueDate: newAsg.dueDate,
        dueAt: newAsg.dueDate,
        maxScore: newAsg.maxPoints || 100,
        maxPoints: newAsg.maxPoints || 100,
        isPublished: newAsg.published !== false,
        rubric: {
          isGroupAssignment: newAsg.isGroupAssignment,
          groups: newAsg.groups,
          quizData: newAsg.quizData,
        },
        quizData: newAsg.quizData,
        isGroupAssignment: newAsg.isGroupAssignment,
        groups: newAsg.groups,
      } as any).catch((err) => console.warn('portalApi.createAssignment notice:', err));

      return newAsg;
    },
    [handleSetAssignments]
  );

  const updateAssignment = useCallback(
    (id: string, updates: Partial<CustomAssignment>) => {
      handleSetAssignments((prev) =>
        prev.map((asg) => (asg.id === id ? { ...asg, ...updates } : asg))
      );

      portalApi.updateAssignment(id, updates as any).catch((err) =>
        console.warn('portalApi.updateAssignment notice:', err)
      );
    },
    [handleSetAssignments]
  );

  const deleteAssignment = useCallback(
    (id: string) => {
      handleSetAssignments((prev) => prev.filter((asg) => asg.id !== id));
      if (selectedAssignmentId === id) {
        setSelectedAssignmentId(null);
      }

      portalApi.deleteAssignment(id).catch((err) =>
        console.warn('portalApi.deleteAssignment notice:', err)
      );
    },
    [handleSetAssignments, selectedAssignmentId]
  );

  const publishAssignment = useCallback(
    (id: string) => {
      updateAssignment(id, { published: true, isDraft: false });
    },
    [updateAssignment]
  );

  return {
    assignments,
    setAssignments: handleSetAssignments,
    filteredAssignments,
    stats,
    selectedAssignment,
    selectedAssignmentId,
    setSelectedAssignmentId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedCourse,
    setSelectedCourse,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    publishAssignment,
  };
}
