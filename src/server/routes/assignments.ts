import { Router, Request, Response } from "express";
import { assignmentsService } from "../services/domain";
import { requireAuth, requirePermission, requireResourceOwnership } from "../middleware/rbac";
import { logger } from "../../lib/logger";

export const assignmentsRouter = Router();

/**
 * PUBLIC / EXTERNAL QUIZ ROUTES (No authentication required)
 * Allows external users outside the portal to access a shared quiz and submit their responses.
 */

/**
 * GET /api/assignments/public/quiz/:shareCode
 * Fetches public quiz details by share code or assignment ID.
 */
assignmentsRouter.get("/public/quiz/:shareCode", async (req: Request, res: Response) => {
  try {
    const { shareCode } = req.params;
    if (!shareCode) {
      return res.status(400).json({ error: "Share code parameter is required" });
    }

    const result = await assignmentsService.getPublicQuiz(shareCode);

    if (!result || result.isNotFound || !result.quiz) {
      return res.status(404).json({ error: result?.message || "Quiz not found or link is invalid" });
    }

    if (result.isUnpublished) {
      return res.status(403).json({ error: result.message || "This quiz is currently unpublished or revoked by the instructor." });
    }

    if (result.isExpired) {
      return res.status(410).json({ error: result.message || "This quiz has expired and is no longer accepting responses." });
    }

    return res.status(200).json({ quiz: result.quiz });
  } catch (err: any) {
    logger.error(`GET /api/assignments/public/quiz/${req.params.shareCode} error:`, err);
    return res.status(500).json({ error: "Failed to fetch public quiz" });
  }
});

/**
 * GET /api/assignments/public/quiz/:shareCode/attempts
 * Retrieves registered attempt progress / responses for live teacher monitoring.
 */
assignmentsRouter.get("/public/quiz/:shareCode/attempts", async (req: Request, res: Response) => {
  try {
    const { shareCode } = req.params;
    const attempts = await assignmentsService.getQuizAttempts(shareCode);
    return res.json({ attempts });
  } catch (err: any) {
    logger.error(`GET /api/assignments/public/quiz/${req.params.shareCode}/attempts error:`, err);
    return res.status(500).json({ error: err?.message || "Failed to fetch quiz attempts" });
  }
});

/**
 * POST /api/assignments/public/quiz/:shareCode/attempts
 * Registers a new server-side quiz attempt before answering starts.
 */
assignmentsRouter.post("/public/quiz/:shareCode/attempts", async (req: Request, res: Response) => {
  try {
    const { shareCode } = req.params;
    const { studentName, studentEmail } = req.body || {};
    const result = await assignmentsService.createQuizAttempt(shareCode, {
      studentName: studentName || 'Student',
      studentEmail: studentEmail || ''
    });
    return res.status(201).json(result);
  } catch (err: any) {
    logger.error(`POST /api/assignments/public/quiz/${req.params.shareCode}/attempts error:`, err);
    return res.status(400).json({ error: err?.message || "Failed to create quiz attempt" });
  }
});

/**
 * PATCH /api/assignments/public/quiz/:shareCode/attempts/:attemptId/responses
 * Server autosave endpoint for student draft responses during a quiz attempt.
 */
assignmentsRouter.patch("/public/quiz/:shareCode/attempts/:attemptId/responses", async (req: Request, res: Response) => {
  try {
    const { shareCode, attemptId } = req.params;
    const { responses, timeSpentSeconds } = req.body || {};
    const result = await assignmentsService.autosaveQuizAttemptResponses(shareCode, attemptId, {
      responses: responses || {},
      timeSpentSeconds: Number(timeSpentSeconds) || 0
    });
    return res.json(result);
  } catch (err: any) {
    logger.error(`PATCH /api/assignments/public/quiz/${req.params.shareCode}/attempts/${req.params.attemptId}/responses error:`, err);
    return res.status(400).json({ error: err?.message || "Failed to autosave quiz attempt responses" });
  }
});

/**
 * POST /api/assignments/public/quiz/:shareCode/submit
 * Captures quiz responses submitted by external/public users.
 */
assignmentsRouter.post("/public/quiz/:shareCode/submit", async (req: Request, res: Response) => {
  try {
    const { shareCode } = req.params;
    const { studentName, studentEmail, responses, timeSpentSeconds, quizId } = req.body || {};

    if (!studentName || typeof studentName !== "string" || !studentName.trim() || studentName.trim().length < 2) {
      return res.status(400).json({ error: "A valid Student Name (at least 2 characters) is required to submit this assessment." });
    }

    if (!responses || typeof responses !== "object" || Array.isArray(responses)) {
      return res.status(400).json({ error: "Invalid quiz responses format." });
    }

    const submission = await assignmentsService.submitPublicQuizResponse(
      shareCode || quizId,
      {
        ...req.body,
        studentName: studentName.trim(),
        studentEmail: studentEmail?.trim() || "",
        responses,
        timeSpentSeconds: Number(timeSpentSeconds) || 0,
      }
    );

    return res.status(201).json({ submission, success: true });
  } catch (err: any) {
    logger.error(`POST /api/assignments/public/quiz/${req.params.shareCode}/submit error:`, err);
    const status = err?.message?.includes('not found') ? 404 : err?.message?.includes('unpublished') || err?.message?.includes('expired') || err?.message?.includes('Duplicate') || err?.message?.includes('Multiple attempts') ? 400 : 500;
    return res.status(status).json({ error: err?.message || "Failed to submit public quiz response" });
  }
});

