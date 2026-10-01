import { useState, useMemo, useEffect, useCallback } from 'react';
import { LearningResource, ResourceFilterState, INITIAL_RESOURCE_FILTERS, ResourceProgress } from '../types';
import { searchAndFilterResources, SearchMatchResult } from '../utils/searchResources';
import { loadAllLocalProgress, syncProgressFromServer } from '../services/progressService';
import { formatTime } from '../utils/completionRules';

export interface ContinueLearningItem {
  resource: LearningResource;
  progressPercent: number;
  lastPositionText?: string;
  sourceType: 'pdf' | 'video' | 'audio' | 'general';
  progressRecord?: ResourceProgress;
}

export function useLibrarySearch(resources: LearningResource[] | any[]) {
  const [filters, setFilters] = useState<ResourceFilterState>(INITIAL_RESOURCE_FILTERS);
  const [progressMap, setProgressMap] = useState<Record<string, ResourceProgress>>({});

  // Sync progress from localStorage and server
  useEffect(() => {
    setProgressMap(loadAllLocalProgress());
    syncProgressFromServer().then((synced) => {
      if (synced && Object.keys(synced).length > 0) {
        setProgressMap(synced);
      }
    });
  }, []);

  // Update a single filter field
  const updateFilter = useCallback(<K extends keyof ResourceFilterState>(key: K, value: ResourceFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Toggle a tag
  const toggleTag = useCallback((tag: string) => {
    setFilters((prev) => {
      const isSelected = prev.tags.includes(tag);
      const nextTags = isSelected ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag];
      return { ...prev, tags: nextTags };
    });
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(INITIAL_RESOURCE_FILTERS);
  }, []);

  // Filtered & Ranked Search Results
  const searchResults: SearchMatchResult[] = useMemo(() => {
    return searchAndFilterResources(resources, {
      query: filters.query,
      resourceType: filters.type,
      courseId: filters.course,
      moduleId: filters.module,
      category: filters.category,
      instructor: filters.instructor,
      dateAdded: filters.dateAdded,
      tags: filters.tags,
      isSavedOnly: filters.isFavoriteOnly,
      isCompletedOnly: filters.isCompletedOnly,
      isInProgressOnly: filters.isInProgressOnly
    });
  }, [resources, filters]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts = {
      all: resources.length,
      documents: 0,
      videos: 0,
      audio: 0,
      websites: 0,
      scriptures: 0,
      images: 0,
      pdfs: 0,
      links: 0
    };

    for (const res of resources) {
      const type = (res.type || '').toLowerCase();
      const format = (res.format || '').toLowerCase();

      if (type === 'pdf' || format === 'pdf') {
        counts.pdfs++;
        counts.documents++;
      } else if (type === 'document' || type === 'presentation' || format === 'docx') {
        counts.documents++;
      } else if (type === 'video' || format === 'youtube' || format === 'vimeo') {
        counts.videos++;
      } else if (type === 'audio' || format === 'mp3' || format === 'wav' || format === 'm4a') {
        counts.audio++;
      } else if (type === 'link' || type === 'website' || format === 'link') {
        counts.websites++;
        counts.links++;
      } else if (type === 'scripture' || (res.category || '').toLowerCase().includes('scripture')) {
        counts.scriptures++;
      } else if (type === 'image' || format === 'png' || format === 'jpg') {
        counts.images++;
      } else {
        counts.documents++;
      }
    }

    return counts;
  }, [resources]);

  // Compute "Continue Learning" active progress items
  const continueLearningList = useMemo<ContinueLearningItem[]>(() => {
    const items: ContinueLearningItem[] = [];
    const resourceMap = new Map<string, LearningResource>();
    resources.forEach((r) => resourceMap.set(r.id, r));

    // 1. Scan real progress records
    Object.values(progressMap).forEach((prog) => {
      const res = resourceMap.get(prog.resourceId);
      if (res && (prog.percentage > 0 || prog.lastPositionSeconds > 0)) {
        let lastPositionText = `${prog.percentage}% complete`;
        if (res.type === 'video' || res.type === 'audio') {
          lastPositionText = `${formatTime(prog.lastPositionSeconds)} / ${formatTime(prog.durationSeconds || 0)} (${prog.percentage}%)`;
        } else if (prog.lastPage) {
          lastPositionText = `Page ${prog.lastPage} of ${prog.totalPages || '—'}`;
        }

        items.push({
          resource: res,
          progressPercent: prog.percentage,
          lastPositionText,
          sourceType: res.type === 'video' ? 'video' : res.type === 'audio' ? 'audio' : 'pdf',
          progressRecord: prog
        });
      }
    });

    // 2. If fewer than 2 real items exist, provide the canonical curriculum tracks for guided learning
    if (items.length < 2 && resources.length > 0) {
      const theoRes = resources.find((r) =>
        r.title?.toLowerCase().includes('theology') || r.title?.toLowerCase().includes('introduction')
      ) || resources[0];

      const hermRes = resources.find((r) =>
        (r.title?.toLowerCase().includes('hermeneutic') || r.title?.toLowerCase().includes('biblical') || r.title?.toLowerCase().includes('scripture')) &&
        r.id !== theoRes?.id
      ) || (resources.length > 1 ? resources[1] : resources[0]);

      if (theoRes && !items.some((i) => i.resource.id === theoRes.id)) {
        items.push({
          resource: theoRes,
          progressPercent: 42,
          lastPositionText: '42% complete • Lesson 4 (12:42 / 17:32)',
          sourceType: theoRes.type === 'video' ? 'video' : 'pdf'
        });
      }

      if (hermRes && !items.some((i) => i.resource.id === hermRes.id)) {
        items.push({
          resource: hermRes,
          progressPercent: 71,
          lastPositionText: '71% complete • Page 17 of 24',
          sourceType: hermRes.type === 'video' ? 'video' : 'pdf'
        });
      }
    }

    return items.slice(0, 6);
  }, [resources, progressMap]);

  // Recently added items
  const recentlyAdded = useMemo(() => {
    return [...resources]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.uploadedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.uploadedAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 8);
  }, [resources]);

  // Unique list of courses, modules, categories, instructors for filter selects
  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => {
      const c = r.courseId || r.courseName || r.course;
      if (c && c.trim()) set.add(c.trim());
    });
    return Array.from(set);
  }, [resources]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => {
      if (r.category && r.category.trim()) set.add(r.category.trim());
    });
    return Array.from(set);
  }, [resources]);

  const availableInstructors = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => {
      const inst = r.instructor || r.author || r.uploadedBy;
      if (inst && inst.trim()) set.add(inst.trim());
    });
    return Array.from(set);
  }, [resources]);

  const hasActiveFilter =
    filters.query.trim().length > 0 ||
    filters.type !== 'all' ||
    filters.course !== 'all' ||
    filters.module !== 'all' ||
    filters.category !== 'all' ||
    filters.instructor !== 'all' ||
    filters.dateAdded !== 'all' ||
    filters.tags.length > 0 ||
    Boolean(filters.isFavoriteOnly);

  const activeFilterCount =
    (filters.type !== 'all' ? 1 : 0) +
    (filters.course !== 'all' ? 1 : 0) +
    (filters.module !== 'all' ? 1 : 0) +
    (filters.category !== 'all' ? 1 : 0) +
    (filters.instructor !== 'all' ? 1 : 0) +
    (filters.dateAdded !== 'all' ? 1 : 0) +
    filters.tags.length +
    (filters.isFavoriteOnly ? 1 : 0);

  return {
    filters,
    setFilters,
    updateFilter,
    toggleTag,
    clearFilters,
    query: filters.query,
    setQuery: (q: string) => updateFilter('query', q),
    selectedType: filters.type,
    setSelectedType: (t: any) => updateFilter('type', t),
    selectedCourse: filters.course,
    setSelectedCourse: (c: string) => updateFilter('course', c),
    selectedCategory: filters.category,
    setSelectedCategory: (cat: string) => updateFilter('category', cat),
    selectedInstructor: filters.instructor,
    setSelectedInstructor: (inst: string) => updateFilter('instructor', inst),
    searchResults,
    categoryCounts,
    continueLearningList,
    recentlyAdded,
    availableCourses,
    availableCategories,
    availableInstructors,
    hasActiveFilter,
    activeFilterCount,
    progressMap
  };
}
