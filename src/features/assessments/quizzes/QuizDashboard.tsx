import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Share2, 
  FileText, 
  Download, 
  Eye, 
  Users, 
  TrendingUp, 
  LayoutGrid, 
  List, 
  Check, 
  FileSpreadsheet,
  ShieldAlert,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  RefreshCw,
  Activity,
  X,
  XCircle,
  AlertCircle,
  AlertTriangle,
  LayoutList
} from 'lucide-react';
import { portalApiClient } from '../../../services/api/portalApiClient';
import { UserRole } from '../../../lib/userAuth';
import { QuizAssignment, QuizAttempt, QuizResponse } from '../../../types';
import { QuizCreator } from './QuizCreator';
import { QuizTaker } from './QuizTaker';
import { QuizAnalytics } from './QuizAnalytics';
import { QuizSubmissionReview } from './QuizSubmissionReview';
import { ResponseCenter } from './ResponseCenter';
import { useQuizManagement } from './useQuizManagement';
import { exportQuizSubmissionsCsv, scrubQuizForClient } from '../../../data/quizTemplates';
import { ImportQuizModal } from '../../../components/ImportQuizModal';
import { ExportQuizModal } from '../../../components/ExportQuizModal';

export interface QuizDashboardProps {
  userRole: UserRole;
  quizzes?: QuizAssignment[];
  submissions?: QuizAttempt[];
  onSaveQuiz?: (quiz: QuizAssignment) => void;
  onDeleteQuiz?: (quizId: string) => void;
  onDuplicateQuiz?: (quiz: QuizAssignment) => void;
  onTakeQuiz?: (quiz: QuizAssignment) => void;
  onSwitchRoleToTeacher?: () => void;
}

