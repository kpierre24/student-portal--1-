import React, { useState } from 'react';
import { X, Save, AlertTriangle, Calculator, FileText, Check } from 'lucide-react';
import { GradeRecord, GradeInputData, RubricScoreItem } from '../types';
import { normalizeGradeStage, calculateGradeCategory } from '../services/gradesService';

interface GradeFormProps {
  grade: GradeRecord;
  onSave: (input: GradeInputData) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export const GradeForm: React.FC<GradeFormProps> = ({
  grade,
  onSave,
  onClose,
  isLoading = false,
}) => {
  const [score, setScore] = useState<number>(grade.score);
  const [feedback, setFeedback] = useState<string>(grade.feedback || '');
  const [overrideReason, setOverrideReason] = useState<string>(grade.overrideReason || '');
  const [rubricScores, setRubricScores] = useState<RubricScoreItem[]>(
    grade.rubricScores || [
      { criterionId: 'r1', criterionName: 'Content Mastery & Accuracy', maxPoints: 40, scoreEarned: Math.round((grade.score / (grade.maxPoints || 100)) * 40) },
      { criterionId: 'r2', criterionName: 'Theological Soundness', maxPoints: 30, scoreEarned: Math.round((grade.score / (grade.maxPoints || 100)) * 30) },
      { criterionId: 'r3', criterionName: 'Clarity & Structure', maxPoints: 30, scoreEarned: Math.round((grade.score / (grade.maxPoints || 100)) * 30) },
    ]
  );
  const [error, setError] = useState<string | null>(null);

  const stage = normalizeGradeStage(grade.status);
  const isLocked = stage === 'LOCKED';
  const maxPoints = grade.maxPoints || 100;
  const currentPct = maxPoints > 0 ? Math.round((score / maxPoints) * 100) : 0;
  const classification = calculateGradeCategory(currentPct);

  const handleRubricScoreChange = (id: string, value: number) => {
    const updated = rubricScores.map((r) => {
      if (r.criterionId === id) {
        const clamped = Math.max(0, Math.min(r.maxPoints, value));
        return { ...r, scoreEarned: clamped };
      }
      return r;
    });
    setRubricScores(updated);

    // Auto calculate total score from rubric
    const sum = updated.reduce((acc, curr) => acc + curr.scoreEarned, 0);
    setScore(sum);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (score < 0 || score > maxPoints) {
      setError(`Score must be between 0 and ${maxPoints}`);
      return;
    }

    if (isLocked && !overrideReason.trim()) {
      setError('An explicit administrative override reason is required for locked grades.');
      return;
    }

    try {
      await onSave({
        submissionId: grade.submissionId || grade.id,
        assignmentId: grade.assignmentId,
        studentId: grade.studentId,
        courseCode: grade.courseCode,
        score,
        feedback,
        rubricScores,
        overrideReason: isLocked ? overrideReason : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save grade');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Grade Submission: {grade.studentName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {grade.courseCode} &bull; {grade.assignmentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 rounded-lg flex items-start gap-2 text-red-700 dark:text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLocked && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold">Grade Record Locked</p>
                <p className="mt-0.5 opacity-90">
                  This grade has been finalized and locked. Updating requires explicit administrative override authorization.
                </p>
              </div>
            </div>
          )}

          {/* Primary Score Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Total Score (out of {maxPoints})
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max={maxPoints}
                  step="0.5"
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold text-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                  / {maxPoints}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-lg p-3 flex flex-col justify-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">Computed Grade</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{currentPct}%</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    classification === 'Honor Roll'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                      : classification === 'Satisfactory'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                  }`}
                >
                  {classification}
                </span>
              </div>
            </div>
          </div>

          {/* Rubric Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-indigo-500" />
                Rubric Criteria Breakdown
              </label>
            </div>
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
              {rubricScores.map((item) => (
                <div key={item.criterionId} className="flex items-center justify-between text-xs gap-3">
                  <span className="font-medium text-slate-700 dark:text-slate-300 shrink-1 truncate">
                    {item.criterionName}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max={item.maxPoints}
                      value={item.scoreEarned}
                      onChange={(e) => handleRubricScoreChange(item.criterionId, Number(e.target.value))}
                      className="w-14 px-2 py-1 text-right bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md font-mono text-slate-900 dark:text-slate-100"
                    />
                    <span className="text-slate-400 font-mono">/ {item.maxPoints}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Faculty Feedback & Comments
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback for the student..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Override Reason (if locked) */}
          {isLocked && (
            <div>
              <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
                Override Reason (Required)
              </label>
              <textarea
                rows={2}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="State the administrative reason for modifying this locked grade..."
                className="w-full px-3 py-2 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <span className="inline-block animate-spin font-mono">...</span>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Grade</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
