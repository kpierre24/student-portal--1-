import { Router, Request, Response } from "express";
import crypto from "crypto";
import { getAuthoritativeState, getAuthorizedStateForUser, saveAuthoritativeState, logAuditEvent } from "../services/supabaseServer";
import { requireAuth, requirePermission } from "../middleware/rbac";
import { logger } from "../../lib/logger";

export const libraryRouter = Router();

// Default-deny at the router level: All routes require authentication
libraryRouter.use(requireAuth);

const SECRET_KEY = process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "hteim_resource_security_secret_key_2026";

/**
 * Phase 22: Server-Side Resource Permissions Check
 */
export function checkResourceAccess(
  user: { userId: string; role: string; email?: string; enrolledCourses?: string[]; enrolledModules?: string[] },
  resource: any
): { hasAccess: boolean; reason: string } {
  const role = (user.role || 'student').toLowerCase();
  
  // Teachers, Admins, and Staff have full management & view access
  if (role === 'admin' || role === 'teacher' || role === 'staff' || role === 'superadmin') {
    return { hasAccess: true, reason: 'Faculty / Administrative Access Override' };
  }

  const visibility = (resource.visibility || resource.accessLevel || resource.audience || 'public').toLowerCase();

  if (visibility === 'public') {
    return { hasAccess: true, reason: 'Public institutional resource' };
  }

  if (visibility === 'authenticated' || visibility === 'everyone') {
    if (user.userId) return { hasAccess: true, reason: 'Authenticated portal user' };
    return { hasAccess: false, reason: 'Authentication required' };
  }

  if (visibility === 'students') {
    if (role === 'student' || role === 'admin' || role === 'teacher') {
      return { hasAccess: true, reason: 'Enrolled student access' };
    }
    return { hasAccess: false, reason: 'Restricted to enrolled students' };
  }

  if (visibility === 'teachers') {
    return { hasAccess: false, reason: 'Restricted to faculty & instructors' };
  }

  if (visibility === 'course') {
    const resourceCourse = resource.courseId || resource.courseCode || resource.accessCourseId;
    const userCourses = user.enrolledCourses || [];
    if (!resourceCourse || userCourses.includes(resourceCourse) || userCourses.includes('ALL') || userCourses.length === 0) {
      return { hasAccess: true, reason: 'Course enrolment verified' };
    }
    return { hasAccess: false, reason: `Requires active enrolment in course ${resourceCourse}` };
  }

  if (visibility === 'module') {
    const resourceModule = resource.moduleId || resource.accessModuleId || resource.moduleTrack;
    const userModules = user.enrolledModules || [];
    if (!resourceModule || userModules.includes(resourceModule) || userModules.includes('ALL') || userModules.length === 0) {
      return { hasAccess: true, reason: 'Module enrolment verified' };
    }
    return { hasAccess: false, reason: `Requires active enrolment in module ${resourceModule}` };
  }

  if (visibility === 'restricted') {
    const allowedUsers = resource.allowedUserIds || [];
    const allowedRoles = resource.allowedRoles || [];
    if (allowedUsers.includes(user.userId) || allowedRoles.map((r: string) => r.toLowerCase()).includes(role)) {
      return { hasAccess: true, reason: 'Explicit permission granted' };
    }
    return { hasAccess: false, reason: 'Private/restricted academic document' };
  }

  return { hasAccess: true, reason: 'Default access' };
}

/**
 * Phase 23: Signed Temporary Access Token Generator
 */
