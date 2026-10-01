import React from 'react';
import { Calendar, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card } from '../../../components/ui';
import { AttendanceOverallStats } from '../types';

export interface AttendanceSummaryProps {
  stats: AttendanceOverallStats;
  className?: string;
}

export function AttendanceSummary({ stats, className = '' }: AttendanceSummaryProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}>
      <Card className="flex items-center gap-3 p-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 font-bold">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-[var(--md-on-surface-variant)] uppercase">Total Sessions</div>
          <div className="text-lg font-extrabold text-[var(--md-on-surface)]">{stats.totalSessions}</div>
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 font-bold">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-[var(--md-on-surface-variant)] uppercase">Average Rate</div>
          <div className="text-lg font-extrabold text-[var(--md-primary)]">{stats.averageRate}%</div>
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-bold">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-[var(--md-on-surface-variant)] uppercase">Satisfactory (≥75%)</div>
          <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{stats.satisfactoryCount}</div>
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 font-bold">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] font-bold text-[var(--md-on-surface-variant)] uppercase">At-Risk (&lt;75%)</div>
          <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{stats.atRiskCount}</div>
        </div>
      </Card>
    </div>
  );
}
