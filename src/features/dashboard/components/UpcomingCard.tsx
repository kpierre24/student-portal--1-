import React from 'react';
import { Calendar, Clock, MapPin, ArrowRight, Video } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

export interface UpcomingCardProps {
  title?: string;
  courseTitle: string;
  dateTime: string;
  location?: string;
  instructor?: string;
  isLive?: boolean;
  onViewClass?: () => void;
  actionLabel?: string;
  className?: string;
}

export const UpcomingCard: React.FC<UpcomingCardProps> = ({
  title = 'NEXT CLASS',
  courseTitle,
  dateTime,
  location = 'Sanctuary & Live Stream',
  instructor,
  isLive = false,
  onViewClass,
  actionLabel = 'View Class',
  className = '',
}) => {
  return (
    <Card
      variant="elevated"
      className={`relative overflow-hidden border-2 border-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-surface-elevated)] to-[var(--color-surface)] dark:from-[#08182c] dark:to-[#040e1b] ${className}`}
    >
      <div className="flex flex-col justify-between h-full space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--color-primary)] dark:text-sky-400">
              {title}
            </span>

            {isLive ? (
              <Badge variant="danger" size="sm" icon={<Video className="h-3 w-3 animate-pulse" />}>
                Live Now
              </Badge>
            ) : (
              <Badge variant="info" size="sm">
                Upcoming
              </Badge>
            )}
          </div>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--color-text)] dark:text-slate-100 font-sans">
            {courseTitle}
          </h3>

          <div className="mt-3 space-y-1.5 text-xs sm:text-sm text-[var(--color-text-muted)] dark:text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-[var(--color-text)] dark:text-slate-200">
              <Clock className="h-4 w-4 text-[var(--color-primary)] dark:text-sky-400 shrink-0" />
              <span>{dateTime}</span>
            </div>

            {location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{location}</span>
              </div>
            )}

            {instructor && (
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                Instructor: <span className="font-semibold text-slate-700 dark:text-slate-300">{instructor}</span>
              </p>
            )}
          </div>
        </div>

        {onViewClass && (
          <div className="pt-2 border-t border-[var(--color-border)]/60 dark:border-slate-800">
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={onViewClass}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {actionLabel}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
