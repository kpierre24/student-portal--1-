import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { determineViewerKind, ResourceViewer } from '../ResourceViewer';
import { PdfViewer } from '../PdfViewer';
import { VideoPlayer } from '../VideoPlayer';
import { AudioPlayer } from '../AudioPlayer';
import { ImageViewer } from '../ImageViewer';
import { WebViewer } from '../WebViewer';

// Mock canvas rendering for PDF.js in JSDOM
vi.mock('../../../../lib/pdfUtils', () => ({
  dataUrlToUint8Array: vi.fn(() => new Uint8Array([1, 2, 3])),
  extractTextFromPdfData: vi.fn().mockResolvedValue({
    numPages: 42,
    extractedText: 'Holy Spirit Anointing and Ministry Power',
    pageTexts: ['Introduction to Ministry', 'The Anointing', 'Page 17 Deep Dive Notes']
  }),
  renderPdfPageToCanvas: vi.fn().mockResolvedValue({ width: 600, height: 800 })
}));

describe('Universal ResourceViewer (Phase 7)', () => {
  describe('determineViewerKind classifier', () => {
    it('classifies PDF resources', () => {
      expect(determineViewerKind({ type: 'pdf', title: 'Module 1 Notes' })).toBe('pdf');
      expect(determineViewerKind({ format: 'PDF', downloadUrl: 'https://example.com/doc.pdf' })).toBe('pdf');
      expect(determineViewerKind({ fileName: 'lecture_handout.pdf' })).toBe('pdf');
    });

    it('classifies YouTube videos', () => {
      expect(determineViewerKind({ url: 'https://www.youtube.com/watch?v=ABC12345678' })).toBe('youtube');
      expect(determineViewerKind({ downloadUrl: 'https://youtu.be/ABC12345678' })).toBe('youtube');
    });

    it('classifies Vimeo videos', () => {
      expect(determineViewerKind({ url: 'https://vimeo.com/123456789' })).toBe('vimeo');
      expect(determineViewerKind({ downloadUrl: 'https://player.vimeo.com/video/123456789' })).toBe('vimeo');
    });

    it('classifies generic videos and Google Drive links', () => {
      expect(determineViewerKind({ type: 'video', downloadUrl: 'https://media.hteim.edu/stream.mp4' })).toBe('video');
      expect(determineViewerKind({ url: 'https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view' })).toBe('video');
    });

    it('classifies audio resources', () => {
      expect(determineViewerKind({ type: 'audio', title: 'Sermon Audio' })).toBe('audio');
      expect(determineViewerKind({ format: 'AUDIO', downloadUrl: 'https://media.hteim.edu/sermon.mp3' })).toBe('audio');
      expect(determineViewerKind({ fileName: 'recording.m4a' })).toBe('audio');
    });

    it('classifies image resources', () => {
      expect(determineViewerKind({ type: 'image', title: 'Tabernacle Chart' })).toBe('image');
      expect(determineViewerKind({ fileName: 'diagram.png' })).toBe('image');
      expect(determineViewerKind({ mimeType: 'image/jpeg' })).toBe('image');
    });

    it('classifies website and link resources', () => {
      expect(determineViewerKind({ type: 'link', url: 'https://biblegateway.com' })).toBe('website');
      expect(determineViewerKind({ type: 'website', url: 'https://hteim.org/study' })).toBe('website');
    });

    it('classifies unsupported file formats to external viewer', () => {
      expect(determineViewerKind({ type: 'document', format: 'DOCX', fileName: 'essay.docx' })).toBe('unsupported');
      expect(determineViewerKind({ format: 'ZIP', fileName: 'materials.zip' })).toBe('unsupported');
    });
  });

  describe('ResourceViewer component dispatching', () => {
    it('renders PdfViewer when resource is a PDF', () => {
      const pdfResource = {
        id: 'res-pdf-1',
        title: 'Curriculum Syllabus',
        type: 'pdf' as const,
        source: 'upload' as const,
        tags: [],
        uploadedBy: 'Faculty',
        status: 'published' as const,
        isDownloadable: true,
        isPublished: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        url: 'https://example.com/syllabus.pdf'
      };

      render(<ResourceViewer resource={pdfResource} />);
      expect(screen.getByText('Curriculum Syllabus')).toBeTruthy();
      expect(screen.getAllByText(/PDF/i).length).toBeGreaterThan(0);
    });

    it('renders VideoPlayer when resource is YouTube', () => {
      const videoResource = {
        id: 'res-vid-1',
        title: 'Anointing Sermon Video',
        type: 'video' as const,
        source: 'youtube' as const,
        tags: [],
        uploadedBy: 'Faculty',
        status: 'published' as const,
        isDownloadable: false,
        isPublished: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        url: 'https://www.youtube.com/watch?v=ABC12345678'
      };

      render(<ResourceViewer resource={videoResource} />);
      expect(screen.getAllByText('Anointing Sermon Video').length).toBeGreaterThan(0);
      expect(screen.getByText('youtube')).toBeTruthy();
    });
  });
});

