/**
 * Utility functions for parsing, formatting, and embedding media sources,
 * including Google Drive shared video links, YouTube embeds, Vimeo, Loom, and direct streams.
 */

import {
  normalizeUrl,
  extractYouTubeId,
  extractVimeoId,
  extractGoogleDriveId,
  extractLoomId,
  NormalizedUrlResult,
  VideoProvider
} from '../features/library/utils/urlNormalizer';

export {
  normalizeUrl,
  extractYouTubeId,
  extractVimeoId,
  extractGoogleDriveId,
  extractLoomId
};
export type { NormalizedUrlResult, VideoProvider };

export function extractGoogleDriveFileId(url: string): string | null {
  return extractGoogleDriveId(url);
}

export function getGoogleDriveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function getGoogleDriveDirectStreamUrl(fileId: string): string {
  return `/api/drive-proxy/stream/${fileId}`;
}

export function getGoogleDriveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function extractYouTubeVideoId(url: string): string | null {
  return extractYouTubeId(url);
}

export function getYouTubeEmbedUrl(videoId: string, nocookie = true): string {
  const host = nocookie ? 'www.youtube-nocookie.com' : 'www.youtube.com';
  return `https://${host}/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
}

export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function extractVimeoVideoId(url: string): string | null {
  return extractVimeoId(url);
}

export function getVimeoEmbedUrl(videoId: string): string {
  return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
}

export function extractLoomVideoId(url: string): string | null {
  return extractLoomId(url);
}

export function getLoomEmbedUrl(videoId: string): string {
  return `https://www.loom.com/embed/${videoId}`;
}

export type VideoSourceType = 'gdrive' | 'youtube' | 'vimeo' | 'loom' | 'direct';

export interface ParsedVideoMedia {
  type: VideoSourceType;
  fileId?: string;
  embedUrl: string;
  standardEmbedUrl?: string;
  directWatchUrl?: string;
  proxyStreamUrl?: string;
  originalUrl: string;
  isDrive: boolean;
  isYouTube: boolean;
  isVimeo: boolean;
  isLoom: boolean;
}

export function parseVideoMediaUrl(url: string): ParsedVideoMedia {
  if (!url) {
    return {
      type: 'direct',
      embedUrl: '',
      originalUrl: '',
      isDrive: false,
      isYouTube: false,
      isVimeo: false,
      isLoom: false,
    };
  }

  const normalized = normalizeUrl(url);

  if (normalized.provider === 'gdrive' && normalized.externalId) {
    return {
      type: 'gdrive',
      fileId: normalized.externalId,
      embedUrl: normalized.embedUrl || getGoogleDriveEmbedUrl(normalized.externalId),
      proxyStreamUrl: getGoogleDriveDirectStreamUrl(normalized.externalId),
      directWatchUrl: normalized.canonicalUrl,
      originalUrl: url,
      isDrive: true,
      isYouTube: false,
      isVimeo: false,
      isLoom: false,
    };
  }

  if (normalized.provider === 'youtube' && normalized.externalId) {
    return {
      type: 'youtube',
      fileId: normalized.externalId,
      embedUrl: normalized.embedUrl || getYouTubeEmbedUrl(normalized.externalId, true),
      standardEmbedUrl: getYouTubeEmbedUrl(normalized.externalId, false),
      directWatchUrl: normalized.canonicalUrl,
      originalUrl: url,
      isDrive: false,
      isYouTube: true,
      isVimeo: false,
      isLoom: false,
    };
  }

  if (normalized.provider === 'vimeo' && normalized.externalId) {
    return {
      type: 'vimeo',
      fileId: normalized.externalId,
      embedUrl: normalized.embedUrl || getVimeoEmbedUrl(normalized.externalId),
      originalUrl: url,
      isDrive: false,
      isYouTube: false,
      isVimeo: true,
      isLoom: false,
    };
  }

  if (normalized.provider === 'loom' && normalized.externalId) {
    return {
      type: 'loom',
      fileId: normalized.externalId,
      embedUrl: normalized.embedUrl || getLoomEmbedUrl(normalized.externalId),
      originalUrl: url,
      isDrive: false,
      isYouTube: false,
      isVimeo: false,
      isLoom: true,
    };
  }

  return {
    type: 'direct',
    embedUrl: url,
    originalUrl: url,
    isDrive: false,
    isYouTube: false,
    isVimeo: false,
    isLoom: false,
  };
}


