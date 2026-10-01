import React, { useState, useMemo } from 'react';
import { FileText, HelpCircle, Award, Trophy, CheckCircle2, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StudentGrades } from './StudentGrades';
import { AssessmentDetails } from './AssessmentDetails';
import { CustomAssignment, AssignmentSubmission, GradingWeights } from '../../../types';

export interface StudentAssessmentWorkspaceProps {
  assignments: CustomAssignment[];
  submissions: AssignmentSubmission[];
  studentName: string;
  attendanceRate?: number;
  gradingWeights?: GradingWeights;
  onTakeQuiz?: (quiz: CustomAssignment) => void;
  onSubmitAssignment?: (assignmentId: string, content: string) => void;
  className?: string;
}

export const StudentAssessmentWorkspace: React.FC<StudentAssessmentWorkspaceProps> = ({
  assignments = [],
  submissions = [],
  studentName,
  attendanceRate = 92,
  gradingWeights,
  onTakeQuiz,
  onSubmitAssignment,
  className = '',
}) => {
  const [selectedTab, setSelectedTab] = useState<'coursework' | 'grades'>('coursework');
  const [activeAssignment, setActiveAssignment] = useState<CustomAssignment | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'todo' | 'completed'>('all');

  // Submissions map for this student
  const studentSubmissionsMap = useMemo(() => {
    const map = new Map<string, AssignmentSubmission>();
    submissions.forEach((sub) => {
      if ((sub.studentName || '').toLowerCase().trim() === studentName.toLowerCase().trim()) {
        map.set(sub.assignmentId, sub);
      }
    });
    return map;
  }, [submissions, studentName]);

  const completedCount = studentSubmissionsMap.size;
  const totalTasks = assignments.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Compute average score
  const avgGrade = useMemo(() => {
    const graded = Array.from(studentSubmissionsMap.values()).filter((s) => s.score !== undefined);
    if (graded.length === 0) return 90; // Default high standing
    const sum = graded.reduce((acc, curr) => acc + (curr.score || 0), 0);
    return Math.round(sum / graded.length);
  }, [studentSubmissionsMap]);

  const activeSubmission = activeAssignment
    ? studentSubmissionsMap.get(activeAssignment.id) || null
    : null;

  // Filtered coursework list
  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const sub = studentSubmissionsMap.get(item.id);
      const isCompleted = !!sub;

      if (filterMode === 'todo' && isCompleted) return false;
      if (filterMode === 'completed' && !isCompleted) return false;
      return true;
    });
  }, [assignments, studentSubmissionsMap, filterMode]);

  // If viewing details of an assignment to submit
  if (activeAssignment) {
    return (
      <AssessmentDetails
        assignment={activeAssignment}
        submission={activeSubmission}
        onBack={() => setActiveAssignment(null)}
        onSubmit={(data) => {
          onSubmitAssignment?.(activeAssignment.id, data.content);
          setActiveAssignment(null);
        }}
      />
    );
  }

  return (
    <div className={`space-y-5 ${className}`}>
      {/* 1. Concise Student Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              Student Workspace: {studentName}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs text-slate-500">Class of 2026</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span>{completedCount} of {totalTasks} Coursework Tasks Completed ({completionPercentage}%)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 inline-flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Average: {avgGrade}% ({avgGrade >= 85 ? 'High Distinction' : avgGrade >= 75 ? 'Satisfactory' : 'At-Risk'})
          </span>
        </div>
      </div>

      {/* 2. Simplified Primary Navigation: Coursework & Exams vs Transcript */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setSelectedTab('coursework')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            selectedTab === 'coursework'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-sky-500" />
          <span>My Coursework & Quizzes ({assignments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTab('grades')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            selectedTab === 'grades'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span>My Grades & Transcript</span>
        </button>
      </div>

      {/* 3. Coursework Feed Tab */}
      {selectedTab === 'coursework' && (
        <div className="space-y-4">
          {/* Quick status filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All ({assignments.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('todo')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterMode === 'todo'
                  ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              To Do ({Math.max(0, totalTasks - completedCount)})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('completed')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterMode === 'completed'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Coursework Cards List */}
          {filteredAssignments.length === 0 ? (
            <Card className="text-center py-10 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {filterMode === 'todo' ? 'All caught up! No pending coursework.' : 'No items match your filter.'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review your official grades or check back soon for upcoming modules.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredAssignments.map((item) => {
                const isQuiz = item.type === 'quiz';
                const sub = studentSubmissionsMap.get(item.id);
                const isSubmitted = !!sub;
                const isGraded = sub?.score !== undefined;
                const questionsCount = item.quizData?.questions?.length || 0;

                return (
                  <Card
                    key={item.id}
                    className="flex flex-col justify-between p-4 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all border border-slate-200/90 dark:border-slate-800 shadow-2xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          {isQuiz ? (
                            <>
                              <HelpCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                              <span>Online Quiz</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>Written Assignment</span>
                            </>
                          )}
                        </span>

                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Due {item.dueDate || 'Open'}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {item.description || (isQuiz ? 'Module examination test.' : 'Written homework prompt.')}
                        </p>
                      </div>

                      {/* Status indicator */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">
                          {isQuiz ? `${questionsCount} Questions` : `${item.maxPoints || 100} Points`}
                        </span>

                        {isGraded ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            Graded: {sub.score}%
                          </span>
                        ) : isSubmitted ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs">
                            Turned In (Review Pending)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            Not submitted
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      {isQuiz ? (
                        <Button
                          variant={isSubmitted ? 'outline' : 'primary'}
                          size="sm"
                          fullWidth
                          onClick={() => onTakeQuiz?.(item)}
                          rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                          className="text-xs py-1.5"
                        >
                          {isSubmitted ? 'Retake Quiz' : 'Take Quiz'}
                        </Button>
                      ) : (
                        <Button
                          variant={isSubmitted ? 'outline' : 'primary'}
                          size="sm"
                          fullWidth
                          onClick={() => setActiveAssignment(item)}
                          rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                          className="text-xs py-1.5"
                        >
                          {isSubmitted ? 'View Submission' : 'Submit Assignment'}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Transcript & Grades Tab */}
      {selectedTab === 'grades' && (
        <StudentGrades
          studentName={studentName}
          averageScore={avgGrade}
          attendanceRate={attendanceRate}
          weights={gradingWeights}
          gradeBreakdown={assignments.map((asg) => {
            const sub = studentSubmissionsMap.get(asg.id);
            const score = sub?.score !== undefined ? sub.score : 85;
            return {
              id: asg.id,
              courseTitle: asg.title,
              moduleCode: asg.moduleTrack || 'SOM-100',
              score,
              status: score >= 85 ? 'High Distinction' : score >= 75 ? 'Satisfactory' : 'At-Risk',
              date: asg.dueDate || '2026',
            };
          })}
        />
      )}
    </div>
  );
};
