import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, Badge } from '../../../components/ui';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  badgeText?: string;
  badgeVariant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeVariant = 'info',
  onClick,
  className = '',
}: StatCardProps) {
  return (
    <Card onClick={onClick} className={`relative overflow-hidden ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider text-[var(--md-on-surface-variant)] uppercase">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-extrabold text-[var(--md-on-surface)] tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-[var(--md-on-surface-variant)]">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--md-primary-container)] text-[var(--md-primary)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>

      {badgeText && (
        <div className="mt-4 pt-3 border-t border-[var(--md-outline-variant)]">
          <Badge variant={badgeVariant}>{badgeText}</Badge>
        </div>
      )}
    </Card>
  );
}