function generateSignedResourceToken(resourceId: string, userId: string, expiresInSeconds = 900): string {
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  const payload = `${resourceId}:${userId}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("hex");
  const tokenData = JSON.stringify({ resourceId, userId, expiresAt, signature });
  return Buffer.from(tokenData).toString("base64url");
}

function verifySignedResourceToken(token: string): { valid: boolean; resourceId?: string; userId?: string; error?: string } {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.resourceId || !parsed.userId || !parsed.expiresAt || !parsed.signature) {
      return { valid: false, error: "Malformed access token" };
    }
    if (Date.now() > parsed.expiresAt) {
      return { valid: false, error: "Resource access link has expired. Please request a new signed URL." };
    }
    const payload = `${parsed.resourceId}:${parsed.userId}:${parsed.expiresAt}`;
    const expectedSig = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("hex");
    if (parsed.signature !== expectedSig) {
      return { valid: false, error: "Invalid signature on resource token" };
    }
    return { valid: true, resourceId: parsed.resourceId, userId: parsed.userId };
  } catch (err) {
    return { valid: false, error: "Token verification failed" };
  }
}

/**
 * Default Preset Resource Collections (Phase 25)
 */
export const DEFAULT_LIBRARY_COLLECTIONS = [
  {
    id: "col-orientation",
    title: "New Student Orientation",
    description: "Essential introduction materials, student handbook, and academic guidance for HTEIM School of Ministry.",
    category: "Orientation",
    resourceIds: ["handbook-2026", "orientation-slides"],
    createdBy: "HTEIM Faculty",
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
    isPublic: true,
    tags: ["#Orientation", "#Handbook"],
    iconName: "Compass"
  },
  {
    id: "col-foundations",
    title: "Biblical Foundations",
    description: "Core theological foundational texts, Hermeneutics study guides, and Old/New Testament surveys.",
    category: "Theology",
    resourceIds: ["theology-notes-01", "hermeneutics-guide"],
    createdBy: "Academic Dean",
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    isPublic: true,
    tags: ["#BibleStudy", "#Theology"],
    iconName: "BookOpen"
  },
  {
    id: "col-prayer",
    title: "Prayer Resources",
    description: "Comprehensive guides on intercessory prayer, spiritual warfare, and personal prayer devotional outlines.",
    category: "Spiritual Formation",
    resourceIds: ["prayer-manual-v2"],
    createdBy: "Prayer Ministry Dept",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    isPublic: true,
    tags: ["#Prayer", "#SpiritualWarfare"],
    iconName: "Flame"
  },
  {
    id: "col-leadership",
    title: "Leadership Training",
    description: "Apostolic and pastoral ministry leadership principles, ethical decision making, and team dynamics.",
    category: "Leadership",
    resourceIds: ["leadership-principles"],
    createdBy: "HTEIM Faculty",
    createdAt: "2026-02-10T00:00:00.000Z",
    updatedAt: "2026-02-10T00:00:00.000Z",
    isPublic: true,
    tags: ["#Leadership", "#PastoralMinistry"],
    iconName: "Shield"
  },
  {
    id: "col-evangelism",
    title: "Evangelism Resources",
    description: "Outreach training manuals, personal testimony templates, and global mission field handbooks.",
    category: "Missions & Outreach",
    resourceIds: [],
    createdBy: "Missions Director",
    createdAt: "2026-02-15T00:00:00.000Z",
    updatedAt: "2026-02-15T00:00:00.000Z",
    isPublic: true,
    tags: ["#Evangelism", "#Missions"],
    iconName: "Globe"
  },
  {
    id: "col-som-2026",
    title: "School of Ministry 2026",
    description: "Master academic collection containing all required course textbooks, syllabus notes, and lecture media for 2026.",
    category: "Academic Curriculum",
    resourceIds: [],
    createdBy: "Academic Registrar",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    isPublic: true,
    tags: ["#HTEIM2026", "#Curriculum"],
    iconName: "GraduationCap"
  }
];

/**
 * GET /api/library
 * Retrieves library resources, enforcing server-side authorization filters.
 */
libraryRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const state = await getAuthorizedStateForUser(user);

    const rawResources = state?.libraryResources || [];
    const classroomMedia = state?.classroomMedia || [];

    // Phase 22: Enforce server-side permissions for every item!
    const sanitizedResources = rawResources.map((item: any) => {
      const { hasAccess, reason } = checkResourceAccess(user, item);

      if (!hasAccess) {
        // Redact direct download URL & raw file data URL for unauthorized resources
        return {
          ...item,
          url: undefined,
          downloadUrl: undefined,
          fileDataUrl: undefined,
          fullContent: undefined,
          accessGranted: false,
          accessReason: reason,
          isPrivateRestricted: true,
        };
      }

      return {
        ...item,
        accessGranted: true,
        accessReason: reason,
        isPrivateRestricted: false,
      };
    });

    return res.status(200).json({
      resources: sanitizedResources,
      classroomMedia,
      count: sanitizedResources.length,
      updatedAt: state?.updatedAt || new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error("GET /api/library error:", err);
    return res.status(500).json({ error: "Failed to fetch library resources" });
  }
});

/**
 * POST /api/library
 * Adds a new resource to the digital library.
 * RBAC: Requires students:write or roles:manage
 */
libraryRouter.post(
  "/",
  requirePermission(["students:write", "roles:manage", "all:access"]),
  async (req: Request, res: Response) => {
  try {
    const { resource } = req.body;
    const actorUserId = req.user!.userId;
    const actorRole = req.user!.role;
    if (!resource || !resource.title) {
      return res.status(400).json({ error: "Resource title is required" });
    }

    const state = (await getAuthoritativeState(actorUserId)) || {};
    const resources = [...(state.libraryResources || [])];

    const newResource = {
      id: resource.id || `LIB-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: resource.title,
      category: resource.category || "Study Guide",
      author: resource.author || "Faculty",
      courseCode: resource.courseCode || "General",
      url: resource.url || "",
      fileType: resource.fileType || "pdf",
      description: resource.description || "",
      uploadedAt: new Date().toISOString(),
    };

    resources.unshift(newResource);

    const updatedState = {
      ...state,
      libraryResources: resources,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user!.email,
    };

    await saveAuthoritativeState(
      updatedState,
      actorUserId,
      `Added library resource: ${newResource.title}`
    );

    await logAuditEvent({
      actorUserId: actorUserId,
      actorRole: actorRole,
      entityType: "library_resource",
      entityId: newResource.id,
      action: "create",
      newValues: newResource,
      changedFields: Object.keys(newResource),
      reason: `Added library resource: ${newResource.title}`,
    });

    return res.status(201).json({
      status: "added",
      resource: newResource,
    });
  } catch (err: any) {
    logger.error("POST /api/library error:", err);
    return res.status(500).json({ error: "Failed to add library resource" });
  }
});

