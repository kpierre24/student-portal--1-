import React, { useState } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import { StudentAssessmentWorkspace } from './student/StudentAssessmentWorkspace';
import { TeacherAssessmentWorkspace } from './teacher/TeacherAssessmentWorkspace';
import { AdminAssessmentWorkspace } from './admin/AdminAssessmentWorkspace';
import { AssignmentForm } from '../assignments/components/AssignmentForm';
import { QuizCreatorModal } from '../../components/QuizCreatorModal';
import { QuizTakerView } from '../../components/QuizTakerView';
import { AppUser } from '../../lib/userAuth';
import { CustomAssignment, AssignmentSubmission, StudentSummary } from '../../types';

export interface AssessmentsPageProps {
  appUser: AppUser | null;
  students: StudentSummary[];
  assignments: CustomAssignment[];
  submissions: AssignmentSubmission[];
  allQuizSheets?: string[];
  records?: any[];
  effectiveClassDays?: any[];
  rubricScores?: Record<string, { participation: number; scripture: number; assignment: number }>;
  onUpdateRubric?: (studentName: string, key: 'participation' | 'scripture' | 'assignment', val: number) => void;
  onCreateAssignment?: () => void;
  onCreateQuiz?: () => void;
  onTakeQuiz?: (quiz: CustomAssignment) => void;
  onGradeSubmission?: (submissionId: string, score: number, feedback: string) => void;
  onSyncGoogleSheets?: () => void;
  isLoadingSheets?: boolean;
  onSaveAssignment?: (assignment: CustomAssignment) => void;
  onEditAssignment?: (assignment: CustomAssignment) => void;
  onDeleteAssignment?: (id: string) => void;
  className?: string;
}

