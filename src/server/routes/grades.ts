import { Router, Request, Response } from "express";
import { assignmentsService } from "../services/domain";
import { requireAuth, requirePermission, requireResourceOwnership } from "../middleware/rbac";
import { logger } from "../../lib/logger";

export const gradesRouter = Router();


// Default-deny at the router level: All routes require authentication
gradesRouter.use(requireAuth);

/**
 * GET /api/grades
 * Retrieves grades from relational submissions/grades table.
 * RBAC: Requires grades:read
 */
gradesRouter.get(
  "/",
  requirePermission(["grades:read", "assignments:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const studentId = (req.query.studentId as string) || undefined;
      const studentName = (req.query.studentName as string) || undefined;
      const assignmentId = (req.query.assignmentId as string) || undefined;

      const result = await assignmentsService.getSubmissions({ studentId, studentName, assignmentId }, user);

      return res.status(200).json({
        grades: result.submissions,
        rubricScores: result.rubricScores,
        count: result.count,
      });
    } catch (err: any) {
      logger.error("GET /api/grades error:", err);
      return res.status(500).json({ error: "Failed to fetch grades" });
    }
  }
);

/**
 * POST /api/grades
 * Records faculty grade directly into relational grades table.
 * Validates score bounds, lecturer course authorization, and grade locking.
 * RBAC: Requires grades:write
 */
gradesRouter.post(
  "/",
  requirePermission(["grades:write", "assignments:grade", "all:access"]),
  requireResourceOwnership({
    getTarget: (req) => ({
      courseCode: req.body.courseCode,
    }),
    allowedRoles: ["super_admin", "admin", "registrar"],
  }),
  async (req: Request, res: Response) => {
    try {
      const { submissionId, assignmentId, studentId, score, feedback, rubricScores, overrideReason } = req.body;
      const actorUser = req.user!;

      const staffRoles = ["super_admin", "admin", "registrar", "lecturer", "teacher"];
      if (!staffRoles.includes(actorUser.role)) {
        return res.status(403).json({ error: "Access denied: Only faculty and lecturers can record grades" });
      }

      if (!submissionId) {
        return res.status(400).json({ error: "submissionId is required" });
      }

      const result = await assignmentsService.gradeSubmission(
        { submissionId, assignmentId, studentId, score: Number(score), feedback, rubricScores, overrideReason },
        actorUser
      );

      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("POST /api/grades error:", err);
      const isLockedErr = err.message?.includes("LOCKED");
      const statusCode = isLockedErr ? 403 : err.message?.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ error: err.message || "Failed to record grade" });
    }
  }
);

/**
 * PATCH /api/grades/:id
 * Updates an existing grade score/feedback in relational tables.
 */
gradesRouter.patch(
  "/:id",
  requirePermission(["grades:write", "assignments:grade", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const submissionId = req.params.id;
      const { score, feedback, rubricScores, overrideReason } = req.body;
      const actorUser = req.user!;

      const result = await assignmentsService.gradeSubmission(
        { submissionId, score: score !== undefined ? Number(score) : undefined as any, feedback, rubricScores, overrideReason },
        actorUser
      );

      return res.status(200).json(result);
    } catch (err: any) {
      logger.error(`PATCH /api/grades/${req.params.id} error:`, err);
      return res.status(400).json({ error: err.message || "Failed to update grade" });
    }
  }
);

/**
 * POST /api/grades/transition
 * Transitions a grade lifecycle: SUBMITTED -> GRADED -> MODERATION -> RELEASED -> LOCKED
 */
gradesRouter.post(
  "/transition",
  requirePermission(["grades:write", "assignments:grade", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const { submissionId, targetStatus, reason } = req.body;
      const actorUser = req.user!;

      if (!submissionId || !targetStatus) {
        return res.status(400).json({ error: "submissionId and targetStatus are required" });
      }

      const result = await assignmentsService.transitionGradeLifecycle(
        { submissionId, targetStatus, reason },
        actorUser
      );

      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("POST /api/grades/transition error:", err);
      const statusCode = err.message?.includes("Access denied") ? 403 : err.message?.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ error: err.message || "Failed to transition grade lifecycle" });
    }
  }
);

/**
 * POST /api/grades/override
 * Elevated administrative grade override for locked records (Registrar / Admin).
 */
gradesRouter.post(
  "/override",
  requirePermission(["grades:write", "grades:release", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const { submissionId, score, feedback, reason } = req.body;
      const actorUser = req.user!;

      const elevatedRoles = ["super_admin", "admin", "registrar"];
      if (!elevatedRoles.includes(actorUser.role)) {
        return res.status(403).json({ error: "Access denied: Only Registrar or Admin can approve grade overrides for locked records." });
      }

      if (!submissionId || score === undefined || !reason) {
        return res.status(400).json({ error: "submissionId, score, and explicit reason are required for an administrative override." });
      }

      const result = await assignmentsService.overrideLockedGrade(
        { submissionId, score: Number(score), feedback, reason },
        actorUser
      );

      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("POST /api/grades/override error:", err);
      const statusCode = err.message?.includes("Access denied") ? 403 : 400;
      return res.status(statusCode).json({ error: err.message || "Failed to perform administrative grade override" });
    }
  }
);
