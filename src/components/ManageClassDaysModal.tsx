import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Sparkles, 
  Users, 
  Clock, 
  AlertCircle,
  RotateCcw
} from 'lucide-react';

export type ClassDayItem = {
  id: string;
  name: string;
};

interface ManageClassDaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  classDays: ClassDayItem[];
  onAddClassDay: (title: string) => void;
  onEditClassDayTitle: (id: string, newTitle: string) => void;
  onDeleteClassDay: (id: string, skipConfirm?: boolean) => void;
  onClearClassDayRecords?: (id: string, skipConfirm?: boolean) => void;
  uniqueStudentsCount?: number;
  classDayStats?: Record<string, { count: number; percentage: number }>;
}

export const ManageClassDaysModal: React.FC<ManageClassDaysModalProps> = ({
  isOpen,
  onClose,
  classDays,
  onAddClassDay,
  onEditClassDayTitle,
  onDeleteClassDay,
  onClearClassDayRecords,
  uniqueStudentsCount = 0,
  classDayStats = {}
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearId, setConfirmClearId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const titleToUse = newTitle.trim() || `Class Day ${classDays.length + 1}`;
    onAddClassDay(titleToUse);
    setNewTitle('');
  };

  const startEditing = (day: ClassDayItem) => {
    setEditingId(day.id);
    setEditTitleInput(day?.name || '');
  };

  const saveEditing = (id: string) => {
    if (editTitleInput.trim()) {
      onEditClassDayTitle(id, editTitleInput.trim());
    }
    setEditingId(null);
    setEditTitleInput('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitleInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in modal-material-scrim">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] modal-material-dialog">
        {/* Header */}
        <div className="px-5 py-5 bg-slate-50 dark:bg-slate-800 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 modal-material-header">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg">
              <Calendar className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Manage Class Days & Sessions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add, rename, or reorder ministry class session titles on the fly.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
           aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form to Add New Day */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={`New Title (e.g. "Class Day ${classDays.length + 1} - Hermeneutics")`}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Sparkles className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Class Day</span>
            </button>
          </form>
          <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Class days created here instantly update the Attendance Matrix, Live Check-in, and Student Portals.</span>
          </div>
        </div>

        {/* List of Class Days */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Total Class Sessions ({classDays.length})
            </span>
            <span className="text-xs font-medium text-slate-500">
              Click edit to change session names
            </span>
          </div>

          {classDays.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No class days configured yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Type a title above and click "Add Class Day" to create your first class session.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {classDays.map((day, idx) => {
                const isEditing = editingId === day.id;
                const stats = classDayStats[day.id] || { count: 0, percentage: 0 };

                return (
                  <div
                    key={day.id}
                    className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>

                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="text"
                            value={editTitleInput}
                            onChange={(e) => setEditTitleInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditing(day.id);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            autoFocus
                            className="flex-1 px-3 py-1.5 bg-indigo-50/50 dark:bg-slate-800 border border-indigo-400 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => saveEditing(day.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                            title="Save Title"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate" title={day.name}>
                            {day.name}
                          </span>
                          {stats.count > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold rounded-md flex-shrink-0">
                              {stats.count} Present
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {confirmDeleteId === day.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/80 p-1 rounded-lg border border-rose-200 dark:border-rose-800">
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 px-1">Delete session & records?</span>
                            <button
                              onClick={() => {
                                onDeleteClassDay(day.id, true);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : confirmClearId === day.id ? (
                          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/80 p-1 rounded-lg border border-amber-200 dark:border-amber-800">
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 px-1">Clear all logs?</span>
                            <button
                              onClick={() => {
                                if (onClearClassDayRecords) onClearClassDayRecords(day.id, true);
                                setConfirmClearId(null);
                              }}
                              className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Yes, Clear
                            </button>
                            <button
                              onClick={() => setConfirmClearId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(day)}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-200 hover:text-indigo-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Rename title"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>Rename</span>
                            </button>
                            {onClearClassDayRecords && (
                              <button
                                onClick={() => setConfirmClearId(day.id)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors cursor-pointer"
                                title="Clear all attendance records for this day"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDeleteId(day.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Delete class session and all its records"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {classDays.length} sessions active
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
