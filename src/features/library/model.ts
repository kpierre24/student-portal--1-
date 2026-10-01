import { generateUUID } from '../../lib/idGenerator';
import { LibraryResource as LegacyLibraryResource } from '../../types';
import {
  LearningResource,
  ResourceType,
  ResourceSource,
  ResourceStatus,
  ResourceViewerType,
} from './types';

/**
 * Single Architecture Mapping:
 * LearningResource → resource.type → viewer
 *
 * Avoids fragmented silos (VideoLibrary, DocumentLibrary, PDFLibrary, LinkLibrary).
 * All items in the HTEIM repository are unified instances of LearningResource,
 * dynamically dispatched to their appropriate viewer.
 */
export function getViewerForResourceType(type: ResourceType): ResourceViewerType {
  switch (type) {
    case 'pdf':
      return 'pdf-viewer';
    case 'video':
      return 'video-player';
    case 'audio':
      return 'audio-player';
    case 'image':
      return 'image-viewer';
    case 'presentation':
      return 'presentation-viewer';
    case 'link':
      return 'external-link';
    case 'scripture':
      return 'scripture-viewer';
    case 'document':
    default:
      return 'document-viewer';
  }
}

/**
 * Resolves the canonical viewer for any LearningResource based on its type and source.
 */
export function getViewerForResource(
  resource: Pick<LearningResource, 'type' | 'source'>
): ResourceViewerType {
  return getViewerForResourceType(resource.type);
}

/**
 * Type guard for LearningResource.
 */
export function isLearningResource(obj: unknown): obj is LearningResource {
  if (!obj || typeof obj !== 'object') return false;
  const r = obj as Record<string, any>;
  return (
    typeof r.id === 'string' &&
    typeof r.title === 'string' &&
    typeof r.type === 'string' &&
    typeof r.source === 'string' &&
    typeof r.uploadedBy === 'string' &&
    typeof r.status === 'string' &&
    typeof r.isDownloadable === 'boolean' &&
    typeof r.isPublished === 'boolean' &&
    Array.isArray(r.tags)
  );
}

/**
 * Factory to create a canonical LearningResource with guaranteed defaults.
 */
export function createLearningResource(
  params: {
    title: string;
    type: ResourceType;
    source: ResourceSource;
    uploadedBy: string;
  } & Partial<LearningResource>
): LearningResource {
  const now = new Date().toISOString();
  const status: ResourceStatus = params.status || 'published';
  const isPublished = params.isPublished !== undefined ? params.isPublished : status === 'published';
  const isDownloadable =
    params.isDownloadable !== undefined
      ? params.isDownloadable
      : params.type !== 'link' && params.type !== 'scripture';

  return {
    id: params.id || generateUUID(),
    title: params.title.trim(),
    description: params.description || '',
    type: params.type,
    source: params.source,
    url: params.url,
    storagePath: params.storagePath,
    thumbnailUrl: params.thumbnailUrl,
    courseId: params.courseId || params.moduleId,
    moduleId: params.moduleId || params.courseId,
    lessonId: params.lessonId,
    category: params.category || 'Biblical Studies',
    tags: Array.isArray(params.tags) ? params.tags : [],
    uploadedBy: params.uploadedBy,
    status,
    visibility: params.visibility || 'public',
    accessLevel: params.accessLevel || 'everyone',
    allowedRoles: params.allowedRoles || [],
    allowedUserIds: params.allowedUserIds || [],
    allowedCourseIds: params.allowedCourseIds || [],
    allowedModuleIds: params.allowedModuleIds || [],
    isDownloadable,
    isPublished,
    createdAt: params.createdAt || now,
    updatedAt: params.updatedAt || now,
    // Optional curriculum & media metadata
    author: params.author,
    size: params.size,
    mimeType: params.mimeType,
    fileName: params.fileName,
    fileDataUrl: params.fileDataUrl,
    fullContent: params.fullContent,
    durationSeconds: params.durationSeconds,
    pageCount: params.pageCount,
    weekNumber: params.weekNumber,
    isRequiredReading: params.isRequiredReading,
    scriptureReferences: params.scriptureReferences,
    version: params.version || 'v1.0',
    versionsHistory: params.versionsHistory,
    completedByStudents: params.completedByStudents || [],
    viewCount: params.viewCount || 0,
    downloadCount: params.downloadCount || 0,
  };
}

/**
 * Ingests a legacy LibraryResource record and upgrades it to the canonical LearningResource model.
 * Preserves 100% of existing institutional materials and metadata.
 */
