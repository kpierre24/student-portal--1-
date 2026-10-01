import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Save, MessageSquare, BookOpen, Award, FileText, Check, ShieldAlert, BadgeCheck } from 'lucide-react';
import { QuizAttempt, QuizResponse, QuizQuestion } from '../../../types';

export interface QuizSubmissionReviewProps {
  submission: QuizAttempt;
  questions?: QuizQuestion[];
  onClose: () => void;
  onSaveFeedback?: (
    submissionId: string,
    feedback: string,
    manualScoreOverride?: number,
    updatedSubmission?: QuizAttempt
  ) => void;
}

export const QuizSubmissionReview: React.FC<QuizSubmissionReviewProps> = ({
  submission,
  questions = [],
  onClose,
  onSaveFeedback
}) => {
  const [feedbackText, setFeedbackText] = useState(submission.teacherFeedback || '');
  const [gradingStatus, setGradingStatus] = useState<'auto_graded' | 'teacher_reviewed' | 'moderated' | 'released'>(
    (submission.gradingStatus as any) || 'auto_graded'
  );

  // Manual Adjustment Audit Trail
  const [adjustmentPoints, setAdjustmentPoints] = useState<number>(submission.manualAdjustmentPoints || 0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>(submission.manualAdjustmentReason || '');
  const [moderatorName, setModeratorName] = useState<string>(submission.moderatorName || 'Senior Pastor / Dean');
  const [moderationReason, setModerationReason] = useState<string>(submission.moderationReason || '');

  // Submissions local state
  const [responses, setResponses] = useState<QuizResponse[]>(submission.responses || []);
  const [isSaved, setIsSaved] = useState(false);

  // Calculate word count
  const getWordCount = (text?: string) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  // Adjust Rubric value for custom criteria and compute points dynamically
  const handleDynamicRubricValueChange = (
    responseIndex: number,
    criterionName: string,
    value: number,
    questionWeight: number,
    rubricCriteriaList: { name: string; weightPercentage: number; maxScore: number }[]
  ) => {
    setResponses(prev => prev.map((r, i) => {
      if (i !== responseIndex) return r;
      const currentRubric = (r.rubricEvaluation || {}) as Record<string, number>;
      const nextRubric = { ...currentRubric, [criterionName]: value };

      // Calculate total percentage: P = Sum( (s_c / maxScore) * weightPercentage )
      let totalPercentageSum = 0;
      let totalWeightsDefined = 0;
      
      rubricCriteriaList.forEach(c => {
        const scoreVal = nextRubric[c.name] !== undefined ? nextRubric[c.name] : 0;
        const scorePercentage = scoreVal / (c.maxScore || 1);
        totalPercentageSum += scorePercentage * (c.weightPercentage / 100);
        totalWeightsDefined += c.weightPercentage;
      });

      // Scale up if total weights do not sum up to 100%
      const scaleMultiplier = totalWeightsDefined > 0 ? (100 / totalWeightsDefined) : 1;
      const finalScorePercentage = totalPercentageSum * scaleMultiplier;

      const pointsEarned = Math.round(finalScorePercentage * questionWeight);

      return {
        ...r,
        rubricEvaluation: nextRubric,
        pointsEarned,
        manualScoreOverride: pointsEarned,
        isCorrect: finalScorePercentage >= 0.75 // Satisfactory is >= 75%
      };
    }));
  };

  // Adjust Rubric value and automatically compute points (Fallback Rubric)
  const handleRubricValueChange = (
    index: number,
    metric: 'understanding' | 'biblicalAccuracy' | 'application' | 'structure',
    value: number,
    questionWeight: number
  ) => {
    setResponses(prev => prev.map((r, i) => {
      if (i !== index) return r;
      const currentRubric = r.rubricEvaluation || { understanding: 0, biblicalAccuracy: 0, application: 0, structure: 0 };
      const nextRubric = { ...currentRubric, [metric]: value };

      // Rubric totals up to 70 points
      const rubricSum = (nextRubric.understanding || 0) + (nextRubric.biblicalAccuracy || 0) + (nextRubric.application || 0) + (nextRubric.structure || 0);
      
      // Scale to max weight of this question
      const maxMetricPossible = 70;
      const pointsEarned = Math.round((rubricSum / maxMetricPossible) * questionWeight);

      return {
        ...r,
        rubricEvaluation: nextRubric,
        pointsEarned,
        manualScoreOverride: pointsEarned,
        isCorrect: pointsEarned >= (questionWeight * 0.75) // Satisfactory pass is >= 75%
      };
    }));
  };

  // Compute total score reactively
  const currentTotalScore = responses.reduce((sum, r) => sum + (r.pointsEarned || 0), 0) + Number(adjustmentPoints || 0);
  const totalPossible = submission.totalPossible || 100;
  const currentPercentage = Math.min(100, Math.max(0, Math.round((currentTotalScore / (totalPossible || 1)) * 100)));

  const handleSave = () => {
    if (onSaveFeedback) {
      const updatedSubmission: QuizAttempt = {
        ...submission,
        responses,
        score: currentTotalScore,
        percentage: currentPercentage,
        scorePercentage: currentPercentage,
        teacherFeedback: feedbackText,
        gradingStatus: gradingStatus as any,
        manualAdjustmentPoints: adjustmentPoints,
        manualAdjustmentReason: adjustmentReason,
        moderatorName,
        moderationReason,
        isReleased: gradingStatus === 'released',
        updatedAt: new Date().toISOString()
      };

      onSaveFeedback(submission.id, feedbackText, currentTotalScore, updatedSubmission);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-950 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
              HTEIM Academic Grading Office
            </span>
            <h3 className="text-lg font-black tracking-tight">{submission.studentName}</h3>
            <p className="text-xs text-purple-200 opacity-90">{submission.quizTitle || 'Ministry Assessment Module'}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pipeline Stepper Progress Bar */}
        <div className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Grading Status Pipeline
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setGradingStatus('auto_graded')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-tight border transition-all cursor-pointer ${
                  gradingStatus === 'auto_graded'
                    ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800'
                    : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                }`}
              >
                Auto Graded
              </button>
              <button
                onClick={() => setGradingStatus('teacher_reviewed')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-tight border transition-all cursor-pointer ${
                  gradingStatus === 'teacher_reviewed'
                    ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800'
                    : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                }`}
              >
                Teacher Reviewed
              </button>
              <button
                onClick={() => setGradingStatus('moderated')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-tight border transition-all cursor-pointer ${
                  gradingStatus === 'moderated'
                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
                    : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                }`}
              >
                Moderated Approval
              </button>
              <button
                onClick={() => setGradingStatus('released')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-tight border transition-all cursor-pointer ${
                  gradingStatus === 'released'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
                    : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                }`}
              >
                Released
              </button>
            </div>
          </div>

          {/* Stepper progress wire */}
          <div className="relative mt-3 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r transition-all duration-500 ${
                gradingStatus === 'auto_graded'
                  ? 'w-[25%] from-purple-500 to-purple-600'
                  : gradingStatus === 'teacher_reviewed'
                  ? 'w-[50%] from-purple-500 to-blue-500'
                  : gradingStatus === 'moderated'
                  ? 'w-[75%] from-purple-500 via-blue-500 to-amber-500'
                  : 'w-[100%] from-purple-500 via-amber-500 to-emerald-500'
              }`}
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Main Scorecard Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-850 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Assessment Data</span>
              <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                Submitted: <span className="text-purple-600 dark:text-purple-400">{submission.submittedAt}</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Time Spent: {submission.timeSpentSeconds ? `${Math.round(submission.timeSpentSeconds / 60)}m` : 'N/A'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Current Status</span>
              <div className="flex items-center gap-1.5">
                {gradingStatus === 'released' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300/30">
                    <BadgeCheck className="w-3.5 h-3.5" /> Official Release
                  </span>
                ) : gradingStatus === 'moderated' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-300/30">
                    <ShieldAlert className="w-3.5 h-3.5" /> Moderated Check
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-300/30">
                    <Award className="w-3.5 h-3.5" /> Needs Attention
                  </span>
                )}
              </div>
            </div>

            <div className="text-right flex flex-col justify-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Calculated Grade</span>
              <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
                {currentTotalScore} / {totalPossible}
              </div>
              <span className="text-[10px] font-bold text-slate-500 block">
                Percentage: <span className="font-mono text-slate-800 dark:text-slate-100">{currentPercentage}%</span> ({currentPercentage >= 85 ? 'Honor Roll' : currentPercentage >= 75 ? 'Satisfactory' : 'At-Risk'})
              </span>
            </div>
          </div>

          {/* Teacher Review Feedback Notes */}
          <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/60 space-y-4 shadow-xs">
            <h4 className="text-xs font-black uppercase text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-purple-600" />
              <span>Instructor Evaluation Comments</span>
            </h4>
            
            <textarea
              rows={2}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Provide encouraging biblical advice or grading feedback notes..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-600 outline-none"
            />
          </div>

          {/* Audit Trail: Manual Adjustments Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Academic Override & Moderation Audit Trail</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Manual Offset Adjustment (Add/Subtract points)
                  </label>
                  <input
                    type="number"
                    value={adjustmentPoints}
                    onChange={(e) => setAdjustmentPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                    placeholder="e.g. +5 or -2"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Adjustment Audit Reason <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    placeholder="Provide justification for manual offset..."
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Moderator displaying name
                  </label>
                  <input
                    type="text"
                    value={moderatorName}
                    onChange={(e) => setModeratorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Moderator checklist notes
                  </label>
                  <input
                    type="text"
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                    placeholder="Notes on moderation status update..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Responses Breakdown */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Itemized Responses & Reflection Rubrics</h4>
            
            {responses.map((resp, i) => {
              const relatedQ = questions.find(q => q.id === resp.questionId && (q as any).quizVersionId === submission.quizVersionId) || questions.find(q => q.id === resp.questionId);
              const isParagraph = (relatedQ?.type === 'paragraph') || (resp.textAnswer && resp.textAnswer.length > 5 && !resp.selectedOptionId);
              const words = getWordCount(resp.textAnswer);
              const qWeight = relatedQ?.weight || resp.pointsEarned || 10;
              
              // Determine if a custom rubric is attached
              const customRubric = relatedQ?.rubric;

              return (
                <div 
                  key={resp.questionId || i} 
                  className={`p-4 sm:p-5 rounded-2xl border text-xs space-y-4 shadow-xs transition-colors ${
                    resp.isCorrect 
                      ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/60' 
                      : 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-800 pb-2.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-600" /> Question #{i + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-extrabold uppercase text-slate-500">Score:</label>
                      <input
                        type="number"
                        min="0"
                        max={qWeight}
                        value={resp.pointsEarned ?? 0}
                        onChange={(e) => {
                          const val = Math.min(qWeight, Math.max(0, Number(e.target.value)));
                          setResponses(prev => prev.map((r, idx) => {
                            if (idx !== i) return r;
                            return {
                              ...r,
                              pointsEarned: val,
                              manualScoreOverride: val,
                              isCorrect: val >= (qWeight * 0.75)
                            };
                          }));
                        }}
                        className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-black text-purple-600 dark:text-purple-400 focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                      <span className="font-mono text-xs font-bold text-slate-500">/ {qWeight} pts</span>
                    </div>
                  </div>

                  {relatedQ?.questionText && (
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Prompt: <span className="text-slate-900 dark:text-white">{relatedQ.questionText}</span>
                    </p>
                  )}

                  {resp.textAnswer && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>STUDENT PLAIN-TEXT ANSWER</span>
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          Word Count: {words}
                        </span>
                      </div>
                      <p className="font-mono bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-slate-200 leading-relaxed text-xs">
                        "{resp.textAnswer}"
                      </p>
                    </div>
                  )}

                  {resp.selectedOptionId && (
                    <p className="font-mono text-slate-600 dark:text-slate-400">
                      Selected Option: <span className="font-black text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md">{resp.selectedOptionId}</span>
                    </p>
                  )}

                  {resp.selectedOptionIds && resp.selectedOptionIds.length > 0 && (
                    <p className="font-mono text-slate-600 dark:text-slate-400">
                      Selected Multi-Options: <span className="font-bold">{resp.selectedOptionIds.join(', ')}</span>
                    </p>
                  )}

                  {/* Rubric Evaluator for Paragraph/Essay questions */}
                  {isParagraph && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-300 tracking-wider">
                          {customRubric ? `Active Rubric: ${customRubric.name}` : 'Theological Essay Evaluation Rubric'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-full">
                          Max weighted: {qWeight} pts
                        </span>
                      </div>

                      {customRubric ? (
                        /* Render custom attached rubric dynamically */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {customRubric.criteria.map((crit, crIdx) => {
                            const score = resp.rubricEvaluation?.[crit.name] || 0;
                            return (
                              <div key={crIdx} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                  <span>{crit.name} ({crit.weightPercentage}%)</span>
                                  <span>{score} / {crit.maxScore}</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max={crit.maxScore}
                                  value={score}
                                  onChange={(e) => handleDynamicRubricValueChange(i, crit.name, Number(e.target.value), qWeight, customRubric.criteria)}
                                  className="w-full accent-purple-600 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Fallback Rubric layout */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* Understanding */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              <span>Understanding & Exposition</span>
                              <span>{resp.rubricEvaluation?.understanding || 0} / 20</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="20"
                              value={resp.rubricEvaluation?.understanding || 0}
                              onChange={(e) => handleRubricValueChange(i, 'understanding', Number(e.target.value), qWeight)}
                              className="w-full accent-purple-600 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Biblical Accuracy */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              <span>Biblical & Hermeneutic Accuracy</span>
                              <span>{resp.rubricEvaluation?.biblicalAccuracy || 0} / 20</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="20"
                              value={resp.rubricEvaluation?.biblicalAccuracy || 0}
                              onChange={(e) => handleRubricValueChange(i, 'biblicalAccuracy', Number(e.target.value), qWeight)}
                              className="w-full accent-purple-600 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Practical Application */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              <span>Practical Ministry Application</span>
                              <span>{resp.rubricEvaluation?.application || 0} / 20</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="20"
                              value={resp.rubricEvaluation?.application || 0}
                              onChange={(e) => handleRubricValueChange(i, 'application', Number(e.target.value), qWeight)}
                              className="w-full accent-purple-600 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Structural Clarity */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              <span>Structure, Clarity & Syntax</span>
                              <span>{resp.rubricEvaluation?.structure || 0} / 10</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={resp.rubricEvaluation?.structure || 0}
                              onChange={(e) => handleRubricValueChange(i, 'structure', Number(e.target.value), qWeight)}
                              className="w-full accent-purple-600 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>
                      )}

                      {/* Rubric Sum details */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                        <span>
                          {customRubric ? 'Calculated score scale: weighted percentage based' : `Rubric Raw sum: ${(resp.rubricEvaluation?.understanding || 0) + (resp.rubricEvaluation?.biblicalAccuracy || 0) + (resp.rubricEvaluation?.application || 0) + (resp.rubricEvaluation?.structure || 0)} / 70`}
                        </span>
                        <span>
                          Proportional Score (Scaled to Q weight):{' '}
                          <span className="font-mono text-emerald-600 font-extrabold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/30">
                            {resp.pointsEarned} pts
                          </span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Instructor Question Commentary / Feedback */}
                  <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Instructor Question Commentary / Feedback
                    </label>
                    <input
                      type="text"
                      value={resp.comment || resp.instructorFeedback || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setResponses(prev => prev.map((r, idx) => idx === i ? { ...r, comment: val, instructorFeedback: val } : r));
                      }}
                      placeholder="e.g. Excellent explanation."
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none text-slate-800 dark:text-slate-200"
                    />
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 font-bold">
            {adjustmentPoints !== 0 && !adjustmentReason.trim() ? (
              <span className="text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Please specify a required audit reason.
              </span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Overrides ready for validation lock.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={adjustmentPoints !== 0 && !adjustmentReason.trim()}
              className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Evaluation Locked!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Commit Evaluation Sheet</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
