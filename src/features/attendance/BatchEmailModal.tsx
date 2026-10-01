import React, { useState } from 'react';
import { Mail, X, Check, Copy } from 'lucide-react';

export interface BatchEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudentNames: string[];
  uniqueStudents: any[];
  effectiveClassDays: any[];
  atRiskThreshold: number;
  clearBatchSelection: () => void;
}

export function BatchEmailModal({
  isOpen,
  onClose,
  selectedStudentNames,
  uniqueStudents,
  effectiveClassDays,
  atRiskThreshold,
  clearBatchSelection,
}: BatchEmailModalProps) {
  const [copiedBatchEmail, setCopiedBatchEmail] = useState(false);

  if (!isOpen || selectedStudentNames.length === 0) return null;

  const selectedStudentsData = uniqueStudents.filter(s => selectedStudentNames.includes(s.name));
  const atRiskSelected = selectedStudentsData.filter(s => s.rate < atRiskThreshold);

  const batchSubject = `[HTEIM School of Ministry] Batch Academic Notice - ${selectedStudentsData.length} Students`;
  
  let batchBody = `HTEIM SCHOOL OF MINISTRY - FACULTY BATCH ACADEMIC NOTICE\n`;
  batchBody += `Heaven Touching Earth Int'l Ministries\n`;
  batchBody += `Generated on ${new Date().toLocaleDateString()}\n\n`;
  batchBody += `The following ${selectedStudentsData.length} student(s) have been flagged for attendance review:\n\n`;

  selectedStudentsData.forEach((s, idx) => {
    const missedCount = effectiveClassDays.filter(day => !s.attendanceByDay[day.id]?.present).length;
    batchBody += `${idx + 1}. ${s.name}\n`;
    batchBody += `   • Attendance Standing: ${Math.round(s.rate)}% (${s.attended}/${effectiveClassDays.length} Attended, ${missedCount} Missed)\n`;
    if (s.avgScore !== null) {
      batchBody += `   • Evaluation Score: ${Math.round(s.avgScore)}%\n`;
    }
    batchBody += `\n`;
  });

  batchBody += `Please coordinate with academic advisors or students to maintain ministerial standard requirements.\n\nIn His Service,\nHTEIM Academic Administration`;

  const handleCopyBatchEmail = () => {
    navigator.clipboard.writeText(`Subject: ${batchSubject}\n\n${batchBody}`);
    setCopiedBatchEmail(true);
    setTimeout(() => setCopiedBatchEmail(false), 2500);
  };

  const batchMailtoUrl = `mailto:?subject=${encodeURIComponent(batchSubject)}&body=${encodeURIComponent(batchBody)}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-xl overflow-hidden animate-scaleUp">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-rose-400" />
            <div>
              <h2 className="text-sm font-extrabold">Batch At-Risk Email Notice</h2>
              <p className="text-[10px] text-slate-400">{selectedStudentsData.length} Students Selected ({atRiskSelected.length} At-Risk)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Subject</label>
            <input
              readOnly
              type="text"
              value={batchSubject}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Consolidated Batch Notice Body</label>
            <textarea
              readOnly
              rows={10}
              value={batchBody}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800 custom-scrollbar focus:outline-none"
            />
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={clearBatchSelection}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
          >
            Clear Selected
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyBatchEmail}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {copiedBatchEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedBatchEmail ? 'Copied Batch Email!' : 'Copy Batch Email'}
            </button>

            <a
              href={batchMailtoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              Open Mail Client
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
