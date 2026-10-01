import React from 'react';
import { Search, X } from 'lucide-react';

export interface StudentSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function StudentSearch({
  searchQuery,
  onSearchChange,
  placeholder = 'Search by name, email, ID number...',
  className = '',
}: StudentSearchProps) {
  return (
    <div className={`relative flex-1 ${className}`}>
      <Search
        className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--md-on-surface-variant)] opacity-70"
        aria-hidden="true"
      />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] py-2.5 pl-10 pr-9 text-xs font-medium text-[var(--md-on-surface)] placeholder-[var(--md-on-surface-variant)] transition focus:border-[var(--md-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--md-primary)]"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => onSearchChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--md-on-surface-variant)] hover:bg-[var(--md-surface-container-high)]"
          aria-label="Clear search query"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
