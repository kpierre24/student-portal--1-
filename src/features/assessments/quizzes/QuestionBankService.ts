import { QuizQuestion, QuizQuestionType } from '../../../types';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface BankQuestion {
  id: string;
  questionText: string;
  type: QuizQuestionType;
  options?: Array<{ id: string; text: string }>;
  correctOptionId?: string;
  correctOptionIds?: string[];
  acceptableAnswers?: string[];
  weight: number;
  explanation?: string;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
  required?: boolean;
  imageUrl?: string;
  courseCode: string;
  moduleTrack: string;
  topic: string;
  difficulty: DifficultyLevel;
  author: string;
  createdAt: string;
  usageCount: number;
}

const LOCAL_STORAGE_BANK_KEY = 'hteim_question_bank';

const INITIAL_BANK_QUESTIONS: BankQuestion[] = [
  // Hermeneutics - Beginner
  {
    id: 'bank_q_1',
    questionText: 'What is the literal meaning of the Greek word "hermeneuo" from which hermeneutics is derived?',
    type: 'multiple_choice',
    options: [
      { id: 'b_opt_1a', text: 'To interpret, explain, or translate' },
      { id: 'b_opt_1b', text: 'To memorize and recite' },
      { id: 'b_opt_1c', text: 'To write or record' },
      { id: 'b_opt_1d', text: 'To argue or debate' }
    ],
    correctOptionId: 'b_opt_1a',
    weight: 5,
    explanation: 'The term hermeneutics is derived from "hermeneuo", meaning to translate, explain, or interpret.',
    difficulty: 'beginner',
    courseCode: 'MIN-101',
    moduleTrack: 'Biblical Hermeneutics',
    topic: 'Etymology & Definition',
    author: 'Dr. Gillian Selkridge',
    createdAt: '2026-08-10T10:00:00Z',
    usageCount: 3
  },
  {
    id: 'bank_q_2',
    questionText: 'Which hermeneutical method emphasizes the historical context, grammatical structure, and original intent of the author?',
    type: 'multiple_choice',
    options: [
      { id: 'b_opt_2a', text: 'The Grammatical-Historical Method' },
      { id: 'b_opt_2b', text: 'The Allegorical Method' },
      { id: 'b_opt_2c', text: 'The Reader-Response Method' },
      { id: 'b_opt_2d', text: 'The Mystical-Sensus Plenior Method' }
    ],
    correctOptionId: 'b_opt_2a',
    weight: 5,
    explanation: 'The Grammatical-Historical method focuses on discovering the author\'s original meaning through historical and grammatical context.',
    difficulty: 'beginner',
    courseCode: 'MIN-101',
    moduleTrack: 'Biblical Hermeneutics',
    topic: 'Hermeneutical Methods',
    author: 'Dr. Gillian Selkridge',
    createdAt: '2026-08-11T12:00:00Z',
    usageCount: 5
  },
  // Hermeneutics - Intermediate
  {
    id: 'bank_q_3',
    questionText: 'What is the "hermeneutical circle"?',
    type: 'multiple_choice',
    options: [
      { id: 'b_opt_3a', text: 'The process of understanding where the parts are interpreted in light of the whole, and the whole in light of the parts' },
      { id: 'b_opt_3b', text: 'A seating arrangement used in academic theological debates' },
      { id: 'b_opt_3c', text: 'The cycle of preaching, teaching, and evangelizing' },
      { id: 'b_opt_3d', text: 'The repeating pattern of Israel\'s rebellion and redemption' }
    ],
    correctOptionId: 'b_opt_3a',
    weight: 10,
    explanation: 'The hermeneutical circle is a key concept describing the reciprocal relationship between the text as a whole and its individual parts.',
    difficulty: 'intermediate',
    courseCode: 'MIN-101',
    moduleTrack: 'Biblical Hermeneutics',
    topic: 'Interpretation Principles',
    author: 'Kendell Pierre',
    createdAt: '2026-08-12T14:30:00Z',
    usageCount: 2
  },
  {
    id: 'bank_q_4',
    questionText: 'Which of the following describes "Eisegesis"?',
    type: 'multiple_choice',
    options: [
      { id: 'b_opt_4a', text: 'Reading one\'s own ideas, biases, or presuppositions into the biblical text' },
      { id: 'b_opt_4b', text: 'Drawing out the author\'s original intended meaning' },
      { id: 'b_opt_4c', text: 'The study of ancient Greek manuscripts' },
      { id: 'b_opt_4d', text: 'Cross-referencing parallel historical accounts' }
    ],
    correctOptionId: 'b_opt_4a',
    weight: 10,
    explanation: 'Eisegesis is the subjective process of inserting foreign meaning into a text, which is the opposite of exegesis.',
    difficulty: 'intermediate',
    courseCode: 'MIN-101',
    moduleTrack: 'Biblical Hermeneutics',
    topic: 'Eisegesis vs Exegesis',
    author: 'Dr. Gillian Selkridge',
    createdAt: '2026-08-13T09:15:00Z',
    usageCount: 4
  },
  // Hermeneutics - Advanced
  {
    id: 'bank_q_5',
    questionText: 'In the context of interpretation, how does Hans-Georg Gadamer define "fusion of horizons" (Horizontverschmelzung)?',
    type: 'paragraph',
    correctOptionId: undefined,
    weight: 15,
    explanation: 'Gadamer\'s fusion of horizons refers to the dialogical process where the interpreter\'s historical context (horizon) meets and merges with the historical context of the text.',
    difficulty: 'advanced',
    courseCode: 'MIN-201',
    moduleTrack: 'Biblical Hermeneutics',
    topic: 'Philosophical Hermeneutics',
    author: 'Dr. Gillian Selkridge',
    createdAt: '2026-08-14T16:00:00Z',
    usageCount: 1
  },
  {
    id: 'bank_q_6',
    questionText: 'True or False: The sensus plenior of a text refers to a deeper, hidden meaning intended by God but not fully comprehended by the human author.',
    type: 'true_false',
    options: [
      { id: 'b_opt_6t', text: 'True' },
      { id: 'b_opt_6f', text: 'False' }
    ],
    correctOptionId: 'b_opt_6t',
    weight: 10,
    explanation: 'Sensus plenior means "fuller sense" and refers to the divine meaning in Scripture that surpasses the conscious intent of the human author.',
    difficulty: 'advanced',
    courseCode: 'MIN-201',
    moduleTrack: 'Biblical Hermeneutics',
    topic: 'Sensus Plenior',
    author: 'Kendell Pierre',
    createdAt: '2026-08-15T11:00:00Z',
    usageCount: 2
  },
  // Church Leadership
  {
    id: 'bank_q_7',
    questionText: 'Which scripture contains the list of qualitative requirements for overseers (bishops) and deacons?',
    type: 'multiple_choice',
    options: [
      { id: 'b_opt_7a', text: '1 Timothy 3:1-13' },
      { id: 'b_opt_7b', text: 'Galatians 5:22-23' },
      { id: 'b_opt_7c', text: 'Romans 12:1-8' },
      { id: 'b_opt_7d', text: '1 Corinthians 13:1-13' }
    ],
    correctOptionId: 'b_opt_7a',
    weight: 5,
    explanation: '1 Timothy 3 outlines qualifications for both overseers (elder/bishop) and deacons in the local church body.',
    difficulty: 'beginner',
    courseCode: 'MIN-101',
    moduleTrack: 'Church Leadership',
    topic: 'Leadership Qualifications',
    author: 'Dr. Gillian Selkridge',
    createdAt: '2026-08-16T15:20:00Z',
    usageCount: 6
  }
];