export const AssessmentsPage: React.FC<AssessmentsPageProps> = ({
  appUser,
  students = [],
  assignments = [],
  submissions = [],
  allQuizSheets = [],
  records = [],
  effectiveClassDays = [],
  rubricScores = {},
  onUpdateRubric,
  onCreateAssignment,
  onCreateQuiz,
  onTakeQuiz,
  onGradeSubmission,
  onSyncGoogleSheets,
  isLoadingSheets = false,
  onSaveAssignment,
  onEditAssignment,
  onDeleteAssignment,
  className = '',
}) => {
  // Role override for admin testing
  const [roleOverride, setRoleOverride] = useState<'auto' | 'student' | 'teacher' | 'admin'>('auto');

  // Modal states for creating/taking/deleting assessments
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [activeQuizForTaker, setActiveQuizForTaker] = useState<CustomAssignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);

  const resolvedRole = (() => {
    if (roleOverride !== 'auto') return roleOverride;
    if (!appUser) return 'student';
    if (appUser.role === 'admin' || appUser.role === 'super_admin' || appUser.role === 'registrar') {
      return 'admin';
    }
    if (appUser.role === 'teacher' || appUser.role === 'lecturer') {
      return 'teacher';
    }
    return 'student';
  })();

  const studentName = appUser?.studentName || appUser?.name || '';
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'super_admin';

  // Handler for student taking a quiz
  const handleStartQuiz = (quiz: CustomAssignment) => {
    if (onTakeQuiz) {
      onTakeQuiz(quiz);
    } else {
      setActiveQuizForTaker(quiz);
    }
  };

  const handleCreateAssignmentTrigger = () => {
    if (onCreateAssignment) {
      onCreateAssignment();
    } else {
      setShowAssignmentModal(true);
    }
  };

  const handleCreateQuizTrigger = () => {
    if (onCreateQuiz) {
      onCreateQuiz();
    } else {
      setShowQuizModal(true);
    }
  };

  // If a student is actively taking a quiz
  if (activeQuizForTaker) {
    return (
      <div className="space-y-4">
        <QuizTakerView
          quiz={activeQuizForTaker as any}
          studentName={studentName}
          onClose={() => setActiveQuizForTaker(null)}
          onComplete={(attempt) => {
            if (onGradeSubmission && attempt) {
              const maxPts = activeQuizForTaker.maxPoints || 100;
              const pct = Math.round(((attempt.score || 0) / maxPts) * 100);
              onGradeSubmission(`sub-${Date.now()}`, pct, `Completed via Quiz Taker with score ${attempt.score}/${maxPts}`);
            }
            setActiveQuizForTaker(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-5 pb-20 ${className}`} id="assessments-hub-container">
      {/* Streamlined Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              School of Ministry Academic Portal
            </span>
            <span>·</span>
            <span>Class of 2026</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Exams & Grades
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {resolvedRole === 'student'
              ? 'Complete module quizzes, submit coursework papers, and review your official academic grades.'
              : 'Class gradebook roster, assessment management, and student grading queue.'}
          </p>
        </div>

        {/* Quiet Perspective Preview Switcher for Administrators */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
            <Eye className="h-3 w-3 text-slate-400 ml-1.5" />
            <span className="text-[11px] font-bold text-slate-500">View as:</span>
            {(['auto', 'student', 'teacher', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleOverride(r)}
                className={`px-2 py-0.5 text-[11px] font-bold capitalize rounded-lg transition-all cursor-pointer ${
                  roleOverride === r
                    ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Role Workspace View */}
      {resolvedRole === 'student' && (
        <StudentAssessmentWorkspace
          assignments={assignments}
          submissions={submissions}
          studentName={studentName}
          onTakeQuiz={handleStartQuiz}
        />
      )}

      {resolvedRole === 'teacher' && (
        <TeacherAssessmentWorkspace
          assignments={assignments}
          submissions={submissions}
          students={students}
          allQuizSheets={allQuizSheets}
          records={records}
          effectiveClassDays={effectiveClassDays}
          rubricScores={rubricScores}
          onUpdateRubric={onUpdateRubric}
          onCreateAssignment={handleCreateAssignmentTrigger}
          onCreateQuiz={handleCreateQuizTrigger}
          onEditAssignment={onEditAssignment}
          onDeleteAssignment={(id) => setAssignmentToDelete(id)}
          onGradeSubmission={onGradeSubmission}
          onSyncGoogleSheets={onSyncGoogleSheets}
          isLoadingSheets={isLoadingSheets}
        />
      )}

      {resolvedRole === 'admin' && (
        <AdminAssessmentWorkspace
          assignments={assignments}
          submissions={submissions}
          students={students}
          allQuizSheets={allQuizSheets}
          records={records}
          effectiveClassDays={effectiveClassDays}
          rubricScores={rubricScores}
          onUpdateRubric={onUpdateRubric}
          onCreateAssignment={handleCreateAssignmentTrigger}
          onCreateQuiz={handleCreateQuizTrigger}
          onEditAssignment={onEditAssignment}
          onDeleteAssignment={(id) => setAssignmentToDelete(id)}
          onSyncGoogleSheets={onSyncGoogleSheets}
          isLoadingSheets={isLoadingSheets}
          onGradeSubmission={onGradeSubmission}
        />
      )}

      {/* Built-in Modals */}
      {showAssignmentModal && (
        <AssignmentForm
          isOpen={showAssignmentModal}
          onClose={() => setShowAssignmentModal(false)}
          students={students}
          studentRoster={students.map((s) => s.name || (s as any).studentName).filter(Boolean)}
          onSubmit={(formData) => {
            if (onSaveAssignment) {
              const newAsg: CustomAssignment = {
                id: `asg-${Date.now()}`,
                title: formData.title,
                courseCode: formData.courseCode,
                moduleTrack: formData.moduleTrack,
                description: formData.description,
                dueDate: formData.dueDate,
                maxPoints: formData.maxPoints,
                createdAt: new Date().toISOString(),
                type: formData.type || 'document',
                isGroupAssignment: formData.isGroupAssignment,
                groups: formData.groups,
              };
              onSaveAssignment(newAsg);
            }
            setShowAssignmentModal(false);
          }}
        />
      )}

      {showQuizModal && (
        <QuizCreatorModal
          isOpen={showQuizModal}
          onClose={() => setShowQuizModal(false)}
          onSaveQuiz={(quizData) => {
            if (onSaveAssignment) {
              const newQuiz: CustomAssignment = {
                id: `quiz-${Date.now()}`,
                title: quizData.title,
                courseCode: 'SOM-QUIZ',
                moduleTrack: quizData.title.includes('Leadership') ? 'Pastoral Leadership' : 'General Ministry',
                description: quizData.description || 'Module examination quiz',
                dueDate: quizData.dueDate || new Date().toISOString().split('T')[0],
                maxPoints: quizData.totalPoints || 100,
                createdAt: new Date().toISOString(),
                type: 'quiz',
                quizData: quizData as any,
              };
              onSaveAssignment(newQuiz);
            }
            setShowQuizModal(false);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {assignmentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">Delete Assessment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanent removal</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete this assessment and all associated student submission records? This action cannot be undone.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignmentToDelete(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAssignment && assignmentToDelete) {
                    onDeleteAssignment(assignmentToDelete);
                  }
                  setAssignmentToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Delete Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
