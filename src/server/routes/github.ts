import { Router } from "express";
import { pullFromGithub, pushToGithub } from "../services/github";
import { requireAuth, requirePermission } from "../middleware/rbac";

export const githubRouter = Router();

// Default-deny at the router level: All GitHub operations require authentication
githubRouter.use(requireAuth);

githubRouter.post(
  "/pull-from-github",
  requirePermission(["roles:manage", "all:access"]),
  (req, res) => {
    const repoUrl = req.body?.repoUrl || "https://github.com/kpierre24/School-of-Ministry-2026.git";
    const result = pullFromGithub(repoUrl);
    if (result.success) {
      return res.json(result);
    }
    return res.status(500).json(result);
  }
);

githubRouter.post(
  "/push-to-github",
  requirePermission(["roles:manage", "all:access"]),
  (req, res) => {
    const repoUrl = req.body?.repoUrl || "https://github.com/kpierre24/School-of-Ministry-2026.git";
    const token = req.body?.token || req.body?.githubToken;
    const commitMessage = req.body?.commitMessage || "new changes";
    const result = pushToGithub(repoUrl, token, commitMessage);
    if (result.success) {
      return res.json(result);
    }
    return res.status(500).json(result);
  }
);
