import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Settings,
  Eye,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  BookOpen,
  Clock,
  Award,
  Sparkles,
  Layers,
  FileText,
  Sliders,
  CheckSquare
} from 'lucide-react';
import { Quiz, QuizQuestion, QuizQuestionType } from '../types/quiz.types';
import { useQuizAuthoring } from '../hooks/useQuizAuthoring';
import { QuestionBankService } from '../QuestionBankService';

export interface QuizBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  quizToEdit?: Partial<Quiz> | null;
  onSaveQuiz: (quiz: Quiz) => void;
  onPublishQuiz?: (quiz: Quiz) => void;
}

export const QuizBuilder: React.FC<QuizBuilderProps> = ({
  isOpen,
  onClose,
  quizToEdit,
  onSaveQuiz,
  onPublishQuiz
}) => {
  const authoring = useQuizAuthoring({
    initialQuiz: quizToEdit,
    onSave: onSaveQuiz,
    onPublish: onPublishQuiz
  });

  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankDifficultyFilter, setBankDifficultyFilter] = useState<string>('all');

  if (!isOpen) return null;

  const currentQ = authoring.questions[authoring.activeQuestionIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {quizToEdit ? 'Edit Assessment' : 'Create New Assessment'}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold">
                  {authoring.questions.length} Questions • {authoring.totalPoints} Pts
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                HTEIM Canonical Assessment Engine • Step {authoring.currentStep} of 5
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                authoring.handleSaveDraft();
                onClose();
              }}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wizard Steps Navigation Bar */}
        <div className="grid grid-cols-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold">
          {[
            { step: 1, label: '1. Basic Info', icon: BookOpen },
            { step: 2, label: '2. Questions', icon: Layers },
            { step: 3, label: '3. Settings', icon: Sliders },
            { step: 4, label: '4. Validation', icon: CheckSquare },
            { step: 5, label: '5. Preview & Publish', icon: Send }
          ].map(s => {
            const isActive = authoring.currentStep === s.step;
            const Icon = s.icon;
            return (
              <button
                key={s.step}
                onClick={() => authoring.setCurrentStep(s.step)}
                className={`py-3 px-2 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-amber-600 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Step Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* STEP 1: Basic Information */}
          {authoring.currentStep === 1 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={authoring.title}
                  onChange={e => authoring.setTitle(e.target.value)}
                  placeholder="e.g. Biblical Hermeneutics Midterm Exam"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    value={authoring.courseCode}
                    onChange={e => authoring.setCourseCode(e.target.value)}
                    placeholder="MIN-101"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Curriculum Module Track
                  </label>
                  <input
                    type="text"
                    value={authoring.moduleTrack}
                    onChange={e => authoring.setModuleTrack(e.target.value)}
                    placeholder="Biblical Hermeneutics"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Description & Context
                </label>
                <textarea
                  rows={2}
                  value={authoring.description}
                  onChange={e => authoring.setDescription(e.target.value)}
                  placeholder="Brief summary of what this quiz evaluates..."
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Student Instructions
                </label>
                <textarea
                  rows={3}
                  value={authoring.instructions}
                  onChange={e => authoring.setInstructions(e.target.value)}
                  placeholder="Instructions presented to students before starting..."
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Questions Builder */}
          {authoring.currentStep === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Question List Sidebar */}
              <div className="lg:col-span-4 space-y-3 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Questions ({authoring.questions.length})
                  </h4>
                  <button
                    onClick={() => setShowQuestionBankModal(true)}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <BookOpen className="w-3 h-3" />
                    From Bank
                  </button>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {authoring.questions.map((q, idx) => {
                    const isSelected = authoring.activeQuestionIndex === idx;
                    return (
                      <div
                        key={q.id}
                        onClick={() => authoring.setActiveQuestionIndex(idx)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              #{idx + 1}
                            </span>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {q.type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 ml-auto">
                              {q.weight} pts
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {q.questionText || '(Empty Question Prompt)'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              authoring.moveQuestion(idx, 'up');
                            }}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              authoring.moveQuestion(idx, 'down');
                            }}
                            disabled={idx === authoring.questions.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              authoring.deleteQuestion(idx);
                            }}
                            disabled={authoring.questions.length <= 1}
                            className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => authoring.addQuestion('multiple_choice')}
                    className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Question
                  </button>
                </div>
              </div>

              {/* Active Question Editor */}
              <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                {currentQ ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                          Editing Question #{authoring.activeQuestionIndex + 1}
                        </span>
                        <select
                          value={currentQ.type}
                          onChange={e => authoring.updateQuestion(authoring.activeQuestionIndex, { type: e.target.value as QuizQuestionType })}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                        >
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="checkboxes">Checkboxes (Multi-Select)</option>
                          <option value="true_false">True / False</option>
                          <option value="short_answer">Short Answer</option>
                          <option value="fill_blank">Fill in the Blank</option>
                          <option value="paragraph">Essay / Open Reflection</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Points:</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={currentQ.weight}
                            onChange={e => authoring.updateQuestion(authoring.activeQuestionIndex, { weight: Number(e.target.value) || 10 })}
                            className="w-16 px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => authoring.duplicateQuestion(authoring.activeQuestionIndex)}
                          className="p-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Duplicate
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        Question Prompt *
                      </label>
                      <textarea
                        rows={3}
                        value={currentQ.questionText}
                        onChange={e => authoring.updateQuestion(authoring.activeQuestionIndex, { questionText: e.target.value })}
                        placeholder="State your question clearly here..."
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    {/* Multiple Choice Options */}
                    {(currentQ.type === 'multiple_choice' || currentQ.type === 'true_false') && (
                      <div className="space-y-2.5">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Options & Correct Answer (Select the radio of the correct choice)
                        </label>
                        {(currentQ.options || []).map((opt, optIdx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct_opt_${currentQ.id}`}
                              checked={currentQ.correctOptionId === opt.id}
                              onChange={() => authoring.updateQuestion(authoring.activeQuestionIndex, { correctOptionId: opt.id })}
                              className="w-4 h-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={opt.text}
                              onChange={e => {
                                const newOpts = [...(currentQ.options || [])];
                                newOpts[optIdx] = { ...newOpts[optIdx], text: e.target.value };
                                authoring.updateQuestion(authoring.activeQuestionIndex, { options: newOpts });
                              }}
                              placeholder={`Option ${optIdx + 1}`}
                              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                            />
                            {currentQ.type !== 'true_false' && (currentQ.options || []).length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newOpts = (currentQ.options || []).filter((_, i) => i !== optIdx);
                                  authoring.updateQuestion(authoring.activeQuestionIndex, { options: newOpts });
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}

                        {currentQ.type !== 'true_false' && (
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = [
                                ...(currentQ.options || []),
                                { id: `${currentQ.id}_opt_${Date.now()}`, text: '' }
                              ];
                              authoring.updateQuestion(authoring.activeQuestionIndex, { options: newOpts });
                            }}
                            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Option
                          </button>
                        )}
                      </div>
                    )}

                    {/* Checkboxes Options */}
                    {currentQ.type === 'checkboxes' && (
                      <div className="space-y-2.5">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Options & Correct Answers (Select all correct choices)
                        </label>
                        {(currentQ.options || []).map((opt, optIdx) => {
                          const isChecked = (currentQ.correctOptionIds || []).includes(opt.id);
                          return (
                            <div key={opt.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  const currentIds = currentQ.correctOptionIds || [];
                                  const updated = e.target.checked
                                    ? [...currentIds, opt.id]
                                    : currentIds.filter(id => id !== opt.id);
                                  authoring.updateQuestion(authoring.activeQuestionIndex, { correctOptionIds: updated });
                                }}
                                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={opt.text}
                                onChange={e => {
                                  const newOpts = [...(currentQ.options || [])];
                                  newOpts[optIdx] = { ...newOpts[optIdx], text: e.target.value };
                                  authoring.updateQuestion(authoring.activeQuestionIndex, { options: newOpts });
                                }}
                                placeholder={`Option ${optIdx + 1}`}
                                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                              />
                              {(currentQ.options || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newOpts = (currentQ.options || []).filter((_, i) => i !== optIdx);
                                    authoring.updateQuestion(authoring.activeQuestionIndex, { options: newOpts });
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => {
                            const newOpts = [
                              ...(currentQ.options || []),
                              { id: `${currentQ.id}_opt_${Date.now()}`, text: '' }
                            ];
                            authoring.updateQuestion(authoring.activeQuestionIndex, { options: newOpts });
                          }}
                          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Option
                        </button>
                      </div>
                    )}

                    {/* Short Answer / Fill in the blank */}
                    {(currentQ.type === 'short_answer' || currentQ.type === 'fill_blank') && (
                      <div className="space-y-2.5">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Acceptable Correct Answers (Synonyms / Case-Insensitive)
                        </label>
                        {(currentQ.acceptableAnswers || ['']).map((ans, aIdx) => (
                          <div key={aIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={ans}
                              onChange={e => {
                                const newAcc = [...(currentQ.acceptableAnswers || [''])];
                                newAcc[aIdx] = e.target.value;
                                authoring.updateQuestion(authoring.activeQuestionIndex, { acceptableAnswers: newAcc });
                              }}
                              placeholder="e.g. exegesis"
                              className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                            />
                            {(currentQ.acceptableAnswers || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newAcc = (currentQ.acceptableAnswers || []).filter((_, i) => i !== aIdx);
                                  authoring.updateQuestion(authoring.activeQuestionIndex, { acceptableAnswers: newAcc });
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const newAcc = [...(currentQ.acceptableAnswers || ['']), ''];
                            authoring.updateQuestion(authoring.activeQuestionIndex, { acceptableAnswers: newAcc });
                          }}
                          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Acceptable Synonym
                        </button>
                      </div>
                    )}

                    {/* Explanation / Feedback */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Explanation & Scriptural Rationale (Shown after submission)
                      </label>
                      <textarea
                        rows={2}
                        value={currentQ.explanation || ''}
                        onChange={e => authoring.updateQuestion(authoring.activeQuestionIndex, { explanation: e.target.value })}
                        placeholder="Provide theological context or reference..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-10">Select or add a question to edit.</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Settings & Policy */}
          {authoring.currentStep === 3 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Time Limit & Availability
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Time Limit (Minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={360}
                      value={authoring.settings.timeLimitMinutes || 30}
                      onChange={e => authoring.setSettings({ ...authoring.settings, timeLimitMinutes: Number(e.target.value) || 30 })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Passing Score (%)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={authoring.settings.passingScorePercentage || 75}
                      onChange={e => authoring.setSettings({ ...authoring.settings, passingScorePercentage: Number(e.target.value) || 75 })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Maximum Allowed Attempts
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={authoring.settings.maxAttempts || 2}
                      onChange={e => authoring.setSettings({ ...authoring.settings, maxAttempts: Number(e.target.value) || 2 })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Final Score Calculation Policy
                    </label>
                    <select
                      value={authoring.settings.gradeCalculation || 'highest'}
                      onChange={e => authoring.setSettings({ ...authoring.settings, gradeCalculation: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                    >
                      <option value="highest">Highest Score Attempt</option>
                      <option value="latest">Latest Attempt</option>
                      <option value="average">Average of All Attempts</option>
                      <option value="first">First Attempt Only</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-600" />
                  Presentation & Delivery Options
                </h4>

                <div className="space-y-2">
                  {[
                    { key: 'shuffleQuestions', label: 'Shuffle question order for each student attempt' },
                    { key: 'shuffleOptions', label: 'Shuffle answer choices for multiple choice questions' },
                    { key: 'showCorrectAnswers', label: 'Display correct answers upon grade release' },
                    { key: 'showFeedback', label: 'Display theological feedback and explanations after submission' }
                  ].map(item => (
                    <label key={item.key} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean((authoring.settings as any)[item.key])}
                        onChange={e => authoring.setSettings({ ...authoring.settings, [item.key]: e.target.checked })}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                      />
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Validation & Verification */}
          {authoring.currentStep === 4 && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className={`p-5 rounded-2xl border flex items-start gap-3.5 ${
                authoring.validationResult.isValid
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
              }`}>
                {authoring.validationResult.isValid ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {authoring.validationResult.isValid
                      ? 'Assessment is Complete & Ready for Publication'
                      : `Validation Failed (${authoring.validationResult.errors.length} Errors)`}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {authoring.validationResult.isValid
                      ? 'All questions, options, point totals, and delivery settings adhere to HTEIM School of Ministry standards.'
                      : 'Please address the following requirements before publishing this quiz.'}
                  </p>
                </div>
              </div>

              {authoring.validationResult.errors.length > 0 && (
                <div className="space-y-2">
                  {authoring.validationResult.errors.map((err, eIdx) => (
                    <div
                      key={eIdx}
                      onClick={() => {
                        if (err.questionIndex !== undefined) {
                          authoring.setActiveQuestionIndex(err.questionIndex);
                          authoring.setCurrentStep(2);
                        } else {
                          authoring.setCurrentStep(1);
                        }
                      }}
                      className="p-3 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-300 hover:bg-rose-100/60 cursor-pointer"
                    >
                      <span>• {err.message}</span>
                      <span className="text-[10px] font-bold underline">Fix issue</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Preview & Publish */}
          {authoring.currentStep === 5 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    {authoring.courseCode} • {authoring.moduleTrack}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    Share Code: {authoring.shareCode}
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {authoring.title || 'Untitled Assessment'}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {authoring.description}
                </p>

                <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="block text-lg font-black text-amber-600 dark:text-amber-400">
                      {authoring.questions.length}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Questions</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="block text-lg font-black text-amber-600 dark:text-amber-400">
                      {authoring.totalPoints}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Points</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="block text-lg font-black text-amber-600 dark:text-amber-400">
                      {authoring.settings.timeLimitMinutes || 30}m
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Time Limit</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    authoring.handleSaveDraft();
                    onClose();
                  }}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={!authoring.validationResult.isValid}
                  onClick={() => {
                    authoring.handlePublishQuiz();
                    onClose();
                  }}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-600/20"
                >
                  <Send className="w-4 h-4" />
                  Publish Assessment
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            disabled={authoring.currentStep === 1}
            onClick={() => authoring.setCurrentStep(prev => Math.max(1, prev - 1))}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl disabled:opacity-30 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-xs text-slate-400 font-medium">
            Step {authoring.currentStep} of 5
          </span>

          <button
            type="button"
            disabled={authoring.currentStep === 5}
            onClick={() => authoring.setCurrentStep(prev => Math.min(5, prev + 1))}
            className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 rounded-xl disabled:opacity-30 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Question Bank Modal */}
      {showQuestionBankModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                Select from Theological Question Bank
              </h3>
              <button onClick={() => setShowQuestionBankModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={bankSearch}
                onChange={e => setBankSearch(e.target.value)}
                placeholder="Search questions or keywords..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              />
              <select
                value={bankDifficultyFilter}
                onChange={e => setBankDifficultyFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              >
                <option value="all">All Difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {QuestionBankService.getQuestions()
                .filter(bq => {
                  const matchSearch = bq.questionText.toLowerCase().includes(bankSearch.toLowerCase()) ||
                    bq.topic?.toLowerCase().includes(bankSearch.toLowerCase());
                  const matchDiff = bankDifficultyFilter === 'all' || bq.difficulty === bankDifficultyFilter;
                  return matchSearch && matchDiff;
                })
                .map(bq => (
                  <div
                    key={bq.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-amber-400"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                          {bq.topic || bq.moduleTrack}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">{bq.difficulty}</span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200">{bq.questionText}</p>
                    </div>

                    <button
                      onClick={() => {
                        authoring.importQuestions([
                          {
                            id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                            questionText: bq.questionText,
                            type: bq.type,
                            options: (bq.options || []).map(o => ({ id: o.id, text: o.text })),
                            correctOptionId: bq.correctOptionId,
                            correctOptionIds: bq.correctOptionIds,
                            acceptableAnswers: bq.acceptableAnswers,
                            weight: bq.weight,
                            explanation: bq.explanation,
                            required: true
                          }
                        ]);
                        setShowQuestionBankModal(false);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                    >
                      Import
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
