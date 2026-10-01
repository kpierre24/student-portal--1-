import { Router, Request, Response } from "express";
import { getDatabaseUsers, updateUserRoleInDatabase, provisionOrApproveUserByAdmin, getPendingAccountApprovals } from "../services/supabaseServer";
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

// Default-deny at the router level for all remaining auth operations
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

