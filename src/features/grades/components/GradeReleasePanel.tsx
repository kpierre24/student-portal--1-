import React, { useState } from 'react';
import { Send, Lock, CheckCircle2, AlertCircle, Info, BookOpen, Layers } from 'lucide-react';
import { GradeRecord, CanonicalGradeStage } from '../types';
import { GradeStatusBadge } from './GradeStatusBadge';
import { normalizeGradeStage } from '../services/gradesService';

interface GradeReleasePanelProps {
  grades: GradeRecord[];
  onTransitionStage: (submissionId: string, targetStage: CanonicalGradeStage, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export const GradeReleasePanel: React.FC<GradeReleasePanelProps> = ({
  grades,
  onTransitionStage,
  isLoading = false,
}) => {
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [showConfirmRelease, setShowConfirmRelease] = useState(false);
  const [showConfirmLock, setShowConfirmLock] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Group grades by course code
  const courseCodes = Array.from(new Set(grades.map((g) => g.courseCode))).sort();

  const relevantGrades = grades.filter((g) => {
    if (selectedCourse !== 'all' && g.courseCode.toUpperCase() !== selectedCourse.toUpperCase()) {
      return false;
    }
    return true;
  });

  const readyToReleaseCount = relevantGrades.filter(
    (g) => normalizeGradeStage(g.status) === 'MODERATION' || normalizeGradeStage(g.status) === 'GRADED'
  ).length;

  const releasedCount = relevantGrades.filter(
    (g) => normalizeGradeStage(g.status) === 'RELEASED'
  ).length;

  const lockedCount = relevantGrades.filter(
    (g) => normalizeGradeStage(g.status) === 'LOCKED'
  ).length;

  const handleBulkRelease = async () => {
    const targetItems = relevantGrades.filter(
      (g) => normalizeGradeStage(g.status) === 'MODERATION' || normalizeGradeStage(g.status) === 'GRADED'
    );

    if (targetItems.length === 0) return;

    for (const item of targetItems) {
      await onTransitionStage(
        item.submissionId || item.id,
        'RELEASED',
        releaseNotes || 'Official course grade release batch'
      );
    }

    setMessage(`Successfully released ${targetItems.length} grade records to student portals.`);
    setShowConfirmRelease(false);
    setReleaseNotes('');
  };

  const handleBulkLock = async () => {
    const targetItems = relevantGrades.filter(
      (g) => normalizeGradeStage(g.status) === 'RELEASED'
    );

    if (targetItems.length === 0) return;

    for (const item of targetItems) {
      await onTransitionStage(
        item.submissionId || item.id,
        'LOCKED',
        releaseNotes || 'Final academic transcript grade lock'
      );
    }

    setMessage(`Successfully locked ${targetItems.length} grade records.`);
    setShowConfirmLock(false);
    setReleaseNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-lg shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Grade Publication & Release Center
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Publish moderated grades to student portals or finalize academic transcript records.
            </p>
          </div>
        </div>

        {/* Course Filter Dropdown */}
        <div className="shrink-0">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Courses ({grades.length} Total Grades)</option>
            {courseCodes.map((c) => (
              <option key={c} value={c}>
                Course: {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            Ready to Publish
          </div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {readyToReleaseCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Grades graded/moderated waiting for release</p>
          {readyToReleaseCount > 0 && (
            <button
              onClick={() => setShowConfirmRelease(true)}
              disabled={isLoading}
              className="mt-3 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Release {readyToReleaseCount} Grades</span>
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            Currently Published
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {releasedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Visible on student portal statements</p>
          {releasedCount > 0 && (
            <button
              onClick={() => setShowConfirmLock(true)}
              disabled={isLoading}
              className="mt-3 w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock {releasedCount} Released Grades</span>
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
            Finalized & Locked
          </div>
          <div className="text-3xl font-black text-slate-700 dark:text-slate-300 mt-1">
            {lockedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Immutable transcript records</p>
        </div>
      </div>

      {/* Confirmation Modal for Release */}
      {showConfirmRelease && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
              <Send className="w-6 h-6" />
              <span>Publish & Release Grades</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You are about to release <strong className="text-slate-900 dark:text-slate-100">{readyToReleaseCount} grade records</strong> for course <span className="font-mono text-emerald-600 font-bold">{selectedCourse}</span> to the student portal.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Release Announcement / Memo:
              </label>
              <textarea
                rows={2}
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                placeholder="Optional release note for students..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowConfirmRelease(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkRelease}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
              >
                Confirm Release
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Lock */}
      {showConfirmLock && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-slate-900 dark:text-slate-100 font-bold text-lg">
              <Lock className="w-6 h-6 text-slate-700 dark:text-slate-300" />
              <span>Lock Academic Transcript Grades</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Locking <strong className="text-slate-900 dark:text-slate-100">{releasedCount} released grade records</strong> will prevent further modifications without an administrative override.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowConfirmLock(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkLock}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 rounded-lg shadow-xs"
              >
                Confirm Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
