import { LearningResource, ResourceType } from '../types';

export interface SearchMatchResult {
  resource: LearningResource;
  score: number;
  matchedFields: string[];
  snippet?: string;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  resourceType?: ResourceType | 'all' | 'documents' | 'videos' | 'audio' | 'websites' | 'scriptures' | 'images' | 'pdfs' | 'links';
  courseId?: string;
  moduleId?: string;
  instructor?: string;
  dateAdded?: 'all' | 'week' | 'month' | 'three_months' | 'year';
  tags?: string[];
  isSavedOnly?: boolean;
  isCompletedOnly?: boolean;
  isInProgressOnly?: boolean;
}

/**
 * Normalizes query string for case-insensitive, whitespace-agnostic search
 */
export function normalizeSearchTerm(term: string): string {
  if (!term) return '';
  return term
    .replace(/\u00A0/g, ' ')
    .toLowerCase()
    .trim();
}

/**
 * Matches a resource against search query looking through:
 * - title
 * - description / summary
 * - tags
 * - category
 * - course / courseName
 * - module / moduleName
 * - lesson / lessonName
 * - instructor / author / speaker / uploadedBy
 * - resource type / format / mimeType
 * - scripture references
 */
export function matchResource(resource: LearningResource | any, query: string): { matched: boolean; score: number; matchedFields: string[]; snippet?: string } {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) {
    return { matched: true, score: 1, matchedFields: [] };
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { matched: true, score: 1, matchedFields: [] };
  }

  let totalScore = 0;
  const matchedFields: string[] = [];
  let bestSnippet: string | undefined;

  // 1. Title matching (Highest weight)
  const title = normalizeSearchTerm(resource.title || '');
  const titleExact = title.includes(normalizedQuery);
  const titleAllTokens = tokens.every((t) => title.includes(t));
  if (titleExact) {
    totalScore += 100;
    matchedFields.push('title');
  } else if (titleAllTokens) {
    totalScore += 60;
    matchedFields.push('title');
  } else {
    const matchedTokenCount = tokens.filter((t) => title.includes(t)).length;
    if (matchedTokenCount > 0) {
      totalScore += matchedTokenCount * 20;
      matchedFields.push('title');
    }
  }

  // 2. Category matching
  const category = normalizeSearchTerm(resource.category || '');
  if (category.includes(normalizedQuery)) {
    totalScore += 50;
    matchedFields.push('category');
  } else if (tokens.some((t) => category.includes(t))) {
    totalScore += 25;
    matchedFields.push('category');
  }

  // 3. Course / Curriculum matching
  const course = normalizeSearchTerm(resource.courseName || resource.courseId || resource.course || '');
  if (course.includes(normalizedQuery)) {
    totalScore += 45;
    matchedFields.push('course');
  } else if (tokens.some((t) => course.includes(t))) {
    totalScore += 20;
    matchedFields.push('course');
  }

  // 4. Module & Lesson matching
  const moduleName = normalizeSearchTerm(resource.moduleName || resource.moduleId || '');
  const lessonName = normalizeSearchTerm(resource.lessonName || resource.lessonId || '');
  if (moduleName.includes(normalizedQuery)) {
    totalScore += 35;
    matchedFields.push('module');
  }
  if (lessonName.includes(normalizedQuery)) {
    totalScore += 35;
    matchedFields.push('lesson');
  }

  // 5. Instructor / Author / Speaker matching
  const instructor = normalizeSearchTerm(
    resource.instructor || resource.author || resource.speaker || resource.uploadedBy || ''
  );
  if (instructor.includes(normalizedQuery)) {
    totalScore += 40;
    matchedFields.push('instructor');
  } else if (tokens.some((t) => instructor.includes(t))) {
    totalScore += 20;
    matchedFields.push('instructor');
  }

  // 6. Tags matching
  const tags: string[] = Array.isArray(resource.tags) ? resource.tags : [];
  const normalizedTags = tags.map((t) => normalizeSearchTerm(t));
  const hasMatchingTag = normalizedTags.some((t) =>
    tokens.some((token) => t.includes(token) || token.includes(t))
  );
  if (hasMatchingTag) {
    totalScore += 30;
    matchedFields.push('tags');
  }

  // 7. Resource Type & Format matching (e.g. searching 'pdf', 'video', 'sermon audio')
  const type = normalizeSearchTerm(resource.type || '');
  const format = normalizeSearchTerm(resource.format || '');
  const mimeType = normalizeSearchTerm(resource.mimeType || '');
  if (
    tokens.some(
      (t) =>
        type.includes(t) ||
        format.includes(t) ||
        mimeType.includes(t) ||
        (t === 'document' && (type === 'pdf' || type === 'document')) ||
        (t === 'video' && (type === 'video' || format === 'youtube' || format === 'vimeo')) ||
        (t === 'audio' && (type === 'audio' || format === 'mp3' || format === 'wav' || format === 'm4a')) ||
        (t === 'image' && (type === 'image' || format === 'png' || format === 'jpg'))
    )
  ) {
    totalScore += 25;
    matchedFields.push('resource_type');
  }

  // 8. Description / Notes / Transcripts matching
  const description = normalizeSearchTerm(
    resource.description || resource.summary || resource.fullContent || resource.content || ''
  );
  if (description.includes(normalizedQuery)) {
    totalScore += 30;
    matchedFields.push('description');
    // Extract snippet around matched phrase
    const idx = description.indexOf(normalizedQuery);
    const start = Math.max(0, idx - 40);
    const end = Math.min(description.length, idx + normalizedQuery.length + 60);
    bestSnippet = (start > 0 ? '...' : '') + description.slice(start, end).trim() + (end < description.length ? '...' : '');
  } else {
    const descTokenCount = tokens.filter((t) => description.includes(t)).length;
    if (descTokenCount > 0) {
      totalScore += descTokenCount * 10;
      matchedFields.push('description');
    }
  }

  // 9. Scripture references matching
  const scriptureRefs: string[] = Array.isArray(resource.scriptureReferences)
    ? resource.scriptureReferences
    : [];
  if (
    scriptureRefs.some((ref) => {
      const normRef = normalizeSearchTerm(ref);
      return tokens.some((t) => normRef.includes(t));
    })
  ) {
    totalScore += 35;
    matchedFields.push('scripture');
  }

  return {
    matched: totalScore > 0,
    score: totalScore,
    matchedFields,
    snippet: bestSnippet
  };
}

