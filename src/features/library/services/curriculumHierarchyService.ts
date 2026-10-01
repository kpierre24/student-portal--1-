import { 
  AcademicCourseNode, 
  AcademicModuleNode, 
  AcademicLessonNode, 
  LessonResourceBundle, 
  LearningResource 
} from '../types';
import { toLearningResource, isLearningResource } from '../model';
import { HTEIM_CURRICULUM_COURSES } from '../data/curriculumStructure';
export { HTEIM_CURRICULUM_COURSES };
import { Course, LibraryResource as LegacyLibraryResource, CustomAssignment, QuizAssignment } from '../../../types';
import { DEFAULT_QUIZ_TEMPLATES } from '../../../data/quizTemplates';

const COMPLETED_LESSONS_STORAGE_KEY = 'hteim_completed_curriculum_lessons';

export interface BuildHierarchyOptions {
  courses?: Course[];
  resources?: (LearningResource | LegacyLibraryResource)[];
  assignments?: CustomAssignment[];
  quizzes?: QuizAssignment[];
  studentIdentifier?: string;
}

/**
 * Categorizes a collection of resources into the canonical lesson resource bundle:
 * 📄 Lesson Notes
 * ▶️ Lecture Video
 * 🌐 Recommended Website
 * 🎧 Audio
 * 📊 Presentation
 * 📖 Scripture References
 * 📝 Quiz
 * 📥 Download Materials
 */
export function categorizeLessonResources(
  resources: LearningResource[],
  lessonScriptureReferences: string[] = [],
  quizzes: QuizAssignment[] = [],
  assignments: CustomAssignment[] = []
): LessonResourceBundle {
  const notes: LearningResource[] = [];
  const videos: LearningResource[] = [];
  const websites: LearningResource[] = [];
  const audios: LearningResource[] = [];
  const presentations: LearningResource[] = [];
  const downloadables: LearningResource[] = [];
  const scriptureSet = new Set<string>(lessonScriptureReferences);

  for (const res of resources) {
    // Add scriptures
    if (res.scriptureReferences) {
      res.scriptureReferences.forEach(s => scriptureSet.add(s));
    }

    // Classify by canonical resource type
    switch (res.type) {
      case 'video':
        videos.push(res);
        break;
      case 'audio':
        audios.push(res);
        break;
      case 'link':
        websites.push(res);
        break;
      case 'presentation':
        presentations.push(res);
        break;
      case 'pdf':
      case 'document':
      default:
        // Textbooks, study guides, handouts, lecture notes
        notes.push(res);
        break;
    }

    // Downloadable classification: any item marked downloadable or with file content that isn't a link/scripture
    if (res.isDownloadable !== false && res.type !== 'link' && res.type !== 'scripture') {
      downloadables.push(res);
    }
  }

  return {
    notes,
    videos,
    websites,
    audios,
    presentations,
    scriptures: Array.from(scriptureSet),
    quizzes,
    assignments,
    downloadables,
  };
}

/**
 * Gets student-completed lesson IDs from localStorage.
 */
