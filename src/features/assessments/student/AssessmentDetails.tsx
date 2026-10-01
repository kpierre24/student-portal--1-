import React, { useState } from 'react';
import { ArrowLeft, Clock, Calendar, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { CustomAssignment, AssignmentSubmission } from '../../../types';

export interface AssessmentDetailsProps {
  assignment: CustomAssignment;
  submission?: AssignmentSubmission | null;
  onBack: () => void;
  onSubmit?: (submissionData: { content: string; fileUrl?: string }) => void;
  className?: string;
}

export const AssessmentDetails: React.FC<AssessmentDetailsProps> = ({
  assignment,
  submission,
  onBack,
  onSubmit,
  className = '',
}) => {
  const [content, setContent] = useState(
    submission?.studentTypedResponse || submission?.studentNotes || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmitted = !!submission;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    onSubmit?.({ content });
    setTimeout(() => setIsSubmitting(false), 600);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Assessments
        </Button>
      </div>

      <Card variant="elevated" className="space-y-6">
        <div className="space-y-2 border-b border-[var(--color-border)]/60 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="primary" size="sm">
              {assignment.type === 'quiz' ? 'Quiz Assessment' : 'Course Assignment'}
            </Badge>
            <span className="text-xs text-[var(--color-text-muted)]">•</span>
            <span className="text-xs font-semibold text-[var(--color-primary)] dark:text-sky-400">
              {assignment.moduleTrack || 'Pastoral Leadership'}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">•</span>
            <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              Due: {assignment.dueDate || 'Sep 18, 2026'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text)] dark:text-slate-100 font-sans">
            {assignment.title}
          </h2>
        </div>

        {/* Assignment Prompt / Description */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
            Instructions & Prompt
          </h4>
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-[var(--color-text)] dark:bg-slate-900/40 dark:text-slate-200 border border-[var(--color-border)]/60 dark:border-slate-800 leading-relaxed whitespace-pre-wrap">
            {assignment.description ||
              'Please read the assigned lecture readings and write your reflection essay focusing on biblical principles and personal application.'}
          </div>
        </div>

        {/* Submission Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
              {isSubmitted ? 'Your Submission' : 'Submit Your Response'}
            </h4>

            {isSubmitted && (
              <Badge variant={submission.score !== undefined ? 'success' : 'info'} size="sm">
                {submission.score !== undefined ? `Graded: ${submission.score}%` : 'Submitted'}
              </Badge>
            )}
          </div>

          {isSubmitted && submission.teacherFeedback && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
              <p className="font-bold mb-1">Faculty Feedback:</p>
              <p>{submission.teacherFeedback}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitted && submission.score !== undefined}
              rows={6}
              placeholder="Type or paste your assignment essay, theological reflections, or response here..."
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 text-sm text-[var(--color-text)] placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:outline-hidden dark:bg-slate-900/60 dark:border-slate-800"
            />

            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={onBack}>
                Close
              </Button>

              {(!isSubmitted || submission.score === undefined) && (
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isSubmitting}
                  leftIcon={<Upload className="h-4 w-4" />}
                >
                  {isSubmitted ? 'Update Submission' : 'Submit Assignment'}
                </Button>
              )}
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};