/**
 * DELETE /api/library/:id
 * Removes a resource from the library.
 * RBAC: Requires students:write or roles:manage
 */
libraryRouter.delete(
  "/:id",
  requirePermission(["students:write", "roles:manage", "all:access"]),
  async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const actorUserId = req.user!.userId;
    const actorRole = req.user!.role;
    const state = (await getAuthoritativeState(actorUserId)) || {};

    let resources = [...(state.libraryResources || [])];
    const target = resources.find((r: any) => r.id === id);
    resources = resources.filter((r: any) => r.id !== id);

    const updatedState = {
      ...state,
      libraryResources: resources,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user!.email,
    };

    await saveAuthoritativeState(
      updatedState,
      actorUserId,
      `Removed library resource: ${target?.title || id}`
    );

    await logAuditEvent({
      actorUserId: actorUserId,
      actorRole: actorRole,
      entityType: "library_resource",
      entityId: id,
      action: "delete",
      oldValues: target,
      changedFields: ['libraryResources'],
      reason: `Removed library resource: ${target?.title || id}`,
    });

    return res.status(200).json({ status: "deleted", id });
  } catch (err: any) {
    logger.error("DELETE /api/library/:id error:", err);
    return res.status(500).json({ error: "Failed to delete library resource" });
  }
});

/**
 * GET /api/library/progress
 * Retrieves student learning progress records across library resources.
 * Phase 18: Resource progress tracking
 */
