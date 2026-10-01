import { LearningResource } from '../types';

const FAVORITES_STORAGE_KEY = 'hteim_library_favorites_ids';
const RECENT_STORAGE_KEY = 'hteim_library_recent_ids';
const DOWNLOADS_STORAGE_KEY = 'hteim_library_downloads_ids';

/**
 * Loads the list of favorite resource IDs
 */
export function getFavoriteResourceIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Toggles a resource in/out of favorites
 */
export function toggleFavoriteResource(resourceId: string): boolean {
  const current = getFavoriteResourceIds();
  const exists = current.includes(resourceId);
  const updated = exists ? current.filter((id) => id !== resourceId) : [resourceId, ...current];

  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
    // Also sync legacy individual key
    localStorage.setItem(`hteim_resource_saved_${resourceId}`, (!exists).toString());
  } catch {
    // Ignore storage quota
  }

  return !exists;
}

export function isResourceFavorite(resourceId: string): boolean {
  return getFavoriteResourceIds().includes(resourceId);
}

/**
 * Records a resource as recently viewed/opened
 */
export function recordRecentResource(resourceId: string): void {
  try {
    const current = getRecentResourceIds();
    const updated = [resourceId, ...current.filter((id) => id !== resourceId)].slice(0, 30);
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

export function getRecentResourceIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Records a downloaded resource
 */
export function recordDownloadedResource(resourceId: string): void {
  try {
    const current = getDownloadedResourceIds();
    if (!current.includes(resourceId)) {
      const updated = [resourceId, ...current].slice(0, 50);
      localStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignore
  }
}

export function getDownloadedResourceIds(): string[] {
  try {
    const raw = localStorage.getItem(DOWNLOADS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
