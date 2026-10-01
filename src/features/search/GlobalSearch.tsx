import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Zap,
  User,
  BookOpen,
  FileText,
  Award,
  DollarSign,
  MessageSquare,
  Compass,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';
import { useSearch } from './SearchProvider';
import { SearchResults } from './SearchResults';
import { SearchCategory } from './searchService';

const CATEGORY_TABS: Array<{
  id: SearchCategory | 'all';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'actions', label: 'Actions', icon: Zap },
  { id: 'students', label: 'Students', icon: User },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'assignments', label: 'Assignments', icon: FileText },
  { id: 'exams', label: 'Exams', icon: Award },
  { id: 'payments', label: 'Payments', icon: DollarSign },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'pages', label: 'Pages', icon: Compass },
];

export const GlobalSearch: React.FC = () => {
  const {
    isOpen,
    closeSearch,
    query,
    setQuery,
    activeCategory,
    setActiveCategory,
    results,
    executeAction,
  } = useSearch();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset selected index when query or category changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Handle keyboard navigation inside search dialog
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
      return;
    }

    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        executeAction(results[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-16 bg-slate-950/60 backdrop-blur-md animate-fade-in"
      onClick={closeSearch}
      role="dialog"
      aria-modal="true"
      aria-label="Global Search & Command Center"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#08182c] border border-slate-200/90 dark:border-[#1a385c] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Input Bar */}
        <div className="relative flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <Search className="w-5 h-5 text-[var(--color-primary)] dark:text-sky-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students, courses, assignments, exams, or type a command…"
            className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-2 cursor-pointer"
              aria-label="Clear search input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 overflow-x-auto custom-scrollbar shrink-0 bg-slate-50/70 dark:bg-[#051120]">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white shadow-2xs dark:bg-sky-600'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto">
          <SearchResults
            results={results}
            query={query}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            onExecute={executeAction}
          />
        </div>

        {/* Footer Shortcut Navigation Bar */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#051120] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono">
                ↓
              </kbd>
              <span>to navigate</span>
            </span>

            <span className="hidden xs:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono">
                ↵
              </kbd>
              <span>to select</span>
            </span>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            {results.length} item{results.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
};
