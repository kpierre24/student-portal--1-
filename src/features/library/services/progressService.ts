import { ResourceProgress, LearningResource } from '../types';
import { evaluateResourceCompletion } from '../utils/completionRules';

const PROGRESS_STORAGE_KEY = 'hteim_resource_progress_records';

/**
 * Loads all saved progress records from localStorage
 */
export function loadAllLocalProgress(): Record<string, ResourceProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load local progress:', err);
    return {};
  }
}

/**
 * Saves all progress records to localStorage
 */
export function saveAllLocalProgress(records: Record<string, ResourceProgress>): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save local progress:', err);
  }
}

/**
 * Gets the progress record for a specific resource & student
 */
export function getResourceProgress(
  resourceId: string,
  studentId: string = 'current_student'
): ResourceProgress | null {
  const all = loadAllLocalProgress();
  const key = `${studentId}_${resourceId}`;
  return all[key] || null;
}

/**
 * In-memory debounce queue for server synchronization
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const pendingSyncQueue: Record<string, ResourceProgress> = {};

async function flushSyncToServer(): Promise<void> {
  const keys = Object.keys(pendingSyncQueue);
  if (keys.length === 0) return;

  const itemsToSync = keys.map((k) => pendingSyncQueue[k]);
  // Clear the queue
  keys.forEach((k) => delete pendingSyncQueue[k]);

  try {
    const token = localStorage.getItem('token') || localStorage.getItem('hteim_auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch('/api/library/progress', {
      method: 'POST',
      headers,
      body: JSON.stringify({ progressUpdates: itemsToSync })
    });
  } catch (err) {
    // Graceful offline fallback: Progress remains securely saved in localStorage
    console.debug('Offline or server sync deferred for progress items:', err);
  }
}

/**
 * Records a student's progress on any resource (video, audio, PDF, web, etc.)
 * Applies Phase 19 completion rules automatically.
 */
export function recordResourceProgress(params: {
  resource: LearningResource | { id: string; type?: any; title?: string; courseId?: string; author?: string };
  studentId?: string;
  currentTimeSeconds?: number;
  durationSeconds?: number;
  currentPage?: number;
  totalPages?: number;
  explicitUserCompletion?: boolean;
}): ResourceProgress {
  const studentId = params.studentId || 'current_student';
  const resourceId = params.resource.id;
  const key = `${studentId}_${resourceId}`;

  const all = loadAllLocalProgress();
  const existing = all[key];

  const evaluation = evaluateResourceCompletion({
    resourceType: params.resource.type || 'document',
    currentTimeSeconds: params.currentTimeSeconds,
    durationSeconds: params.durationSeconds,
    currentPage: params.currentPage,
    totalPages: params.totalPages,
    explicitUserCompletion: params.explicitUserCompletion
  });

  const now = new Date().toISOString();
  const isCompleted = existing?.completed || evaluation.completed;

  const progressRecord: ResourceProgress = {
    id: `prog_${studentId}_${resourceId}`,
    studentId,
    resourceId,
    lastPositionSeconds: params.currentTimeSeconds !== undefined ? Math.floor(params.currentTimeSeconds) : (existing?.lastPositionSeconds || 0),
    durationSeconds: params.durationSeconds !== undefined ? Math.floor(params.durationSeconds) : (existing?.durationSeconds || 0),
    lastPage: params.currentPage !== undefined ? params.currentPage : existing?.lastPage,
    totalPages: params.totalPages !== undefined ? params.totalPages : existing?.totalPages,
    percentage: isCompleted ? 100 : evaluation.percentage,
    completed: isCompleted,
    lastViewedAt: now,
    completedAt: isCompleted ? (existing?.completedAt || now) : undefined,
    resourceType: params.resource.type,
    resourceTitle: params.resource.title,
    courseId: params.resource.courseId,
    instructor: (params.resource as any).instructor || (params.resource as any).author
  };

  all[key] = progressRecord;
  saveAllLocalProgress(all);

  // Sync legacy keys for backward-compatibility with existing components
  try {
    if (params.currentTimeSeconds !== undefined) {
      if (params.resource.type === 'video') {
        localStorage.setItem(`hteim_video_progress_${resourceId}`, params.currentTimeSeconds.toString());
      } else if (params.resource.type === 'audio') {
        localStorage.setItem(`hteim_audio_progress_${resourceId}`, params.currentTimeSeconds.toString());
      }
    }
    if (params.currentPage !== undefined) {
      localStorage.setItem(`hteim_pdf_page_${resourceId}`, params.currentPage.toString());
    }
    if (isCompleted) {
      localStorage.setItem(`hteim_resource_completed_${resourceId}`, 'true');
    }
  } catch {
    // Ignore storage quota
  }

  // Queue background sync to server
  pendingSyncQueue[key] = progressRecord;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    flushSyncToServer();
  }, 2000);

  return progressRecord;
}

/**
 * Fetches progress from server and merges with local storage
 */
export async function syncProgressFromServer(studentId: string = 'current_student'): Promise<Record<string, ResourceProgress>> {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('hteim_auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/library/progress?studentId=${encodeURIComponent(studentId)}`, {
      headers
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.progress)) {
        const local = loadAllLocalProgress();
        data.progress.forEach((serverRec: ResourceProgress) => {
          const key = `${serverRec.studentId}_${serverRec.resourceId}`;
          const localRec = local[key];
          if (!localRec || new Date(serverRec.lastViewedAt) > new Date(localRec.lastViewedAt)) {
            local[key] = serverRec;
          }
        });
        saveAllLocalProgress(local);
        return local;
      }
    }
  } catch (err) {
    console.debug('Could not fetch server progress (using local):', err);
  }
  return loadAllLocalProgress();
}