libraryRouter.get("/progress", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const state = await getAuthorizedStateForUser(user);
    const requestedStudentId = (req.query.studentId as string) || user.userId;

    const allProgress: Record<string, any> = state?.resourceProgress || {};
    
    // If student, filter strictly to their own progress records
    let userProgressList: any[] = [];
    if (user.role === "student") {
      userProgressList = Object.values(allProgress).filter(
        (p: any) => p.studentId === user.userId || p.studentId === "current_student" || p.studentEmail === user.email
      );
    } else {
      // Teachers/Admins can filter by studentId or retrieve all
      if (req.query.studentId) {
        userProgressList = Object.values(allProgress).filter(
          (p: any) => p.studentId === requestedStudentId || p.studentId === "current_student"
        );
      } else {
        userProgressList = Object.values(allProgress);
      }
    }

    return res.status(200).json({
      progress: userProgressList,
      count: userProgressList.length,
      updatedAt: state?.updatedAt || new Date().toISOString()
    });
  } catch (err: any) {
    logger.error("GET /api/library/progress error:", err);
    return res.status(500).json({ error: "Failed to fetch resource progress" });
  }
});

/**
 * POST /api/library/progress
 * Records and authoritatively validates student progress & completion.
 * Phase 19: Server-side validation of completion rules
 */
libraryRouter.post("/progress", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const actorUserId = user.userId;
    const body = req.body;
    const updates: any[] = Array.isArray(body.progressUpdates)
      ? body.progressUpdates
      : body.progress
      ? [body.progress]
      : [];

    if (updates.length === 0) {
      return res.status(400).json({ error: "No progress updates provided" });
    }

    const state = (await getAuthoritativeState(actorUserId)) || {};
    const existingProgress: Record<string, any> = { ...(state.resourceProgress || {}) };
    const validatedRecords: any[] = [];

    const now = new Date().toISOString();

    for (const item of updates) {
      if (!item.resourceId) continue;

      const studentId = user.role === "student" ? user.userId : item.studentId || user.userId;
      const key = `${studentId}_${item.resourceId}`;
      const existing = existingProgress[key] || {};

      const resourceType = (item.resourceType || "document").toLowerCase();
      const curTime = Math.max(0, Number(item.lastPositionSeconds || item.currentTimeSeconds || existing.lastPositionSeconds || 0));
      const durTime = Math.max(0, Number(item.durationSeconds || existing.durationSeconds || 0));
      const curPage = Math.max(0, Number(item.lastPage || item.currentPage || existing.lastPage || 0));
      const totalPages = Math.max(0, Number(item.totalPages || existing.totalPages || 0));
      const explicitUserCompletion = Boolean(item.explicitUserCompletion);

      // Phase 19 Authoritative Server Completion Rule Validation
      let isCompleted = existing.completed || false;
      let calculatedPercentage = 0;
      let completionReason = "In progress";

      if (resourceType === "video" || resourceType === "youtube" || resourceType === "vimeo") {
        if (durTime > 0) {
          calculatedPercentage = Math.min(100, Math.round((curTime / durTime) * 100));
          if (calculatedPercentage >= 90 || (durTime > 60 && durTime - curTime <= 15)) {
            isCompleted = true;
            completionReason = `Server validated: Video watched ${calculatedPercentage}% (>= 90% threshold)`;
          }
        } else if (explicitUserCompletion) {
          isCompleted = true;
          calculatedPercentage = 100;
          completionReason = "Explicit video completion verified";
        }
      } else if (resourceType === "audio") {
        if (durTime > 0) {
          calculatedPercentage = Math.min(100, Math.round((curTime / durTime) * 100));
          if (calculatedPercentage >= 90 || (durTime > 60 && durTime - curTime <= 15)) {
            isCompleted = true;
            completionReason = `Server validated: Audio listened ${calculatedPercentage}% (>= 90% threshold)`;
          }
        } else if (explicitUserCompletion) {
          isCompleted = true;
          calculatedPercentage = 100;
          completionReason = "Explicit audio listening completion verified";
        }
      } else if (resourceType === "pdf" || resourceType === "presentation" || resourceType === "document") {
        if (totalPages > 0) {
          calculatedPercentage = Math.min(100, Math.round((curPage / totalPages) * 100));
          if (curPage >= totalPages || calculatedPercentage >= 90 || explicitUserCompletion) {
            isCompleted = true;
            calculatedPercentage = 100;
            completionReason = `Server validated: Read ${curPage} of ${totalPages} pages`;
          }
        } else if (explicitUserCompletion) {
          isCompleted = true;
          calculatedPercentage = 100;
          completionReason = "Document marked complete after reading";
        }
      } else if (resourceType === "link" || resourceType === "website") {
        if (explicitUserCompletion) {
          isCompleted = true;
          calculatedPercentage = 100;
          completionReason = "External study link reviewed and completed";
        }
      } else if (explicitUserCompletion) {
        isCompleted = true;
        calculatedPercentage = 100;
        completionReason = "Theological resource marked complete";
      }

      const validatedRecord = {
        id: existing.id || `prog_${studentId}_${item.resourceId}`,
        studentId,
        studentEmail: user.email,
        resourceId: item.resourceId,
        resourceTitle: item.resourceTitle || existing.resourceTitle || "Resource",
        resourceType,
        courseId: item.courseId || existing.courseId,
        lastPositionSeconds: Math.floor(curTime),
        durationSeconds: Math.floor(durTime),
        lastPage: curPage > 0 ? curPage : undefined,
        totalPages: totalPages > 0 ? totalPages : undefined,
        percentage: isCompleted ? 100 : calculatedPercentage,
        completed: isCompleted,
        completionReason,
        lastViewedAt: now,
        completedAt: isCompleted ? (existing.completedAt || now) : undefined,
      };

      existingProgress[key] = validatedRecord;
      validatedRecords.push(validatedRecord);
    }

    const updatedState = {
      ...state,
      resourceProgress: existingProgress,
      updatedAt: now,
      updatedBy: user.email,
    };

    await saveAuthoritativeState(
      updatedState,
      actorUserId,
      `Updated learning progress for ${validatedRecords.length} resources`
    );

    return res.status(200).json({
      status: "synced",
      records: validatedRecords,
      count: validatedRecords.length,
    });
  } catch (err: any) {
    logger.error("POST /api/library/progress error:", err);
    return res.status(500).json({ error: "Failed to record resource progress" });
  }
});

