/**
 * URL Normalization Service for Video & Media Streaming
 * 
 * Provides unified, provider-agnostic parsing and normalization for video platforms
 * (YouTube, Vimeo, Google Drive, Loom, and direct media streams).
 * 
 * Eliminates ad-hoc regex parsing across UI components and guarantees uniform
 * canonical URLs, embed endpoints, external IDs, and preview thumbnails.
 */

export type VideoProvider = 'youtube' | 'vimeo' | 'gdrive' | 'loom' | 'direct' | 'unknown';

export interface NormalizedUrlResult {
  /** Video host platform or 'direct' / 'unknown' */
  provider: VideoProvider;
  /** Primary identifier on the platform (e.g., YouTube 11-char ID, Vimeo numeric ID) */
  externalId: string | null;
  /** Normalized canonical watch / view URL */
  canonicalUrl: string;
  /** Ready-to-use secure iframe embed URL (with nocookie and minimal branding where supported) */
  embedUrl: string | null;
  /** High-quality poster/thumbnail preview URL (if extractable or derivable) */
  thumbnailUrl: string | null;
  /** Whether a recognized media source or valid URL was parsed */
  isValid: boolean;
  /** Original unparsed input URL string */
  rawUrl: string;
  /** Optional playback start offset in seconds */
  timeOffsetSeconds?: number;
}

/**
 * Extracts YouTube video ID from various URL structures:
 * - https://www.youtube.com/watch?v=ABC123
 * - https://youtu.be/ABC123
 * - https://youtube.com/embed/ABC123
 * - https://www.youtube-nocookie.com/embed/ABC123
 * - https://www.youtube.com/shorts/ABC123
 * - https://www.youtube.com/live/ABC123
 * - https://m.youtube.com/watch?v=ABC123
 * - https://www.youtube.com/v/ABC123
 */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // 1. Check standard youtu.be shortlinks (with potential params or anchor)
  const youtuBeMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (youtuBeMatch && youtuBeMatch[1]) {
    return youtuBeMatch[1];
  }

  // 2. Check embed, v, shorts, live paths
  const pathMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|youtube-nocookie\.com)\/(?:embed\/|v\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/i);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }

  // 3. Check watch?v= parameter
  const watchParamMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i);
  if (watchParamMatch && watchParamMatch[1]) {
    return watchParamMatch[1];
  }

  // 4. Any query param ?v= or &v=
  const genericVMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (genericVMatch && genericVMatch[1]) {
    return genericVMatch[1];
  }

  // 5. Bare 11-char YouTube ID (e.g. copied directly from URL)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Extracts Vimeo video ID from various URL structures:
 * - https://vimeo.com/123456789
 * - https://player.vimeo.com/video/123456789
 * - https://vimeo.com/channels/staffpicks/123456789
 * - https://vimeo.com/groups/name/videos/123456789
 * - https://vimeo.com/manage/videos/123456789
 * - https://vimeo.com/123456789?h=abcdef123
 */
