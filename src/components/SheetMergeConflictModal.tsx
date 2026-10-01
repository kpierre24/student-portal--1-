import React, { useState } from 'react';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import { ShieldAlert, Check, FileSpreadsheet, User, RefreshCw, Calendar } from 'lucide-react';

export type MergeConflict = {
  studentName: string;
  classDay: string;
  localStatus: 'present' | 'absent';
  sheetsStatus: 'present' | 'absent';
  sheetsScore: string;
  sheetsTimestamp: string;
};

interface SheetMergeConflictModalProps {
  isOpen: boolean;
  conflicts: MergeConflict[];
  onResolve: (resolutions: Record<string, 'local' | 'sheets'>) => void;
  onCancel: () => void;
}

export const SheetMergeConflictModal: React.FC<SheetMergeConflictModalProps> = ({
  isOpen,
  conflicts,
  onResolve,
  onCancel
}) => {
  const dialogRef = useAccessibleModal(isOpen && conflicts.length > 0, onCancel);
  // Store individual resolution choices: key is studentName + '||' + classDay
  const [choices, setChoices] = useState<Record<string, 'local' | 'sheets'>>(() => {
    const initial: Record<string, 'local' | 'sheets'> = {};
    conflicts.forEach(c => {
      const key = `${c.studentName}||${c.classDay}`;
      initial[key] = 'local'; // default to keep local override
    });
    return initial;
  });

  if (!isOpen || conflicts.length === 0) return null;

  const handleBulkSelect = (type: 'local' | 'sheets') => {
    const updated = { ...choices };
    conflicts.forEach(c => {
      const key = `${c.studentName}||${c.classDay}`;
      updated[key] = type;
    });
    setChoices(updated);
  };

  const handleToggleIndividual = (studentName: string, classDay: string, selection: 'local' | 'sheets') => {
    const key = `${studentName}||${classDay}`;
    setChoices(prev => ({
      ...prev,
      [key]: selection
    }));
  };

  const handleApply = () => {
    onResolve(choices);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn modal-material-scrim" id="sheets-conflict-modal">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="sheets-conflict-title" className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden modal-material-dialog">
        
        {/* Header section */}
        <div className="p-6 bg-amber-50 border-b border-amber-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-800 border border-amber-200">
              {conflicts.length} Unresolved Conflict{conflicts.length > 1 ? 's' : ''}
            </span>
            <h3 id="sheets-conflict-title" className="text-base font-black text-slate-900 mt-1">Google Sheets Sync Conflict Resolution</h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              We detected conflicts between your local manual modifications and the incoming Google Sheets records. Choose which source of truth to preserve.
            </p>
          </div>
        </div>

        {/* Bulk Action Controls */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 modal-material-header">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Actions</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkSelect('local')}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Keep All Local Manual Overrides
            </button>
            <button
              onClick={() => handleBulkSelect('sheets')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Prefer All Google Sheets Data
            </button>
          </div>
        </div>

        {/* Conflicts List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5 custom-scrollbar bg-slate-50/30">
          {conflicts.map((c) => {
            const key = `${c.studentName}||${c.classDay}`;
            const selected = choices[key];

            return (
              <div 
                key={key}
                className={`p-4 bg-white border rounded-xl transition-all shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  selected === 'local' ? 'border-amber-400/60 ring-2 ring-amber-400/5 bg-amber-50/5' : 'border-indigo-400/60 ring-2 ring-indigo-400/5 bg-indigo-50/5'
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-900 text-sm truncate">{c.studentName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Class Day: <strong className="text-slate-700">{c.classDay}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 md:flex md:items-center">
                  {/* Local Option */}
                  <button
                    onClick={() => handleToggleIndividual(c.studentName, c.classDay, 'local')}
                    className={`px-3 py-2.5 rounded-xl border text-left flex flex-col transition-all cursor-pointer min-w-[120px] ${
                      selected === 'local'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs scale-[1.02]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className={`text-[9px] uppercase font-black tracking-wider ${selected === 'local' ? 'text-amber-100' : 'text-slate-400'}`}>
                      Local Override
                    </span>
                    <span className="font-extrabold text-xs capitalize mt-0.5 flex items-center gap-1">
                      {c.localStatus === 'present' ? '🟢 Present' : '🔴 Absent'}
                    </span>
                  </button>

                  {/* Sheets Option */}
                  <button
                    onClick={() => handleToggleIndividual(c.studentName, c.classDay, 'sheets')}
                    className={`px-3 py-2.5 rounded-xl border text-left flex flex-col transition-all cursor-pointer min-w-[120px] ${
                      selected === 'sheets'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs scale-[1.02]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className={`text-[9px] uppercase font-black tracking-wider ${selected === 'sheets' ? 'text-indigo-100' : 'text-slate-400'}`}>
                      Google Sheets
                    </span>
                    <span className="font-extrabold text-xs capitalize mt-0.5 flex items-center gap-1">
                      {c.sheetsStatus === 'present' ? '🟢 Present' : '🔴 Absent'}
                      {c.sheetsScore && <span className="opacity-80 font-mono text-[10px] ml-0.5">({c.sheetsScore})</span>}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer controls */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-white modal-material-footer">
          <button
            onClick={onCancel}
            className="px-4 py-2 hover:bg-slate-50 text-slate-600 font-extrabold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel Sync
          </button>
          
          <button
            onClick={handleApply}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Apply Decisions ({conflicts.length})
          </button>
        </div>

      </div>
    </div>
  );
};
