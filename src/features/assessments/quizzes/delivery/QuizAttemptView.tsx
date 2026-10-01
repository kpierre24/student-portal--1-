import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Flag,
  ArrowLeft,
  ArrowRight,
  Send,
  Save,
  Check,
  RotateCcw,
  X,
  FileText
} from 'lucide-react';
import { Quiz, QuizAttempt, QuizQuestion } from '../types/quiz.types';
import { useQuizAttempt } from '../hooks/useQuizAttempt';
import { QuizResultsView } from './QuizResultsView';

export interface QuizAttemptViewProps {
  quiz: Quiz;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  existingAttempt?: QuizAttempt | null;
  onAutosave?: (attempt: QuizAttempt) => Promise<void> | void;
  onSubmitAttempt?: (attempt: QuizAttempt) => Promise<QuizAttempt> | QuizAttempt | void;
  onClose?: () => void;
}

export const QuizAttemptView: React.FC<QuizAttemptViewProps> = ({
  quiz,
  studentId,
  studentName = 'HTEIM Student',
  studentEmail = '',
  existingAttempt,
  onAutosave,
  onSubmitAttempt,
  onClose
}) => {
  const attempt = useQuizAttempt({
    quiz,
    studentId,
    studentName,
    studentEmail,
    existingAttempt,
    onAutosave,
    onSubmitAttempt
  });

  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // If already submitted or finished, render results view
  if (attempt.submissionResult) {
    return (
      <QuizResultsView
        quiz={quiz}
        attempt={attempt.submissionResult}
        onClose={onClose}
      />
    );
  }

  const currentQ: QuizQuestion | undefined = attempt.displayedQuestions[attempt.activeQuestionIndex];
  const currentAnswer = currentQ ? attempt.responses[currentQ.id] : undefined;
  const isFlagged = currentQ ? Boolean(attempt.flaggedQuestions[currentQ.id]) : false;

  // Format countdown timer
  const formatTimer = (totalSeconds: number | null) => {
    if (totalSeconds === null) return 'Untimed';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isTimeRunningLow = attempt.secondsRemaining !== null && attempt.secondsRemaining < 300; // < 5 mins

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Sticky Quiz Header & Timer Bar */}
      <div className="sticky top-2 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
        
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs">
            {attempt.activeQuestionIndex + 1}/{attempt.totalQuestions}
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
              {quiz.title}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Student: <span className="font-bold text-slate-700 dark:text-slate-300">{studentName}</span>
            </p>
          </div>
        </div>

        {/* Center: Timer & Autosave Status */}
        <div className="flex items-center gap-4">
          {attempt.secondsRemaining !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black ${
              isTimeRunningLow
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(attempt.secondsRemaining)}</span>
            </div>
          )}

          {/* Autosave badge */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400">
            {attempt.saveState === 'saving' ? (
              <span className="text-amber-500 font-bold">Saving...</span>
            ) : attempt.saveState === 'error' ? (
              <span className="text-rose-500 font-bold">Offline draft</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="w-3 h-3" />
                Saved ({attempt.secondsSinceLastSave}s ago)
              </span>
            )}
          </div>
        </div>

        {/* Finish / Submit Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Submit Assessment
          </button>
        </div>

      </div>

      {/* Progress & Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            Answered: {attempt.answeredCount} / {attempt.totalQuestions}
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {Math.round((attempt.answeredCount / (attempt.totalQuestions || 1)) * 100)}% Completed
          </span>
        </div>

        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${(attempt.answeredCount / (attempt.totalQuestions || 1)) * 100}%` }}
          />
        </div>

        {/* Quick jump question numbers */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {attempt.displayedQuestions.map((q, idx) => {
            const isAns = attempt.responses[q.id] !== undefined && attempt.responses[q.id] !== '';
            const isCurr = attempt.activeQuestionIndex === idx;
            const isFlg = Boolean(attempt.flaggedQuestions[q.id]);

            return (
              <button
                key={q.id}
                onClick={() => attempt.setActiveQuestionIndex(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-black transition-all relative cursor-pointer ${
                  isCurr
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 ring-2 ring-amber-500'
                    : isAns
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {idx + 1}
                {isFlg && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card */}
      {currentQ && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md">
          
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
                Question {attempt.activeQuestionIndex + 1} of {attempt.totalQuestions}
              </span>
              <span className="text-xs font-bold text-slate-400">
                ({currentQ.weight || 10} Points)
              </span>
            </div>

            <button
              type="button"
              onClick={() => attempt.toggleFlagQuestion(currentQ.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isFlagged
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-500' : ''}`} />
              {isFlagged ? 'Flagged for Review' : 'Flag Question'}
            </button>
          </div>

          {/* Prompt */}
          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
              {currentQ.questionText}
            </h2>
            {currentQ.imageUrl && (
              <img
                src={currentQ.imageUrl}
                alt="Question diagram"
                className="max-h-64 rounded-2xl border border-slate-200 dark:border-slate-800 object-cover"
              />
            )}
          </div>

          {/* Answer Input Controls */}
          <div className="space-y-3 pt-2">
            
            {/* Multiple Choice & True/False */}
            {(currentQ.type === 'multiple_choice' || currentQ.type === 'true_false') && (
              <div className="space-y-2.5">
                {(currentQ.options || []).map(opt => {
                  const isSelected = currentAnswer === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => attempt.setQuestionAnswer(currentQ.id, opt.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-sm ring-1 ring-amber-500'
                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100/60 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`resp_${currentQ.id}`}
                        checked={isSelected}
                        onChange={() => attempt.setQuestionAnswer(currentQ.id, opt.id)}
                        className="w-4 h-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                        {opt.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Checkboxes (Multi-Select) */}
            {currentQ.type === 'checkboxes' && (
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block mb-1">
                  Select all choices that apply:
                </span>
                {(currentQ.options || []).map(opt => {
                  const selectedArray: string[] = Array.isArray(currentAnswer) ? currentAnswer : [];
                  const isChecked = selectedArray.includes(opt.id);

                  return (
                    <div
                      key={opt.id}
                      onClick={() => {
                        const next = isChecked
                          ? selectedArray.filter(id => id !== opt.id)
                          : [...selectedArray, opt.id];
                        attempt.setQuestionAnswer(currentQ.id, next);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                        isChecked
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-sm ring-1 ring-amber-500'
                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100/60 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                        {opt.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Short Answer / Fill in blank */}
            {(currentQ.type === 'short_answer' || currentQ.type === 'fill_blank') && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Your Answer:
                </label>
                <input
                  type="text"
                  value={currentAnswer || ''}
                  onChange={e => attempt.setQuestionAnswer(currentQ.id, e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            )}

            {/* Essay / Open Reflection */}
            {currentQ.type === 'paragraph' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Your Reflection / Theological Analysis:
                </label>
                <textarea
                  rows={6}
                  value={currentAnswer || ''}
                  onChange={e => attempt.setQuestionAnswer(currentQ.id, e.target.value)}
                  placeholder="Provide a thorough, reasoned response with biblical citations where applicable..."
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Words: {typeof currentAnswer === 'string' && currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0}</span>
                  <span>Characters: {typeof currentAnswer === 'string' ? currentAnswer.length : 0}</span>
                </div>
              </div>
            )}

          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5">
            <button
              type="button"
              disabled={attempt.activeQuestionIndex === 0}
              onClick={() => attempt.setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            {attempt.activeQuestionIndex < attempt.totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() => attempt.setActiveQuestionIndex(prev => Math.min(attempt.totalQuestions - 1, prev + 1))}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-colors flex items-center gap-2 cursor-pointer"
              >
                Next Question
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 flex items-center gap-2 cursor-pointer"
              >
                Review & Submit
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                Confirm Assessment Submission
              </h3>
              <button onClick={() => setShowSubmitModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Total Questions:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{attempt.totalQuestions}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Answered:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{attempt.answeredCount}</span>
                </div>
                {attempt.unansweredCount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Unanswered:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{attempt.unansweredCount}</span>
                  </div>
                )}
              </div>

              {attempt.unansweredCount > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>You have {attempt.unansweredCount} unanswered question(s). Are you sure you want to proceed?</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Return to Quiz
              </button>
              <button
                type="button"
                disabled={attempt.isSubmitting}
                onClick={() => {
                  setShowSubmitModal(false);
                  attempt.handleFinalSubmit(false);
                }}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-600/20"
              >
                {attempt.isSubmitting ? 'Submitting...' : 'Yes, Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
