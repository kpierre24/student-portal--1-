import React from 'react';
import { motion } from 'motion/react';
import { X, BookOpen, ArrowRight } from 'lucide-react';

export interface FloatingQuizBannerProps {
  appUser: any;
  activeQuizzesList: any[];
  showFloatingQuizBanner: boolean;
  onDismiss: () => void;
  onTakeQuiz: () => void;
}

export function FloatingQuizBanner({
  appUser,
  activeQuizzesList,
  showFloatingQuizBanner,
  onDismiss,
  onTakeQuiz,
}: FloatingQuizBannerProps) {
  if (appUser?.role !== 'student' || activeQuizzesList.length === 0 || !showFloatingQuizBanner) {
    return null;
  }

  const currentQuiz = activeQuizzesList[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: [1, 1.02, 1],
        borderColor: [
          'rgba(192, 132, 252, 0.6)',
          'rgba(251, 191, 36, 0.9)',
          'rgba(192, 132, 252, 0.6)'
        ],
        boxShadow: [
          '0 20px 25px -5px rgba(147, 51, 234, 0.3), 0 8px 10px -6px rgba(147, 51, 234, 0.2)',
          '0 25px 35px -5px rgba(245, 158, 11, 0.5), 0 10px 15px -6px rgba(168, 85, 247, 0.4)',
          '0 20px 25px -5px rgba(147, 51, 234, 0.3), 0 8px 10px -6px rgba(147, 51, 234, 0.2)'
        ]
      }}
      transition={{
        opacity: { duration: 0.3 },
        y: { duration: 0.3 },
        scale: { repeat: Infinity, duration: 2.8, ease: 'easeInOut' },
        borderColor: { repeat: Infinity, duration: 2.8, ease: 'easeInOut' },
        boxShadow: { repeat: Infinity, duration: 2.8, ease: 'easeInOut' }
      }}
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-80 bg-slate-900/95 dark:bg-purple-950/95 backdrop-blur-md text-white p-4 rounded-xl border shadow-xl flex flex-col gap-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <span className="tracking-wide">Active Class Day Quiz Live</span>
        </div>
        <button 
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          title="Dismiss floating banner"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div>
        <h4 className="text-sm font-black text-white line-clamp-1 leading-tight">
          {currentQuiz.title}
        </h4>
        <p className="text-[11px] text-purple-200/90 mt-1 font-medium">
          {currentQuiz.maxPoints} Points Max • {currentQuiz.quizData?.timeLimitMinutes ? `${currentQuiz.quizData.timeLimitMinutes} min limit` : 'Timed Quiz'}
        </p>
      </div>
      <button
        onClick={onTakeQuiz}
        className="w-full mt-0.5 px-3.5 py-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:opacity-80"
      >
        <BookOpen className="w-4 h-4 text-slate-950 shrink-0" />
        <span>Take Active Quiz Now</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-950 shrink-0" />
      </button>
    </motion.div>
  );
}

export default FloatingQuizBanner;
