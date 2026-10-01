import { apiClient } from "./client";
import type { ApiResponse, EvaluateLessonResponse } from "./client";

export function evaluateLesson(
  payload: {
    title?: string;
    content?: string;
    author?: string;
    courseCode?: string;
    fileName?: string;
  }
): Promise<ApiResponse<EvaluateLessonResponse>> {
  return apiClient<EvaluateLessonResponse>("/api/ai/evaluate-lesson", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
