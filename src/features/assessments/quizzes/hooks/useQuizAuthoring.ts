import { useState, useMemo, useCallback } from 'react';
import {
  Quiz,
  QuizQuestion,
  QuizQuestionOption,
  QuizQuestionType,
  QuizSettings,
  QuizValidationResult,
  QuizVersion
} from '../types/quiz.types';
import { QuizValidationService } from '../services/quizValidationService';
import { QuizVersionService } from '../services/quizVersionService';
import { QuizSecurityService } from '../services/quizSecurityService';

export interface UseQuizAuthoringProps {
  initialQuiz?: Partial<Quiz> | null;
  onSave?: (quiz: Quiz) => void;
  onPublish?: (quiz: Quiz) => void;
}

export function useQuizAuthoring({ initialQuiz, onSave, onPublish }: UseQuizAuthoringProps = {}) {
  // Wizard current step (1: Info, 2: Questions, 3: Settings, 4: Validation, 5: Preview, 6: Publish)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Core quiz state
  const [id] = useState<string>(
    initialQuiz?.id || `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  );
  const [title, setTitle] = useState<string>(initialQuiz?.title || '');
  const [description, setDescription] = useState<string>(
    initialQuiz?.description || 'Complete this ministry assessment thoroughly.'
  );
  const [instructions, setInstructions] = useState<string>(
    initialQuiz?.instructions || 'Review the scriptures, consider the questions carefully, and submit your answers.'
  );
  const [courseCode, setCourseCode] = useState<string>(initialQuiz?.courseCode || 'MIN-101');
  const [moduleTrack, setModuleTrack] = useState<string>(
    initialQuiz?.moduleTrack || 'Biblical Hermeneutics'
  );
  const [category, setCategory] = useState<string>(initialQuiz?.category || 'Scripture Knowledge');
  const [isTemplate, setIsTemplate] = useState<boolean>(initialQuiz?.isTemplate || false);
  const [shareCode, setShareCode] = useState<string>(
    initialQuiz?.shareCode || QuizSecurityService.generateShareToken()
  );

  // Questions
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialQuiz?.questions ? JSON.parse(JSON.stringify(initialQuiz.questions)) : [
      {
        id: `q_${Date.now()}_1`,
        questionText: '',
        type: 'multiple_choice',
        options: [
          { id: 'opt_1a', text: '' },
          { id: 'opt_1b', text: '' },
          { id: 'opt_1c', text: '' },
          { id: 'opt_1d', text: '' }
        ],
        correctOptionId: 'opt_1a',
        weight: 10,
        required: true
      }
    ]
  );

  // Settings
  const [settings, setSettings] = useState<QuizSettings>(
    initialQuiz?.settings ? { ...initialQuiz.settings } : {
      timeLimitMinutes: 30,
      shuffleQuestions: false,
      shuffleOptions: false,
      showCorrectAnswers: true,
      showPointValues: true,
      showFeedback: true,
      passingScorePercentage: 75,
      allowMultipleAttempts: true,
      maxAttempts: 2,
      gradeCalculation: 'highest',
      gradeReleasePolicy: 'immediate',
      requireAllQuestionsAnswered: false,
      collectStudentEmail: true,
      audienceCohortId: 'all'
    }
  );

  // Versions history
  const [versions, setVersions] = useState<QuizVersion[]>(
    initialQuiz?.versions || []
  );

  // Active question selected in the builder editor
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);

  // Computed total points
  const totalPoints = useMemo(() => {
    return questions.reduce((acc, q) => acc + (Number(q.weight) || 0), 0);
  }, [questions]);

  // Real-time validation result
  const validationResult: QuizValidationResult = useMemo(() => {
    return QuizValidationService.validateQuiz({
      id,
      title,
      description,
      instructions,
      courseCode,
      moduleTrack,
      category,
      questions,
      settings,
      totalPoints
    });
  }, [id, title, description, instructions, courseCode, moduleTrack, category, questions, settings, totalPoints]);

  // Question Management Methods
  const addQuestion = useCallback((type: QuizQuestionType = 'multiple_choice') => {
    const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let defaultOptions: QuizQuestionOption[] = [];
    let defaultCorrectId: string | undefined;

    if (type === 'multiple_choice' || type === 'checkboxes') {
      defaultOptions = [
        { id: `${newId}_opt_a`, text: 'Option 1' },
        { id: `${newId}_opt_b`, text: 'Option 2' },
        { id: `${newId}_opt_c`, text: 'Option 3' },
        { id: `${newId}_opt_d`, text: 'Option 4' }
      ];
      defaultCorrectId = `${newId}_opt_a`;
    } else if (type === 'true_false') {
      defaultOptions = [
        { id: `${newId}_opt_true`, text: 'True' },
        { id: `${newId}_opt_false`, text: 'False' }
      ];
      defaultCorrectId = `${newId}_opt_true`;
    }

    const newQ: QuizQuestion = {
      id: newId,
      questionText: '',
      type,
      options: defaultOptions,
      correctOptionId: defaultCorrectId,
      correctOptionIds: type === 'checkboxes' ? [defaultOptions[0]?.id].filter(Boolean) : undefined,
      acceptableAnswers: (type === 'short_answer' || type === 'fill_blank') ? [''] : undefined,
      weight: 10,
      required: true
    };

    setQuestions(prev => [...prev, newQ]);
    setActiveQuestionIndex(questions.length);
  }, [questions.length]);

  const updateQuestion = useCallback((index: number, updates: Partial<QuizQuestion>) => {
    setQuestions(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], ...updates };
      }
      return copy;
    });
  }, []);

  const deleteQuestion = useCallback((index: number) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
    setActiveQuestionIndex(prev => Math.max(0, Math.min(prev, questions.length - 2)));
  }, [questions.length]);

  const duplicateQuestion = useCallback((index: number) => {
    setQuestions(prev => {
      const copy = [...prev];
      const source = copy[index];
      if (!source) return copy;

      const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const duplicatedOptions = (source.options || []).map((o, optIdx) => ({
        id: `${newId}_opt_${optIdx}`,
        text: o.text
      }));

      const newQ: QuizQuestion = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        questionText: `${source.questionText} (Copy)`,
        options: duplicatedOptions,
        correctOptionId: duplicatedOptions[0]?.id || source.correctOptionId
      };

      copy.splice(index + 1, 0, newQ);
      return copy;
    });
    setActiveQuestionIndex(index + 1);
  }, []);

  const moveQuestion = useCallback((index: number, direction: 'up' | 'down') => {
    setQuestions(prev => {
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
    setActiveQuestionIndex(direction === 'up' ? index - 1 : index + 1);
  }, []);

  const importQuestions = useCallback((newQuestions: QuizQuestion[]) => {
    if (!newQuestions || newQuestions.length === 0) return;
    setQuestions(prev => [...prev, ...newQuestions]);
  }, []);

  // Construct complete Quiz object
  const buildCurrentQuiz = useCallback((isPublished = false): Quiz => {
    const now = new Date().toISOString();
    return {
      id,
      title: title.trim() || 'Untitled Quiz',
      description: description.trim(),
      instructions: instructions.trim(),
      courseCode,
      moduleTrack,
      category,
      createdBy: initialQuiz?.createdBy || 'HTEIM Faculty',
      instructorName: initialQuiz?.instructorName || 'Dr. Gillian Selkridge',
      createdAt: initialQuiz?.createdAt || now,
      updatedAt: now,
      status: isPublished ? 'OPEN' : 'DRAFT',
      currentVersionId: initialQuiz?.currentVersionId || `ver_${id}_v1`,
      isPublished,
      isTemplate,
      shareCode,
      timeLimitMinutes: settings.timeLimitMinutes,
      dueDate: settings.closeDate,
      availableFrom: settings.availableFromDate,
      availableUntil: settings.closeDate,
      totalPoints,
      questions,
      settings,
      versions
    };
  }, [
    id,
    title,
    description,
    instructions,
    courseCode,
    moduleTrack,
    category,
    initialQuiz,
    isTemplate,
    shareCode,
    settings,
    totalPoints,
    questions,
    versions
  ]);

  const handleSaveDraft = useCallback(() => {
    const quiz = buildCurrentQuiz(false);
    onSave?.(quiz);
    return quiz;
  }, [buildCurrentQuiz, onSave]);

  const handlePublishQuiz = useCallback(() => {
    if (!validationResult.isValid) {
      throw new Error(`Cannot publish: ${validationResult.errors[0]?.message || 'Please fix validation errors.'}`);
    }
    const quiz = buildCurrentQuiz(true);
    onPublish?.(quiz);
    onSave?.(quiz);
    return quiz;
  }, [buildCurrentQuiz, onPublish, onSave, validationResult]);

  return {
    currentStep,
    setCurrentStep,
    id,
    title,
    setTitle,
    description,
    setDescription,
    instructions,
    setInstructions,
    courseCode,
    setCourseCode,
    moduleTrack,
    setModuleTrack,
    category,
    setCategory,
    isTemplate,
    setIsTemplate,
    shareCode,
    setShareCode,
    questions,
    setQuestions,
    settings,
    setSettings,
    versions,
    setVersions,
    activeQuestionIndex,
    setActiveQuestionIndex,
    totalPoints,
    validationResult,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    duplicateQuestion,
    moveQuestion,
    importQuestions,
    buildCurrentQuiz,
    handleSaveDraft,
    handlePublishQuiz
  };
}
