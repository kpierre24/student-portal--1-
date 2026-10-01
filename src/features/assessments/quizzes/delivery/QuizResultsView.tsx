import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  MessageSquare,
  RotateCcw,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  HelpCircle,
  FileText
} from 'lucide-react';
import { Quiz, QuizAttempt, QuizQuestion, QuizResponse } from '../types/quiz.types';

export interface QuizResultsViewProps {
  quiz: Quiz;
  attempt: QuizAttempt;
  onRetake?: () => void;
  onClose?: () => void;
}

export const QuizResultsView: React.FC<QuizResultsViewProps> = ({
  quiz,
  attempt,
  onRetake,
  onClose
}) => {
  const passingScore = quiz.settings?.passingScorePercentage || 75;
  const isPassed = attempt.percentage >= passingScore;
  const showAnswers = quiz.settings?.showCorrectAnswers !== false;
  const showFeedback = quiz.settings?.showFeedback !== false;

  const [filter, setFilter] = useState<'all' | 'missed' | 'correct'>('all');

  const questionMap = new Map<string, QuizQuestion>();
  (quiz.questions || []).forEach(q => questionMap.set(q.id, q));

  const filteredResponses = (attempt.responses || []).filter(r => {
    if (filter === 'correct') return r.isCorrect;
    if (filter === 'missed') return !r.isCorrect;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Top Banner Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 ${
        isPassed
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
      }`}>
        <div className="space-y-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl ${
              isPassed
                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
            }`}>
              {isPassed ? 'Satisfactory / Passed' : 'Needs Review / At-Risk'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              Passing Mark: {passingScore}%
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
            Assessment Completed
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            {quiz.title} • Student: <span className="font-bold">{attempt.studentName}</span>
          </p>
        </div>

        {/* Score Ring / Block */}
        <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md min-w-[150px]">
          <span className={`text-3xl sm:text-4xl font-black ${
            isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {attempt.percentage}%
          </span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            {attempt.score} / {attempt.maxPoints} Points
          </span>
        </div>
      </div>

      {/* Teacher Feedback Alert if present */}
      {(attempt.teacherFeedback || attempt.feedback) && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-amber-600" />
            Faculty Feedback & Notes
          </h4>
          <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200/90 leading-relaxed whitespace-pre-line">
            {attempt.teacherFeedback || attempt.feedback}
          </p>
        </div>
      )}

      {/* Question Responses Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
              Question-by-Question Review
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredResponses.length} of {attempt.responses.length} responses
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            {(['all', 'missed', 'correct'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                  filter === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredResponses.map((resp, idx) => {
            const q = questionMap.get(resp.questionId);
            const isCorrect = resp.isCorrect;
            const maxWeight = Number(q?.weight) || 10;

            return (
              <div
                key={resp.questionId || idx}
                className={`p-5 rounded-2xl border transition-all ${
                  isCorrect
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                      Question #{idx + 1}
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {resp.finalScore} / {maxWeight} pts
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">
                  {q?.questionText || 'Question prompt'}
                </p>

                {/* Given Answer */}
                <div className="space-y-1 text-xs bg-white dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-slate-500 dark:text-slate-400 font-bold">Your Response:</div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {resp.selectedOptionId ? (
                      q?.options?.find(o => o.id === resp.selectedOptionId)?.text || resp.selectedOptionId
                    ) : resp.selectedOptionIds && resp.selectedOptionIds.length > 0 ? (
                      resp.selectedOptionIds.map(id => q?.options?.find(o => o.id === id)?.text || id).join(', ')
                    ) : (
                      resp.textAnswer || resp.answer || '(No answer provided)'
                    )}
                  </div>
                </div>

                {/* Correct answer & explanation if permitted */}
                {showAnswers && !isCorrect && (q?.correctOptionId || q?.acceptableAnswers) && (
                  <div className="mt-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                    <span className="font-bold">Correct Answer: </span>
                    {q.correctOptionId ? (
                      q.options?.find(o => o.id === q.correctOptionId)?.text || q.correctOptionId
                    ) : q.acceptableAnswers ? (
                      q.acceptableAnswers.join(' or ')
                    ) : ''}
                  </div>
                )}

                {showFeedback && (q?.explanation || resp.explanation) && (
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Explanation: </span>
                    {q?.explanation || resp.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onClose && (
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close Review
          </button>
        )}

        <div className="flex items-center gap-2">
          {onRetake && (
            <button
              onClick={onRetake}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retake Assessment
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
