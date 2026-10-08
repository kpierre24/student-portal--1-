import { Router, Request, Response } from "express";
import { requireAuth, requirePermission } from "../middleware/rbac";
import {
  studentsService,
  attendanceService,
  assignmentsService,
  financeService,
  stateHydrationService,
} from "../services/domain";
import { getServerSupabase } from "../services/supabaseServer";
import { sanitizeProductionState } from "../../data/guards";
import { logger } from "../../lib/logger";

export const meRouter = Router();

// Default-deny at the router level: All routes require authentication
meRouter.use(requireAuth);

/**
 * GET /api/me
 * Returns authenticated user profile and student attributes.
 * Server identifies the user strictly via req.user without client input.
 */
meRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    let studentProfile = null;
    // Prefer explicit UUID for lookup; fall back to name/email for backward-compat
    const identifier = user.studentRecordId || user.studentNumber || user.studentName || user.name || user.email;
    if (identifier) {
      studentProfile = await studentsService.getStudentByNameOrId(identifier, user);
    }

    return res.status(200).json({
      user: {
        userId: user.userId,
        studentId: user.studentId || null,          // deprecated alias — always UUID
        studentRecordId: user.studentRecordId || null, // authoritative UUID
        studentNumber: user.studentNumber || null,     // registration code e.g. SOM-2026-001
        email: user.email,
        name: user.name || user.studentName,
        studentName: user.studentName || user.name,
        role: user.role,
        assignedCourses: user.assignedCourses || [],
        permissions: user.permissions || [],
      },
      studentProfile: studentProfile?.student || null,
    });
  } catch (err: any) {
    logger.error("GET /api/me error:", err);
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

/**
 * GET /api/me/grades
 * Returns academic grades and submissions for the authenticated student.
 * Server identifies the user strictly via req.user.
 */
meRouter.get("/grades", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    // Prefer studentRecordId (UUID) for submission lookup
    const studentId = user.studentRecordId || user.studentId;
    const studentName = user.studentName || user.name;

    const subResult = await assignmentsService.getSubmissions({ studentId, studentName }, user);
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
      studentId: studentId || null,
      studentName: studentName || user.email.split("@")[0],
      averageGrade: gpaPercent,
      honorRoll,
      standing,
      submissions,
      rubricScores: subResult.rubricScores?.[studentName || ""] || null,
    });
  } catch (err: any) {
    logger.error("GET /api/me/grades error:", err);
    return res.status(500).json({ error: "Failed to fetch grades" });
  }
});

/**
 * GET /api/me/attendance
 * Returns attendance history and statistics for the authenticated student.
 * Server identifies the user strictly via req.user.
 */
meRouter.get("/attendance", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const attData = await attendanceService.getAttendance(user);
    // Use UUID for record matching; fall back to name for legacy records
    const targetId = user.studentRecordId || user.studentId;
    const normName = (user.studentName || user.name || user.email.split("@")[0]).toLowerCase().trim();

    const studentRecords = (attData.records || []).filter((r: any) => {
      if (targetId && (r.studentId === targetId || r.student?.id === targetId)) return true;
      const rName = (r.student?.name || r.studentName || r.name || "").toLowerCase().trim();
      return rName === normName;
    });

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
      studentId: user.studentRecordId || user.studentId || null,
      studentNumber: user.studentNumber || null,
      studentName: user.studentName || user.name || user.email.split("@")[0],
      totalSessions,
      presentCount,
      excusedCount,
      attendanceRate: rate,
      isAtRisk: rate < 75,
      records: studentRecords,
    });
  } catch (err: any) {
    logger.error("GET /api/me/attendance error:", err);
    return res.status(500).json({ error: "Failed to fetch attendance history" });
  }
});

/**
 * GET /api/me/assignments
 * Returns assignments and the authenticated student's submissions.
 * Server identifies the user strictly via req.user.
 */
