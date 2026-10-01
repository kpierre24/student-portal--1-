import { LibraryResource as BaseLibraryResource, ResourceVersion } from '../../types';

export type ResourceType =
  | 'document'
  | 'pdf'
  | 'video'
  | 'audio'
  | 'image'
  | 'presentation'
  | 'link'
  | 'scripture';

export type ResourceSource =
  | 'upload'
  | 'youtube'
  | 'vimeo'
  | 'external'
  | 'storage';

export type ResourceStatus =
  | 'draft'
  | 'published'
  | 'archived';

export type ResourceVisibility =
  | 'public'
  | 'authenticated'
  | 'students'
  | 'teachers'
  | 'course'
  | 'module'
  | 'restricted';

export type ResourceAccessLevel =
  | 'everyone'
  | 'students'
  | 'teachers'
  | 'specific-course'
  | 'specific-module';

export type ResourceViewerType =
  | 'pdf-viewer'
  | 'document-viewer'
  | 'video-player'
  | 'audio-player'
  | 'image-viewer'
  | 'presentation-viewer'
  | 'external-link'
  | 'scripture-viewer';

export interface LearningResource {
  id: string;

  title: string;
  description?: string;

  type: ResourceType;
  source: ResourceSource;

  url?: string;
  storagePath?: string;
  thumbnailUrl?: string;

  courseId?: string;
  moduleId?: string;
  lessonId?: string;

  category?: string;
  tags: string[];

  uploadedBy: string;

  status: ResourceStatus;
  visibility?: ResourceVisibility;
  accessLevel?: ResourceAccessLevel;
  accessCourseId?: string;
  accessModuleId?: string;
  allowedRoles?: string[];
  allowedUserIds?: string[];
  allowedCourseIds?: string[];
  allowedModuleIds?: string[];

  isDownloadable: boolean;
  isPublished: boolean;

  createdAt: string;
  updatedAt: string;

  // Domain & Curriculum metadata
  author?: string;
  size?: string;
  mimeType?: string;
  fileName?: string;
  fileDataUrl?: string;
  fullContent?: string;
  durationSeconds?: number;
  pageCount?: number;
  weekNumber?: number;
  isRequiredReading?: boolean;
  scriptureReferences?: string[];
  version?: string;
  versionsHistory?: ResourceVersion[];
  completedByStudents?: string[];
  viewCount?: number;
  downloadCount?: number;
}

/**
 * Academic Curriculum Relationships Hierarchy:
 * Course
 *   │
 *   ├── Module
 *   │     │
 *   │     ├── Lesson
 *   │     │      │
 *   │     │      ├── PDF / Lesson Notes
 *   │     │      ├── Video / Lecture Video
 *   │     │      ├── Website / Recommended Link
 *   │     │      ├── Audio / Sermon & Audio Lecture
 *   │     │      ├── Presentation / Slide Deck
 *   │     │      └── Scripture References
 *   │     │
 *   │     └── Quiz
 *   │
 *   └── Assignments
 */

export interface LessonResourceBundle {
  notes: LearningResource[];
  videos: LearningResource[];
  websites: LearningResource[];
  audios: LearningResource[];
  presentations: LearningResource[];
  scriptures: string[];
  quizzes: any[]; // QuizAssignment
  assignments: any[]; // CustomAssignment
  downloadables: LearningResource[];
}

export interface AcademicLessonNode {
  id: string;
  lessonNumber: number;
  title: string;
  subtitle?: string;
  description?: string;
  moduleId: string;
  courseId: string;
  weekNumber?: number;
  date?: string;
  durationMinutes?: number;
  scriptureReferences: string[];
  keyTopics?: string[];
  resources: LearningResource[];
  quizzes: any[]; // QuizAssignment[]
  assignments: any[]; // CustomAssignment[]
  isCompleted?: boolean;
}

export interface AcademicModuleNode {
  id: string;
  code: string;
  title: string;
  fullName: string;
  description: string;
  instructor: string;
  courseId: string;
  orderIndex: number;
  credits?: number;
  lessons: AcademicLessonNode[];
  quizzes: any[]; // QuizAssignment[]
  assignments: any[]; // CustomAssignment[]
  generalResources: LearningResource[];
}

export interface AcademicCourseNode {
  id: string;
  code: string;
  title: string;
  programTitle?: string;
  instructor: string;
  credits: number;
  description: string;
  scheduleDays?: string;
  location?: string;
  modules: AcademicModuleNode[];
  courseAssignments: any[]; // CustomAssignment[]
}

export interface CurriculumHierarchy {
  courses: AcademicCourseNode[];
  selectedCourseId: string;
  selectedModuleId: string;
  selectedLessonId: string;
}

export interface Book extends BaseLibraryResource {
  isbn?: string;
  totalCopies?: number;
  availableCopies?: number;
  callNumber?: string;
  location?: string;
  coverImageUrl?: string;
  publisher?: string;
  publishYear?: number;
  weekNumber?: number;
  isRequiredReading?: boolean;
  scriptureReferences?: string[];
  completedByStudents?: string[];
  moduleTrack?: string;
}

export type LibraryResource = Book;

/**
 * Phase 15: Advanced Filter Dimensions
 */
export type ResourceTypeFilter = 'all' | 'videos' | 'pdfs' | 'documents' | 'audio' | 'links' | 'images';
export type DateAddedFilter = 'all' | 'week' | 'month' | 'three_months' | 'year';

export interface ResourceFilterState {
  query: string;
  type: ResourceTypeFilter;
  course: string;
  module: string;
  category: string;
  instructor: string;
  dateAdded: DateAddedFilter;
  tags: string[];
  isFavoriteOnly?: boolean;
  isCompletedOnly?: boolean;
  isInProgressOnly?: boolean;
}

export const INITIAL_RESOURCE_FILTERS: ResourceFilterState = {
  query: '',
  type: 'all',
  course: 'all',
  module: 'all',
  category: 'all',
  instructor: 'all',
  dateAdded: 'all',
  tags: []
};

/**
 * Phase 16: Canonical Theological Tags
 */
export const POPULAR_THEOLOGICAL_TAGS = [
  '#Prayer',
  '#Leadership',
  '#Faith',
  '#HolySpirit',
  '#Evangelism',
  '#BibleStudy',
  '#Theology',
  '#Discernment',
  '#Apostolic',
  '#Worship',
  '#PastoralMinistry',
  '#Hermeneutics',
  '#Ethics'
] as const;

/**
 * Phase 17: "My Library" Navigation Sections
 */
export type MyLibrarySection = 'favorites' | 'recent' | 'continue_learning' | 'downloads';

/**
 * Phase 18: Authoritative Resource Progress Model
 */
export interface ResourceProgress {
  id: string;
  studentId: string;
  resourceId: string;
  lastPositionSeconds: number;
  durationSeconds: number;
  lastPage?: number;
  totalPages?: number;
  percentage: number;
  completed: boolean;
  lastViewedAt: string;
  completedAt?: string;
  resourceType?: ResourceType;
  resourceTitle?: string;
  courseId?: string;
  instructor?: string;
  notesCount?: number;
}

/**
 * Phase 19: Resource Completion Validation Rules
 */
export interface CompletionRuleResult {
  completed: boolean;
  percentage: number;
  reason: string;
  qualifiesForGraduation: boolean;
}

/**
 * Phase 25: Resource Collections Model
 */
export interface ResourceCollection {
  id: string;
  title: string;
  description?: string;
  category?: string;
  coverImageUrl?: string;
  resourceIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
  courseId?: string;
  moduleId?: string;
  tags?: string[];
  iconName?: string;
}
