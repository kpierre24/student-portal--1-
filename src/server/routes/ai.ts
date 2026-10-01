import { Router } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { requireAuth } from "../middleware/rbac";
import { logger } from "../../lib/logger";

export const aiRouter = Router();

// Default-deny at the router level: All AI endpoints require authentication
aiRouter.use(requireAuth);

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper to wait
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

aiRouter.post("/evaluate-lesson", async (req, res) => {
  try {
    const { title, content, author, courseCode, fileName } = req.body;

    if (!title && !content) {
      return res.status(400).json({ error: "Title or content is required" });
    }

    const ai = getGenAI();

    if (ai) {
      const prompt = `
You are an expert academic and theological curriculum evaluator for the HTEIM School of Ministry.
Analyze the following lesson / course material and generate a structured evaluation.

Lesson Title: ${title || fileName || "Untitled Lesson"}
Author / Instructor: ${author || "Unknown"}
Target Course Code: ${courseCode || "General"}
File Name: ${fileName || "N/A"}

Lesson Content / Excerpt:
"""
${(content || "").slice(0, 8000)}
"""

Please provide a JSON object with the following fields:
1. "summary": A crisp 2-3 sentence executive summary of the lesson suitable for a course material card (highlighting key theological concepts, scripture references, or core objectives).
2. "category": A recommended category string (e.g., "Textbook", "Study Guide", "Lecture Notes", "Scripture Memory", "Syllabus", "Expository Manual").
3. "keyTakeaways": An array of 3-4 bullet points highlighting key learning outcomes or ministerial takeaways.
4. "courseCode": Recommended or confirmed course code (e.g. "SOM-101", "SOM-102", "SOM-CORE", or user-provided).
`;

      const modelsToTry = ["gemini-3.7-flash", "gemini-3.1-flash-lite"];

      for (const modelName of modelsToTry) {
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
          attempts++;
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    summary: {
                      type: Type.STRING,
                      description: "A 2-3 sentence executive summary of the lesson",
                    },
                    category: {
                      type: Type.STRING,
                      description: "Curriculum category such as Textbook, Study Guide, or Lecture Notes",
                    },
                    keyTakeaways: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Key learning outcomes or ministerial takeaways",
                    },
                    courseCode: {
                      type: Type.STRING,
                      description: "Course code like SOM-101 or SOM-CORE",
                    },
                  },
                  required: ["summary", "category", "keyTakeaways", "courseCode"],
                },
              },
            });

            const textResponse = response.text;
            if (textResponse) {
              const cleanedText = textResponse.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
              const parsed = JSON.parse(cleanedText);
              return res.json({
                success: true,
                evaluatedByAI: true,
                summary: parsed.summary || "Summary evaluated by Gemini AI.",
                category: parsed.category || "Study Guide",
                keyTakeaways: parsed.keyTakeaways || [],
                courseCode: parsed.courseCode || courseCode || "SOM-CORE",
              });
            }
          } catch (geminiError: any) {
            const errorMessage = geminiError?.message || String(geminiError);
            const isTransient =
              errorMessage.includes("503") ||
              errorMessage.includes("high demand") ||
              errorMessage.includes("UNAVAILABLE") ||
              errorMessage.includes("429") ||
              errorMessage.includes("RESOURCE_EXHAUSTED");

            if (isTransient && attempts < maxAttempts) {
              logger.warn(`Gemini (${modelName}) transient demand spike, retrying in 1s...`);
              await sleep(1000);
              continue;
            }

            logger.warn(`Gemini API call warning with ${modelName}:`, errorMessage);
            break; // Try next model if available
          }
        }
      }
    }

    // High quality intelligent heuristic fallback if API is unreachable or during extreme cloud spikes
    const rawContent = (content || "").trim();
    const generatedSummary = rawContent.length > 50
      ? `Lesson overview covering key ministerial principles: "${rawContent.slice(0, 160).trim()}..."`
      : `Comprehensive curriculum module titled "${title || fileName || 'Ministry Lesson'}" designed for the HTEIM School of Ministry student body.`;

    const inferredCategory = title?.toLowerCase().includes("audio") ? "Lecture Audio"
      : title?.toLowerCase().includes("guide") ? "Study Guide"
      : title?.toLowerCase().includes("handbook") || title?.toLowerCase().includes("manual") ? "Textbook"
      : title?.toLowerCase().includes("scripture") || title?.toLowerCase().includes("memory") ? "Scripture Memory"
      : "Lecture Notes";

    const keyTakeaways = [
      `Grasp foundational kingdom concepts presented in ${title || 'this lesson'}.`,
      "Apply scripture memory and biblical exegesis to practical ministry.",
      "Integrate leadership ethics and doctrine into pastoral service."
    ];

    return res.json({
      success: true,
      evaluatedByAI: false,
      summary: generatedSummary,
      category: inferredCategory,
      keyTakeaways,
      courseCode: courseCode || "SOM-CORE",
    });
  } catch (err: any) {
    logger.error("Error evaluating lesson:", err);
    return res.status(500).json({ error: "Failed to evaluate lesson content" });
  }
});