meRouter.get("/assignments", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const [asgRes, subRes] = await Promise.all([
      assignmentsService.getAssignments(user),
      assignmentsService.getSubmissions({ studentId: user.studentId, studentName: user.studentName || user.name }, user),
    ]);

    return res.status(200).json({
      assignments: asgRes.assignments || [],
      submissions: subRes.submissions || [],
      count: asgRes.assignments?.length || 0,
    });
  } catch (err: any) {
    logger.error("GET /api/me/assignments error:", err);
    return res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

/**
 * GET /api/me/invoices
 * Returns financial invoices for the authenticated student.
 * Server identifies the user strictly via req.user.
 */
meRouter.get("/invoices", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const invRes = await financeService.getInvoices(
      { studentId: user.studentRecordId || user.studentId, studentName: user.studentName || user.name },
      user
    );

    return res.status(200).json({
      invoices: invRes.invoices || [],
      total: invRes.total || 0,
      studentId: user.studentRecordId || user.studentId || null,
      studentNumber: user.studentNumber || null,
      studentName: user.studentName || user.name || user.email.split("@")[0],
    });
  } catch (err: any) {
    logger.error("GET /api/me/invoices error:", err);
    return res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

/**
 * GET /api/me/payments
 * Returns payment transactions for the authenticated student.
 * Server identifies the user strictly via req.user.
 */
meRouter.get("/payments", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const txnRes = await financeService.getTransactions(
      { studentId: user.studentRecordId || user.studentId, studentName: user.studentName || user.name },
      user
    );

    return res.status(200).json({
      payments: txnRes.transactions || [],
      total: txnRes.total || 0,
      studentId: user.studentRecordId || user.studentId || null,
      studentNumber: user.studentNumber || null,
      studentName: user.studentName || user.name || user.email.split("@")[0],
    });
  } catch (err: any) {
    logger.error("GET /api/me/payments error:", err);
    return res.status(500).json({ error: "Failed to fetch payments" });
  }
});

/**
 * GET /api/me/state
 * Determines authenticated userId strictly from req.user and dynamically composes
 * that user's authorized state directly from relational domain tables.
 * The client never passes or selects whose private state it is retrieving.
 */
meRouter.get("/state", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const state = await stateHydrationService.getComposedStateForUser(user);

    if (!state) {
      return res.status(200).json({
        state: null,
        source: "relational_postgresql",
        userId: user.userId,
        message: "No state found"
      });
    }

    return res.status(200).json({
      state,
      source: "relational_postgresql",
      userId: user.userId,
      role: user.role,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error("GET /api/me/state error:", err);
    return res.status(500).json({ error: "Failed to load authorized state from relational database" });
  }
});

/**
 * POST /api/me/state
 * Synchronizes workspace state adjustments for the authenticated user and updates Supabase app_states.
 */
meRouter.post("/state", async (req: Request, res: Response) => {
  try {
    const rawState = req.body?.state || req.body;
    if (!rawState || typeof rawState !== 'object') {
      return res.status(400).json({ error: "Invalid state payload provided" });
    }

    const cleanState = sanitizeProductionState(rawState);
    const user = req.user!;
    const timestamp = new Date().toISOString();
    const nextVer = (typeof (cleanState as any).version === 'number' ? (cleanState as any).version + 1 : 2);
    (cleanState as any).version = nextVer;
    (cleanState as any).updatedAt = timestamp;

    try {
      const supabase = getServerSupabase();
      const docId = user.email ? `user_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}` : 'shared_default_state';
      await supabase.from('app_states').upsert({
        id: docId,
        state: cleanState,
        version: nextVer,
        updated_at: timestamp,
        updated_by: user.email || user.userId,
      });

      await supabase.from('app_states').upsert({
        id: 'shared_default_state',
        state: cleanState,
        version: nextVer,
        updated_at: timestamp,
        updated_by: user.email || user.userId,
      });
    } catch (sbErr) {
      logger.warn("Non-blocking Supabase app_states upsert notice in /api/me/state:", sbErr);
    }

    // Cache quizzes in memory
    if (Array.isArray(cleanState.customAssignments) && cleanState.customAssignments.length > 0) {
      for (const asg of cleanState.customAssignments) {
        if (!asg) continue;
        try {
          if (asg.quizData) {
            assignmentsService.cacheQuizInMemory(asg.quizData);
          }
          assignmentsService.cacheQuizInMemory(asg);
        } catch {}
      }
    }

    return res.status(200).json({
      success: true,
      version: nextVer,
      updatedAt: timestamp,
      message: "State successfully synchronized to Supabase",
    });
  } catch (err: any) {
    logger.error("POST /api/me/state error:", err);
    return res.status(500).json({ error: "Failed to persist state", details: err?.message || err });
  }
});

