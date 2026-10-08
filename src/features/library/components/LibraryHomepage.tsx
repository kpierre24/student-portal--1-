import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  FileText,
  Video,
  Headphones,
  Globe,
  BookMarked,
  Image as ImageIcon,
  Play,
  Clock,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle,
  X,
  Filter,
  Flame,
  Tag,
  Download,
  Heart,
  Layers,
  GraduationCap,
  ChevronRight,
  Bookmark,
  SlidersHorizontal,
  FolderHeart,
  CheckCircle2,
  HardDriveDownload,
  FileDown,
  Loader2,
  Eye,
  RefreshCw
} from 'lucide-react';
import { testSupabaseConnection } from '../../../lib/supabaseSync';
import { ResourceQuickPreviewModal } from './ResourceQuickPreviewModal';
import { LearningResource, POPULAR_THEOLOGICAL_TAGS } from '../types';
import { useLibrarySearch, ContinueLearningItem } from '../hooks/useLibrarySearch';
import { FilterDrawer } from './FilterDrawer';
import { 
  toggleFavoriteResource, 
  isResourceFavorite,
  getDownloadedResourceIds,
  recordDownloadedResource
} from '../services/favoritesService';
import { formatTime } from '../utils/completionRules';

export interface DownloadableInfo {
  isDownloadable: boolean;
  label: string;
  formatName: string;
  type: string;
}

export function getDownloadableInfo(resource: LearningResource | any): DownloadableInfo {
  if (!resource) {
    return { isDownloadable: false, label: '', formatName: '', type: '' };
  }

  const type = (resource.type || '').toLowerCase();
  const format = (resource.format || '').toUpperCase();
  const url = resource.downloadUrl || resource.url || resource.fileDataUrl || '';
  const explicitDownloadable = resource.isDownloadable;

  // If explicitly disabled
  if (explicitDownloadable === false) {
    return { isDownloadable: false, label: '', formatName: '', type };
  }

  // Pure external web links and websites
  if (type === 'link' || type === 'website') {
    return { isDownloadable: false, label: '', formatName: '', type };
  }

  // Scripture references without dedicated file attachments
  if (type === 'scripture' && !resource.fileDataUrl && !resource.downloadUrl) {
    return { isDownloadable: false, label: '', formatName: '', type };
  }

  // PDF Documents
  if (type === 'pdf' || format === 'PDF' || url.endsWith('.pdf')) {
    return { isDownloadable: true, label: 'Download PDF', formatName: 'PDF', type: 'pdf' };
  }

  // Audio / Sermons / MP3 / Podcasts
  if (type === 'audio' || format === 'MP3' || format === 'WAV' || format === 'M4A' || url.endsWith('.mp3')) {
    return { isDownloadable: true, label: 'Download Audio', formatName: format || 'MP3', type: 'audio' };
  }

  // Infographics, charts, diagrams
  if (type === 'image' || format === 'PNG' || format === 'JPG' || format === 'JPEG' || format === 'WEBP') {
    return { isDownloadable: true, label: 'Download Image', formatName: format || 'PNG', type: 'image' };
  }

  // Documents / Office files
  if (type === 'document' || type === 'presentation' || format === 'DOCX' || format === 'PPTX' || format === 'TXT') {
    return { isDownloadable: true, label: 'Download Document', formatName: format || 'DOC', type: 'document' };
  }

  // Video with direct media file (not purely YouTube/Vimeo web stream)
  if ((type === 'video' || format === 'VIDEO' || format === 'MP4') && (resource.fileDataUrl || (url && !url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('vimeo.com')))) {
    return { isDownloadable: true, label: 'Download Video', formatName: 'MP4', type: 'video' };
  }

  // Official study guides, syllabus, lectures with notes/content
  if (explicitDownloadable === true || resource.fullContent || resource.summary || resource.fileDataUrl || resource.downloadUrl) {
    return { isDownloadable: true, label: 'Download Guide', formatName: 'GUIDE', type: 'guide' };
  }

  return { isDownloadable: false, label: '', formatName: '', type };
}

