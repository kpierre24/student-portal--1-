import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  Layers,
  FileText,
  Video,
  Headphones,
  Globe,
  Image as ImageIcon,
  Presentation,
  BookOpen,
  Edit,
  Copy,
  FolderInput,
  Archive,
  Share2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  ChevronDown,
  X,
  Check,
  Tag,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Download
} from 'lucide-react';
import { 
  LearningResource, 
  ResourceType, 
  ResourceStatus, 
  ResourceAccessLevel 
} from '../types';
import { CURRICULUM_MODULES } from './LibraryTab';
import { HTEIM_CURRICULUM_COURSES } from '../data/curriculumStructure';

interface TeacherResourceManagerProps {
  resources: LearningResource[];
  onAddResource: () => void;
  onSelectResource: (resource: LearningResource) => void;
  onUpdateResource: (updated: LearningResource) => void;
  onDeleteResource: (resourceId: string) => void;
  onDuplicateResource: (resource: LearningResource) => void;
  userRole?: string;
  userName?: string;
}

export const TeacherResourceManager: React.FC<TeacherResourceManagerProps> = ({
  resources,
  onAddResource,
  onSelectResource,
  onUpdateResource,
  onDeleteResource,
  onDuplicateResource,
  userRole = 'teacher',
  userName = 'Instructor'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | ResourceStatus>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  // Modal States
  const [editingResource, setEditingResource] = useState<LearningResource | null>(null);
  const [movingResource, setMovingResource] = useState<LearningResource | null>(null);
  const [sharingResource, setSharingResource] = useState<LearningResource | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Move Form State
  const [targetCourseId, setTargetCourseId] = useState<string>('');
  const [targetModuleId, setTargetModuleId] = useState<string>('');
  const [targetLessonId, setTargetLessonId] = useState<string>('');

  // Share Form State
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = resources.length;
    const published = resources.filter(r => r.status === 'published' || (r.status === undefined && r.isPublished !== false)).length;
    const draft = resources.filter(r => r.status === 'draft').length;
    const archived = resources.filter(r => r.status === 'archived').length;
    return { total, published, draft, archived };
  }, [resources]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = r.title?.toLowerCase().includes(q);
        const descMatch = r.description?.toLowerCase().includes(q);
        const authorMatch = (r.author || r.uploadedBy || '').toLowerCase().includes(q);
        const tagMatch = r.tags?.some(t => t.toLowerCase().includes(q));
        const catMatch = (r.category || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !authorMatch && !tagMatch && !catMatch) {
          return false;
        }
      }

      // Course filter
      if (selectedCourseFilter !== 'all') {
        const cId = r.courseId || '';
        if (cId !== selectedCourseFilter && !cId.toLowerCase().includes(selectedCourseFilter.toLowerCase())) {
          return false;
        }
      }

      // Module filter
      if (selectedModuleFilter !== 'all') {
        const mId = r.moduleId || '';
        if (mId !== selectedModuleFilter) {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== 'all') {
        const effectiveStatus = r.status || (r.isPublished ? 'published' : 'draft');
        if (effectiveStatus !== selectedStatusFilter) {
          return false;
        }
      }

      // Type filter
      if (selectedTypeFilter !== 'all') {
        if (r.type !== selectedTypeFilter) {
          return false;
        }
      }

      return true;
    });
  }, [resources, searchQuery, selectedCourseFilter, selectedModuleFilter, selectedStatusFilter, selectedTypeFilter]);

  // Type Badges Helper
  const getTypeBadge = (type: ResourceType) => {
    switch (type) {
      case 'video':
        return { label: 'Video', icon: Video, bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
      case 'audio':
        return { label: 'Audio', icon: Headphones, bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'pdf':
      case 'document':
        return { label: 'Document', icon: FileText, bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
      case 'presentation':
        return { label: 'Presentation', icon: Presentation, bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      case 'image':
        return { label: 'Image', icon: ImageIcon, bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'link':
      default:
        return { label: 'Link', icon: Globe, bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30' };
    }
  };

  // Status Badge Helper
  const getStatusBadge = (res: LearningResource) => {
    const st = res.status || (res.isPublished ? 'published' : 'draft');
    if (st === 'published') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" />
          Published
        </span>
      );
    }
    if (st === 'draft') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Clock className="w-3 h-3" />
          Draft
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400 border border-slate-500/30">
        <Archive className="w-3 h-3" />
        Archived
      </span>
    );
  };

  // Action Handlers
  const handleToggleArchive = (res: LearningResource) => {
    const currentStatus = res.status || (res.isPublished ? 'published' : 'draft');
    const newStatus: ResourceStatus = currentStatus === 'archived' ? 'published' : 'archived';
    const updated: LearningResource = {
      ...res,
      status: newStatus,
      isPublished: newStatus === 'published',
      updatedAt: new Date().toISOString()
    };
    onUpdateResource(updated);
    showToast(`Resource marked as ${newStatus}`);
  };

  const handleDuplicate = (res: LearningResource) => {
    onDuplicateResource(res);
    showToast(`Duplicated "${res.title}"`);
  };

  const handleOpenMove = (res: LearningResource) => {
    setMovingResource(res);
    setTargetCourseId(res.courseId || 'SOM-CORE');
    setTargetModuleId(res.moduleId || 'SOM-MOD-1');
    setTargetLessonId(res.lessonId || '');
  };

  const handleConfirmMove = () => {
    if (!movingResource) return;
    const updated: LearningResource = {
      ...movingResource,
      courseId: targetCourseId,
      moduleId: targetModuleId,
      lessonId: targetLessonId || undefined,
      updatedAt: new Date().toISOString()
    };
    onUpdateResource(updated);
    setMovingResource(null);
    showToast(`Moved to ${targetModuleId || targetCourseId}`);
  };

  const handleOpenShare = (res: LearningResource) => {
    setSharingResource(res);
    setCopyFeedback(false);
  };

  const handleCopyShareLink = () => {
    if (!sharingResource) return;
    const shareUrl = `${window.location.origin}/library?resourceId=${sharingResource.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 3000);
      showToast('Share link copied to clipboard');
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-amber-500/50 shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Faculty Portal
              </span>
              <span className="text-xs text-slate-400 font-medium">
                HTEIM School of Ministry
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-amber-400" />
              Teacher Library & Resource Manager
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Curate, author, publish, organize, and reassign theological study materials across curriculum modules and courses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onAddResource}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Add Resource</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Resources</div>
              <div className="text-lg font-black text-white font-mono">{stats.total}</div>
            </div>
            <Layers className="w-5 h-5 text-slate-500" />
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Published</div>
              <div className="text-lg font-black text-emerald-400 font-mono">{stats.published}</div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Drafts</div>
              <div className="text-lg font-black text-amber-400 font-mono">{stats.draft}</div>
            </div>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Archived</div>
              <div className="text-lg font-black text-slate-400 font-mono">{stats.archived}</div>
            </div>
            <Archive className="w-5 h-5 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search resources by title, description, instructor, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Course Filter Dropdown */}
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Courses</option>
            <option value="SOM-CORE">SOM Core Curriculum</option>
            <option value="Systematic Theology">Systematic Theology</option>
            <option value="Biblical Studies">Biblical Studies</option>
            <option value="Christian Leadership">Christian Leadership</option>
          </select>

          {/* Module Filter Dropdown */}
          <select
            value={selectedModuleFilter}
            onChange={(e) => setSelectedModuleFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Modules</option>
            {CURRICULUM_MODULES.map(m => (
              <option key={m.code} value={m.code}>{m.title}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Types</option>
            <option value="document">Documents & Notes</option>
            <option value="pdf">PDF Textbooks</option>
            <option value="video">Videos</option>
            <option value="audio">Audio Recordings</option>
            <option value="link">Web Links</option>
            <option value="presentation">Presentations</option>
            <option value="image">Images</option>
          </select>
        </div>

        {/* Active Filter Indicators */}
        <div className="flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400 pt-1">
          <span>Showing <strong>{filteredResources.length}</strong> of <strong>{resources.length}</strong> resources</span>
          {(searchQuery || selectedCourseFilter !== 'all' || selectedModuleFilter !== 'all' || selectedStatusFilter !== 'all' || selectedTypeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCourseFilter('all');
                setSelectedModuleFilter('all');
                setSelectedStatusFilter('all');
                setSelectedTypeFilter('all');
              }}
              className="text-amber-500 hover:text-amber-400 font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Resources Management Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {filteredResources.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No resources found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No materials match your current search or filter criteria. Try adjusting filters or click "Add Resource" to create one.
            </p>
            <button
              type="button"
              onClick={onAddResource}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Resource
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Resource</th>
                  <th className="py-3.5 px-4">Course & Module</th>
                  <th className="py-3.5 px-4">Category / Tags</th>
                  <th className="py-3.5 px-4">Instructor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredResources.map((res) => {
                  const typeBadge = getTypeBadge(res.type);
                  const TypeIcon = typeBadge.icon;
                  const courseTitle = res.courseId || 'SOM Core';
                  const moduleTitle = res.moduleId ? CURRICULUM_MODULES.find(m => m.code === res.moduleId)?.title || res.moduleId : 'General';
                  const isArchived = res.status === 'archived';

                  return (
                    <tr 
                      key={res.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isArchived ? 'opacity-60 bg-slate-500/5' : ''
                      }`}
                    >
                      {/* Resource Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3 max-w-sm">
                          <div className={`p-2 rounded-xl border shrink-0 ${typeBadge.bg}`}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => onSelectResource(res)}
                              className="font-bold text-slate-900 dark:text-white hover:text-amber-500 dark:hover:text-amber-400 text-left line-clamp-1 transition-colors"
                            >
                              {res.title}
                            </button>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {res.description || 'No description provided'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                              <span className="font-mono">{res.size || (res.durationSeconds ? `${Math.round(res.durationSeconds / 60)} min` : res.type.toUpperCase())}</span>
                              {res.pageCount && <span>• {res.pageCount} pages</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Course & Module */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                            {courseTitle}
                          </div>
                          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                            {moduleTitle}
                          </div>
                          {res.lessonId && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Lesson: {res.lessonId}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Category & Tags */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold">
                            {res.category || 'Curriculum'}
                          </span>
                          {res.tags && res.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 max-w-[160px]">
                              {res.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[10px] text-amber-500 dark:text-amber-400 font-mono">
                                  {tag.startsWith('#') ? tag : `#${tag}`}
                                </span>
                              ))}
                              {res.tags.length > 2 && (
                                <span className="text-[10px] text-slate-400">+{res.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Instructor / Author */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        <span className="truncate block max-w-[120px]">
                          {res.author || res.uploadedBy || 'Faculty'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(res)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View */}
                          <button
                            type="button"
                            onClick={() => onSelectResource(res)}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="View Resource"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => setEditingResource(res)}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Resource"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(res)}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Duplicate Resource"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Move */}
                          <button
                            type="button"
                            onClick={() => handleOpenMove(res)}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Move to another course or module"
                          >
                            <FolderInput className="w-4 h-4" />
                          </button>

                          {/* Archive */}
                          <button
                            type="button"
                            onClick={() => handleToggleArchive(res)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isArchived 
                                ? 'text-amber-500 hover:bg-amber-500/10' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={isArchived ? 'Unarchive (Publish)' : 'Archive Resource'}
                          >
                            <Archive className="w-4 h-4" />
                          </button>

                          {/* Share */}
                          <button
                            type="button"
                            onClick={() => handleOpenShare(res)}
                            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Share Resource"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(res.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete Resource"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Edit Resource Modal */}
      {editingResource && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-500" />
                Edit Resource Details
              </h3>
              <button
                type="button"
                onClick={() => setEditingResource(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Resource Title</label>
                <input
                  type="text"
                  value={editingResource.title}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Description / Summary</label>
                <textarea
                  rows={3}
                  value={editingResource.description || ''}
                  onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Status</label>
                  <select
                    value={editingResource.status || (editingResource.isPublished ? 'published' : 'draft')}
                    onChange={(e) => {
                      const newStatus = e.target.value as ResourceStatus;
                      setEditingResource({
                        ...editingResource,
                        status: newStatus,
                        isPublished: newStatus === 'published'
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Category</label>
                  <input
                    type="text"
                    value={editingResource.category || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={editingResource.tags?.join(', ') || ''}
                  onChange={(e) => {
                    const parsed = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    setEditingResource({ ...editingResource, tags: parsed });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  placeholder="#Faith, #Prayer, #Theology"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editDownloadable"
                  checked={editingResource.isDownloadable !== false}
                  onChange={(e) => setEditingResource({ ...editingResource, isDownloadable: e.target.checked })}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="editDownloadable" className="text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                  Allow students to download offline copy
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingResource(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateResource(editingResource);
                  setEditingResource(null);
                  showToast('Resource updated successfully');
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Move Resource Modal */}
      {movingResource && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-blue-500" />
                Move Resource Placement
              </h3>
              <button
                type="button"
                onClick={() => setMovingResource(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Reassign "<strong>{movingResource.title}</strong>" to a new curriculum course, module, or specific lesson.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Target Course</label>
                <select
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                >
                  <option value="SOM-CORE">SOM Core Curriculum</option>
                  <option value="Systematic Theology">Systematic Theology</option>
                  <option value="Biblical Studies">Biblical Studies</option>
                  <option value="Christian Leadership">Christian Leadership</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Target Module</label>
                <select
                  value={targetModuleId}
                  onChange={(e) => setTargetModuleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                >
                  {CURRICULUM_MODULES.map(m => (
                    <option key={m.code} value={m.code}>{m.fullName || m.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Lesson Identifier (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. SOM-MOD-1-L1"
                  value={targetLessonId}
                  onChange={(e) => setTargetLessonId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMovingResource(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Move Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Share Resource Modal */}
      {sharingResource && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-500" />
                Share Learning Resource
              </h3>
              <button
                type="button"
                onClick={() => setSharingResource(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white">{sharingResource.title}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {sharingResource.category} • {sharingResource.type.toUpperCase()}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Direct Student Access Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/library?resourceId=${sharingResource.id}`}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1 shrink-0 transition-colors"
                  >
                    {copyFeedback ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copyFeedback ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSharingResource(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 bg-rose-500/10 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Resource?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently remove this resource from the theological curriculum library?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteResource(deleteConfirmId);
                  setDeleteConfirmId(null);
                  showToast('Resource deleted');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
