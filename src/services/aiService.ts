/**
 * ============================================================================
 * CLIENT AI SERVICE
 * HTEIM School of Ministry
 * ============================================================================
 * Provides client-side methods to invoke server-side proxied Gemini AI
 * capabilities for lesson evaluation, document summarization, and grading.
 */

import { handleError } from '../lib/errorHandler';

export interface LessonEvaluationRequest {
  title: string;
  content?: string;
  author?: string;
  courseCode?: string;
  fileName?: string;
}

export interface LessonEvaluationResponse {
  success: boolean;
  evaluatedByAI: boolean;
  summary: string;
  category: string;
  keyTakeaways: string[];
  courseCode: string;
}

/**
 * Invokes the server-side proxied Gemini API to evaluate and summarize lesson materials.
 */
export async function evaluateLessonMaterial(
  payload: LessonEvaluationRequest
): Promise<LessonEvaluationResponse> {
  try {
    const res = await fetch('/api/ai/evaluate-lesson', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`AI evaluation server request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    // Log AI failure for developer diagnostics without throwing to break student/teacher workflows
    handleError(err, 'evaluateLessonMaterial - proxied Gemini API failure', 'ai');

    // Graceful fallback heuristics if server request fails
    return {
      success: true,
      evaluatedByAI: false,
      summary: payload.content && payload.content.length > 30
        ? `Lesson overview covering key ministerial principles: "${payload.content.slice(0, 140).trim()}..."`
        : `Comprehensive lesson material titled "${payload.title || 'Ministry Lesson'}" structured for the School of Ministry.`,
      category: 'Lecture Notes',
      keyTakeaways: [
        `Grasp foundational kingdom concepts presented in ${payload.title || 'this lesson'}.`,
        'Apply scripture memory and biblical exegesis to practical ministry.',
        'Integrate leadership ethics and doctrine into pastoral service.',
      ],
      courseCode: payload.courseCode || 'SOM-CORE',
    };
  }
}
