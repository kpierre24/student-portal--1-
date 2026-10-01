import React from 'react';
import { QuizAssignment, QuizSubmission } from '../types';
import { QuizTakerView } from './QuizTakerView';
import { scrubQuizForClient } from '../data/quizTemplates';
import { GraduationCap, ArrowLeft, Share2, CheckCircle, AlertCircle, Loader2, Home } from 'lucide-react';

export interface PublicQuizPageProps {
  quiz?: QuizAssignment | null;
  isLoading?: boolean;
  isNotFound?: boolean;
  errorMessage?: string;
  studentRoster?: { name: string }[];
  currentStudentName?: string;
  onSubmitResponse?: (submission: QuizSubmission) => void;
  onClose: () => void;
}

export const PublicQuizPage: React.FC<PublicQuizPageProps> = ({
  quiz,
  isLoading = false,
  isNotFound = false,
  errorMessage,
  studentRoster = [],
  currentStudentName,
  onSubmitResponse,
  onClose,
}) => {
  const shareUrl = quiz ? `${window.location.origin}${window.location.pathname}?quiz=${quiz.shareCode || quiz.id}` : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    if ((window as any).triggerPortalToast) {
      (window as any).triggerPortalToast('success', 'Link Copied', 'Shareable quiz link copied to clipboard!');
    }
  };

  // 1. Loading State UI
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-purple-500 selection:text-white">
        <header className="bg-slate-950/90 border-b border-purple-900/40 px-4 py-3.5 shadow-xl">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 p-0.5 shadow-lg">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-purple-400 uppercase">HTEIM School of Ministry</span>
                <h1 className="text-sm font-black text-white">Public Assessment</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-xl w-full mx-auto p-6 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Loading Assessment...</h2>
          <p className="text-sm text-slate-400">Verifying link validity and loading curriculum questions.</p>
        </main>

        <footer className="bg-slate-950 border-t border-slate-900 py-4 px-4 text-center text-xs text-slate-500">
          <p>© 2026 Heaven Touching Earth International Ministries (HTEIM) School of Ministry.</p>
        </footer>
      </div>
    );
  }

  // 2. Quiz Not Found / Invalid / Expired State UI
  if (isNotFound || !quiz) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-purple-500 selection:text-white">
        <header className="bg-slate-950/90 border-b border-slate-800 px-4 py-3.5 shadow-xl">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 p-0.5 shadow-lg">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">HTEIM School of Ministry</span>
                <h1 className="text-sm font-black text-white">Public Assessment Portal</h1>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Portal</span>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-lg w-full mx-auto p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 mb-5 shadow-2xl shadow-rose-950/50">
            <AlertCircle className="w-8 h-8" />
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-950/90 text-rose-300 border border-rose-800/80 uppercase tracking-wider mb-3">
            Quiz Unavailable
          </span>

          <h2 className="text-2xl font-black text-white mb-3 tracking-tight">
            Assessment Not Found
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed mb-8 bg-slate-950/60 p-4 rounded-xl border border-slate-800 w-full">
            {errorMessage || 'The requested assessment link is invalid, expired, or has been revoked by the instructor.'}
          </p>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Return to HTEIM Ministry Portal Home</span>
          </button>
        </main>

        <footer className="bg-slate-950 border-t border-slate-900 py-4 px-4 text-center text-xs text-slate-500">
          <p>© 2026 Heaven Touching Earth International Ministries (HTEIM) School of Ministry.</p>
        </footer>
      </div>
    );
  }

  // 3. Valid Active Quiz UI
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      {/* Top Branding Banner for External Users */}
      <header className="bg-slate-950/90 border-b border-purple-900/40 sticky top-0 z-50 backdrop-blur-md px-4 py-3.5 shadow-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-purple-900/30">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-purple-400 uppercase">
                  HTEIM School of Ministry
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  Public Assessment
                </span>
              </div>
              <h1 className="text-sm font-black text-white truncate max-w-xs sm:max-w-md">
                {quiz.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              title="Copy share link"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs rounded-xl border border-purple-800/50 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share Link</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Quiz Taker Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 my-2">
        <QuizTakerView
          quiz={quiz ? scrubQuizForClient(quiz) : (undefined as any)}
          studentRoster={studentRoster}
          currentStudentName={currentStudentName}
          onSubmitQuiz={(sub) => {
            if (onSubmitResponse) {
              onSubmitResponse(sub);
            }
          }}
          onClose={onClose}
        />
      </main>

      {/* Footer Disclaimer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Heaven Touching Earth International Ministries (HTEIM) School of Ministry.</p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Responses are automatically logged to the Course Directory gradebook.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
