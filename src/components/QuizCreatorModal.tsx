import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  HelpCircle, 
  Copy, 
  Share2, 
  Clock, 
  Award, 
  Sparkles, 
  Check, 
  BookOpen, 
  ChevronUp, 
  ChevronDown, 
  Link as LinkIcon,
  AlertCircle,
  Settings,
  Eye,
  Sliders,
  CheckSquare,
  MessageSquare,
  FileText,
  Layers,
  Image as ImageIcon,
  Download,
  Upload,
  RotateCcw,
  Sparkle,
  Calendar,
  Shuffle,
  BrainCircuit,
  UploadCloud,
  FileUp,
  Loader2,
  Send,
  MessageCircle,
  CheckCircle,
  ArrowRight,
  ListFilter,
  Users,
  ShieldAlert,
  Save,
  Grid,
  BadgeCheck
} from 'lucide-react';
import { 
  QuizAssignment, 
  QuizQuestion, 
  QuizQuestionOption, 
  QuizQuestionType, 
  QuizSettings,
  QuizStatus,
  QuizGradeCalculation,
  QuizPoolConfig
} from '../types';
import { DEFAULT_QUIZ_TEMPLATES } from '../data/quizTemplates';
import { QuestionBankService, BankQuestion, DifficultyLevel } from '../features/assessments/quizzes/QuestionBankService';

export interface QuizCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizToEdit?: QuizAssignment | null;
  initialData?: QuizAssignment | null;
  onSaveQuiz: (quiz: QuizAssignment) => void;
  onDuplicateQuiz?: (quiz: QuizAssignment) => void;
}

