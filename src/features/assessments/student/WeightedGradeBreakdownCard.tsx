import React, { useState } from 'react';
import { 
  Calculator, 
  Trophy, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  FileText, 
  CalendarCheck, 
  Sparkles,
  Info
} from 'lucide-react';
import { 
  GradingWeights, 
  DEFAULT_GRADING_WEIGHTS, 
  getDetailedWeightedBreakdown 
} from '../../../data/gradingWeights';

export interface WeightedGradeBreakdownCardProps {
  studentName: string;
  quizScorePct: number;
  assignmentScorePct: number;
  attendanceRatePct: number;
  scriptureScorePct?: number;
  weights?: GradingWeights;
  className?: string;
}

export const WeightedGradeBreakdownCard: React.FC<WeightedGradeBreakdownCardProps> = ({
  studentName,
  quizScorePct = 0,
  assignmentScorePct = 85,
  attendanceRatePct = 90,
  scriptureScorePct = 95,
  weights = DEFAULT_GRADING_WEIGHTS,
  className = '',
}) => {
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);

  const breakdown = getDetailedWeightedBreakdown(
    {
      quizPct: quizScorePct,
      assignmentPct: assignmentScorePct,
      attendancePct: attendanceRatePct,
      scripturePct: scriptureScorePct,
    },
    weights
  );

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-5 ${className}`}>
      {/* 1. Header Banner with Composite Average and Honor Standing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Calculator className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              Weighted Composite Grade Breakdown
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Syllabus-weighted academic calculation for <span className="font-bold text-slate-800 dark:text-slate-200">{studentName}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Final Composite</p>
            <div className="flex items-baseline gap-1.5 justify-end">
              <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {breakdown.composite}%
              </span>
              <span className="px-2 py-0.5 rounded font-black text-xs bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200">
                {breakdown.letterGrade}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            {breakdown.standing === 'Honor Roll' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                <Trophy className="w-3.5 h-3.5" /> High Distinction (≥85%)
              </span>
            ) : breakdown.standing === 'Satisfactory' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" /> Satisfactory (≥75%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs">
                <AlertCircle className="w-3.5 h-3.5" /> At-Risk (&lt;75%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. 3-Component Visual Breakdown Grid (Quizzes, Attendance, Scripture) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Component 1: Quizzes & Exams */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-200">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Quizzes & Exams</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Weight: {breakdown.components.quizzes.weight}%
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Raw Score</p>
              <p className="text-lg font-black font-mono text-slate-900 dark:text-white">
                {breakdown.components.quizzes.rawPct}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Points Earned</p>
              <p className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                +{breakdown.components.quizzes.contribution}
              </p>
            </div>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, breakdown.components.quizzes.rawPct)}%` }} 
            />
          </div>
        </div>

        {/* Component 2: Attendance */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-200">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Attendance</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Weight: {breakdown.components.attendance.weight}%
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Raw Rate</p>
              <p className="text-lg font-black font-mono text-slate-900 dark:text-white">
                {breakdown.components.attendance.rawPct}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Points Earned</p>
              <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                +{breakdown.components.attendance.contribution}
              </p>
            </div>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, breakdown.components.attendance.rawPct)}%` }} 
            />
          </div>
        </div>

        {/* Component 3: Scripture Memorization */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Scripture Drill</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              Weight: {breakdown.components.scriptureRecitation.weight}%
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Raw Score</p>
              <p className="text-lg font-black font-mono text-slate-900 dark:text-white">
                {breakdown.components.scriptureRecitation.rawPct}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Points Earned</p>
              <p className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                +{breakdown.components.scriptureRecitation.contribution}
              </p>
            </div>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, breakdown.components.scriptureRecitation.rawPct)}%` }} 
            />
          </div>
        </div>
      </div>

      {/* 3. Transparent Calculation Dropdown */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setShowFormulaDetails(prev => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer py-1"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>How is my final composite grade calculated?</span>
          </span>
          {showFormulaDetails ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showFormulaDetails && (
          <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs text-slate-700 dark:text-slate-300 animate-fadeIn">
            <p className="font-extrabold text-slate-900 dark:text-white">Official Syllabus Grading Formula:</p>
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-indigo-700 dark:text-indigo-300 break-all leading-relaxed">
              {breakdown.formulaString}
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <li><strong className="text-slate-700 dark:text-slate-200">Quizzes & Exams ({breakdown.components.quizzes.weight}%):</strong> {breakdown.components.quizzes.rawPct}% × {breakdown.components.quizzes.weight}% = {breakdown.components.quizzes.contribution} composite points</li>
              <li><strong className="text-slate-700 dark:text-slate-200">Class Attendance ({breakdown.components.attendance.weight}%):</strong> {breakdown.components.attendance.rawPct}% × {breakdown.components.attendance.weight}% = {breakdown.components.attendance.contribution} composite points</li>
              <li><strong className="text-slate-700 dark:text-slate-200">Scripture Memorization ({breakdown.components.scriptureRecitation.weight}%):</strong> {breakdown.components.scriptureRecitation.rawPct}% × {breakdown.components.scriptureRecitation.weight}% = {breakdown.components.scriptureRecitation.contribution} composite points</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