export const QuizDashboard: React.FC<QuizDashboardProps> = ({
  userRole,
  quizzes: propsQuizzes,
  submissions: propsSubmissions,
  onSaveQuiz: propsOnSaveQuiz,
  onDeleteQuiz: propsOnDeleteQuiz,
  onDuplicateQuiz: propsOnDuplicateQuiz,
  onTakeQuiz: propsOnTakeQuiz,
  onSwitchRoleToTeacher
}) => {
  const quizManager = useQuizManagement();
  
  const quizzes = propsQuizzes || quizManager.quizzes;
  const submissions = useMemo(() => {
    const map = new Map<string, QuizAttempt>();
    (quizManager.attempts || []).forEach(s => {
      if (s && s.id) map.set(s.id, s);
    });
    (propsSubmissions || []).forEach(s => {
      if (s && s.id) map.set(s.id, s);
    });
    return Array.from(map.values()).sort((a, b) => 
      new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
    );
  }, [propsSubmissions, quizManager.attempts]);

  // Active View Tabs
  const [activeTab, setActiveTab] = useState<'all_quizzes' | 'analytics' | 'individual' | 'responses' | 'data_integrity' | 'submission_health'>('all_quizzes');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  // Selected Quiz for Analytics / Review
  const [selectedAnalyticsQuizId, setSelectedAnalyticsQuizId] = useState<string>(quizzes[0]?.id || '');
  const [selectedSubmissionForReview, setSelectedSubmissionForReview] = useState<QuizAttempt | null>(null);
  const [activeAttempts, setActiveAttempts] = useState<any[]>([]);

  // Submission Health states
  const [healthResults, setHealthResults] = useState<Array<{
    name: string;
    key: string;
    status: 'idle' | 'running' | 'success' | 'error';
    error?: string;
  }>>([
    { name: 'Quiz Configuration', key: 'quiz_config', status: 'idle' },
    { name: 'Published', key: 'published', status: 'idle' },
    { name: 'Share Link', key: 'share_link', status: 'idle' },
    { name: 'Public Endpoint', key: 'public_endpoint', status: 'idle' },
    { name: 'Attempt Creation', key: 'attempt_creation', status: 'idle' },
    { name: 'Response Persistence', key: 'response_persistence', status: 'idle' },
    { name: 'Submission Persistence', key: 'submission_persistence', status: 'idle' },
    { name: 'Auto Grading', key: 'auto_grading', status: 'idle' },
    { name: 'Teacher Retrieval', key: 'teacher_retrieval', status: 'idle' },
    { name: 'Grade Persistence', key: 'grade_persistence', status: 'idle' }
  ]);
  const [healthTesting, setHealthTesting] = useState(false);

  const runSubmissionHealthCheck = async () => {
    setHealthTesting(true);
    
    // Reset all checks to idle/running
    setHealthResults(prev => prev.map(item => ({ ...item, status: 'idle', error: undefined })));

    const updateStep = (key: string, status: 'success' | 'error', error?: string) => {
      setHealthResults(prev => prev.map(item => 
        item.key === key ? { ...item, status, error } : item
      ));
    };

    const updateToRunning = (key: string) => {
      setHealthResults(prev => prev.map(item => 
        item.key === key ? { ...item, status: 'running' } : item
      ));
    };

    try {
      // 1. Quiz Configuration
      updateToRunning('quiz_config');
      const activeQuizzes = quizzes || [];
      if (activeQuizzes.length === 0) {
        updateStep('quiz_config', 'error', 'No active quiz assignments found in database.');
        setHealthTesting(false);
        return;
      }
      const targetQuiz = activeQuizzes[0];
      if (!targetQuiz.title || !Array.isArray(targetQuiz.questions) || targetQuiz.questions.length === 0) {
        updateStep('quiz_config', 'error', 'Quiz is misconfigured (lacks a title or has no questions).');
        setHealthTesting(false);
        return;
      }
      updateStep('quiz_config', 'success');

      // 2. Published
      updateToRunning('published');
      if (!targetQuiz.isPublished && targetQuiz.status !== 'published') {
        updateStep('published', 'error', `Quiz "${targetQuiz.title}" is in DRAFT state. Must be published.`);
        setHealthTesting(false);
        return;
      }
      updateStep('published', 'success');

      // 3. Share Link
      updateToRunning('share_link');
      if (!targetQuiz.shareCode) {
        updateStep('share_link', 'error', `Quiz "${targetQuiz.title}" does not have an active shareCode.`);
        setHealthTesting(false);
        return;
      }
      updateStep('share_link', 'success');

      // 4. Public Endpoint
      updateToRunning('public_endpoint');
      try {
        const publicQuizRes = await portalApiClient.getPublicQuiz(targetQuiz.shareCode);
        if (!publicQuizRes || !publicQuizRes.quiz) {
          throw new Error('Endpoint returned empty response payload.');
        }
        updateStep('public_endpoint', 'success');
      } catch (err: any) {
        updateStep('public_endpoint', 'error', `HTTP ${err.status || 500} - ${err.message || 'Verification failed'}`);
        setHealthTesting(false);
        return;
      }

      // 5. Attempt Creation
      updateToRunning('attempt_creation');
      let attemptId = '';
      try {
        const attemptRes = await portalApiClient.createQuizAttempt(targetQuiz.shareCode, {
          studentName: 'HEALTH_TEST_BOT',
          studentEmail: 'health.test@hteim.org'
        });
        if (!attemptRes || !attemptRes.attemptId) {
          throw new Error('CreateAttempt endpoint did not return a valid attempt ID.');
        }
        attemptId = attemptRes.attemptId;
        updateStep('attempt_creation', 'success');
      } catch (err: any) {
        updateStep('attempt_creation', 'error', `HTTP ${err.status || 500} - ${err.message || 'Failed'}`);
        setHealthTesting(false);
        return;
      }

      // 6. Response Persistence
      updateToRunning('response_persistence');
      try {
        const firstQ = targetQuiz.questions[0];
        const qId = firstQ?.id || 'q1';
        const saveRes = await portalApiClient.autosaveQuizAttemptResponses(targetQuiz.shareCode, attemptId, {
          responses: { [qId]: 'A' },
          timeSpentSeconds: 10
        });
        if (!saveRes || !saveRes.success) {
          throw new Error('Patch responses saved state did not return success.');
        }
        updateStep('response_persistence', 'success');
      } catch (err: any) {
        updateStep('response_persistence', 'error', `HTTP ${err.status || 500} - ${err.message || 'Autosave failed'}`);
        setHealthTesting(false);
        return;
      }

      // 7. Submission Persistence
      updateToRunning('submission_persistence');
      let submissionObj: any = null;
      try {
        const firstQ = targetQuiz.questions[0];
        const qId = firstQ?.id || 'q1';
        const submitRes = await portalApiClient.submitPublicQuizResponse(targetQuiz.shareCode, {
          studentName: 'HEALTH_TEST_BOT',
          studentEmail: 'health.test@hteim.org',
          responses: { [qId]: 'A' },
          timeSpentSeconds: 15,
          quizId: targetQuiz.id,
          quizTitle: targetQuiz.title,
          totalPossible: targetQuiz.totalPoints || 10
        });
        if (!submitRes || !submitRes.success || !submitRes.submission) {
          throw new Error('Submission submit endpoint returned false or empty payload.');
        }
        submissionObj = submitRes.submission;
        updateStep('submission_persistence', 'success');
      } catch (err: any) {
        updateStep('submission_persistence', 'error', `HTTP ${err.status || 500} - ${err.message || 'Failed'}`);
        setHealthTesting(false);
        return;
      }

      // 8. Auto Grading
      updateToRunning('auto_grading');
      try {
        if (submissionObj.score === undefined || submissionObj.score === null) {
          throw new Error('Auto grading calculation was skipped or score returned null.');
        }
        updateStep('auto_grading', 'success');
      } catch (err: any) {
        updateStep('auto_grading', 'error', err.message || 'Automatic grade calculation failed');
        setHealthTesting(false);
        return;
      }

      // 9. Teacher Retrieval
      updateToRunning('teacher_retrieval');
      try {
        const subsRes = await portalApiClient.getSubmissions('HEALTH_TEST_BOT');
        const list = subsRes?.submissions || [];
        const found = list.some((s: any) => 
          s.studentName === 'HEALTH_TEST_BOT' || 
          (submissionObj && String(s.id).toLowerCase() === String(submissionObj.id).toLowerCase())
        );
        if (!found) {
          throw new Error('Test submission was not found in teacher retrieved data list.');
        }
        updateStep('teacher_retrieval', 'success');
      } catch (err: any) {
        updateStep('teacher_retrieval', 'error', `HTTP ${err.status || 500} - ${err.message || 'Failed'}`);
        setHealthTesting(false);
        return;
      }

      // 10. Grade Persistence
      updateToRunning('grade_persistence');
      try {
        const gradesRes = await portalApiClient.getGrades({ studentName: 'HEALTH_TEST_BOT' });
        const list = gradesRes?.grades || [];
        if (list.length === 0) {
          throw new Error('Grade collection entry was not generated or saved.');
        }
        updateStep('grade_persistence', 'success');
      } catch (err: any) {
        updateStep('grade_persistence', 'error', `HTTP ${err.status || 500} - ${err.message || 'Failed'}`);
        setHealthTesting(false);
        return;
      }

    } catch (err: any) {
      console.error('Diagnostic error:', err);
    } finally {
      setHealthTesting(false);
    }
  };

  // Reconciliation states
  const [diagnostics, setDiagnostics] = useState<any | null>(null);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [selectedRepairs, setSelectedRepairs] = useState<string[]>([]);
  const [repairProgressLoading, setRepairProgressLoading] = useState(false);
  const [repairResults, setRepairResults] = useState<string[] | null>(null);

  const fetchDiagnostics = async () => {
    setReconciliationLoading(true);
    setRepairResults(null);
    try {
      const res = await portalApiClient.getReconciliationDiagnostics();
      setDiagnostics(res);
      const toSelect: string[] = [];
      if (res.orphanedAttempts?.length > 0) toSelect.push('orphanedAttempts');
      if (res.orphanedSubmissions?.length > 0) toSelect.push('orphanedSubmissions');
      if (res.submissionsWithoutQuiz?.length > 0) toSelect.push('submissionsWithoutQuiz');
      if (res.responsesWithoutQuestion?.length > 0) toSelect.push('responsesWithoutQuestion');
      if (res.gradesWithoutSubmission?.length > 0) toSelect.push('gradesWithoutSubmission');
      if (res.submissionsWithoutStudent?.length > 0) toSelect.push('submissionsWithoutStudent');
      setSelectedRepairs(toSelect);
    } catch (err) {
      console.error('Failed to run diagnostics:', err);
    } finally {
      setReconciliationLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'data_integrity') {
      fetchDiagnostics();
    }
  }, [activeTab]);

  const toggleRepairType = (type: string) => {
    setSelectedRepairs(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleExecuteRepairs = async () => {
    if (selectedRepairs.length === 0) return;
    setRepairProgressLoading(true);
    try {
      const res = await portalApiClient.runReconciliationRepairs(selectedRepairs);
      if (res.success) {
        setRepairResults(res.results);
        const updated = await portalApiClient.getReconciliationDiagnostics();
        setDiagnostics(updated);
        setSelectedRepairs([]);
      }
    } catch (err) {
      console.error('Failed to run repairs:', err);
    } finally {
      setRepairProgressLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'individual') return;
    let isMounted = true;

    const fetchAttempts = async () => {
      try {
        const allAtts: any[] = [];
        for (const q of quizzes) {
          const code = q.shareCode || q.id;
          const atts = await portalApiClient.getQuizAttempts(code);
          atts.forEach(a => {
            if (!allAtts.some(existing => existing.id === a.id)) {
              allAtts.push({ ...a, quizTitle: q.title });
            }
          });
        }
        if (isMounted) setActiveAttempts(allAtts);
      } catch {}
    };

    fetchAttempts();
    const interval = setInterval(fetchAttempts, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeTab, quizzes]);

  // Modals
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [quizToEdit, setQuizToEdit] = useState<QuizAssignment | null>(null);
  const [quizToExport, setQuizToExport] = useState<QuizAssignment | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<QuizAssignment | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<QuizAssignment | null>(null);

  const handleConfirmDeleteQuiz = async () => {
    if (!quizToDelete) return;
    const idToDelete = quizToDelete.id;
    try {
      if (propsOnDeleteQuiz) {
        propsOnDeleteQuiz(idToDelete);
      }
      await quizManager.deleteQuiz(idToDelete);
      setCopiedToast(`Quiz "${quizToDelete.title}" deleted successfully.`);
      setTimeout(() => setCopiedToast(null), 3500);
    } catch (err) {
      console.error('Failed to delete quiz:', err);
    } finally {
      setQuizToDelete(null);
    }
  };

  const isTeacherOrAdmin = userRole === 'admin' || userRole === 'teacher';

  if (!isTeacherOrAdmin) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
        <h3 className="text-base font-black text-amber-900 dark:text-amber-100">Faculty Privileges Required</h3>
        <p className="text-xs text-amber-700 dark:text-amber-300 max-w-md mx-auto">
          The Quiz Administration & Analytics Dashboard is reserved for HTEIM faculty and course directors.
        </p>
        {onSwitchRoleToTeacher && (
          <button
            onClick={onSwitchRoleToTeacher}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Switch to Teacher Mode
          </button>
        )}
      </div>
    );
  }

  // Filter quizzes
  const filteredQuizzes = quizzes.filter(q => {
    const matchesSearch = (q.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.courseCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourseFilter === 'all' || q.courseCode === selectedCourseFilter;
    return matchesSearch && matchesCourse;
  });

  const courseCodes = Array.from(new Set(quizzes.map(q => q.courseCode || 'MIN-101')));

  const handleCopyLink = (shareCode: string) => {
    const url = `${window.location.origin}${window.location.pathname}?quiz=${shareCode}`;
    navigator.clipboard.writeText(url);
    setCopiedToast(`Copied direct shareable quiz link! Anyone with this link can answer outside the app.`);
    setTimeout(() => setCopiedToast(null), 3500);
  };

  const handleExportCsv = (quiz: QuizAssignment) => {
    const subs = submissions.filter(s => s.quizId === quiz.id || (s as any).assignmentId === quiz.id);
    const csvContent = exportQuizSubmissionsCsv(quiz, subs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `HTEIM_Quiz_${quiz.courseCode || 'Course'}_${quiz.title.replace(/\s+/g, '_')}_Submissions.csv`;
    link.click();
  };

  const handleSaveQuiz = (quiz: QuizAssignment) => {
    if (propsOnSaveQuiz) propsOnSaveQuiz(quiz);
    else quizManager.saveQuiz(quiz);
    setShowCreatorModal(false);
    setQuizToEdit(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {copiedToast && (
        <div role="status" className="fixed top-6 right-6 z-60 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-xl font-bold text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black">
              <BarChart2 className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Quiz Management & Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create, auto-grade, analyze student responses, and publish interactive ministerial assessments.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Import Quiz</span>
          </button>
          
          <button
            onClick={() => {
              setQuizToEdit(null);
              setShowCreatorModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Quiz</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
        <button
          onClick={() => setActiveTab('all_quizzes')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'all_quizzes'
              ? 'bg-white dark:bg-slate-700 text-purple-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>All Quizzes ({quizzes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-white dark:bg-slate-700 text-purple-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Item Analytics ({submissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('responses')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'responses'
              ? 'bg-white dark:bg-slate-700 text-purple-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <LayoutList className="w-3.5 h-3.5" />
          <span>Response Center</span>
        </button>

        <button
          onClick={() => setActiveTab('individual')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'individual'
              ? 'bg-white dark:bg-slate-700 text-purple-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Submissions Log ({submissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('data_integrity')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'data_integrity'
              ? 'bg-white dark:bg-slate-700 text-purple-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Data Integrity</span>
        </button>

        <button
          onClick={() => setActiveTab('submission_health')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'submission_health'
              ? 'bg-white dark:bg-slate-700 text-purple-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Submission Health</span>
        </button>
      </div>

      {/* TAB 1: ALL QUIZZES */}
      {activeTab === 'all_quizzes' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search quizzes by title or course..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Course Codes</option>
                {courseCodes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-900">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-xs text-purple-600' : 'text-slate-400'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md cursor-pointer ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-xs text-purple-600' : 'text-slate-400'}`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map(quiz => {
                const subCount = submissions.filter(s => 
                  s.quizId === quiz.id || 
                  (s as any).assignmentId === quiz.id ||
                  (quiz.shareCode && (s.quizId === quiz.shareCode || (s as any).assignmentId === quiz.shareCode))
                ).length;
                const status = quiz.status || (quiz.isPublished ? 'published' : 'draft');
                
                // Detailed sub stats for GRADING
                const awaitingReviewCount = submissions.filter(s => 
                  (s.quizId === quiz.id || (s as any).assignmentId === quiz.id || (quiz.shareCode && (s.quizId === quiz.shareCode || (s as any).assignmentId === quiz.shareCode))) && 
                  !s.teacherFeedback
                ).length;
                const autoGradedCount = Math.max(0, subCount - awaitingReviewCount);

                return (
                  <div
                    key={quiz.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-purple-300 dark:hover:border-purple-600 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                          {quiz.courseCode || 'MIN-101'}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                          {quiz.totalPoints || 100} pts
                        </span>
                      </div>

                      <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2">
                        {quiz.title}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {quiz.description || 'Ministerial assessment quiz.'}
                      </p>

                      {/* Status Badging Segment */}
                      <div className="py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/50 space-y-1">
                        {status === 'published' || status === 'in_progress' ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              🟢 OPEN & LIVE
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Available until {quiz.dueDate || 'September 24, 2026'} · 11:59 PM
                            </span>
                          </div>
                        ) : status === 'scheduled' ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold text-amber-600 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              🟡 SCHEDULED
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Opens {quiz.settings?.availableFromDate || 'September 24'} · {quiz.settings?.availableFromTime || '7:00 PM'}
                            </span>
                          </div>
                        ) : status === 'graded' ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold text-indigo-600 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              🔵 GRADING / COMPLETE
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {subCount} submissions · {autoGradedCount} auto graded · {awaitingReviewCount} review
                            </span>
                          </div>
                        ) : status === 'closed' ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold text-rose-600 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              🔴 CLOSED
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Locks on {quiz.settings?.closeDate || quiz.dueDate || 'Closed'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold text-slate-500 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              📋 DRAFT MODE
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Invisible to candidates. Edit parameter to publish.
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs font-mono font-bold text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/60">
                        <span>{quiz.questions?.length || quiz.settings?.poolConfig?.questionCountToPresent || 0} Questions</span>
                        {subCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-sans font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            {subCount} Done
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans font-medium">
                            0 Submissions
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedAnalyticsQuizId(quiz.id);
                            setActiveTab('analytics');
                          }}
                          className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-purple-600 rounded-lg cursor-pointer"
                          title="View Analytics"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCopyLink(quiz.shareCode)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-purple-600 rounded-lg cursor-pointer"
                          title="Copy Link"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setQuizToExport(quiz)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-600 rounded-lg cursor-pointer"
                          title="Export Quiz"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExportCsv(quiz)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-purple-600 rounded-lg cursor-pointer"
                          title="Export Submissions CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setQuizToDelete(quiz)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                          title="Delete Quiz"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setQuizToEdit(quiz);
                            setShowCreatorModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => {
                            if (propsOnTakeQuiz) propsOnTakeQuiz(quiz);
                            else setPreviewQuiz(quiz);
                          }}
                          className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-extrabold uppercase">
                    <tr>
                      <th className="p-3">Course</th>
                      <th className="p-3">Quiz Title</th>
                      <th className="p-3">Questions</th>
                      <th className="p-3">Points</th>
                      <th className="p-3">Submissions</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                    {filteredQuizzes.map(quiz => {
                      const subCount = submissions.filter(s => 
                        s.quizId === quiz.id || 
                        (s as any).assignmentId === quiz.id ||
                        (quiz.shareCode && (s.quizId === quiz.shareCode || (s as any).assignmentId === quiz.shareCode))
                      ).length;
                      return (
                        <tr key={quiz.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-bold text-purple-600">{quiz.courseCode || 'MIN-101'}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{quiz.title}</td>
                          <td className="p-3 font-mono">{quiz.questions?.length || 0}</td>
                          <td className="p-3 font-mono font-bold text-amber-600">{quiz.totalPoints || 100}</td>
                          <td className="p-3 font-mono">
                            {subCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {subCount} (Done)
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setQuizToEdit(quiz);
                                  setShowCreatorModal(true);
                                }}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-purple-600 cursor-pointer"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setQuizToExport(quiz)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 cursor-pointer"
                                title="Export Quiz"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleExportCsv(quiz)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 cursor-pointer"
                                title="Export Submissions CSV"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setQuizToDelete(quiz)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-rose-600 cursor-pointer transition-colors"
                                title="Delete Quiz"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ANALYTICS */}
      {activeTab === 'analytics' && (
        <QuizAnalytics
          quizzes={quizzes}
          submissions={submissions}
          selectedQuizId={selectedAnalyticsQuizId}
          onSelectQuiz={setSelectedAnalyticsQuizId}
        />
      )}

      {/* TAB: RESPONSE CENTER */}
      {activeTab === 'responses' && (
        <ResponseCenter 
          quizzes={quizzes} 
          onBack={() => setActiveTab('all_quizzes')}
        />
      )}

      {/* TAB 3: INDIVIDUAL SUBMISSIONS & LIVE ATTEMPTS */}
      {activeTab === 'individual' && (
        <div className="space-y-6">
          {/* Active In-Progress Attempts Section */}
          {activeAttempts.length > 0 && (
            <div className="bg-purple-950/20 border-2 border-purple-500/40 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-purple-300">
                    Live Active Candidate Attempts ({activeAttempts.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-purple-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Auto-syncing
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-purple-900/40 text-purple-200 font-extrabold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Attempt ID</th>
                      <th className="p-2.5">Student Candidate</th>
                      <th className="p-2.5">Quiz</th>
                      <th className="p-2.5">Progress</th>
                      <th className="p-2.5">Last Saved</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/10 text-slate-200 font-medium">
                    {activeAttempts.map(att => (
                      <tr key={att.id} className="hover:bg-purple-900/20">
                        <td className="p-2.5 font-mono text-xs font-bold text-purple-300">{att.id}</td>
                        <td className="p-2.5 font-bold text-white">{att.studentName}</td>
                        <td className="p-2.5 text-slate-300">{att.quizTitle}</td>
                        <td className="p-2.5 font-mono text-amber-300 font-bold">Answered: {att.answeredCount}/5</td>
                        <td className="p-2.5 font-mono text-[11px] text-slate-400">
                          {att.lastSaved ? new Date(att.lastSaved).toLocaleTimeString() : 'Just now'}
                        </td>
                        <td className="p-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Clock className="w-2.5 h-2.5" />
                            In Progress
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Completed Submissions Log */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
          {submissions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ClipboardCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Submissions Logged Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Completed candidate responses from public and class day quizzes will be recorded here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-extrabold uppercase">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Quiz Title</th>
                    <th className="p-3">Submitted At</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Percentage</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                  {submissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{sub.studentName}</div>
                        {sub.studentEmail && (
                          <div className="text-[10px] text-slate-400 font-mono">{sub.studentEmail}</div>
                        )}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                        {sub.quizTitle || (quizzes.find(q => q.id === sub.quizId || q.shareCode === sub.quizId)?.title) || sub.quizId}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Just now'}
                      </td>
                      <td className="p-3 font-mono font-bold">{sub.score}/{sub.totalPossible}</td>
                      <td className="p-3 font-mono font-black">{sub.percentage}%</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.percentage >= 75
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}>
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Submitted
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedSubmissionForReview(sub)}
                          className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      )}

      {/* TAB 4: DATA INTEGRITY */}
      {activeTab === 'data_integrity' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-indigo-950/60">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center font-black">
                    <ShieldAlert className="w-5 h-5 text-indigo-400" />
                  </span>
                  <h3 className="text-md font-black tracking-wide text-slate-100">
                    ASSESSMENT DATA INTEGRITY CONTROL PANEL
                  </h3>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  Cross-checks multi-layer persistence layers (Google Sheets, local state buffers, Supabase database collections, in-memory live traces) for orphanages, missing keys, and invalid student/quiz associations.
                </p>
              </div>
              <button
                onClick={fetchDiagnostics}
                disabled={reconciliationLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer select-none"
              >
                <RefreshCw className={`w-4 h-4 ${reconciliationLoading ? 'animate-spin' : ''}`} />
                <span>Run Diagnostics Check</span>
              </button>
            </div>

            {reconciliationLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-400 font-bold">Scanning database tables...</span>
              </div>
            ) : diagnostics ? (
              <div className="mt-6 pt-6 border-t border-indigo-950/60 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Metric Checks */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black tracking-wider text-slate-300 uppercase">
                    System Health Checks
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-900/60">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-black">✓</span>
                        <span className="text-xs font-semibold text-slate-300">Valid Quiz Attempts</span>
                      </div>
                      <span className="font-mono text-xs font-black text-emerald-400">
                        {diagnostics.validAttempts} attempts
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-900/60">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-black">✓</span>
                        <span className="text-xs font-semibold text-slate-300">Valid Submissions</span>
                      </div>
                      <span className="font-mono text-xs font-black text-emerald-400">
                        {diagnostics.validSubmissions} submissions
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-900/60">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-black">✓</span>
                        <span className="text-xs font-semibold text-slate-300">Valid Question Responses</span>
                      </div>
                      <span className="font-mono text-xs font-black text-emerald-400">
                        {diagnostics.validResponses} responses
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-xl border border-slate-900/60">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-black">✓</span>
                        <span className="text-xs font-semibold text-slate-300">Valid Evaluated Grades</span>
                      </div>
                      <span className="font-mono text-xs font-black text-emerald-400">
                        {diagnostics.validGrades} grades
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warnings Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black tracking-wider text-slate-300 uppercase">
                    Integrity Warnings ({
                      (diagnostics.orphanedAttempts?.length || 0) +
                      (diagnostics.orphanedSubmissions?.length || 0) +
                      (diagnostics.submissionsWithoutQuiz?.length || 0) +
                      (diagnostics.responsesWithoutQuestion?.length || 0) +
                      (diagnostics.gradesWithoutSubmission?.length || 0) +
                      (diagnostics.submissionsWithoutStudent?.length || 0)
                    } anomalies detected)
                  </h4>
                  
                  <div className="space-y-2.5">
                    {(diagnostics.orphanedAttempts?.length || 0) > 0 ? (
                      <div className="flex items-center justify-between bg-amber-950/20 p-3 rounded-xl border border-amber-900/40">
                        <div className="flex items-center gap-2 text-amber-300">
                          <span className="font-bold">⚠</span>
                          <span className="text-xs font-semibold">Orphaned Quiz Attempts</span>
                        </div>
                        <span className="font-mono text-xs font-black text-amber-400">
                          {diagnostics.orphanedAttempts.length} detected
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-slate-950/20 p-3 rounded-xl border border-slate-900/40 text-slate-500">
                        <span className="text-xs">✓ No orphaned quiz attempts</span>
                      </div>
                    )}

                    {(diagnostics.orphanedSubmissions?.length || 0) > 0 ? (
                      <div className="flex items-center justify-between bg-amber-950/20 p-3 rounded-xl border border-amber-900/40">
                        <div className="flex items-center gap-2 text-amber-300">
                          <span className="font-bold">⚠</span>
                          <span className="text-xs font-semibold">Orphaned Submissions</span>
                        </div>
                        <span className="font-mono text-xs font-black text-amber-400">
                          {diagnostics.orphanedSubmissions.length} detected
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-slate-950/20 p-3 rounded-xl border border-slate-900/40 text-slate-500">
                        <span className="text-xs">✓ No orphaned submissions</span>
                      </div>
                    )}

                    {(diagnostics.submissionsWithoutQuiz?.length || 0) > 0 ? (
                      <div className="flex items-center justify-between bg-amber-950/20 p-3 rounded-xl border border-amber-900/40">
                        <div className="flex items-center gap-2 text-amber-300">
                          <span className="font-bold">⚠</span>
                          <span className="text-xs font-semibold">Submissions pointing to missing Quizzes</span>
                        </div>
                        <span className="font-mono text-xs font-black text-amber-400">
                          {diagnostics.submissionsWithoutQuiz.length} detected
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-slate-950/20 p-3 rounded-xl border border-slate-900/40 text-slate-500">
                        <span className="text-xs">✓ All submissions link to valid quizzes</span>
                      </div>
                    )}

                    {(diagnostics.responsesWithoutQuestion?.length || 0) > 0 ? (
                      <div className="flex items-center justify-between bg-amber-950/20 p-3 rounded-xl border border-amber-900/40">
                        <div className="flex items-center gap-2 text-amber-300">
                          <span className="font-bold">⚠</span>
                          <span className="text-xs font-semibold">Responses referencing missing questions</span>
                        </div>
                        <span className="font-mono text-xs font-black text-amber-400">
                          {diagnostics.responsesWithoutQuestion.length} detected
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-slate-950/20 p-3 rounded-xl border border-slate-900/40 text-slate-500">
                        <span className="text-xs">✓ No answers reference missing questions</span>
                      </div>
                    )}

                    {(diagnostics.gradesWithoutSubmission?.length || 0) > 0 ? (
                      <div className="flex items-center justify-between bg-amber-950/20 p-3 rounded-xl border border-amber-900/40">
                        <div className="flex items-center gap-2 text-amber-300">
                          <span className="font-bold">⚠</span>
                          <span className="text-xs font-semibold">Orphaned Grades (No Submission)</span>
                        </div>
                        <span className="font-mono text-xs font-black text-amber-400">
                          {diagnostics.gradesWithoutSubmission.length} detected
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-slate-950/20 p-3 rounded-xl border border-slate-900/40 text-slate-500">
                        <span className="text-xs">✓ All grades mapped to active submissions</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : null}
          </div>

          {/* INSPECT & REPAIR WORKSPACE */}
          {diagnostics && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-6">
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                  INSPECT & REPAIR INTEGRITY ANOMALIES
                </h3>
                <p className="text-xs text-slate-500">
                  Select anomalies to repair. Running repair will execute precise database backfills, sanitize stale schemas, and purge disconnected entities safely.
                </p>
              </div>

              {/* Repair Checkbox Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all select-none cursor-pointer ${
                  selectedRepairs.includes('orphanedAttempts')
                    ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedRepairs.includes('orphanedAttempts')}
                    onChange={() => toggleRepairType('orphanedAttempts')}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-200">
                      Reconcile Orphaned Attempts ({(diagnostics.orphanedAttempts || []).length})
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Submits active drafts containing answers or deletes empty/abandoned attempt records.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all select-none cursor-pointer ${
                  selectedRepairs.includes('orphanedSubmissions')
                    ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedRepairs.includes('orphanedSubmissions')}
                    onChange={() => toggleRepairType('orphanedSubmissions')}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-200">
                      Backfill Missing Attempt Session Traces ({(diagnostics.orphanedSubmissions || []).length})
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Generates matching database attempt records to complete session telemetry records.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all select-none cursor-pointer ${
                  selectedRepairs.includes('submissionsWithoutQuiz')
                    ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedRepairs.includes('submissionsWithoutQuiz')}
                    onChange={() => toggleRepairType('submissionsWithoutQuiz')}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-200">
                      Re-associate Submissions with missing Quizzes ({(diagnostics.submissionsWithoutQuiz || []).length})
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Links orphaned/unknown quiz references to active ministerial quiz assessments.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all select-none cursor-pointer ${
                  selectedRepairs.includes('responsesWithoutQuestion')
                    ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedRepairs.includes('responsesWithoutQuestion')}
                    onChange={() => toggleRepairType('responsesWithoutQuestion')}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-200">
                      Sanitize Responses referencing missing Questions ({(diagnostics.responsesWithoutQuestion || []).length})
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Removes answer payloads for questions that do not exist inside the quiz templates.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all select-none cursor-pointer ${
                  selectedRepairs.includes('gradesWithoutSubmission')
                    ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedRepairs.includes('gradesWithoutSubmission')}
                    onChange={() => toggleRepairType('gradesWithoutSubmission')}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-200">
                      Purge Orphaned Grades ({(diagnostics.gradesWithoutSubmission || []).length})
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Cleans up grades database records that lack any associated student submission.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all select-none cursor-pointer ${
                  selectedRepairs.includes('submissionsWithoutStudent')
                    ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedRepairs.includes('submissionsWithoutStudent')}
                    onChange={() => toggleRepairType('submissionsWithoutStudent')}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold block text-slate-800 dark:text-slate-200">
                      Map Unknown Student Identifiers ({(diagnostics.submissionsWithoutStudent || []).length})
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Binds legacy or unmapped student identifiers to a valid active fallback profile.
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  disabled={selectedRepairs.length === 0 || repairProgressLoading}
                  onClick={handleExecuteRepairs}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer select-none"
                >
                  {repairProgressLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Repair Selected Anomalies ({selectedRepairs.length})</span>
                </button>
              </div>

              {/* Repair Results Output Banner */}
              {repairResults && (
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 animate-fadeIn">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase">
                    Repair Execution Outcome:
                  </span>
                  <div className="space-y-1">
                    {repairResults.map((r, i) => (
                      <p key={i} className="text-xs text-slate-600 dark:text-slate-400 font-mono flex items-center gap-2">
                        <span className="text-purple-600">•</span>
                        <span>{r}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* INSPECTOR DETAILS TABLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-400">
                    Detailed Anomalies Inspector
                  </h4>
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full font-mono">
                    Diagnostic Database Inspector
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {[
                      ...(diagnostics.orphanedAttempts || []),
                      ...(diagnostics.orphanedSubmissions || []),
                      ...(diagnostics.submissionsWithoutQuiz || []),
                      ...(diagnostics.responsesWithoutQuestion || []),
                      ...(diagnostics.gradesWithoutSubmission || []),
                      ...(diagnostics.submissionsWithoutStudent || [])
                    ].length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 font-bold">
                        Excellent! No data integrity anomalies found. Database is fully consistent.
                      </div>
                    ) : (
                      [
                        ...(diagnostics.orphanedAttempts || []),
                        ...(diagnostics.orphanedSubmissions || []),
                        ...(diagnostics.submissionsWithoutQuiz || []),
                        ...(diagnostics.responsesWithoutQuestion || []),
                        ...(diagnostics.gradesWithoutSubmission || []),
                        ...(diagnostics.submissionsWithoutStudent || [])
                      ].map((ano, index) => (
                        <div key={index} className="p-3 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/60 transition-colors flex items-center justify-between gap-4 text-xs">
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-mono">
                              {ano.type}
                            </span>
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              Student: {ano.studentName || ano.studentId || 'N/A'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Entity ID: {ano.id || 'N/A'} {ano.quizId ? `| Quiz ID: ${ano.quizId}` : ''} {ano.questionId ? `| Question ID: ${ano.questionId}` : ''}
                            </div>
                          </div>
                          {ano.submittedAt || ano.startedAt ? (
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">
                              {new Date(ano.submittedAt || ano.startedAt).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* TAB 5: SUBMISSION HEALTH DIAGNOSTIC */}
      {activeTab === 'submission_health' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-indigo-950/60">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center font-black">
                    <Activity className="w-5 h-5 text-indigo-400" />
                  </span>
                  <h3 className="text-md font-black tracking-wide text-slate-100">
                    SUBMISSION HEALTH PIPELINE DIAGNOSTIC
                  </h3>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  Performs a live, end-to-end integration test of the quiz submission pipeline. Verifies schema validity, routing endpoints, response persistence, auto-grading computations, and grade persistence traces.
                </p>
              </div>
              <button
                onClick={runSubmissionHealthCheck}
                disabled={healthTesting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer select-none"
              >
                <RefreshCw className={`w-4 h-4 ${healthTesting ? 'animate-spin' : ''}`} />
                <span>Verify Pipelines</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs max-w-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <h4 className="text-xs font-black tracking-wider text-slate-400 uppercase">
                  Submission Health Checklist
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  Real-time pipeline verification
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {healthResults.map((step) => {
                  const isSuccess = step.status === 'success';
                  const isError = step.status === 'error';
                  const isRunning = step.status === 'running';

                  return (
                    <div key={step.key} className="py-3 flex flex-col space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {step.name}
                        </span>
                        
                        <div className="flex items-center gap-2 font-mono text-xs font-black">
                          {isRunning && (
                            <RefreshCw className="w-4 h-4 text-purple-600 animate-spin" />
                          )}
                          {isSuccess && (
                            <span className="text-emerald-500 font-black flex items-center gap-1">
                              ✓
                            </span>
                          )}
                          {isError && (
                            <span className="text-rose-500 font-black flex items-center gap-1">
                              ✕
                            </span>
                          )}
                          {step.status === 'idle' && (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </div>
                      </div>

                      {isError && step.error && (
                        <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 px-3 py-2 rounded-lg border border-rose-100 dark:border-rose-900/60 font-mono text-[10px] space-y-1">
                          <span className="font-bold uppercase block text-rose-700 dark:text-rose-400">
                            Last error:
                          </span>
                          <p>{step.error}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Status footer summary */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-400">
                <span>
                  {healthTesting 
                    ? 'Running end-to-end trace...' 
                    : healthResults.every(r => r.status === 'success') 
                      ? '✓ All pipeline phases are operational.' 
                      : healthResults.some(r => r.status === 'error') 
                        ? '✕ Pipeline errors detected. Check failure logs.' 
                        : 'System idle. Trigger verification above.'
                  }
                </span>
                <span className="font-mono">
                  Test student identity: HEALTH_TEST_BOT
                </span>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showImportModal && (
        <ImportQuizModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleSaveQuiz}
        />
      )}

      {quizToExport && (
        <ExportQuizModal
          isOpen={!!quizToExport}
          onClose={() => setQuizToExport(null)}
          quiz={quizToExport}
        />
      )}

      {showCreatorModal && (
        <QuizCreator
          isOpen={showCreatorModal}
          onClose={() => {
            setShowCreatorModal(false);
            setQuizToEdit(null);
          }}
          quizToEdit={quizToEdit}
          onSaveQuiz={handleSaveQuiz}
        />
      )}

      {previewQuiz && (
        <QuizTaker
          quiz={scrubQuizForClient(previewQuiz)}
          studentName="Faculty Preview User"
          onClose={() => setPreviewQuiz(null)}
          onSubmitQuiz={() => setPreviewQuiz(null)}
        />
      )}

      {selectedSubmissionForReview && (
        <QuizSubmissionReview
          submission={selectedSubmissionForReview}
          questions={(() => {
            const quiz = quizzes.find(q => q.id === selectedSubmissionForReview.quizId);
            if (!quiz) return [];
            if (quiz.currentVersionId === selectedSubmissionForReview.quizVersionId) return quiz.questions;
            const historical = quiz.versionHistory?.find(v => `ver_${quiz.id}_v${v.version}` === selectedSubmissionForReview.quizVersionId);
            return historical ? historical.questions : quiz.questions;
          })()}
          onClose={() => setSelectedSubmissionForReview(null)}
          onSaveFeedback={(subId, feedback, score, updatedSub) => {
            quizManager.updateTeacherFeedback(subId, feedback, score, updatedSub);
            setSelectedSubmissionForReview(null);
          }}
        />
      )}

      {/* Delete Quiz Confirmation Modal */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">Delete Quiz</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Action cannot be undone</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">"{quizToDelete.title}"</strong>? All questions, share codes, and submission records associated with this quiz will be permanently removed.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setQuizToDelete(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteQuiz}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Delete Quiz
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