/**
 * POST /api/ai/generate-quiz
 * Parses uploaded raw questions, exam sheets, or lesson text,
 * assesses biblical/theological accuracy, detects question types,
 * generates answer keys with scriptural explanations, and outputs a complete QuizAssignment.
 */
aiRouter.post("/generate-quiz", async (req, res) => {
  try {
    const { 
      content, 
      lessonTitle, 
      courseCode = "MIN-101", 
      moduleTrack = "Module 1: Scripture & Hermeneutics", 
      targetClassDay,
      timeLimitMinutes = 30,
      pointsPerQuestion = 10
    } = req.body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ error: "Questions content or lesson text is required." });
    }

    const ai = getGenAI();

    if (ai) {
      const prompt = `
You are an expert biblical scholar, Christian theology professor, and academic assessment author for the HTEIM School of Ministry (Heaven Touching Earth International Ministries).

Analyze the following uploaded quiz questions or lesson material and convert them into a structured, fully auto-gradeable ministry quiz.

User Context:
- Lesson / Quiz Title Hint: ${lessonTitle || targetClassDay || "School of Ministry Lesson Quiz"}
- Course Code: ${courseCode}
- Module Track: ${moduleTrack}
- Target Class Day: ${targetClassDay || "Current Lesson"}
- Default Points per Question: ${pointsPerQuestion}

Input Content to Assess & Convert into a Quiz:
"""
${content.slice(0, 10000)}
"""

Task Instructions:
1. Extract or determine an inspiring, professional Quiz Title (e.g., "Lesson 17: The Person & Work of the Holy Spirit").
2. Extract all distinct questions from the text.
3. For each question:
   - Identify the exact question prompt / stem.
   - Detect the question type:
     * "multiple_choice" (single correct answer among options like I, II, III, IV or A, B, C, D)
     * "checkboxes" (multi-select where multiple answers are correct, e.g. "Select all that apply", "Indicate the seven attributes...")
     * "true_false" (True or False)
     * "short_answer" (fill-in-the-blank or scripture reference)
   - Extract all options with clean text and unique IDs (e.g., "opt_1", "opt_2", etc.).
   - Assess and identify the THEOLOGICALLY AND BIBLICALLY CORRECT answer(s):
     * For "multiple_choice" or "true_false", set "correctOptionId" to the ID of the correct option.
     * For "checkboxes", set "correctOptionIds" to an array of IDs of ALL correct options.
     * For "short_answer", set "acceptableAnswers" to an array of valid answer variations.
   - Provide a deep theological "explanation" with specific Bible book, chapter, and verse references (e.g. John 14:26, 2 Timothy 3:16-17).
   - Provide encouraging ministerial "feedbackCorrect" (e.g. "Amen! The Holy Spirit is our Paraclete...") and "feedbackIncorrect" (clarifying the biblical truth).
   - Assign appropriate "weight" (points, e.g., 10 or 15 points).
4. Provide a clear description and set passingScorePercentage (default 75).

Output strictly valid JSON conforming to the schema.
`;

      const modelsToTry = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.1-flash-lite"];

      for (const modelName of modelsToTry) {
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
          attempts++;
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Title of the quiz" },
                    courseCode: { type: Type.STRING, description: "Course code like MIN-101" },
                    moduleTrack: { type: Type.STRING, description: "Module track name" },
                    description: { type: Type.STRING, description: "Instructions and overview" },
                    category: { type: Type.STRING, description: "Quiz category" },
                    timeLimitMinutes: { type: Type.INTEGER, description: "Time limit in minutes" },
                    passingScorePercentage: { type: Type.INTEGER, description: "Passing percentage (default 75)" },
                    questions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          questionText: { type: Type.STRING },
                          type: { 
                            type: Type.STRING, 
                            enum: ["multiple_choice", "checkboxes", "true_false", "short_answer", "paragraph"] 
                          },
                          options: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                id: { type: Type.STRING },
                                text: { type: Type.STRING }
                              },
                              required: ["id", "text"]
                            }
                          },
                          correctOptionId: { type: Type.STRING },
                          correctOptionIds: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING } 
                          },
                          acceptableAnswers: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING } 
                          },
                          weight: { type: Type.INTEGER },
                          required: { type: Type.BOOLEAN },
                          explanation: { type: Type.STRING },
                          feedbackCorrect: { type: Type.STRING },
                          feedbackIncorrect: { type: Type.STRING }
                        },
                        required: ["id", "questionText", "type", "weight", "required"]
                      }
                    }
                  },
                  required: ["title", "description", "questions"]
                }
              }
            });

            const textResponse = response.text;
            if (textResponse) {
              const cleanedText = textResponse.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
              const parsed = JSON.parse(cleanedText);

              // Normalize questions to ensure options and correct options are consistent
              const normalizedQuestions = (parsed.questions || []).map((q: any, idx: number) => {
                const qId = q.id || `q_${Date.now()}_${idx + 1}`;
                const options = Array.isArray(q.options) && q.options.length > 0 
                  ? q.options.map((opt: any, oIdx: number) => ({
                      id: opt.id || `opt_${qId}_${oIdx + 1}`,
                      text: String(opt.text || '').trim()
                    }))
                  : (q.type === 'true_false' 
                      ? [{ id: `opt_${qId}_t`, text: 'True' }, { id: `opt_${qId}_f`, text: 'False' }]
                      : []);

                let correctOptionId = q.correctOptionId;
                let correctOptionIds = q.correctOptionIds;

                if (q.type === 'multiple_choice' || q.type === 'true_false') {
                  if (!correctOptionId && options.length > 0) {
                    correctOptionId = options[0].id;
                  }
                } else if (q.type === 'checkboxes') {
                  if (!correctOptionIds || correctOptionIds.length === 0) {
                    correctOptionIds = options.length > 0 ? [options[0].id] : [];
                  }
                }

                return {
                  id: qId,
                  questionText: q.questionText || `Question ${idx + 1}`,
                  type: q.type || 'multiple_choice',
                  options,
                  correctOptionId,
                  correctOptionIds,
                  acceptableAnswers: q.acceptableAnswers || [],
                  weight: Number(q.weight) || pointsPerQuestion || 10,
                  required: q.required !== false,
                  explanation: q.explanation || 'Review biblical scriptures on this topic.',
                  feedbackCorrect: q.feedbackCorrect || 'Correct! Well done.',
                  feedbackIncorrect: q.feedbackIncorrect || 'Review the biblical references for this lesson.'
                };
              });

              const totalPoints = normalizedQuestions.reduce((sum: number, q: any) => sum + (Number(q.weight) || 0), 0);
              const shareCode = `qz_${Math.random().toString(36).substring(2, 8)}`;

              return res.json({
                success: true,
                evaluatedByAI: true,
                quiz: {
                  id: `quiz_${Date.now()}`,
                  title: parsed.title || lessonTitle || "Ministry Lesson Assessment",
                  courseCode: parsed.courseCode || courseCode || "MIN-101",
                  moduleTrack: parsed.moduleTrack || moduleTrack || "Module 1: Scripture & Hermeneutics",
                  description: parsed.description || "Complete all questions carefully. Submit your responses upon completion.",
                  category: parsed.category || "Scripture Knowledge",
                  dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
                  createdAt: new Date().toISOString().split('T')[0],
                  updatedAt: new Date().toISOString().split('T')[0],
                  isPublished: true,
                  shareCode,
                  timeLimitMinutes: parsed.timeLimitMinutes || timeLimitMinutes || 30,
                  totalPoints,
                  questions: normalizedQuestions,
                  settings: {
                    shuffleQuestions: false,
                    shuffleOptions: false,
                    showCorrectAnswers: true,
                    showPointValues: true,
                    showFeedback: true,
                    passingScorePercentage: parsed.passingScorePercentage || 75,
                    allowMultipleAttempts: true,
                    maxAttempts: 2,
                    gradeReleasePolicy: "immediate",
                    requireAllQuestionsAnswered: true,
                    collectStudentEmail: true
                  }
                }
              });
            }
          } catch (geminiError: any) {
            const errorMessage = geminiError?.message || String(geminiError);
            const isTransient =
              errorMessage.includes("503") ||
              errorMessage.includes("high demand") ||
              errorMessage.includes("UNAVAILABLE") ||
              errorMessage.includes("429") ||
              errorMessage.includes("RESOURCE_EXHAUSTED");

            if (isTransient && attempts < maxAttempts) {
              logger.warn(`Gemini (${modelName}) quiz generation transient spike, retrying in 1s...`);
              await sleep(1000);
              continue;
            }

            logger.warn(`Gemini quiz generation warning with ${modelName}:`, errorMessage);
            break;
          }
        }
      }
    }

    // Heuristic parsing fallback for raw text/questions
    const rawLines = content.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
    const parsedQuestions: any[] = [];
    let currentQuestion: any = null;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      // Check for question numbering like "1. ", "Question 1:", "1) "
      const qMatch = line.match(/^(\d+)[\.\)]\s*(.*)/i) || line.match(/^question\s*(\d+)[\:\.]\s*(.*)/i);
      if (qMatch) {
        if (currentQuestion) {
          parsedQuestions.push(finalizeFallbackQuestion(currentQuestion, pointsPerQuestion));
        }
        currentQuestion = {
          number: parseInt(qMatch[1], 10),
          stem: qMatch[2],
          options: [],
          rawLines: []
        };
      } else if (currentQuestion) {
        // Check for option formats like "I. ", "II. ", "A. ", "B. ", "a) ", "1. "
        const optMatch = line.match(/^([IVXLCDMivxlcdm]+|[A-Za-z]|\d+)[\.\)]\s*(.*)/);
        if (optMatch && optMatch[2]) {
          currentQuestion.options.push({
            id: `opt_${Date.now()}_${currentQuestion.options.length + 1}`,
            text: optMatch[2].trim()
          });
        } else {
          // Additional stem line or option description
          if (currentQuestion.options.length === 0) {
            currentQuestion.stem += ` ${line}`;
          } else {
            const lastOpt = currentQuestion.options[currentQuestion.options.length - 1];
            lastOpt.text += ` ${line}`;
          }
        }
      }
    }

    if (currentQuestion) {
      parsedQuestions.push(finalizeFallbackQuestion(currentQuestion, pointsPerQuestion));
    }

    // If no questions were parsed, create a default question structure from the text
    if (parsedQuestions.length === 0) {
      parsedQuestions.push({
        id: `q_${Date.now()}_1`,
        questionText: content.slice(0, 200).trim(),
        type: 'multiple_choice',
        options: [
          { id: `opt_1`, text: 'True' },
          { id: `opt_2`, text: 'False' }
        ],
        correctOptionId: 'opt_1',
        weight: pointsPerQuestion || 10,
        required: true,
        explanation: 'Review the lesson material for full scriptural context.',
        feedbackCorrect: 'Praise God! Correct answer.',
        feedbackIncorrect: 'Review the foundational scriptures from this lesson.'
      });
    }

    const totalPoints = parsedQuestions.reduce((sum, q) => sum + (Number(q.weight) || 0), 0);
    const shareCode = `qz_${Math.random().toString(36).substring(2, 8)}`;

    return res.json({
      success: true,
      evaluatedByAI: false,
      quiz: {
        id: `quiz_${Date.now()}`,
        title: lessonTitle || targetClassDay || "Ministry Assessment Quiz",
        courseCode: courseCode || "MIN-101",
        moduleTrack: moduleTrack || "Module 1: Scripture & Hermeneutics",
        description: "Interactive assessment generated from uploaded lesson material. Complete and submit all questions.",
        category: "Scripture Knowledge",
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        isPublished: true,
        shareCode,
        timeLimitMinutes: timeLimitMinutes || 30,
        totalPoints,
        questions: parsedQuestions,
        settings: {
          shuffleQuestions: false,
          shuffleOptions: false,
          showCorrectAnswers: true,
          showPointValues: true,
          showFeedback: true,
          passingScorePercentage: 75,
          allowMultipleAttempts: true,
          maxAttempts: 2,
          gradeReleasePolicy: "immediate",
          requireAllQuestionsAnswered: true,
          collectStudentEmail: true
        }
      }
    });
  } catch (err: any) {
    logger.error("Error generating quiz from content:", err);
    return res.status(500).json({ error: "Failed to generate quiz from questions." });
  }
});