/**
 * Phase 23: Request Signed Access URL for Private / Restricted Resources
 * POST /api/library/resources/:id/request-access
 */
libraryRouter.post("/resources/:id/request-access", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const resourceId = req.params.id;
    const actorUserId = user.userId;

    const state = await getAuthorizedStateForUser(user);
    const resources = state?.libraryResources || [];
    const targetResource = resources.find((r: any) => r.id === resourceId);

    if (!targetResource) {
      return res.status(404).json({ error: "Library resource not found" });
    }

    // Server-side permission check!
    const { hasAccess, reason } = checkResourceAccess(user, targetResource);

    if (!hasAccess) {
      await logAuditEvent({
        actorUserId: actorUserId,
        actorRole: user.role,
        entityType: "library_resource",
        entityId: resourceId,
        action: "access_denied",
        reason: `Unauthorized attempt to generate signed URL: ${reason}`,
      });

      return res.status(403).json({
        error: "Access Denied: You do not have authorization to view or download this private academic material.",
        reason,
      });
    }

    // Generate signed token valid for 15 minutes (900s)
    const token = generateSignedResourceToken(resourceId, user.userId, 900);
    const expiresAt = new Date(Date.now() + 900 * 1000).toISOString();
    const signedUrl = `/api/library/resources/${resourceId}/stream?token=${token}`;

    await logAuditEvent({
      actorUserId: actorUserId,
      actorRole: user.role,
      entityType: "library_resource",
      entityId: resourceId,
      action: "signed_url_generated",
      reason: `Generated signed URL for ${targetResource.title} (Expires: ${expiresAt})`,
    });

    return res.status(200).json({
      success: true,
      resourceId,
      signedUrl,
      downloadUrl: targetResource.downloadUrl || targetResource.url || signedUrl,
      fileDataUrl: targetResource.fileDataUrl,
      fullContent: targetResource.fullContent,
      token,
      expiresAt,
      reason,
    });
  } catch (err: any) {
    logger.error("POST /api/library/resources/:id/request-access error:", err);
    return res.status(500).json({ error: "Failed to request signed access URL" });
  }
});

