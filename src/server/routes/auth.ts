import { Router, Request, Response } from "express";
import { 
  getDatabaseUsers, 
  updateUserRoleInDatabase, 
  provisionOrApproveUserByAdmin, 
  getPendingAccountApprovals,
  registerAccountRequestInDatabase,
  getAccountApprovalStatus,
  approveAccountRequestInDatabase,
  rejectAccountRequestInDatabase,
  resolveUserIdentifierToEmail
} from "../services/supabaseServer";
import { UserRole, ROLE_DEFINITIONS, normalizeUserRole } from "../../types/rbac";
import { requireAuth, requirePermission } from "../middleware/rbac";
import { logger } from "../../lib/logger";
import { isDemoUser } from "../../data/guards";

export const authRouter = Router();

/**
 * GET /api/auth/roles
 * Lists all defined roles and their granular access scopes (public schema discovery).
 */
authRouter.get("/roles", (_req: Request, res: Response) => {
  const roles = Object.values(ROLE_DEFINITIONS).filter((r, index, self) => 
    index === self.findIndex((t) => t.id === r.id)
  );

  return res.status(200).json({
    roles: roles.map((r) => ({
      role: r.id,
      title: r.title,
      badge: r.badge,
      color: r.color,
      badgeBg: r.badgeBg,
      description: r.description,
      accessibleTabs: r.accessibleTabs,
      permissions: r.permissions,
    })),
  });
});

/**
 * POST /api/auth/register-request (Public / Pre-authenticated)
 * Registers an account setup / role request within the app into Supabase for approval.
 * Supported account types: superadmin, admin, teacher, student.
 */
authRouter.post("/register-request", async (req: Request, res: Response) => {
  try {
    const { email, name, fullName, requestedRole, accountType, details, userId, password, username } = req.body;
    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanName = (fullName || name || "").trim();
    const rawRole = (accountType || requestedRole || "student").toString().toLowerCase().trim();
    const cleanUsername = (username || details?.username || "").trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required" });
    }

    if (!cleanName) {
      return res.status(400).json({ error: "Full name is required" });
    }

    const validRoles = ["superadmin", "super_admin", "admin", "teacher", "student", "lecturer"];
    if (!validRoles.includes(rawRole)) {
      return res.status(400).json({ error: `Invalid account type. Must be one of: superadmin, admin, teacher, student` });
    }

    const requestId = (req.headers["x-request-id"] as string) || undefined;
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown-ip";
    const userAgent = req.headers["user-agent"];

    const result = await registerAccountRequestInDatabase({
      email: cleanEmail,
      name: cleanName,
      requestedRole: rawRole,
      password: password || undefined,
      username: cleanUsername || undefined,
      details: details || {},
      userId: userId || undefined,
      requestId,
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || "Failed to submit account request" });
    }

    return res.status(200).json({
      success: true,
      status: result.status,
      email: cleanEmail,
      requestedRole: rawRole,
      message: result.status === "approved"
        ? "Account setup and approved successfully."
        : "Account registration submitted. Awaiting approval by administrator in Supabase.",
    });
  } catch (err: any) {
    logger.error("POST /api/auth/register-request error:", err);
    return res.status(500).json({ error: "Account registration processing failed" });
  }
});

/**
 * GET /api/auth/approval-status (Public / Pre-authenticated)
 * Allows users to check their current Supabase account approval status.
 */
authRouter.get("/approval-status", async (req: Request, res: Response) => {
  try {
    const email = (req.query.email as string) || (req.query.identifier as string);
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "Email or identifier is required" });
    }

    const statusResult = await getAccountApprovalStatus(email);
    return res.status(200).json(statusResult);
  } catch (err: any) {
    logger.error("GET /api/auth/approval-status error:", err);
    return res.status(500).json({ error: "Failed to retrieve approval status" });
  }
});