describe('PdfViewer (Phase 8)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders page navigation controls and current page', () => {
    const resource = {
      id: 'res-pdf-nav',
      title: 'Module 1 Study Guide',
      type: 'pdf' as const,
      source: 'upload' as const,
      tags: [],
      uploadedBy: 'Admin',
      status: 'published' as const,
      isDownloadable: true,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      downloadUrl: 'https://example.com/guide.pdf'
    };

    render(<PdfViewer resource={resource} />);
    expect(screen.getByText('Module 1 Study Guide')).toBeTruthy();
    expect(screen.getByLabelText('Previous page')).toBeTruthy();
    expect(screen.getByLabelText('Next page')).toBeTruthy();
    expect(screen.getByLabelText('Page number')).toBeTruthy();
  });

  it('detects saved progress and shows "Continue reading" banner', () => {
    const resourceId = 'res-pdf-resume-test';
    // Store saved progress on page 17
    localStorage.setItem(`hteim_pdf_progress_${resourceId}`, '17');

    const resource = {
      id: resourceId,
      title: 'Hermeneutics Textbook',
      type: 'pdf' as const,
      source: 'upload' as const,
      tags: [],
      uploadedBy: 'Admin',
      status: 'published' as const,
      isDownloadable: true,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      downloadUrl: 'https://example.com/textbook.pdf'
    };

    render(<PdfViewer resource={resource} />);

    // Check that "Continue reading" banner appears
    expect(screen.getByText(/Continue reading:/i)).toBeTruthy();

    const continueBtn = screen.getByText(/Continue from page 17/i);
    expect(continueBtn).toBeTruthy();

    // Click continue button
    fireEvent.click(continueBtn);

    // Page input should update to 17
    const pageInput = screen.getByLabelText('Page number') as HTMLInputElement;
    expect(pageInput.value).toBe('17');
  });

  it('respects canDownload permission', () => {
    const resource = {
      id: 'res-pdf-nodownload',
      title: 'Restricted Exam Guide',
      type: 'pdf' as const,
      source: 'upload' as const,
      tags: [],
      uploadedBy: 'Admin',
      status: 'published' as const,
      isDownloadable: false, // Forbidden
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      downloadUrl: 'https://example.com/exam.pdf'
    };

    render(<PdfViewer resource={resource} canDownload={false} />);
    const downloadBtn = screen.getByTitle(/Downloads restricted/i);
    expect(downloadBtn.hasAttribute('disabled')).toBe(true);
  });
});

describe('VideoPlayer (Phase 9)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders YouTube video with course metadata, instructor, description, and action buttons', () => {
    const resource = {
      id: 'res-vid-youtube',
      title: 'Introduction to Theology',
      courseName: 'Systematic Theology',
      instructor: 'Elder Renee Pierre',
      description: 'Foundational exploration of divine revelation and the nature of biblical theology.',
      type: 'video' as const,
      source: 'youtube' as const,
      tags: [],
      uploadedBy: 'Admin',
      status: 'published' as const,
      isDownloadable: false,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    };

    render(<VideoPlayer resource={resource} />);

    // Check titles and metadata hierarchy
    expect(screen.getAllByText('Introduction to Theology').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Systematic Theology/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Instructor:/i)).toBeTruthy();
    expect(screen.getByText(/Elder Renee Pierre/i)).toBeTruthy();
    expect(screen.getByText(/Foundational exploration of divine revelation/i)).toBeTruthy();

    // Check required Phase 9 action buttons
    expect(screen.getByText(/Mark as Complete/i)).toBeTruthy();
    expect(screen.getByText(/Save/i)).toBeTruthy();
    expect(screen.getByText(/Download/i)).toBeTruthy();
  });

  it('toggles complete and save state with persistence', () => {
    const resource = {
      id: 'res-vid-toggle',
      title: 'Hermeneutics Part 1',
      type: 'video' as const,
      source: 'upload' as const,
      tags: [],
      uploadedBy: 'Admin',
      status: 'published' as const,
      isDownloadable: true,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      downloadUrl: 'https://cdn.hteim.edu/videos/herm1.mp4'
    };

    render(<VideoPlayer resource={resource} />);

    const completeBtn = screen.getByText(/Mark as Complete/i);
    fireEvent.click(completeBtn);

    expect(screen.getAllByText(/Completed/i).length).toBeGreaterThan(0);
    expect(localStorage.getItem('hteim_resource_completed_res-vid-toggle')).toBe('true');

    const saveBtn = screen.getByText(/Save/i);
    fireEvent.click(saveBtn);

    expect(screen.getAllByText(/Saved/i).length).toBeGreaterThan(0);
    expect(localStorage.getItem('hteim_resource_saved_res-vid-toggle')).toBe('true');
  });

  it('renders Vimeo embed when provider is Vimeo', () => {
    const resource = {
      id: 'res-vid-vimeo',
      title: 'Praise & Worship Leadership',
      type: 'video' as const,
      source: 'vimeo' as const,
      tags: [],
      uploadedBy: 'Admin',
      status: 'published' as const,
      isDownloadable: false,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      url: 'https://vimeo.com/76979871'
    };

    render(<VideoPlayer resource={resource} />);
    expect(screen.getByText('vimeo')).toBeTruthy();
  });
});

