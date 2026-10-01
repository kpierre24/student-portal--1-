import { QuizAssignment, QuizQuestion, QuizSubmission, QuizAttempt } from '../types';

export const DEFAULT_QUIZ_TEMPLATES: QuizAssignment[] = [
  {
    id: 'quiz-som-hermeneutics-101',
    title: 'Biblical Hermeneutics & Exegesis Mastery Quiz',
    courseCode: 'MIN-101',
    moduleTrack: 'Module 1: Scripture & Interpretation',
    description: 'Comprehensive assessment on inductive Bible study methods, historical-grammatical context, and practical scriptural application for ministry leaders.',
    dueDate: '2026-09-28',
    totalPoints: 100,
    createdAt: '2026-09-01',
    isPublished: true,
    isTemplate: true,
    shareCode: 'hermeneutics101',
    timeLimitMinutes: 20,
    category: 'Hermeneutics',
    settings: {
      shuffleQuestions: false,
      shuffleOptions: false,
      showCorrectAnswers: true,
      showPointValues: true,
      showFeedback: true,
      passingScorePercentage: 75,
      allowMultipleAttempts: true,
      maxAttempts: 3,
      gradeReleasePolicy: 'immediate',
      requireAllQuestionsAnswered: false,
      collectStudentEmail: true
    },
    questions: [
      {
        id: 'q_herm_1',
        questionText: 'What is the primary objective of Biblical Hermeneutics in Christian ministry?',
        type: 'multiple_choice',
        weight: 15,
        required: true,
        options: [
          { id: 'opt_1a', text: 'To discover the author\'s intended meaning within its original historical and grammatical context' },
          { id: 'opt_1b', text: 'To bend scripture to fit modern cultural philosophies' },
          { id: 'opt_1c', text: 'To interpret every biblical passage exclusively through allegory' },
          { id: 'opt_1d', text: 'To memorize chapter and verse numbers without contextual analysis' }
        ],
        correctOptionId: 'opt_1a',
        explanation: 'Hermeneutics is the science and art of biblical interpretation aimed at understanding what the inspired text meant to its original audience and how it applies today.',
        feedbackCorrect: 'Excellent! Proper hermeneutics always anchors in the author\'s original historical-grammatical intent.',
        feedbackIncorrect: 'Review 2 Timothy 2:15. Hermeneutics seeks the author\'s original intended meaning, not modern subjective imposition.'
      },
      {
        id: 'q_herm_2',
        questionText: 'Which of the following are foundational pillars of Inductive Bible Study? (Select all that apply)',
        type: 'checkboxes',
        weight: 20,
        required: true,
        options: [
          { id: 'opt_2a', text: 'Observation: What does the text say?' },
          { id: 'opt_2b', text: 'Interpretation: What did the text mean to original hearers?' },
          { id: 'opt_2c', text: 'Application: How do I live out this truth today?' },
          { id: 'opt_2d', text: 'Speculation: Generating unsupported theories' }
        ],
        correctOptionIds: ['opt_2a', 'opt_2b', 'opt_2c'],
        explanation: 'Inductive Bible Study consists of the three vital steps: Observation (What does it say?), Interpretation (What does it mean?), and Application (How do we obey?).',
        feedbackCorrect: 'Spot on! Observation, Interpretation, and Application form the golden triad of inductive study.',
        feedbackIncorrect: 'Inductive study strictly requires Observation, Interpretation, and Application, avoiding ungrounded speculation.'
      },
      {
        id: 'q_herm_3',
        questionText: 'True or False: A biblical text can have multiple diverse original meanings intended by the human author.',
        type: 'true_false',
        weight: 10,
        required: true,
        options: [
          { id: 'opt_3_true', text: 'True' },
          { id: 'opt_3_false', text: 'False' }
        ],
        correctOptionId: 'opt_3_false',
        explanation: 'While a text has one single primary intended meaning (what the author intended), it can have numerous applications across different life situations.',
        feedbackCorrect: 'Amen! A text has one meaning with many applications.',
        feedbackIncorrect: 'False. A scripture passage has one intended original meaning, though it may yield multiple applications.'
      },
      {
        id: 'q_herm_4',
        questionText: 'In 2 Timothy 2:15, Paul instructs Timothy to study to show himself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth. What is the key Greek term or concept for "rightly dividing"?',
        type: 'short_answer',
        weight: 20,
        required: true,
        options: [],
        acceptableAnswers: ['orthotomeo', 'orthotomeō', 'straight path', 'cutting straight', 'orthotomein', 'straight cutting'],
        explanation: 'The Greek word "orthotomeo" literally means to cut in a straight line, as a builder cutting timber or a plowman cutting a furrow.',
        feedbackCorrect: 'Magnificent scholarship! "Orthotomeo" signifies cutting straight without deviation.',
        feedbackIncorrect: 'The Greek term is "orthotomeo" (cutting in a straight line).'
      },
      {
        id: 'q_herm_5',
        questionText: 'Fill in the blank: "All Scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for __________, for instruction in righteousness." (2 Timothy 3:16)',
        type: 'fill_blank',
        weight: 15,
        required: true,
        options: [],
        acceptableAnswers: ['correction', 'correction,', 'for correction'],
        explanation: '2 Timothy 3:16 specifies doctrine, reproof, correction, and instruction in righteousness.',
        feedbackCorrect: 'Amen! Correction is vital for restoring the believer to righteousness.',
        feedbackIncorrect: 'The missing word is "correction" (2 Timothy 3:16).'
      },
      {
        id: 'q_herm_6',
        questionText: 'Briefly explain how understanding the historical-cultural background of 1 Corinthians helps prevent misapplying Paul\'s instructions to the Corinthian church.',
        type: 'paragraph',
        weight: 20,
        required: false,
        options: [],
        explanation: 'Corinth was a cosmopolitan, highly pagan commercial hub with unique idol temple practices, factionalism, and ecstatic cults that directly prompted Paul\'s pastoral responses.',
        feedbackCorrect: 'Thank you for your thoughtful reflection. Your instructor will review your biblical rationale.',
        feedbackIncorrect: 'Your instructor will evaluate your written synthesis and provide feedback.'
      }
    ]
  },
  {
    id: 'quiz-som-fivefold-leadership',
    title: 'Five-Fold Ministry Leadership & Apostolic Mandates',
    courseCode: 'MIN-202',
    moduleTrack: 'Module 2: Five-Fold Leadership',
    description: 'Assess understanding of Apostles, Prophets, Evangelists, Pastors, and Teachers according to Ephesians 4:11-16.',
    dueDate: '2026-10-05',
    totalPoints: 100,
    createdAt: '2026-09-05',
    isPublished: true,
    isTemplate: true,
    shareCode: 'fivefold202',
    timeLimitMinutes: 15,
    category: 'Ministry Leadership',
    settings: {
      shuffleQuestions: true,
      shuffleOptions: true,
      showCorrectAnswers: true,
      showPointValues: true,
      showFeedback: true,
      passingScorePercentage: 75,
      allowMultipleAttempts: true,
      maxAttempts: 2,
      gradeReleasePolicy: 'immediate',
      requireAllQuestionsAnswered: false,
      collectStudentEmail: true
    },
    questions: [
      {
        id: 'q_ff_1',
        questionText: 'According to Ephesians 4:11-12, what is the divine mandate given to Five-Fold Ministry leaders?',
        type: 'multiple_choice',
        weight: 25,
        required: true,
        options: [
          { id: 'opt_ff_1a', text: 'To equip the saints for the work of ministry and for edifying the body of Christ' },
          { id: 'opt_ff_1b', text: 'To monopolize all spiritual gifts and centralize authority' },
          { id: 'opt_ff_1c', text: 'To replace congregational prayer and individual evangelism' },
          { id: 'opt_ff_1d', text: 'To establish worldly corporate management hierarchies' }
        ],
        correctOptionId: 'opt_ff_1a',
        explanation: 'Ephesians 4:12 declares the purpose is "for the equipping of the saints for the work of ministry, for the edifying of the body of Christ."',
        feedbackCorrect: 'Praise God! Equipping the saints empowers the entire body to function in ministry.',
        feedbackIncorrect: 'See Ephesians 4:12. Leaders are given to equip the believers, not perform ministry in isolation.'
      },
      {
        id: 'q_ff_2',
        questionText: 'Which of the following ministry gifts are explicitly listed in the Ephesians 4:11 Ascension Gifts? (Select all that apply)',
        type: 'checkboxes',
        weight: 25,
        required: true,
        options: [
          { id: 'opt_ff_2a', text: 'Apostles' },
          { id: 'opt_ff_2b', text: 'Prophets' },
          { id: 'opt_ff_2c', text: 'Evangelists' },
          { id: 'opt_ff_2d', text: 'Pastors and Teachers' }
        ],
        correctOptionIds: ['opt_ff_2a', 'opt_ff_2b', 'opt_ff_2c', 'opt_ff_2d'],
        explanation: 'Ephesians 4:11 lists Apostles, Prophets, Evangelists, Pastors, and Teachers.',
        feedbackCorrect: 'All four options represent the five distinct ascension gifts of Christ!',
        feedbackIncorrect: 'All five gifts (Apostles, Prophets, Evangelists, Pastors, Teachers) are listed in Ephesians 4:11.'
      },
      {
        id: 'q_ff_3',
        questionText: 'True or False: An Apostle\'s primary biblical validation is foundation-laying, spiritual fathering, and planting healthy Kingdom governance.',
        type: 'true_false',
        weight: 25,
        required: true,
        options: [
          { id: 'opt_ff_3t', text: 'True' },
          { id: 'opt_ff_3f', text: 'False' }
        ],
        correctOptionId: 'opt_ff_3t',
        explanation: '1 Corinthians 3:10 and 2 Corinthians 12:12 demonstrate the apostolic role in laying foundations and spiritual fatherhood.',
        feedbackCorrect: 'True! Apostles function as master builders and spiritual fathers.',
        feedbackIncorrect: 'True is the correct answer according to 1 Corinthians 3:10.'
      },
      {
        id: 'q_ff_4',
        questionText: 'What Greek word is translated as "Apostle" in the New Testament, meaning "one who is sent forth with authority"?',
        type: 'short_answer',
        weight: 25,
        required: true,
        options: [],
        acceptableAnswers: ['apostolos', 'apóstolos', 'apostolos (sent one)', 'sent one'],
        explanation: 'Apostolos comes from "apo" (from) and "stello" (to send), denoting a delegate or ambassador dispatched with full authority.',
        feedbackCorrect: 'Exceptional knowledge! Apostolos is the sent ambassador of Christ.',
        feedbackIncorrect: 'The Greek word is "apostolos" (an authorized envoy sent on a mission).'
      }
    ]
  },
  {
    id: 'quiz-som-homiletics-preaching',
    title: 'Expository Preaching & Homiletics Exam',
    courseCode: 'MIN-303',
    moduleTrack: 'Module 3: Homiletics & Preaching',
    description: 'Evaluation of sermon architecture, Christocentric hermeneutics, and powerful delivery of the Word of God.',
    dueDate: '2026-10-12',
    totalPoints: 100,
    createdAt: '2026-09-10',
    isPublished: true,
    isTemplate: true,
    shareCode: 'homiletics303',
    timeLimitMinutes: 25,
    category: 'Pastoral Theology',
    settings: {
      shuffleQuestions: false,
      shuffleOptions: true,
      showCorrectAnswers: true,
      showPointValues: true,
      showFeedback: true,
      passingScorePercentage: 75,
      allowMultipleAttempts: true,
      maxAttempts: 2,
      gradeReleasePolicy: 'immediate',
      requireAllQuestionsAnswered: false,
      collectStudentEmail: true
    },
    questions: [
      {
        id: 'q_hom_1',
        questionText: 'What distinguishes Expository Preaching from Topical or Textual preaching?',
        type: 'multiple_choice',
        weight: 20,
        required: true,
        options: [
          { id: 'opt_hom_1a', text: 'The sermon\'s main idea and structure are directly derived from and governed by the biblical text in its context' },
          { id: 'opt_hom_1b', text: 'The preacher only shares personal opinions with occasional verse references' },
          { id: 'opt_hom_1c', text: 'It requires speaking only in ancient biblical languages without English translation' },
          { id: 'opt_hom_1d', text: 'It avoids making practical calls to repentance or faith' }
        ],
        correctOptionId: 'opt_hom_1a',
        explanation: 'Expository preaching lets the text drive the message, unfolding the Holy Spirit\'s intended truth to the congregation.',
        feedbackCorrect: 'Amen! Expository preaching lets the inspired text dictate the sermon\'s truth and thrust.',
        feedbackIncorrect: 'Expository preaching derives its primary message directly from the biblical text in context.'
      },
      {
        id: 'q_hom_2',
        questionText: 'What are the three essential components of a well-crafted sermon outline? (Select all that apply)',
        type: 'checkboxes',
        weight: 25,
        required: true,
        options: [
          { id: 'opt_hom_2a', text: 'Introduction (Hook & Context)' },
          { id: 'opt_hom_2b', text: 'Body / Exposition (Main Scripture Points & Proofs)' },
          { id: 'opt_hom_2c', text: 'Conclusion / Application (Call to Action & Response)' },
          { id: 'opt_hom_2d', text: 'Political debate and unrelated stories' }
        ],
        correctOptionIds: ['opt_hom_2a', 'opt_hom_2b', 'opt_hom_2c'],
        explanation: 'A classic homiletical structure includes a compelling Introduction, a faithful Scripture Body, and an urgent Application/Conclusion.',
        feedbackCorrect: 'Spot on! Introduction, Scripture Body, and Application form the core structure.',
        feedbackIncorrect: 'The core components are Introduction, Body Exposition, and Conclusion Application.'
      },
      {
        id: 'q_hom_3',
        questionText: 'In Homiletics, what is the term for the single overarching central thesis sentence of a sermon?',
        type: 'short_answer',
        weight: 25,
        required: true,
        options: [],
        acceptableAnswers: ['big idea', 'the big idea', 'homiletical proposition', 'proposition', 'central idea', 'main idea', 'thesis'],
        explanation: 'Often referred to as the "Big Idea" (Haddon Robinson) or "Homiletical Proposition", it is the single sentence that encapsulates the entire message.',
        feedbackCorrect: 'Excellent! The Big Idea or Homiletical Proposition brings clarity and focus.',
        feedbackIncorrect: 'It is known as the "Big Idea" or "Homiletical Proposition".'
      },
      {
        id: 'q_hom_4',
        questionText: 'True or False: Every Christian sermon, whether from the Old Testament or New Testament, should ultimately point to the Gospel and the Person of Jesus Christ.',
        type: 'true_false',
        weight: 30,
        required: true,
        options: [
          { id: 'opt_hom_4t', text: 'True' },
          { id: 'opt_hom_4f', text: 'False' }
        ],
        correctOptionId: 'opt_hom_4t',
        explanation: 'Jesus taught on the Road to Emmaus (Luke 24:27) that all Scriptures testify concerning Himself.',
        feedbackCorrect: 'Glory to God! Christ is the climax and fulfillment of all Scripture (Luke 24:44-47).',
        feedbackIncorrect: 'True. Luke 24:27 and 1 Corinthians 2:2 affirm Christ-centered preaching across all scripture.'
      }
    ]
  }
];

