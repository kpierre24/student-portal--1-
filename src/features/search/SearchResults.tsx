import React from 'react';
import {
  User,
  BookOpen,
  FileText,
  Award,
  DollarSign,
  MessageSquare,
  Compass,
  Zap,
  ArrowRight,
  CornerDownLeft,
  Sparkles,
} from 'lucide-react';
import { SearchResultItem, SearchCategory } from './searchService';

export interface SearchResultsProps {
  results: SearchResultItem[];
  query: string;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onExecute: (item: SearchResultItem) => void;
}

const CATEGORY_META: Record<
  SearchCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  actions: { label: 'Quick Actions & Commands', icon: Zap, color: 'text-amber-500' },
  students: { label: 'Students', icon: User, color: 'text-blue-500' },
  courses: { label: 'Courses & Modules', icon: BookOpen, color: 'text-emerald-500' },
  assignments: { label: 'Assignments', icon: FileText, color: 'text-amber-600' },
  exams: { label: 'Examinations & Quizzes', icon: Award, color: 'text-purple-500' },
  payments: { label: 'Finance & Payments', icon: DollarSign, color: 'text-emerald-600' },
  messages: { label: 'Messages', icon: MessageSquare, color: 'text-indigo-500' },
  pages: { label: 'Pages & Navigation', icon: Compass, color: 'text-[var(--color-primary)]' },
};

function highlightMatch(text: string, query: string) {
  if (!query.trim() || !text) return text;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;

  const before = text.substring(0, idx);
  const match = text.substring(idx, idx + q.length);
  const after = text.substring(idx + q.length);

  return (
    <>
      {before}
      <span className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded dark:bg-amber-900/60 dark:text-amber-200">
        {match}
      </span>
      {after}
    </>
  );
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  selectedIndex,
  onSelectIndex,
  onExecute,
}) => {
  if (results.length === 0) {
    return (
      <div className="py-12 px-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          No matches found for &ldquo;{query}&rdquo;
        </p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          Try searching for a student name, course code (e.g. &ldquo;Module 1&rdquo;), or action like &ldquo;attendance&rdquo;.
        </p>
      </div>
    );
  }

  // Group by category while keeping flat index mapping
  const categoryOrder: SearchCategory[] = [
    'actions',
    'students',
    'courses',
    'assignments',
    'exams',
    'payments',
    'messages',
    'pages',
  ];

  let currentIndex = 0;
  const groups: Array<{
    category: SearchCategory;
    items: Array<{ item: SearchResultItem; flatIndex: number }>;
  }> = [];

  categoryOrder.forEach((cat) => {
    const catItems = results.filter((r) => r.category === cat);
    if (catItems.length > 0) {
      const indexed = catItems.map((item) => ({
        item,
        flatIndex: currentIndex++,
      }));
      groups.push({ category: cat, items: indexed });
    }
  });

  return (
    <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar px-2 sm:px-3">
      {groups.map((group) => {
        const meta = CATEGORY_META[group.category] || {
          label: group.category,
          icon: Compass,
          color: 'text-slate-400',
        };
        const CatIcon = meta.icon;

        return (
          <div key={group.category} className="space-y-1">
            <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <CatIcon className={`w-3.5 h-3.5 ${meta.color}`} />
              <span>{meta.label}</span>
              <span className="ml-auto text-[10px] opacity-70 font-mono">
                {group.items.length}
              </span>
            </div>

            <div className="space-y-0.5">
              {group.items.map(({ item, flatIndex }) => {
                const isSelected = selectedIndex === flatIndex;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onExecute(item)}
                    onMouseEnter={() => onSelectIndex(flatIndex)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-[var(--md-primary-container)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40 dark:bg-[#023264]/60 dark:text-sky-200'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs transition-colors ${
                          isSelected
                            ? 'bg-[var(--color-primary)] text-white dark:bg-sky-500'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                        }`}
                      >
                        {item.icon || <CatIcon className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm truncate">
                            {highlightMatch(item.title, query)}
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${
                                item.badgeTone === 'success'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  : item.badgeTone === 'accent'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                                  : item.badgeTone === 'warning'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300'
                                  : item.badgeTone === 'danger'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>

                        {item.subtitle && (
                          <p
                            className={`text-xs truncate mt-0.5 ${
                              isSelected
                                ? 'text-[var(--color-primary)]/80 dark:text-sky-300/80'
                                : 'text-slate-400 dark:text-slate-400'
                            }`}
                          >
                            {highlightMatch(item.subtitle, query)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                        Select
                      </span>
                      <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
