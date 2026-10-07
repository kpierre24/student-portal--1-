import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Video,
  Headphones,
  Globe,
  ImageIcon,
  BookOpen,
  BookMarked,
  Clock,
  User,
  Download,
  Heart,
  Share2,
  ExternalLink,
  GraduationCap,
  Calendar,
  Layers,
  FileDown,
  CheckCircle2,
  Tag,
  Sparkles,
  Eye,
  Info
} from 'lucide-react';
import { LearningResource } from '../types';
import { getDownloadableInfo } from './LibraryHomepage';
import {
  toggleFavoriteResource,
  isResourceFavorite
} from '../services/favoritesService';
import { formatTime } from '../utils/completionRules';

export interface ResourceQuickPreviewModalProps {
  resource: LearningResource | any | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectResource?: (resource: LearningResource | any) => void;
  onDownloadResource?: (resource: LearningResource | any, e?: React.MouseEvent) => void;
  onShareResource?: (resource: LearningResource | any) => void;
}

export const ResourceQuickPreviewModal: React.FC<ResourceQuickPreviewModalProps> = ({
  resource,
  isOpen,
  onClose,
  onSelectResource,
  onDownloadResource,
  onShareResource,
}) => {
  const [isFav, setIsFav] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (resource?.id) {
      setIsFav(isResourceFavorite(resource.id));
    }
  }, [resource?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !resource) return null;

  const downloadableInfo = getDownloadableInfo(resource);

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!resource?.id) return;
    const nextState = toggleFavoriteResource(resource.id);
    setIsFav(nextState);
  };

  const handleCopyShareLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/library?resourceId=${encodeURIComponent(resource.id)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {});
  };

  const getTypeIcon = () => {
    const type = (resource.type || '').toLowerCase();
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'audio':
        return <Headphones className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'pdf':
      case 'document':
        return <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'link':
      case 'website':
        return <Globe className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      case 'scripture':
        return <BookMarked className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  const getTypeBadgeClass = () => {
    const type = (resource.type || '').toLowerCase();
    switch (type) {
      case 'video':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'audio':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'pdf':
      case 'document':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'image':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'link':
      case 'website':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'scripture':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getFormatLabel = () => {
    if (resource.format) return resource.format.toUpperCase();
    if (resource.type) return resource.type.toUpperCase();
    return 'RESOURCE';
  };

  // Synopsis / Summary fallback logic
  const synopsis = resource.description || resource.summary || (resource.fullContent ? resource.fullContent.substring(0, 300) + '...' : null) || 'No detailed description available for this theological resource.';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-preview-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className={`p-3 rounded-xl border shrink-0 ${getTypeBadgeClass()}`}>
              {getTypeIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`inline-flex items-center text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getTypeBadgeClass()}`}>
                  {getFormatLabel()}
                </span>
                {resource.category && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {resource.category}
                  </span>
                )}
                {resource.isRequiredReading && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    ★ Required Reading
                  </span>
                )}
              </div>
              <h2 id="quick-preview-title" className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {resource.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleToggleFav}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isFav
                  ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-400'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
              title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Close Quick Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-5">
          {/* Brief Synopsis Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Synopsis & Executive Summary
            </h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {synopsis}
            </div>
          </div>

          {/* Key Metadata Grid */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              Academic Metadata & Specifications
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Instructor / Author */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1">
                  Author / Faculty
                </span>
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">{resource.author || resource.uploadedBy || 'HTEIM Faculty'}</span>
                </div>
              </div>

              {/* Course & Module Alignment */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1">
                  Curriculum Placement
                </span>
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">
                    {resource.courseId ? `${resource.courseId}` : 'Core Ministry Curriculum'}
                    {resource.moduleId ? ` · ${resource.moduleId}` : ''}
                  </span>
                </div>
              </div>

              {/* Length / Duration / Extent */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1">
                  Extent & Duration
                </span>
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>
                    {resource.durationSeconds
                      ? `${formatTime(resource.durationSeconds)} duration`
                      : resource.pageCount
                      ? `${resource.pageCount} pages`
                      : resource.size
                      ? `${resource.size}`
                      : 'Self-paced learning module'}
                  </span>
                </div>
              </div>

              {/* Access Level / File Format */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1">
                  File Format & Access
                </span>
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>
                    {getFormatLabel()} · <span className="capitalize">{resource.visibility || resource.accessLevel || 'Public Access'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scripture References if present */}
          {resource.scriptureReferences && resource.scriptureReferences.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Biblical & Scripture References
              </span>
              <div className="flex flex-wrap gap-1.5">
                {resource.scriptureReferences.map((ref: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  >
                    <BookMarked className="w-3 h-3 text-indigo-500" />
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Theological Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Theological Topics & Tags
              </span>
              <div className="flex flex-wrap gap-1.5">
                {resource.tags.map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {downloadableInfo.isDownloadable && onDownloadResource && (
              <button
                onClick={(e) => {
                  onDownloadResource(resource, e);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title={downloadableInfo.label}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadableInfo.label || 'Download'}</span>
              </button>
            )}

            <button
              onClick={handleCopyShareLink}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
            {onSelectResource && (
              <button
                onClick={() => {
                  onClose();
                  onSelectResource(resource);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open Full Resource</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
