import React, { useState } from 'react';
import { FileText, Upload, CheckCircle2, XCircle, Clock, Send, ShieldCheck, UserCheck } from 'lucide-react';
import { ExcusedAbsenceRequest, AttendanceCorrectionAudit } from '../types';

interface ExcusedAbsenceModalProps {
  studentName: string;
  isStaff: boolean;
  onClose: () => void;
  onSubmitRequest?: (req: ExcusedAbsenceRequest) => void;
  onApproveOrReject?: (reqId: string, status: 'Approved' | 'Rejected', note: string) => void;
}

export const ExcusedAbsenceModal: React.FC<ExcusedAbsenceModalProps> = ({
  studentName,
  isStaff,
  onClose,
  onSubmitRequest,
  onApproveOrReject
}) => {
  const [requests, setRequests] = useState<ExcusedAbsenceRequest[]>([
    {
      id: 'abs-1',
      studentName: studentName || 'Alicia Noray Bowles',
      classDayId: 'class-day-3',
      classDayName: 'Module 3: Ministerial Ethics Day 3',
      date: '2026-08-01',
      reason: 'Missionary outreach trip in Chaguanas with ministry pastoral team.',
      proofDocumentName: 'outreach_permission_letter.pdf',
      status: 'Approved',
      submittedAt: '2026-07-30 14:00',
      reviewedBy: 'Apostle Dr. H.E. Alexander',
      reviewNote: 'Verified outreach activity.'
    }
  ]);

  const [date, setDate] = useState('2026-08-08');
  const [reason, setReason] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const newReq: ExcusedAbsenceRequest = {
      id: `abs-${Date.now()}`,
      studentName: studentName || 'Current Student',
      classDayId: 'class-day-current',
      classDayName: 'Upcoming Class Session',
      date,
      reason: reason.trim(),
      proofDocumentName: proofFileName || undefined,
      status: 'Pending',
      submittedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };

    setRequests([newReq, ...requests]);
    if (onSubmitRequest) onSubmitRequest(newReq);
    setReason('');
    setProofFileName('');
  };

  const handleReviewAction = (id: string, status: 'Approved' | 'Rejected') => {
    setRequests(requests.map(r => r.id === id ? {
      ...r,
      status,
      reviewedBy: 'Apostolic Faculty Dean',
      reviewNote: reviewNote || (status === 'Approved' ? 'Absence approved by faculty.' : 'Insufficient documentation provided.')
    } : r));

    if (onApproveOrReject) onApproveOrReject(id, status, reviewNote);
    setReviewNote('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-5 overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white font-syne">
              Excused Absence Approval Workflow
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit ministry/medical reasons for missed sessions to preserve the 75% attendance standard.
            </p>
          </div>
        </div>

        {/* Student Submit Form */}
        {!isStaff && (
          <form onSubmit={handleSubmit} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Submit New Excused Absence Request
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Session Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Attach Proof Document (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. medical_note.pdf"
                  value={proofFileName ?? ''}
                  onChange={(e) => setProofFileName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Reason for Absence</label>
              <textarea
                rows={2}
                required
                placeholder="Explain ministry obligation, illness, or travel reason..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Request for Faculty Review</span>
            </button>
          </form>
        )}

        {/* Existing Requests List */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
            Absence Request History ({requests.length})
          </h3>

          {requests.map(r => (
            <div key={r.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">{r.studentName}</span>
                  <p className="text-[10px] text-slate-400 font-bold">{r.classDayName} ({r.date})</p>
                </div>

                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                  r.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                  r.status === 'Rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' :
                  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }`}>
                  {r.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{r.reason}"</p>

              {r.reviewedBy && (
                <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                  <p className="font-bold">Reviewed by {r.reviewedBy}</p>
                  <p>{r.reviewNote}</p>
                </div>
              )}

              {/* Staff Review Actions */}
              {isStaff && r.status === 'Pending' && (
                <div className="pt-2 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700">
                  <input
                    type="text"
                    placeholder="Faculty review note..."
                    value={reviewNote ?? ''}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                  <button
                    onClick={() => handleReviewAction(r.id, 'Approved')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReviewAction(r.id, 'Rejected')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