/**
 * Phase 23: Secure Media/Resource Stream
 * GET /api/library/resources/:id/stream
 */
libraryRouter.get("/resources/:id/stream", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const resourceId = req.params.id;
    const token = req.query.token as string;

    if (!token) {
      return res.status(401).json({ error: "Missing required access token" });
    }

    const verification = verifySignedResourceToken(token);
    if (!verification.valid || verification.resourceId !== resourceId) {
      return res.status(403).json({ error: verification.error || "Forbidden: Invalid or expired signed access link" });
    }

    const state = await getAuthorizedStateForUser(user);
    const resources = state?.libraryResources || [];
    const target = resources.find((r: any) => r.id === resourceId);

    if (!target) {
      return res.status(404).json({ error: "Resource not found" });
    }

    if (target.fileDataUrl && target.fileDataUrl.startsWith("data:")) {
      const parts = target.fileDataUrl.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
      const buffer = Buffer.from(parts[1], "base64");
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `inline; filename="${target.fileName || 'resource'}"`);
      return res.status(200).send(buffer);
    }

    if (target.url || target.downloadUrl) {
      return res.redirect(target.url || target.downloadUrl);
    }

    return res.status(200).json({
      resourceId: target.id,
      title: target.title,
      summary: target.summary || target.description,
      fullContent: target.fullContent,
    });
  } catch (err: any) {
    logger.error("GET /api/library/resources/:id/stream error:", err);
    return res.status(500).json({ error: "Failed to stream resource" });
  }
});

/**
 * Phase 24: Sharing Endpoint
 * POST /api/library/share
 */
libraryRouter.post("/share", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { resourceId, shareType, targetId, note } = req.body;

    if (!resourceId || !shareType) {
      return res.status(400).json({ error: "resourceId and shareType are required" });
    }

    const state = (await getAuthoritativeState(user.userId)) || {};
    const resources = [...(state.libraryResources || [])];
    const targetIdx = resources.findIndex((r: any) => r.id === resourceId);

    if (targetIdx !== -1) {
      const resource = { ...resources[targetIdx] };
      if (shareType === 'course' && targetId) {
        resource.courseCode = targetId;
        resource.courseId = targetId;
      } else if (shareType === 'module' && targetId) {
        resource.moduleTrack = targetId;
        resource.moduleId = targetId;
      } else if (shareType === 'students' && targetId) {
        resource.allowedUserIds = Array.from(new Set([...(resource.allowedUserIds || []), targetId]));
      }

      resources[targetIdx] = resource;

      await saveAuthoritativeState(
        { ...state, libraryResources: resources, updatedAt: new Date().toISOString() },
        user.userId,
        `Shared resource ${resource.title} to ${shareType}: ${targetId}`
      );
    }

    await logAuditEvent({
      actorUserId: user.userId,
      actorRole: user.role,
      entityType: "library_resource",
      entityId: resourceId,
      action: "share",
      reason: `Shared resource via ${shareType} to target ${targetId || 'direct link'}`,
      newValues: { shareType, targetId, note },
    });

    return res.status(200).json({
      status: "shared",
      resourceId,
      shareType,
      targetId,
      shareUrl: `${req.protocol}://${req.get("host")}/library?resourceId=${resourceId}`,
    });
  } catch (err: any) {
    logger.error("POST /api/library/share error:", err);
    return res.status(500).json({ error: "Failed to process resource share" });
  }
});

/**
 * Phase 25: Resource Collections API Endpoints
 */
libraryRouter.get("/collections", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const state = await getAuthorizedStateForUser(user);
    const collections = state?.libraryCollections || DEFAULT_LIBRARY_COLLECTIONS;

    return res.status(200).json({
      collections,
      count: collections.length,
      updatedAt: state?.updatedAt || new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error("GET /api/library/collections error:", err);
    return res.status(500).json({ error: "Failed to fetch resource collections" });
  }
});