function finalizeFallbackQuestion(q: any, defaultWeight: number) {
  const isMultiSelect = q.stem.toLowerCase().includes('select all') || 
    q.stem.toLowerCase().includes('attributes') || 
    q.stem.toLowerCase().includes('indicate the seven') ||
    q.stem.toLowerCase().includes('which of the following are');

  const isTrueFalse = q.options.length === 2 && 
    q.options.some((o: any) => o.text.toLowerCase() === 'true') && 
    q.options.some((o: any) => o.text.toLowerCase() === 'false');

  const qType = isMultiSelect ? 'checkboxes' : (isTrueFalse ? 'true_false' : (q.options.length > 0 ? 'multiple_choice' : 'short_answer'));

  const options = q.options.length > 0 ? q.options : (
    qType === 'true_false' ? [
      { id: `opt_${Date.now()}_t`, text: 'True' },
      { id: `opt_${Date.now()}_f`, text: 'False' }
    ] : [
      { id: `opt_${Date.now()}_1`, text: 'Option A' },
      { id: `opt_${Date.now()}_2`, text: 'Option B' }
    ]
  );

  let correctOptionId = options[0]?.id;
  let correctOptionIds = [options[0]?.id];

  // Specific biblical heuristic checks
  const stemLower = q.stem.toLowerCase();
  if (stemLower.includes('holy spirit') && !stemLower.includes('wrong way')) {
    const holySpiritOpt = options.find((o: any) => o.text.toLowerCase().includes('holy spirit'));
    if (holySpiritOpt) correctOptionId = holySpiritOpt.id;
  }
  if (stemLower.includes('wrong way') || stemLower.includes('not accomplish')) {
    const wrongOpt = options.find((o: any) => o.text.toLowerCase().includes('only') || o.text.toLowerCase().includes('problems'));
    if (wrongOpt) correctOptionId = wrongOpt.id;
  }
  if (stemLower.includes('main tool') && stemLower.includes('feed the believer')) {
    const wordOpt = options.find((o: any) => o.text.toLowerCase().includes('word of god'));
    if (wordOpt) correctOptionId = wordOpt.id;
  }

  if (isMultiSelect) {
    correctOptionIds = options.slice(0, Math.min(options.length, 7)).map((o: any) => o.id);
  }

  return {
    id: `q_${Date.now()}_${q.number || Math.random().toString(36).substring(2, 5)}`,
    questionText: q.stem.trim(),
    type: qType,
    options,
    correctOptionId,
    correctOptionIds,
    acceptableAnswers: [],
    weight: defaultWeight || 10,
    required: true,
    explanation: 'Biblical truth grounded in scripture teachings.',
    feedbackCorrect: 'Amen! That is the correct biblical answer.',
    feedbackIncorrect: 'Please review the lesson scripture references.'
  };
}
