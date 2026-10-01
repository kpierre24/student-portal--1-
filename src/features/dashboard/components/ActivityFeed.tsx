import React from 'react';
import { CheckCircle, FileText, BookOpen, DollarSign, Cloud, Clock } from 'lucide-react';
import { Card } from '../../../components/ui/Card';

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'attendance' | 'submission' | 'library' | 'payment' | 'sync';
}

export interface ActivityFeedProps {
  title?: string;
  activities?: ActivityItem[];
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  title = 'RECENT ACTIVITY',
  activities,
  className = '',
}) => {
  const defaultActivities: ActivityItem[] = activities || [
    {
      id: 'act-1',
      title: 'Attendance marked for Pastoral Leadership',
      description: '10 of 12 students checked in live',
      timestamp: '2 hours ago',
      type: 'attendance',
    },
    {
      id: 'act-2',
      title: 'New assignment submitted',
      description: 'Hermeneutics Essay submitted by Mark A.',
      timestamp: '4 hours ago',
      type: 'submission',
    },
    {
      id: 'act-3',
      title: 'Curriculum handout published',
      description: 'Systematic Theology — Session 3 Study Guide',
      timestamp: 'Yesterday',
      type: 'library',
    },
    {
      id: 'act-4',
      title: 'Tuition installment verified',
      description: 'Online receipt issued for TT$ 350.00',
      timestamp: 'Yesterday',
      type: 'payment',
    },
  ];

  const iconMap = {
    attendance: <CheckCircle className="h-4 w-4 text-emerald-600" />,
    submission: <FileText className="h-4 w-4 text-indigo-600" />,
    library: <BookOpen className="h-4 w-4 text-amber-600" />,
    payment: <DollarSign className="h-4 w-4 text-emerald-600" />,
    sync: <Cloud className="h-4 w-4 text-sky-600" />,
  };

  return (
    <Card className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-slate-400">
          {title}
        </h3>
        <span className="text-xs text-[var(--color-text-muted)] dark:text-slate-400 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Live feed
        </span>
      </div>

      <div className="space-y-3">
        {defaultActivities.map((act) => (
          <div
            key={act.id}
            className="flex items-start gap-3 text-xs sm:text-sm border-b border-[var(--color-border)]/50 pb-2.5 last:border-b-0 last:pb-0 dark:border-slate-800/50"
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              {iconMap[act.type]}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--color-text)] dark:text-slate-200">
                {act.title}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] dark:text-slate-400">
                {act.description}
              </p>
            </div>

            <span className="text-[11px] text-[var(--color-text-muted)] dark:text-slate-400 shrink-0">
              {act.timestamp}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
