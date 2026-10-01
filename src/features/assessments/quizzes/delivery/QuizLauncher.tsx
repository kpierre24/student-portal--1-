import React from 'react';
import {
  Clock,
  Award,
  BookOpen,
  User,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  RotateCcw
} from 'lucide-react';
import { Quiz, QuizAttempt } from '../types/quiz.types';
import { QuizLifecycleService } from '../services/quizLifecycleService';

export interface QuizLauncherProps {
  quiz: Quiz;
  studentName?: string;
  studentEmail?: string;
  existingAttempts?: QuizAttempt[];
  onStartAttempt: () => void;
  onViewPreviousAttempt?: (attempt: QuizAttempt) => void;
}

export const QuizLauncher: React.FC<QuizLauncherProps> = ({
  quiz,
  studentName = 'HTEIM Student',
  studentEmail = '',
  existingAttempts = [],
  onStartAttempt,
  onViewPreviousAttempt
}) => {
  const attemptCheck = QuizLifecycleService.canStartAttempt(quiz, existingAttempts);
  const completedAttempts = existingAttempts.filter(
    a => a.status === 'SUBMITTED' || a.status === 'AUTO_SUBMITTED' || a.status === 'GRADED' || a.status === 'RELEASED'
  );

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
      
      {/* Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-xl">
          {quiz.courseCode} • {quiz.moduleTrack || 'School of Ministry'}
        </span>
        {quiz.dueDate && (
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Due {quiz.dueDate}
          </span>
        )}
      </div>

      {/* Title & Description */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
          {quiz.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {quiz.description}
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
          <span className="block text-base font-black text-slate-900 dark:text-slate-100">
            {quiz.questions?.length || 0}
          </span>
          <span className="text-[10px] font-bold uppercase text-slate-400">Questions</span>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
          <span className="block text-base font-black text-slate-900 dark:text-slate-100">
            {quiz.totalPoints || 100}
          </span>
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Points</span>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
          <span className="block text-base font-black text-slate-900 dark:text-slate-100">
            {quiz.settings?.timeLimitMinutes ? `${quiz.settings.timeLimitMinutes}m` : 'Untimed'}
          </span>
          <span className="text-[10px] font-bold uppercase text-slate-400">Time Limit</span>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
          <span className="block text-base font-black text-slate-900 dark:text-slate-100">
            {quiz.settings?.passingScorePercentage || 75}%
          </span>
          <span className="text-[10px] font-bold uppercase text-slate-400">Passing Score</span>
        </div>
      </div>

      {/* Instructions Box */}
      {quiz.instructions && (
        <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Assessment Instructions
          </h4>
          <p className="text-xs text-amber-800 dark:text-amber-200/80 leading-relaxed whitespace-pre-line">
            {quiz.instructions}
          </p>
        </div>
      )}

      {/* Previous Submissions / Attempts Section */}
      {completedAttempts.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Your Previous Attempts ({completedAttempts.length})
          </h4>
          <div className="space-y-2">
            {completedAttempts.map((att, idx) => (
              <div
                key={att.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Attempt #{idx + 1}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-2">
                    {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black ${
                    att.percentage >= (quiz.settings?.passingScorePercentage || 75)
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {att.score} / {att.maxPoints} ({att.percentage}%)
                  </span>
                  {onViewPreviousAttempt && (
                    <button
                      onClick={() => onViewPreviousAttempt(att)}
                      className="px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      View Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action / Launch Button */}
      <div className="pt-3">
        {attemptCheck.allowed ? (
          <button
            onClick={onStartAttempt}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-sm rounded-2xl transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {completedAttempts.length > 0 ? 'Start Another Attempt' : 'Begin Assessment'}
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-1">
            <ShieldAlert className="w-5 h-5 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {attemptCheck.reason || 'Quiz is currently not available for attempts.'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
