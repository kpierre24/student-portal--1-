import React from 'react';
import {
  X,
  Filter,
  RotateCcw,
  Video,
  FileText,
  FileCode,
  Headphones,
  Globe,
  Image as ImageIcon,
  Check,
  Calendar,
  Layers,
  GraduationCap,
  User,
  Tag
} from 'lucide-react';
import { ResourceFilterState, ResourceTypeFilter, DateAddedFilter, POPULAR_THEOLOGICAL_TAGS } from '../types';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ResourceFilterState;
  onFilterChange: (filters: ResourceFilterState) => void;
  onReset: () => void;
  totalResultsCount?: number;
  availableCourses?: string[];
  availableModules?: { id: string; name: string }[];
  availableCategories?: string[];
  availableInstructors?: string[];
}

const TYPE_OPTIONS: { id: ResourceTypeFilter; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'all', label: 'All Types', icon: <Layers className="w-4 h-4" />, color: 'text-slate-400' },
  { id: 'videos', label: 'Videos', icon: <Video className="w-4 h-4" />, color: 'text-rose-400' },
  { id: 'pdfs', label: 'PDFs', icon: <FileText className="w-4 h-4" />, color: 'text-emerald-400' },
  { id: 'documents', label: 'Documents', icon: <FileCode className="w-4 h-4" />, color: 'text-blue-400' },
  { id: 'audio', label: 'Audio', icon: <Headphones className="w-4 h-4" />, color: 'text-amber-400' },
  { id: 'links', label: 'Links', icon: <Globe className="w-4 h-4" />, color: 'text-purple-400' },
  { id: 'images', label: 'Images', icon: <ImageIcon className="w-4 h-4" />, color: 'text-pink-400' }
];

const DATE_OPTIONS: { id: DateAddedFilter; label: string }[] = [
  { id: 'all', label: 'All Time' },
  { id: 'week', label: 'Past 7 Days' },
  { id: 'month', label: 'Past 30 Days' },
  { id: 'three_months', label: 'Past 3 Months' },
  { id: 'year', label: 'Past Year' }
];

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset,
  totalResultsCount,
  availableCourses = [
    'Systematic Theology',
    'Biblical Studies & Hermeneutics',
    'Christian Leadership & Ministry',
    'Prophetic & Apostolic Ministry',
    'Evangelism & Missions'
  ],
  availableModules = [
    { id: 'SOM-MOD-1', name: 'Module 1: Foundations of Theology' },
    { id: 'SOM-MOD-2', name: 'Module 2: Old & New Testament Survey' },
    { id: 'SOM-MOD-3', name: 'Module 3: Holy Spirit & Spiritual Gifts' },
    { id: 'SOM-MOD-4', name: 'Module 4: Apostolic Governance & Ethics' },
    { id: 'SOM-MOD-5', name: 'Module 5: Pastoral Counseling & Preaching' },
    { id: 'SOM-MOD-6', name: 'Module 6: Global Missions & Church Planting' }
  ],
  availableCategories = [
    'Textbook',
    'Study Guide',
    'Lecture Video',
    'Sermon Audio',
    'Syllabus',
    'Scripture Memory',
    'Presentation Deck',
    'External Resource'
  ],
  availableInstructors = [
    'Elder Renee Pierre',
    'Apostle Dr. Kendell Pierre',
    'Pastor Samuel Selkridge',
    'Minister Grace Thorne',
    'Elder Michael Davis'
  ]
}) => {
  if (!isOpen) return null;

  const activeFilterCount =
    (filters.type !== 'all' ? 1 : 0) +
    (filters.course !== 'all' ? 1 : 0) +
    (filters.module !== 'all' ? 1 : 0) +
    (filters.category !== 'all' ? 1 : 0) +
    (filters.instructor !== 'all' ? 1 : 0) +
    (filters.dateAdded !== 'all' ? 1 : 0) +
    (filters.tags.length > 0 ? filters.tags.length : 0);

  const toggleTag = (tag: string) => {
    const isSelected = filters.tags.includes(tag);
    const updatedTags = isSelected
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFilterChange({ ...filters, tags: updatedTags });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          id="filter-drawer-panel"
          className="w-screen max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-drawer-title"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <Filter className="w-5 h-5" />
              </div>
              <div>
                <h2 id="filter-drawer-title" className="text-lg font-bold text-white flex items-center gap-2">
                  Library Filters
                  {activeFilterCount > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-amber-500 text-slate-950 font-bold rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">Refine curriculum resources & archives</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  id="filter-reset-btn"
                  type="button"
                  onClick={onReset}
                  className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
              <button
                id="filter-close-btn"
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* 1. RESOURCE TYPE */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Resource Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map((opt) => {
                  const isSelected = filters.type === opt.id;
                  return (
                    <button
                      key={opt.id}
                      id={`filter-type-${opt.id}`}
                      type="button"
                      onClick={() => onFilterChange({ ...filters, type: opt.id })}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <span className={opt.color}>{opt.icon}</span>
                      <span className="flex-1 truncate">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. THEOLOGICAL TAGS (Phase 16) */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  Theological Topics & Tags
                </span>
                {filters.tags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onFilterChange({ ...filters, tags: [] })}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    Clear tags
                  </button>
                )}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_THEOLOGICAL_TAGS.map((tag) => {
                  const isSelected = filters.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      id={`filter-tag-${tag.replace('#', '').toLowerCase()}`}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                          : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700/60'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. COURSE / TRACK */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                Course Track
              </label>
              <select
                id="filter-course-select"
                aria-label="Course Track"
                value={filters.course}
                onChange={(e) => onFilterChange({ ...filters, course: e.target.value })}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="all">All Courses</option>
                {availableCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. CURRICULUM MODULE */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Academic Module
              </label>
              <select
                id="filter-module-select"
                aria-label="Academic Module"
                value={filters.module}
                onChange={(e) => onFilterChange({ ...filters, module: e.target.value })}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="all">All Modules</option>
                {availableModules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. INSTRUCTOR / SPEAKER */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Faculty Instructor
              </label>
              <select
                id="filter-instructor-select"
                aria-label="Faculty Instructor"
                value={filters.instructor}
                onChange={(e) => onFilterChange({ ...filters, instructor: e.target.value })}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="all">All Faculty</option>
                {availableInstructors.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. CATEGORY */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Resource Category
              </label>
              <select
                id="filter-category-select"
                aria-label="Resource Category"
                value={filters.category}
                onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="all">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. DATE ADDED */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Date Added
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    id={`filter-date-${opt.id}`}
                    type="button"
                    onClick={() => onFilterChange({ ...filters, dateAdded: opt.id })}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                      filters.dateAdded === opt.id
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              {totalResultsCount !== undefined ? (
                <span>
                  Showing <strong className="text-white font-bold">{totalResultsCount}</strong> resources
                </span>
              ) : null}
            </div>

            <button
              id="filter-apply-btn"
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/10 transition-all"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
