import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Award,
  Users,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Save,
  Clock,
  Sparkles
} from 'lucide-react';
import { CustomAssignment, AssignmentSubmission, StudentSummary } from '../../../types';

export interface ManualGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: CustomAssignment[];
  students: (StudentSummary | any)[];
  submissions: AssignmentSubmission[];
  onGradeSubmission?: (submissionId: string, score: number, feedback: string) => void;
  defaultAssignmentId?: string;
  defaultStudentName?: string;
}

export const ManualGradeModal: React.FC<ManualGradeModalProps> = ({
  isOpen,
  onClose,
  assignments = [],
  students = [],
  submissions = [],
  onGradeSubmission,
  defaultAssignmentId,
  defaultStudentName,
}) => {
  const [selectedAsgId, setSelectedAsgId] = useState<string>(
    defaultAssignmentId || assignments[0]?.id || ''
  );
  const [targetType, setTargetType] = useState<'group' | 'student'>('student');
  const [selectedGroupName, setSelectedGroupName] = useState<string>('');
  const [selectedStudentName, setSelectedStudentName] = useState<string>(
    defaultStudentName || ''
  );
  const [score, setScore] = useState<number>(85);
  const [feedback, setFeedback] = useState<string>('');
  const [isSavedToast, setIsSavedToast] = useState(false);

  // Sync selected assignment if default changes or on open
  useEffect(() => {
    if (defaultAssignmentId) {
      setSelectedAsgId(defaultAssignmentId);
    } else if (assignments.length > 0 && !selectedAsgId) {
      setSelectedAsgId(assignments[0].id);
    }
  }, [defaultAssignmentId, assignments, selectedAsgId]);

  // Selected assignment object
  const activeAssignment = useMemo(() => {
    return assignments.find((a) => a.id === selectedAsgId) || assignments[0] || null;
  }, [assignments, selectedAsgId]);

  const isGroupAssignment = Boolean(activeAssignment?.isGroupAssignment);
  const assignmentGroups = activeAssignment?.groups || [];
  const maxPoints = activeAssignment?.maxPoints || 100;

  // Set default group / student when assignment changes
  useEffect(() => {
    if (isGroupAssignment && assignmentGroups.length > 0) {
      setTargetType('group');
      if (!selectedGroupName || !assignmentGroups.some((g) => g.groupName === selectedGroupName)) {
        setSelectedGroupName(assignmentGroups[0].groupName);
      }
    } else {
      setTargetType('student');
      if (!selectedStudentName && students.length > 0) {
        const firstStudentName = typeof students[0] === 'string' ? students[0] : students[0]?.name || '';
        setSelectedStudentName(defaultStudentName || firstStudentName);
      }
    }
  }, [isGroupAssignment, assignmentGroups, selectedGroupName, selectedStudentName, students, defaultStudentName]);

  // Identify target group when targetType === 'group'
  const currentGroup = useMemo(() => {
    if (!isGroupAssignment) return null;
    return assignmentGroups.find((g) => g.groupName === selectedGroupName) || assignmentGroups[0] || null;
  }, [isGroupAssignment, assignmentGroups, selectedGroupName]);

  // If targetType is 'student' on a group assignment, find the student's group
  const studentMatchedGroup = useMemo(() => {
    if (!isGroupAssignment || !selectedStudentName) return null;
    return assignmentGroups.find((g) =>
      g.memberNames.some(
        (m) => m.toLowerCase().trim() === selectedStudentName.toLowerCase().trim()
      )
    ) || null;
  }, [isGroupAssignment, selectedStudentName, assignmentGroups]);

  // The actual affected members when grading
  const affectedMembers = useMemo(() => {
    if (!isGroupAssignment) return [];
    if (targetType === 'group' && currentGroup) {
      return currentGroup.memberNames;
    }
    if (targetType === 'student' && studentMatchedGroup) {
      return studentMatchedGroup.memberNames;
    }
    return selectedStudentName ? [selectedStudentName] : [];
  }, [isGroupAssignment, targetType, currentGroup, studentMatchedGroup, selectedStudentName]);

  // Current existing score if any
  const existingGradeInfo = useMemo(() => {
    if (!activeAssignment) return null;
    if (isGroupAssignment && affectedMembers.length > 0) {
      const match = submissions.find(
        (s) =>
          s.assignmentId === activeAssignment.id &&
          affectedMembers.some(
            (m) => m.toLowerCase().trim() === (s.studentName || '').toLowerCase().trim()
          ) &&
          s.score !== undefined
      );
      return match ? { score: match.score, feedback: match.teacherFeedback } : null;
    } else if (selectedStudentName) {
      const match = submissions.find(
        (s) =>
          s.assignmentId === activeAssignment.id &&
          (s.studentName || '').toLowerCase().trim() === selectedStudentName.toLowerCase().trim() &&
          s.score !== undefined
      );
      return match ? { score: match.score, feedback: match.teacherFeedback } : null;
    }
    return null;
  }, [activeAssignment, isGroupAssignment, affectedMembers, selectedStudentName, submissions]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment || !onGradeSubmission) return;

    const validatedScore = Math.min(Math.max(0, Number(score) || 0), maxPoints);

    if (isGroupAssignment && affectedMembers.length > 0) {
      // Award the grade to all members of the group
      affectedMembers.forEach((memberName) => {
        const existingSub = submissions.find(
          (s) =>
            s.assignmentId === activeAssignment.id &&
            (s.studentName || '').toLowerCase().trim() === memberName.toLowerCase().trim()
        );
        const subId = existingSub?.id || `manual-grade|${activeAssignment.id}|${memberName}`;
        onGradeSubmission(subId, validatedScore, feedback);
      });
    } else {
      // Individual student manual grade
      const targetName = selectedStudentName || (typeof students[0] === 'string' ? students[0] : students[0]?.name || 'Student');
      const existingSub = submissions.find(
        (s) =>
          s.assignmentId === activeAssignment.id &&
          (s.studentName || '').toLowerCase().trim() === targetName.toLowerCase().trim()
      );
      const subId = existingSub?.id || `manual-grade|${activeAssignment.id}|${targetName}`;
      onGradeSubmission(subId, validatedScore, feedback);
    }

    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 600);
  };

  // Grade letter evaluation
  const scorePercent = maxPoints > 0 ? Math.round((score / maxPoints) * 100) : score;
  const gradeLetter =
    scorePercent >= 90
      ? 'A (Excellent)'
      : scorePercent >= 80
      ? 'B (Good)'
      : scorePercent >= 75
      ? 'C (Satisfactory)'
      : 'At-Risk (<75%)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-grade-title"
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="manual-grade-title" className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                Manual Grade Entry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Directly award marks for individual or group assignments
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-medium custom-scrollbar">
          {/* Assignment Selection */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              Coursework Assignment *
            </label>
            <select
              value={selectedAsgId}
              onChange={(e) => setSelectedAsgId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
            >
              {assignments.map((asg) => (
                <option key={asg.id} value={asg.id}>
                  {asg.isGroupAssignment ? '👥 [Group] ' : '📄 [Individual] '}
                  {asg.title} (Max: {asg.maxPoints || 100} pts)
                </option>
              ))}
            </select>
          </div>

          {/* Group Assignment Notice & Configuration */}
          {isGroupAssignment ? (
            <div className="p-3.5 bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 text-xs">
                  <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Group Assignment Grading Policy
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-200/60 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                  Auto-Sync Enabled
                </span>
              </div>

              <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                Marks given will automatically apply to <strong>all members</strong> of the group simultaneously.
              </p>

              {/* Group selection mode toggle */}
              <div className="flex items-center gap-2 pt-1 border-t border-indigo-200/60 dark:border-indigo-800/60">
                <button
                  type="button"
                  onClick={() => setTargetType('group')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    targetType === 'group'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700'
                  }`}
                >
                  Grade by Group
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('student')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    targetType === 'student'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700'
                  }`}
                >
                  Grade by Member
                </button>
              </div>

              {/* Group Selector Dropdown */}
              {targetType === 'group' && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                    Select Group ({assignmentGroups.length} groups)
                  </label>
                  <select
                    value={selectedGroupName}
                    onChange={(e) => setSelectedGroupName(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {assignmentGroups.map((grp) => (
                      <option key={grp.groupName} value={grp.groupName}>
                        {grp.groupName} ({grp.memberNames?.length || 0} members)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Member Selector Dropdown */}
              {targetType === 'student' && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                    Select Any Group Member
                  </label>
                  <select
                    value={selectedStudentName}
                    onChange={(e) => setSelectedStudentName(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {students.map((std) => {
                      const name = typeof std === 'string' ? std : std?.name || '';
                      return (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Affected Members Pill List */}
              {affectedMembers.length > 0 && (
                <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 space-y-1">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-800 dark:text-indigo-300 block">
                    All Group Members Receiving This Mark ({affectedMembers.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                    {affectedMembers.map((member) => (
                      <span
                        key={member}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-bold text-[10px]"
                      >
                        <User className="w-2.5 h-2.5 text-indigo-500" />
                        {member}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Individual Assignment Student Selector */
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Student Recipient *
              </label>
              <select
                value={selectedStudentName}
                onChange={(e) => setSelectedStudentName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              >
                {students.map((std) => {
                  const name = typeof std === 'string' ? std : std?.name || '';
                  return (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Existing Grade Status Indicator */}
          {existingGradeInfo && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <span>
                Existing recorded mark: <strong>{existingGradeInfo.score}/{maxPoints} pts</strong>
              </span>
              <span className="text-amber-700 dark:text-amber-300 font-bold">
                (Will be updated)
              </span>
            </div>
          )}

          {/* Score Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Awarded Score (0–{maxPoints} Points) *
              </label>
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {scorePercent}% · {gradeLetter}
              </span>
            </div>
            <input
              type="number"
              min="0"
              max={maxPoints}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              required
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Feedback & Commendations */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              Instructor Feedback & Theological Evaluation Notes
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Commendations on doctrinal depth, exegetical clarity, homework remarks..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavedToast}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
            >
              <Save className="w-4 h-4" />
              <span>
                {isGroupAssignment && affectedMembers.length > 1
                  ? `Record Grade for All ${affectedMembers.length} Members`
                  : 'Record Official Grade'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
