import React, { useState } from 'react';
import {
  Folder,
  Plus,
  Compass,
  BookOpen,
  Flame,
  Shield,
  Globe,
  GraduationCap,
  Sparkles,
  Edit2,
  Trash2,
  Check,
  ChevronRight,
  Search,
  X,
  FileText,
  Lock,
  Layers
} from 'lucide-react';
import { LearningResource, ResourceCollection } from '../types';

interface ResourceCollectionsViewProps {
  collections: ResourceCollection[];
  resources: LearningResource[];
  isTeacherOrAdmin: boolean;
  onSelectCollection: (collection: ResourceCollection) => void;
  onCreateCollection: (collection: Partial<ResourceCollection>) => void;
  onUpdateCollection: (id: string, updates: Partial<ResourceCollection>) => void;
  onDeleteCollection: (id: string) => void;
  onOpenResource: (resource: LearningResource) => void;
}

export const ResourceCollectionsView: React.FC<ResourceCollectionsViewProps> = ({
  collections,
  resources,
  isTeacherOrAdmin,
  onSelectCollection,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  onOpenResource,
}) => {
  const [selectedCol, setSelectedCol] = useState<ResourceCollection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColId, setEditingColId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formResourceIds, setFormResourceIds] = useState<string[]>([]);
  const [resourceSearch, setResourceSearch] = useState('');

  const getCollectionIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Compass':
        return <Compass className="h-6 w-6 text-blue-500" />;
      case 'BookOpen':
        return <BookOpen className="h-6 w-6 text-emerald-500" />;
      case 'Flame':
        return <Flame className="h-6 w-6 text-amber-500" />;
      case 'Shield':
        return <Shield className="h-6 w-6 text-indigo-500" />;
      case 'Globe':
        return <Globe className="h-6 w-6 text-cyan-500" />;
      case 'GraduationCap':
        return <GraduationCap className="h-6 w-6 text-purple-500" />;
      default:
        return <Folder className="h-6 w-6 text-blue-500" />;
    }
  };

  const handleOpenCreateModal = () => {
    setEditingColId(null);
    setFormTitle('');
    setFormDesc('');
    setFormCategory('General');
    setFormResourceIds([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (col: ResourceCollection, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingColId(col.id);
    setFormTitle(col.title);
    setFormDesc(col.description || '');
    setFormCategory(col.category || 'General');
    setFormResourceIds(col.resourceIds || []);
    setIsModalOpen(true);
  };

  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingColId) {
      onUpdateCollection(editingColId, {
        title: formTitle.trim(),
        description: formDesc.trim(),
        category: formCategory,
        resourceIds: formResourceIds,
        updatedAt: new Date().toISOString(),
      });
    } else {
      onCreateCollection({
        title: formTitle.trim(),
        description: formDesc.trim(),
        category: formCategory,
        resourceIds: formResourceIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublic: true,
        iconName: 'Folder',
      });
    }

    setIsModalOpen(false);
  };

  const toggleResourceInForm = (resId: string) => {
    setFormResourceIds(prev =>
      prev.includes(resId) ? prev.filter(id => id !== resId) : [...prev, resId]
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
            <Layers className="h-3.5 w-3.5" />
            Curated Academic Bundles
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Resource Collections
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Browse structured theological packages organized by orientation, foundational doctrines, prayer manuals, and ministry leadership tracks.
          </p>
        </div>

        {isTeacherOrAdmin && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition-all active:scale-95 shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Collection
          </button>
        )}
      </div>

      {/* Selected Collection Active Drawer/View */}
      {selectedCol && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 shadow-lg space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700">
                {getCollectionIcon(selectedCol.iconName)}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {selectedCol.category || 'Collection'}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedCol.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedCol.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCol(null)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Close View
            </button>
          </div>

          {/* Resources List inside Collection */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
              Included Resources ({selectedCol.resourceIds.length})
            </h4>

            {selectedCol.resourceIds.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                No resources added to this collection yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {resources
                  .filter(r => selectedCol.resourceIds.includes(r.id))
                  .map(res => (
                    <div
                      key={res.id}
                      onClick={() => onOpenResource(res)}
                      className="group flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-800 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {res.title}
                          </h5>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                            {res.category} • {res.type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid of Collections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {collections.map(col => {
          const count = col.resourceIds?.length || 0;
          return (
            <div
              key={col.id}
              onClick={() => {
                setSelectedCol(col);
                onSelectCollection(col);
              }}
              className="group relative flex flex-col justify-between p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-xs hover:shadow-md cursor-pointer transition-all duration-200"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 group-hover:scale-105 transition-transform">
                    {getCollectionIcon(col.iconName)}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {count} {count === 1 ? 'Resource' : 'Resources'}
                    </span>

                    {isTeacherOrAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={e => handleOpenEditModal(col, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Collection"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            if (confirm(`Delete collection "${col.title}"?`)) {
                              onDeleteCollection(col.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 transition-colors"
                          title="Delete Collection"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {col.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {col.description || 'Curated academic package for School of Ministry students.'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>By {col.createdBy || 'Faculty'}</span>
                <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                  View Bundle <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT COLLECTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-800/30">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingColId ? 'Edit Resource Collection' : 'Create Resource Collection'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCollection} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Collection Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. New Student Orientation"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Brief summary of included materials..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Orientation">Orientation</option>
                  <option value="Theology">Theology & Doctrine</option>
                  <option value="Spiritual Formation">Spiritual Formation</option>
                  <option value="Leadership">Leadership</option>
                  <option value="Missions & Outreach">Missions & Outreach</option>
                  <option value="Academic Curriculum">Academic Curriculum</option>
                  <option value="General">General</option>
                </select>
              </div>

              {/* Resource Selection checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Included Resources ({formResourceIds.length} selected)
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={resourceSearch}
                    onChange={e => setResourceSearch(e.target.value)}
                    placeholder="Search resources..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                  {resources
                    .filter(r => !resourceSearch || r.title.toLowerCase().includes(resourceSearch.toLowerCase()))
                    .map(r => {
                      const isChecked = formResourceIds.includes(r.id);
                      return (
                        <div
                          key={r.id}
                          onClick={() => toggleResourceInForm(r.id)}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate pr-2 font-medium">{r.title}</span>
                          <div className={`h-4 w-4 rounded flex items-center justify-center border ${isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                            {isChecked && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  Save Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
