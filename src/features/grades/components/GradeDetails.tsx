import React, { useState } from 'react';
import {
  X,
  User,
  BookOpen,
  Award,
  Clock,
  ShieldCheck,
  Send,
  Lock,
  Edit2,
  FileText,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { GradeRecord, CanonicalGradeStage } from '../types';
import { GradeStatusBadge } from './GradeStatusBadge';
import {
  normalizeGradeStage,
  calculateGradeCategory,
  getNextLifecycleStages,
} from '../services/gradesService';

interface GradeDetailsProps {
  grade: GradeRecord;
  onClose: () => void;
  onEdit?: (grade: GradeRecord) => void;
  onTransitionStage?: (submissionId: string, targetStage: CanonicalGradeStage, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export const GradeDetails: React.FC<GradeDetailsProps> = ({
  grade,
  onClose,
  onEdit,
  onTransitionStage,
  isLoading = false,
}) => {
  const [transitionReason, setTransitionReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState<CanonicalGradeStage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentStage = normalizeGradeStage(grade.status);
  const nextStages = getNextLifecycleStages(currentStage);
  const rawPercentage =
    grade.percentage ??
    (grade.maxPoints > 0 ? (grade.score / grade.maxPoints) * 100 : 0);
  const percentage = Math.round(rawPercentage);
  const classification = calculateGradeCategory(percentage);

  const handleTriggerTransition = async (targetStage: CanonicalGradeStage) => {
    if ((targetStage === 'LOCKED' || targetStage === 'MODERATION') && !transitionReason.trim()) {
      setShowReasonInput(targetStage);
      return;
    }

    if (!onTransitionStage) return;

    setError(null);
    try {
      await onTransitionStage(grade.submissionId || grade.id, targetStage, transitionReason);
      setShowReasonInput(null);
      setTransitionReason('');
    } catch (err: any) {
      setError(err.message || 'Stage transition failed');
    }
  };

  const lifecyclePipeline: CanonicalGradeStage[] = [
    'SUBMITTED',
    'GRADED',
    'MODERATION',
    'RELEASED',
    'LOCKED',
  ];

  const currentStageIndex = lifecyclePipeline.indexOf(currentStage);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <GradeStatusBadge status={grade.status} size="lg" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {grade.studentName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {grade.courseCode} &bull; {grade.assignmentTitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onEdit && (
              <button
                onClick={() => onEdit(grade)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Grade</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 rounded-lg flex items-start gap-2 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Lifecycle Stepper Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
              Grade Lifecycle Progress
            </div>
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
              {lifecyclePipeline.map((stage, idx) => {
                const isPassed = idx <= currentStageIndex;
                const isCurrent = idx === currentStageIndex;

                return (
                  <div key={stage} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/80 scale-110'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`text-[10px] font-semibold mt-1.5 hidden sm:block ${
                        isCurrent
                          ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                          : isPassed
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metrics Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Earned Score</div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {grade.score}{' '}
                <span className="text-sm font-semibold text-slate-400">/ {grade.maxPoints}</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Percentage</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {percentage}%
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Academic Category</div>
              <div className="mt-1">
                <span
                  className={`inline-block px-2.5 py-1 text-xs font-bold rounded-md ${
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

          {/* Rubric Details */}
          {grade.rubricScores && grade.rubricScores.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Rubric Assessment
              </h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {grade.rubricScores.map((rubric) => (
                  <div
                    key={rubric.criterionId}
                    className="p-3 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-800/30"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {rubric.criterionName}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {rubric.scoreEarned} / {rubric.maxPoints}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Faculty Feedback
            </h3>
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {grade.feedback ? grade.feedback : <em className="text-slate-400">No written feedback provided yet.</em>}
            </div>
          </div>

          {/* Metadata & Override Reasons */}
          {grade.overrideReason && (
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold">Administrative Override Log:</span> {grade.overrideReason}
            </div>
          )}

          {/* Transition Actions */}
          {onTransitionStage && nextStages.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Lifecycle Stage Transition
              </h3>

              {showReasonInput ? (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 rounded-lg">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Reason for transition to <span className="font-bold">{showReasonInput}</span>:
                  </label>
                  <textarea
                    rows={2}
                    value={transitionReason}
                    onChange={(e) => setTransitionReason(e.target.value)}
                    placeholder="Enter justification..."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReasonInput(null);
                        setTransitionReason('');
                      }}
                      className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isLoading || !transitionReason.trim()}
                      onClick={() => handleTriggerTransition(showReasonInput)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md disabled:opacity-50"
                    >
                      Confirm Transition
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {nextStages.map((target) => (
                    <button
                      key={target}
                      disabled={isLoading}
                      onClick={() => handleTriggerTransition(target)}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <span>Move to {target}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
