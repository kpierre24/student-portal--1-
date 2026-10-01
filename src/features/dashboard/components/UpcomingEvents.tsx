import React from 'react';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { Card, EmptyState } from '../../../components/ui';
import { ClassDay } from '../../../types';

export interface UpcomingEventsProps {
  classDays?: ClassDay[];
  onNavigateToSchedule?: () => void;
  className?: string;
}

export function UpcomingEvents({
  classDays = [],
  onNavigateToSchedule,
  className = '',
}: UpcomingEventsProps) {
  const upcoming = classDays.slice(0, 3);

  return (
    <Card className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--md-on-surface)]">Upcoming Schedule</h4>
            <p className="text-xs text-[var(--md-on-surface-variant)]">Lectures & Module Check-ins</p>
          </div>
        </div>
        {onNavigateToSchedule && (
          <button
            type="button"
            onClick={onNavigateToSchedule}
            className="inline-flex items-center gap-1 text-xs font-bold text-[var(--md-primary)] hover:underline"
          >
            Schedule <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {upcoming.length === 0 ? (
        <EmptyState
          title="No upcoming classes scheduled"
          description="Check back later for updated academic calendar entries."
          className="py-6"
        />
      ) : (
        <div className="space-y-2.5">
          {upcoming.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)] p-3 text-xs"
            >
              <div className="font-semibold text-[var(--md-on-surface)]">{item.name || 'Scheduled Lecture'}</div>
              <div className="flex items-center gap-1.5 text-[var(--md-on-surface-variant)] font-medium">
                <Clock className="h-3.5 w-3.5 text-[var(--md-primary)]" />
                <span>Cohort {item.cohortId || 'HTEIM'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
