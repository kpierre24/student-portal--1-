import { Router, Request, Response } from "express";
import { stateHydrationService } from "../services/domain";
import { requireAuth } from "../middleware/rbac";
import { logger } from "../../lib/logger";

export const stateRouter = Router();

// Default-deny at the router level: All routes require authentication
stateRouter.use(requireAuth);

/**
 * GET /api/state
 * Retrieves the authorized application state for the authenticated user (derived strictly from req.user.userId)
 * dynamically composed from relational domain tables.
 */
stateRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const state = await stateHydrationService.getComposedStateForUser(user);

    if (!state) {
      return res.status(200).json({
        state: null,
        version: 0,
        source: "relational_postgresql",
        userId: user.userId,
        message: "No state found"
      });
    }

    const version = Number(state.version) || 1;

    return res.status(200).json({
      state,
      version,
      source: "relational_postgresql",
      userId: user.userId,
      role: user.role,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error("GET /api/state error:", err);
    return res.status(500).json({ error: "Failed to load state from relational database" });
  }
});

/**
 * POST /api/state
 * DEPRECATED / DISALLOWED: /api/state is strictly a GET-only read-composition endpoint.
 * Mutations must be executed via domain-specific relational REST endpoints:
 * - POST /api/students & PATCH /api/students/:id
 * - POST /api/attendance & PATCH /api/attendance/:id
 * - POST /api/assignments & POST /api/assignments/:id/submissions
 * - POST /api/grades
 * - POST /api/invoices & POST /api/payments
 * - POST /api/notifications
 */
stateRouter.post("/", (req: Request, res: Response) => {
  return res.status(405).json({
    error: "Method Not Allowed: /api/state is a GET-only read-composition endpoint. Monolithic state persistence to app_states is discontinued in favor of discrete relational domain mutations.",
    code: "MUTATION_ENDPOINT_DEPRECATED",
    recommendedEndpoints: {
      students: "POST /api/students | PATCH /api/students/:id",
      attendance: "POST /api/attendance | PATCH /api/attendance/:id",
      assignments: "POST /api/assignments | POST /api/assignments/:id/submissions",
      grades: "POST /api/grades",
      invoices: "POST /api/invoices | POST /api/payments/invoices",
      payments: "POST /api/payments | POST /api/payments/transactions",
      notifications: "POST /api/notifications | PATCH /api/notifications/:id",
    },
  });
});

