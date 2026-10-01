import { Router, Request, Response } from "express";
import { attendanceService, validateAttendanceStatus } from "../services/domain";
import { requireAuth, requirePermission, requireResourceOwnership } from "../middleware/rbac";
import { logger } from "../../lib/logger";
import { validateBody } from "../middleware/validation";
import { 
  CheckinSchema, 
  BatchAttendanceSchema, 
  OverrideAttendanceSchema, 
  ExcuseAttendanceSchema 
} from "../schemas/attendance.schema";

export const attendanceRouter = Router();

// Default-deny at the router level: All routes require authentication
attendanceRouter.use(requireAuth);

/**
 * GET /api/attendance
 * Retrieves authoritative attendance records from relational tables.
 * RBAC: Requires attendance:read. Students only receive their own records.
 */
attendanceRouter.get(
  "/",
  requirePermission(["attendance:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const data = await attendanceService.getAttendance(user);

      return res.status(200).json({
        records: data.records,
        sessions: data.sessions,
        classDays: data.classDays,
        excusedAbsences: data.excusedAbsences,
        totalRecords: data.totalRecords,
        totalSessions: data.totalSessions,
        policyThreshold: data.policyThreshold,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error("GET /api/attendance error:", err);
      return res.status(500).json({ error: "Failed to fetch attendance records" });
    }
  }
);

/**
 * POST /api/attendance
 * Records single or batch attendance directly in relational PostgreSQL tables.
 * RBAC: Requires attendance:write
 */
attendanceRouter.post(
  "/",
  requireAuth,
  requirePermission(["attendance:write", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      // Handle batch records array
      if (Array.isArray(req.body?.records)) {
        const { date, records, sessionId, sessionTitle } = req.body;
        const result = await attendanceService.recordBatchAttendance(
          { date, records, sessionId, sessionTitle },
          actorUserId,
          actorRole
        );
        return res.status(200).json(result);
      }

      // Handle single check-in payload
      const { studentName, studentId, date, status, notes, studentEmail, sessionId, manualOverride } = req.body;
      if (!date || !status) {
        return res.status(400).json({ error: "date and status are required" });
      }

      const result = await attendanceService.recordCheckin(
        { studentName, studentId, date, status, notes, studentEmail, sessionId, manualOverride },
        actorUserId,
        actorRole
      );

      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("POST /api/attendance error:", err);
      return res.status(500).json({ error: err?.message || "Failed to record attendance" });
    }
  }
);

/**
 * PATCH /api/attendance/:id
 * Updates an individual attendance record by ID in relational PostgreSQL tables.
 * RBAC: Requires attendance:write
 */
attendanceRouter.patch(
  "/:id",
  requireAuth,
  requirePermission(["attendance:write", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { status, notes, manualOverride } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      const result = await attendanceService.updateAttendanceRecord(
        id,
        { status, notes, manualOverride },
        actorUserId,
        actorRole
      );

      return res.status(200).json(result);
    } catch (err: any) {
      logger.error(`PATCH /api/attendance/${req.params.id} error:`, err);
      return res.status(500).json({ error: err?.message || "Failed to update attendance record" });
    }
  }
);

/**
 * POST /api/attendance/checkin

 * Records student check-in status (PRESENT, ABSENT, LATE, EXCUSED) directly in PostgreSQL attendance table.
 * Strictly validates status enum; rejects arbitrary strings.
 * RBAC: Requires attendance:write.
 */
attendanceRouter.post(
  "/checkin",
  requireAuth,
  requirePermission(["attendance:write", "all:access"]),
  requireResourceOwnership({
    getTarget: (req) => ({
      targetStudentName: req.body.studentName,
      targetEmail: req.body.studentEmail,
      courseCode: req.body.courseCode || req.body.courseId || (req.query.courseCode as string),
    }),
    allowedRoles: ["super_admin", "admin", "registrar"],
  }),
  validateBody(CheckinSchema),
  async (req: Request, res: Response) => {
    try {
      const { studentName, studentId, date, status, notes, studentEmail, sessionId, manualOverride } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      const result = await attendanceService.recordCheckin(
        { studentName, studentId, date, status, notes, studentEmail, sessionId, manualOverride },
        actorUserId,
        actorRole
      );

      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("POST /api/attendance/checkin error:", err);
      return res.status(500).json({ error: err?.message || "Failed to record check-in" });
    }
  }
);

/**
 * POST /api/attendance/batch
 * Batch saves attendance records using non-destructive UPSERT inside a transaction.
 * Strictly validates status enum (PRESENT, ABSENT, LATE, EXCUSED) across all records.
 * Arbitrary strings are forbidden.
 * RBAC: Requires attendance:write
 */
attendanceRouter.post(
  "/batch",
  requireAuth,
  requirePermission(["attendance:write", "all:access"]),
  validateBody(BatchAttendanceSchema),
  async (req: Request, res: Response) => {
    try {
      const { date, records: incomingRecords, sessionId, sessionTitle } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;
      
      const result = await attendanceService.recordBatchAttendance(
        { date, records: incomingRecords, sessionId, sessionTitle },
        actorUserId,
        actorRole
      );
      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("POST /api/attendance/batch error:", err);
      return res.status(500).json({ error: err?.message || "Failed to batch save attendance" });
    }
  }
);

/**
 * POST /api/attendance/override
 * Overrides a student's attendance record with audit trail in relational table.
 * Strictly validates status enum (PRESENT, ABSENT, LATE, EXCUSED).
 * RBAC: Requires attendance:approve
 */
attendanceRouter.post(
  "/override",
  requireAuth,
  requirePermission(["attendance:approve", "all:access"]),
  validateBody(OverrideAttendanceSchema),
  async (req: Request, res: Response) => {
    try {
      const { studentName, studentId, date, status, reason, sessionId } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      if (!studentName || !date || !status) {
        return res.status(400).json({ error: "studentName, date, and status are required" });
      }

      // Enforce strict enum validation; reject arbitrary strings
      try {
        validateAttendanceStatus(status);
      } catch (valErr: any) {
        return res.status(400).json({ error: valErr.message });
      }

      const result = await attendanceService.recordCheckin(
        {
          studentName,
          studentId,
          date,
          sessionId,
          status,
          notes: reason ? `[Override by ${actorUserId}]: ${reason}` : "Administrative override",
          manualOverride: true,
        },
        actorUserId,
        actorRole
      );

      return res.status(200).json({
        status: "overridden",
        record: result.record,
      });
    } catch (err: any) {
      logger.error("POST /api/attendance/override error:", err);
      return res.status(500).json({ error: err?.message || "Failed to override attendance" });
    }
  }
);

/**
 * POST /api/attendance/excuse
 * Records or requests an excused absence in relational tables.
 */
attendanceRouter.post(
  "/excuse",
  requireAuth,
  requireResourceOwnership({
    getTarget: (req) => ({
      targetStudentName: req.body.studentName,
      targetStudentId: req.body.studentId,
      courseCode: req.body.courseCode || req.body.courseId || (req.query.courseCode as string),
    }),
    allowedRoles: ["super_admin", "admin", "registrar"],
  }),
  validateBody(ExcuseAttendanceSchema),
  async (req: Request, res: Response) => {
    try {
      const { studentName, studentId, date, reason, documentUrl } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      if ((!studentName && !studentId) || !date) {
        return res.status(400).json({ error: "studentId or studentName, and date are required" });
      }

      const result = await attendanceService.recordExcuse(
        { studentName, studentId, date, reason, documentUrl },
        actorUserId,
        actorRole
      );

      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("POST /api/attendance/excuse error:", err);
      return res.status(500).json({ error: "Failed to record excused absence" });
    }
  }
);

/**
 * GET /api/attendance/at-risk
 * Returns at-risk students failing the required 75% attendance policy threshold.
 * RBAC: Requires attendance:read
 */
attendanceRouter.get(
  "/at-risk",
  requirePermission(["attendance:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const result = await attendanceService.getAtRiskStudents(user);

      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("GET /api/attendance/at-risk error:", err);
      return res.status(500).json({ error: "Failed to evaluate at-risk attendance" });
    }
  }
);
