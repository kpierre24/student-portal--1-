import React, { useState } from 'react';
import { 
  Sliders, 
  Check, 
  RotateCcw, 
  AlertCircle, 
  Scale, 
  BookOpen, 
  FileText, 
  CalendarCheck, 
  Sparkles,
  HelpCircle,
  Calculator
} from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/ui/Button';
import { 
  GradingWeights, 
  DEFAULT_GRADING_WEIGHTS, 
  validateGradingWeights,
  calculateWeightedComposite
} from '../../../data/gradingWeights';

export interface GradingWeightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  weights: GradingWeights;
  onSaveWeights: (newWeights: GradingWeights) => void;
}

export const GradingWeightsModal: React.FC<GradingWeightsModalProps> = ({
  isOpen,
  onClose,
  weights,
  onSaveWeights,
}) => {
  const [localWeights, setLocalWeights] = useState<GradingWeights>(() => weights || DEFAULT_GRADING_WEIGHTS);

  // Sync with prop when opened
  React.useEffect(() => {
    if (isOpen) {
      setLocalWeights(weights || DEFAULT_GRADING_WEIGHTS);
    }
  }, [isOpen, weights]);

  const total = 
    (localWeights.quizzes || 0) + 
    (localWeights.assignments || 0) + 
    (localWeights.attendance || 0) + 
    (localWeights.scriptureRecitation || 0);

  const isValid = Math.abs(total - 100) < 0.01;

  const handleSliderChange = (key: keyof GradingWeights, val: number) => {
    setLocalWeights(prev => ({
      ...prev,
      [key]: Math.max(0, Math.min(100, Math.round(val)))
    }));
  };

  const handleAutoBalance = () => {
    if (total === 0) {
      setLocalWeights(DEFAULT_GRADING_WEIGHTS);
      return;
    }
    const q = Math.round(((localWeights.quizzes || 0) / total) * 100);
    const a = Math.round(((localWeights.assignments || 0) / total) * 100);
    const att = Math.round(((localWeights.attendance || 0) / total) * 100);
    const scrip = Math.max(0, 100 - (q + a + att));
    setLocalWeights({
      quizzes: q,
      assignments: a,
      attendance: att,
      scriptureRecitation: scrip,
    });
  };

  const handleApplyPreset = (preset: GradingWeights) => {
    setLocalWeights(preset);
  };

  const handleSave = () => {
    if (!isValid) return;
    onSaveWeights(localWeights);
    onClose();
  };

  // Sample student calculation preview
  const sampleStudent = {
    quizPct: 88,
    assignmentPct: 85,
    attendancePct: 94,
    scripturePct: 95,
  };
  const sampleComposite = calculateWeightedComposite(sampleStudent, localWeights);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Weighted Grading Formula"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Intro */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                Institutional Syllabus Weighting Policy
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Configure the percentage contribution of each academic component toward every student’s final composite grade. The total sum across all 4 categories must equal exactly <span className="font-bold text-slate-900 dark:text-white">100%</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Live Total Status & Visual Breakdown Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-700 dark:text-slate-300">
              Total Weight Allocation:
            </span>
            <span className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-full ${
              isValid
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse'
            }`}>
              {total}% {isValid ? '✓ Valid (100%)' : `(Needs ${100 - total > 0 ? `+${100 - total}%` : `${100 - total}%`})`}
            </span>
          </div>

          <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-slate-300 dark:border-slate-600 shadow-inner">
            <div
              style={{ width: `${Math.max(0, localWeights.quizzes || 0)}%` }}
              className="bg-indigo-500 h-full rounded-l-full transition-all duration-300"
              title={`Quizzes: ${localWeights.quizzes}%`}
            />
            <div
              style={{ width: `${Math.max(0, localWeights.assignments || 0)}%` }}
              className="bg-purple-500 h-full transition-all duration-300"
              title={`Assignments: ${localWeights.assignments}%`}
            />
            <div
              style={{ width: `${Math.max(0, localWeights.attendance || 0)}%` }}
              className="bg-emerald-500 h-full transition-all duration-300"
              title={`Attendance: ${localWeights.attendance}%`}
            />
            <div
              style={{ width: `${Math.max(0, localWeights.scriptureRecitation || 0)}%` }}
              className="bg-amber-500 h-full rounded-r-full transition-all duration-300"
              title={`Scripture Recitation: ${localWeights.scriptureRecitation}%`}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
              <span>Quizzes ({localWeights.quizzes}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
              <span>Assignments ({localWeights.assignments}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Attendance ({localWeights.attendance}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span>Scripture ({localWeights.scriptureRecitation}%)</span>
            </div>
          </div>
        </div>

        {/* 4 Weight Sliders & Inputs */}
        <div className="space-y-4 pt-2">
          {/* 1. Quizzes */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <label htmlFor="weight-quizzes" className="text-xs font-black text-slate-900 dark:text-white">
                  Quizzes & Module Lesson Exams
                </label>
              </div>
              <div className="flex items-center gap-1">
                <input
                  id="weight-quizzes"
                  type="number"
                  min="0"
                  max="100"
                  value={localWeights.quizzes}
                  onChange={(e) => handleSliderChange('quizzes', parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-center font-mono font-black text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={localWeights.quizzes}
              onChange={(e) => handleSliderChange('quizzes', parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Evaluates student scores across all 16 curriculum lessons & Google Sheets quizzes.
            </p>
          </div>

          {/* 2. Assignments */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <label htmlFor="weight-assignments" className="text-xs font-black text-slate-900 dark:text-white">
                  Written Ministry Assignments & Homework
                </label>
              </div>
              <div className="flex items-center gap-1">
                <input
                  id="weight-assignments"
                  type="number"
                  min="0"
                  max="100"
                  value={localWeights.assignments}
                  onChange={(e) => handleSliderChange('assignments', parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-center font-mono font-black text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={localWeights.assignments}
              onChange={(e) => handleSliderChange('assignments', parseInt(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Evaluates submitted ministerial essays, research papers, and homework tasks.
            </p>
          </div>

          {/* 3. Attendance */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <label htmlFor="weight-attendance" className="text-xs font-black text-slate-900 dark:text-white">
                  Live Classroom Attendance & Participation
                </label>
              </div>
              <div className="flex items-center gap-1">
                <input
                  id="weight-attendance"
                  type="number"
                  min="0"
                  max="100"
                  value={localWeights.attendance}
                  onChange={(e) => handleSliderChange('attendance', parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-center font-mono font-black text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={localWeights.attendance}
              onChange={(e) => handleSliderChange('attendance', parseInt(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Evaluates overall classroom attendance rate and active participation (Graduation minimum ≥75%).
            </p>
          </div>

          {/* 4. Scripture Recitation */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <label htmlFor="weight-scripture" className="text-xs font-black text-slate-900 dark:text-white">
                  Scripture Memorization & Practical Recitation
                </label>
              </div>
              <div className="flex items-center gap-1">
                <input
                  id="weight-scripture"
                  type="number"
                  min="0"
                  max="100"
                  value={localWeights.scriptureRecitation}
                  onChange={(e) => handleSliderChange('scriptureRecitation', parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-center font-mono font-black text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={localWeights.scriptureRecitation}
              onChange={(e) => handleSliderChange('scriptureRecitation', parseInt(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Evaluates weekly scripture memorization verses and practical ministry demonstrations.
            </p>
          </div>
        </div>

        {/* Quick Presets & Auto-Balance Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Presets:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset(DEFAULT_GRADING_WEIGHTS)}
              className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              HTEIM Standard (40/30/20/10)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset({ quizzes: 50, assignments: 25, attendance: 15, scriptureRecitation: 10 })}
              className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              Exam Heavy (50/25/15/10)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset({ quizzes: 30, assignments: 30, attendance: 30, scriptureRecitation: 10 })}
              className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              Balanced (30/30/30/10)
            </button>
          </div>

          {!isValid && (
            <button
              type="button"
              onClick={handleAutoBalance}
              className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg shadow-xs hover:bg-indigo-500 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Auto-Balance to 100%
            </button>
          )}
        </div>

        {/* Live Formula Preview Card */}
        <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Live Composite Formula Preview</span>
            </span>
            <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
              Sample Score: {sampleComposite}%
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 break-words">
            Final Grade = (Quizzes × {localWeights.quizzes}%) + (Assignments × {localWeights.assignments}%) + (Attendance × {localWeights.attendance}%) + (Scripture × {localWeights.scriptureRecitation}%)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!isValid}
            className="flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save Grading Policy</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