export const QuizCreatorModal: React.FC<QuizCreatorModalProps> = ({
  isOpen,
  onClose,
  quizToEdit,
  initialData,
  onSaveQuiz,
  onDuplicateQuiz
}) => {
  const source = initialData ?? quizToEdit;
  
  // Multi-step Wizard state
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Quiz Meta
  const [title, setTitle] = useState(source?.title || '');
  const [courseCode, setCourseCode] = useState(source?.courseCode || 'MIN-101');
  const [moduleTrack, setModuleTrack] = useState(source?.moduleTrack || 'Biblical Hermeneutics');
  const [description, setDescription] = useState(source?.description || 'Complete this interactive ministry quiz. Review each question carefully.');
  const [instructions, setInstructions] = useState(source?.description || 'Review the scriptures and answer all questions thoroughly.');
  const [dueDate, setDueDate] = useState(source?.dueDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | undefined>(source?.timeLimitMinutes || 30);
  const [isTemplate, setIsTemplate] = useState(source?.isTemplate || false);
  const [category, setCategory] = useState(source?.category || 'Hermeneutics');
  const [quizStatus, setQuizStatus] = useState<QuizStatus>(source?.status || 'draft');
  const [copiedLink, setCopiedLink] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Audience & Availability
  const [audienceCohortId, setAudienceCohortId] = useState(source?.settings?.audienceCohortId || 'Class of 2026');
  const [availableFromDate, setAvailableFromDate] = useState(source?.settings?.availableFromDate || new Date().toISOString().split('T')[0]);
  const [availableFromTime, setAvailableFromTime] = useState(source?.settings?.availableFromTime || '09:00');
  const [closeDate, setCloseDate] = useState(source?.settings?.closeDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
  const [closeTime, setCloseTime] = useState(source?.settings?.closeTime || '23:59');
  
  // Public vs Authenticated attempt state
  const [isPublicAccess, setIsPublicAccess] = useState(true);

  // Grading & Attempts
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(source?.settings?.allowMultipleAttempts ?? true);
  const [maxAttempts, setMaxAttempts] = useState<number>(source?.settings?.maxAttempts || 3);
  const [gradeCalculation, setGradeCalculation] = useState<QuizGradeCalculation>(source?.settings?.gradeCalculation || 'highest');
  const [passingScorePercentage, setPassingScorePercentage] = useState<number>(source?.settings?.passingScorePercentage || 75);

  // AI Quiz Generation / Templates integration
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiRawContent, setAiRawContent] = useState('');

  // Settings
  const [settings, setSettings] = useState<QuizSettings>({
    shuffleQuestions: source?.settings?.shuffleQuestions || false,
    shuffleOptions: source?.settings?.shuffleOptions || false,
    showCorrectAnswers: source?.settings?.showCorrectAnswers ?? true,
    showPointValues: source?.settings?.showPointValues ?? true,
    showFeedback: source?.settings?.showFeedback ?? true,
    gradeReleasePolicy: source?.settings?.gradeReleasePolicy || 'immediate',
    requireAllQuestionsAnswered: source?.settings?.requireAllQuestionsAnswered || false,
    collectStudentEmail: source?.settings?.collectStudentEmail ?? true,
  });

  // Questions State
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    source?.questions && source.questions.length > 0 
      ? source.questions 
      : [
          {
            id: 'q_1',
            questionText: 'What is the primary biblical foundation for the Great Commission in the Gospels?',
            type: 'multiple_choice',
            options: [
              { id: 'opt_1a', text: 'Matthew 28:18-20' },
              { id: 'opt_1b', text: 'Genesis 1:1' },
              { id: 'opt_1c', text: 'Romans 8:28' },
              { id: 'opt_1d', text: 'Revelation 22:20' }
            ],
            correctOptionId: 'opt_1a',
            weight: 10,
            required: true,
            explanation: 'Matthew 28:18-20 records Jesus giving the Great Commission to make disciples of all nations.',
            feedbackCorrect: 'Amen! Matthew 28:18-20 is the apostolic foundation for global discipleship.',
            feedbackIncorrect: 'See Matthew 28:18-20 for Christ\'s explicit command to disciple all nations.'
          }
        ]
  );

  // Question Bank Slider/Modal State
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankDifficultyFilter, setBankDifficultyFilter] = useState<string>('all');
  const [bankCategoryFilter, setBankCategoryFilter] = useState<string>('all');

  // Randomized Question Pool Config State
  const [randomizeFromPool, setRandomizeFromPool] = useState(source?.settings?.randomizeFromPool || false);
  const [poolQuestionCount, setPoolQuestionCount] = useState(source?.settings?.poolConfig?.questionCountToPresent || 5);
  const [poolDifficulty, setPoolDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | 'all'>(
    (source?.settings?.poolConfig?.difficulty as any) || 'all'
  );
  const [poolTopic, setPoolTopic] = useState(source?.settings?.poolConfig?.topic || 'Biblical Hermeneutics');

  // Preview interactive state
  const [showInteractivePreview, setShowInteractivePreview] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [previewScore, setPreviewScore] = useState<{ score: number; total: number; percent: number } | null>(null);
  const [previewMode, setPreviewMode] = useState<'student' | 'teacher_feedback'>('student');

  if (!isOpen) return null;

  // Calculate total points
  const totalPoints = randomizeFromPool 
    ? (poolQuestionCount * 10) 
    : questions.reduce((sum, q) => sum + (Number(q.weight) || 0), 0);

  // Unique share code (stable in state across all renders and modal operations)
  const [shareCode] = useState<string>(() => source?.shareCode || `qz_${Math.random().toString(36).substring(2, 8)}`);

  // Question manipulation handlers
  const handleAddQuestion = (type: QuizQuestionType = 'multiple_choice') => {
    const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    
    let defaultOptions: QuizQuestionOption[] = [];
    let defaultCorrectId: string | undefined = undefined;
    let defaultCorrectIds: string[] | undefined = undefined;

    if (type === 'multiple_choice') {
      defaultOptions = [
        { id: `opt_a_${newId}`, text: 'Option A' },
        { id: `opt_b_${newId}`, text: 'Option B' },
        { id: `opt_c_${newId}`, text: 'Option C' },
        { id: `opt_d_${newId}`, text: 'Option D' }
      ];
      defaultCorrectId = `opt_a_${newId}`;
    } else if (type === 'checkboxes') {
      defaultOptions = [
        { id: `opt_a_${newId}`, text: 'Option A' },
        { id: `opt_b_${newId}`, text: 'Option B' },
        { id: `opt_c_${newId}`, text: 'Option C' }
      ];
      defaultCorrectIds = [`opt_a_${newId}`];
    } else if (type === 'true_false') {
      defaultOptions = [
        { id: `opt_t_${newId}`, text: 'True' },
        { id: `opt_f_${newId}`, text: 'False' }
      ];
      defaultCorrectId = `opt_t_${newId}`;
    }

    const newQ: QuizQuestion = {
      id: newId,
      questionText: 'New Ministry Question Prompt',
      type,
      options: defaultOptions,
      correctOptionId: defaultCorrectId,
      correctOptionIds: defaultCorrectIds,
      acceptableAnswers: type === 'short_answer' || type === 'fill_blank' ? ['Answer'] : undefined,
      weight: 10,
      required: true,
      explanation: '',
      feedbackCorrect: '',
      feedbackIncorrect: ''
    };
    
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (index: number, updated: QuizQuestion) => {
    const newQuestions = [...questions];
    newQuestions[index] = updated;
    setQuestions(newQuestions);
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleDuplicateQuestion = (index: number) => {
    const target = questions[index];
    const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const duplicated: QuizQuestion = {
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      questionText: `${target.questionText} (Copy)`
    };
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, duplicated);
    setQuestions(newQuestions);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const newQuestions = [...questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIdx];
    newQuestions[targetIdx] = temp;
    setQuestions(newQuestions);
  };

  // Add Option to question
  const handleAddOption = (qIndex: number) => {
    const q = questions[qIndex];
    const optId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 4)}`;
    const newOptions = [...q.options, { id: optId, text: `New Option` }];
    handleUpdateQuestion(qIndex, { ...q, options: newOptions });
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, text: string) => {
    const q = questions[qIndex];
    const newOptions = [...q.options];
    newOptions[optIndex] = { ...newOptions[optIndex], text };
    handleUpdateQuestion(qIndex, { ...q, options: newOptions });
  };

  const handleDeleteOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    const optToDelete = q.options[optIndex];
    const newOptions = q.options.filter((_, i) => i !== optIndex);
    let newCorrect = q.correctOptionId;
    if (newCorrect === optToDelete.id && newOptions.length > 0) {
      newCorrect = newOptions[0].id;
    }
    const newCorrectIds = (q.correctOptionIds || []).filter(id => id !== optToDelete.id);
    handleUpdateQuestion(qIndex, { 
      ...q, 
      options: newOptions, 
      correctOptionId: newCorrect,
      correctOptionIds: newCorrectIds.length > 0 ? newCorrectIds : (newOptions[0] ? [newOptions[0].id] : [])
    });
  };

  // Import from Prebuilt Bank
  const handleAddFromBank = (bq: BankQuestion) => {
    const newId = `q_bank_${bq.id}_${Date.now()}`;
    const newQ: QuizQuestion = {
      id: newId,
      questionText: bq.questionText,
      type: bq.type,
      options: bq.options.map(o => ({ id: o.id, text: o.text })),
      correctOptionId: bq.correctOptionId,
      correctOptionIds: bq.correctOptionIds,
      acceptableAnswers: bq.acceptableAnswers,
      weight: bq.weight,
      explanation: bq.explanation,
      feedbackCorrect: bq.feedbackCorrect,
      feedbackIncorrect: bq.feedbackIncorrect,
      required: bq.required !== false
    };
    setQuestions([...questions, newQ]);
    QuestionBankService.incrementUsage(bq.id);
    setValidationError(`Imported: "${bq.questionText.slice(0, 30)}..." from Question Bank!`);
    setTimeout(() => setValidationError(null), 3000);
  };

  // Apply template
  const handleApplyTemplate = (tmpl: QuizAssignment) => {
    setTitle(tmpl.title);
    setCategory(tmpl.category || 'Hermeneutics');
    setCourseCode(tmpl.courseCode || 'MIN-101');
    setModuleTrack(tmpl.moduleTrack || 'Module 1: Scripture');
    setDescription(tmpl.description || '');
    setQuestions(JSON.parse(JSON.stringify(tmpl.questions)));
    setValidationError(`Loaded template "${tmpl.title}" with ${tmpl.questions.length} questions.`);
    setCurrentStep(2);
    setTimeout(() => setValidationError(null), 3000);
  };

  // Form submission / Save
  const handleSave = () => {
    if (!title.trim()) {
      setValidationError('Please enter a Quiz Title.');
      setCurrentStep(1);
      return;
    }

    if (!randomizeFromPool && questions.length === 0) {
      setValidationError('Please build at least one question or turn on the Randomized Question Pool.');
      setCurrentStep(2);
      return;
    }

    // Prepare version tracking
    let finalVersion = source?.version || 1;
    let finalHistory = source?.versionHistory || [];
    const quizId = source?.id || `quiz_${Date.now()}`;

    const isPreviouslyPublished = source?.isPublished || source?.status === 'published';
    const hasModifications = isPreviouslyPublished && (
      JSON.stringify(source?.questions) !== JSON.stringify(questions) ||
      source?.title !== title ||
      source?.description !== description
    );

    if (hasModifications) {
      finalVersion = finalVersion + 1;
      const historyRecord = {
        version: source?.version || 1,
        updatedAt: source?.updatedAt || new Date().toISOString().split('T')[0],
        questions: source?.questions || [],
        changeLog: `Revised questions to Version ${finalVersion}`
      };
      finalHistory = [...finalHistory, historyRecord];
    }

    const currentVersionId = `ver_${quizId}_v${finalVersion}`;

    // Prepare full QuizAssignment package
    const finalQuiz: QuizAssignment = {
      id: quizId,
      title,
      courseCode,
      moduleTrack,
      description,
      questions: randomizeFromPool ? [] : questions, // empty if random pool is dynamically generated at take-time
      totalPoints,
      dueDate,
      createdAt: source?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      isPublished: quizStatus === 'published' || quizStatus === 'in_progress',
      isTemplate,
      status: quizStatus,
      shareCode,
      timeLimitMinutes,
      version: finalVersion,
      currentVersionId,
      versionHistory: finalHistory,
      settings: {
        ...settings,
        allowMultipleAttempts,
        maxAttempts,
        gradeCalculation,
        passingScorePercentage,
        audienceCohortId,
        availableFromDate,
        availableFromTime,
        closeDate,
        closeTime,
        randomizeFromPool,
        poolConfig: randomizeFromPool ? {
          id: `pool_${Date.now()}`,
          poolName: `${poolTopic} Pool`,
          courseCode,
          moduleTrack: poolTopic,
          difficulty: poolDifficulty === 'all' ? undefined : (poolDifficulty as any),
          questionCountToPresent: poolQuestionCount,
          randomize: true
        } : undefined
      }
    };

    onSaveQuiz(finalQuiz);
    onClose();
  };

  const handleCopyShareLink = () => {
    const origin = window.location.origin;
    const link = `${origin}/?quiz=${shareCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Preview interactive scoring
  const handleScorePreview = () => {
    let score = 0;
    let total = 0;
    questions.forEach(q => {
      total += q.weight;
      const ans = previewAnswers[q.id];
      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        if (ans === q.correctOptionId) {
          score += q.weight;
        }
      } else if (q.type === 'checkboxes') {
        const correctList = q.correctOptionIds || [];
        const studentList = ans || [];
        const isMatch = correctList.length === studentList.length && correctList.every((id: string) => studentList.includes(id));
        if (isMatch) score += q.weight;
      } else if (q.type === 'short_answer' || q.type === 'fill_blank') {
        const isMatch = (q.acceptableAnswers || []).some(v => (v || '').toLowerCase().trim() === (ans || '').toLowerCase().trim());
        if (isMatch) score += q.weight;
      } else {
        // essay paragraph (auto partial or manual review)
        if (ans && ans.length > 5) {
          score += q.weight;
        }
      }
    });
    setPreviewScore({ score, total, percent: Math.round((score / total) * 100) });
  };

  // Question Bank items
  const bankQuestions = QuestionBankService.getQuestions().filter(q => {
    const matchSearch = q.questionText.toLowerCase().includes(bankSearch.toLowerCase()) || 
                        q.topic.toLowerCase().includes(bankSearch.toLowerCase());
    const matchDifficulty = bankDifficultyFilter === 'all' || q.difficulty === bankDifficultyFilter;
    const matchCategory = bankCategoryFilter === 'all' || q.moduleTrack === bankCategoryFilter;
    return matchSearch && matchDifficulty && matchCategory;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-scaleIn">
        
        {/* Header Bar */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-2xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {source ? `Edit School Assessment: ${title || 'New Quiz'}` : 'Theology Quiz & Assessment Creator'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                School of Ministry Multi-Step Wizard Builder
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="bg-slate-100/60 dark:bg-slate-950/20 px-6 py-4 border-b border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-2">
          {[
            { step: 1, label: '📋 Details & Category', icon: FileText },
            { step: 2, label: '✍️ Questions & Pools', icon: Layers },
            { step: 3, label: '👥 Audience & Access', icon: Users },
            { step: 4, label: '⚙️ Grading & Config', icon: Settings }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-left transition-all ${
                  isActive 
                    ? 'bg-purple-600 text-white font-black shadow-lg shadow-purple-600/25' 
                    : isCompleted
                    ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-bold'
                    : 'bg-white dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 font-semibold'
                }`}
              >
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-xs ${isActive ? 'bg-white text-purple-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : item.step}
                </div>
                <span className="hidden md:inline text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {validationError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>{validationError}</span>
              </div>
              <button onClick={() => setValidationError(null)} className="text-rose-400 hover:text-rose-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* STEP 1: BASIC INFORMATION */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Quiz Basic Parameters</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Quiz / Assessment Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Day 3: Expository Hermeneutics Exam"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="Hermeneutics">Biblical Hermeneutics</option>
                      <option value="Scripture Knowledge">Scripture Knowledge</option>
                      <option value="Five-Fold Ministry">Five-Fold Ministry</option>
                      <option value="Pastoral Theology">Pastoral Theology</option>
                      <option value="Apostolic Governance">Apostolic Governance</option>
                    </select>
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Course Code
                    </label>
                    <input
                      type="text"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      placeholder="MIN-101"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Module / Class Track
                    </label>
                    <input
                      type="text"
                      value={moduleTrack}
                      onChange={(e) => setModuleTrack(e.target.value)}
                      placeholder="e.g. Biblical Hermeneutics"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Time Limit (Minutes)
                    </label>
                    <input
                      type="number"
                      value={timeLimitMinutes || ''}
                      onChange={(e) => setTimeLimitMinutes(Number(e.target.value) || undefined)}
                      placeholder="e.g. 30 (Empty for none)"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Lifecycle Status</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'draft', title: '📋 Draft Status', desc: 'Private. Only visible to creators/faculty.' },
                    { id: 'scheduled', title: '🟡 Scheduled', desc: 'Opens automatically on specific start date.' },
                    { id: 'published', title: '🟢 Published / Active', desc: 'Instantly viewable & live for candidates.' }
                  ].map(stat => (
                    <button
                      key={stat.id}
                      type="button"
                      onClick={() => setQuizStatus(stat.id as QuizStatus)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        quizStatus === stat.id 
                          ? 'border-purple-600 bg-purple-500/10 text-slate-900 dark:text-white' 
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <h4 className="text-xs font-black">{stat.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1">{stat.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  General Instructions
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide essential guidelines, reading materials scope, and tips for taking this assessment."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Prebuilt Templates Quick Access */}
              <div className="p-5 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-800/40">
                <h4 className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Curriculum Templates Preset Launcher</span>
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                  Alternatively, skip creation by loading one of these ready-made School of Ministry quizzes:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  {DEFAULT_QUIZ_TEMPLATES.map(tmpl => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-left hover:border-purple-500 cursor-pointer transition-all"
                    >
                      <span className="text-[9px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded">
                        {tmpl.courseCode}
                      </span>
                      <h5 className="text-xs font-black text-slate-950 dark:text-white mt-1.5 line-clamp-1">{tmpl.title}</h5>
                      <span className="text-[10px] text-slate-400 mt-1 block">{tmpl.questions.length} questions</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: QUESTIONS BUILDER & QUESTION BANK */}
          {currentStep === 2 && (
            <div className="space-y-6">
              
              {/* Question Bank Trigger & Randomized Pools Controller */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-purple-600" /> Smart Questions Sourcing
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Add custom items, draw directly from the School of Ministry Question Bank, or activate random pools.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuestionBank(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                    <span>Browse Question Bank ({bankQuestions.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRandomizeFromPool(!randomizeFromPool)}
                    className={`px-4 py-2 border rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                      randomizeFromPool 
                        ? 'bg-purple-600 text-white border-purple-500' 
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Random Pool: {randomizeFromPool ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Randomized Pool Setup Panel */}
              {randomizeFromPool ? (
                <div className="p-5 bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-300 dark:border-purple-800 rounded-2xl space-y-4 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-xl">
                      <Shuffle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-purple-900 dark:text-purple-200 uppercase tracking-wider">Dynamic Question Pool Randomizer</h4>
                      <p className="text-[11px] text-purple-700 dark:text-purple-400 mt-0.5">
                        Instead of presenting static questions, the platform will draw a randomized set of unique questions from the bank for each student.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-purple-800 dark:text-purple-300 mb-1">Target Curriculum Module</label>
                      <select
                        value={poolTopic}
                        onChange={(e) => setPoolTopic(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold outline-none"
                      >
                        <option value="Biblical Hermeneutics">Biblical Hermeneutics</option>
                        <option value="Church Leadership">Church Leadership</option>
                        <option value="Sensus Plenior">Sensus Plenior</option>
                        <option value="Eisegesis vs Exegesis">Eisegesis vs Exegesis</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-purple-800 dark:text-purple-300 mb-1">Pool Difficulty Grade</label>
                      <select
                        value={poolDifficulty}
                        onChange={(e) => setPoolDifficulty(e.target.value as any)}
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold outline-none"
                      >
                        <option value="all">All Difficulty Levels</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-purple-800 dark:text-purple-300 mb-1">Questions to Present</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={poolQuestionCount}
                        onChange={(e) => setPoolQuestionCount(Math.max(1, Number(e.target.value) || 5))}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-mono font-bold text-center outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white/70 dark:bg-slate-950/40 rounded-xl border border-purple-200/50 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span>Generated Points: <strong>{poolQuestionCount * 10} Points</strong> (10 pts/question standard)</span>
                    <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">Status: Active Pool</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Standard Question list */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200">Custom Questions List</h4>
                      <p className="text-[10px] text-slate-400">Total Score: {totalPoints} pts • {questions.length} Questions built</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('multiple_choice')}
                        className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow"
                      >
                        + Add Choice
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('checkboxes')}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow"
                      >
                        + Add Check
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {questions.map((q, qIndex) => (
                      <div 
                        key={q.id}
                        className="p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4 relative hover:border-purple-400 dark:hover:border-purple-600 transition-all"
                      >
                        {/* Question Action Panel */}
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 -mx-5 -mt-5 p-2 px-5 rounded-t-2xl border-b border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                              {qIndex + 1}
                            </span>
                            <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Question #{qIndex + 1}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={q.type || 'multiple_choice'}
                              onChange={(e) => handleUpdateQuestion(qIndex, { ...q, type: e.target.value as any })}
                              className="p-1 bg-white dark:bg-slate-900 border text-[11px] font-bold rounded"
                            >
                              <option value="multiple_choice">Multiple Choice</option>
                              <option value="checkboxes">Checkboxes</option>
                              <option value="true_false">True / False</option>
                              <option value="short_answer">Short Answer</option>
                              <option value="paragraph">Paragraph Reflection</option>
                            </select>

                            <input
                              type="number"
                              value={q.weight}
                              onChange={(e) => handleUpdateQuestion(qIndex, { ...q, weight: Number(e.target.value) || 0 })}
                              className="w-10 text-center bg-white dark:bg-slate-900 border rounded font-mono text-[11px] font-black"
                            />
                            <span className="text-[11px] text-slate-400">pts</span>

                            <button type="button" onClick={() => handleMoveQuestion(qIndex, 'up')} disabled={qIndex === 0} className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"><ChevronUp className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => handleMoveQuestion(qIndex, 'down')} disabled={qIndex === questions.length - 1} className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20"><ChevronDown className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => handleDuplicateQuestion(qIndex)} className="p-1 text-slate-400 hover:text-purple-600"><Copy className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => handleDeleteQuestion(qIndex)} className="p-1 text-rose-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>

                        {/* Question Prompt */}
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Prompt</label>
                            <input
                              type="text"
                              value={q.questionText}
                              onChange={(e) => handleUpdateQuestion(qIndex, { ...q, questionText: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border text-xs font-semibold rounded-xl outline-none"
                              placeholder="Describe your theological question prompt..."
                            />
                          </div>

                          {/* Image Attachment (Optional) */}
                          <div>
                            <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Image Reference URL (Optional)</label>
                            <div className="flex gap-2">
                              <ImageIcon className="w-4 h-4 text-slate-400 self-center" />
                              <input
                                type="text"
                                value={q.imageUrl || ''}
                                onChange={(e) => handleUpdateQuestion(qIndex, { ...q, imageUrl: e.target.value })}
                                className="w-full px-3 py-1 bg-slate-50 dark:bg-slate-900 border text-xs rounded-lg"
                                placeholder="https://example.com/slide1.png"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Options Render */}
                        {q.type === 'multiple_choice' && (
                          <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-extrabold uppercase text-slate-400">Options (Select Correct Key)</label>
                              <button type="button" onClick={() => handleAddOption(qIndex)} className="text-[10px] text-purple-600 hover:underline">+ Add Option</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, optIdx) => (
                                <div key={opt.id} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`correct_${q.id}`}
                                    checked={q.correctOptionId === opt.id}
                                    onChange={() => handleUpdateQuestion(qIndex, { ...q, correctOptionId: opt.id })}
                                    className="w-4 h-4 text-purple-600"
                                  />
                                  <input
                                    type="text"
                                    value={opt.text}
                                    onChange={(e) => handleUpdateOption(qIndex, optIdx, e.target.value)}
                                    className="w-full px-2 py-1 text-xs border rounded-lg"
                                    placeholder={`Option ${optIdx + 1}`}
                                  />
                                  <button type="button" onClick={() => handleDeleteOption(qIndex, optIdx)} className="text-slate-400 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {q.type === 'checkboxes' && (
                          <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-extrabold uppercase text-slate-400">Options (Select All Correct Keys)</label>
                              <button type="button" onClick={() => handleAddOption(qIndex)} className="text-[10px] text-purple-600 hover:underline">+ Add Option</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, optIdx) => {
                                const checked = (q.correctOptionIds || []).includes(opt.id);
                                return (
                                  <div key={opt.id} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        const next = checked 
                                          ? (q.correctOptionIds || []).filter(id => id !== opt.id)
                                          : [...(q.correctOptionIds || []), opt.id];
                                        handleUpdateQuestion(qIndex, { ...q, correctOptionIds: next });
                                      }}
                                      className="w-4 h-4 text-purple-600"
                                    />
                                    <input
                                      type="text"
                                      value={opt.text}
                                      onChange={(e) => handleUpdateOption(qIndex, optIdx, e.target.value)}
                                      className="w-full px-2 py-1 text-xs border rounded-lg"
                                      placeholder={`Option ${optIdx + 1}`}
                                    />
                                    <button type="button" onClick={() => handleDeleteOption(qIndex, optIdx)} className="text-slate-400 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {q.type === 'true_false' && (
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            {q.options.map(o => (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => handleUpdateQuestion(qIndex, { ...q, correctOptionId: o.id })}
                                className={`py-2 px-4 rounded-xl border-2 text-xs font-black transition-all ${
                                  q.correctOptionId === o.id
                                    ? 'bg-purple-600 text-white border-purple-500'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {o.text} (Correct Key)
                              </button>
                            ))}
                          </div>
                        )}

                        {q.type === 'paragraph' && (
                          <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 rounded-xl p-3 space-y-2 mt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-300">
                                Theological Essay Rubric
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (q.rubric) {
                                    handleUpdateQuestion(qIndex, { ...q, rubric: undefined });
                                  } else {
                                    handleUpdateQuestion(qIndex, {
                                      ...q,
                                      rubric: {
                                        id: 'rubric_biblical_interpretation',
                                        name: 'Biblical Interpretation Rubric',
                                        criteria: [
                                          { name: 'Biblical Accuracy', weightPercentage: 30, maxScore: 30 },
                                          { name: 'Understanding', weightPercentage: 25, maxScore: 25 },
                                          { name: 'Application', weightPercentage: 20, maxScore: 20 },
                                          { name: 'Critical Thinking', weightPercentage: 15, maxScore: 15 },
                                          { name: 'Writing', weightPercentage: 10, maxScore: 10 }
                                        ]
                                      }
                                    });
                                  }
                                }}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                  q.rubric 
                                    ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-200' 
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                }`}
                              >
                                {q.rubric ? 'Detach Rubric' : 'Attach Biblical Interpretation Rubric'}
                              </button>
                            </div>
                            
                            {q.rubric ? (
                              <div className="space-y-1 bg-white dark:bg-slate-900 border border-purple-200/50 dark:border-purple-800/50 rounded-lg p-2 text-[11px]">
                                <p className="font-extrabold text-purple-800 dark:text-purple-300">✓ {q.rubric.name} (Active)</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-500 font-medium">
                                  {q.rubric.criteria.map((c, cidx) => (
                                    <div key={cidx} className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-0.5">
                                      <span>{c.name}</span>
                                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{c.weightPercentage}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400">No grading rubric attached. Evaluating by default points.</p>
                            )}
                          </div>
                        )}

                        {/* Explanations & Feedback */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <label className="block text-[9px] font-black uppercase text-purple-600 mb-0.5">Correct Feedback</label>
                            <input
                              type="text"
                              value={q.feedbackCorrect || ''}
                              onChange={(e) => handleUpdateQuestion(qIndex, { ...q, feedbackCorrect: e.target.value })}
                              className="w-full p-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900"
                              placeholder="e.g. Well interpreted! Amen."
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase text-purple-600 mb-0.5">Theological Explanation & Context</label>
                            <input
                              type="text"
                              value={q.explanation || ''}
                              onChange={(e) => handleUpdateQuestion(qIndex, { ...q, explanation: e.target.value })}
                              className="w-full p-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900"
                              placeholder="Describe the scripture basis or hermeneutic context..."
                            />
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: AUDIENCE & AVAILABILITY */}
          {currentStep === 3 && (
            <div className="space-y-6">
              
              {/* Audience Targeting Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Audience Targeting</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Define which cohort or student pool is assigned to this assessment.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Target Cohort / Class Audience</label>
                    <select
                      value={audienceCohortId}
                      onChange={(e) => setAudienceCohortId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="all">Entire School (All Enrolled Students)</option>
                      <option value="Class of 2026">Class of 2026 (Advanced Ministerial)</option>
                      <option value="Class of 2027">Class of 2027 (General Leadership)</option>
                      <option value="Class of 2028">Class of 2028 (Theology Foundational)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Access Eligibility</label>
                    <div className="flex gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                        <input
                          type="radio"
                          name="access_elig"
                          checked={!isPublicAccess}
                          onChange={() => setIsPublicAccess(false)}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span>Authenticated Only (Required Enrollment ID)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                        <input
                          type="radio"
                          name="access_elig"
                          checked={isPublicAccess}
                          onChange={() => setIsPublicAccess(true)}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span>Public Link Access (Guests / Entry Audits)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Availability Window Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Authoritative Scheduling Availability Window</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Control when students can start attempts and when submissions lock.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black uppercase text-slate-400">Available From</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={availableFromDate}
                        onChange={(e) => setAvailableFromDate(e.target.value)}
                        className="p-2.5 bg-white dark:bg-slate-950 border rounded-xl text-xs font-bold"
                      />
                      <input
                        type="time"
                        value={availableFromTime}
                        onChange={(e) => setAvailableFromTime(e.target.value)}
                        className="p-2.5 bg-white dark:bg-slate-950 border rounded-xl text-xs font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black uppercase text-slate-400">Closes & Locks On (Autorun Submission Limit)</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={closeDate}
                        onChange={(e) => setCloseDate(e.target.value)}
                        className="p-2.5 bg-white dark:bg-slate-950 border rounded-xl text-xs font-bold"
                      />
                      <input
                        type="time"
                        value={closeTime}
                        onChange={(e) => setCloseTime(e.target.value)}
                        className="p-2.5 bg-white dark:bg-slate-950 border rounded-xl text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>The platform forces auto-submission of ongoing attempts at <strong>{closeDate} · {closeTime}</strong>.</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: GRADING, TIMER & ATTEMPT RULES */}
          {currentStep === 4 && (
            <div className="space-y-6">
              
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-xl">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Grading & Multiple Attempts Policies</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Control attempt limits and how final curriculum scores are compiled.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Attempt Count Rules</label>
                    <div className="flex gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input
                          type="radio"
                          name="attempts_pol"
                          checked={!allowMultipleAttempts}
                          onChange={() => {
                            setAllowMultipleAttempts(false);
                            setMaxAttempts(1);
                          }}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span>Single Attempt Allowed</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input
                          type="radio"
                          name="attempts_pol"
                          checked={allowMultipleAttempts}
                          onChange={() => setAllowMultipleAttempts(true)}
                          className="w-4 h-4 text-purple-600"
                        />
                        <span>Multiple Attempts Allowed</span>
                      </label>
                    </div>

                    {allowMultipleAttempts && (
                      <div className="pt-2 animate-fadeIn">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Maximum Attempts Count</label>
                        <input
                          type="number"
                          min="2"
                          max="10"
                          value={maxAttempts}
                          onChange={(e) => setMaxAttempts(Math.max(2, Number(e.target.value) || 2))}
                          className="w-24 p-2 border rounded-xl text-center font-mono font-bold text-xs"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Grade Calculation Strategy</label>
                    <select
                      value={gradeCalculation}
                      onChange={(e) => setGradeCalculation(e.target.value as QuizGradeCalculation)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="highest">🥇 Highest Score (Recommended)</option>
                      <option value="latest">🔄 Latest Score (Most Recent)</option>
                      <option value="average">⚖️ Average Score (All Combined)</option>
                      <option value="first">⏱️ First Attempt Only</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Additional Student Restrictions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-white dark:bg-slate-950 border rounded-xl hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={settings.shuffleQuestions}
                      onChange={(e) => setSettings({ ...settings, shuffleQuestions: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <div>
                      <span className="text-xs font-bold block">Shuffle Questions Order</span>
                      <span className="text-[10px] text-slate-400 block">Randomizes order per participant.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-white dark:bg-slate-950 border rounded-xl hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={settings.shuffleOptions}
                      onChange={(e) => setSettings({ ...settings, shuffleOptions: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <div>
                      <span className="text-xs font-bold block">Shuffle Multiple Choice Options</span>
                      <span className="text-[10px] text-slate-400 block">Prevents rote option sequence sharing.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-white dark:bg-slate-950 border rounded-xl hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={settings.showCorrectAnswers}
                      onChange={(e) => setSettings({ ...settings, showCorrectAnswers: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <div>
                      <span className="text-xs font-bold block">Show Correct Keys Post-Submission</span>
                      <span className="text-[10px] text-slate-400 block">Allow students to review standard answers immediately.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-white dark:bg-slate-950 border rounded-xl hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={settings.collectStudentEmail}
                      onChange={(e) => setSettings({ ...settings, collectStudentEmail: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <div>
                      <span className="text-xs font-bold block">Collect Verified Email Address</span>
                      <span className="text-[10px] text-slate-400 block">Enforce standard academic verification.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Pre-Publish Academic Integrity Checklist */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-xl">
                    <BadgeCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Academic Integrity & Quality Checklist</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Automated validation checks to ensure flawless delivery and standard alignment.</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  {(() => {
                    const issues: { type: 'success' | 'warning' | 'error'; label: string; text: string }[] = [];

                    // Title check
                    if (title.trim()) {
                      issues.push({ type: 'success', label: 'Assessment Title', text: `Verified: "${title}"` });
                    } else {
                      issues.push({ type: 'error', label: 'Assessment Title', text: 'Error: Title is empty or missing.' });
                    }

                    // Track check
                    if (moduleTrack) {
                      issues.push({ type: 'success', label: 'Ministry Core Track', text: `Verified: ${moduleTrack}` });
                    } else {
                      issues.push({ type: 'error', label: 'Ministry Core Track', text: 'Error: Core syllabus track is missing.' });
                    }

                    // Question count check
                    if (randomizeFromPool) {
                      issues.push({ type: 'success', label: 'Question Pool Delivery', text: `Verified: Delivering ${poolQuestionCount} random questions from "${poolTopic}"` });
                    } else if (questions.length > 0) {
                      issues.push({ type: 'success', label: 'Question Compilation', text: `Verified: ${questions.length} static questions are configured.` });
                    } else {
                      issues.push({ type: 'error', label: 'Question Compilation', text: 'Error: No questions or randomized pools configured.' });
                    }

                    // Answer key coverage
                    if (!randomizeFromPool && questions.length > 0) {
                      let missingKeysCount = 0;
                      let essayWithRubricCount = 0;
                      let totalEssayCount = 0;

                      questions.forEach(q => {
                        if (q.type === 'multiple_choice' && !q.correctOptionId) missingKeysCount++;
                        if (q.type === 'checkboxes' && (!q.correctOptionIds || q.correctOptionIds.length === 0)) missingKeysCount++;
                        if (q.type === 'true_false' && !q.correctOptionId) missingKeysCount++;
                        if (q.type === 'paragraph') {
                          totalEssayCount++;
                          if (q.rubric) essayWithRubricCount++;
                        }
                      });

                      if (missingKeysCount > 0) {
                        issues.push({ type: 'error', label: 'Answer Keys Integrity', text: `Error: ${missingKeysCount} question(s) are missing correct answer keys.` });
                      } else {
                        issues.push({ type: 'success', label: 'Answer Keys Integrity', text: 'Verified: All active auto-graded questions have keys present.' });
                      }

                      if (totalEssayCount > 0) {
                        if (essayWithRubricCount < totalEssayCount) {
                          issues.push({ type: 'warning', label: 'Essay Grading Consistency', text: `Warning: Only ${essayWithRubricCount}/${totalEssayCount} open essays have active rubrics. We recommend attaching the Biblical Interpretation Rubric.` });
                        } else {
                          issues.push({ type: 'success', label: 'Essay Grading Consistency', text: 'Verified: All essay reflections have grading rubrics attached.' });
                        }
                      }
                    }

                    // Total points matching weights
                    if (!randomizeFromPool && questions.length > 0) {
                      const totalWeights = questions.reduce((sum, q) => sum + (q.weight || 0), 0);
                      if (totalWeights !== totalPoints) {
                        issues.push({ type: 'warning', label: 'Weight Scaling Guard', text: `Notice: Sum of questions (${totalWeights} pts) differs from declared total (${totalPoints} pts). System will dynamically scale results.` });
                      } else {
                        issues.push({ type: 'success', label: 'Weight Scaling Guard', text: `Verified: Weights sum perfectly matches ${totalPoints} points.` });
                      }
                    }

                    // Time limit
                    if (timeLimitMinutes && timeLimitMinutes > 0) {
                      issues.push({ type: 'success', label: 'Time Limit Duration', text: `Verified: ${timeLimitMinutes} minutes allowed.` });
                    } else {
                      issues.push({ type: 'warning', label: 'Time Limit Duration', text: 'Notice: No time limit enforced. Students can take infinite time.' });
                    }

                    return (
                      <div className="grid grid-cols-1 gap-2">
                        {issues.map((issue, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs border ${
                              issue.type === 'success' 
                                ? 'bg-emerald-50/45 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-300' 
                                : issue.type === 'warning'
                                ? 'bg-amber-50/45 border-amber-100 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-300'
                                : 'bg-rose-50/45 border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-300'
                            }`}
                          >
                            <span className="mt-0.5">
                              {issue.type === 'success' ? (
                                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">✓</span>
                              ) : issue.type === 'warning' ? (
                                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">!</span>
                              ) : (
                                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">✕</span>
                              )}
                            </span>
                            <div className="flex-1">
                              <span className="font-extrabold block text-[11px] leading-tight">{issue.label}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">{issue.text}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Developer / Teacher Preview Panel */}
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-purple-900 dark:text-purple-300">Authoritative Sandbox Assessment Preview</h4>
                  <p className="text-[10px] text-purple-700 dark:text-purple-400 mt-0.5">Test drive your quiz exactly how a student sees it before publication.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewAnswers({});
                    setPreviewScore(null);
                    setShowInteractivePreview(true);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Launch Interactive Preview</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Question Bank Sidebar Slider */}
        {showQuestionBank && (
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full animate-slideLeft">
            <div className="p-5 border-b flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600" /> School of Ministry Question Bank
                </h3>
                <p className="text-xs text-slate-400">Canonical reference questions for repeated courses</p>
              </div>
              <button type="button" onClick={() => setShowQuestionBank(false)} className="p-2 text-slate-400 hover:text-slate-800"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 bg-slate-100/50 dark:bg-slate-900/40 border-b space-y-3">
              <input
                type="text"
                placeholder="Search queries, topic bases, or keywords..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="w-full p-2.5 bg-white border rounded-xl text-xs font-bold"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={bankDifficultyFilter}
                  onChange={(e) => setBankDifficultyFilter(e.target.value)}
                  className="p-2 border rounded-lg text-xs"
                >
                  <option value="all">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>

                <select
                  value={bankCategoryFilter}
                  onChange={(e) => setBankCategoryFilter(e.target.value)}
                  className="p-2 border rounded-lg text-xs"
                >
                  <option value="all">All Topics</option>
                  <option value="Biblical Hermeneutics">Biblical Hermeneutics</option>
                  <option value="Church Leadership">Church Leadership</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50 dark:bg-slate-950/20">
              {bankQuestions.length === 0 ? (
                <p className="text-center text-xs text-slate-400 pt-10">No questions found matching criteria.</p>
              ) : (
                bankQuestions.map(bq => (
                  <div key={bq.id} className="p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-purple-50 dark:bg-purple-950 text-purple-600 rounded">
                        {bq.difficulty} • {bq.topic}
                      </span>
                      <span className="text-[10px] text-slate-400">Uses: {bq.usageCount} times</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{bq.questionText}</p>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Type: {bq.type.replace('_', ' ')} • Weight: {bq.weight} pts
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddFromBank(bq)}
                      className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-lg mt-2 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Insert This Question</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Interactive Sandbox Preview Modal Overlay */}
        {showInteractivePreview && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between bg-purple-500/10">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-purple-600 text-white font-black text-[10px] rounded-full">TEACHER PREVIEW MODE</span>
                  <h3 className="text-xs font-black">{title || 'Theology Quiz Preview'}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={previewMode}
                    onChange={(e) => setPreviewMode(e.target.value as any)}
                    className="p-1 bg-white border rounded text-[11px] font-bold cursor-pointer"
                  >
                    <option value="student">🎓 View as Student</option>
                    <option value="teacher_feedback">📝 Teacher Explanation Overlay</option>
                  </select>
                  <button type="button" onClick={() => setShowInteractivePreview(false)} className="p-1.5 text-slate-400 hover:text-slate-900"><X className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {previewScore && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 rounded-2xl space-y-2 animate-fadeIn">
                    <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Preview Submission Completed (No submissions or grades recorded)
                    </h4>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      Sandbox Results: <strong>{previewScore.score} / {previewScore.total} Points ({previewScore.percent}%)</strong>
                    </p>
                  </div>
                )}

                <div className="space-y-5">
                  {questions.map((q, qIndex) => (
                    <div key={q.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 border rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">Q{qIndex + 1}: {q.questionText}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-200 rounded">{q.weight} pts</span>
                      </div>

                      {/* Options */}
                      {(q.type === 'multiple_choice' || q.type === 'true_false') && (
                        <div className="grid grid-cols-1 gap-1.5">
                          {q.options.map(o => {
                            const isSelected = previewAnswers[q.id] === o.id;
                            return (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => setPreviewAnswers({ ...previewAnswers, [q.id]: o.id })}
                                className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between ${
                                  isSelected 
                                    ? 'bg-purple-600 text-white border-purple-500' 
                                    : 'bg-white hover:bg-slate-100 border-slate-200 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span>{o.text}</span>
                                {previewMode === 'teacher_feedback' && q.correctOptionId === o.id && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Correct Key</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'checkboxes' && (
                        <div className="grid grid-cols-1 gap-1.5">
                          {q.options.map(o => {
                            const studentList = previewAnswers[q.id] || [];
                            const isSelected = studentList.includes(o.id);
                            return (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => {
                                  const next = isSelected 
                                    ? studentList.filter((id: string) => id !== o.id)
                                    : [...studentList, o.id];
                                  setPreviewAnswers({ ...previewAnswers, [q.id]: next });
                                }}
                                className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between ${
                                  isSelected 
                                    ? 'bg-indigo-600 text-white border-indigo-500' 
                                    : 'bg-white hover:bg-slate-100 border-slate-200 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span>{o.text}</span>
                                {previewMode === 'teacher_feedback' && (q.correctOptionIds || []).includes(o.id) && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Correct Key</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {previewMode === 'teacher_feedback' && q.explanation && (
                        <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-lg text-[10px] text-indigo-700">
                          <strong>Exegesis / Context:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t flex justify-between bg-slate-50 dark:bg-slate-950/50">
                <button type="button" onClick={() => { setPreviewAnswers({}); setPreviewScore(null); }} className="px-3 py-1.5 text-xs font-semibold border rounded-xl">Clear Answers</button>
                <button type="button" onClick={handleScorePreview} className="px-4 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-black">Submit Preview</button>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep(currentStep - 1);
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 bg-white dark:bg-slate-900 border text-xs font-bold rounded-xl"
          >
            {currentStep === 1 ? 'Cancel' : 'Previous Step'}
          </button>

          <div className="flex items-center gap-2">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-black flex items-center gap-1 hover:bg-purple-700"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="px-4 py-2 border rounded-xl text-xs font-bold"
                >
                  {copiedLink ? 'Copied Link!' : 'Copy Share Code'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Publish Quiz</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
