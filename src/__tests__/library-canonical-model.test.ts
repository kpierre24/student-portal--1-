import { describe, it, expect } from 'vitest';
import {
  ResourceType,
  ResourceSource,
  ResourceStatus,
  LearningResource,
  getViewerForResourceType,
  getViewerForResource,
  isLearningResource,
  createLearningResource,
  toLearningResource,
  toLegacyResource,
} from '../features/library';
import { LibraryResource as LegacyLibraryResource } from '../types';

describe('Canonical Resource Model & Architecture (Phase 1)', () => {
  describe('Single Architecture: LearningResource → resource.type → viewer', () => {
    const typeViewerMappings: Array<{ type: ResourceType; expectedViewer: string }> = [
      { type: 'pdf', expectedViewer: 'pdf-viewer' },
      { type: 'document', expectedViewer: 'document-viewer' },
      { type: 'video', expectedViewer: 'video-player' },
      { type: 'audio', expectedViewer: 'audio-player' },
      { type: 'image', expectedViewer: 'image-viewer' },
      { type: 'presentation', expectedViewer: 'presentation-viewer' },
      { type: 'link', expectedViewer: 'external-link' },
      { type: 'scripture', expectedViewer: 'scripture-viewer' },
    ];

    typeViewerMappings.forEach(({ type, expectedViewer }) => {
      it(`resolves ${type} to ${expectedViewer} without separate subsystem libraries`, () => {
        expect(getViewerForResourceType(type)).toBe(expectedViewer);

        const resource: Pick<LearningResource, 'type' | 'source'> = {
          type,
          source: 'upload',
        };
        expect(getViewerForResource(resource)).toBe(expectedViewer);
      });
    });
  });

  describe('createLearningResource factory', () => {
    it('creates a fully populated LearningResource with default values', () => {
      const resource = createLearningResource({
        title: 'Foundations of Apostolic Doctrine',
        type: 'pdf',
        source: 'upload',
        uploadedBy: 'Dean of Academics',
        courseId: 'SOM-MOD-1',
        moduleId: 'SOM-MOD-1',
        category: 'Foundations & Biblical Studies',
        tags: ['#doctrine', '#apostolic'],
      });

      expect(resource.id).toBeDefined();
      expect(resource.id.length).toBeGreaterThan(0);
      expect(resource.title).toBe('Foundations of Apostolic Doctrine');
      expect(resource.type).toBe('pdf');
      expect(resource.source).toBe('upload');
      expect(resource.status).toBe('published');
      expect(resource.isPublished).toBe(true);
      expect(resource.isDownloadable).toBe(true);
      expect(resource.tags).toEqual(['#doctrine', '#apostolic']);
      expect(resource.createdAt).toBeDefined();
      expect(resource.updatedAt).toBeDefined();
      expect(isLearningResource(resource)).toBe(true);
    });

    it('creates draft resources correctly', () => {
      const draft = createLearningResource({
        title: 'Draft Sermon Notes',
        type: 'document',
        source: 'upload',
        uploadedBy: 'Instructor Mark',
        status: 'draft',
      });

      expect(draft.status).toBe('draft');
      expect(draft.isPublished).toBe(false);
    });

    it('sets isDownloadable to false by default for external links and scriptures', () => {
      const linkResource = createLearningResource({
        title: 'Greek Lexicon External Reference',
        type: 'link',
        source: 'external',
        url: 'https://www.blueletterbible.org',
        uploadedBy: 'Faculty',
      });
      expect(linkResource.isDownloadable).toBe(false);

      const scriptureResource = createLearningResource({
        title: 'Romans 12 Study Excerpt',
        type: 'scripture',
        source: 'external',
        uploadedBy: 'Faculty',
      });
      expect(scriptureResource.isDownloadable).toBe(false);
    });
  });

  describe('Type Guard isLearningResource', () => {
    it('validates genuine LearningResource objects', () => {
      const validResource: LearningResource = {
        id: 'res-101',
        title: 'Hermeneutics Guide',
        type: 'document',
        source: 'storage',
        uploadedBy: 'Prof. Miller',
        status: 'published',
        isDownloadable: true,
        isPublished: true,
        tags: ['hermeneutics'],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };
      expect(isLearningResource(validResource)).toBe(true);
    });

    it('rejects malformed objects or primitives', () => {
      expect(isLearningResource(null)).toBe(false);
      expect(isLearningResource(undefined)).toBe(false);
      expect(isLearningResource('string')).toBe(false);
      expect(isLearningResource({})).toBe(false);
      expect(isLearningResource({ id: '1', title: 'Missing properties' })).toBe(false);
    });
  });

  describe('Legacy LibraryResource ↔ Canonical LearningResource Interoperability', () => {
    it('converts legacy YouTube video resource correctly', () => {
      const legacyVideo: LegacyLibraryResource = {
        id: 'leg-vid-1',
        title: 'Spiritual Warfare Class Day 1',
        category: 'Ministerial Character & Ethics',
        author: 'Pastor John',
        courseCode: 'SOM-MOD-3',
        moduleTrack: 'SOM-MOD-3',
        format: 'YOUTUBE',
        size: 'N/A',
        summary: 'Class day video lecture',
        downloadUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        isRequiredReading: true,
        weekNumber: 1,
        scriptureReferences: ['Ephesians 6:10-18'],
      };

      const canonical = toLearningResource(legacyVideo);
      expect(canonical.id).toBe('leg-vid-1');
      expect(canonical.type).toBe('video');
      expect(canonical.source).toBe('youtube');
      expect(canonical.moduleId).toBe('SOM-MOD-3');
      expect(canonical.isRequiredReading).toBe(true);
      expect(canonical.weekNumber).toBe(1);
      expect(getViewerForResource(canonical)).toBe('video-player');
    });

    it('converts legacy PDF document and maps back without data loss', () => {
      const legacyPdf: LegacyLibraryResource = {
        id: 'leg-pdf-1',
        title: 'Biblical Hermeneutics Handbook',
        category: 'Foundations & Biblical Studies',
        author: 'Dr. James Smith',
        courseCode: 'SOM-MOD-1',
        format: 'PDF',
        size: '2.4 MB',
        summary: 'Comprehensive guide to biblical interpretation principles.',
        downloadUrl: 'https://assets.hteim.org/handbook.pdf',
        fileDataUrl: 'data:application/pdf;base64,JVBERi0xLjc...',
        isRequiredReading: true,
        weekNumber: 2,
        scriptureReferences: ['2 Timothy 2:15'],
        completedByStudents: ['student-123'],
      };

      const canonical = toLearningResource(legacyPdf);
      expect(canonical.type).toBe('pdf');
      expect(canonical.source).toBe('upload');
      expect(getViewerForResource(canonical)).toBe('pdf-viewer');
      expect(canonical.fileDataUrl).toBe(legacyPdf.fileDataUrl);

      // Reconvert back to legacy format for legacy consumer compatibility
      const roundTrip = toLegacyResource(canonical);
      expect(roundTrip.id).toBe(legacyPdf.id);
      expect(roundTrip.title).toBe(legacyPdf.title);
      expect(roundTrip.format).toBe('PDF');
      expect(roundTrip.fileDataUrl).toBe(legacyPdf.fileDataUrl);
      expect(roundTrip.completedByStudents).toEqual(['student-123']);
    });
  });
});
