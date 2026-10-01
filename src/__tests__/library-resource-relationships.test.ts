import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildAcademicHierarchy,
  categorizeLessonResources,
  toggleLessonCompletion,
  getCompletedLessonIds,
} from '../features/library/services/curriculumHierarchyService';
import { createLearningResource } from '../features/library/model';
import { LearningResource } from '../features/library/types';

describe('Library Academic Resource Relationships Hierarchy', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds the complete Course -> Module -> Lesson academic hierarchy', () => {
    const hierarchy = buildAcademicHierarchy();
    expect(hierarchy.length).toBeGreaterThan(0);

    const mainCourse = hierarchy[0];
    expect(mainCourse.code).toBe('SOM-CORE');
    expect(mainCourse.modules.length).toBe(6);

    // Verify all 6 modules exist
    const moduleCodes = mainCourse.modules.map(m => m.code);
    expect(moduleCodes).toEqual([
      'SOM-MOD-1',
      'SOM-MOD-2',
      'SOM-MOD-3',
      'SOM-MOD-4',
      'SOM-MOD-5',
      'SOM-MOD-6',
    ]);
  });

  it('correctly associates resources, videos, websites, scriptures, and quizzes with Module 3 Lesson 2', () => {
    const hierarchy = buildAcademicHierarchy();
    const mainCourse = hierarchy[0];
    const mod3 = mainCourse.modules.find(m => m.code === 'SOM-MOD-3');
    expect(mod3).toBeDefined();

    const lesson2 = mod3!.lessons.find(l => l.lessonNumber === 2);
    expect(lesson2).toBeDefined();
    expect(lesson2!.title).toContain('Stewardship, Financial Ethics & Church Accountability');

    // Categorize the lesson bundle
    const bundle = categorizeLessonResources(
      lesson2!.resources,
      lesson2!.scriptureReferences,
      lesson2!.quizzes,
      lesson2!.assignments
    );

    // 📄 Lesson Notes
    expect(bundle.notes.length).toBeGreaterThan(0);
    expect(bundle.notes.some(n => n.title.includes('Financial Integrity Handbook'))).toBe(true);

    // ▶️ Lecture Video
    expect(bundle.videos.length).toBeGreaterThan(0);
    expect(bundle.videos.some(v => v.title.includes('Financial Stewardship & Transparency'))).toBe(true);

    // 🌐 Recommended Website
    expect(bundle.websites.length).toBeGreaterThan(0);
    expect(bundle.websites.some(w => w.title.includes('ECFA'))).toBe(true);

    // 📖 Scripture References
    expect(bundle.scriptures).toContain('1 Timothy 6:10-11');
    expect(bundle.scriptures).toContain('2 Corinthians 8:20-21');
    expect(bundle.scriptures).toContain('Proverbs 11:1');

    // 📝 Quiz
    expect(bundle.quizzes.length).toBeGreaterThan(0);
    expect(bundle.quizzes[0].title).toContain('Ministerial Ethics & Financial Integrity Assessment');
    expect(bundle.quizzes[0].settings?.passingScorePercentage).toBe(75);

    // 📥 Download Materials
    expect(bundle.downloadables.length).toBeGreaterThan(0);
  });

  it('categorizes custom dynamic resources into correct bundle slots', () => {
    const customVideo = createLearningResource({
      id: 'custom_vid_1',
      title: 'Hermeneutics Masterclass Lecture',
      type: 'video',
      source: 'youtube',
      url: 'https://youtube.com/watch?v=12345',
      uploadedBy: 'Prof Smith',
      status: 'published',
      isDownloadable: false,
      isPublished: true,
      courseId: 'SOM-CORE',
      moduleId: 'SOM-MOD-1',
      lessonId: 'SOM-MOD-1-L1',
    });

    const customDoc = createLearningResource({
      id: 'custom_doc_1',
      title: 'Hermeneutics Notes Handout',
      type: 'pdf',
      source: 'upload',
      uploadedBy: 'Prof Smith',
      status: 'published',
      isDownloadable: true,
      isPublished: true,
      courseId: 'SOM-CORE',
      moduleId: 'SOM-MOD-1',
      lessonId: 'SOM-MOD-1-L1',
    });

    const customWeb = createLearningResource({
      id: 'custom_web_1',
      title: 'Greek Lexicon Online',
      type: 'link',
      source: 'external',
      url: 'https://greeklexicon.org',
      uploadedBy: 'Faculty',
      status: 'published',
      isDownloadable: false,
      isPublished: true,
      courseId: 'SOM-CORE',
      moduleId: 'SOM-MOD-1',
      lessonId: 'SOM-MOD-1-L1',
    });

    const bundle = categorizeLessonResources([customVideo, customDoc, customWeb], ['2 Timothy 2:15']);

    expect(bundle.videos.length).toBe(1);
    expect(bundle.videos[0].id).toBe('custom_vid_1');

    expect(bundle.notes.length).toBe(1);
    expect(bundle.notes[0].id).toBe('custom_doc_1');

    expect(bundle.websites.length).toBe(1);
    expect(bundle.websites[0].id).toBe('custom_web_1');

    expect(bundle.scriptures).toContain('2 Timothy 2:15');
    expect(bundle.downloadables.length).toBe(1);
    expect(bundle.downloadables[0].id).toBe('custom_doc_1');
  });

  it('tracks lesson completion status accurately per student', () => {
    const student = 'Student One';
    const lessonId = 'SOM-MOD-3-L2';

    // Initially not completed
    let completed = getCompletedLessonIds(student);
    expect(completed.has(lessonId)).toBe(false);

    // Toggle complete
    const isNowDone = toggleLessonCompletion(lessonId, student);
    expect(isNowDone).toBe(true);

    completed = getCompletedLessonIds(student);
    expect(completed.has(lessonId)).toBe(true);

    // Toggle back
    const isNowUndone = toggleLessonCompletion(lessonId, student);
    expect(isNowUndone).toBe(false);

    completed = getCompletedLessonIds(student);
    expect(completed.has(lessonId)).toBe(false);
  });
});
