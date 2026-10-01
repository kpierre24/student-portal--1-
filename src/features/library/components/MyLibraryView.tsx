import React, { useState, useEffect } from 'react';
import {
  Heart,
  Clock,
  PlayCircle,
  Download,
  BookOpen,
  Video,
  FileText,
  Headphones,
  Globe,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { LearningResource, MyLibrarySection, ResourceProgress } from '../types';
import { getFavoriteResourceIds, getRecentResourceIds, getDownloadedResourceIds, toggleFavoriteResource } from '../services/favoritesService';
import { loadAllLocalProgress, recordResourceProgress } from '../services/progressService';
import { formatTime } from '../utils/completionRules';

interface MyLibraryViewProps {
  resources: LearningResource[];
  onSelectResource: (resource: LearningResource) => void;
  onNavigateToCatalog?: () => void;
  initialSection?: MyLibrarySection;
}

export const MyLibraryView: React.FC<MyLibraryViewProps> = ({
  resources,
  onSelectResource,
  onNavigateToCatalog,
  initialSection = 'favorites'
}) => {
  const [activeSection, setActiveSection] = useState<MyLibrarySection>(initialSection);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [downloadIds, setDownloadIds] = useState<string[]>([]);
  const [progressRecords, setProgressRecords] = useState<Record<string, ResourceProgress>>({});

  // Reload state
  const refreshData = () => {
    setFavoriteIds(getFavoriteResourceIds());
    setRecentIds(getRecentResourceIds());
    setDownloadIds(getDownloadedResourceIds());
    setProgressRecords(loadAllLocalProgress());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const resourceMap = new Map<string, LearningResource>();
  resources.forEach((r) => resourceMap.set(r.id, r));

  // 1. Favorites List
  const favoriteResources = favoriteIds
    .map((id) => resourceMap.get(id))
    .filter((r): r is LearningResource => Boolean(r));

  // 2. Recent List
  const recentResources = recentIds
    .map((id) => resourceMap.get(id))
    .filter((r): r is LearningResource => Boolean(r));

  // 3. Continue Learning List (resources with > 0% and < 100% or recently viewed with progress)
  const continueLearningItems: { resource: LearningResource; progress: ResourceProgress }[] = [];
  Object.values(progressRecords).forEach((prog) => {
    const res = resourceMap.get(prog.resourceId);
    if (res && (prog.percentage > 0 || prog.lastPositionSeconds > 0)) {
      continueLearningItems.push({ resource: res, progress: prog });
    }
  });
  // Sort continue learning items by lastViewedAt desc
  continueLearningItems.sort((a, b) => {
    const dateA = new Date(a.progress.lastViewedAt || 0).getTime();
    const dateB = new Date(b.progress.lastViewedAt || 0).getTime();
    return dateB - dateA;
  });

  // 4. Downloads List
  const downloadedResources = downloadIds
    .map((id) => resourceMap.get(id))
    .filter((r): r is LearningResource => Boolean(r));

  const handleToggleFavorite = (e: React.MouseEvent, resId: string) => {
    e.stopPropagation();
    toggleFavoriteResource(resId);
    refreshData();
  };

  const renderResourceIcon = (type?: string) => {
    switch ((type || '').toLowerCase()) {
      case 'video':
        return <Video className="w-4 h-4 text-rose-400" />;
      case 'audio':
        return <Headphones className="w-4 h-4 text-amber-400" />;
      case 'pdf':
      case 'document':
      case 'presentation':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'link':
      case 'website':
        return <Globe className="w-4 h-4 text-purple-400" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-pink-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div id="my-library-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                Student Theological Dashboard
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              My Library
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Track your lecture progress, saved study notes, offline downloads, and active course tracks.
            </p>
          </div>

          {/* Stat Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-slate-950/80 border border-slate-700/60 rounded-xl px-3.5 py-2 text-center">
              <div className="text-lg font-black text-amber-400">{favoriteResources.length}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Favorites</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-700/60 rounded-xl px-3.5 py-2 text-center">
              <div className="text-lg font-black text-emerald-400">{continueLearningItems.length}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">In Progress</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-700/60 rounded-xl px-3.5 py-2 text-center">
              <div className="text-lg font-black text-purple-400">{recentResources.length}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Recent</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu: Favorites, Recent, Continue Learning, Downloads */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 overflow-x-auto">
        <button
          id="tab-my-lib-favorites"
          type="button"
          onClick={() => setActiveSection('favorites')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'favorites'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Heart className={`w-4 h-4 ${activeSection === 'favorites' ? 'fill-current' : ''}`} />
          Favorites ({favoriteResources.length})
        </button>

        <button
          id="tab-my-lib-continue"
          type="button"
          onClick={() => setActiveSection('continue_learning')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'continue_learning'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <PlayCircle className="w-4 h-4" />
          Continue Learning ({continueLearningItems.length})
        </button>

        <button
          id="tab-my-lib-recent"
          type="button"
          onClick={() => setActiveSection('recent')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'recent'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          Recent ({recentResources.length})
        </button>

        <button
          id="tab-my-lib-downloads"
          type="button"
          onClick={() => setActiveSection('downloads')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'downloads'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Download className="w-4 h-4" />
          Downloads ({downloadedResources.length})
        </button>
      </div>

      {/* SECTION CONTENT */}

      {/* 1. FAVORITES SECTION */}
      {activeSection === 'favorites' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
              Saved Resources & Study Bookmarks
            </h2>
            <span className="text-xs text-slate-400">Click any card to open in viewer</span>
          </div>

          {favoriteResources.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Heart className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">No saved favorites yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Press the ♡ Save button on any course lecture, study guide, or sermon to bookmark it here for quick review.
              </p>
              {onNavigateToCatalog && (
                <button
                  type="button"
                  onClick={onNavigateToCatalog}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-slate-700 transition-colors"
                >
                  Browse Theological Library <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteResources.map((res) => {
                const prog = progressRecords[`current_student_${res.id}`];
                return (
                  <div
                    key={res.id}
                    id={`fav-card-${res.id}`}
                    onClick={() => onSelectResource(res)}
                    className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-lg hover:shadow-amber-500/5 relative"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                            {renderResourceIcon(res.type)}
                          </span>
                          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                            {res.category || (res.type || 'Resource').toUpperCase()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, res.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Remove from favorites"
                        >
                          <Heart className="w-4 h-4 fill-rose-400" />
                        </button>
                      </div>

                      <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                        {res.title}
                      </h3>

                      {res.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{res.description}</p>
                      )}

                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <span>{res.author || (res as any).instructor || 'Elder Renee Pierre'}</span>
                        {res.courseId && (
                          <>
                            <span>•</span>
                            <span className="truncate">{res.courseId}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress Indicator if any */}
                    {prog && prog.percentage > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-medium">Progress</span>
                          <span className="text-amber-400 font-bold">{prog.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${prog.percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. CONTINUE LEARNING SECTION (Phase 18) */}
      {activeSection === 'continue_learning' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-amber-400" />
                Continue Learning & In-Progress Tracks
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pick up exactly where you left off in your theological studies
              </p>
            </div>
          </div>

          {continueLearningItems.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <PlayCircle className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">No active progress recorded</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Open any lecture video, syllabus PDF, or sermon audio in the library to start tracking your completion progress.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {continueLearningItems.map(({ resource, progress }) => {
                const isVideoOrAudio = resource.type === 'video' || resource.type === 'audio';
                const positionStr = isVideoOrAudio
                  ? `${formatTime(progress.lastPositionSeconds)} / ${formatTime(progress.durationSeconds || 0)}`
                  : progress.lastPage
                  ? `Page ${progress.lastPage} of ${progress.totalPages || '—'}`
                  : `${progress.percentage}% completed`;

                return (
                  <div
                    key={resource.id}
                    id={`continue-item-${resource.id}`}
                    onClick={() => onSelectResource(resource)}
                    className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3.5 flex-1">
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                        {renderResourceIcon(resource.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                            {(resource as any).courseName || resource.courseId || 'Systematic Theology'}
                          </span>
                          {progress.completed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                          {resource.title}
                        </h3>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span>Instructor: {resource.author || (resource as any).instructor || 'Elder Renee Pierre'}</span>
                          <span>•</span>
                          <span className="text-amber-300 font-mono font-medium">{positionStr}</span>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="mt-3 max-w-md">
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                progress.completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-amber-400'
                              }`}
                              style={{ width: `${Math.max(5, progress.percentage)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="sm:self-center shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 transition-all"
                      >
                        {progress.completed
                          ? 'Review Material'
                          : isVideoOrAudio
                          ? `Continue (${formatTime(progress.lastPositionSeconds)})`
                          : 'Resume Reading'}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. RECENT SECTION */}
      {activeSection === 'recent' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Recently Viewed Materials
            </h2>
            <span className="text-xs text-slate-400">History across all devices</span>
          </div>

          {recentResources.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Clock className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">No recently opened resources</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Items you open in the library will automatically appear here for easy reference.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentResources.map((res) => (
                <div
                  key={res.id}
                  id={`recent-card-${res.id}`}
                  onClick={() => onSelectResource(res)}
                  className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                        {renderResourceIcon(res.type)}
                      </span>
                      <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                        {res.category || (res.type || 'Resource').toUpperCase()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                      {res.title}
                    </h3>

                    {res.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{res.description}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <span>{res.author || (res as any).instructor || 'Elder Renee Pierre'}</span>
                    <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform">Open →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. DOWNLOADS SECTION */}
      {activeSection === 'downloads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              Downloaded Syllabus & Offline Files
            </h2>
            <span className="text-xs text-slate-400">Available for offline ministry study</span>
          </div>

          {downloadedResources.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Download className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">No files downloaded yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                When you download study notes, lecture slides, or audio files, they will be logged here for quick offline access.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {downloadedResources.map((res) => (
                <div
                  key={res.id}
                  id={`download-card-${res.id}`}
                  onClick={() => onSelectResource(res)}
                  className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                        {renderResourceIcon(res.type)}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                        {res.category || 'Downloaded'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                      {res.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{res.description || 'Offline study file'}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <span className="text-emerald-400 font-medium">Downloaded ✓</span>
                    <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform">View →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
