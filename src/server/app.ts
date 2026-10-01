import express, { Express, Request, Response } from "express";
import { githubRouter } from "./routes/github";
import { aiRouter } from "./routes/ai";
import { driveProxyRouter } from "./routes/driveProxy";
import { bibleRouter } from "./routes/bible";
import { authRouter } from "./routes/auth";
import { studentsRouter } from "./routes/students";
import { academicsRouter } from "./routes/academics";
import { attendanceRouter } from "./routes/attendance";
import { paymentsRouter } from "./routes/payments";
import { libraryRouter } from "./routes/library";
import { assignmentsRouter } from "./routes/assignments";
import { gradesRouter } from "./routes/grades";
import { invoicesRouter } from "./routes/invoices";
import { auditLogsRouter } from "./routes/auditLogs";
import { stateRouter } from "./routes/state";
import { meRouter } from "./routes/me";
import { notificationsRouter } from "./routes/notifications";
import { whatsappRouter } from "./routes/whatsapp";
import {
  securityHeaders,
  sanitizeBody,
  generalApiRateLimiter,
  authRateLimiter,
  aiRateLimiter,
  paymentsRateLimiter,
  assignmentsRateLimiter,
  driveProxyRateLimiter,
  adminRateLimiter,
  stateRateLimiter,
  githubRateLimiter,
} from "./middleware/security";
import { authenticate, requireAuth } from "./middleware/rbac";

export function createApp(): Express {
  const app = express();
  app.set("trust proxy", 1);

  // Apply security response headers globally
  app.use(securityHeaders);

  // Health check routes
  const healthResponse = (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      service: "hteim-school-of-ministry",
      timestamp: new Date().toISOString(),
    });
  };

  app.get("/api/health", healthResponse);
  app.get("/health", healthResponse);
  app.get("/healthz", healthResponse);
  app.get("/_health", healthResponse);
  app.get("/livez", healthResponse);
  app.get("/readyz", healthResponse);
  app.get("/ping", (_req, res) => res.status(200).send("pong"));

  // Limit payload size to prevent payload bombing attacks
  app.use(express.json({ limit: "15mb" }));

  // Sanitize incoming JSON bodies
  app.use(sanitizeBody);

  // General API rate limiting (can be skipped or bypassed in tests)
  if (process.env.NODE_ENV !== "test") {
    app.use("/api", generalApiRateLimiter);
  }

  // Authentication context
  app.use("/api", authenticate);

  // Public routes
  app.use("/api/auth", authRateLimiter, authRouter);
  app.use("/api/bible", bibleRouter);

  // Protected Domain API Routers
  app.use("/api/students", requireAuth, studentsRouter);
  app.use("/api/academics", requireAuth, academicsRouter);
  app.use("/api/attendance", requireAuth, attendanceRouter);
  app.use("/api/payments", requireAuth, paymentsRateLimiter, paymentsRouter);
  app.use("/api/invoices", requireAuth, paymentsRateLimiter, invoicesRouter);
  app.use("/api/library", requireAuth, libraryRouter);
  app.use("/api/assignments", requireAuth, assignmentsRateLimiter, assignmentsRouter);
  app.use("/api/grades", requireAuth, assignmentsRateLimiter, gradesRouter);
  app.use("/api/audit-logs", requireAuth, adminRateLimiter, auditLogsRouter);

  app.use("/api/state", requireAuth, stateRateLimiter, stateRouter);
  app.use("/api/me", requireAuth, meRouter);
  app.use("/api/notifications", requireAuth, notificationsRouter);
  app.use("/api/whatsapp", requireAuth, whatsappRouter);
  app.use("/api/github", requireAuth, githubRateLimiter, githubRouter);
  app.use("/api/ai", requireAuth, aiRateLimiter, aiRouter);
  app.use("/api/drive-proxy", driveProxyRateLimiter, driveProxyRouter);

  return app;
}