describe('WebViewer Security & Embedding (Phase 10)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('displays non-embeddable warning when website blocks iframes', () => {
    const resource = {
      id: 'res-web-blocked',
      title: 'Bible Gateway Study Reference',
      courseName: 'Old Testament Survey',
      instructor: 'Elder David',
      description: 'Comprehensive cross-reference scripture tool.',
      type: 'link' as const,
      source: 'external' as const,
      tags: [],
      uploadedBy: 'Admin',
      status: 'published' as const,
      isDownloadable: false,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      url: 'https://www.biblegateway.com/passage/?search=Genesis+1&version=NIV'
    };

    render(<WebViewer resource={resource} />);

    // Must display explicit security message
    expect(
      screen.getByText(/This website cannot be displayed inside the School of Ministry app/i)
    ).toBeTruthy();

    // Must provide Open Website ↗ button
    const openBtns = screen.getAllByText(/Open Website ↗/i);
    expect(openBtns.length).toBeGreaterThan(0);
    const link = openBtns[0].closest('a');
    expect(link?.getAttribute('href')).toBe(resource.url);
    expect(link?.getAttribute('target')).toBe('_blank');
  });

  it('embeds iframe when resource explicitly allows embedding or is embeddable', () => {
    const resource = {
      id: 'res-web-embeddable',
      title: 'Interactive Ministry Timeline Widget',
      type: 'link' as const,
      source: 'external' as const,
      tags: [],
      uploadedBy: 'Admin',
      status: 'published' as const,
      isDownloadable: false,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      url: 'https://docs.google.com/document/d/123/preview',
      allowEmbedding: true
    };

    render(<WebViewer resource={resource} />);
    expect(screen.getByText(/In-App Frame View:/i)).toBeTruthy();
  });
});

