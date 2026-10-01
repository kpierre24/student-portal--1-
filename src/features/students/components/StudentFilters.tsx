import React from 'react';
import { Filter, Sliders, RotateCcw } from 'lucide-react';
import { StudentFilterOptions } from '../types';
import { ACADEMIC_LEVELS } from '../../../types';

export interface StudentFiltersProps {
  filters: StudentFilterOptions;
  onFilterChange: (filters: Partial<StudentFilterOptions>) => void;
  onResetFilters: () => void;
  className?: string;
}

export function StudentFilters({
  filters,
  onFilterChange,
  onResetFilters,
  className = '',
}: StudentFiltersProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {/* Enrollment Status Filter */}
      <select
        value={filters.enrollmentFilter || 'all'}
        onChange={(e) => onFilterChange({ enrollmentFilter: e.target.value as any })}
        className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-3 py-2 text-xs font-semibold text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
      >
        <option value="all">All Enrollment Statuses</option>
        <option value="active">Active Only</option>
        <option value="dropped_out">🔴 Dropped Out / Withdrawn</option>
        <option value="graduated">🎓 Graduated</option>
        <option value="leave_of_absence">🔵 Leave of Absence</option>
      </select>

      {/* Academic Level Select */}
      <select
        value={filters.levelId}
        onChange={(e) => onFilterChange({ levelId: e.target.value })}
        className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-3 py-2 text-xs font-semibold text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
      >
        <option value="all">All Academic Levels</option>
        {ACADEMIC_LEVELS.map((lvl) => (
          <option key={lvl.id} value={lvl.id}>
            {lvl.code}: {lvl.badge}
          </option>
        ))}
      </select>

      {/* Attendance Status Filter */}
      <select
        value={filters.attendanceFilter}
        onChange={(e) => onFilterChange({ attendanceFilter: e.target.value as any })}
        className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-3 py-2 text-xs font-semibold text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
      >
        <option value="all">All Attendance Rates</option>
        <option value="satisfactory">Satisfactory (≥75%)</option>
        <option value="at_risk">At-Risk (&lt;75%)</option>
        <option value="critical">Critical (≤50%)</option>
      </select>

      {/* Grade Status Filter */}
      <select
        value={filters.gradeFilter}
        onChange={(e) => onFilterChange({ gradeFilter: e.target.value as any })}
        className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-3 py-2 text-xs font-semibold text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
      >
        <option value="all">All Grade Standings</option>
        <option value="honor_roll">Honor Roll (≥85%)</option>
        <option value="satisfactory">Satisfactory (75-84%)</option>
        <option value="at_risk">At-Risk (&lt;75%)</option>
      </select>

      {/* Reset Filters Button */}
      <button
        type="button"
        onClick={onResetFilters}
        className="inline-flex items-center gap-1 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)] px-3 py-2 text-xs font-semibold text-[var(--md-on-surface-variant)] transition hover:bg-[var(--md-surface-container-highest)]"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Reset</span>
      </button>
    </div>
  );
}
