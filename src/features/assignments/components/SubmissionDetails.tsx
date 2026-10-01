import React, { useState, useEffect } from 'react';
import {
  FileText,
  User,
  Calendar,
  Award,
  Paperclip,
  CheckCircle2,
  Clock,
  Download,
  Save,
  MessageSquare,
  UploadCloud,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { AssignmentSubmission, CustomAssignment } from '../../../types';
import { GradeFormData } from '../types';

interface SubmissionDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  submission: AssignmentSubmission | null;
  assignment?: CustomAssignment | null;
  onGradeSubmit: (gradeData: GradeFormData) => void;
}

export const SubmissionDetails: React.FC<SubmissionDetailsProps> = ({
  isOpen,
  onClose,
  submission,
  assignment,
  onGradeSubmit,
}) => {
  const [score, setScore] = useState<number>(100);
  const [feedback, setFeedback] = useState<string>('');
  const [teacherCorrectedUrl, setTeacherCorrectedUrl] = useState<string>('');
  const [teacherCorrectedName, setTeacherCorrectedName] = useState<string>('');
  const [status, setStatus] = useState<GradeFormData['status']>('Graded');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (submission) {
      const maxPts = assignment?.maxPoints || 100;
      setScore(typeof submission.score === 'number' ? submission.score : maxPts);
      setFeedback(submission.teacherFeedback || '');
      setTeacherCorrectedUrl(submission.teacherCorrectedFileUrl || '');
      setTeacherCorrectedName(submission.teacherCorrectedFileName || '');
      setStatus((submission.status as GradeFormData['status']) || 'Graded');
      setError(null);
    }
  }, [submission, assignment, isOpen]);

  if (!submission) return null;

  const maxPoints = assignment?.maxPoints || 100;
  const studentName = submission.studentName || submission.student?.name || 'Student';

  const handleSubmitGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (score < 0 || score > maxPoints) {
      setError(`Score must be between 0 and ${maxPoints}`);
      return;
    }

    onGradeSubmit({
      submissionId: submission.id,
      score: Number(score),
      teacherFeedback: feedback.trim(),
      teacherCorrectedFileUrl: teacherCorrectedUrl || undefined,
      teacherCorrectedFileName: teacherCorrectedName || undefined,
      status,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Review & Grade Submission</span>
        </div>
      }
      size="2xl"
    >
      <div className="space-y-6">
        {/* Student & Submission Info Banner */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{studentName}</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assignment: <span className="font-semibold text-slate-700 dark:text-slate-200">{assignment?.title || 'Coursework Submission'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Submitted:{' '}
                {submission.submittedAt
                  ? new Date(submission.submittedAt).toLocaleString()
                  : 'N/A'}
              </span>
            </div>

            <div className="px-2.5 py-1 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
              Max Points: {maxPoints}
            </div>
          </div>
        </div>

        {/* Student Work Section */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Student Submission Artifacts
          </h4>

          {/* Student File Attachment */}
          {(submission.studentFileUrl || submission.studentFileName) && (
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {submission.studentFileName || 'Student_Submission_Document.pdf'}
                </span>
              </div>
              <a
                href={submission.studentFileUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open / Download</span>
              </a>
            </div>
          )}

          {/* Student Typed Response / Notes */}
          {submission.studentTypedResponse && (
            <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              <p className="font-semibold text-slate-500 mb-1">Typed Submission:</p>
              {submission.studentTypedResponse}
            </div>
          )}

          {submission.studentNotes && (
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 dark:border-amber-900/40 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-amber-700 dark:text-amber-400">Student Note: </span>
              {submission.studentNotes}
            </div>
          )}

          {!submission.studentFileUrl && !submission.studentTypedResponse && !submission.studentNotes && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs text-slate-400 italic">
              No files or text attachments provided with this submission record.
            </div>
          )}
        </div>

        {/* Teacher Grading & Feedback Form */}
        <form onSubmit={handleSubmitGrade} className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Faculty Evaluation & Correction
          </h4>

          {/* Score Input & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Score Earned (Out of {maxPoints}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Award className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  max={maxPoints}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lifecycle Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as GradeFormData['status'])}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Graded">Graded (Final)</option>
                <option value="Correction Returned">Correction Returned to Student</option>
                <option value="Pending Review">Pending Additional Review</option>
              </select>
            </div>
          </div>

          {/* Feedback Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Faculty Feedback & Comments
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback, commentary, biblical hermeneutic guidance..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Corrected Document Upload Link */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Attach Corrected Essay / Annotated Feedback File (Optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Corrected File Name (e.g., Graded_Paper.pdf)"
                value={teacherCorrectedName}
                onChange={(e) => setTeacherCorrectedName(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none"
              />
              <input
                type="url"
                placeholder="File URL / Cloud Link"
                value={teacherCorrectedUrl}
                onChange={(e) => setTeacherCorrectedUrl(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save & Submit Grade</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