describe('Phase 11 — Audio Player (MP3, M4A, WAV)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders audio player with controls, seek, volume, speed, and metadata', () => {
    const audioResource = {
      id: 'res-audio-sermon',
      title: 'Walking in Prophetic Anointing',
      type: 'audio' as const,
      format: 'MP3' as const,
      source: 'upload' as const,
      tags: ['Holy Spirit', 'Sermon'],
      uploadedBy: 'Elder Renee Pierre',
      status: 'published' as const,
      isDownloadable: true,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      downloadUrl: 'https://media.hteim.edu/audio/sermon.mp3',
      courseName: 'Spiritual Formation',
      description: 'Anointed sermon on walking in the gifts of the Spirit.'
    };

    render(<AudioPlayer resource={audioResource} />);

    // Metadata
    expect(screen.getAllByText('Walking in Prophetic Anointing').length).toBeGreaterThan(0);
    expect(screen.getByText('Spiritual Formation')).toBeTruthy();
    expect(screen.getByText(/Elder Renee Pierre/i)).toBeTruthy();

    // Speed controls
    expect(screen.getByText('1x')).toBeTruthy();
    expect(screen.getByText('1.5x')).toBeTruthy();
    expect(screen.getByText('2x')).toBeTruthy();

    // Action buttons
    expect(screen.getByText(/Mark as Complete/i)).toBeTruthy();
    expect(screen.getByText(/Save/i)).toBeTruthy();
    expect(screen.getByText(/Download/i)).toBeTruthy();
  });

  it('supports M4A and WAV format audio through Universal ResourceViewer', () => {
    const wavResource = {
      id: 'res-audio-wav',
      title: 'Worship Atmosphere Recording',
      type: 'audio' as const,
      format: 'WAV' as const,
      source: 'upload' as const,
      tags: ['Worship'],
      uploadedBy: 'Elder Pierre',
      status: 'published' as const,
      isDownloadable: true,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      downloadUrl: 'https://media.hteim.edu/audio/worship.wav'
    };

    expect(determineViewerKind(wavResource)).toBe('audio');
    render(<ResourceViewer resource={wavResource} />);
    expect(screen.getAllByText('Worship Atmosphere Recording').length).toBeGreaterThan(0);
    expect(screen.getByText(/WAV Audio/i)).toBeTruthy();
  });

  it('toggles completion and save state with persistence in localStorage', () => {
    const audioResource = {
      id: 'res-audio-state-test',
      title: 'Systematic Theology Audio Lecture',
      type: 'audio' as const,
      format: 'M4A' as const,
      source: 'upload' as const,
      tags: [],
      uploadedBy: 'Teacher',
      status: 'published' as const,
      isDownloadable: true,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      downloadUrl: 'https://media.hteim.edu/audio/lecture.m4a'
    };

    render(<AudioPlayer resource={audioResource} />);

    const completeBtn = screen.getByText(/Mark as Complete/i);
    fireEvent.click(completeBtn);
    expect(screen.getByText(/✓ Completed/i)).toBeTruthy();
    expect(localStorage.getItem('hteim_resource_completed_res-audio-state-test')).toBe('true');

    const saveBtn = screen.getByText(/♡ Save/i);
    fireEvent.click(saveBtn);
    expect(screen.getByText(/♥ Saved/i)).toBeTruthy();
    expect(localStorage.getItem('hteim_resource_saved_res-audio-state-test')).toBe('true');
  });
});

describe('Phase 12 — Images & Presentations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders ImageViewer with zoom, rotate, download, and mobile swipe support', () => {
    const imageResource = {
      id: 'res-image-tabernacle',
      title: 'Tabernacle Furniture & Priestly Order Diagram',
      type: 'image' as const,
      format: 'PNG' as const,
      source: 'upload' as const,
      tags: ['Old Testament', 'Diagram'],
      uploadedBy: 'Elder Renee Pierre',
      status: 'published' as const,
      isDownloadable: true,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      downloadUrl: 'https://media.hteim.edu/images/tabernacle.png',
      courseName: 'Old Testament Survey'
    };

    render(<ImageViewer resource={imageResource} />);

    // Metadata & zoom indicator
    expect(screen.getAllByText('Tabernacle Furniture & Priestly Order Diagram').length).toBeGreaterThan(0);
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);

    // Zoom In
    const zoomInBtn = screen.getByLabelText(/Zoom in/i);
    fireEvent.click(zoomInBtn);
    expect(screen.getAllByText('125%').length).toBeGreaterThan(0);

    // Zoom Out
    const zoomOutBtn = screen.getByLabelText(/Zoom out/i);
    fireEvent.click(zoomOutBtn);
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);

    // Rotate
    const rotateBtn = screen.getByLabelText(/Rotate image/i);
    fireEvent.click(rotateBtn);

    // Reset
    const resetBtn = screen.getByLabelText(/Reset zoom/i);
    fireEvent.click(resetBtn);
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);

    // Mobile Swipe touch events
    const container = screen.getByText('Old Testament Survey').closest('div')?.parentElement?.parentElement;
    if (container) {
      fireEvent.touchStart(container, {
        touches: [{ clientX: 200, clientY: 100 }]
      });
      fireEvent.touchEnd(container, {
        changedTouches: [{ clientX: 300, clientY: 100 }]
      });
      expect(screen.getByText('Swiped Right')).toBeTruthy();
    }
  });

  it('routes presentation slide decks to PDF viewer for optimal presentation delivery', () => {
    const presentationResource = {
      id: 'res-pres-theology',
      title: 'Christology & Pneumatology Slide Deck',
      type: 'presentation' as const,
      format: 'PDF' as const,
      source: 'upload' as const,
      tags: ['Slides', 'Systematic Theology'],
      uploadedBy: 'Elder Pierre',
      status: 'published' as const,
      isDownloadable: true,
      isPublished: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      downloadUrl: 'https://media.hteim.edu/slides/christology.pdf'
    };

    expect(determineViewerKind(presentationResource)).toBe('pdf');
    render(<ResourceViewer resource={presentationResource} />);
    expect(screen.getAllByText('Christology & Pneumatology Slide Deck').length).toBeGreaterThan(0);
  });
});


