import React, { useState } from 'react';
import { AlertTriangle, Send, Mail, Phone, MessageSquare, Bell, CheckCircle2, ShieldAlert, Filter, UserCheck } from 'lucide-react';
import { StudentSummary, PaymentRecord, AppNotification } from '../types';
import { useAccessibleModal } from '../lib/useAccessibleModal';

interface AtRiskNotificationModalProps {
  students?: StudentSummary[];
  atRiskStudents?: Array<{
    studentName: string;
    studentEmail?: string;
    attendanceRate?: number;
    averageScore?: number;
    pastDueAmount?: number;
  }>;
  payments?: PaymentRecord[];
  onClose: () => void;
  onSendAlert?: (notification: AppNotification, channels: ('portal' | 'email' | 'sms' | 'whatsapp')[]) => void;
}

export const AtRiskNotificationModal: React.FC<AtRiskNotificationModalProps> = ({
  students = [],
  atRiskStudents: passedAtRiskStudents,
  payments = [],
  onClose,
  onSendAlert
}) => {
  // Safe array calculations
  const safeStudents = students || [];
  const safePayments = payments || [];

  const calculatedAtRisk = safeStudents.filter(s => {
    if (!s || !s.name) return false;
    const p = safePayments.find(pay => pay && pay.studentName && (pay?.studentName || '').toLowerCase().trim() === (s?.name || '').toLowerCase().trim());
    const hasPastDue = p?.status === 'Past Due';
    const isAttRisk = (s.rate ?? 100) < 75;
    const isGradeRisk = s.avgScore !== null && s.avgScore !== undefined && s.avgScore < 75;
    return isAttRisk || isGradeRisk || hasPastDue;
  });

  const displayList = (passedAtRiskStudents && passedAtRiskStudents.length > 0)
    ? passedAtRiskStudents.map(s => ({
        name: s.studentName,
        rate: s.attendanceRate ?? 70,
        avgScore: s.averageScore ?? null
      }))
    : calculatedAtRisk;

  const [selectedStudentName, setSelectedStudentName] = useState<string>(displayList[0]?.name || '');
  const [selectedChannels, setSelectedChannels] = useState<('portal' | 'email' | 'sms' | 'whatsapp')[]>(['portal', 'email']);
  const [alertType, setAlertType] = useState<'attendance' | 'tuition' | 'academic'>('attendance');
  const [customMessage, setCustomMessage] = useState<string>(
    'Urgent Notice: Your attendance rate has fallen below the 75% HTEIM School of Ministry requirement. Please contact faculty administration.'
  );
  const [isSent, setIsSent] = useState(false);

  const toggleChannel = (ch: 'portal' | 'email' | 'sms' | 'whatsapp') => {
    if (selectedChannels.includes(ch)) {
      setSelectedChannels(selectedChannels.filter(c => c !== ch));
    } else {
      setSelectedChannels([...selectedChannels, ch]);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentName) return;

    const notif: AppNotification = {
      id: `atrisk-${Date.now()}`,
      title: alertType === 'attendance' ? '⚠️ At-Risk Attendance Warning (<75%)' :
             alertType === 'tuition' ? '💳 Past Due Tuition Reminder' : '📖 Academic Performance Notice',
      message: customMessage,
      type: alertType === 'attendance' ? 'at_risk_attendance' : 'payment_past_due',
      targetRole: 'student',
      studentName: selectedStudentName,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      read: false,
      priority: 'high',
      channelSent: selectedChannels
    };

    if (onSendAlert) onSendAlert(notif, selectedChannels);
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      onClose();
    }, 1800);
  };

  const dialogRef = useAccessibleModal(true, onClose);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Automated At-Risk Alert System"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-5 overflow-hidden relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white font-syne">
              Automated At-Risk Alert System
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Flags students with attendance &lt;75%, failing grades, or past due tuition.
            </p>
          </div>
        </div>

        {isSent ? (
          <div className="p-8 text-center bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-2 animate-fadeIn">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-black text-emerald-900 dark:text-emerald-200">
              At-Risk Alert Successfully Dispatched!
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Notified {selectedStudentName} via {selectedChannels.join(', ').toUpperCase()}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            {/* Select At Risk Student */}
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                Select At-Risk Student ({displayList.length} Flagged)
              </label>
              <select
                value={selectedStudentName ?? ''}
                onChange={(e) => setSelectedStudentName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
              >
                {displayList.map((s, idx) => (
                  <option key={idx} value={s.name}>
                    {s.name} — Attendance: {s.rate}% | Avg Score: {s.avgScore ?? 'N/A'}%
                  </option>
                ))}
              </select>
            </div>

            {/* Alert Category */}
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                Alert Trigger Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'attendance', label: 'Attendance < 75%' },
                  { id: 'academic', label: 'Grades < 75%' },
                  { id: 'tuition', label: 'Tuition Past Due' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setAlertType(cat.id as any);
                      if (cat.id === 'attendance') {
                        setCustomMessage('Urgent Notice: Your attendance rate has fallen below the 75% HTEIM requirement. Contact faculty administration.');
                      } else if (cat.id === 'tuition') {
                        setCustomMessage('Tuition Payment Notice: Your account has an outstanding past-due balance. Please submit payment via portal.');
                      } else {
                        setCustomMessage('Academic Alert: Your recent assignment or quiz score requires revision. Please consult your instructor.');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold cursor-pointer transition-all border ${
                      alertType === cat.id
                        ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Channels */}
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                Dispatch Notification Channels
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'portal', label: 'In-Portal', icon: Bell },
                  { id: 'email', label: 'Email', icon: Mail },
                  { id: 'sms', label: 'SMS Text', icon: Phone },
                  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                ].map(ch => {
                  const IconC = ch.icon;
                  const active = selectedChannels.includes(ch.id as any);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => toggleChannel(ch.id as any)}
                      className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <IconC className="w-3.5 h-3.5" />
                      <span>{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Message Body */}
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
                Notification Message
              </label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 font-medium"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Multi-Channel Alert</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
