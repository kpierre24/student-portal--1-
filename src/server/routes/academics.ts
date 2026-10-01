import { Router, Request, Response } from "express";
import { academicsService } from "../services/domain";
import { requireAuth, requirePermission } from "../middleware/rbac";
import { logger } from "../../lib/logger";

export const academicsRouter = Router();

// Default-deny at the router level: All routes require authentication
academicsRouter.use(requireAuth);

/**
 * GET /api/academics/courses
 * Retrieves courses and curriculum tracks from relational catalog.
 */
academicsRouter.get(
  "/courses",
  requirePermission(["students:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const data = await academicsService.getCourses();
      return res.status(200).json({
        courses: data.courses,
        count: data.count,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error("GET /api/academics/courses error:", err);
      return res.status(500).json({ error: "Failed to fetch courses" });
    }
  }
);

/**
 * POST /api/academics/courses
 * Creates or updates a course in relational course definitions table.
 * RBAC: Requires students:write or roles:manage
 */
academicsRouter.post(
  "/courses",
  requireAuth,
  requirePermission(["students:write", "roles:manage", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const { course } = req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      if (!course || !course.code || !course.title) {
        return res.status(400).json({ error: "Course code and title are required" });
      }

      const result = await academicsService.saveCourse(course, actorUserId, actorRole);
      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("POST /api/academics/courses error:", err);
      return res.status(500).json({ error: "Failed to save course" });
    }
  }
);

/**
 * GET /api/academics/structure
 * Returns the complete relational academic structure (years, terms, master courses, course offerings).
 */
academicsRouter.get(
  "/structure",
  requirePermission(["students:read", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const structure = await academicsService.getAcademicStructure();
      return res.status(200).json(structure);
    } catch (err: any) {
      logger.error("GET /api/academics/structure error:", err);
      return res.status(500).json({ error: "Failed to fetch academic structure" });
    }
  }
);

/**
 * POST /api/academics/offerings
 * Create or update a CourseOffering in relational tables.
 * RBAC: Requires students:write or roles:manage
 */
academicsRouter.post(
  "/offerings",
  requireAuth,
  requirePermission(["students:write", "roles:manage", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const offering = req.body.offering || req.body;
      const actorUserId = req.user!.userId;
      const actorRole = req.user!.role;

      if (!offering || !offering.id || !offering.courseId) {
        return res.status(400).json({ error: "Offering id and courseId are required" });
      }

      const result = await academicsService.saveCourseOffering(offering, actorUserId, actorRole);
      return res.status(200).json(result);
    } catch (err: any) {
      logger.error("POST /api/academics/offerings error:", err);
      return res.status(500).json({ error: "Failed to save course offering" });
    }
  }
);