/**
 * GET /api/auth/resolve-identifier (Public / Pre-authenticated)
 * Resolves a username, student number, or name to their registered email address for sign-in.
 */
authRouter.get("/resolve-identifier", async (req: Request, res: Response) => {
  try {
    const rawId = ((req.query.identifier as string) || "").trim();
    if (!rawId) {
      return res.status(400).json({ exists: false, error: "Identifier is required" });
    }

    if (rawId.includes("@")) {
      return res.status(200).json({ exists: true, email: rawId.toLowerCase() });
    }

    const resolved = await resolveUserIdentifierToEmail(rawId);
    return res.status(200).json(resolved);
  } catch (err: any) {
    logger.error("GET /api/auth/resolve-identifier error:", err);
    return res.status(500).json({ exists: false, error: "Identifier resolution failed" });
  }
});

// Default-deny at the router level for all remaining protected auth operations
authRouter.use(requireAuth);

/**
 * POST /api/auth/session
 * Verifies or initializes a session for the current user and returns authoritative roles/permissions.
 */
authRouter.post("/session", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const roleDef = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.student;

    return res.status(200).json({
      status: "authenticated",
      user: {
        uid: user.uid,
        userId: user.userId,
        id: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.studentId,
        studentName: user.studentName,
        assignedCourses: user.assignedCourses,
        permissions: user.permissions,
        accessibleTabs: roleDef.accessibleTabs,
        roleDefinition: {
          id: roleDef.id,
          title: roleDef.title,
          badge: roleDef.badge,
          description: roleDef.description,
          color: roleDef.color,
          badgeBg: roleDef.badgeBg
        }
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error("Auth session error:", err);
    return res.status(500).json({ error: "Authentication session verification failed" });
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user from req.user
 */
authRouter.get("/me", (req: Request, res: Response) => {
  const user = req.user!;
  const roleDef = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.student;
  return res.status(200).json({
    status: "authenticated",
    user: {
      uid: user.uid,
      userId: user.userId,
      id: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      studentId: user.studentId,
      studentName: user.studentName,
      assignedCourses: user.assignedCourses,
      permissions: user.permissions,
      accessibleTabs: roleDef.accessibleTabs,
      roleDefinition: {
        id: roleDef.id,
        title: roleDef.title,
        badge: roleDef.badge,
        description: roleDef.description,
        color: roleDef.color,
        badgeBg: roleDef.badgeBg
      }
    }
  });
});

/**
 * GET /api/auth/users
 * Returns list of registered users in the database.
 * RBAC: Requires users:manage
 */
authRouter.get(
  "/users",
  requirePermission(["users:manage", "all:access"]),
  async (_req: Request, res: Response) => {
    try {
      const users = await getDatabaseUsers();
      return res.status(200).json({
        users,
        count: users.length,
      });
    } catch (err: any) {
      logger.error("GET /api/auth/users error:", err);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  }
);

/**
 * PATCH /api/auth/users/:userId/role
 * Updates a user's role in the database.
 * RBAC: Requires roles:manage
 */
authRouter.patch(
  "/users/:userId/role",
  requirePermission(["roles:manage", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { role, reason } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;
      const requestId = (req.headers["x-request-id"] as string) || undefined;
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown-ip";
      const userAgent = req.headers["user-agent"];

      if (!role || typeof role !== "string") {
        return res.status(400).json({ error: "role is required" });
      }

      const normalized = normalizeUserRole(role);
      const result = await updateUserRoleInDatabase(
        userId,
        normalized,
        actorUserId,
        actorRole,
        reason,
        requestId,
        ipAddress,
        userAgent
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error || "Failed to update role" });
      }

      return res.status(200).json({
        status: "updated",
        user: result.user,
      });
    } catch (err: any) {
      logger.error("PATCH /api/auth/users/:userId/role error:", err);
      return res.status(500).json({ error: "Failed to update user role" });
    }
  }
);

/**
 * GET /api/auth/pending-approvals
 * Lists faculty and staff candidate accounts awaiting administrator approval.
 * RBAC: Requires users:manage
 */
authRouter.get(
  "/pending-approvals",
  requirePermission(["users:manage", "all:access"]),
  async (_req: Request, res: Response) => {
    try {
      const pending = await getPendingAccountApprovals();
      return res.status(200).json({
        pending,
        count: pending.length,
      });
    } catch (err: any) {
      logger.error("GET /api/auth/pending-approvals error:", err);
      return res.status(500).json({ error: "Failed to fetch pending approvals" });
    }
  }
);

/**
 * POST /api/auth/users/provision
 * Explicitly provisions or approves a user account (e.g. lecturer, staff, student) by an administrator.
 * RBAC: Requires users:manage
 */
authRouter.post(
  "/users/provision",
  requirePermission(["users:manage", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const { email, role, reason, assignedCourses, sourceRecord, firebaseUid } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;
      const requestId = (req.headers["x-request-id"] as string) || undefined;
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown-ip";
      const userAgent = req.headers["user-agent"];

      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Valid email is required" });
      }

      if (!role || typeof role !== "string") {
        return res.status(400).json({ error: "role is required" });
      }

      const result = await provisionOrApproveUserByAdmin({
        email,
        role,
        actorUserId,
        actorRole,
        reason,
        assignedCourses,
        sourceRecord,
        requestId,
        ipAddress,
        userAgent,
        firebaseUid,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error || "Failed to provision user" });
      }

      return res.status(200).json({
        status: "provisioned",
        user: result.user,
      });
    } catch (err: any) {
      logger.error("POST /api/auth/users/provision error:", err);
      return res.status(500).json({ error: "Failed to provision user" });
    }
  }
);

/**
 * POST /api/auth/approve-request
 * Approves a pending Supabase account request.
 * Supported account types: superadmin, admin, teacher, student.
 * RBAC: Requires users:manage
 */
authRouter.post(
  "/approve-request",
  requirePermission(["users:manage", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const { email, identifier, role, reason } = req.body;
      const target = (email || identifier || "").toString().trim();
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;
      const requestId = (req.headers["x-request-id"] as string) || undefined;
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown-ip";
      const userAgent = req.headers["user-agent"];

      if (!target) {
        return res.status(400).json({ error: "Email or identifier is required" });
      }

      const result = await approveAccountRequestInDatabase({
        targetIdentifier: target,
        roleOverride: role,
        actorUserId,
        actorRole,
        reason,
        requestId,
        ipAddress,
        userAgent,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error || "Failed to approve account" });
      }

      return res.status(200).json({
        success: true,
        status: "approved",
        user: result.user,
        message: `Account approved successfully in Supabase.`,
      });
    } catch (err: any) {
      logger.error("POST /api/auth/approve-request error:", err);
      return res.status(500).json({ error: "Approval operation failed" });
    }
  }
);

/**
 * POST /api/auth/reject-request
 * Rejects a pending Supabase account request.
 * RBAC: Requires users:manage
 */
authRouter.post(
  "/reject-request",
  requirePermission(["users:manage", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const { email, identifier, reason } = req.body;
      const target = (email || identifier || "").toString().trim();
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;
      const requestId = (req.headers["x-request-id"] as string) || undefined;
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown-ip";
      const userAgent = req.headers["user-agent"];

      if (!target) {
        return res.status(400).json({ error: "Email or identifier is required" });
      }

      const result = await rejectAccountRequestInDatabase({
        targetIdentifier: target,
        reason,
        actorUserId,
        actorRole,
        requestId,
        ipAddress,
        userAgent,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error || "Failed to reject account" });
      }

      return res.status(200).json({
        success: true,
        status: "rejected",
        message: `Account request rejected.`,
      });
    } catch (err: any) {
      logger.error("POST /api/auth/reject-request error:", err);
      return res.status(500).json({ error: "Rejection operation failed" });
    }
  }
);

