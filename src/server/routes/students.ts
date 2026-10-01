import { Router, Request, Response } from "express";
import { studentsService, attendanceService, assignmentsService, financeService } from "../services/domain";
import { requireAuth, requirePermission, requireResourceOwnership } from "../middleware/rbac";
import { logger } from "../../lib/logger";

export const studentsRouter = Router();

// Default-deny at the router level: All routes require authentication
studentsRouter.use(requireAuth);

/**
 * GET /api/students
 * Returns authoritative student roster directly from relational PostgreSQL domain data.
 * RBAC Rule: Super Admin, Admin, Registrar, Lecturer, Finance Officer see full directory.
 * Students only receive their own profile record.
 */
studentsRouter.get(
  "/",
  requirePermission(["students:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const staffRoles = ["super_admin", "admin", "registrar", "lecturer", "teacher", "finance_officer"];
      if (!staffRoles.includes(user.role)) {
        return res.status(403).json({
          error: "Access denied: Student directory is restricted to authorized staff. Use /api/me endpoints to retrieve personal student data.",
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
      const search = req.query.search as string | undefined;
      const cohortLevel = req.query.cohortLevel as string | undefined;
      const enrollmentStatus = req.query.enrollmentStatus as string | undefined;
      const studentId = req.query.studentId as string | undefined;

      const result = await studentsService.getStudents(user, {
        limit,
        offset,
        search,
        cohortLevel,
        enrollmentStatus,
        studentId,
      });

      return res.status(200).json({
        students: result.students,
        total: result.total,
        atRiskCount: result.atRiskCount,
        threshold: "75%",
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error("GET /api/students error:", err);
      return res.status(500).json({ error: "Failed to fetch student directory" });
    }
  }
);

/**
 * GET /api/students/:name/grades
 * Explicit Grade & Academic Performance Endpoint queried from relational domain tables.
 */
studentsRouter.get(
  "/:name/grades",
  requireAuth,
  requirePermission(["grades:read", "all:access"]),
  requireResourceOwnership({
    getTarget: (req) => ({
      targetStudentName: decodeURIComponent(req.params.name).trim(),
      targetStudentId: req.params.name,
      courseCode: (req.query.courseCode as string) || (req.query.course as string) || (req.body?.courseCode as string),
    }),
    allowedRoles: ["super_admin", "admin", "registrar"],
  }),
  async (req: Request, res: Response) => {
    try {
      const studentName = decodeURIComponent(req.params.name).trim();
      const subResult = await assignmentsService.getSubmissions({ studentName }, req.user);

      const submissions = subResult.submissions || [];
      let totalGrade = 0;
      let gradedCount = 0;
      for (const s of submissions) {
        if (typeof s.score === "number" || typeof s.grade === "number") {
          totalGrade += s.score ?? s.grade;
          gradedCount++;
        }
      }
      const gpaPercent = gradedCount > 0 ? Math.round(totalGrade / gradedCount) : null;
      const honorRoll = gpaPercent !== null ? gpaPercent >= 85 : false;
      const standing = gpaPercent === null
        ? "Not Yet Graded"
        : honorRoll
          ? "High Distinction"
          : gpaPercent >= 75
            ? "Satisfactory"
            : "At-Risk";

      return res.status(200).json({
        studentName,
        averageGrade: gpaPercent,
        honorRoll,
        standing,
        submissions,
        rubricScores: subResult.rubricScores?.[studentName] || null,
        authorizedRequester: {
          email: req.user?.email,
          role: req.user?.role,
        },
      });
    } catch (err: any) {
      logger.error("GET /api/students/:name/grades error:", err);
      return res.status(500).json({ error: "Failed to fetch student grades" });
    }
  }
);

/**
 * GET /api/students/:name/attendance
 * Explicit Student Attendance Endpoint queried from relational attendance records.
 */
studentsRouter.get(
  "/:name/attendance",
  requireAuth,
  requirePermission(["attendance:read", "all:access"]),
  requireResourceOwnership({
    getTarget: (req) => ({
      targetStudentName: decodeURIComponent(req.params.name).trim(),
      targetStudentId: req.params.name,
      courseCode: (req.query.courseCode as string) || (req.query.course as string) || (req.body?.courseCode as string),
    }),
    allowedRoles: ["super_admin", "admin", "registrar"],
  }),
  async (req: Request, res: Response) => {
    try {
      const studentName = decodeURIComponent(req.params.name).trim();
      const attData = await attendanceService.getAttendance(req.user);
      const norm = studentName.toLowerCase().trim();

      const studentRecords = (attData.records || []).filter(
        (r: any) => (r.student?.name || "").toLowerCase().trim() === norm
      );

      const totalSessions = attData.totalSessions || Math.max(studentRecords.length, 1);
      const presentCount = studentRecords.filter((r: any) => {
        const s = (r.status || "").toLowerCase();
        return s === "present" || s === "p" || s === "1" || s === "attended";
      }).length;
      const excusedCount = studentRecords.filter((r: any) => {
        const s = (r.status || "").toLowerCase();
        return s === "excused" || s === "e";
      }).length;

      const rate = totalSessions > 0 ? Math.round(((presentCount + excusedCount) / totalSessions) * 100) : 100;

      return res.status(200).json({
        studentName,
        totalSessions,
        presentCount,
        excusedCount,
        attendanceRate: rate,
        isAtRisk: rate < 75,
        records: studentRecords,
      });
    } catch (err: any) {
      logger.error("GET /api/students/:name/attendance error:", err);
      return res.status(500).json({ error: "Failed to fetch attendance history" });
    }
  }
);

/**
 * GET /api/students/:name/financial-profile
 * Explicit Student Financial Ledger Endpoint queried from relational invoices & payments.
 */
studentsRouter.get(
  "/:name/financial-profile",
  requireAuth,
  requirePermission(["finance:read", "all:access"]),
  requireResourceOwnership({
    getTarget: (req) => ({
      targetStudentName: decodeURIComponent(req.params.name).trim(),
      targetStudentId: req.params.name,
    }),
    allowedRoles: ["super_admin", "admin", "finance_officer"],
  }),
  async (req: Request, res: Response) => {
    try {
      const studentName = decodeURIComponent(req.params.name).trim();
      const [invRes, txnRes] = await Promise.all([
        financeService.getInvoices(studentName, req.user),
        financeService.getTransactions({ studentName }, req.user),
      ]);

      return res.status(200).json({
        studentName,
        invoices: invRes.invoices,
        transactions: txnRes.transactions,
        receipts: [],
        adjustments: [],
      });
    } catch (err: any) {
      logger.error("GET /api/students/:name/financial-profile error:", err);
      return res.status(500).json({ error: "Failed to fetch student financial records" });
    }
  }
);

/**
 * GET /api/students/:name
 * Returns detailed single student profile.
 * Protected by Resource Ownership Check.
 */
studentsRouter.get(
  "/:name",
  requirePermission(["students:read", "all:access"]),
  requireResourceOwnership({
    getTarget: (req) => ({
      targetStudentName: decodeURIComponent(req.params.name).trim(),
      targetStudentId: req.params.name,
      courseCode: (req.query.courseCode as string) || (req.query.course as string) || (req.body?.courseCode as string),
    }),
    allowedRoles: ["super_admin", "admin", "registrar", "finance_officer"],
  }),
  async (req: Request, res: Response) => {
    try {
      const nameOrId = decodeURIComponent(req.params.name).trim();
      const result = await studentsService.getStudentByNameOrId(nameOrId, req.user);

      if (!result) {
        return res.status(404).json({ error: "Student not found" });
      }

      return res.status(200).json({
        student: result.student,
        attendanceHistory: result.attendanceHistory,
        submissions: result.submissions,
        payments: result.payments,
        rubricScores: null,
      });
    } catch (err: any) {
      logger.error("GET /api/students/:name error:", err);
      return res.status(500).json({ error: "Failed to fetch student profile" });
    }
  }
);

/**
 * POST /api/students
 * Enrolls a new student directly into relational PostgreSQL tables.
 * RBAC: Requires students:write permission
 */
studentsRouter.post(
  "/",
  requireAuth,
  requirePermission(["students:write", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const { name, level, email, photoUrl } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Student name is required" });
      }

      const result = await studentsService.enrollStudent(
        { name, level, email, photoUrl },
        actorUserId,
        actorRole
      );

      return res.status(201).json(result);
    } catch (err: any) {
      logger.error("POST /api/students error:", err);
      return res.status(500).json({ error: "Failed to enroll student" });
    }
  }
);

/**
 * PUT /api/students/:name
 * Updates student attributes in relational database.
 * RBAC: Requires students:write permission
 */
studentsRouter.put(
  "/:name",
  requireAuth,
  requirePermission(["students:write", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const studentName = decodeURIComponent(req.params.name).trim();
      const { level, note, photoUrl } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      const result = await studentsService.updateStudent(
        studentName,
        { level, note, photoUrl },
        actorUserId,
        actorRole
      );

      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("PUT /api/students/:name error:", err);
      return res.status(500).json({ error: "Failed to update student" });
    }
  }
);

/**
 * PATCH /api/students/:id
 * Updates specific student attributes (level, note, photoUrl, status) in relational database.
 * Supports identifier by UUID PK or student name.
 * RBAC: Requires students:write permission
 */
studentsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission(["students:write", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const idOrName = decodeURIComponent(req.params.id).trim();
      const { level, note, photoUrl, status, enrollmentStatus, studentNumber } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      const result = await studentsService.updateStudent(
        idOrName,
        { level, note, photoUrl, enrollmentStatus: enrollmentStatus || status, studentNumber },
        actorUserId,
        actorRole
      );

      return res.status(200).json(result);
    } catch (err: any) {
      logger.error(`PATCH /api/students/${req.params.id} error:`, err);
      return res.status(500).json({ error: err?.message || "Failed to update student" });
    }
  }
);