export function extractVimeoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Match player.vimeo.com/video/{id}
  const playerMatch = trimmed.match(/(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/i);
  if (playerMatch && playerMatch[1]) {
    return playerMatch[1];
  }

  // Match vimeo.com/channels/.../{id} or vimeo.com/groups/.../videos/{id} or vimeo.com/manage/videos/{id}
  const channelOrGroupMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:[a-zA-Z0-9_-]+)\/|groups\/(?:[a-zA-Z0-9_-]+)\/videos\/|manage\/videos\/)(\d+)/i);
  if (channelOrGroupMatch && channelOrGroupMatch[1]) {
    return channelOrGroupMatch[1];
  }

  // Match standard vimeo.com/{id} with optional trailing query or slug
  const standardMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i);
  if (standardMatch && standardMatch[1]) {
    return standardMatch[1];
  }

  // Bare numeric string of 5-14 digits
  if (/^\d{5,14}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Extracts Google Drive file ID from standard shared links
 */
export function extractGoogleDriveId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Pattern: /file/d/{id}/view, /file/d/{id}, /open?id={id}, /uc?id={id}
  const match = trimmed.match(/(?:drive\.google\.com\/(?:file\/(?:u\/\d+\/)?d\/|open\?id=|uc\?id=)|docs\.google\.com\/.*\/d\/)([a-zA-Z0-9_-]{10,})/i);
  if (match && match[1]) {
    return match[1];
  }

  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/i);
  if (queryMatch && queryMatch[1]) {
    return queryMatch[1];
  }

  if (/^[a-zA-Z0-9_-]{10,60}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Extracts Loom video ID from share or embed links
 */
export function extractLoomId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  const match = trimmed.match(/(?:https?:\/\/)?(?:www\.)?loom\.com\/(?:share|embed)\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Parses time offset parameter from URL (e.g. ?t=90, ?t=1m30s)
 */
export function parseTimeOffset(url: string): number | undefined {
  if (!url) return undefined;
  
  // Format ?t=1h2m3s or ?t=90s or ?t=90
  const match = url.match(/[?&]t=([0-9hms]+)/i);
  if (!match || !match[1]) return undefined;

  const rawTime = match[1];

  // Pure digits: seconds
  if (/^\d+$/.test(rawTime)) {
    return parseInt(rawTime, 10);
  }

  let totalSeconds = 0;
  const hoursMatch = rawTime.match(/(\d+)h/i);
  const minsMatch = rawTime.match(/(\d+)m/i);
  const secsMatch = rawTime.match(/(\d+)s/i);

  if (hoursMatch) totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
  if (minsMatch) totalSeconds += parseInt(minsMatch[1], 10) * 60;
  if (secsMatch) totalSeconds += parseInt(secsMatch[1], 10);

  return totalSeconds > 0 ? totalSeconds : undefined;
}

/**
 * Master URL Normalizer function
 * 
 * Takes any raw URL (or video ID) and outputs a normalized provider + externalId structure
 * along with standardized canonical, embed, and thumbnail URLs.
 * 
 * Example:
 * normalizeUrl('https://www.youtube.com/watch?v=ABC123')
 * => { provider: 'youtube', externalId: 'ABC123', ... }
 * 
 * normalizeUrl('https://vimeo.com/123456789')
 * => { provider: 'vimeo', externalId: '123456789', ... }
 */
export function normalizeUrl(rawUrl: string | null | undefined): NormalizedUrlResult {
  const cleanInput = (rawUrl || '').trim();

  if (!cleanInput) {
    return {
      provider: 'unknown',
      externalId: null,
      canonicalUrl: '',
      embedUrl: null,
      thumbnailUrl: null,
      isValid: false,
      rawUrl: cleanInput,
    };
  }

  const timeOffset = parseTimeOffset(cleanInput);

  // 1. Check YouTube
  const youtubeId = extractYouTubeId(cleanInput);
  if (youtubeId) {
    const timeParam = timeOffset ? `?start=${timeOffset}` : '';
    const canonicalTime = timeOffset ? `&t=${timeOffset}s` : '';
    return {
      provider: 'youtube',
      externalId: youtubeId,
      canonicalUrl: `https://www.youtube.com/watch?v=${youtubeId}${canonicalTime}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}${timeParam ? `${timeParam}&` : '?'}rel=0&modestbranding=1&playsinline=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      isValid: true,
      rawUrl: cleanInput,
      timeOffsetSeconds: timeOffset,
    };
  }

  // 2. Check Vimeo
  const vimeoId = extractVimeoId(cleanInput);
  if (vimeoId) {
    const timeParam = timeOffset ? `#t=${timeOffset}s` : '';
    return {
      provider: 'vimeo',
      externalId: vimeoId,
      canonicalUrl: `https://vimeo.com/${vimeoId}${timeParam}`,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=0&title=0&byline=0${timeOffset ? `&#t=${timeOffset}s` : ''}`,
      thumbnailUrl: `https://vumbnail.com/${vimeoId}.jpg`,
      isValid: true,
      rawUrl: cleanInput,
      timeOffsetSeconds: timeOffset,
    };
  }

  // 3. Check Google Drive
  const gdriveId = extractGoogleDriveId(cleanInput);
  if (gdriveId) {
    return {
      provider: 'gdrive',
      externalId: gdriveId,
      canonicalUrl: `https://drive.google.com/file/d/${gdriveId}/view`,
      embedUrl: `https://drive.google.com/file/d/${gdriveId}/preview`,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${gdriveId}&sz=w640`,
      isValid: true,
      rawUrl: cleanInput,
    };
  }

  // 4. Check Loom
  const loomId = extractLoomId(cleanInput);
  if (loomId) {
    return {
      provider: 'loom',
      externalId: loomId,
      canonicalUrl: `https://www.loom.com/share/${loomId}`,
      embedUrl: `https://www.loom.com/embed/${loomId}`,
      thumbnailUrl: `https://cdn.loom.com/sessions/thumbnails/${loomId}-with-play.gif`,
      isValid: true,
      rawUrl: cleanInput,
    };
  }

  // 5. Check direct media file stream (mp4, webm, ogg, mp3, etc.)
  const isDirectMedia = /\.(mp4|webm|ogv|mov|m4v|mp3|wav|aac|m3u8)(\?.*)?$/i.test(cleanInput);
  if (isDirectMedia) {
    return {
      provider: 'direct',
      externalId: null,
      canonicalUrl: cleanInput,
      embedUrl: cleanInput,
      thumbnailUrl: null,
      isValid: true,
      rawUrl: cleanInput,
      timeOffsetSeconds: timeOffset,
    };
  }

  // 6. Generic web URL
  const isGenericHttpUrl = /^https?:\/\//i.test(cleanInput);
  return {
    provider: isGenericHttpUrl ? 'unknown' : 'unknown',
    externalId: null,
    canonicalUrl: cleanInput,
    embedUrl: isGenericHttpUrl ? cleanInput : null,
    thumbnailUrl: null,
    isValid: isGenericHttpUrl,
    rawUrl: cleanInput,
  };
}

/**
 * Convenience helper: check if an arbitrary URL is a recognized watchable video
 */
export function isWatchableVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const normalized = normalizeUrl(url);
  return normalized.isValid && (
    normalized.provider === 'youtube' ||
    normalized.provider === 'vimeo' ||
    normalized.provider === 'gdrive' ||
    normalized.provider === 'loom' ||
    normalized.provider === 'direct'
  );
}

/**
 * Convenience helper: get embed URL directly
 */
export function getNormalizedEmbedUrl(url: string | null | undefined): string | null {
  return normalizeUrl(url).embedUrl;
}

/**
 * Convenience helper: get canonical watch URL directly
 */
export function getNormalizedCanonicalUrl(url: string | null | undefined): string {
  return normalizeUrl(url).canonicalUrl;
}

export interface WebEmbedCheckResult {
  canEmbed: boolean;
  reason?: string;
  isHttpMixedContent?: boolean;
  suggestedAction: 'embed' | 'external';
}

const KNOWN_BLOCKED_IFRAME_DOMAINS = [
  'google.com',
  'www.google.com',
  'wikipedia.org',
  'en.wikipedia.org',
  'biblegateway.com',
  'www.biblegateway.com',
  'blueletterbible.org',
  'www.blueletterbible.org',
  'biblehub.com',
  'www.biblehub.com',
  'youversion.com',
  'www.youversion.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'www.facebook.com',
  'instagram.com',
  'www.instagram.com',
  'linkedin.com',
  'www.linkedin.com',
  'reddit.com',
  'www.reddit.com',
  'github.com',
  'nytimes.com',
  'www.nytimes.com',
  'washingtonpost.com',
  'wsj.com',
  'amazon.com',
  'www.amazon.com',
  'apple.com',
  'medium.com',
  'substack.com',
  'tiktok.com',
  'pinterest.com'
];

/**
 * Validates if an external website can be embedded within an in-app iframe
 * without violating Content-Security-Policy or X-Frame-Options policies.
 */
export function checkWebsiteEmbeddability(
  url: string | null | undefined,
  resourceOverride?: { allowEmbedding?: boolean; embeddable?: boolean }
): WebEmbedCheckResult {
  if (!url) {
    return {
      canEmbed: false,
      reason: 'No URL provided',
      suggestedAction: 'external'
    };
  }

  // Explicit override on resource if provided
  if (resourceOverride?.allowEmbedding === false || resourceOverride?.embeddable === false) {
    return {
      canEmbed: false,
      reason: 'Resource has disabled in-app embedding',
      suggestedAction: 'external'
    };
  }

  const trimmed = url.trim();

  // Mixed content check (http:// on https:// context)
  if (trimmed.startsWith('http://')) {
    return {
      canEmbed: false,
      isHttpMixedContent: true,
      reason: 'HTTP websites cannot be embedded in secure HTTPS applications (Mixed Content policy)',
      suggestedAction: 'external'
    };
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    // Check Google Docs/Sheets/Drive preview vs general Google
    if (host.includes('docs.google.com') || host.includes('drive.google.com')) {
      if (parsed.pathname.includes('/preview') || parsed.pathname.includes('/pubhtml')) {
        return { canEmbed: true, suggestedAction: 'embed' };
      }
    }

    // Check known blocked domains
    const isBlockedDomain = KNOWN_BLOCKED_IFRAME_DOMAINS.some(
      (blocked) => host === blocked || host.endsWith('.' + blocked)
    );

    if (isBlockedDomain) {
      return {
        canEmbed: false,
        reason: `Website security policies (${host}) prevent in-app frame embedding (X-Frame-Options: SAMEORIGIN / DENY)`,
        suggestedAction: 'external'
      };
    }

    // Explicit embed URLs (like YouTube / Vimeo / codepen / widgets)
    if (
      host.includes('youtube-nocookie.com') ||
      host.includes('player.vimeo.com') ||
      host.includes('loom.com') ||
      parsed.pathname.includes('/embed')
    ) {
      return { canEmbed: true, suggestedAction: 'embed' };
    }

    // Default for arbitrary external websites: many block iframes
    if (resourceOverride?.allowEmbedding === true || resourceOverride?.embeddable === true) {
      return { canEmbed: true, suggestedAction: 'embed' };
    }

    // By default, external non-embed endpoints are treated as external
    return {
      canEmbed: false,
      reason: 'External website requires direct browser session due to modern security policies',
      suggestedAction: 'external'
    };
  } catch {
    return {
      canEmbed: false,
      reason: 'Invalid URL format',
      suggestedAction: 'external'
    };
  }
}

