import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { stateHydrationService, assignmentsService } from "../services/domain";
import { getServerSupabase } from "../services/supabaseServer";
import { sanitizeProductionState } from "../../data/guards";
import { logger } from "../../lib/logger";

export const stateRouter = Router();

const AUTHORITATIVE_STATE_FILE = path.join(process.cwd(), "data", "authoritative_state.json");
const DIST_STATE_FILE = path.join(process.cwd(), "dist", "data", "authoritative_state.json");

function loadDiskAuthoritativeState(): any | null {
  try {
    if (fs.existsSync(AUTHORITATIVE_STATE_FILE)) {
      const raw = fs.readFileSync(AUTHORITATIVE_STATE_FILE, "utf-8");
      return JSON.parse(raw);
    }
    if (fs.existsSync(DIST_STATE_FILE)) {
      const raw = fs.readFileSync(DIST_STATE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    logger.warn("Non-blocking warning reading disk authoritative state:", err);
  }
  return null;
}

function saveDiskAuthoritativeState(state: any): void {
  try {
    const dir = path.dirname(AUTHORITATIVE_STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(AUTHORITATIVE_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");

    // Also write to dist/data if dist exists
    const distDir = path.dirname(DIST_STATE_FILE);
    if (fs.existsSync(path.dirname(distDir))) {
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }
      fs.writeFileSync(DIST_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
    }
  } catch (err) {
    logger.warn("Non-blocking warning writing disk authoritative state:", err);
  }
}

/**
 * GET /api/state
 * Retrieves the application state composed from relational domain tables,
 * Supabase app_states snapshot, and disk authoritative backup.
 */
stateRouter.get("/", async (req: Request, res: Response) => {
  try {
    const user = req.user;
    let state = user ? await stateHydrationService.getComposedStateForUser(user) : null;

    // Load persisted workspace state snapshot (from disk or app_states)
    const diskState = loadDiskAuthoritativeState();
    let supabaseSharedState: any = null;

    try {
      const supabase = getServerSupabase();
      const { data: stateDoc } = await supabase
        .from('app_states')
        .select('state')
        .eq('id', 'shared_default_state')
        .maybeSingle();
      if (stateDoc?.state) {
        supabaseSharedState = stateDoc.state;
      }
    } catch {
      // Non-blocking Supabase probe
    }

    const baselineState = supabaseSharedState || diskState || null;

    if (!state) {
      if (baselineState) {
        state = baselineState;
      } else {
        return res.status(200).json({
          state: null,
          version: 0,
          source: "relational_postgresql",
          userId: user?.userId || null,
          message: "No state found",
        });
      }
    } else if (baselineState) {
      // Merge in any customAssignments, libraryResources, classroomMedia, studentNotes, studentPhotos, studentLevels from baseline if current state is missing them
      if ((!state.customAssignments || state.customAssignments.length === 0) && baselineState.customAssignments?.length > 0) {
        state.customAssignments = baselineState.customAssignments;
      }
      if ((!state.libraryResources || state.libraryResources.length === 0) && baselineState.libraryResources?.length > 0) {
        state.libraryResources = baselineState.libraryResources;
      }
      if ((!state.classroomMedia || state.classroomMedia.length === 0) && baselineState.classroomMedia?.length > 0) {
        state.classroomMedia = baselineState.classroomMedia;
      }
      if (baselineState.studentLevels && Object.keys(state.studentLevels || {}).length === 0) {
        state.studentLevels = baselineState.studentLevels;
      }
      if (baselineState.studentPhotos && Object.keys(state.studentPhotos || {}).length === 0) {
        state.studentPhotos = baselineState.studentPhotos;
      }
      if (baselineState.studentNotes && Object.keys(state.studentNotes || {}).length === 0) {
        state.studentNotes = baselineState.studentNotes;
      }
    }

    const version = Number(state.version) || 1;

    return res.status(200).json({
      state,
      version,
      source: "relational_postgresql",
      userId: user?.userId || null,
      role: user?.role || "admin",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error("GET /api/state error:", err);
    const diskState = loadDiskAuthoritativeState();
    if (diskState) {
      return res.status(200).json({
        state: diskState,
        version: Number(diskState.version) || 1,
        source: "disk_authoritative",
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(500).json({ error: "Failed to load state from relational database" });
  }
});

/**
 * POST /api/state
 * Synchronizes workspace state adjustments (quizzes, student changes, assessments, media)
 * into Supabase app_states, relational domain tables, and disk authoritative backup.
 */
stateRouter.post("/", async (req: Request, res: Response) => {
  try {
    const rawState = req.body?.state || req.body;
    if (!rawState || typeof rawState !== 'object') {
      return res.status(400).json({ error: "Invalid state payload provided" });
    }

    const cleanState = sanitizeProductionState(rawState);
    const userEmail = req.user?.email || req.body?.userEmail || (req.body?.state as any)?.activeEmail || null;
    const timestamp = new Date().toISOString();
    const nextVer = (typeof (cleanState as any).version === 'number' ? (cleanState as any).version + 1 : 2);
    (cleanState as any).version = nextVer;
    (cleanState as any).updatedAt = timestamp;

    // 1. Persist to authoritative disk storage so changes survive redeployments & restarts
    saveDiskAuthoritativeState(cleanState);

    // 2. Synchronize to Supabase app_states table (both shared_default_state and user-specific)
    try {
      const supabase = getServerSupabase();
      const docId = userEmail ? `user_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}` : 'shared_default_state';
      const updater = userEmail || req.user?.userId || 'anonymous';

      await supabase.from('app_states').upsert({
        id: docId,
        state: cleanState,
        version: nextVer,
        updated_at: timestamp,
        updated_by: updater,
      });

      if (docId !== 'shared_default_state') {
        await supabase.from('app_states').upsert({
          id: 'shared_default_state',
          state: cleanState,
          version: nextVer,
          updated_at: timestamp,
          updated_by: updater,
        });
      }
    } catch (sbErr) {
      logger.warn("Non-blocking Supabase app_states upsert notice:", sbErr);
    }

    // 3. Synchronize customAssignments (quizzes and assessments) to in-memory cache and assignments table
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
      message: "State successfully synchronized to Supabase and authoritative store",
    });
  } catch (err: any) {
    logger.error("POST /api/state error:", err);
    return res.status(500).json({ error: "Failed to persist state", details: err?.message || err });
  }
});




