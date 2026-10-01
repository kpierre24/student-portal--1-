import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryHomepage } from '../LibraryHomepage';
import { searchAndFilterResources, matchResource } from '../../utils/searchResources';
import { LearningResource } from '../../types';

describe('Library Homepage & Search (Phases 13 & 14)', () => {
  const sampleResources: LearningResource[] = [
    {
      id: 'res-1',
      title: 'Introduction to Theology & The Godhead',
      description: 'Foundational doctrines on the Trinity, Attributes of God, and Christology.',
      type: 'pdf',
      source: 'upload',
      uploadedBy: 'Elder Renee Pierre',
      author: 'Elder Renee Pierre',
      category: 'Systematic Theology',
      courseId: 'Systematic Theology',
      tags: ['Theology', 'Trinity', 'Godhead', 'Doctrine'],
      isDownloadable: true,
      isPublished: true,
      status: 'published',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
      pageCount: 36
    },
    {
      id: 'res-2',
      title: 'Understanding the Holy Spirit & Spiritual Gifts',
      description: 'In-depth teaching on the Holy Spirit, Pneumatology, baptism of the Spirit, and spiritual warfare.',
      type: 'video',
      source: 'youtube',
      url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
      uploadedBy: 'Apostle Dr. Kendell Pierre',
      author: 'Apostle Dr. Kendell Pierre',
      category: 'Spiritual Formation',
      courseId: 'Prophetic Ministry',
      tags: ['Holy Spirit', 'Spiritual Gifts', 'Tongues', 'Discernment'],
      isDownloadable: false,
      isPublished: true,
      status: 'published',
      createdAt: '2026-08-15T12:00:00Z',
      updatedAt: '2026-08-15T12:00:00Z'
    },
    {
      id: 'res-3',
      title: 'Biblical Hermeneutics & Exegesis Principles',
      description: 'Historical-grammatical exegesis and Christocentric interpretation of scripture.',
      type: 'audio',
      source: 'storage',
      url: 'https://example.com/sermons/hermeneutics.mp3',
      uploadedBy: 'Pastor Samuel Selkridge',
      author: 'Pastor Samuel Selkridge',
      category: 'Biblical Studies',
      courseId: 'Biblical Studies',
      tags: ['Hermeneutics', 'Exegesis', 'Scripture Interpretation'],
      isDownloadable: true,
      isPublished: true,
      status: 'published',
      createdAt: '2026-07-20T09:00:00Z',
      updatedAt: '2026-07-20T09:00:00Z'
    },
    {
      id: 'res-4',
      title: 'Scriptures on the Holy Spirit — Reference Guide',
      description: 'Complete concordance of Old and New Testament passages referencing the Ruach and Holy Ghost.',
      type: 'scripture',
      source: 'external',
      uploadedBy: 'HTEIM Faculty',
      category: 'Scripture Reference',
      courseId: 'Biblical Studies',
      tags: ['Holy Spirit', 'Scripture', 'Bible Verses'],
      isDownloadable: true,
      isPublished: true,
      status: 'published',
      createdAt: '2026-08-20T08:00:00Z',
      updatedAt: '2026-08-20T08:00:00Z',
      scriptureReferences: ['John 14:26', 'Acts 1:8', '1 Corinthians 12:4-11']
    }
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  describe('Phase 14: Search Engine Logic', () => {
    it('searches by title', () => {
      const results = searchAndFilterResources(sampleResources, { query: 'Theology' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].resource.title).toContain('Theology');
    });

    it('searches by topic keyword (e.g. "Holy Spirit")', () => {
      const results = searchAndFilterResources(sampleResources, { query: 'Holy Spirit' });
      expect(results.length).toBe(2);
      const titles = results.map((r) => r.resource.title);
      expect(titles).toContain('Understanding the Holy Spirit & Spiritual Gifts');
      expect(titles).toContain('Scriptures on the Holy Spirit — Reference Guide');
    });

    it('searches by instructor name', () => {
      const results = searchAndFilterResources(sampleResources, { query: 'Kendell' });
      expect(results.length).toBe(1);
      expect(results[0].resource.author).toBe('Apostle Dr. Kendell Pierre');
    });

    it('searches by tags and category', () => {
      const results = searchAndFilterResources(sampleResources, { query: 'Exegesis' });
      expect(results.length).toBe(1);
      expect(results[0].resource.title).toContain('Biblical Hermeneutics');
    });

    it('filters by resourceType (e.g. audio, videos, documents)', () => {
      const videoResults = searchAndFilterResources(sampleResources, { resourceType: 'videos' });
      expect(videoResults.length).toBe(1);
      expect(videoResults[0].resource.type).toBe('video');

      const audioResults = searchAndFilterResources(sampleResources, { resourceType: 'audio' });
      expect(audioResults.length).toBe(1);
      expect(audioResults[0].resource.type).toBe('audio');
    });
  });

  describe('Phase 13: Library Homepage Component', () => {
    it('renders the Library header and search input', () => {
      render(
        <LibraryHomepage
          resources={sampleResources}
          onSelectResource={vi.fn()}
        />
      );

      expect(screen.getByText('LIBRARY')).toBeTruthy();
      expect(screen.getByPlaceholderText(/Search resources by title/i)).toBeTruthy();
    });

    it('renders "Continue Learning" section with progress indicators', () => {
      render(
        <LibraryHomepage
          resources={sampleResources}
          onSelectResource={vi.fn()}
        />
      );

      expect(screen.getByText(/Continue Learning/i)).toBeTruthy();
      expect(screen.getByText(/42% complete/i)).toBeTruthy();
    });

    it('renders "My Courses" curriculum tracks', () => {
      render(
        <LibraryHomepage
          resources={sampleResources}
          onSelectResource={vi.fn()}
        />
      );

      expect(screen.getByText(/My Courses/i)).toBeTruthy();
      expect(screen.getAllByText('Systematic Theology').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Biblical Studies').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Christian Leadership').length).toBeGreaterThan(0);
    });

    it('renders "Browse Resources" category cards with counts', () => {
      render(
        <LibraryHomepage
          resources={sampleResources}
          onSelectResource={vi.fn()}
        />
      );

      expect(screen.getByText(/Browse Resources/i)).toBeTruthy();
      expect(screen.getByText('Documents')).toBeTruthy();
      expect(screen.getByText('Videos')).toBeTruthy();
      expect(screen.getByText('Audio')).toBeTruthy();
    });

    it('triggers search dynamically when typing into the search field', () => {
      const handleSelect = vi.fn();
      render(
        <LibraryHomepage
          resources={sampleResources}
          onSelectResource={handleSelect}
        />
      );

      const input = screen.getByPlaceholderText(/Search resources by title/i);
      fireEvent.change(input, { target: { value: 'Holy Spirit' } });

      expect(screen.getByText(/Search Results for "Holy Spirit"/i)).toBeTruthy();
      expect(screen.getByText('Understanding the Holy Spirit & Spiritual Gifts')).toBeTruthy();
      expect(screen.getByText('Scriptures on the Holy Spirit — Reference Guide')).toBeTruthy();

      // Clicking result calls onSelectResource
      const card = screen.getByText('Understanding the Holy Spirit & Spiritual Gifts');
      fireEvent.click(card);
      expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'res-2' }));
    });
  });
});
