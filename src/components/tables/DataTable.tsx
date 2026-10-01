import React from 'react';
import { TablePagination } from './TablePagination';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  emptyState?: React.ReactNode;
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  className = '',
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-[var(--md-on-surface)]">
          <thead className="border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)] text-xs font-bold tracking-wider text-[var(--md-on-surface-variant)] uppercase">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--md-outline-variant)]">
            {data.map((item, index) => (
              <tr key={keyExtractor(item, index)} className="transition-colors hover:bg-[var(--md-surface-container-highest)]/40">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3.5 ${col.className || ''}`}>
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {currentPage && totalPages && pageSize && totalItems && onPageChange && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
