import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Eye, 
  ArrowLeft,
  Filter,
  BarChart3,
  MessageSquare,
  FileText,
  Send,
  MoreVertical,
  RefreshCw,
  LayoutList
} from 'lucide-react';
import { portalApiClient } from '../../../services/api/portalApiClient';
import { QuizAssignment, QuizAttempt } from '../../../types';
import { ResponseReviewer } from './grading/ResponseReviewer';
import { motion, AnimatePresence } from 'motion/react';

interface ResponseCenterProps {
  quizzes: QuizAssignment[];
  onBack?: () => void;
}

export const ResponseCenter: React.FC<ResponseCenterProps> = ({ quizzes, onBack }) => {
  const [selectedQuiz, setSelectedQuiz] = useState<QuizAssignment | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'submitted' | 'graded' | 'released'>('all');
  
  const [reviewingAttempt, setReviewingAttempt] = useState<any | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationResults, setReconciliationResults] = useState<string[] | null>(null);

  const handleRunReconciliation = async () => {
    setReconciling(true);
    setReconciliationResults(null);
    try {
      const result = await portalApiClient.runReconciliationRepairs([
        'orphaned_submissions',
        'missing_quiz_links',
        'response_mismatch',
        'student_mapping'
      ]);
      setReconciliationResults(result.results || ['Reconciliation completed successfully.']);
      
      // Refresh current quiz attempts if one is selected
      if (selectedQuiz) {
        const shareCode = selectedQuiz.shareCode || selectedQuiz.id;
        const data = await portalApiClient.getQuizAttempts(shareCode);
        setAttempts(data || []);
      }
    } catch (err) {
      console.error('Reconciliation failed:', err);
      setReconciliationResults(['Error: Failed to execute reconciliation repairs.']);
    } finally {
      setReconciling(false);
    }
  };

  useEffect(() => {
    if (!selectedQuiz) return;

    const fetchAttempts = async () => {
      setLoading(true);
      try {
        const shareCode = selectedQuiz.shareCode || selectedQuiz.id;
        const data = await portalApiClient.getQuizAttempts(shareCode);
        setAttempts(data || []);
      } catch (err) {
        console.error('Failed to fetch attempts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
    const interval = setInterval(fetchAttempts, 10000); // Polling every 10s for live updates
    return () => clearInterval(interval);
  }, [selectedQuiz]);

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.courseCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAttempts = attempts.filter(a => {
    const matchesSearch = a.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = useMemo(() => {
    if (!attempts.length) return { total: 0, submitted: 0, inProgress: 0, graded: 0 };
    return {
      total: attempts.length,
      submitted: attempts.filter(a => a.status === 'submitted').length,
      inProgress: attempts.filter(a => a.status === 'in_progress').length,
      graded: attempts.filter(a => a.status === 'graded' || a.status === 'released').length,
    };
  }, [attempts]);

  // Map Record<string, any> responses to QuizResponse[] for the reviewer
  const mapAttemptForReviewer = (attempt: any): any => {
    if (!selectedQuiz) return null;
    
    const responses = Object.entries(attempt.responses || {}).map(([qId, val]) => {
      const question = selectedQuiz.questions.find(q => q.id === qId);
      let isCorrect = false;
      let autoScore = 0;
      const weight = question?.weight || 10;

      if (question) {
        if (question.type === 'multiple_choice' || question.type === 'true_false') {
          isCorrect = val === question.correctOptionId;
          autoScore = isCorrect ? weight : 0;
        } else if (question.type === 'checkboxes') {
          const correct = question.correctOptionIds || [];
          const chosen = Array.isArray(val) ? val : [];
          isCorrect = correct.length === chosen.length && correct.every(id => chosen.includes(id));
          autoScore = isCorrect ? weight : 0;
        }
      }

      return {
        questionId: qId,
        answer: val,
        autoScore,
        finalScore: autoScore,
        isCorrect
      } as any;
    });

    return {
      ...attempt,
      responses,
      maxPoints: selectedQuiz.totalPoints || selectedQuiz.questions.reduce((sum, q) => sum + (q.weight || 10), 0)
    } as any;
  };

  const handleSaveGrade = async (attempt: any, grade: any) => {
    try {
      await portalApiClient.gradeSubmission({
        submissionId: attempt.id,
        score: grade.teacherScore || grade.finalScore || grade.releasedScore,
        feedback: (attempt as any).teacherFeedback || grade.adjustmentReason || grade.feedback,
      });
      
      // Update local state
      setAttempts(prev => prev.map(a => 
        a.id === attempt.id ? { ...a, status: grade.gradeStatus, score: grade.teacherScore } : a
      ));
      
      setReviewingAttempt(null);
    } catch (err) {
      console.error('Failed to save grade:', err);
    }
  };

  if (selectedQuiz) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedQuiz(null)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{selectedQuiz.title}</h2>
              <p className="text-xs text-slate-500 font-bold">{selectedQuiz.courseCode} • Response Management Center</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunReconciliation}
              disabled={reconciling}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-400 rounded-2xl border border-amber-200 dark:border-amber-800 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              title="Run automated reconciliation to fix missing or orphaned quiz responses"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
              <span>{reconciling ? 'Repairing...' : 'Reconcile Data'}</span>
            </button>

            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Attempts</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
              <div className="text-center">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Done</p>
                <p className="text-sm font-black text-emerald-600">{stats.submitted}</p>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
              <div className="text-center">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">Active</p>
                <p className="text-sm font-black text-amber-600">{stats.inProgress}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {(['all', 'in_progress', 'submitted', 'graded', 'released'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === f
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredAttempts.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-500">No attempts found for this selection.</p>
              </div>
            ) : (
              filteredAttempts.map((attempt) => (
                <motion.div
                  layout
                  key={attempt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">{attempt.studentName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-400">{attempt.id}</span>
                        {attempt.studentEmail && (
                          <span className="text-[10px] text-slate-400">• {attempt.studentEmail}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-right sm:text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Status</p>
                      <div className="mt-1">
                        {attempt.status === 'submitted' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            SUBMITTED
                          </span>
                        ) : attempt.status === 'in_progress' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                            IN PROGRESS
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {attempt.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right sm:text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Performance</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                        {attempt.score ?? '-'}/{selectedQuiz.totalPoints || '-'}
                        {attempt.percentage !== undefined && (
                          <span className="ml-1 text-xs text-slate-500">({attempt.percentage}%)</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 border-l border-slate-100 dark:border-slate-700 pl-4">
                      <button
                        onClick={() => setReviewingAttempt(attempt)}
                        className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-all cursor-pointer"
                        title="Review Responses"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {reviewingAttempt && (
          <ResponseReviewer
            isOpen={!!reviewingAttempt}
            onClose={() => setReviewingAttempt(null)}
            quiz={selectedQuiz as any}
            attempt={mapAttemptForReviewer(reviewingAttempt)!}
            userRole="teacher"
            onSaveGrade={handleSaveGrade}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">
              <LayoutList className="w-3 h-3" />
              <span>Teacher Response Center</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Quiz Evaluation & Grading</h1>
            <p className="text-purple-100 text-sm max-w-lg">
              Manage all student quiz attempts, review open-ended responses, and release academic grades across ministerial modules.
            </p>
          </div>
          <BarChart3 className="absolute -right-8 -bottom-8 w-64 h-64 text-white/10 rotate-12" />
        </div>

        {reconciliationResults && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-slate-900 rounded-2xl p-4 border border-slate-800"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-black text-white uppercase">Reconciliation Report</h4>
              </div>
              <button onClick={() => setReconciliationResults(null)} className="text-slate-500 hover:text-white transition-colors">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            <ul className="space-y-1.5">
              {reconciliationResults.map((msg, i) => (
                <li key={i} className="text-[10px] font-mono text-slate-400 flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">›</span>
                  {msg}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by quiz title or course code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Filter className="w-4 h-4" />
          <span>{filteredQuizzes.length} Quizzes Available</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredQuizzes.map(quiz => (
          <div
            key={quiz.id}
            onClick={() => setSelectedQuiz(quiz)}
            className="group bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-black rounded-lg uppercase tracking-wider">
                  {quiz.courseCode}
                </span>
                <span className="text-[10px] font-mono text-slate-400">{quiz.id.slice(0, 8)}</span>
              </div>
              
              <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-2 group-hover:text-purple-600 transition-colors">
                {quiz.title}
              </h3>
              
              <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500">
                <div className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{quiz.questions?.length || 0} Questions</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{quiz.timeLimitMinutes || 0}m</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black text-[11px]">
                <Users className="w-3.5 h-3.5" />
                <span>Manage Attempts</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