export function getCompletedLessonIds(studentIdentifier?: string): Set<string> {
  try {
    const raw = localStorage.getItem(COMPLETED_LESSONS_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    const key = studentIdentifier || 'default_student';
    const list: string[] = parsed[key] || [];
    return new Set<string>(list);
  } catch {
    return new Set<string>();
  }
}

/**
 * Toggles a lesson's completion status for a student.
 */
export function toggleLessonCompletion(lessonId: string, studentIdentifier?: string): boolean {
  try {
    const raw = localStorage.getItem(COMPLETED_LESSONS_STORAGE_KEY);
    const parsed: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    const key = studentIdentifier || 'default_student';
    const currentList: string[] = parsed[key] || [];
    const set = new Set(currentList);
    
    let isNowCompleted = false;
    if (set.has(lessonId)) {
      set.delete(lessonId);
      isNowCompleted = false;
    } else {
      set.add(lessonId);
      isNowCompleted = true;
    }

    parsed[key] = Array.from(set);
    localStorage.setItem(COMPLETED_LESSONS_STORAGE_KEY, JSON.stringify(parsed));
    return isNowCompleted;
  } catch (err) {
    console.error('Failed to toggle lesson completion:', err);
    return false;
  }
}

/**
 * Builds the canonical Academic Curriculum Hierarchy by merging courses,
 * modules, lessons, learning resources, quizzes, and assignments.
 */
export function buildAcademicHierarchy(options: BuildHierarchyOptions = {}): AcademicCourseNode[] {
  const {
    courses: externalCourses = [],
    resources: rawResources = [],
    assignments = [],
    quizzes: rawQuizzes = [],
    studentIdentifier,
  } = options;

  const completedLessonIds = getCompletedLessonIds(studentIdentifier);

  // Normalize all resources to canonical LearningResource
  const allResources: LearningResource[] = rawResources.map(r => 
    isLearningResource(r) ? r : toLearningResource(r)
  );

  // Pool all available quizzes
  const allQuizzes: QuizAssignment[] = [
    ...DEFAULT_QUIZ_TEMPLATES,
    ...rawQuizzes,
    ...assignments.filter(a => a.quizData).map(a => a.quizData!),
  ];

  // Map of lessonId -> LearningResource[]
  const lessonResourceMap = new Map<string, LearningResource[]>();
  // Map of moduleId -> LearningResource[] (module-wide general resources)
  const moduleGeneralResourceMap = new Map<string, LearningResource[]>();

  for (const res of allResources) {
    if (res.lessonId) {
      const existing = lessonResourceMap.get(res.lessonId) || [];
      // avoid duplicates by ID
      if (!existing.some(r => r.id === res.id)) {
        existing.push(res);
      }
      lessonResourceMap.set(res.lessonId, existing);
    } else if (res.moduleId) {
      // If resource specifies module and weekNumber, try to map to lesson
      if (res.weekNumber) {
        const potentialLessonId = `${res.moduleId}-L${res.weekNumber}`;
        const existing = lessonResourceMap.get(potentialLessonId) || [];
        if (!existing.some(r => r.id === res.id)) {
          existing.push(res);
        }
        lessonResourceMap.set(potentialLessonId, existing);
      } else {
        const existing = moduleGeneralResourceMap.get(res.moduleId) || [];
        if (!existing.some(r => r.id === res.id)) {
          existing.push(res);
        }
        moduleGeneralResourceMap.set(res.moduleId, existing);
      }
    }
  }

  // Iterate over canonical template courses
  return HTEIM_CURRICULUM_COURSES.map((courseDef) => {
    // Find if an external course object overrides metadata
    const extCourse = externalCourses.find(
      c => c.code === courseDef.code || c.id === courseDef.id
    );

    const courseAssignments = assignments.filter(
      a => a.courseCode === courseDef.code || a.courseCode === 'SOM-CORE'
    );

    const modules: AcademicModuleNode[] = courseDef.modules.map((modDef) => {
      // Find quizzes matching this module
      const moduleQuizzes = allQuizzes.filter(
        q => q.moduleTrack?.includes(modDef.code) || 
             q.courseCode === modDef.code ||
             q.title?.toLowerCase().includes(modDef.title.toLowerCase())
      );

      // Find assignments matching this module
      const moduleAssignments = assignments.filter(
        a => a.moduleTrack?.includes(modDef.code) || a.courseCode === modDef.code
      );

      // Construct lessons
      const lessons: AcademicLessonNode[] = modDef.lessons.map((lessonDef) => {
        // Collect resources assigned specifically to this lesson
        const matchedResources = [
          ...lessonDef.initialResources,
          ...(lessonResourceMap.get(lessonDef.id) || []),
        ];

        // Deduplicate resources
        const uniqueResources = Array.from(
          new Map(matchedResources.map(r => [r.id, r])).values()
        );

        // Find quizzes matching this specific lesson
        const lessonQuizzes = [
          ...(lessonDef.quizzes || []),
          ...allQuizzes.filter(
            q => q.classDayId === lessonDef.id || 
                 (q.moduleTrack?.includes(modDef.code) && q.title?.toLowerCase().includes(`lesson ${lessonDef.lessonNumber}`))
          ),
        ];
        const uniqueLessonQuizzes = Array.from(
          new Map(lessonQuizzes.map(q => [q.id, q])).values()
        );

        // Find assignments matching this specific lesson
        const lessonAssignments = [
          ...(lessonDef.assignments || []),
          ...moduleAssignments.filter(
            a => a.id.includes(lessonDef.id.toLowerCase()) || 
                 a.title.toLowerCase().includes(`lesson ${lessonDef.lessonNumber}`)
          ),
        ];
        const uniqueLessonAssignments = Array.from(
          new Map(lessonAssignments.map(a => [a.id, a])).values()
        );

        return {
          id: lessonDef.id,
          lessonNumber: lessonDef.lessonNumber,
          title: lessonDef.title,
          subtitle: lessonDef.subtitle,
          description: lessonDef.description,
          moduleId: modDef.code,
          courseId: courseDef.code,
          weekNumber: lessonDef.weekNumber,
          scriptureReferences: lessonDef.scriptureReferences,
          keyTopics: lessonDef.keyTopics,
          resources: uniqueResources,
          quizzes: uniqueLessonQuizzes,
          assignments: uniqueLessonAssignments,
          isCompleted: completedLessonIds.has(lessonDef.id),
        };
      });

      // Collect module-level general resources
      const generalResources = [
        ...(moduleGeneralResourceMap.get(modDef.code) || []),
      ];

      return {
        id: modDef.id,
        code: modDef.code,
        title: modDef.title,
        fullName: modDef.fullName,
        description: modDef.description,
        instructor: modDef.instructor,
        courseId: courseDef.code,
        orderIndex: modDef.orderIndex,
        credits: modDef.credits,
        lessons,
        quizzes: moduleQuizzes,
        assignments: moduleAssignments,
        generalResources,
      };
    });

    return {
      id: courseDef.id,
      code: courseDef.code,
      title: extCourse?.title || courseDef.title,
      programTitle: courseDef.programTitle,
      instructor: extCourse?.instructor || courseDef.instructor,
      credits: extCourse?.credits || courseDef.credits,
      description: extCourse?.description || courseDef.description,
      scheduleDays: extCourse?.scheduleDays || courseDef.scheduleDays,
      location: extCourse?.location || courseDef.location,
      modules,
      courseAssignments,
    };
  });
}
