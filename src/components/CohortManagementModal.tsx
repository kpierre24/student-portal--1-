import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Plus,
  Calendar,
  Layers,
  CheckCircle2,
  Archive,
  RotateCcw,
  Trash2,
  Edit3,
  ExternalLink,
  Users,
  Copy,
  Info,
  X,
  Sparkles,
  Search,
  Check,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { Cohort, DEFAULT_COHORTS, StudentSummary, Course } from '../types';

interface CohortManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohorts: Cohort[];
  activeCohortId: string;
  onSelectActiveCohort: (cohortId: string) => void;
  onSaveCohort: (cohort: Cohort) => void;
  onDeleteCohort: (cohortId: string) => void;
  onArchiveToggle: (cohortId: string) => void;
  onCloneCurriculum?: (sourceCohortId: string, targetCohortId: string) => void;
  students?: StudentSummary[];
  courses?: Course[];
  userRole?: string;
  onAssignStudentCohort?: (studentName: string, cohortId: string) => void;
}

export const CohortManagementModal: React.FC<CohortManagementModalProps> = ({
  isOpen,
  onClose,
  cohorts = DEFAULT_COHORTS,
  activeCohortId,
  onSelectActiveCohort,
  onSaveCohort,
  onDeleteCohort,
  onArchiveToggle,
  onCloneCurriculum,
  students = [],
  courses = [],
  userRole = 'user',
  onAssignStudentCohort
}) => {
  const isAdmin = userRole === 'admin';
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'assign'>('list');
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // Enforce list-only view for non-admin users
  React.useEffect(() => {
    if (!isAdmin && activeTab !== 'list') {
      setActiveTab('list');
    }
  }, [isAdmin, activeTab]);

  // Form State for Create / Edit
  const [formData, setFormData] = useState<Partial<Cohort>>({
    name: '',
    academicYear: new Date().getFullYear() + 1,
    term: 'Spring 2027 • Term 1',
    startDate: `${new Date().getFullYear() + 1}-01-10`,
    endDate: `${new Date().getFullYear() + 1}-12-15`,
    isArchived: false,
    isCurrent: false,
    description: '',
    sheetUrl: '',
    sheetTabPattern: '',
    themeColor: 'indigo'
  });

  const [cloneCurriculumFrom, setCloneCurriculumFrom] = useState<string>('cohort_2026');
  const [shouldClone, setShouldClone] = useState<boolean>(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleStartCreate = () => {
    if (!isAdmin) {
      showNotification('Administrator privileges required to create cohorts.');
      return;
    }
    const nextYear = Math.max(...cohorts.map(c => c.academicYear || 2026), 2026) + 1;
    setFormData({
      id: `cohort_${nextYear}`,
      name: `Class of ${nextYear}`,
      academicYear: nextYear,
      term: `Fall ${nextYear - 1} / Spring ${nextYear}`,
      startDate: `${nextYear}-01-09`,
      endDate: `${nextYear}-12-14`,
      isArchived: false,
      isCurrent: false,
      description: `Academic Cohort for the ${nextYear} ministerial graduation cycle.`,
      sheetUrl: '',
      sheetTabPattern: `${nextYear}`,
      themeColor: 'emerald'
    });
    setEditingCohort(null);
    setShouldClone(true);
    setActiveTab('create');
  };

  const handleStartEdit = (c: Cohort) => {
    if (!isAdmin) {
      showNotification('Administrator privileges required to edit cohorts.');
      return;
    }
    setFormData({ ...c });
    setEditingCohort(c);
    setShouldClone(false);
    setActiveTab('create');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Unauthorized: Only administrators can create or modify cohorts.');
      return;
    }
    if (!formData.name?.trim() || !formData.academicYear) {
      alert('Please provide a cohort name and valid academic year.');
      return;
    }

    const cohortId = editingCohort?.id || formData.id || `cohort_${formData.academicYear}_${Date.now().toString(36)}`;
    const newCohort: Cohort = {
      id: cohortId,
      name: formData.name.trim(),
      academicYear: Number(formData.academicYear),
      term: formData.term || `Class of ${formData.academicYear}`,
      startDate: formData.startDate || `${formData.academicYear}-01-01`,
      endDate: formData.endDate || `${formData.academicYear}-12-31`,
      isArchived: formData.isArchived ?? false,
      isCurrent: formData.isCurrent ?? false,
      description: formData.description?.trim() || '',
      sheetUrl: formData.sheetUrl?.trim() || undefined,
      sheetTabPattern: formData.sheetTabPattern?.trim() || undefined,
      themeColor: formData.themeColor || 'indigo'
    };

    onSaveCohort(newCohort);

    if (shouldClone && cloneCurriculumFrom && onCloneCurriculum && !editingCohort) {
      onCloneCurriculum(cloneCurriculumFrom, newCohort.id);
    }

    showNotification(editingCohort ? `Cohort "${newCohort.name}" updated successfully!` : `New Cohort "${newCohort.name}" created!`);
    setActiveTab('list');
    setEditingCohort(null);
  };

  // Compute student counts per cohort
  const cohortStudentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cohorts.forEach(c => { counts[c.id] = 0; });
    
    students.forEach(s => {
      const cId = s.cohortId || 'cohort_2026';
      counts[cId] = (counts[cId] || 0) + 1;
    });
    return counts;
  }, [cohorts, students]);

  const filteredCohorts = useMemo(() => {
    // New cohorts (e.g. upcoming/non-current cohorts like Class of 2027) are strictly restricted to administrators
    const accessibleCohorts = isAdmin ? cohorts : cohorts.filter(c => c.isCurrent);
    if (!searchQuery.trim()) return accessibleCohorts;
    const q = searchQuery.toLowerCase().trim();
    return accessibleCohorts.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.academicYear.toString().includes(q) || 
      (c.term && c.term.toLowerCase().includes(q))
    );
  }, [cohorts, searchQuery, isAdmin]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase().trim();
    return students.filter(s => s.name.toLowerCase().includes(q) || (s.email && s.email.toLowerCase().includes(q)));
  }, [students, studentSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Toast Notification */}
        <AnimatePresence>
          {successToast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{successToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 text-white flex items-center justify-between border-b border-indigo-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <GraduationCap className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {isAdmin ? 'Cohort & Academic Year Management' : 'Academic Cohorts'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 border border-indigo-400/40 text-indigo-200">
                  {isAdmin ? 'Multi-Cohort Foundation' : 'Curriculum View'}
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                {isAdmin
                  ? 'Organize students, curriculum rosters, and grading cycles across graduating classes (2026, 2027, etc.).'
                  : 'View academic cohorts and switch the portal curriculum view.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setActiveTab('list'); setEditingCohort(null); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'list'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cohorts ({filteredCohorts.length})</span>
            </button>

            {isAdmin && (
              <button
                onClick={handleStartCreate}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'create' && !editingCohort
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Cohort</span>
              </button>
            )}

            {isAdmin && students.length > 0 && (
              <button
                onClick={() => setActiveTab('assign')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'assign'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Roster Assignment</span>
              </button>
            )}
          </div>

          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>Active Context:</span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold">
              {cohorts.find(c => c.id === activeCohortId)?.name || 'Class of 2026'}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* TAB 1: COHORT LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Search & Actions toolbar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search cohorts by name, year, or term..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Cohort (e.g. 2027)</span>
                  </button>
                )}
              </div>

              {/* Cohorts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCohorts.map((c) => {
                  const isActive = c.id === activeCohortId;
                  const isCurrentFlag = c.isCurrent;
                  const count = cohortStudentCounts[c.id] || 0;

                  return (
                    <div
                      key={c.id}
                      className={`relative p-5 rounded-xl border transition-all ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
                          : c.isArchived
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 opacity-75'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                              {c.name}
                            </h3>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-2xs flex items-center gap-1">
                                <Check className="w-3 h-3" /> Active
                              </span>
                            )}
                            {isCurrentFlag && !isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                Primary Year
                              </span>
                            )}
                            {!c.isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                                Admin Only
                              </span>
                            )}
                            {c.isArchived && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                <Archive className="w-3 h-3" /> Archived
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                            {c.term || `Academic Year ${c.academicYear}`}
                          </p>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(c)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Cohort Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {cohorts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirmDeleteId === c.id) {
                                    onDeleteCohort(c.id);
                                    setConfirmDeleteId(null);
                                    showNotification(`Cohort "${c.name}" deleted.`);
                                  } else {
                                    setConfirmDeleteId(c.id);
                                    setTimeout(() => setConfirmDeleteId(null), 4000);
                                  }
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  confirmDeleteId === c.id
                                    ? 'bg-rose-600 text-white'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                }`}
                                title={confirmDeleteId === c.id ? 'Click again to confirm deletion' : 'Delete Cohort'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {c.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">
                          {c.description}
                        </p>
                      )}

                      {/* Details row */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl mb-3">
                        <div className="flex items-center gap-1.5 truncate">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">{c.startDate} → {c.endDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{count} Student{count === 1 ? '' : 's'} Enrolled</span>
                        </div>
                      </div>

                      {/* Sync Sheet Tag Mapping */}
                      {(c.sheetTabPattern || c.sheetUrl) && (
                        <div className="flex items-center gap-2 mb-3 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-indigo-50/50 dark:bg-indigo-950/30 px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 truncate">
                          <BookOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span className="font-bold text-indigo-950 dark:text-indigo-200">Sheet Sync:</span>
                          {c.sheetTabPattern && (
                            <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] border border-indigo-200/80 dark:border-indigo-800">
                              Tab: "{c.sheetTabPattern}"
                            </span>
                          )}
                          {c.sheetUrl && (
                            <span className="truncate text-slate-500 dark:text-slate-400 font-mono" title={c.sheetUrl}>
                              (Custom URL configured)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bottom actions */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                          {!isActive ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isAdmin && !c.isCurrent) {
                                  showNotification('Permission Denied: The new cohort is restricted to administrators.');
                                  return;
                                }
                                onSelectActiveCohort(c.id);
                                showNotification(`Switched portal view to ${c.name}`);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span>Switch to this Cohort</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> Current Active View
                            </span>
                          )}
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => onArchiveToggle(c.id)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            {c.isArchived ? 'Restore' : 'Archive'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Informational callout */}
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3 text-xs text-indigo-900 dark:text-indigo-200">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Multi-Cohort Isolation & Safety:</p>
                  <p className="text-indigo-700/90 dark:text-indigo-300/80 leading-relaxed">
                    When you switch cohorts, student rosters, attendance records, gradebooks, and financial reports scope automatically to the selected academic year. You can roll forward 2026 courses into 2027 while keeping past graduation and attendance archives safely preserved.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREATE / EDIT COHORT */}
          {activeTab === 'create' && (
            isAdmin ? (
              <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                    {editingCohort ? `Edit "${editingCohort.name}"` : 'Create New Academic Cohort'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set up future school years (e.g., Class of 2027) with custom term dates and curriculum templates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setActiveTab('list'); setEditingCohort(null); }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cohort Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Class of 2027"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Year <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={2020}
                    max={2040}
                    value={formData.academicYear || 2027}
                    onChange={(e) => setFormData(prev => ({ ...prev, academicYear: parseInt(e.target.value) || 2027 }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Term / Semester Display
                  </label>
                  <input
                    type="text"
                    value={formData.term || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, term: e.target.value }))}
                    placeholder="e.g. Fall 2026 / Spring 2027 • Term 1"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Theme / Badge Color
                  </label>
                  <select
                    value={formData.themeColor || 'indigo'}
                    onChange={(e) => setFormData(prev => ({ ...prev, themeColor: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer font-bold"
                  >
                    <option value="indigo">Indigo (Standard Royal)</option>
                    <option value="emerald">Emerald (Growth & New Year)</option>
                    <option value="amber">Amber (Prophetic Gold)</option>
                    <option value="purple">Purple (Executive Leadership)</option>
                    <option value="blue">Blue (Apostolic Ocean)</option>
                    <option value="rose">Rose (Evangelism Fire)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Graduation / End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Cohort Goals
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Notes about this cohort's tracks, requirements, and leadership milestones..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Google Sheet Tab Pattern</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Auto-Categorizes Rows</span>
                  </label>
                  <input
                    type="text"
                    value={formData.sheetTabPattern || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, sheetTabPattern: e.target.value }))}
                    placeholder="e.g. 2026, Attendance_2026, Class of 2026"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Matching Google Sheet tabs (e.g. "Attendance 2026") will automatically assign incoming rows to this cohort.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dedicated Sheet URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.sheetUrl || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, sheetUrl: e.target.value }))}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    If this cohort uses a separate standalone spreadsheet file.
                  </p>
                </div>
              </div>

              {/* Rollover checkbox (only on create) */}
              {!editingCohort && (
                <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shouldClone}
                      onChange={(e) => setShouldClone(e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Roll over Curriculum & Course Outlines from an existing cohort
                    </span>
                  </label>

                  {shouldClone && (
                    <div className="pl-6 flex items-center gap-2 text-xs">
                      <span className="text-slate-500 font-medium">Source:</span>
                      <select
                        value={cloneCurriculumFrom}
                        onChange={(e) => setCloneCurriculumFrom(e.target.value)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      >
                        {cohorts.map(c => (
                          <option key={`src-${c.id}`} value={c.id}>{c.name} ({c.academicYear})</option>
                        ))}
                      </select>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                        (Copies the 6 core modules and grade criteria)
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setActiveTab('list'); setEditingCohort(null); }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingCohort ? 'Save Changes' : 'Create Cohort'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-8 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">Admin Access Required</h4>
              <p className="text-xs text-slate-500">Creating and configuring academic cohorts is restricted to institutional administrators.</p>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Return to Cohort Overview
              </button>
            </div>
          ))}

          {/* TAB 3: ROSTER ASSIGNMENT */}
          {activeTab === 'assign' && (
            isAdmin ? (
              <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                    Student Cohort Allocation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assign existing or incoming students to specific academic cohorts.
                  </p>
                </div>

                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search student..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider sticky top-0">
                      <tr>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Track / Module</th>
                        <th className="p-3">Assigned Cohort</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStudents.map((std, sIdx) => {
                        const currentCohortId = std.cohortId || 'cohort_2026';
                        return (
                          <tr key={`cohort-std-${std.name}-${sIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              {std.name}
                            </td>
                            <td className="p-3 text-slate-500">
                              {std.enrolledModule || 'General Ministry'}
                            </td>
                            <td className="p-3">
                              <select
                                value={currentCohortId}
                                onChange={(e) => {
                                  if (onAssignStudentCohort) {
                                    onAssignStudentCohort(std.name, e.target.value);
                                    showNotification(`Assigned ${std.name} to ${cohorts.find(c => c.id === e.target.value)?.name}`);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer"
                              >
                                {cohorts.map(c => (
                                  <option key={`opt-${c.id}`} value={c.id}>
                                    {c.name} ({c.academicYear})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3 text-right text-[11px] font-semibold text-slate-400">
                              {currentCohortId === activeCohortId ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">In Active View</span>
                              ) : (
                                <span>Other Cohort</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">Admin Access Required</h4>
              <p className="text-xs text-slate-500">Assigning student rosters across cohorts is restricted to institutional administrators.</p>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Return to Cohort Overview
              </button>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] font-medium text-slate-500">
            HTEIM School of Ministry • Academic Management System
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
