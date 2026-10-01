import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mail,
  Copy,
  Check,
  GraduationCap,
  Trophy,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Trash2,
  PenSquare,
  RotateCcw
} from 'lucide-react';

export interface StudentDetailModalProps {
  selectedStudent: any;
  onClose: () => void;
  studentNotes: Record<string, string>;
  excusedAbsences: Record<string, Record<string, boolean>>;
  effectiveClassDays: any[];
  classDays: any[];
  studentPhotos: Record<string, string>;
  satisfactoryThreshold: number;
  atRiskThreshold: number;
  getStudentBadges: (student: any) => any[];
  rubricScores: Record<string, any>;
  setRubricScores: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onOpenTranscript: () => void;
  onOpenCertificate: (certData: any) => void;
  handleToggleStudentAttendance: (name: string, dayId: string, status: string) => void;
  handleToggleExcusedAbsence: (name: string, dayId: string) => void;
  handleSaveStudentNote: (name: string, note: string) => void;
  handleDeleteStudent: (name: string) => void;
  handleClearStudentAttendanceRecords: (name: string) => void;
  handleUpdateStudentEnrollmentStatus?: (name: string, status: 'active' | 'dropped_out' | 'withdrawn' | 'graduated' | 'leave_of_absence', details?: { reason?: string; date?: string }) => void;
  appUser: any;
}