// Default-deny at the router level: All routes below require authentication
assignmentsRouter.use(requireAuth);

/**
 * GET /api/assignments
 * Retrieves assignments from relational assignments table.
 * RBAC: Requires assignments:read
 */
assignmentsRouter.get(
  "/",
  requirePermission(["assignments:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const result = await assignmentsService.getAssignments(user);

      return res.status(200).json({
        assignments: result.assignments,
        count: result.count,
      });
    } catch (err: any) {
      logger.error("GET /api/assignments error:", err);
      return res.status(500).json({ error: "Failed to fetch assignments" });
    }
  }
);

/**
 * POST /api/assignments
 * Creates a new assignment directly in relational assignments table.
 * RBAC: Requires assignments:write
 */
assignmentsRouter.post(
  "/",
  requireAuth,
  requirePermission(["assignments:grade", "grades:write", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { title, description, courseCode, courseId, dueDate, dueAt, maxScore, maxPoints, weight, isPublished, rubric, shareCode, quizData, questions, settings } = req.body;

      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Assignment title is required" });
      }

      const result = await assignmentsService.createAssignment(
        { title, description, courseCode, courseId, dueDate, dueAt, maxScore, maxPoints, weight, isPublished, rubric, shareCode, quizData, questions, settings } as any,
        user
      );

      return res.status(201).json(result);
    } catch (err: any) {
      logger.error("POST /api/assignments error:", err);
      return res.status(500).json({ error: err?.message || "Failed to create assignment" });
    }
  }
);

/**
 * PATCH /api/assignments/:id
 * Updates an assignment directly in relational assignments table.
 * RBAC: Requires assignments:grade / grades:write
 */
assignmentsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission(["assignments:grade", "grades:write", "all:access"]),
  async (req: Request, res: Response) => {

    try {
      const user = req.user!;
      const id = req.params.id;
      const { title, description, courseCode, dueDate, dueAt, maxScore, maxPoints, weight, isPublished, rubric } = req.body;

      const result = await assignmentsService.updateAssignment(
        id,
        { title, description, courseCode, dueDate, dueAt, maxScore, maxPoints, weight, isPublished, rubric },
        user
      );

      return res.status(200).json(result);
    } catch (err: any) {
      logger.error(`PATCH /api/assignments/${req.params.id} error:`, err);
      return res.status(500).json({ error: err?.message || "Failed to update assignment" });
    }
  }
);

/**
 * DELETE /api/assignments/:id
 * Deletes an assignment directly from relational assignments table.
 * RBAC: Requires assignments:grade / grades:write / all:access
 */
assignmentsRouter.delete(
  "/:id",
  requireAuth,
  requirePermission(["assignments:grade", "grades:write", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const id = req.params.id;

      const result = await assignmentsService.deleteAssignment(id, user);
      return res.status(200).json(result);
    } catch (err: any) {
      logger.error(`DELETE /api/assignments/${req.params.id} error:`, err);
      return res.status(500).json({ error: err?.message || "Failed to delete assignment" });
    }
  }
);

/**
 * GET /api/assignments/submissions

 * Retrieves student submissions and rubric grades from relational tables.
 * RBAC: Requires assignments:read or grades:read. Students only retrieve their own submissions.
 */
assignmentsRouter.get(
  "/submissions",
  requirePermission(["assignments:read", "grades:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const studentId = (req.query.studentId as string) || undefined;
      const studentName = (req.query.studentName as string) || undefined;
      const assignmentId = (req.query.assignmentId as string) || undefined;

      const result = await assignmentsService.getSubmissions({ studentId, studentName, assignmentId }, user);

      return res.status(200).json({
        submissions: result.submissions,
        rubricScores: result.rubricScores,
        count: result.count,
      });
    } catch (err: any) {
      logger.error("GET /api/assignments/submissions error:", err);
      return res.status(500).json({ error: "Failed to fetch submissions" });
    }
  }
);

/**
 * POST /api/assignments/:id/submissions
 * 9.1: Submits work for an assignment with studentId derived strictly from req.user context.
 * 9.2: Validates assignment existence, course membership, enrollment, publication status, and submission window.
 * 9.3: Strips grade fields and forces status='submitted' to prevent grade manipulation.
 */
assignmentsRouter.post(
  "/:id/submissions",
  requireAuth,
  requirePermission(["assignments:submit", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const assignmentId = req.params.id;
      const user = req.user!;
      const payload = req.body || {};

      if (!assignmentId) {
        return res.status(400).json({ error: "assignmentId parameter is required" });
      }

      const result = await assignmentsService.submitAssignmentForUser(
        assignmentId,
        payload,
        user
      );

      return res.status(201).json(result);
    } catch (err: any) {
      logger.error(`POST /api/assignments/${req.params.id}/submissions error:`, err);
      const statusCode = err.message?.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ error: err.message || "Failed to submit assignment" });
    }
  }
);

