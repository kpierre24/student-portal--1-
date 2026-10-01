import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-[var(--md-outline-variant)] px-4 py-3 text-xs text-[var(--md-on-surface-variant)]">
      <div>
        Showing <span className="font-bold text-[var(--md-on-surface)]">{start}</span> to{' '}
        <span className="font-bold text-[var(--md-on-surface)]">{end}</span> of{' '}
        <span className="font-bold text-[var(--md-on-surface)]">{totalItems}</span> entries
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-bold text-[var(--md-on-surface)]">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
