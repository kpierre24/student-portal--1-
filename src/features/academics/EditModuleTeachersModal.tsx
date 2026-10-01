import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Users, 
  Save, 
  CheckCircle2, 
  Plus, 
  ShieldCheck, 
  Award,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { 
  MasterCourse, 
  AUTHORIZED_TEACHERS, 
  AuthorizedFacultyTeacher,
  getFacultyTeacherByName 
} from '../../types/academicEngine';

interface EditModuleTeachersModalProps {
  course: MasterCourse;
  onClose: () => void;
  onSave: (updatedCourse: MasterCourse) => void;
}

export const EditModuleTeachersModal: React.FC<EditModuleTeachersModalProps> = ({
  course,
  onClose,
  onSave
}) => {
  // Current selected teacher names
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>(() => {
    return course.teachers && course.teachers.length > 0 
      ? [...course.teachers] 
      : (course.instructors || []);
  });

  const [customTeacherName, setCustomTeacherName] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Toggle selection
  const handleToggleTeacher = (teacherName: string) => {
    setSelectedTeachers(prev => {
      const exists = prev.some(t => t.toLowerCase().trim() === teacherName.toLowerCase().trim());
      if (exists) {
        return prev.filter(t => t.toLowerCase().trim() !== teacherName.toLowerCase().trim());
      } else {
        return [...prev, teacherName];
      }
    });
  };

  const handleSelectAll = () => {
    const allNames = AUTHORIZED_TEACHERS.map(t => t.name);
    setSelectedTeachers(allNames);
  };

  const handleClearAll = () => {
    setSelectedTeachers([]);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTeacherName.trim()) return;
    const trimmed = customTeacherName.trim();
    if (!selectedTeachers.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedTeachers(prev => [...prev, trimmed]);
    }
    setCustomTeacherName('');
    setShowAddCustom(false);
  };

  const handleSave = () => {
    const updatedCourse: MasterCourse = {
      ...course,
      teachers: selectedTeachers,
      instructors: selectedTeachers,
      updatedAt: new Date().toISOString()
    };

    onSave(updatedCourse);
    setSaveSuccess(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80">
                  {course.code}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/80">
                  Module {course.coreModuleNumber}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {course.department}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Edit Faculty Teachers: {course.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Choose one or more authorized faculty teachers appointed to deliver this curriculum module.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          
          {/* Quick Action Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Appointed Teachers ({selectedTeachers.length})
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 rounded-lg font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-slate-700">&bull;</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 rounded-lg font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Authorized Teachers List */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Authorized HTEIM Faculty
            </span>

            {AUTHORIZED_TEACHERS.map((teacher) => {
              const isSelected = selectedTeachers.some(
                t => t.toLowerCase().trim() === teacher.name.toLowerCase().trim()
              );

              return (
                <div
                  key={teacher.id}
                  onClick={() => handleToggleTeacher(teacher.name)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={teacher.avatarUrl}
                      alt={teacher.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {teacher.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300">
                          {teacher.role}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate">
                        {teacher.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {teacher.specialization}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional / Custom Teachers if any */}
          {selectedTeachers.some(
            t => !AUTHORIZED_TEACHERS.some(at => at.name.toLowerCase().trim() === t.toLowerCase().trim())
          ) && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Additional Appointed Instructors
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedTeachers
                  .filter(t => !AUTHORIZED_TEACHERS.some(at => at.name.toLowerCase().trim() === t.toLowerCase().trim()))
                  .map(t => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleToggleTeacher(t)}
                        className="hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Option to add custom faculty */}
          {showAddCustom ? (
            <form onSubmit={handleAddCustom} className="p-3.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Add Adjunct / Guest Lecturer Name:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Pastor Guest Speaker"
                  value={customTeacherName}
                  onChange={(e) => setCustomTeacherName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustom(false)}
                  className="px-2 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddCustom(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Guest or Adjunct Lecturer</span>
            </button>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {selectedTeachers.length === 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                No teachers selected. At least one teacher is recommended.
              </span>
            ) : (
              <span>
                <strong>{selectedTeachers.length}</strong> teacher{selectedTeachers.length > 1 ? 's' : ''} assigned
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Teacher Assignments</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