export function StudentDetailModal({
  selectedStudent,
  onClose,
  studentNotes,
  excusedAbsences,
  effectiveClassDays,
  classDays,
  studentPhotos,
  satisfactoryThreshold,
  atRiskThreshold,
  getStudentBadges,
  rubricScores,
  setRubricScores,
  onOpenTranscript,
  onOpenCertificate,
  handleToggleStudentAttendance,
  handleToggleExcusedAbsence,
  handleSaveStudentNote,
  handleDeleteStudent,
  handleClearStudentAttendanceRecords,
  handleUpdateStudentEnrollmentStatus,
  appUser,
}: StudentDetailModalProps) {
  const [showEmailDraftModal, setShowEmailDraftModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!selectedStudent) return null;

  const studentKey = (selectedStudent.name || '').toLowerCase().trim();
  const currentNote = studentNotes[studentKey] || '';
  const isExcusedMap = excusedAbsences[studentKey] || {};
  const studentBadges = getStudentBadges(selectedStudent);

  const missedDays = effectiveClassDays.filter(day => !selectedStudent.attendanceByDay[day.id]?.present);
  const missedListText = missedDays.map(d => ` • ${d.name}`).join('\n');
  
  const emailSubject = `[HTEIM School of Ministry] Academic Attendance Notice for ${selectedStudent.name}`;
  const emailBody = `Dear ${selectedStudent.name},

This is an official academic notice from HTEIM School of Ministry regarding your class attendance record.

Current Course Attendance & Evaluation Summary:
• Attendance Rate: ${Math.round(selectedStudent.rate)}%
• Total Sessions Attended: ${selectedStudent.attended} out of ${effectiveClassDays.length}
• Total Missed Sessions: ${missedDays.length}
${missedDays.length > 0 ? `Missed Class Sessions:\n${missedListText}\n\n` : ''}Consistent class attendance is essential to your ministry preparation and course completion. Please contact your instructor or administration team at HTEIM School of Ministry to discuss your standing.

In His Service,
Faculty & Academic Administration Team
HTEIM School of Ministry (Heaven Touching Earth Int'l Ministries)`;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  const modalPhoto = studentPhotos[studentKey] || selectedStudent.photoUrl;

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
          onClick={() => {
            onClose();
            setShowEmailDraftModal(false);
          }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Modal Header */}
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 border border-slate-600 uppercase">
                {modalPhoto ? (
                  <img src={modalPhoto} alt={selectedStudent.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{selectedStudent.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-extrabold">{selectedStudent.name}</h2>
                  {selectedStudent.isDroppedOut || selectedStudent.enrollmentStatus === 'dropped_out' || selectedStudent.enrollmentStatus === 'withdrawn' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/30 text-rose-300 border border-rose-500/50">
                      🔴 {selectedStudent.enrollmentStatus === 'withdrawn' ? 'Withdrawn' : 'Dropped Out'}
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      selectedStudent.rate >= satisfactoryThreshold ? 'bg-emerald-500/20 text-emerald-300' : selectedStudent.rate >= atRiskThreshold ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300 font-extrabold'
                    }`}>
                      {Math.round(selectedStudent.rate)}% Rate
                    </span>
                  )}
                </div>

                {/* Student Badges */}
                {studentBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {studentBadges.map((b, bIdx) => (
                      <span key={`modal-badge-${b.id || bIdx}-${bIdx}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${b.bg}`}>
                        {b.icon}
                        <span>{b.label}</span>
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-slate-400 mt-1">
                  Attended {selectedStudent.attended} out of {effectiveClassDays.length} total class days
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                onClose();
                setShowEmailDraftModal(false);
              }}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body Scrollable */}
          <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
            {/* Draft Email Warning Button */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">Academic Attendance Communication</h4>
                    <p className="text-[10px] text-amber-700">Generate formatted email warning with attendance rate & missed dates</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      setShowEmailDraftModal(prev => !prev);
                      setCopiedEmail(false);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0 shadow-2xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {showEmailDraftModal ? 'Hide Draft' : 'Draft Email Warning'}
                  </button>

                  <button
                    onClick={onOpenTranscript}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0 shadow-2xs"
                    title="Generate official academic transcript & evaluation PDF report for this student"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    Academic Transcript PDF
                  </button>

                  <button
                    onClick={() => {
                      onOpenCertificate({
                        studentName: selectedStudent.name,
                        awardTitle: selectedStudent.rate >= 100 
                          ? "CERTIFICATE OF EXCELLENCE - 100% PERFECT ATTENDANCE" 
                          : selectedStudent.avgScore && selectedStudent.avgScore >= 85 
                          ? "HONOR ROLL COMMENDATION OF ACADEMIC DISTINCTION" 
                          : "COMMENDATION OF MINISTERIAL PROGRESS & DILIGENCE",
                        criteria: `Attendance Standing: ${Math.round(selectedStudent.rate)}% (${selectedStudent.attended}/${effectiveClassDays.length} Sessions Attended)${selectedStudent.avgScore !== null ? ` • Average Evaluation Score: ${Math.round(selectedStudent.avgScore)}%` : ''}`,
                        rate: selectedStudent.rate,
                        avgScore: selectedStudent.avgScore
                      });
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0 shadow-2xs"
                    title="Generate printable milestone certificate of achievement"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    Award Certificate
                  </button>
                </div>
              </div>

              {/* Expanded Email Warning Composer */}
              {showEmailDraftModal && (
                <div className="mt-3 pt-3 border-t border-amber-200 space-y-2.5 animate-fadeIn">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-800 mb-1">Subject</label>
                    <input
                      readOnly
                      type="text"
                      value={emailSubject}
                      className="w-full p-2 bg-white border border-amber-200 rounded text-xs font-bold text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-amber-800 mb-1">Generated Body</label>
                    <textarea
                      readOnly
                      rows={7}
                      value={emailBody}
                      className="w-full p-2.5 bg-white border border-amber-200 rounded text-xs font-mono text-slate-800 focus:outline-none custom-scrollbar"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={handleCopyEmail}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedEmail ? 'Copied to Clipboard!' : 'Copy Email Text'}
                    </button>

                    <a
                      href={mailtoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Open Mail Client
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Evaluation Breakdown (Participation, Readings) */}
            {(() => {
              const studentRubric = rubricScores[studentKey] || { participation: 90, scripture: 95, assignment: 85 };
              const rubricAvg = Math.round((studentRubric.participation + studentRubric.assignment) / 2);

              const handleUpdateRubric = (key: 'participation' | 'scripture' | 'assignment', val: number) => {
                const updated = { ...studentRubric, [key]: Math.min(100, Math.max(0, val)) };
                setRubricScores(prev => ({ ...prev, [studentKey]: updated }));
              };

              return (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Rubric & Ministerial Evaluation</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Composite Score: {rubricAvg}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Participation */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-emerald-500" /> Class Participation
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-800">{studentRubric.participation}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" value={studentRubric?.participation ?? 90}
                        onChange={(e) => handleUpdateRubric('participation', parseInt(e.target.value, 10))}
                        className="w-full accent-emerald-600 cursor-pointer h-1.5"
                      />
                    </div>

                    {/* Reading Assignments */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-indigo-500" /> Course Readings & Assignments
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-800">{studentRubric.assignment}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" value={studentRubric?.assignment ?? 85}
                        onChange={(e) => handleUpdateRubric('assignment', parseInt(e.target.value, 10))}
                        className="w-full accent-indigo-600 cursor-pointer h-1.5"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Attendance & Response Breakdown</p>
              
              <div className="space-y-2">
                {classDays.map(day => {
                  const att = selectedStudent.attendanceByDay[day.id];
                  const isPresent = att?.present;
                  const isExcused = !isPresent && !!isExcusedMap[day.id];

                  return (
                    <div key={day.id} className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                      isPresent ? 'bg-emerald-50/40 border-emerald-200/60' : isExcused ? 'bg-amber-50/40 border-amber-200/60' : 'bg-slate-50 border-slate-200/60'
                    }`}>
                      <div className="flex items-center gap-3">
                        {isPresent ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : isExcused ? (
                          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-bold text-slate-800">{day.name}</p>
                          {att?.timestamp && (
                            <p className="text-[10px] text-slate-500">Submitted: {att.timestamp}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {appUser?.role !== 'student' && (
                          <>
                            <button
                              onClick={() => handleToggleStudentAttendance(selectedStudent.name, day.id, isPresent ? 'absent' : 'present')}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                isPresent ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                              title="Toggle Present / Absent"
                            >
                              {isPresent ? 'Mark Absent' : 'Mark Present'}
                            </button>
                            {!isPresent && (
                              <button
                                onClick={() => handleToggleExcusedAbsence(selectedStudent.name, day.id)}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                  isExcused ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-200/80 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                                }`}
                                title="Toggle excused absence"
                              >
                                {isExcused ? 'Unmark Excused' : 'Mark Excused'}
                              </button>
                            )}
                            {(isPresent || isExcused || att) && (
                              <button
                                onClick={() => handleToggleStudentAttendance(selectedStudent.name, day.id, 'unmarked')}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded transition-colors cursor-pointer"
                                title="Delete/Clear this day's attendance record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isPresent ? 'bg-emerald-100 text-emerald-800' : isExcused ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {isPresent ? 'Present' : isExcused ? 'Excused' : 'Absent'}
                        </span>
                        {att?.score && (
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            {att.score}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Teacher Notes Section */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <PenSquare className="w-3.5 h-3.5 text-indigo-500" />
                Teacher Notes & Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Enter custom remarks or flags for this student..."
                value={currentNote ?? ''}
                onChange={(e) => handleSaveStudentNote(selectedStudent.name, e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleDeleteStudent(selectedStudent.name)}
                className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-100 hover:text-rose-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                title="Remove student from local active roster"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Exclude Student
              </button>
              {appUser?.role !== 'student' && (
                <button
                  onClick={() => handleClearStudentAttendanceRecords(selectedStudent.name)}
                  className="flex items-center gap-1.5 px-3 py-2 text-amber-700 hover:bg-amber-100 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  title="Clear all attendance logs for this student"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Attendance History
                </button>
              )}
            </div>
            <button 
              onClick={() => {
                onClose();
                setShowEmailDraftModal(false);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
