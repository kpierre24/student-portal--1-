import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  User, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Download, 
  MessageSquare, 
  Save, 
  Award,
  AlertCircle
} from 'lucide-react';
import { CustomAssignment, AssignmentSubmission } from '../../../types';
import { UserRole } from '../../../lib/userAuth';

interface ExamDetailsProps {
  assignment: CustomAssignment;
  submission?: AssignmentSubmission | null;
  userRole?: UserRole;
  currentStudentName?: string;
  onGradeSubmission?: (submissionId: string, score: number, feedback: string) => void;
  onClose: () => void;
}

export const ExamDetails: React.FC<ExamDetailsProps> = ({
  assignment,
  submission,
  userRole = 'admin',
  currentStudentName,
  onGradeSubmission,
  onClose
}) => {
  const isTeacherOrAdmin = userRole === 'admin' || userRole === 'teacher';
  
  const [score, setScore] = useState<number>(submission?.score ?? 0);
  const [feedback, setFeedback] = useState<string>(submission?.teacherFeedback ?? '');
  const [saving, setSaving] = useState(false);

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission?.id || !onGradeSubmission) return;
    setSaving(true);
    onGradeSubmission(submission.id, Number(score), feedback);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">{assignment.title}</h3>
              <p className="text-xs text-slate-500 font-mono">{assignment.courseCode} • {assignment.moduleTrack}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Assignment Description */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Assignment Overview & Prompt</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {assignment.description || 'No specific prompt recorded.'}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700">
              <span>Due: <strong>{assignment.dueDate}</strong></span>
              <span>Total Points: <strong>{assignment.maxPoints} pts</strong></span>
            </div>
          </div>

          {/* Submission Details */}
          {submission ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-900 dark:text-white">{submission.studentName}</span>
                </div>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Submitted: {submission.submittedAt}
                </span>
              </div>

              {submission.studentNotes && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/40 text-xs text-blue-950 dark:text-blue-200">
                  <p className="font-semibold mb-1">Student Notes:</p>
                  <p>{submission.studentNotes}</p>
                </div>
              )}

              {submission.studentFileName && (
                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>{submission.studentFileName}</span>
                  </div>
                  {submission.studentFileUrl && (
                    <a
                      href={submission.studentFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  )}
                </div>
              )}

              {/* Grading Section */}
              {isTeacherOrAdmin && onGradeSubmission ? (
                <form onSubmit={handleSaveGrade} className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Score (/{assignment.maxPoints})
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={assignment.maxPoints}
                        value={score}
                        onChange={(e) => setScore(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Instructor Evaluation & Feedback
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={3}
                      placeholder="Add commendations, scriptural corrections, and grading breakdown..."
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Update Grade & Feedback'}
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Evaluated Grade
                    </span>
                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                      {submission.score} / {assignment.maxPoints} pts
                    </span>
                  </div>
                  {submission.teacherFeedback && (
                    <div className="text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-emerald-200 dark:border-emerald-800/40">
                      <p className="font-semibold mb-1">Instructor Feedback:</p>
                      <p>{submission.teacherFeedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No Submission on File</p>
              <p className="text-xs text-slate-400 mt-1">Student has not yet submitted their assignment file or quiz response.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