// Helper to calculate quiz grade & feedback
export function gradeQuizAttempt(
  quiz: QuizAssignment,
  responses: Record<string, any>,
  studentName: string,
  studentEmail?: string,
  timeSpentSeconds?: number
): QuizAttempt {
  const currentVerId = quiz.currentVersionId || `ver_${quiz.id}_v1`;
  const attemptResponses = quiz.questions.map((q) => {
    const rawVal = responses[q.id];
    let isCorrect = false;
    let pointsEarned = 0;
    const weight = Number(q.weight) || 10;

    if (q.type === 'multiple_choice' || q.type === 'true_false' || !q.type) {
      const selectedOptId = typeof rawVal === 'string' ? rawVal : '';
      isCorrect = selectedOptId === q.correctOptionId;
      pointsEarned = isCorrect ? weight : 0;

      return {
        quizVersionId: currentVerId,
        questionId: q.id,
        selectedOptionId: selectedOptId,
        isCorrect,
        pointsEarned,
        correctOptionId: q.correctOptionId,
        explanation: q.explanation
      };
    } else if (q.type === 'checkboxes') {
      const selectedOptIds = Array.isArray(rawVal) ? rawVal : (typeof rawVal === 'string' ? [rawVal] : []);
      const correctIds = q.correctOptionIds || (q.correctOptionId ? [q.correctOptionId] : []);
      
      const isExact = correctIds.length === selectedOptIds.length && 
        correctIds.every(id => selectedOptIds.includes(id));
      
      isCorrect = isExact;
      pointsEarned = isCorrect ? weight : 0;

      return {
        quizVersionId: currentVerId,
        questionId: q.id,
        selectedOptionIds: selectedOptIds,
        isCorrect,
        pointsEarned,
        correctOptionIds: correctIds,
        explanation: q.explanation
      };
    } else if (q.type === 'short_answer' || q.type === 'fill_blank') {
      const originalText = typeof rawVal === 'string' ? rawVal : '';
      const mode = q.gradingMode || 'case_insensitive';
      let textVal = originalText;
      
      if (mode === 'manual') {
        isCorrect = false;
        pointsEarned = 0;
      } else {
        if (mode === 'trim' || mode === 'case_insensitive' || mode === 'multiple') {
          textVal = originalText.trim();
        }
        
        const checkValue = (mode === 'case_insensitive' || mode === 'multiple')
          ? textVal.toLowerCase()
          : textVal;

        const acceptable = (q.acceptableAnswers || []).map(a => {
          let ans = a;
          if (mode === 'trim' || mode === 'case_insensitive' || mode === 'multiple') {
            ans = ans.trim();
          }
          if (mode === 'case_insensitive' || mode === 'multiple') {
            ans = ans.toLowerCase();
          }
          return ans;
        });

        if (mode === 'exact') {
          isCorrect = acceptable.includes(checkValue);
        } else {
          isCorrect = acceptable.length > 0 && acceptable.some(acc => {
            if (acc === checkValue) return true;
            const cleanAcc = acc.replace(/[^a-z0-9]/g, '');
            const cleanVal = checkValue.replace(/[^a-z0-9]/g, '');
            return cleanAcc.length > 0 && cleanAcc === cleanVal;
          });
        }
        pointsEarned = isCorrect ? weight : 0;
      }

      return {
        quizVersionId: currentVerId,
        questionId: q.id,
        textAnswer: originalText,
        isCorrect,
        pointsEarned,
        acceptableAnswers: q.acceptableAnswers,
        explanation: q.explanation
      };
    } else if (q.type === 'paragraph') {
      const textVal = (typeof rawVal === 'string' ? rawVal : '').trim();
      
      return {
        quizVersionId: currentVerId,
        questionId: q.id,
        textAnswer: textVal,
        isCorrect: false,
        pointsEarned: 0,
        instructorFeedback: 'Pending teacher evaluation of essay.',
        explanation: q.explanation
      };
    }

    return {
      quizVersionId: currentVerId,
      questionId: q.id,
      selectedOptionId: typeof rawVal === 'string' ? rawVal : '',
      isCorrect: false,
      pointsEarned: 0,
      explanation: q.explanation
    };
  });

  const totalPossible = quiz.totalPoints || quiz.questions.reduce((sum, q) => sum + (Number(q.weight) || 10), 0);
  const totalScore = attemptResponses.reduce((sum, r) => sum + (r.pointsEarned || 0), 0);
  const percentage = Math.min(100, Math.round((totalScore / (totalPossible || 1)) * 100));

  return {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    quizId: quiz.id,
    quizVersionId: currentVerId,
    shareCode: quiz.shareCode || quiz.id,
    quizTitle: quiz.title,
    studentName,
    studentEmail,
    status: 'submitted',
    startedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    responses: attemptResponses,
    score: totalScore,
    totalPossible,
    maxPoints: totalPossible,
    percentage,
    scorePercentage: percentage,
    timeSpentSeconds,
    gradingStatus: 'auto_graded'
  };
}