interface LibraryHomepageProps {
  resources: LearningResource[] | any[];
  onSelectResource: (resource: LearningResource | any) => void;
  onOpenAddResource?: () => void;
  onOpenMyLibrary?: (section?: 'favorites' | 'recent' | 'continue_learning' | 'downloads') => void;
  onSelectCourse?: (courseCode: string, courseTitle: string) => void;
  onDownloadResource?: (resource: LearningResource | any, e?: React.MouseEvent) => void;
  userRole?: string;
  isSyncing?: boolean;
  syncError?: string | null;
  lastSyncedAt?: string | null;
  onTriggerSync?: () => void;
}

export const LibraryHomepage: React.FC<LibraryHomepageProps> = ({
  resources,
  onSelectResource,
  onOpenAddResource,
  onOpenMyLibrary,
  onSelectCourse,
  onDownloadResource,
  userRole,
  isSyncing: propIsSyncing,
  syncError: propSyncError,
  lastSyncedAt: propLastSyncedAt,
  onTriggerSync
}) => {
  const {
    filters,
    setFilters,
    updateFilter,
    toggleTag,
    clearFilters,
    query,
    setQuery,
    selectedType,
    setSelectedType,
    selectedCourse,
    setSelectedCourse,
    selectedCategory,
    setSelectedCategory,
    selectedInstructor,
    setSelectedInstructor,
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
  } = useLibrarySearch(resources);

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [favoriteRefreshKey, setFavoriteRefreshKey] = useState(0);
  const [downloadRefreshKey, setDownloadRefreshKey] = useState(0);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [processingDownloadIds, setProcessingDownloadIds] = useState<Set<string>>(new Set());
  const [quickPreviewResource, setQuickPreviewResource] = useState<LearningResource | null>(null);

  // Real-time Supabase Database Sync Status State
  const [internalSyncing, setInternalSyncing] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [internalLastSynced, setInternalLastSynced] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hteim_last_supabase_sync_time') || null;
    }
    return null;
  });

  const isSyncing = propIsSyncing !== undefined ? propIsSyncing : internalSyncing;
  const syncError = propSyncError !== undefined ? propSyncError : internalError;
  const lastSynced = propLastSyncedAt !== undefined ? propLastSyncedAt : internalLastSynced;

  const syncStatus: 'synced' | 'syncing' | 'error' = isSyncing
    ? 'syncing'
    : syncError
    ? 'error'
    : 'synced';

  // Listen for real-time synchronization broadcast events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSyncStatus = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      if (typeof detail.isSyncing === 'boolean') setInternalSyncing(detail.isSyncing);
      if (detail.syncError !== undefined) setInternalError(detail.syncError);
      if (detail.lastSyncedAt) {
        setInternalLastSynced(detail.lastSyncedAt);
        localStorage.setItem('hteim_last_supabase_sync_time', detail.lastSyncedAt);
      }
    };

    window.addEventListener('hteim_sync_status', handleSyncStatus);
    return () => {
      window.removeEventListener('hteim_sync_status', handleSyncStatus);
    };
  }, []);

  const handleManualSync = async () => {
    if (onTriggerSync) {
      onTriggerSync();
      return;
    }

    setInternalSyncing(true);
    setInternalError(null);
    try {
      const isOnline = await testSupabaseConnection();
      if (!isOnline) {
        setInternalError('Database offline or unreachable');
      } else {
        const timeStr = new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setInternalLastSynced(timeStr);
        if (typeof window !== 'undefined') {
          localStorage.setItem('hteim_last_supabase_sync_time', timeStr);
        }
      }
    } catch (err: any) {
      setInternalError(err?.message || 'Sync error');
    } finally {
      setInternalSyncing(false);
    }
  };

  // Load downloaded IDs from localStorage
  useEffect(() => {
    setDownloadedIds(getDownloadedResourceIds());
  }, [downloadRefreshKey]);

  const handleToggleFavorite = (e: React.MouseEvent, resId: string) => {
    e.stopPropagation();
    toggleFavoriteResource(resId);
    setFavoriteRefreshKey((k) => k + 1);
  };

  // Direct download trigger with client-side file builder fallback and processing spinner
  const handleDownloadResource = async (resource: LearningResource | any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const resId = resource?.id;
    if (!resId) return;

    // Set resource as processing to trigger subtle loading spinner
    setProcessingDownloadIds((prev) => new Set(prev).add(resId));

    try {
      if (onDownloadResource) {
        await Promise.resolve(onDownloadResource(resource, e));
      }

      // Small async yielding window (450ms) to ensure smooth spinner animation
      // and allow the browser to package and generate the blob/document seamlessly
      await new Promise((resolve) => setTimeout(resolve, 450));

      // Client-side file generation & download
      if (resource.fileDataUrl) {
        const link = document.createElement('a');
        link.href = resource.fileDataUrl;
        link.download = resource.fileName || `${(resource.title || 'Resource').replace(/[^a-zA-Z0-9_-]/g, '_')}.${(resource.format || resource.type || 'pdf').toLowerCase()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (resource.downloadUrl && !resource.downloadUrl.includes('youtube.com') && !resource.downloadUrl.includes('youtu.be')) {
        const link = document.createElement('a');
        link.href = resource.downloadUrl;
        link.download = resource.fileName || `${(resource.title || 'Resource').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Generate structured lesson study guide text/markdown file
        const fileText = `=====================================================
HTEIM SCHOOL OF MINISTRY - OFFICIAL LESSON RESOURCE
=====================================================
TITLE: ${resource.title || 'Untitled Resource'}
AUTHOR / INSTRUCTOR: ${resource.author || resource.instructor || resource.uploadedBy || 'HTEIM Faculty'}
COURSE CODE: ${resource.courseCode || resource.courseId || 'SOM-CORE'}
CATEGORY: ${resource.category || 'Curriculum Material'}
TYPE: ${(resource.type || 'Study Guide').toUpperCase()}
=====================================================

DESCRIPTION & SUMMARY:
-----------------------------------------------------
${resource.description || resource.summary || 'Official theological curriculum material for HTEIM School of Ministry.'}

${resource.keyTakeaways && resource.keyTakeaways.length > 0 ? `KEY TAKEAWAYS & OUTCOMES:
${resource.keyTakeaways.map((k: string, i: number) => `${i + 1}. ${k}`).join('\n')}
-----------------------------------------------------` : ''}

${resource.scriptureReferences && resource.scriptureReferences.length > 0 ? `SCRIPTURE REFERENCES:
${resource.scriptureReferences.map((s: string) => `• ${s}`).join('\n')}
-----------------------------------------------------` : ''}

LESSON CONTENT / STUDY NOTES:
-----------------------------------------------------
${resource.fullContent || resource.content || 'Full lesson document content loaded for student reference.'}
`;

        const blob = new Blob([fileText], { type: 'text/plain;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${(resource.title || 'HTEIM_Resource').replace(/[^a-zA-Z0-9_-]/g, '_')}_StudyGuide.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }

      // Persist download in favoritesService / localStorage
      recordDownloadedResource(resource.id);
      setDownloadedIds((prev) => (prev.includes(resource.id) ? prev : [resource.id, ...prev]));
      setDownloadRefreshKey((prev) => prev + 1);
    } finally {
      // Clear processing status
      setProcessingDownloadIds((prev) => {
        const next = new Set(prev);
        next.delete(resId);
        return next;
      });
    }
  };

  // Compute downloaded resources list from all resources
  const downloadedResources = downloadedIds
    .map((id) => resources.find((r) => r.id === id))
    .filter(Boolean) as LearningResource[];

  // Compute top downloadable curriculum items for empty state recommendations
  const recommendedDownloadables = resources
    .filter((r) => getDownloadableInfo(r).isDownloadable)
    .slice(0, 4);

  // Pre-defined Core Curriculum Tracks for "My Courses"
  const courseTracks = [
    {
      id: 'systematic-theology',
      title: 'Systematic Theology',
      code: 'SOM-THEO',
      description: 'Doctrine of God, Christology, Pneumatology & Soteriology',
      icon: BookOpen,
      color: 'from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30'
    },
    {
      id: 'biblical-studies',
      title: 'Biblical Studies',
      code: 'SOM-BIBL',
      description: 'Hermeneutics, Exegesis, Old & New Testament Survey',
      icon: BookMarked,
      color: 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30'
    },
    {
      id: 'christian-leadership',
      title: 'Christian Leadership',
      code: 'SOM-LEAD',
      description: 'Apostolic Governance, Ministerial Ethics & Church Order',
      icon: GraduationCap,
      color: 'from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30'
    },
    {
      id: 'prophetic-ministry',
      title: 'Prophetic Ministry',
      code: 'SOM-PROP',
      description: 'Spiritual Discernment, Revelation & Spiritual Warfare',
      icon: Flame,
      color: 'from-rose-500/20 to-rose-600/10 text-rose-400 border-rose-500/30'
    },
    {
      id: 'pastoral-ministry',
      title: 'Pastoral Ministry',
      code: 'SOM-PAST',
      description: 'Homiletics, Shepherding, Counseling & Pulpit Ministry',
      icon: Layers,
      color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30'
    },
    {
      id: 'evangelism-missions',
      title: 'Evangelism & Soul Winning',
      code: 'SOM-EVAN',
      description: 'Great Commission, Apostolic Missions & Apologetics',
      icon: Sparkles,
      color: 'from-cyan-500/20 to-cyan-600/10 text-cyan-400 border-cyan-500/30'
    }
  ];

  // Helper for type icons
  const getTypeBadge = (resource: LearningResource | any) => {
    const type = (resource.type || '').toLowerCase();
    const format = (resource.format || '').toUpperCase();

    if (type === 'pdf' || format === 'PDF') {
      return { label: 'PDF Document', icon: FileText, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    }
    if (type === 'video' || format === 'YOUTUBE' || format === 'VIMEO') {
      return { label: format === 'YOUTUBE' ? 'YouTube Video' : 'Video Lesson', icon: Video, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    }
    if (type === 'audio' || format === 'MP3' || format === 'WAV' || format === 'M4A') {
      return { label: `${format || 'MP3'} Audio`, icon: Headphones, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    }
    if (type === 'link' || type === 'website') {
      return { label: 'Web Resource', icon: Globe, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    }
    if (type === 'scripture' || (resource.category || '').toLowerCase().includes('scripture')) {
      return { label: 'Scripture', icon: BookMarked, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
    }
    if (type === 'image' || format === 'PNG' || format === 'JPG') {
      return { label: 'Infographic', icon: ImageIcon, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    }
    return { label: 'Resource', icon: FileText, color: 'text-slate-400 bg-slate-800 border-slate-700' };
  };

  return (
    <div className="grid grid-cols-1 w-full min-w-0 gap-6 sm:gap-8 pb-safe pb-mobile-nav md:pb-12">
      {/* 1. Header & Hero Search Section */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Real-time Supabase Database Sync Status Indicator Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-amber-400/90">
              School of Ministry Theological Repository
            </span>
          </div>

          {/* Real-time Supabase Database Sync Status Indicator with pulsing dot */}
          <div
            data-testid="supabase-sync-indicator"
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs ${
              syncStatus === 'syncing'
                ? 'bg-amber-500/15 border border-amber-500/35 text-amber-300'
                : syncStatus === 'error'
                ? 'bg-rose-500/15 border border-rose-500/35 text-rose-300'
                : 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300'
            }`}
          >
            {/* Small pulsing dot (green for synced, amber for syncing, red for error) */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {syncStatus === 'syncing' ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
                </>
              ) : syncStatus === 'error' ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                </>
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </>
              )}
            </span>

            <span className="font-bold tracking-tight">
              {syncStatus === 'syncing'
                ? 'Syncing with Supabase...'
                : syncStatus === 'error'
                ? 'Supabase Sync Error'
                : 'Supabase Synced'}
            </span>

            {lastSynced && syncStatus !== 'syncing' && (
              <span className="hidden sm:inline-block text-[10px] opacity-75 font-mono border-l border-current/25 pl-2">
                {lastSynced}
              </span>
            )}

            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing'}
              title="Verify or trigger sync with Supabase database"
              aria-label="Refresh Supabase sync status"
              className="ml-0.5 p-0.5 rounded hover:bg-white/10 opacity-80 hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                  LIBRARY
                </h1>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300">
              Access course syllabi, sermon audio, lecture videos, biblical diagrams, and foundational curriculum resources.
            </p>
          </div>

          {/* Quick Access to My Library & My Downloads */}
          <div className="flex items-center gap-2 pt-1 md:pt-0 flex-wrap">
            {onOpenMyLibrary && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenMyLibrary('favorites')}
                  className="min-h-[44px] px-3.5 sm:px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm hover:border-amber-500/40 cursor-pointer active:opacity-80"
                >
                  <FolderHeart className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>My Library</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenMyLibrary('downloads')}
                  className="min-h-[44px] px-3.5 sm:px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm hover:border-emerald-500/40 cursor-pointer active:opacity-80"
                >
                  <HardDriveDownload className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>My Downloads</span>
                  {downloadedResources.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-md text-[10px] font-mono font-black border border-emerald-500/30">
                      {downloadedResources.length}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Prominent Search Bar (Phase 14 & 15) */}
        <div className="relative pt-2">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 absolute left-3.5 sm:left-4 text-slate-400 pointer-events-none shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search resources by title, description, instructor, tags, course, Scripture..."
                aria-label="Search resources"
                className="w-full min-h-[44px] bg-slate-950/90 text-white pl-11 sm:pl-12 pr-11 py-3 rounded-xl border border-slate-700/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs sm:text-sm placeholder-slate-500 transition-all shadow-inner"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-1 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Drawer Trigger Button (Phase 15) */}
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-all shrink-0 cursor-pointer active:opacity-80 ${
                activeFilterCount > 0
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700/80'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black flex items-center justify-center font-mono">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Phase 16: Tags Bar */}
          <div className="pt-3 flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
              <Tag className="w-3.5 h-3.5 text-amber-400" /> Tags:
            </span>
            {POPULAR_THEOLOGICAL_TAGS.map((tag) => {
              const isSelected = filters.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border cursor-pointer active:opacity-80 flex items-center ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs font-bold'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Phase 15: Filter Bar Quick Type Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-4 border-t border-slate-800/80 mt-4">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Format:
          </span>

          {[
            { id: 'all', label: 'All Formats', count: categoryCounts.all },
            { id: 'documents', label: '📄 Documents', count: categoryCounts.documents },
            { id: 'videos', label: '▶ Videos', count: categoryCounts.videos },
            { id: 'audio', label: '🎧 Audio', count: categoryCounts.audio },
            { id: 'websites', label: '🔗 Websites', count: categoryCounts.websites },
            { id: 'scriptures', label: '📖 Scripture', count: categoryCounts.scriptures },
            { id: 'images', label: '🖼 Images', count: categoryCounts.images }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedType(tab.id as any)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:opacity-80 ${
                selectedType === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/30'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedType === tab.id
                    ? 'bg-slate-950/30 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}

          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto min-h-[36px] flex items-center text-xs text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
            >
              Reset Filters ({activeFilterCount})
            </button>
          )}
        </div>
      </section>

      {/* 2. SEARCH & FILTER RESULTS VIEW (When query or filter is active) */}
      {hasActiveFilter ? (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-400" />
              <span>
                Search Results {query ? `for "${query}"` : ''}
              </span>
              <span className="text-xs font-normal text-slate-400">
                ({searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found)
              </span>
            </h2>

            <div className="flex items-center gap-2">
              {filters.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  {filters.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md text-[11px]">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              {selectedCourse !== 'all' && (
                <span className="text-xs px-2.5 py-1 bg-slate-800 text-amber-300 rounded-lg border border-slate-700">
                  Course: {selectedCourse}
                </span>
              )}
            </div>
          </div>

          {searchResults.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No matching resources found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No resources matched your search filter criteria. Try clearing filters or searching with broad theological terms (e.g. <em>Theology</em>, <em>Sermon</em>, <em>Holy Spirit</em>).
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Clear Search & Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map(({ resource, matchedFields, snippet }) => {
                const badge = getTypeBadge(resource);
                const isSaved = isResourceFavorite(resource.id);
                const isDownloaded = downloadedIds.includes(resource.id);
                const downloadInfo = getDownloadableInfo(resource);
                const InstructorIcon = User;
                const authorName =
                  (resource as any).instructor ||
                  resource.author ||
                  (resource as any).speaker ||
                  resource.uploadedBy ||
                  'HTEIM Faculty';

                return (
                  <div
                    key={resource.id}
                    onClick={() => onSelectResource(resource)}
                    className="group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 shadow-md hover:shadow-xl hover:scale-[1.01]"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${badge.color}`}
                          >
                            <badge.icon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>

                          {isDownloaded && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Downloaded</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {matchedFields.length > 0 && query && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              matched: {matchedFields.join(', ')}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(e, resource.id)}
                            title={isSaved ? 'Remove from Saved' : 'Save to My Library'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSaved
                                ? 'text-rose-400 bg-rose-500/10'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                        {resource.title}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {snippet || resource.description || 'Comprehensive School of Ministry curriculum resource.'}
                      </p>

                      {/* Tags chips */}
                      {resource.tags && resource.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {resource.tags.slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-slate-950/80 text-slate-400 rounded border border-slate-800">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 gap-2">
                      <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                        <InstructorIcon className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                        <span className="truncate">{authorName}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {downloadInfo.isDownloadable && (
                          <button
                            type="button"
                            disabled={processingDownloadIds.has(resource.id)}
                            onClick={(e) => handleDownloadResource(resource, e)}
                            title={
                              processingDownloadIds.has(resource.id)
                                ? 'Preparing download...'
                                : isDownloaded
                                ? 'Downloaded (click to download again)'
                                : downloadInfo.label
                            }
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer active:opacity-80 disabled:opacity-75 disabled:cursor-wait ${
                              isDownloaded
                                ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20'
                                : 'text-slate-300 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 border border-slate-700/60'
                            }`}
                          >
                            {processingDownloadIds.has(resource.id) ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                                <span className="hidden xs:inline">Preparing...</span>
                              </>
                            ) : isDownloaded ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="hidden xs:inline">Downloaded</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className="hidden xs:inline">{downloadInfo.label}</span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickPreviewResource(resource);
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 transition-all flex items-center gap-1 cursor-pointer"
                          title="Quick Preview synopsis and metadata"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Quick Preview</span>
                        </button>

                        <div className="flex items-center gap-1 text-amber-400 font-bold text-xs group-hover:translate-x-1 transition-transform">
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* 3. DEFAULT HOMEPAGE SECTIONS */
        <div className="space-y-10">
          {/* Section A: Continue Learning (Phase 13 & 18) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-amber-400 fill-current" />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
                  Continue Learning
                </h2>
              </div>
              <span className="text-xs text-slate-500">Pick up where you left off</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {continueLearningList.map((item) => {
                const isSaved = isResourceFavorite(item.resource.id);
                const isDownloaded = downloadedIds.includes(item.resource.id);
                const downloadInfo = getDownloadableInfo(item.resource);

                return (
                  <div
                    key={item.resource.id}
                    onClick={() => onSelectResource(item.resource)}
                    className="group bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer space-y-3 shadow-lg hover:shadow-amber-950/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors shrink-0">
                          <Play className="w-4 h-4 fill-current translate-x-0.5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                            {item.resource.title}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {item.lastPositionText || `${item.progressPercent}% complete`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {downloadInfo.isDownloadable && (
                          <button
                            type="button"
                            disabled={processingDownloadIds.has(item.resource.id)}
                            onClick={(e) => handleDownloadResource(item.resource, e)}
                            title={
                              processingDownloadIds.has(item.resource.id)
                                ? 'Preparing download...'
                                : isDownloaded
                                ? 'Downloaded'
                                : downloadInfo.label
                            }
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-wait ${
                              isDownloaded ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                            }`}
                          >
                            {processingDownloadIds.has(item.resource.id) ? (
                              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                            ) : isDownloaded ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickPreviewResource(item.resource);
                          }}
                          className="p-1.5 rounded-lg text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 transition-colors cursor-pointer"
                          title="Quick Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold font-mono text-amber-400">
                          {item.progressPercent}%
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, item.resource.id)}
                          className={`p-1 rounded-lg ${isSaved ? 'text-rose-400' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar (Phase 18) */}
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(6, item.progressPercent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section B: My Courses (Phase 13) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
                  My Courses
                </h2>
              </div>
              <span className="text-xs text-slate-500">Curriculum Tracks</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courseTracks.map((course) => {
                const Icon = course.icon;
                return (
                  <div
                    key={course.id}
                    onClick={() => {
                      if (onSelectCourse) {
                        onSelectCourse(course.code, course.title);
                      } else {
                        setSelectedCourse(course.title);
                        setQuery(course.title);
                      }
                    }}
                    className="group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 shadow-md hover:scale-[1.02]"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-xl border bg-gradient-to-br ${course.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 font-semibold uppercase">
                          {course.code}
                        </span>
                      </div>

                      <h3 className="text-sm font-extrabold text-white group-hover:text-amber-300 transition-colors">
                        {course.title}
                      </h3>

                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                        {course.description}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-slate-500 group-hover:text-slate-300">
                      <span>Explore lectures</span>
                      <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section C: My Downloads & Offline Files */}
          <section id="my-downloads-section" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDriveDownload className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span>My Downloads</span>
                  {downloadedResources.length > 0 && (
                    <span className="px-2 py-0.2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-black">
                      {downloadedResources.length}
                    </span>
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Offline Study Materials</span>
                {onOpenMyLibrary && (
                  <button
                    type="button"
                    onClick={() => onOpenMyLibrary('downloads')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer"
                  >
                    View All →
                  </button>
                )}
              </div>
            </div>

            {downloadedResources.length === 0 ? (
              <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <FileDown className="w-4 h-4 shrink-0" />
                    <span>Download Theological Resources for Offline Access</span>
                  </div>
                  <h3 className="text-base font-bold text-white">No downloaded materials in your local storage</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Download course syllabi, sermon audio recordings, and foundational ministry study guides to read and study anytime without an active internet connection.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
                  {recommendedDownloadables.length > 0 && (
                    <button
                      type="button"
                      disabled={processingDownloadIds.has(recommendedDownloadables[0].id)}
                      onClick={() => handleDownloadResource(recommendedDownloadables[0])}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-wait"
                    >
                      {processingDownloadIds.has(recommendedDownloadables[0].id) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-white" />
                          <span>Preparing Download...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 shrink-0" />
                          <span>Download Sample Guide</span>
                        </>
                      )}
                    </button>
                  )}
                  {onOpenMyLibrary && (
                    <button
                      type="button"
                      onClick={() => onOpenMyLibrary('downloads')}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Downloads Manager</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {downloadedResources.map((res) => {
                  const badge = getTypeBadge(res);
                  const isSaved = isResourceFavorite(res.id);
                  const downloadInfo = getDownloadableInfo(res);

                  return (
                    <div
                      key={res.id}
                      onClick={() => onSelectResource(res)}
                      className="group bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 shadow-md hover:shadow-xl hover:scale-[1.01]"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${badge.color}`}
                          >
                            <badge.icon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Downloaded</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorite(e, res.id)}
                              title={isSaved ? 'Remove from Saved' : 'Save to My Library'}
                              className={`p-1 rounded-lg transition-colors ${
                                isSaved ? 'text-rose-400' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                          {res.title}
                        </h3>

                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {res.description || (res as any).courseName || res.courseId || 'Offline theological resource'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 gap-2">
                        <span className="truncate max-w-[140px]">
                          {(res as any).instructor || res.author || 'HTEIM Faculty'}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={processingDownloadIds.has(res.id)}
                            onClick={(e) => handleDownloadResource(res, e)}
                            title={
                              processingDownloadIds.has(res.id)
                                ? 'Preparing download...'
                                : 'Re-download this file'
                            }
                            className="px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-75 disabled:cursor-wait"
                          >
                            {processingDownloadIds.has(res.id) ? (
                              <>
                                <Loader2 className="w-3 h-3 text-emerald-400 animate-spin shrink-0" />
                                <span>Preparing...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3 h-3 text-emerald-400" />
                                <span>Save Again</span>
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1 text-amber-400 font-bold text-xs group-hover:translate-x-1 transition-transform">
                            <span>Open</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section D: Browse Resources (Phase 13) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
                  Browse Resources
                </h2>
              </div>
              <span className="text-xs text-slate-500">Filter by media type</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                {
                  id: 'documents',
                  label: 'Documents',
                  sub: 'PDFs & Guides',
                  icon: FileText,
                  count: categoryCounts.documents,
                  color: 'text-rose-400 hover:border-rose-500/40 bg-rose-500/5'
                },
                {
                  id: 'videos',
                  label: 'Videos',
                  sub: 'YouTube & Vimeo',
                  icon: Video,
                  count: categoryCounts.videos,
                  color: 'text-red-400 hover:border-red-500/40 bg-red-500/5'
                },
                {
                  id: 'audio',
                  label: 'Audio',
                  sub: 'Sermons & MP3',
                  icon: Headphones,
                  count: categoryCounts.audio,
                  color: 'text-amber-400 hover:border-amber-500/40 bg-amber-500/5'
                },
                {
                  id: 'websites',
                  label: 'Websites',
                  sub: 'Portals & Links',
                  icon: Globe,
                  count: categoryCounts.websites,
                  color: 'text-blue-400 hover:border-blue-500/40 bg-blue-500/5'
                },
                {
                  id: 'scriptures',
                  label: 'Scripture',
                  sub: 'Cross References',
                  icon: BookMarked,
                  count: categoryCounts.scriptures,
                  color: 'text-purple-400 hover:border-purple-500/40 bg-purple-500/5'
                },
                {
                  id: 'images',
                  label: 'Images',
                  sub: 'Charts & Maps',
                  icon: ImageIcon,
                  count: categoryCounts.images,
                  color: 'text-emerald-400 hover:border-emerald-500/40 bg-emerald-500/5'
                }
              ].map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedType(cat.id as any)}
                    className={`p-4 rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800/90 text-left transition-all duration-150 flex flex-col justify-between space-y-2 group shadow-sm hover:scale-105 ${cat.color}`}
                  >
                    <Icon className="w-5 h-5" />
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-300">
                        {cat.label}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {cat.count} {cat.count === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section E: Recently Added (Phase 13) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
                  Recently Added
                </h2>
              </div>
              <span className="text-xs text-slate-500">Latest theological materials</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentlyAdded.map((res) => {
                const badge = getTypeBadge(res);
                const isSaved = isResourceFavorite(res.id);
                const isDownloaded = downloadedIds.includes(res.id);
                const downloadInfo = getDownloadableInfo(res);

                return (
                  <div
                    key={res.id}
                    onClick={() => onSelectResource(res)}
                    className="group bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 shadow-md hover:shadow-xl hover:scale-[1.02]"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${badge.color}`}
                        >
                          <badge.icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isDownloaded && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                              ✓
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(e, res.id)}
                            className={`p-1 rounded-lg transition-colors ${
                              isSaved ? 'text-rose-400' : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                        {res.title}
                      </h3>

                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {res.description || res.courseName || 'HTEIM Ministerial Resource'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 gap-2">
                      <span className="truncate max-w-[120px]">
                        {(res as any).instructor || res.author || 'HTEIM Faculty'}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        {downloadInfo.isDownloadable && (
                          <button
                            type="button"
                            disabled={processingDownloadIds.has(res.id)}
                            onClick={(e) => handleDownloadResource(res, e)}
                            title={
                              processingDownloadIds.has(res.id)
                                ? 'Preparing download...'
                                : isDownloaded
                                ? 'Downloaded (click to download again)'
                                : downloadInfo.label
                            }
                            className={`p-1 rounded-md transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-wait ${
                              isDownloaded
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                            }`}
                          >
                            {processingDownloadIds.has(res.id) ? (
                              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickPreviewResource(res);
                          }}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/80 transition-all flex items-center gap-1 cursor-pointer"
                          title="Quick Preview synopsis and metadata"
                        >
                          <Eye className="w-3 h-3 text-indigo-400" />
                          <span>Preview</span>
                        </button>
                        <div className="flex items-center gap-1 text-amber-400 font-bold group-hover:translate-x-1 transition-transform">
                          <span>Read</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Phase 15: Filter Drawer Modal / Slide-out */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
        onReset={clearFilters}
        availableCourses={availableCourses}
        availableCategories={availableCategories}
        availableInstructors={availableInstructors}
        totalResultsCount={searchResults.length}
      />

      {/* Resource Quick Preview Modal */}
      <ResourceQuickPreviewModal
        resource={quickPreviewResource}
        isOpen={!!quickPreviewResource}
        onClose={() => setQuickPreviewResource(null)}
        onSelectResource={onSelectResource}
        onDownloadResource={handleDownloadResource}
      />
    </div>
  );
};
