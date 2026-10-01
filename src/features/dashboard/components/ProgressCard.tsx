import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export interface ProgressItem {
  label: string;
  value: number;
  threshold?: number;
  suffix?: string;
  badge?: string;
}

export interface ProgressCardProps {
  title?: string;
  items?: ProgressItem[];
  attendanceRate?: number;
  assignmentRate?: number;
  averageScore?: number;
  className?: string;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title = 'YOUR PROGRESS',
  items,
  attendanceRate = 92,
  assignmentRate = 84,
  averageScore = 88,
  className = '',
}) => {
  const defaultItems: ProgressItem[] = items || [
    {
      label: 'Attendance',
      value: attendanceRate,
      threshold: 75,
      suffix: '%',
      badge: attendanceRate >= 75 ? 'Satisfactory' : 'At-Risk (<75%)',
    },
    {
      label: 'Assignments',
      value: assignmentRate,
      threshold: 70,
      suffix: '%',
      badge: assignmentRate >= 80 ? 'On Track' : 'Pending',
    },
    {
      label: 'Average',
      value: averageScore,
      threshold: 75,
      suffix: '%',
      badge: averageScore >= 85 ? 'Honor Roll (≥85%)' : 'Passing',
    },
  ];

  return (
    <Card className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
          {title}
        </h3>

        {averageScore >= 85 && (
          <Badge variant="accent" size="sm">
            High Distinction
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {defaultItems.map((item) => {
          const isAtRisk = item.threshold && item.value < item.threshold;
          const isHighDistinction = item.label === 'Average' && item.value >= 85;

          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-bold text-[var(--color-text)] dark:text-slate-200">
                  {item.label}
                </span>

                <div className="flex items-center gap-2">
                  {item.badge && (
                    <Badge
                      variant={isAtRisk ? 'danger' : isHighDistinction ? 'accent' : 'success'}
                      size="sm"
                    >
                      {item.badge}
                    </Badge>
                  )}

                  <span className="font-black text-[var(--color-text)] dark:text-slate-100 font-sans">
                    {item.value}
                    {item.suffix || '%'}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isAtRisk
                      ? 'bg-red-500'
                      : isHighDistinction
                      ? 'bg-[var(--color-accent)]'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
