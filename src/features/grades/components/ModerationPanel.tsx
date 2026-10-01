import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  ArrowRight,
  RefreshCw,
  CheckCheck,
} from 'lucide-react';
import { GradeRecord, CanonicalGradeStage } from '../types';
import { GradeStatusBadge } from './GradeStatusBadge';
import {
  normalizeGradeStage,
  calculateGradeCategory,
  calculateGradeStats,
} from '../services/gradesService';

interface ModerationPanelProps {
  grades: GradeRecord[];
  onSelectGrade: (grade: GradeRecord) => void;
  onTransitionStage: (submissionId: string, targetStage: CanonicalGradeStage, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export const ModerationPanel: React.FC<ModerationPanelProps> = ({
  grades,
  onSelectGrade,
  onTransitionStage,
  isLoading = false,
}) => {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moderationNotes, setModerationNotes] = useState('');
  const [bulkActionTarget, setBulkActionTarget] = useState<CanonicalGradeStage | null>(null);

  // Filter items in GRADED or MODERATION stages
  const moderationItems = grades.filter((g) => {
    const stage = normalizeGradeStage(g.status);
    if (stage !== 'GRADED' && stage !== 'MODERATION') return false;

    if (courseFilter !== 'all' && g.courseCode.toUpperCase() !== courseFilter.toUpperCase()) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = g.studentName.toLowerCase().includes(q);
      const matchAssignment = g.assignmentTitle.toLowerCase().includes(q);
      const matchCourse = g.courseCode.toLowerCase().includes(q);
      return matchName || matchAssignment || matchCourse;
    }

    return true;
  });

  const allSelected =
    moderationItems.length > 0 && selectedIds.length === moderationItems.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(moderationItems.map((g) => g.submissionId || g.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkTransition = async (targetStage: CanonicalGradeStage) => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await onTransitionStage(id, targetStage, moderationNotes || 'Bulk moderation transition');
    }
    setSelectedIds([]);
    setModerationNotes('');
    setBulkActionTarget(null);
  };

  const coursesList = Array.from(new Set(grades.map((g) => g.courseCode))).sort();

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="p-4 sm:p-5 bg-purple-500/10 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-purple-600 text-white rounded-lg shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Faculty Grade Moderation Queue
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Review, audit, and approve grades submitted by teaching staff prior to public grade release.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-center">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Pending Queue
            </div>
            <div className="text-lg font-black text-purple-600 dark:text-purple-400">
              {moderationItems.length}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, course or assignment..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Course filter */}
          <div className="relative shrink-0">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Courses</option>
              {coursesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/50 p-1.5 rounded-lg border border-purple-200 dark:border-purple-800/60">
            <span className="text-xs font-semibold text-purple-900 dark:text-purple-200 px-2">
              {selectedIds.length} Selected
            </span>
            <button
              onClick={() => handleBulkTransition('RELEASED')}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1 shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve & Release</span>
            </button>
            <button
              onClick={() => handleBulkTransition('GRADED')}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Request Revision
            </button>
          </div>
        )}
      </div>

      {/* Moderation Items Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded-xs border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                </th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Course / Assignment</th>
                <th className="p-3">Score</th>
                <th className="p-3">Category</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {moderationItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    <CheckCheck className="w-8 h-8 mx-auto mb-2 text-purple-400/60" />
                    No grades pending moderation in this queue.
                  </td>
                </tr>
              ) : (
                moderationItems.map((grade) => {
                  const id = grade.submissionId || grade.id;
                  const isSelected = selectedIds.includes(id);
                  const pct =
                    grade.percentage ??
                    (grade.maxPoints > 0 ? Math.round((grade.score / grade.maxPoints) * 100) : 0);
                  const cat = calculateGradeCategory(pct);

                  return (
                    <tr
                      key={id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(id)}
                          className="rounded-xs border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                        {grade.studentName}
                        {grade.studentNumber && (
                          <div className="text-[10px] text-slate-400 font-mono font-normal">
                            {grade.studentNumber}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-purple-700 dark:text-purple-400 mr-1.5">
                          {grade.courseCode}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">{grade.assignmentTitle}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {grade.score} / {grade.maxPoints}{' '}
                        <span className="text-slate-400 font-normal">({pct}%)</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-xs ${
                            cat === 'Honor Roll'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : cat === 'Satisfactory'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                          }`}
                        >
                          {cat}
                        </span>
                      </td>
                      <td className="p-3">
                        <GradeStatusBadge status={grade.status} size="sm" />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectGrade(grade)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            title="Inspect Grade Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              onTransitionStage(id, 'RELEASED', 'Moderation approved by faculty')
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/60 rounded-md flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
