import { Router, Request, Response } from "express";
import { getAuditLogs } from "../services/supabaseServer";
import { requireAuth, requirePermission } from "../middleware/rbac";
import { logger } from "../../lib/logger";

export const auditLogsRouter = Router();

// 1. Router-level default-deny: All audit routes require authentication
auditLogsRouter.use(requireAuth);

/**
 * GET /api/audit-logs
 * Retrieves authoritative audit history log entries from PostgreSQL.
 * RBAC: Requires authenticated user with 'audit:read' permission (or super_admin).
 */
auditLogsRouter.get(
  "/",
  requirePermission("audit:read"),
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt((req.query.limit as string) || "50", 10);
      const entityType = (req.query.entityType as string) || undefined;

      const logs = await getAuditLogs(limit, entityType);
      return res.status(200).json({
        logs,
        count: logs.length,
      });
    } catch (err: any) {
      logger.error("GET /api/audit-logs error:", err);
      return res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  }
);

/**
 * POST /api/audit-logs
 * Disallow manual external creation of audit log entries.
 * Audit logs are strictly emitted server-side by authoritative backend service handlers.
 */
auditLogsRouter.post("/", (_req: Request, res: Response) => {
  return res.status(405).json({
    error: "Method Not Allowed: Audit log entries are generated authoritatively by server-side actions only and cannot be manually inserted.",
    code: "AUDIT_MUTATION_RESTRICTED"
  });
});