libraryRouter.post(
  "/collections",
  requirePermission(["students:write", "roles:manage", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { collection } = req.body;

      if (!collection || !collection.title) {
        return res.status(400).json({ error: "Collection title is required" });
      }

      const state = (await getAuthoritativeState(user.userId)) || {};
      const collections = [...(state.libraryCollections || DEFAULT_LIBRARY_COLLECTIONS)];

      const newCol = {
        id: collection.id || `col-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: collection.title,
        description: collection.description || "",
        category: collection.category || "General",
        coverImageUrl: collection.coverImageUrl || "",
        resourceIds: Array.isArray(collection.resourceIds) ? collection.resourceIds : [],
        createdBy: collection.createdBy || user.email || "HTEIM Faculty",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublic: collection.isPublic !== false,
        tags: Array.isArray(collection.tags) ? collection.tags : [],
        iconName: collection.iconName || "Folder",
      };

      collections.unshift(newCol);

      const updatedState = {
        ...state,
        libraryCollections: collections,
        updatedAt: new Date().toISOString(),
        updatedBy: user.email,
      };

      await saveAuthoritativeState(
        updatedState,
        user.userId,
        `Created resource collection: ${newCol.title}`
      );

      await logAuditEvent({
        actorUserId: user.userId,
        actorRole: user.role,
        entityType: "library_collection",
        entityId: newCol.id,
        action: "create",
        newValues: newCol,
        reason: `Created resource collection: ${newCol.title}`,
      });

      return res.status(201).json({ status: "created", collection: newCol });
    } catch (err: any) {
      logger.error("POST /api/library/collections error:", err);
      return res.status(500).json({ error: "Failed to create resource collection" });
    }
  }
);

libraryRouter.put(
  "/collections/:id",
  requirePermission(["students:write", "roles:manage", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const collectionId = req.params.id;
      const { collection } = req.body;

      const state = (await getAuthoritativeState(user.userId)) || {};
      const collections = [...(state.libraryCollections || DEFAULT_LIBRARY_COLLECTIONS)];
      const idx = collections.findIndex((c: any) => c.id === collectionId);

      if (idx === -1) {
        return res.status(404).json({ error: "Collection not found" });
      }

      const updatedCol = {
        ...collections[idx],
        ...collection,
        id: collectionId,
        updatedAt: new Date().toISOString(),
      };

      collections[idx] = updatedCol;

      const updatedState = {
        ...state,
        libraryCollections: collections,
        updatedAt: new Date().toISOString(),
        updatedBy: user.email,
      };

      await saveAuthoritativeState(
        updatedState,
        user.userId,
        `Updated resource collection: ${updatedCol.title}`
      );

      return res.status(200).json({ status: "updated", collection: updatedCol });
    } catch (err: any) {
      logger.error("PUT /api/library/collections/:id error:", err);
      return res.status(500).json({ error: "Failed to update resource collection" });
    }
  }
);

libraryRouter.delete(
  "/collections/:id",
  requirePermission(["students:write", "roles:manage", "all:access"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const collectionId = req.params.id;

      const state = (await getAuthoritativeState(user.userId)) || {};
      let collections = [...(state.libraryCollections || DEFAULT_LIBRARY_COLLECTIONS)];
      const target = collections.find((c: any) => c.id === collectionId);
      collections = collections.filter((c: any) => c.id !== collectionId);

      const updatedState = {
        ...state,
        libraryCollections: collections,
        updatedAt: new Date().toISOString(),
        updatedBy: user.email,
      };

      await saveAuthoritativeState(
        updatedState,
        user.userId,
        `Deleted resource collection: ${target?.title || collectionId}`
      );

      return res.status(200).json({ status: "deleted", id: collectionId });
    } catch (err: any) {
      logger.error("DELETE /api/library/collections/:id error:", err);
      return res.status(500).json({ error: "Failed to delete resource collection" });
    }
  }
);

