import React from 'react';
import { UserCheck, AlertTriangle } from 'lucide-react';
import { Card, Badge } from '../../../components/ui';

export interface AttendanceSummaryProps {
  averageAttendanceRate: number;
  atRiskCount: number;
  onViewAtRisk?: () => void;
  className?: string;
}

export function AttendanceSummary({
  averageAttendanceRate,
  atRiskCount,
  onViewAtRisk,
  className = '',
}: AttendanceSummaryProps) {
  const isHealthy = averageAttendanceRate >= 75;

  return (
    <Card className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <UserCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--md-on-surface)]">Attendance Rate</h4>
            <p className="text-xs text-[var(--md-on-surface-variant)]">Threshold standard: 75%</p>
          </div>
        </div>
        <Badge variant={isHealthy ? 'success' : 'warning'}>
          {averageAttendanceRate}% avg
        </Badge>
      </div>

      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full transition-all duration-500 ${
            isHealthy ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, averageAttendanceRate))}%` }}
        />
      </div>

      {atRiskCount > 0 ? (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong className="font-bold">{atRiskCount} student(s)</strong> below 75% threshold
            </span>
          </div>
          {onViewAtRisk && (
            <button
              type="button"
              onClick={onViewAtRisk}
              className="font-bold underline hover:no-underline ml-2 text-amber-800 dark:text-amber-300"
            >
              Review
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          All active students meet or exceed the 75% attendance threshold.
        </p>
      )}
    </Card>
  );
}
