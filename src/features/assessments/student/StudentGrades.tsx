import React from 'react';
import { Award, Trophy, CheckCircle, AlertTriangle, Download, ArrowRight } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { WeightedGradeBreakdownCard } from './WeightedGradeBreakdownCard';
import { GradingWeights, DEFAULT_GRADING_WEIGHTS } from '../../../data/gradingWeights';

export interface StudentGradesProps {
  studentName: string;
  averageScore?: number;
  attendanceRate?: number;
  quizScorePct?: number;
  assignmentScorePct?: number;
  scriptureScorePct?: number;
  weights?: GradingWeights;
  gradeBreakdown?: Array<{
    id: string;
    courseTitle: string;
    moduleCode: string;
    score: number;
    status: string;
    date: string;
  }>;
  onDownloadTranscript?: () => void;
  className?: string;
}

export const StudentGrades: React.FC<StudentGradesProps> = ({
  studentName,
  averageScore = 88,
  attendanceRate = 92,
  quizScorePct,
  assignmentScorePct,
  scriptureScorePct,
  weights = DEFAULT_GRADING_WEIGHTS,
  gradeBreakdown,
  onDownloadTranscript,
  className = '',
}) => {
  const isHonorRoll = averageScore >= 85;
  const isSatisfactory = averageScore >= 75;

  const defaultBreakdown = gradeBreakdown || [
    {
      id: 'g-1',
      courseTitle: 'Biblical Foundations & Hermeneutics',
      moduleCode: 'MOD-101',
      score: 92,
      status: 'High Distinction',
      date: 'Aug 24, 2026',
    },
    {
      id: 'g-2',
      courseTitle: 'Evangelism & Pastoral Care',
      moduleCode: 'MOD-102',
      score: 86,
      status: 'High Distinction',
      date: 'Aug 31, 2026',
    },
    {
      id: 'g-3',
      courseTitle: 'Pastoral Leadership & Administration',
      moduleCode: 'MOD-103',
      score: 85,
      status: 'Satisfactory',
      date: 'Sep 07, 2026',
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Interactive Weighted Composite Grade Breakdown Card */}
      <WeightedGradeBreakdownCard
        studentName={studentName}
        quizScorePct={quizScorePct ?? averageScore}
        assignmentScorePct={assignmentScorePct ?? 85}
        attendanceRatePct={attendanceRate}
        scriptureScorePct={scriptureScorePct ?? 95}
        weights={weights}
      />

      {/* 2. Academic Performance Overview Banner */}
      <Card
        variant="elevated"
        className="border-2 border-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-surface-elevated)] to-[var(--color-surface)] dark:from-[#08182c] dark:to-[#040e1b]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {isHonorRoll ? (
                <Badge variant="accent" size="sm" icon={<Trophy className="h-3.5 w-3.5" />}>
                  Honor Roll Scholar (≥85%)
                </Badge>
              ) : isSatisfactory ? (
                <Badge variant="success" size="sm">
                  Satisfactory Standing (≥75%)
                </Badge>
              ) : (
                <Badge variant="danger" size="sm">
                  Academic Support Needed
                </Badge>
              )}
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-[var(--color-text)] dark:text-slate-100 font-sans">
              {averageScore}% Average Score
            </h3>

            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] dark:text-slate-400">
              Academic records for <span className="font-bold text-[var(--color-text)] dark:text-slate-200">{studentName}</span>. Attendance: {attendanceRate}%.
            </p>
          </div>

          {onDownloadTranscript && (
            <div className="shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadTranscript}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Official Transcript
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* 2. Grades Breakdown (Desktop Table + Mobile Cards) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
          CURRICULUM MODULE SCORES
        </h3>

        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {defaultBreakdown.map((row) => (
            <Card key={row.id} className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[var(--color-primary)] dark:text-sky-400 uppercase tracking-wider">
                    {row.moduleCode}
                  </span>
                  <h4 className="text-sm font-bold text-[var(--color-text)] dark:text-slate-100">
                    {row.courseTitle}
                  </h4>
                </div>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {row.score}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border)]/50">
                <span>{row.date}</span>
                <Badge variant={row.score >= 85 ? 'accent' : 'success'} size="sm">
                  {row.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-slate-50 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:bg-slate-800/60 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Course Title</th>
                <th className="px-5 py-3.5">Evaluation Date</th>
                <th className="px-5 py-3.5">Standing</th>
                <th className="px-5 py-3.5 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60 dark:divide-slate-800/60">
              {defaultBreakdown.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                >
                  <td className="px-5 py-4 font-mono text-xs font-bold text-[var(--color-primary)] dark:text-sky-400">
                    {row.moduleCode}
                  </td>
                  <td className="px-5 py-4 font-bold text-[var(--color-text)] dark:text-slate-100">
                    {row.courseTitle}
                  </td>
                  <td className="px-5 py-4 text-xs text-[var(--color-text-muted)] dark:text-slate-400">
                    {row.date}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={row.score >= 85 ? 'accent' : 'success'} size="sm">
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right font-black text-sm text-emerald-600 dark:text-emerald-400">
                    {row.score}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
