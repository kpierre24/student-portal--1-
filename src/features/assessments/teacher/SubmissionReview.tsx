import React, { useState } from 'react';
import { CheckCircle2, Clock, Save, FileText, User, ArrowRight, Users } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { AssignmentSubmission, CustomAssignment } from '../../../types';

export interface SubmissionReviewProps {
  submissions: AssignmentSubmission[];
  assignments: CustomAssignment[];
  onGradeSubmission?: (submissionId: string, score: number, feedback: string) => void;
  className?: string;
}

export const SubmissionReview: React.FC<SubmissionReviewProps> = ({
  submissions = [],
  assignments = [],
  onGradeSubmission,
  className = '',
}) => {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<number>(85);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [viewFilter, setViewFilter] = useState<'pending' | 'graded'>('pending');

  const assignmentLookup = new Map<string, CustomAssignment>();
  assignments.forEach((a) => assignmentLookup.set(a.id, a));

  const pendingSubmissions = submissions.filter((s) => s.score === undefined);
  const reviewedSubmissions = submissions.filter((s) => s.score !== undefined);

  const displayedList = viewFilter === 'pending' ? pendingSubmissions : reviewedSubmissions;

  const activeSubmission = submissions.find((s) => s.id === selectedSubmissionId);
  const activeAssignment = activeSubmission ? assignmentLookup.get(activeSubmission.assignmentId) : null;

  const handleStartGrading = (sub: AssignmentSubmission) => {
    setSelectedSubmissionId(sub.id);
    setScoreInput(sub.score !== undefined ? sub.score : 85);
    setFeedbackInput(sub.teacherFeedback || '');
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmissionId) return;
    onGradeSubmission?.(selectedSubmissionId, scoreInput, feedbackInput);
    setSelectedSubmissionId(null);
    setFeedbackInput('');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Active Grading Panel */}
      {activeSubmission && (
        <Card variant="elevated" className="border-2 border-sky-500/40 p-5 space-y-4 shadow-md bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Grading: {activeSubmission.studentName}
                </h4>
                {(activeSubmission.isGroupSubmission || activeAssignment?.isGroupAssignment) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                    <Users className="w-3 h-3" />
                    Group Assignment
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {activeAssignment?.title || 'Coursework Submission'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedSubmissionId(null)}>
              Cancel
            </Button>
          </div>

          {(activeSubmission.isGroupSubmission || activeAssignment?.isGroupAssignment) && (
            <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Group Marks Sync Active</span>
              </div>
              <p className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300">
                This is a Group Assignment ({activeSubmission.groupName || activeAssignment?.groups?.find(g => activeSubmission.studentName && g.memberNames.some(m => m.toLowerCase().trim() === (activeSubmission.studentName || '').toLowerCase().trim()))?.groupName || 'Group'}).
                The score and feedback saved here will automatically be awarded to all group members
                {activeSubmission.groupMembers || activeAssignment?.groups?.find(g => activeSubmission.studentName && g.memberNames.some(m => m.toLowerCase().trim() === (activeSubmission.studentName || '').toLowerCase().trim()))?.memberNames
                  ? ` (${(activeSubmission.groupMembers || activeAssignment?.groups?.find(g => activeSubmission.studentName && g.memberNames.some(m => m.toLowerCase().trim() === (activeSubmission.studentName || '').toLowerCase().trim()))?.memberNames)?.join(', ')})`
                  : ''}.
              </p>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-h-48 overflow-y-auto border border-slate-200/60 dark:border-slate-700/60">
            <span className="font-bold block text-[10px] uppercase text-slate-400 mb-1">Student Response</span>
            {activeSubmission.studentTypedResponse || activeSubmission.studentNotes || 'No typed text content provided with this submission.'}
          </div>

          <form onSubmit={handleSaveGrade} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Score (0–100%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={scoreInput}
                  onChange={(e) => setScoreInput(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Instructor Commendations & Corrections
                </label>
                <input
                  type="text"
                  placeholder="Doctrinal commendations, constructive feedback, encouragement..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                type="submit"
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                Record Official Grade
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Submissions Filter Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => setViewFilter('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewFilter === 'pending'
                ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Awaiting Review ({pendingSubmissions.length})
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('graded')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewFilter === 'graded'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Completed Grades ({reviewedSubmissions.length})
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {displayedList.length} submissions in view
        </span>
      </div>

      {/* List of Submissions */}
      {displayedList.length === 0 ? (
        <Card className="text-center py-10 space-y-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {viewFilter === 'pending' ? 'All student submissions are graded!' : 'No graded submissions on record.'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {viewFilter === 'pending'
              ? 'New student submissions will automatically appear here when turned in.'
              : 'Grade student papers to build the official grading history.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {displayedList.map((sub) => {
            const assignment = assignmentLookup.get(sub.assignmentId);
            const isGraded = sub.score !== undefined;

            return (
              <div
                key={sub.id}
                className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {sub.studentName}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {assignment?.title || 'Module Assessment'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Recent'}
                    </span>
                    {isGraded && (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        Score: {sub.score}%
                      </span>
                    )}
                    {sub.teacherFeedback && (
                      <span className="truncate max-w-xs text-slate-500 italic">
                        "{sub.teacherFeedback}"
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={isGraded ? 'outline' : 'primary'}
                  onClick={() => handleStartGrading(sub)}
                  className="shrink-0 text-xs py-1.5"
                >
                  {isGraded ? 'Update Grade' : 'Grade Submission'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
