import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Download, Printer, X } from 'lucide-react';
import { LogoImage } from '../../components/LogoImage';

export interface StudentTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudent: any;
  effectiveClassDays: any[];
  rubricScores: Record<string, any>;
  excusedAbsences: Record<string, Record<string, boolean>>;
  satisfactoryThreshold: number;
  atRiskThreshold: number;
  isGeneratingPDF: boolean;
  handleExportPDF: (elementId: string, fileName: string) => void;
  handleToggleStudentAttendance: (name: string, dayId: string, status: string) => void;
  appUser: any;
}

export function StudentTranscriptModal({
  isOpen,
  onClose,
  selectedStudent,
  effectiveClassDays,
  rubricScores,
  excusedAbsences,
  satisfactoryThreshold,
  atRiskThreshold,
  isGeneratingPDF,
  handleExportPDF,
  handleToggleStudentAttendance,
  appUser,
}: StudentTranscriptModalProps) {
  if (!isOpen || !selectedStudent) return null;

  const studentKey = (selectedStudent.name || '').toLowerCase().trim();
  const rub = rubricScores[studentKey] || { participation: 90, scripture: 95, assignment: 85 };
  const rubAvg = Math.round((rub.participation + rub.assignment) / 2);

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
        onScroll={(e) => { e.currentTarget.scrollTop = 0; }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Spacebar') {
            e.stopPropagation();
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.isContentEditable;
            if (!isInput) {
              e.preventDefault();
            }
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Modal Toolbar */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-extrabold">Official Student Academic Transcript</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportPDF('printable-student-transcript', `HTEIM_Academic_Transcript_${selectedStudent.name.replace(/\s+/g, '_')}.pdf`)}
                disabled={isGeneratingPDF}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                title="Directly download high-definition PDF transcript"
              >
                <Download className={`w-3.5 h-3.5 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
                {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF Transcript'}
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-slate-700"
              >
                <Printer className="w-3.5 h-3.5" />
                Browser Print
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Transcript Document Printable Canvas */}
          <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6 text-slate-800 print-container" id="printable-student-transcript">
            {/* Document Letterhead */}
            <div className="border-b-2 border-slate-900 pb-5 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <LogoImage 
                  alt="HTEIM Logo" 
                  className="w-16 h-16 rounded-full border border-amber-500 shadow-md object-contain bg-white p-0.5 flex-shrink-0"
                />
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">HTEIM SCHOOL OF MINISTRY</h1>
                  <p className="text-xs font-bold text-amber-900 tracking-wide">HEAVEN TOUCHING EARTH INT'L MINISTRIES</p>
                  <p className="text-[11px] italic font-serif text-slate-600 mt-0.5">"Bringing Heaven to Earth, Taking People to Heaven"</p>
                  <div className="mt-1.5 inline-block px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-900 text-[10px] font-bold uppercase tracking-wider rounded">
                    Official Academic Transcript & Evaluation Report
                  </div>
                </div>
              </div>

              <div className="text-right text-xs text-slate-600 space-y-1 font-mono">
                <p className="font-sans font-bold text-slate-900">{new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}</p>
                <p className="text-[10px] text-slate-500">Document Ref: HTEIM-TR-{Math.floor(100000 + Math.random() * 900000)}</p>
              </div>
            </div>

            {/* Student Summary Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Student Name</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{selectedStudent.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Attendance Rate</p>
                <p className={`text-base font-mono font-bold mt-0.5 ${
                  selectedStudent.rate >= satisfactoryThreshold ? 'text-emerald-700' : selectedStudent.rate >= atRiskThreshold ? 'text-amber-700' : 'text-rose-700'
                }`}>
                  {Math.round(selectedStudent.rate)}% ({selectedStudent.attended}/{effectiveClassDays.length})
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Academic Standing</p>
                <p className="text-xs font-extrabold uppercase mt-1">
                  {selectedStudent.rate >= 100 
                    ? <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">Perfect Standing</span>
                    : selectedStudent.rate >= satisfactoryThreshold
                    ? <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">Good Standing</span>
                    : <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">At-Risk Standing</span>
                  }
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Composite Evaluation</p>
                <p className="text-base font-mono font-bold text-indigo-700 mt-0.5">{rubAvg}% Average</p>
              </div>
            </div>

            {/* Rubric Evaluation Breakdown */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Rubric & Ministerial Competency Breakdown</h3>
              <div className="grid grid-cols-2 gap-3 bg-white p-3 border border-slate-200 rounded-xl text-center">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Class Participation</p>
                  <p className="text-lg font-mono font-bold text-emerald-700 mt-0.5">{rub.participation}%</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Course Readings & Assignments</p>
                  <p className="text-lg font-mono font-bold text-indigo-700 mt-0.5">{rub.assignment}%</p>
                </div>
              </div>
            </div>

            {/* Session-by-Session Attendance Table */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Class Session Attendance Record</h3>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-800 bg-slate-100 text-slate-700">
                    <th className="p-2 font-bold">Class Session / Date</th>
                    <th className="p-2 font-bold text-center">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {effectiveClassDays.map(day => {
                    const att = selectedStudent.attendanceByDay[day.id];
                    const isPresent = att?.present;
                    const isExcused = !isPresent && !!(excusedAbsences[studentKey] || {})[day.id];

                    return (
                      <tr key={day.id} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-900">{day.name}</td>
                        <td className="p-2 text-center">
                          {appUser?.role !== 'student' ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStudentAttendance(
                                selectedStudent.name,
                                day.id,
                                isPresent ? 'excused' : isExcused ? 'absent' : 'present'
                              )}
                              className="cursor-pointer inline-block"
                              title="Click to cycle attendance status (Present -> Excused -> Absent)"
                            >
                              {isPresent ? (
                                <span className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded transition-colors">Present</span>
                              ) : isExcused ? (
                                <span className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold rounded transition-colors">Excused</span>
                              ) : (
                                <span className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold rounded transition-colors">Absent</span>
                              )}
                            </button>
                          ) : (
                            isPresent ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">Present</span>
                            ) : isExcused ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">Excused</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded">Absent</span>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Faculty Notes & Commentary */}
            {selectedStudent.note && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950">
                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 block mb-1">Faculty Academic Note:</span>
                <p className="italic">{selectedStudent.note}</p>
              </div>
            )}

            {/* Official Signature Block */}
            <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-slate-200 text-slate-700 text-xs">
              <div className="flex flex-col items-center">
                <div className="w-36 border-b border-slate-800 mb-1"></div>
                <p className="font-bold text-slate-900">Dr. Faculty Director</p>
                <p className="text-[10px] text-slate-400">Academic Dean, HTEIM School of Ministry</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-36 border-b border-slate-800 mb-1"></div>
                <p className="font-bold text-slate-900">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                <p className="text-[10px] text-slate-400">Date of Issue</p>
              </div>
            </div>

            {/* Letterhead Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-slate-500 text-[10px]">
              <div className="flex items-center gap-2">
                <LogoImage alt="HTEIM Logo" className="w-5 h-5 rounded-full border border-amber-400 p-0.5 object-contain bg-white" />
                <span className="font-bold text-slate-700">HTEIM School of Ministry</span>
              </div>
              <div className="italic font-serif text-slate-600">
                "Bringing Heaven to Earth, Taking People to Heaven"
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
