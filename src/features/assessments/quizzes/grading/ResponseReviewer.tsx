import React from 'react';
import {
  X,
  Award,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Save,
  Send,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Sliders
} from 'lucide-react';
import { Quiz, QuizAttempt, QuizGrade } from '../types/quiz.types';
import { useQuizGrading } from '../hooks/useQuizGrading';
import { UserRole } from '../../../../types/rbac';

export interface ResponseReviewerProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
  attempt: QuizAttempt;
  userRole: UserRole;
  onSaveGrade?: (attempt: QuizAttempt, grade: QuizGrade) => Promise<void> | void;
}

export const ResponseReviewer: React.FC<ResponseReviewerProps> = ({
  isOpen,
  onClose,
  quiz,
  attempt: initialAttempt,
  userRole,
  onSaveGrade
}) => {
  const grading = useQuizGrading({
    quiz,
    initialAttempt,
    userRole,
    onSaveGrade
  });

  if (!isOpen) return null;

  const currentQ = quiz.questions.find(q => q.id === grading.activeQuestionId) || quiz.questions[0];
  const currentResp = grading.attempt.responses.find(r => r.questionId === currentQ?.id);
  const maxPoints = Number(currentQ?.weight) || 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              HTEIM Faculty Submission Review
            </span>
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
              {grading.attempt.studentName} • {quiz.title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-800 dark:text-amber-200 text-xs font-black">
              <Award className="w-3.5 h-3.5" />
              <span>{grading.attempt.score} / {grading.attempt.maxPoints} ({grading.attempt.percentage}%)</span>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Question Selector Jump Bar */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            {quiz.questions.map((q, idx) => {
              const resp = grading.attempt.responses.find(r => r.questionId === q.id);
              const isActive = q.id === currentQ?.id;
              const isCorrect = resp?.isCorrect;

              return (
                <button
                  key={q.id}
                  onClick={() => grading.setActiveQuestionId(q.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : isCorrect
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <span>Q{idx + 1}</span>
                  <span className="text-[10px] opacity-75">({resp?.finalScore ?? 0}p)</span>
                </button>
              );
            })}
          </div>

          {/* Active Question Grading Panel */}
          {currentQ && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {currentQ.type.replace('_', ' ')} (Max {maxPoints} Points)
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Auto Score: {currentResp?.autoScore ?? 0} pts
                </span>
              </div>

              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {currentQ.questionText}
              </p>

              {/* Student Given Answer */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">Student Response:</span>
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {currentResp?.selectedOptionId ? (
                    currentQ.options?.find(o => o.id === currentResp.selectedOptionId)?.text || currentResp.selectedOptionId
                  ) : currentResp?.selectedOptionIds && currentResp.selectedOptionIds.length > 0 ? (
                    currentResp.selectedOptionIds.map(id => currentQ.options?.find(o => o.id === id)?.text || id).join(', ')
                  ) : (
                    currentResp?.textAnswer || currentResp?.answer || '(No response submitted)'
                  )}
                </div>
              </div>

              {/* Teacher Score Override & Question Feedback */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Awarded Score (0 - {maxPoints})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={maxPoints}
                    value={currentResp?.teacherScore !== undefined ? currentResp.teacherScore : currentResp?.finalScore || 0}
                    onChange={e => grading.updateQuestionGrade(currentQ.id, { teacherScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Teacher Notes for Question
                  </label>
                  <input
                    type="text"
                    value={currentResp?.teacherFeedback || ''}
                    onChange={e => grading.updateQuestionGrade(currentQ.id, { teacherFeedback: e.target.value })}
                    placeholder="Specific comments on this question..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

            </div>
          )}

          {/* Overall Teacher Comments */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Overall Assessment Feedback & Encouragement
            </label>
            <textarea
              rows={3}
              value={grading.overallFeedback}
              onChange={e => grading.setOverallFeedback(e.target.value)}
              placeholder="Provide encouraging and constructive evaluation for the student..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            {grading.saveSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Grades Saved
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={grading.saveGrades}
              disabled={grading.isSaving}
              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Grading Review
            </button>
            <button
              onClick={grading.releaseGrade}
              disabled={grading.isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              Release Grade to Student
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
