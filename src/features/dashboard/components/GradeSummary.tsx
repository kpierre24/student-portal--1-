import React from 'react';
import { Award, Trophy } from 'lucide-react';
import { Card, Badge } from '../../../components/ui';

export interface GradeSummaryProps {
  averageGradeScore: number;
  honorRollCount: number;
  onViewHonorRoll?: () => void;
  className?: string;
}

export function GradeSummary({
  averageGradeScore,
  honorRollCount,
  onViewHonorRoll,
  className = '',
}: GradeSummaryProps) {
  const isHonorLevel = averageGradeScore >= 85;

  return (
    <Card className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200">
            <Award className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--md-on-surface)]">Academic Performance</h4>
            <p className="text-xs text-[var(--md-on-surface-variant)]">Honor Roll standard: ≥ 85%</p>
          </div>
        </div>
        <Badge variant={isHonorLevel ? 'success' : 'info'}>
          {averageGradeScore}% avg
        </Badge>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)] p-3.5">
        <div className="flex items-center gap-2.5">
          <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold text-[var(--md-on-surface)]">Honor Roll Students</p>
            <p className="text-xs text-[var(--md-on-surface-variant)]">High Distinction (≥85%)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-extrabold text-[var(--md-primary)]">{honorRollCount}</span>
          {onViewHonorRoll && (
            <button
              type="button"
              onClick={onViewHonorRoll}
              className="text-xs font-semibold text-[var(--md-primary)] underline hover:no-underline"
            >
              View
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
