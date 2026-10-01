# 📚 HTEIM School of Ministry — Library Implementation Checklist
**Task Code:** `0.3 Create a Library implementation checklist`  
**System Module:** Digital Library, Media Center & Resource Repository  
**Target Platform:** Web (Vite + React 18), PWA (Offline Buffered), Android (Capacitor)  
**Last Updated:** September 2026  

---

## 🎯 Executive Overview & Scope

The **HTEIM School of Ministry Digital Library** provides a unified academic repository for theological study guides, syllabus handouts, curriculum textbooks, ministry media (video lectures, sermon audio, YouTube & Vimeo broadcasts), and external research links across the 6 core curriculum modules (`SOM-MOD-1` to `SOM-MOD-6`).

This checklist governs the continuous evolution, refactoring, and feature expansion of the Library module while strictly preserving existing institutional materials, user bookmarks, reading histories, and attendance/gradebook associations.

---

## 📋 Master Implementation Tracker (25 Points)

| # | Feature Track | Current Status | Priority | Target Sub-components / Modules |
|---|---------------|----------------|----------|----------------------------------|
| **1** | [Existing Library Preserved](#1-existing-library-preserved) | ✅ Completed / Preserved | `P0 (Critical)` | `LibraryTab.tsx`, `libraryService.ts`, `types.ts` |
| **2** | [Resource Model](#2-resource-model) | ✅ Completed (Phase 1) | `P0 (Critical)` | `types.ts`, `src/features/library/types.ts`, `model.ts` |
| **3** | [Upload](#3-upload) | 🔄 In Progress | `P1 (High)` | Drag-and-drop, Base64/Blob, Mammoth DOCX, Supabase Storage |
| **4** | [External Links](#4-external-links) | 🔄 In Progress | `P1 (High)` | Safe external link handlers, study portals, Google Docs |
| **5** | [YouTube](#5-youtube) | ✅ Completed | `P1 (High)` | `ClassroomMediaPlayer.tsx`, `mediaUtils.ts`, 16:9 embeds |
| **6** | [Vimeo](#6-vimeo) | ✅ Completed | `P1 (High)` | Vimeo player integration, direct & standard ID parsers |
| **7** | [PDF Viewer](#7-pdf-viewer) | ✅ Completed | `P0 (Critical)` | `DocumentReaderModal.tsx`, pagination, jump-to-page |
| **8** | [Video Viewer](#8-video-viewer) | ✅ Completed | `P1 (High)` | HTML5 video player, speed toggles (0.75x–2x), theater mode |
| **9** | [Audio Viewer](#9-audio-viewer) | ✅ Completed | `P1 (High)` | Custom audio scrubber, playback rate, 15s skip |
| **10** | [Image Viewer](#10-image-viewer) | 🔄 In Progress | `P2 (Medium)` | Fullscreen lightbox, zoom/pan for theological diagrams & maps |
| **11** | [Search](#11-search) | ✅ Completed | `P1 (High)` | Full-text search (title, author, summary, content, scriptures) |
| **12** | [Filters](#12-filters) | ✅ Completed | `P1 (High)` | Format, required reading, module, audience, completion |
| **13** | [Categories](#13-categories) | ✅ Completed | `P1 (High)` | Biblical Studies, Pastoral, Evangelism, Ethics, Leadership |
| **14** | [Tags](#14-tags) | 🔄 In Progress | `P2 (Medium)` | Tag cloud, multi-select tag filtering, auto-suggest tags |
| **15** | [Course Association](#15-course-association) | ✅ Completed | `P0 (Critical)` | Modules 1–6 (`SOM-MOD-1`..`6`), Week numbers, Class Day links |
| **16** | [Permissions](#16-permissions) | ✅ Completed | `P0 (Critical)` | RBAC (`admin`, `teacher`, `student`), API guards (`/api/library`) |
| **17** | [Favorites](#17-favorites) | 🔄 In Progress | `P1 (High)` | Star/Bookmark toggle, student favorites filter tab, persistence |
| **18** | [Recent Resources](#18-recent-resources) | 🔄 In Progress | `P2 (Medium)` | "Recently Added" badge, "Continue Reading / History" tray |
| **19** | [Progress](#19-progress) | 🔄 In Progress | `P1 (High)` | % reading progress, audio/video timestamp tracking |
| **20** | [Completion](#20-completion) | 🔄 In Progress | `P1 (High)` | "Mark as Complete" toggle, curriculum progress credit |
| **21** | [Teacher Management](#21-teacher-management) | ✅ Completed | `P0 (Critical)` | Teacher CRUD modal, required reading flags, version history |
| **22** | [Student Experience](#22-student-experience) | ✅ Completed | `P1 (High)` | Distraction-free reader, scripture hover popovers, study notes |
| **23** | [Analytics](#23-analytics) | 🔄 In Progress | `P2 (Medium)` | Resource view counts, download audit, student reading coverage |
| **24** | [Mobile](#24-mobile) | ✅ Completed | `P1 (High)` | Touch targets (44px min), mobile drawer, responsive cards |
| **25** | [Tests](#25-tests) | 🔄 In Progress | `P1 (High)` | Unit tests, viewer component tests, RBAC integration tests |

---

## 🔍 Detailed Track Specifications & Acceptance Criteria

---

### 1. Existing Library Preserved
- [x] **Zero Data Regression**: Retain all legacy resources loaded from default seed fixtures and existing `localStorage` keys (`hteim_school_library_resources`, `hteim_library_resources`).
- [x] **Dual Schema Backward Compatibility**: Ensure legacy `LibraryResource` objects seamlessly coexist with new extended `Book` and `MediaResource` entities.
- [x] **Classroom Media Coexistence**: Preserve `DEFAULT_PRESET_MEDIA` (Orientation, Evangelism, Apostolic Leadership videos) without overwriting user-uploaded materials.
- [ ] **Data Migration Script**: Provide idempotent schema migration helper to backfill missing fields (`tags: []`, `favorites: []`, `progress: {}`) on older records upon startup.

---

### 2. Resource Model
- [x] **Canonical Single Architecture (`LearningResource`)**: Standardized in `src/features/library/types.ts`, `src/features/library/model.ts`, and `src/types.ts`.
- [x] **Universal Types**: `ResourceType` (`document` | `pdf` | `video` | `audio` | `image` | `presentation` | `link` | `scripture`).
- [x] **Universal Sources**: `ResourceSource` (`upload` | `youtube` | `vimeo` | `external` | `storage`).
- [x] **Universal Statuses**: `ResourceStatus` (`draft` | `published` | `archived`).
- [x] **Single-Pipeline Dynamic Dispatch**: Implemented `getViewerForResource` (`LearningResource → resource.type → viewer`), strictly rejecting segregated subsystem silos (`VideoLibrary`, `DocumentLibrary`, etc.).
- [x] **Interoperability & Factory**: Provided `createLearningResource`, `toLearningResource`, and `toLegacyResource` ensuring 100% backward-compatibility and zero regression for existing materials.
- [x] **Unit Testing**: 15 comprehensive unit tests verifying type-to-viewer routing, factory defaults, type guards, and bidirectional legacy conversions (`src/__tests__/library-canonical-model.test.ts`).

---

### 3. Upload
- [x] **Drag-and-Drop + File Input**: Supports drag-and-drop zone and manual click-to-browse file picker.
- [x] **Mammoth DOCX Text Extraction**: Client-side conversion of `.docx` documents to clean plain text and HTML, stripping binary zip bytes (`PK\x03\x04`).
- [x] **Base64 / Data URL Encoding**: Instant local offline preview storage for files under browser storage limits.
- [ ] **Supabase Storage Integration**: Direct chunked upload to `library-documents` and `library-media` storage buckets for large PDF/audio/video files (>10MB).
- [ ] **Upload Progress Bar**: Visual upload progress percentage indicator with cancel option.

---

### 4. External Links
- [x] **Link Creation**: Teachers can attach external study links (e.g. Bible Gateway, Blue Letter Bible, research portals, Google Drive).
- [x] **Security Hardening**: Enforce `target="_blank"` and `rel="noopener noreferrer"` on all external links to prevent reverse tabnabbing.
- [ ] **Link Preview Card**: Auto-detect domain favicon and generate rich link card preview (domain badge, external icon).
- [ ] **Safe URL Protocol Validator**: Reject `javascript:`, `data:`, or malformed URLs; enforce `http://` or `https://`.

---

### 5. YouTube
- [x] **URL Parser (`parseVideoMediaUrl`)**: Supports standard `youtube.com/watch?v=ID`, short `youtu.be/ID`, and embed `youtube.com/embed/ID` links.
- [x] **Responsive Embed Container**: 16:9 aspect ratio responsive iframe player with strict iframe permissions (`accelerometer`, `autoplay`, `clipboard-write`, `encrypted-media`).
- [ ] **Timestamp Cueing**: Support cueing to specific timestamps via URL parameter `?t=120s`.
- [ ] **Offline Notice**: Display clean offline fallback banner when student is disconnected from internet.

---

### 6. Vimeo
- [x] **Vimeo URL Detection**: Extracts Vimeo video ID from `vimeo.com/{id}` and `player.vimeo.com/video/{id}`.
- [x] **Embed Player Integration**: Seamlessly plays Vimeo lectures within `ClassroomMediaPlayer`.
- [ ] **Vimeo Privacy Handling**: Gracefully handle unlisted/domain-restricted Vimeo video errors with student-friendly guidance.

---

### 7. PDF Viewer
- [x] **Document Reader Modal**: Custom modal (`DocumentReaderModal.tsx`) with dark/light background toggles, font scaling, and reading focus.
- [x] **Scripture Detector Integration**: Auto-detects Bible references in document text and renders interactive scripture popovers (`ScriptureHoverPopover`).
- [ ] **Embedded PDF Canvas / Iframe**: Inline high-fidelity PDF rendering with page-by-page navigation and zoom in/out (50% to 200%).
- [x] **Download / New Tab Fallback**: Direct download button and "Open in Native Browser Tab" button for unrestricted printing.

---

### 8. Video Viewer
- [x] **HTML5 `<video>` Player**: Support for direct MP4, WebM, and cloud-hosted video streaming.
- [x] **Playback Speed Selector**: 0.75x, 1x, 1.25x, 1.5x, and 2x speed multipliers for accelerated sermon/lecture review.
- [x] **Theater & Fullscreen Mode**: Seamless expansion for classroom projector and distraction-free viewing.
- [ ] **Picture-in-Picture (PiP)**: Standard browser PiP support allowing students to listen to video lectures while reviewing notes in another tab.

---

### 9. Audio Viewer
- [x] **Classroom Audio Player**: Embedded audio player for sermons, prayer recordings, and audio lectures.
- [x] **Audio Controls**: Play/pause, scrubbing slider, volume control, and current time vs total duration display.
- [ ] **15-Second Skip Buttons**: Quick replay (-15s) and forward (+15s) buttons for sermon transcription and note-taking.
- [ ] **Audio Playlist Rail**: Continuous autoplay rail for multi-part ministry sermon series.

---

### 10. Image Viewer
- [ ] **Theological Lightbox Modal**: Dedicated modal viewer for church history maps, tabernacle diagrams, apostolic timelines, and ministry charts.
- [ ] **Pan & Zoom Controls**: Double-click or pinch-to-zoom for detailed examination of high-resolution diagrams.
- [ ] **Image Metadata & Captions**: Display title, scripture grounding, author/artist attribution, and download resolution.

---

### 11. Search
- [x] **Real-Time Debounced Querying**: Responsive search filtering across all resources without UI stutter.
- [x] **Full-Text Matching**: Searches across resource `title`, `author`, `summary`, `fullContent`, `category`, and `courseCode`.
- [ ] **Scripture Search**: Ability to type scripture references (e.g. `2 Timothy 2:15`, `Romans 12`) to find all matching sermon notes and handouts.
- [ ] **Highlight Search Snippets**: Visual highlight of matching terms within the search result card.

---

### 12. Filters
- [x] **Format Filter**: Filter by All, PDF, DOCX, Video, Audio, YouTube, External Link.
- [x] **Module Filter**: Filter by Module 1 through Module 6 (`SOM-MOD-1` to `SOM-MOD-6`).
- [x] **Required Reading Filter**: Toggle between "All Resources" and "Required Curriculum Reading Only".
- [ ] **Completion Status Filter**: Filter by "Not Started", "In Progress", and "Completed".
- [ ] **Audience Filter**: Filter by "All Students", "Pastoral Staff", "Leadership Track".

---

### 13. Categories
- [x] **Institutional Categories**:
  - Foundations & Biblical Studies
  - Evangelism & Soul Winning
  - Ministerial Character & Ethics
  - Apostolic Governance & Epistles
  - Prophetic Ministry & Discernment
  - Pastoral Care & Expository Preaching
- [x] **Category Filter Badges**: Active count badges indicating how many resources exist per category.
- [ ] **Dynamic Category Management**: Allow Administrators to create custom sub-categories from Settings.

---

### 14. Tags
- [ ] **Tag Extraction & Association**: Support multi-tag array (`tags: string[]`) on all library items (e.g. `#prayer`, `#leadership`, `#holy-spirit`, `#homiletics`).
- [ ] **Interactive Tag Cloud**: Clickable tag chips in the library header to instantly filter resources sharing that topic.
- [ ] **Auto-Suggest Tagging**: Autocomplete suggestion input in the Teacher Upload/Edit modal.

---

### 15. Course Association
- [x] **Curriculum Module Binding**: Strict association to `SOM-MOD-1` through `SOM-MOD-6` via `CURRICULUM_MODULES` and `HTEIM_CURRICULUM_COURSES`.
- [x] **Academic Content Hierarchy**: Full Course → Module → Lesson relationship tree implemented in `CurriculumHierarchyView.tsx` and `curriculumHierarchyService.ts`.
- [x] **Contextual Lesson Resource Bundles**: When opening any academic lesson (e.g. *SOM-MOD-3 Lesson 2*), resources are automatically bundled into clean structured groups:
  - 📄 **Lesson Notes**: Handouts, PDF manuals, and syllabus guides.
  - ▶️ **Lecture Video**: Classroom stream, YouTube, and Vimeo video links.
  - 🌐 **Recommended Website**: Curated ministry references and research portals.
  - 📖 **Scripture References**: Interactive hover popovers for key biblical foundations with direct Bible study links.
  - 📝 **Quiz**: Integrated assessment modules with passing score threshold (75%).
  - 📥 **Download Materials**: Direct one-click offline study downloads.
- [x] **Week & Session Tagging**: Association with academic Week numbers (Week 1–12) and specific Class Day IDs.
- [x] **Student Completion Toggle**: Persistent per-student lesson completion tracking with progress indicators.
- [x] **Seamless Switcher**: Instant switching between the Academic Curriculum tree view and the flat Resource Catalog.

---

### 16. Permissions
- [x] **Role-Based Access Control (RBAC)**:
  - `admin` / `teacher`: Upload, edit, delete, mark required, view student completion logs.
  - `student`: Read, view, stream, download permitted items, save favorites, log self-completion.
  - `guest`: Read-only preview of public syllabus handouts.
- [x] **Server-Side Authorization**: API endpoint `/api/library` enforces token verification and `requirePermission(["students:write", "roles:manage"])` on POST and DELETE.
- [ ] **Resource-Level Visibility**: Teacher toggle to set resource state as `draft` (hidden from students) or `published`.

---

### 17. Favorites
- [ ] **Student Favorites Toggle**: Star icon button on every library card to bookmark items.
- [ ] **Persistence**: Save bookmarks to `localStorage` key `hteim_library_favorites_${userId}` and sync with user profile in Supabase.
- [ ] **"Favorites" Quick Tab**: One-click tab filter displaying all bookmarked items for fast examination prep.

---

### 18. Recent Resources
- [ ] **"Recently Added" Section**: Visual badge / rail highlighting items uploaded within the last 14 days.
- [ ] **"Recently Viewed / Jump Back In"**: Track the last 5 resources opened by the current user with timestamps.
- [ ] **Quick Resume Button**: Clicking a recent item opens the viewer directly at the last viewed page or playback timestamp.

---

### 19. Progress
- [ ] **Reading Progress Tracking**: Record percentage read (or current page / total pages) in local state & database.
- [ ] **Media Playback Position**: Save media playback timestamp on video/audio resources every 10 seconds.
- [ ] **Visual Progress Indicators**: Clean progress bar on resource cards (e.g. "Page 14 of 32 — 44% complete").

---

### 20. Completion
- [ ] **Student Completion Toggle**: "Mark as Completed" button in viewer and card footer with visual checkmark badge.
- [ ] **Auto-Completion**: Automatically mark video/audio as completed when 90%+ duration has been played.
- [ ] **Academic Curriculum Credit**: Completed required readings contribute to module milestone progress in the Student 360° Profile.

---

### 21. Teacher Management
- [x] **Resource Creation Modal**: Form to upload file, enter title, author, category, course module, week number, and summary.
- [x] **Resource Deletion**: Confirmation prompt with institutional audit logging before removing a library item.
- [x] **Version History**: Record file updates with version strings (`v1.0`, `v1.1`), release notes, and timestamp.
- [ ] **Batch Resource Operations**: Select multiple resources to batch assign to a module, batch tag, or batch delete.

---

### 22. Student Experience
- [x] **Distraction-Free Reading Mode**: Document Reader modal with adjustable font sizing, dark/light contrast, and clean margins.
- [x] **Scripture Hover Popover**: Instant hover lookup for biblical citations without navigating away.
- [x] **Flashcards Generator**: Interactive flashcard modal (`ScriptureFlashcardsModal.tsx`) generated from detected scriptures.
- [x] **Note-Taking Clip Integration**: Highlight excerpts to instantly create student class study notes (`createNoteFromLibraryExcerpt`).

---

### 23. Analytics
- [ ] **Teacher Engagement Dashboard**:
  - Total resource views and unique student readers.
  - Download count metrics per handout.
  - Reading completion rate for required syllabus readings.
- [ ] **Student Reading Audit View**: Matrix showing which enrolled students have completed required readings for each module.
- [ ] **Exportable Reading Report**: Download CSV/PDF report of student reading compliance for faculty records.

---

### 24. Mobile
- [x] **Mobile Touch Targets**: All buttons, play controls, tabs, and filter pills meet minimum 44px touch target guidelines.
- [x] **Responsive Filter Drawer**: Collapsible mobile filter sheet to preserve viewport space on small screens.
- [x] **PWA Offline Support**: Downloaded handouts and cached media are accessible during low-connectivity or offline ministry sessions.
- [ ] **Bottom Sheet Resource Details**: Mobile-native slide-up drawer for resource preview on iOS/Android.

---

### 25. Tests
- [x] **Unit Tests (`src/__tests__/`)**:
  - `library-canonical-model.test.ts`: Canonical `LearningResource` schema validation, factory helpers, bidirectional conversions (`toLearningResource` / `toLegacyResource`), type-to-viewer routing (15 tests passing).
  - `library-resource-relationships.test.ts`: Course → Module → Lesson hierarchy construction, lesson resource bundle categorization (Notes, Videos, Websites, Scriptures, Quizzes, Downloads), student completion tracking (4 tests passing).
- [ ] **Integration Tests**:
  - `library-rbac.test.ts`: Verify students cannot delete or upload resources; verify teachers can.
  - `library-progress.test.ts`: Verify progress tracking and completion state transitions.
- [ ] **E2E Browser Workflow Tests**:
  - Document Reader modal open, zoom, scripture popover, note excerpting.
  - Classroom Media Player play, pause, speed adjustment.

---

## 🛠️ Implementation Phases & Roadmap

```
┌────────────────────────────────────────────────────────┐
│ Phase 1: Foundation & Model Normalization              │
│ - Finalize UnifiedLibraryResource schema               │
│ - Idempotent data migration for existing items         │
│ - Unit tests for parser and models                     │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Phase 2: Multi-Format Viewers & Media Refinement       │
│ - Lightbox Image Viewer for diagrams & maps            │
│ - Vimeo/YouTube timestamp cueing                       │
│ - 15-second skip & audio playlists                     │
│ - Link preview cards                                   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Phase 3: Student Engagement & Progress Engine          │
│ - Favorites & Bookmarking system                       │
│ - Reading & media progress persistence                 │
│ - Completion badges & module progress credit           │
│ - Recently viewed / Continue reading shelf             │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Phase 4: Teacher Analytics, Mobile Polish & Test Suite │
│ - Faculty reading compliance dashboard                 │
│ - Batch management tools                               │
│ - Full automated test suite (Unit + RBAC + E2E)        │
└────────────────────────────────────────────────────────┘
```

---

## 🔒 Security & Data Integrity Rules
1. **PII Isolation**: Student reading notes, personal bookmarks, and progress histories must link to UUIDs (`studentId`) and never expose personal emails or credentials.
2. **Safe Media Protocols**: All embedded media must use secure HTTPS endpoints (`https://www.youtube.com`, `https://player.vimeo.com`).
3. **Audit Trail**: Every resource upload, update, and deletion must create an immutable audit record via `logAuditEvent` in `libraryRouter`.
4. **Offline Resilience**: Offline progress modifications must buffer in indexed storage and reconcile without data loss upon reconnection.