/**
 * POST /api/assignments/submit
 * Legacy submit endpoint enforcing identical server-derived student identity and sanitization rules.
 */
assignmentsRouter.post(
  "/submit",
  requireAuth,
  requirePermission(["assignments:submit", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const submission = req.body?.submission || req.body || {};
      const assignmentId = submission.assignmentId || req.body?.assignmentId;

      if (!assignmentId) {
        return res.status(400).json({ error: "assignmentId is required" });
      }

      const result = await assignmentsService.submitAssignmentForUser(
        assignmentId,
        submission,
        user
      );

      return res.status(201).json(result);
    } catch (err: any) {
      logger.error("POST /api/assignments/submit error:", err);
      const statusCode = err.message?.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ error: err.message || "Failed to submit assignment" });
    }
  }
);

/**
 * POST /api/assignments/grade
 * 9.4: Records teacher grading verifying lecturer -> course -> assignment -> submission chain.
 * 9.5: Validates score bounds (0 <= score <= maxScore).
 * Phase 10: Enforces grade locking rules.
 */
assignmentsRouter.post(
  "/grade",
  requireAuth,
  requirePermission(["assignments:grade", "grades:write", "all:access"]),
  requireResourceOwnership({
    getTarget: (req) => ({
      courseCode: req.body.courseCode, // Assumes frontend sends courseCode for verification
    }),
    allowedRoles: ["super_admin", "admin", "registrar"],
  }),
  async (req: Request, res: Response) => {
    try {
      const { submissionId, assignmentId, studentId, score, feedback, rubricScores, overrideReason, courseCode } = req.body;
      const actorUser = req.user!;

      // 9.4 Staff check
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
      logger.error("POST /api/assignments/grade error:", err);
      const isLockedErr = err.message?.includes("LOCKED");
      const statusCode = isLockedErr ? 403 : err.message?.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ error: err.message || "Failed to record grade" });
    }
  }
);

/**
 * POST /api/assignments/grade/transition
 * Phase 10: Transitions a grade through its controlled lifecycle:
 * SUBMITTED -> GRADED -> MODERATION -> RELEASED -> LOCKED
 */
assignmentsRouter.post(
  "/grade/transition",
  requireAuth,
  requirePermission(["assignments:grade", "grades:write", "all:access"]),
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
      logger.error("POST /api/assignments/grade/transition error:", err);
      const isDenied = err.message?.includes("Access denied");
      const statusCode = isDenied ? 403 : err.message?.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ error: err.message || "Failed to transition grade lifecycle" });
    }
  }
);

/**
 * POST /api/assignments/grade/override
 * Phase 10: Elevated administrative override for locked grades (Registrar/Admin only).
 */
assignmentsRouter.post(
  "/grade/override",
  requireAuth,
  requirePermission(["grades:write", "all:access"]),
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
      logger.error("POST /api/assignments/grade/override error:", err);
      const statusCode = err.message?.includes("Access denied") ? 403 : 400;
      return res.status(statusCode).json({ error: err.message || "Failed to perform administrative grade override" });
    }
  }
);

/**
 * GET /api/assignments/reconciliation
 * Retrieves data integrity and assessment diagnostics report.
 */
assignmentsRouter.get(
  "/reconciliation",
  requireAuth,
  requirePermission(["assignments:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const actorUser = req.user!;
      const allowedRoles = ["super_admin", "admin", "teacher", "lecturer", "registrar"];
      if (!allowedRoles.includes(actorUser.role)) {
        return res.status(403).json({ error: "Access denied: Staff clearance required." });
      }

      const diagnostics = await assignmentsService.getReconciliationDiagnostics();
      return res.status(200).json(diagnostics);
    } catch (err: any) {
      logger.error("GET /api/assignments/reconciliation error:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch reconciliation diagnostics" });
    }
  }
);

/**
 * POST /api/assignments/reconciliation/repair
 * Runs selected automated reconciliation repairs.
 */
assignmentsRouter.post(
  "/reconciliation/repair",
  requireAuth,
  requirePermission(["grades:write", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const { repairTypes } = req.body;
      const actorUser = req.user!;
      const allowedRoles = ["super_admin", "admin", "teacher", "lecturer", "registrar"];
      if (!allowedRoles.includes(actorUser.role)) {
        return res.status(403).json({ error: "Access denied: Staff clearance required." });
      }

      if (!Array.isArray(repairTypes) || repairTypes.length === 0) {
        return res.status(400).json({ error: "repairTypes must be a non-empty array of strings." });
      }

      const result = await assignmentsService.runReconciliationRepairs(repairTypes, actorUser);
      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("POST /api/assignments/reconciliation/repair error:", err);
      return res.status(500).json({ error: err.message || "Failed to execute reconciliation repairs" });
    }
  }
);

