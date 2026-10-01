import { apiClient } from "./client";
import type { PullFromGithubResponse } from "./client";

export function pullFromGithub(repoUrl?: string): Promise<PullFromGithubResponse> {
  return apiClient<PullFromGithubResponse>("/api/github/pull-from-github", {
    method: "POST",
    body: JSON.stringify({ repoUrl: repoUrl || "https://github.com/kpierre24/School-of-Ministry-2026.git" }),
  });
}

export function pushToGithub(token?: string, commitMessage: string = "new changes", repoUrl?: string): Promise<PullFromGithubResponse> {
  return apiClient<PullFromGithubResponse>("/api/github/push-to-github", {
    method: "POST",
    body: JSON.stringify({
      repoUrl: repoUrl || "https://github.com/kpierre24/School-of-Ministry-2026.git",
      token,
      commitMessage
    }),
  });
}
