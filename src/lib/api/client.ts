export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface ApiClientOptions {
  baseUrl?: string;
}

export interface PullFromGithubResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface EvaluateLessonResponse {
  success: boolean;
  evaluatedByAI?: boolean;
  summary: string;
  courseCode: string;
  category: string;
  keyTakeaways: string[];
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  { baseUrl = "" }: ApiClientOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true, data: data as T };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network request failed",
    };
  }
}
