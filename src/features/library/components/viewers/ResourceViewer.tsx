import React from 'react';
import { ViewerBaseProps, DetectedViewerKind } from './types';
import { PdfViewer } from './PdfViewer';
import { VideoPlayer } from './VideoPlayer';
import { AudioPlayer } from './AudioPlayer';
import { ImageViewer } from './ImageViewer';
import { WebViewer } from './WebViewer';
import { ExternalViewer } from './ExternalViewer';
import { normalizeUrl, isWatchableVideoUrl } from '../../utils/urlNormalizer';

/**
 * Single Canonical Classifier for the Universal ResourceViewer:
 * Inspects resource type, format, MIME type, fileName, and URL to determine the exact viewer.
 *
 * Mapping Hierarchy:
 * PDF         -> 'pdf'         -> <PdfViewer />
 * YouTube     -> 'youtube'     -> <VideoPlayer />
 * Vimeo       -> 'vimeo'       -> <VideoPlayer />
 * Video       -> 'video'       -> <VideoPlayer />
 * Audio       -> 'audio'       -> <AudioPlayer />
 * Image       -> 'image'       -> <ImageViewer />
 * Website     -> 'website'     -> <WebViewer />
 * Unsupported -> 'unsupported' -> <ExternalViewer />
 */
export function determineViewerKind(resource: any): DetectedViewerKind {
  if (!resource) return 'unsupported';

  const type = (resource.type || '').toLowerCase();
  const format = (resource.format || '').toUpperCase();
  const rawUrl = resource.downloadUrl || resource.url || resource.fileDataUrl || '';
  const fileName = (resource.fileName || resource.title || '').toLowerCase();
  const mimeType = (resource.mimeType || '').toLowerCase();

  // 1. PDF & Presentation Determination (Presentations natively rendered via high-performance PDF slide deck)
  if (
    type === 'pdf' ||
    type === 'presentation' ||
    format === 'PDF' ||
    format === 'SLIDES' ||
    fileName.endsWith('.pdf') ||
    mimeType.includes('pdf') ||
    rawUrl.startsWith('data:application/pdf') ||
    rawUrl.includes('.pdf')
  ) {
    return 'pdf';
  }

  // 2. Audio Determination (MP3, M4A, WAV, AAC, OGG for sermons, lectures, worship recordings, audiobooks)
  if (
    type === 'audio' ||
    format === 'AUDIO' ||
    format === 'MP3' ||
    format === 'M4A' ||
    format === 'WAV' ||
    resource.category === 'Lecture Audio' ||
    resource.category === 'Sermon' ||
    resource.category === 'Worship Material' ||
    resource.category === 'Teaching Recording' ||
    resource.category === 'Audio Book' ||
    ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].some((ext) => fileName.endsWith(ext) || rawUrl.toLowerCase().includes(ext)) ||
    mimeType.startsWith('audio/')
  ) {
    return 'audio';
  }

  // 3. Video / YouTube / Vimeo Determination
  const normalized = normalizeUrl(rawUrl);
  if (normalized.isValid) {
    if (normalized.provider === 'youtube') return 'youtube';
    if (normalized.provider === 'vimeo') return 'vimeo';
    if (normalized.provider === 'gdrive' || normalized.provider === 'loom' || normalized.provider === 'direct') {
      return 'video';
    }
  }

  if (
    type === 'video' ||
    format === 'VIDEO' ||
    resource.category === 'Livestream Recording' ||
    ['.mp4', '.webm', '.mov', '.m3u8'].some((ext) => fileName.endsWith(ext)) ||
    mimeType.startsWith('video/') ||
    isWatchableVideoUrl(rawUrl)
  ) {
    return 'video';
  }

  // 4. Image Determination
  if (
    type === 'image' ||
    format === 'IMAGE' ||
    ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].some((ext) => fileName.endsWith(ext)) ||
    mimeType.startsWith('image/') ||
    rawUrl.startsWith('data:image/')
  ) {
    return 'image';
  }

  // 5. Website / Web Link Determination
  if (
    type === 'link' ||
    type === 'website' ||
    format === 'LINK' ||
    format === 'WEBSITE' ||
    resource.source === 'external' ||
    (rawUrl.startsWith('http') && !rawUrl.match(/\.(docx|doc|pdf|zip|xlsx|pptx)$/i) && type !== 'document')
  ) {
    return 'website';
  }

  // 6. Unsupported / Raw File (DOCX, ZIP, etc.) -> ExternalViewer
  return 'unsupported';
}

export interface ResourceViewerProps extends ViewerBaseProps {
  /**
   * Optional manual override of viewer kind if caller needs to force a specific display
   */
  forcedViewerKind?: DetectedViewerKind;
}

/**
 * Universal ResourceViewer (Phase 7):
 * The central heart of the HTEIM Library.
 * Receives any resource and dynamically renders the optimal viewer:
 *
 * <ResourceViewer resource={resource} />
 */
export const ResourceViewer: React.FC<ResourceViewerProps> = (props) => {
  const { resource, forcedViewerKind, className = '' } = props;

  const viewerKind: DetectedViewerKind = forcedViewerKind || determineViewerKind(resource);

  switch (viewerKind) {
    case 'pdf':
      return <PdfViewer {...props} className={className} />;

    case 'youtube':
    case 'vimeo':
    case 'video':
      return <VideoPlayer {...props} className={className} />;

    case 'audio':
      return <AudioPlayer {...props} className={className} />;

    case 'image':
      return <ImageViewer {...props} className={className} />;

    case 'website':
      return <WebViewer {...props} className={className} />;

    case 'unsupported':
    default:
      return <ExternalViewer {...props} className={className} />;
  }
};

export default ResourceViewer;