export const QuestionBankService = {
  getQuestions(): BankQuestion[] {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_BANK_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading question bank', e);
    }
    // Seed and return default questions
    this.saveQuestions(INITIAL_BANK_QUESTIONS);
    return INITIAL_BANK_QUESTIONS;
  },

  saveQuestions(questions: BankQuestion[]) {
    try {
      localStorage.setItem(LOCAL_STORAGE_BANK_KEY, JSON.stringify(questions));
    } catch (e) {
      console.error('Error saving question bank', e);
    }
  },

  addQuestion(question: Omit<BankQuestion, 'id' | 'createdAt' | 'usageCount'>): BankQuestion {
    const bank = this.getQuestions();
    const newQ: BankQuestion = {
      ...question,
      id: `bank_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };
    bank.push(newQ);
    this.saveQuestions(bank);
    return newQ;
  },

  incrementUsage(questionId: string) {
    const bank = this.getQuestions();
    const updated = bank.map(q => q.id === questionId ? { ...q, usageCount: q.usageCount + 1 } : q);
    this.saveQuestions(updated);
  },

  /**
   * Helper to draw a randomized selection of questions from the bank matching filters.
   */
  drawRandomPool(params: {
    courseCode?: string;
    moduleTrack?: string;
    topic?: string;
    difficulty?: DifficultyLevel;
    count: number;
  }): QuizQuestion[] {
    const bank = this.getQuestions();
    let pool = bank.filter(q => {
      if (params.courseCode && q.courseCode !== params.courseCode) return false;
      if (params.moduleTrack && q.moduleTrack !== params.moduleTrack) return false;
      if (params.topic && q.topic !== params.topic) return false;
      if (params.difficulty && q.difficulty !== params.difficulty) return false;
      return true;
    });

    // Shuffle
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, params.count);

    // Map to QuizQuestion
    return selected.map(bq => {
      // Record usage
      this.incrementUsage(bq.id);
      
      return {
        id: `q_pool_${bq.id}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
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
    });
  }
};
