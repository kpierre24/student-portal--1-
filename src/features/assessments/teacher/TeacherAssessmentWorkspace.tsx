import React, { useState } from 'react';
import { BookOpen, FileText, CheckSquare, Plus, HelpCircle, FileSpreadsheet } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { TeacherAssignments } from './TeacherAssignments';
import { SubmissionReview } from './SubmissionReview';
import { Gradebook } from './Gradebook';
import { ExamQuizScoreMatrix } from '../gradebook/ExamQuizScoreMatrix';
import { CustomAssignment, AssignmentSubmission, StudentSummary } from '../../../types';

export interface TeacherAssessmentWorkspaceProps {
  assignments: CustomAssignment[];
  submissions: AssignmentSubmission[];
  students: StudentSummary[];
  allQuizSheets?: string[];
  records?: any[];
  effectiveClassDays?: any[];
  rubricScores?: Record<string, { participation: number; scripture: number; assignment: number }>;
  onUpdateRubric?: (studentName: string, key: 'participation' | 'scripture' | 'assignment', val: number) => void;
  onCreateAssignment?: () => void;
  onCreateQuiz?: () => void;
  onEditAssignment?: (assignment: CustomAssignment) => void;
  onDeleteAssignment?: (id: string) => void;
  onGradeSubmission?: (submissionId: string, score: number, feedback: string) => void;
  onSelectStudent?: (student: StudentSummary) => void;
  onSyncGoogleSheets?: () => void;
  isLoadingSheets?: boolean;
  className?: string;
}

export const TeacherAssessmentWorkspace: React.FC<TeacherAssessmentWorkspaceProps> = ({
  assignments = [],
  submissions = [],
  students = [],
  allQuizSheets = [],
  records = [],
  effectiveClassDays = [],
  rubricScores = {},
  onUpdateRubric,
  onCreateAssignment,
  onCreateQuiz,
  onEditAssignment,
  onDeleteAssignment,
  onGradeSubmission,
  onSelectStudent,
  onSyncGoogleSheets,
  isLoadingSheets = false,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'gradebook' | 'matrix' | 'assessments' | 'grading'>('gradebook');
  const [filterAssignmentId, setFilterAssignmentId] = useState<string | null>(null);

  const pendingSubmissionsCount = submissions.filter((s) => s.score === undefined).length;

  const handleSelectAssignmentForReview = (assignment: CustomAssignment) => {
    setFilterAssignmentId(assignment.id);
    setActiveTab('grading');
  };

  const displayedSubmissions = filterAssignmentId
    ? submissions.filter((s) => s.assignmentId === filterAssignmentId)
    : submissions;

  return (
    <div className={`space-y-5 ${className}`}>
      {/* 1. Concise Faculty Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div>
            <span className="font-bold text-slate-900 dark:text-white">{students.length}</span> Students
          </div>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <div>
            <span className="font-bold text-slate-900 dark:text-white">{assignments.length}</span> Active Assessments
          </div>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <div>
            <span className={pendingSubmissionsCount > 0 ? 'font-bold text-amber-600 dark:text-amber-400' : 'font-bold text-emerald-600'}>
              {pendingSubmissionsCount}
            </span> Awaiting Review
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onCreateAssignment && (
            <Button
              variant="primary"
              size="sm"
              onClick={onCreateAssignment}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="text-xs py-1.5"
            >
              + Assignment
            </Button>
          )}

          {onCreateQuiz && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateQuiz}
              leftIcon={<HelpCircle className="h-3.5 w-3.5" />}
              className="text-xs py-1.5"
            >
              + Quiz
            </Button>
          )}
        </div>
      </div>

      {/* 2. Simplified Primary Navigation with Front Tab Access to Score Matrix */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setFilterAssignmentId(null);
            setActiveTab('gradebook');
          }}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'gradebook'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
          <span>Gradebook Roster</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterAssignmentId(null);
            setActiveTab('matrix');
          }}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'matrix'
              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Exam, Quiz & Written Assignment Score Matrix"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Score Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterAssignmentId(null);
            setActiveTab('assessments');
          }}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'assessments'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-sky-500" />
          <span>Coursework & Quizzes ({assignments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('grading')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'grading'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
          <span>Grading Queue</span>
          {pendingSubmissionsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[10px] font-black">
              {pendingSubmissionsCount}
            </span>
          )}
        </button>
      </div>

      {/* 3. Tab Body */}
      {activeTab === 'gradebook' && (
        <Gradebook
          students={students}
          assignments={assignments}
          submissions={submissions}
          allQuizSheets={allQuizSheets}
          records={records}
          effectiveClassDays={effectiveClassDays}
          rubricScores={rubricScores}
          onUpdateRubric={onUpdateRubric}
          onSelectStudent={onSelectStudent}
          onSyncGoogleSheets={onSyncGoogleSheets}
          isLoadingSheets={isLoadingSheets}
          onGradeSubmission={onGradeSubmission}
        />
      )}

      {activeTab === 'matrix' && (
        <ExamQuizScoreMatrix
          students={students}
          assignments={assignments}
          submissions={submissions}
          allQuizSheets={allQuizSheets}
          records={records}
          effectiveClassDays={effectiveClassDays}
          rubricScores={rubricScores}
          onUpdateRubric={onUpdateRubric}
          onGradeSubmission={onGradeSubmission}
          onSyncGoogleSheets={onSyncGoogleSheets}
          isLoadingSheets={isLoadingSheets}
        />
      )}

      {activeTab === 'assessments' && (
        <TeacherAssignments
          assignments={assignments}
          submissions={submissions}
          onCreateAssignment={onCreateAssignment}
          onCreateQuiz={onCreateQuiz}
          onSelectAssignment={handleSelectAssignmentForReview}
          onEditAssignment={onEditAssignment}
          onDeleteAssignment={onDeleteAssignment}
        />
      )}

      {activeTab === 'grading' && (
        <div className="space-y-3">
          {filterAssignmentId && (
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Filtered to selected assessment
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterAssignmentId(null)}
                className="text-xs h-6 py-0"
              >
                Clear Filter (Show All)
              </Button>
            </div>
          )}
          <SubmissionReview
            submissions={displayedSubmissions}
            assignments={assignments}
            onGradeSubmission={onGradeSubmission}
          />
        </div>
      )}
    </div>
  );
};