// Generate CSV export string for a set of submissions for a quiz
export function exportQuizSubmissionsCsv(quiz: QuizAssignment, submissions: QuizSubmission[]): string {
  const headers = [
    'Timestamp',
    'Student Name',
    'Student Email',
    'Score',
    'Total Possible',
    'Percentage (%)',
    'Status',
    ...quiz.questions.map((q, idx) => `Q${idx + 1}: ${q.questionText.replace(/"/g, '""')}`)
  ];

  const rows = submissions.map(sub => {
    const isPassed = sub.percentage >= (quiz.settings?.passingScorePercentage || 75);
    const questionAnswers = quiz.questions.map(q => {
      const resp = sub.responses.find(r => r.questionId === q.id);
      if (!resp) return 'No Answer';
      if (resp.textAnswer) return `"${resp.textAnswer.replace(/"/g, '""')}"`;
      if (resp.selectedOptionIds && resp.selectedOptionIds.length > 0) {
        const textLabels = resp.selectedOptionIds.map(optId => {
          const opt = q.options.find(o => o.id === optId);
          return opt ? opt.text : optId;
        });
        return `"${textLabels.join(', ').replace(/"/g, '""')}"`;
      }
      if (resp.selectedOptionId) {
        const opt = q.options.find(o => o.id === resp.selectedOptionId);
        return opt ? `"${opt.text.replace(/"/g, '""')}"` : resp.selectedOptionId;
      }
      return 'No Answer';
    });

    return [
      `"${sub.submittedAt}"`,
      `"${sub.studentName}"`,
      `"${sub.studentEmail || 'N/A'}"`,
      sub.score,
      sub.totalPossible,
      `${sub.percentage}%`,
      isPassed ? 'Passed' : 'At-Risk (<75%)',
      ...questionAnswers
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function scrubQuizForClient(quiz: QuizAssignment): QuizAssignment {
  if (!quiz) return quiz;
  return {
    ...quiz,
    questions: (quiz.questions || []).map(q => ({
      ...q,
      correctOptionId: undefined,
      correctOptionIds: undefined,
      acceptableAnswers: undefined,
      explanation: undefined,
      feedbackCorrect: undefined,
      feedbackIncorrect: undefined
    }))
  };
}

export const gradeQuizSubmission = gradeQuizAttempt;

