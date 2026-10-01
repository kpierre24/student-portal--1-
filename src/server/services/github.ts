import { execFileSync } from "child_process";
import path from "path";
import fs from "fs";
import { logger } from "../../lib/logger";
import { isValidGitUrl } from "../middleware/security";

export function pullFromGithub(
  repoUrl: string = "https://github.com/kpierre24/School-of-Ministry-2026.git",
  targetDir: string = process.cwd()
): { success: boolean; message?: string; error?: string } {
  if (!isValidGitUrl(repoUrl)) {
    logger.warn(`Rejected invalid or untrusted GitHub repository URL: ${repoUrl}`);
    return {
      success: false,
      error: "Invalid repository URL format. Only verified GitHub HTTPS repository URLs are permitted."
    };
  }

  // Ensure local git remote origin is configured
  try {
    execFileSync("git", ["remote", "set-url", "origin", repoUrl], { cwd: targetDir, stdio: "pipe" });
  } catch {
    try {
      execFileSync("git", ["remote", "add", "origin", repoUrl], { cwd: targetDir, stdio: "pipe" });
    } catch {}
  }

  const tempDir = path.join("/tmp", `github_pull_${Date.now()}`);
  try {
    logger.info(`Cloning ${repoUrl} safely into temporary directory...`);
    // execFileSync passes arguments in an array preventing shell command injection
    execFileSync("git", ["clone", "--depth", "1", repoUrl, tempDir], { stdio: "pipe" });

    const copyRecursive = (src: string, dst: string) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        if ([".git", "node_modules", ".vite", "dist"].includes(entry.name)) continue;
        const srcPath = path.join(src, entry.name);
        const dstPath = path.join(dst, entry.name);
        if (entry.isDirectory()) {
          if (!fs.existsSync(dstPath)) {
            fs.mkdirSync(dstPath, { recursive: true });
          }
          copyRecursive(srcPath, dstPath);
        } else {
          fs.copyFileSync(srcPath, dstPath);
        }
      }
    };

    copyRecursive(tempDir, targetDir);
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Synchronize local git refs with remote origin
    try {
      execFileSync("git", ["fetch", "origin"], { cwd: targetDir, stdio: "pipe" });
    } catch {}

    logger.info("Successfully updated workspace from GitHub repository.");
    return { success: true, message: "Workspace successfully updated from GitHub repository." };
  } catch (err: any) {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    logger.error("Failed to pull from GitHub:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

export function pushToGithub(
  repoUrl: string = "https://github.com/kpierre24/School-of-Ministry-2026.git",
  token?: string,
  commitMessage: string = "new changes",
  targetDir: string = process.cwd()
): { success: boolean; message?: string; error?: string } {
  if (!isValidGitUrl(repoUrl)) {
    return {
      success: false,
      error: "Invalid repository URL format. Only verified GitHub HTTPS repository URLs are permitted."
    };
  }

  const gitEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "echo",
  };
  const execOpts = { cwd: targetDir, stdio: "pipe" as const, env: gitEnv };

  try {
    const effectiveToken = token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    const cleanToken = effectiveToken ? effectiveToken.trim() : "";

    // Ensure git committer details are configured
    try {
      execFileSync("git", ["config", "user.name", "HTEIM Admin"], execOpts);
      execFileSync("git", ["config", "user.email", "kpierre24@gmail.com"], execOpts);
    } catch {}

    // Ensure local changes are staged and committed
    try {
      execFileSync("git", ["add", "."], execOpts);
      execFileSync("git", ["commit", "-m", commitMessage], execOpts);
    } catch {
      // Already committed or no new changes
    }

    // Candidate URL auth formats for Fine-Grained & Classic PATs (prioritizing owner account kpierre24)
    const candidateUrls = cleanToken
      ? [
          repoUrl.replace("https://", `https://kpierre24:${cleanToken}@`),
          repoUrl.replace("https://", `https://${cleanToken}@`),
          repoUrl.replace("https://", `https://x-access-token:${cleanToken}@`),
          repoUrl.replace("https://", `https://oauth2:${cleanToken}@`),
        ]
      : [repoUrl];

    let lastError: any = null;
    let pushSuccess = false;

    for (const authUrl of candidateUrls) {
      try {
        try {
          execFileSync("git", ["remote", "set-url", "origin", authUrl], execOpts);
        } catch {
          execFileSync("git", ["remote", "add", "origin", authUrl], execOpts);
        }

        try {
          execFileSync("git", ["push", "-u", "origin", "main"], execOpts);
          pushSuccess = true;
          break;
        } catch (pushErr: any) {
          // If push was rejected due to non-fast-forward, try rebase pull then push, or force push
          try {
            execFileSync("git", ["pull", "--rebase", "origin", "main"], execOpts);
            execFileSync("git", ["push", "-u", "origin", "main"], execOpts);
            pushSuccess = true;
            break;
          } catch {
            execFileSync("git", ["push", "-u", "origin", "main", "--force"], execOpts);
            pushSuccess = true;
            break;
          }
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    // Always restore clean remote URL so secret token is not stored in git config
    try {
      execFileSync("git", ["remote", "set-url", "origin", repoUrl], execOpts);
    } catch {}

    if (pushSuccess) {
      logger.info("Successfully pushed changes to GitHub repository.");
      return { success: true, message: `Successfully pushed changes ("${commitMessage}") to GitHub repository!` };
    }

    const errorDetail = lastError?.stderr?.toString() || lastError?.message || String(lastError);
    logger.error("Failed to push to GitHub:", errorDetail);

    if (errorDetail.includes("could not read Username") || errorDetail.includes("Authentication failed") || errorDetail.includes("Invalid username or password")) {
      return {
        success: false,
        error: "GitHub Authentication Failed: Fine-grained token was rejected. Please verify the token has not expired and that 'Resource owner' is set to 'kpierre24'."
      };
    }
    if (errorDetail.includes("403") || errorDetail.includes("Permission to") || errorDetail.includes("write access")) {
      return {
        success: false,
        error: "GitHub Permission Denied (403): Your fine-grained token must have 'Repository permissions' -> 'Contents' set to 'Read and write' for School-of-Ministry-2026."
      };
    }
    return { success: false, error: errorDetail };
  } catch (err: any) {
    try {
      execFileSync("git", ["remote", "set-url", "origin", repoUrl], execOpts);
    } catch {}
    return { success: false, error: err?.stderr?.toString() || err?.message || String(err) };
  }
}
