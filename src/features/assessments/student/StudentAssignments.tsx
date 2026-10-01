import React, { useState } from 'react';
import { 
  FileText, 
  Calendar, 
  Clock, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  BookOpen,
  Eye
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { MobileAssessmentCard } from '../shared/MobileAssessmentCard';
import { AddToCalendarButton } from '../../../components/AddToCalendarButton';
import { CustomAssignment, AssignmentSubmission } from '../../../types';

export interface StudentAssignmentsProps {
  assignments: CustomAssignment[];
  submissions: AssignmentSubmission[];
  studentName: string;
  onOpenAssignment?: (assignment: CustomAssignment) => void;
  onSubmitAssignment?: (assignmentId: string) => void;
  className?: string;
}

export const StudentAssignments: React.FC<StudentAssignmentsProps> = ({
  assignments = [],
  submissions = [],
  studentName,
  onOpenAssignment,
  onSubmitAssignment,
  className = '',
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all');

  // Next upcoming assignment
  const upcoming = assignments.find((a) => a.type !== 'quiz') || {
    id: 'up-1',
    title: 'Pastoral Leadership & Church Governance Essay',
    moduleTrack: 'Pastoral Leadership',
    type: 'document' as const,
    dueDate: 'Sep 18',
    description: 'Submit 750-word synthesis on Biblical Servant Leadership models.',
    maxPoints: 100,
    createdAt: new Date().toISOString(),
  };

  // Student specific submissions lookup
  const studentSubmissionsMap = new Map<string, AssignmentSubmission>();
  submissions.forEach((sub) => {
    if ((sub.studentName || '').toLowerCase().trim() === studentName.toLowerCase().trim()) {
      studentSubmissionsMap.set(sub.assignmentId, sub);
    }
  });

  const assignmentList = assignments.filter((a) => a.type !== 'quiz');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. UPCOMING Hero Card */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)] dark:text-sky-400">
          UPCOMING
        </h3>

        <Card
          variant="elevated"
          className="border-2 border-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-surface-elevated)] to-[var(--color-surface)] dark:from-[#08182c] dark:to-[#040e1b]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="sm">
                  Assignment
                </Badge>
                <div className="flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Due {upcoming.dueDate || 'Sep 18'}</span>
                </div>
              </div>

              <div>
                <h4 className="text-lg sm:text-xl font-black text-[var(--color-text)] dark:text-slate-100 font-sans">
                  {upcoming.moduleTrack || 'Pastoral Leadership'}
                </h4>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)] dark:text-slate-400 mt-0.5">
                  {upcoming.title}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <AddToCalendarButton
                event={{
                  id: upcoming.id,
                  title: `Assignment Due: ${upcoming.title}`,
                  description: upcoming.description || `Coursework deadline for ${upcoming.moduleTrack}`,
                  location: 'HTEIM Student Portal Online',
                  date: upcoming.dueDate ? (upcoming.dueDate.includes('2026') ? upcoming.dueDate : `2026-09-18`) : '2026-09-18',
                  startTime: '23:59',
                  courseCode: upcoming.moduleTrack || 'SOM'
                }}
                className="hidden sm:inline-flex"
              />
              <Button
                variant="primary"
                size="md"
                onClick={() => onOpenAssignment?.(upcoming as any)}
                rightIcon={<ArrowRight className="h-4 w-4" />}
                className="w-full sm:w-auto"
              >
                Open
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* 2. Assignments Filter and List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
            MY COURSE ASSIGNMENTS
          </h3>

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(['all', 'pending', 'submitted'] as const).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setFilter(tabKey)}
                className={`px-3 py-1 text-xs font-bold capitalize rounded-lg transition-all cursor-pointer ${
                  filter === tabKey
                    ? 'bg-white text-[var(--color-primary)] shadow-xs dark:bg-slate-700 dark:text-sky-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {tabKey}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {assignmentList.map((item) => {
            const sub = studentSubmissionsMap.get(item.id);
            const status = sub?.score !== undefined ? 'graded' : sub ? 'submitted' : 'pending';

            if (filter === 'pending' && status !== 'pending') return null;
            if (filter === 'submitted' && status === 'pending') return null;

            return (
              <MobileAssessmentCard
                key={item.id}
                studentName={studentName}
                courseTitle={item.moduleTrack || 'Pastoral Leadership'}
                assignmentTitle={item.title}
                dueDate={item.dueDate || 'Sep 18'}
                submittedDate={sub?.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : undefined}
                score={sub?.score}
                status={status}
                onView={() => onOpenAssignment?.(item)}
                actionLabel={status === 'pending' ? 'Submit' : 'View Submission'}
              />
            );
          })}
        </div>

        {/* Desktop View: Clean Table */}
        <div className="hidden sm:block overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-slate-50 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:bg-slate-800/60 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Course / Assignment</th>
                <th className="px-5 py-3.5">Due Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Score</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60 dark:divide-slate-800/60">
              {assignmentList.map((item) => {
                const sub = studentSubmissionsMap.get(item.id);
                const isGraded = sub?.score !== undefined;
                const isSubmitted = !!sub;
                const status = isGraded ? 'graded' : isSubmitted ? 'submitted' : 'pending';

                if (filter === 'pending' && status !== 'pending') return null;
                if (filter === 'submitted' && status === 'pending') return null;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-[var(--color-text)] dark:text-slate-100">
                        {item.title}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] dark:text-slate-400">
                        {item.moduleTrack || 'General Ministry'}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-xs font-medium text-[var(--color-text-muted)] dark:text-slate-300">
                      {item.dueDate || 'Sep 18'}
                    </td>

                    <td className="px-5 py-4">
                      <Badge
                        variant={isGraded ? 'success' : isSubmitted ? 'info' : 'warning'}
                        size="sm"
                      >
                        {isGraded ? 'Graded' : isSubmitted ? 'Submitted' : 'Pending'}
                      </Badge>
                    </td>

                    <td className="px-5 py-4 font-bold text-sm">
                      {isGraded ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {sub.score}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <AddToCalendarButton
                          event={{
                            id: item.id,
                            title: `Due: ${item.title}`,
                            description: item.description || `Coursework deadline for ${item.moduleTrack}`,
                            location: 'HTEIM Student Portal Online',
                            date: item.dueDate ? (item.dueDate.includes('2026') ? item.dueDate : `2026-09-18`) : '2026-09-18',
                            startTime: '23:59',
                            courseCode: item.moduleTrack || 'SOM'
                          }}
                          className="hidden md:inline-flex"
                        />
                        <Button
                          size="sm"
                          variant={status === 'pending' ? 'primary' : 'outline'}
                          onClick={() => onOpenAssignment?.(item)}
                        >
                          {status === 'pending' ? 'Submit' : 'View'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