export function toLearningResource(
  legacy: LegacyLibraryResource,
  defaultUploadedBy = 'HTEIM Faculty'
): LearningResource {
  const url = legacy.downloadUrl || legacy.fileDataUrl || '';
  const lowerFmt = (legacy.format || '').toLowerCase();
  const lowerUrl = url.toLowerCase();

  let type: ResourceType = 'document';
  let source: ResourceSource = 'upload';

  if (lowerFmt.includes('youtube') || lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    type = 'video';
    source = 'youtube';
  } else if (lowerFmt.includes('vimeo') || lowerUrl.includes('vimeo.com')) {
    type = 'video';
    source = 'vimeo';
  } else if (lowerFmt.includes('video') || lowerFmt.includes('mp4') || lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm')) {
    type = 'video';
    source = url.startsWith('http') ? 'storage' : 'upload';
  } else if (lowerFmt.includes('audio') || lowerFmt.includes('mp3') || lowerUrl.endsWith('.mp3') || lowerUrl.endsWith('.wav')) {
    type = 'audio';
    source = url.startsWith('http') ? 'storage' : 'upload';
  } else if (lowerFmt.includes('pdf') || lowerUrl.endsWith('.pdf')) {
    type = 'pdf';
    source = legacy.fileDataUrl ? 'upload' : url.startsWith('http') ? 'external' : 'upload';
  } else if (lowerFmt.includes('image') || lowerFmt.includes('png') || lowerFmt.includes('jpg')) {
    type = 'image';
    source = 'upload';
  } else if (lowerFmt.includes('presentation') || lowerFmt.includes('ppt') || lowerFmt.includes('slides')) {
    type = 'presentation';
    source = 'upload';
  } else if (lowerFmt.includes('link') || lowerFmt.includes('url') || (!legacy.fileDataUrl && url.startsWith('http'))) {
    type = 'link';
    source = 'external';
  } else if (lowerFmt.includes('scripture')) {
    type = 'scripture';
    source = 'external';
  }

  const courseOrModule = legacy.moduleTrack || legacy.courseCode || '';

  return createLearningResource({
    id: legacy.id,
    title: legacy.title,
    description: legacy.summary,
    type,
    source,
    url: legacy.downloadUrl,
    fileDataUrl: legacy.fileDataUrl,
    fileName: legacy.fileName,
    mimeType: legacy.mimeType,
    fullContent: legacy.fullContent,
    courseId: courseOrModule,
    moduleId: courseOrModule,
    lessonId: legacy.lessonId,
    category: legacy.category,
    tags: legacy.tags || legacy.scriptureReferences || [],
    thumbnailUrl: legacy.thumbnailUrl,
    uploadedBy: defaultUploadedBy,
    status: legacy.status || 'published',
    visibility: legacy.visibility || 'public',
    accessLevel: (legacy.accessLevel as any) || (legacy.audience as any) || 'everyone',
    allowedRoles: legacy.allowedRoles || [],
    allowedUserIds: legacy.allowedUserIds || [],
    allowedCourseIds: legacy.allowedCourseIds || [],
    allowedModuleIds: legacy.allowedModuleIds || [],
    isDownloadable: legacy.isBorrowable !== false && type !== 'link' && type !== 'scripture',
    isPublished: legacy.isPublished !== undefined ? legacy.isPublished : true,
    createdAt: legacy.uploadedAt || new Date().toISOString(),
    updatedAt: legacy.uploadedAt || new Date().toISOString(),
    author: legacy.author,
    size: legacy.size,
    weekNumber: legacy.weekNumber,
    isRequiredReading: legacy.isRequiredReading,
    scriptureReferences: legacy.scriptureReferences,
    version: legacy.version,
    versionsHistory: legacy.versionsHistory,
    completedByStudents: legacy.completedByStudents,
    downloadCount: legacy.downloadCount,
  });
}

/**
 * Converts a canonical LearningResource back into a legacy LibraryResource
 * for backward-compatibility with existing components.
 */
export function toLegacyResource(learning: LearningResource): LegacyLibraryResource {
  return {
    id: learning.id,
    title: learning.title,
    category: learning.category || 'General',
    author: learning.author || learning.uploadedBy,
    courseCode: learning.courseId || learning.moduleId || 'SOM-GEN',
    moduleTrack: learning.moduleId || learning.courseId,
    lessonId: learning.lessonId,
    format: learning.type.toUpperCase(),
    size: learning.size || 'N/A',
    summary: learning.description || '',
    downloadUrl: learning.url,
    fileDataUrl: learning.fileDataUrl,
    fileName: learning.fileName,
    mimeType: learning.mimeType,
    fullContent: learning.fullContent,
    uploadedAt: learning.createdAt,
    downloadCount: learning.downloadCount || 0,
    versionsHistory: learning.versionsHistory,
    version: learning.version,
    isRequiredReading: learning.isRequiredReading,
    weekNumber: learning.weekNumber,
    completedByStudents: learning.completedByStudents,
    scriptureReferences: learning.scriptureReferences,
    audience: learning.accessLevel,
    accessLevel: learning.accessLevel,
    visibility: learning.visibility,
    allowedRoles: learning.allowedRoles,
    allowedUserIds: learning.allowedUserIds,
    allowedCourseIds: learning.allowedCourseIds,
    allowedModuleIds: learning.allowedModuleIds,
    status: learning.status,
    isPublished: learning.isPublished,
    tags: learning.tags,
    thumbnailUrl: learning.thumbnailUrl,
  };
}
