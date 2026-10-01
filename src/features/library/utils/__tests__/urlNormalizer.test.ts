import { describe, it, expect } from 'vitest';
import {
  normalizeUrl,
  extractYouTubeId,
  extractVimeoId,
  extractGoogleDriveId,
  extractLoomId,
  isWatchableVideoUrl,
  getNormalizedEmbedUrl,
  getNormalizedCanonicalUrl,
  parseTimeOffset
} from '../urlNormalizer';

describe('URL Normalization Service (Phase 6)', () => {
  describe('YouTube URL recognition & normalization', () => {
    it('normalizes standard watch URLs: https://www.youtube.com/watch?v=ABC12345678', () => {
      const result = normalizeUrl('https://www.youtube.com/watch?v=ABC12345678');
      expect(result.provider).toBe('youtube');
      expect(result.externalId).toBe('ABC12345678');
      expect(result.canonicalUrl).toBe('https://www.youtube.com/watch?v=ABC12345678');
      expect(result.embedUrl).toContain('https://www.youtube-nocookie.com/embed/ABC12345678');
      expect(result.thumbnailUrl).toBe('https://img.youtube.com/vi/ABC12345678/hqdefault.jpg');
      expect(result.isValid).toBe(true);
    });

    it('normalizes short URLs: https://youtu.be/ABC12345678', () => {
      const result = normalizeUrl('https://youtu.be/ABC12345678');
      expect(result.provider).toBe('youtube');
      expect(result.externalId).toBe('ABC12345678');
      expect(result.canonicalUrl).toBe('https://www.youtube.com/watch?v=ABC12345678');
      expect(result.isValid).toBe(true);
    });

    it('normalizes embed URLs: https://youtube.com/embed/ABC12345678', () => {
      const result = normalizeUrl('https://youtube.com/embed/ABC12345678');
      expect(result.provider).toBe('youtube');
      expect(result.externalId).toBe('ABC12345678');
      expect(result.isValid).toBe(true);
    });

    it('normalizes youtube-nocookie embed URLs', () => {
      const result = normalizeUrl('https://www.youtube-nocookie.com/embed/ABC12345678');
      expect(result.provider).toBe('youtube');
      expect(result.externalId).toBe('ABC12345678');
    });

    it('normalizes YouTube shorts and live streams', () => {
      const shortsResult = normalizeUrl('https://www.youtube.com/shorts/ABC12345678');
      expect(shortsResult.provider).toBe('youtube');
      expect(shortsResult.externalId).toBe('ABC12345678');

      const liveResult = normalizeUrl('https://www.youtube.com/live/ABC12345678');
      expect(liveResult.provider).toBe('youtube');
      expect(liveResult.externalId).toBe('ABC12345678');
    });

    it('preserves timestamp parameters in normalized outputs', () => {
      const result = normalizeUrl('https://www.youtube.com/watch?v=ABC12345678&t=90s');
      expect(result.provider).toBe('youtube');
      expect(result.externalId).toBe('ABC12345678');
      expect(result.timeOffsetSeconds).toBe(90);
      expect(result.embedUrl).toContain('start=90');
      expect(result.canonicalUrl).toContain('t=90s');
    });
  });

  describe('Vimeo URL recognition & normalization', () => {
    it('normalizes standard Vimeo video page URLs: https://vimeo.com/123456789', () => {
      const result = normalizeUrl('https://vimeo.com/123456789');
      expect(result.provider).toBe('vimeo');
      expect(result.externalId).toBe('123456789');
      expect(result.canonicalUrl).toBe('https://vimeo.com/123456789');
      expect(result.embedUrl).toContain('https://player.vimeo.com/video/123456789');
      expect(result.thumbnailUrl).toBe('https://vumbnail.com/123456789.jpg');
      expect(result.isValid).toBe(true);
    });

    it('normalizes Vimeo player URLs: https://player.vimeo.com/video/123456789', () => {
      const result = normalizeUrl('https://player.vimeo.com/video/123456789');
      expect(result.provider).toBe('vimeo');
      expect(result.externalId).toBe('123456789');
      expect(result.canonicalUrl).toBe('https://vimeo.com/123456789');
    });

    it('normalizes Vimeo channel, group, and manage URLs', () => {
      const channelResult = normalizeUrl('https://vimeo.com/channels/staffpicks/123456789');
      expect(channelResult.provider).toBe('vimeo');
      expect(channelResult.externalId).toBe('123456789');

      const groupResult = normalizeUrl('https://vimeo.com/groups/hteim/videos/123456789');
      expect(groupResult.provider).toBe('vimeo');
      expect(groupResult.externalId).toBe('123456789');

      const manageResult = normalizeUrl('https://vimeo.com/manage/videos/123456789');
      expect(manageResult.provider).toBe('vimeo');
      expect(manageResult.externalId).toBe('123456789');
    });
  });

  describe('Google Drive URL recognition & normalization', () => {
    it('normalizes Google Drive shared file links', () => {
      const driveUrl = 'https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o/view?usp=sharing';
      const result = normalizeUrl(driveUrl);
      expect(result.provider).toBe('gdrive');
      expect(result.externalId).toBe('1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o');
      expect(result.embedUrl).toBe('https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o/preview');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Loom URL recognition & normalization', () => {
    it('normalizes Loom share links', () => {
      const loomUrl = 'https://www.loom.com/share/abc123xyz456789';
      const result = normalizeUrl(loomUrl);
      expect(result.provider).toBe('loom');
      expect(result.externalId).toBe('abc123xyz456789');
      expect(result.embedUrl).toBe('https://www.loom.com/embed/abc123xyz456789');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Direct video and media streams', () => {
    it('recognizes direct MP4 file streams', () => {
      const directUrl = 'https://media.hteim.edu/ministry/module1_lecture.mp4';
      const result = normalizeUrl(directUrl);
      expect(result.provider).toBe('direct');
      expect(result.externalId).toBeNull();
      expect(result.embedUrl).toBe(directUrl);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Helper and utility functions', () => {
    it('extractYouTubeId extracts IDs accurately', () => {
      expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeId('https://youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeId('')).toBeNull();
      expect(extractYouTubeId(null)).toBeNull();
    });

    it('extractVimeoId extracts IDs accurately', () => {
      expect(extractVimeoId('https://vimeo.com/76979871')).toBe('76979871');
      expect(extractVimeoId('https://player.vimeo.com/video/76979871')).toBe('76979871');
      expect(extractVimeoId('')).toBeNull();
    });

    it('extractGoogleDriveId extracts Drive IDs', () => {
      expect(extractGoogleDriveId('https://drive.google.com/file/d/1XyZ01234567890abcdefghijkl/view')).toBe('1XyZ01234567890abcdefghijkl');
    });

    it('extractLoomId extracts Loom IDs', () => {
      expect(extractLoomId('https://www.loom.com/share/9876543210abcdef')).toBe('9876543210abcdef');
    });

    it('isWatchableVideoUrl correctly classifies video links', () => {
      expect(isWatchableVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isWatchableVideoUrl('https://vimeo.com/76979871')).toBe(true);
      expect(isWatchableVideoUrl('https://drive.google.com/file/d/12345678901234567890/view')).toBe(true);
      expect(isWatchableVideoUrl('https://media.hteim.edu/video.mp4')).toBe(true);
      expect(isWatchableVideoUrl('https://example.com/article.html')).toBe(false);
      expect(isWatchableVideoUrl('')).toBe(false);
    });

    it('parseTimeOffset parses compound times like 1m30s, 90s, and raw seconds', () => {
      expect(parseTimeOffset('https://youtu.be/abc?t=90')).toBe(90);
      expect(parseTimeOffset('https://youtu.be/abc?t=90s')).toBe(90);
      expect(parseTimeOffset('https://youtu.be/abc?t=1m30s')).toBe(90);
      expect(parseTimeOffset('https://youtu.be/abc?t=1h2m3s')).toBe(3723);
      expect(parseTimeOffset('https://youtu.be/abc')).toBeUndefined();
    });

    it('handles empty and null inputs safely', () => {
      const emptyResult = normalizeUrl('');
      expect(emptyResult.provider).toBe('unknown');
      expect(emptyResult.externalId).toBeNull();
      expect(emptyResult.isValid).toBe(false);

      const nullResult = normalizeUrl(null);
      expect(nullResult.provider).toBe('unknown');
      expect(nullResult.externalId).toBeNull();
      expect(nullResult.isValid).toBe(false);
    });
  });
});