/**
 * Filter and sort resources based on full-text query and categorical filters
 */
export function searchAndFilterResources(
  resources: LearningResource[] | any[],
  filters: SearchFilters
): SearchMatchResult[] {
  if (!Array.isArray(resources)) return [];

    const {
    query = '',
    category,
    resourceType,
    courseId,
    moduleId,
    instructor,
    dateAdded,
    tags = [],
    isSavedOnly,
    isCompletedOnly
  } = filters;

  const results: SearchMatchResult[] = [];
  const now = Date.now();

  for (const res of resources) {
    // Check published status
    if (res.status === 'draft' || res.isPublished === false) {
      // unless caller specifically allows drafts
    }

    // Category filter
    if (category && category !== 'all') {
      const resCat = (res.category || '').toLowerCase();
      if (resCat !== category.toLowerCase()) {
        continue;
      }
    }

    // Resource Type Filter
    if (resourceType && resourceType !== 'all') {
      const type = (res.type || '').toLowerCase();
      const format = (res.format || '').toLowerCase();

      let matchesType = false;
      if (resourceType === 'documents' || resourceType === 'document') {
        matchesType = type === 'pdf' || type === 'document' || type === 'presentation' || format === 'pdf' || format === 'docx';
      } else if (resourceType === 'pdfs' || resourceType === 'pdf') {
        matchesType = type === 'pdf' || format === 'pdf' || (res.fileName || '').toLowerCase().endsWith('.pdf');
      } else if (resourceType === 'videos' || resourceType === 'video') {
        matchesType = type === 'video' || format === 'youtube' || format === 'vimeo' || format === 'video';
      } else if (resourceType === 'audio') {
        matchesType = type === 'audio' || format === 'mp3' || format === 'wav' || format === 'm4a';
      } else if (resourceType === 'websites' || resourceType === 'link' || resourceType === 'links') {
        matchesType = type === 'link' || type === 'website' || format === 'link';
      } else if (resourceType === 'scriptures' || resourceType === 'scripture') {
        matchesType = type === 'scripture' || (res.category || '').toLowerCase().includes('scripture');
      } else if (resourceType === 'images' || resourceType === 'image') {
        matchesType = type === 'image' || format === 'png' || format === 'jpg' || format === 'image';
      } else {
        matchesType = type === resourceType;
      }

      if (!matchesType) {
        continue;
      }
    }

    // Course filter
    if (courseId && courseId !== 'all') {
      const resCourse = (res.courseId || res.courseName || res.course || '').toLowerCase();
      if (!resCourse.includes(courseId.toLowerCase())) {
        continue;
      }
    }

    // Module filter
    if (moduleId && moduleId !== 'all') {
      const resModule = (res.moduleId || res.moduleName || res.moduleTrack || '').toLowerCase();
      if (!resModule.includes(moduleId.toLowerCase())) {
        continue;
      }
    }

    // Instructor filter
    if (instructor && instructor !== 'all') {
      const resInst = (res.instructor || res.author || res.uploadedBy || '').toLowerCase();
      if (!resInst.includes(instructor.toLowerCase())) {
        continue;
      }
    }

    // Date Added filter (week, month, three_months, year)
    if (dateAdded && dateAdded !== 'all') {
      const createdTime = new Date(res.createdAt || res.uploadedAt || 0).getTime();
      const ageMs = now - createdTime;
      const dayMs = 24 * 60 * 60 * 1000;

      if (dateAdded === 'week' && ageMs > 7 * dayMs) {
        continue;
      } else if (dateAdded === 'month' && ageMs > 30 * dayMs) {
        continue;
      } else if (dateAdded === 'three_months' && ageMs > 90 * dayMs) {
        continue;
      } else if (dateAdded === 'year' && ageMs > 365 * dayMs) {
        continue;
      }
    }

    // Tags filter (Phase 16)
    if (tags && tags.length > 0) {
      const resTags = ((res.tags || res.scriptureReferences || []) as string[]).map((t) =>
        t.toLowerCase().replace(/^#/, '')
      );
      const resText = `${res.title || ''} ${res.description || ''} ${res.category || ''}`.toLowerCase();

      const matchesAllSelectedTags = tags.every((filterTag) => {
        const cleanTag = filterTag.toLowerCase().replace(/^#/, '');
        return resTags.some((t) => t.includes(cleanTag)) || resText.includes(cleanTag);
      });

      if (!matchesAllSelectedTags) {
        continue;
      }
    }

    // Match Query
    const match = matchResource(res, query);
    if (match.matched) {
      results.push({
        resource: res,
        score: match.score,
        matchedFields: match.matchedFields,
        snippet: match.snippet
      });
    }
  }

  // Sort by score descending, then by creation date descending
  return results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const dateA = new Date(a.resource.createdAt || 0).getTime();
    const dateB = new Date(b.resource.createdAt || 0).getTime();
    return dateB - dateA;
  });
}
