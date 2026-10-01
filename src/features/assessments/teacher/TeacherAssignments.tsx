import React, { useState } from 'react';
import { Plus, Search, Clock, HelpCircle, FileText, CheckCircle2, ChevronRight, Edit3, Trash2, Users } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { CustomAssignment, AssignmentSubmission } from '../../../types';

export interface TeacherAssignmentsProps {
  assignments: CustomAssignment[];
  submissions: AssignmentSubmission[];
  onCreateAssignment?: () => void;
  onCreateQuiz?: () => void;
  onSelectAssignment?: (assignment: CustomAssignment) => void;
  onEditAssignment?: (assignment: CustomAssignment) => void;
  onDeleteAssignment?: (id: string) => void;
  className?: string;
}

export const TeacherAssignments: React.FC<TeacherAssignmentsProps> = ({
  assignments = [],
  submissions = [],
  onCreateAssignment,
  onCreateQuiz,
  onSelectAssignment,
  onEditAssignment,
  onDeleteAssignment,
  className = '',
}) => {
  const [filterType, setFilterType] = useState<'all' | 'quiz' | 'document'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const quizzesCount = assignments.filter((a) => a.type === 'quiz').length;
  const docsCount = assignments.filter((a) => a.type !== 'quiz').length;

  const filtered = assignments.filter((item) => {
    if (filterType === 'quiz' && item.type !== 'quiz') return false;
    if (filterType === 'document' && item.type === 'quiz') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchTrack = (item.moduleTrack || '').toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchTrack && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search, Filter Bar, and Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All ({assignments.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('quiz')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'quiz'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-500" />
            Quizzes ({quizzesCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('document')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'document'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            Coursework ({docsCount})
          </button>
        </div>

        {/* Search Input & Create Actions */}
        <div className="flex items-center gap-2 flex-1 sm:justify-end">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assessments..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
            />
          </div>

          {onCreateAssignment && (
            <Button
              size="sm"
              variant="primary"
              onClick={onCreateAssignment}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="shrink-0 text-xs"
            >
              + Assignment
            </Button>
          )}

          {onCreateQuiz && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCreateQuiz}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="shrink-0 text-xs"
            >
              + Quiz
            </Button>
          )}
        </div>
      </div>

      {/* Assessment List */}
      {filtered.length === 0 ? (
        <Card className="text-center py-10 space-y-2">
          <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No assessments found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Create an assignment or quiz to get started.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => {
            const isQuiz = item.type === 'quiz';
            const subs = submissions.filter((s) => s.assignmentId === item.id);
            const gradedSubs = subs.filter((s) => s.score !== undefined);
            const pendingCount = subs.length - gradedSubs.length;
            const questionsCount = item.quizData?.questions?.length || 0;

            return (
              <Card
                key={item.id}
                className="flex flex-col justify-between p-4 space-y-3 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-2xs border border-slate-200/90 dark:border-slate-800"
              >
                <div className="space-y-2">
                  {/* Clean unboxed metadata kicker */}
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
                          <span>Coursework</span>
                        </>
                      )}
                      {item.isGroupAssignment && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px]">
                          <Users className="w-3 h-3" />
                          Group ({item.groups?.length || 0})
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                      <Clock className="w-3 h-3" />
                      <span>Due {item.dueDate || 'Open'}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {item.description || (isQuiz ? 'Module examination questions.' : 'Written curriculum assignment.')}
                    </p>
                  </div>

                  {/* Clean stats row */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      {isQuiz ? `${questionsCount} Questions · ${item.maxPoints || 100} pts` : `Max: ${item.maxPoints || 100} pts`}
                    </span>
                    <span className={pendingCount > 0 ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-slate-500'}>
                      {subs.length} submitted {pendingCount > 0 ? `(${pendingCount} pending)` : ''}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => onSelectAssignment?.(item)}
                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    className="text-xs py-1.5"
                  >
                    Review Submissions ({subs.length})
                  </Button>

                  {onEditAssignment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditAssignment(item)}
                      title="Edit assessment"
                      className="px-2"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    </Button>
                  )}

                  {onDeleteAssignment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteAssignment(item.id)}
                      title="Delete assessment"
                      className="px-2 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
