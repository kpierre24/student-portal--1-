import React, { useState } from 'react';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import { 
  Send, 
  Mail, 
  MessageSquare, 
  Bell, 
  Users, 
  Sparkles, 
  X, 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertCircle,
  Building2,
  ChevronRight,
  Filter,
  CheckCheck,
  Phone
} from 'lucide-react';
import { AppNotification } from '../types';
import { sanitizeInput } from '../lib/securityHelper';

interface BatchAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableStudents: { name: string; email?: string; phone?: string; track?: string }[];
  onSendBroadcast: (broadcast: {
    title: string;
    message: string;
    channel: 'email' | 'sms' | 'portal' | 'whatsapp' | 'all';
    targetGroup: string;
    recipientCount: number;
  }) => void;
}

interface BroadcastLog {
  id: string;
  title: string;
  message: string;
  channel: string;
  targetGroup: string;
  sentAt: string;
  recipientCount: number;
  status: 'Delivered' | 'In Progress';
}

export const BatchAnnouncementModal: React.FC<BatchAnnouncementModalProps> = ({
  isOpen,
  onClose,
  availableStudents,
  onSendBroadcast
}) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [targetGroup, setTargetGroup] = useState<string>('all');
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'sms' | 'portal' | 'all'>('email');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const [history, setHistory] = useState<BroadcastLog[]>([
    {
      id: 'bcast-1',
      title: 'Upcoming Ministry Exam Schedule',
      message: 'Dear Students, please be reminded that Module 1 final evaluations commence next Monday at 10:00 AM.',
      channel: 'Email & SMS',
      targetGroup: 'All Active Students',
      sentAt: '2026-07-20 09:30 AM',
      recipientCount: 42,
      status: 'Delivered'
    },
    {
      id: 'bcast-2',
      title: 'Tuition Balance Clearance Notice',
      message: 'Friendly reminder to clear pending semester tuition fees before the upcoming certificate issuance.',
      channel: 'Email',
      targetGroup: 'Pending Tuition Students',
      sentAt: '2026-07-15 02:15 PM',
      recipientCount: 12,
      status: 'Delivered'
    }
  ]);

  const dialogRef = useAccessibleModal(isOpen, onClose);

  if (!isOpen) return null;

  // Filter students by target group
  const targetStudents = availableStudents.filter(s => {
    if (targetGroup === 'all') return true;
    if (targetGroup === 'active' && s.track && !s.track.includes('InActive')) return true;
    if (targetGroup === 'pending_tuition') return true;
    return true;
  });

  const handleApplyTemplate = (type: 'reminder' | 'exam' | 'tuition' | 'emergency' | 'zoom_tuesday' | 'zoom_exception') => {
    switch (type) {
      case 'zoom_tuesday':
        setSubject('🎥 Weekly Tuesday Live Zoom Class Link & Credentials');
        setMessage('Dear {StudentName},\n\nThis is a reminder that HTEIM School of Ministry classes go live EVERY TUESDAY at 7:00 PM EST via Zoom (unless notified otherwise).\n\nMeeting Details:\n• Zoom Link: https://zoom.us/j/81505377396\n• Meeting ID: 815 0537 7396\n• Passcode: 163738\n\nPlease log in 5 minutes prior to class start.\n\nBlessings,\nHTEIM Academic Directorate');
        break;
      case 'zoom_exception':
        setSubject('⚠️ Schedule Exception Notice: Tuesday Class Session Update');
        setMessage('Greetings {StudentName},\n\nPlease take note of an official schedule exception for this week\'s Tuesday Zoom class session.\n\n[Insert exception details, e.g., Class rescheduled to Wednesday at 7:30 PM EST or Special In-Person Session].\n\nThank you for your diligence,\nHTEIM Faculty Office');
        break;
      case 'reminder':
        setSubject('📢 HTEIM Class Schedule & Venue Reminder');
        setMessage('Dear {StudentName},\n\nPlease be reminded of our upcoming School of Ministry class session this week. Ensure your bible study materials and course notes are prepared.\n\nBlessings,\nHTEIM Academic Registrar');
        break;
      case 'exam':
        setSubject('📝 Exam Schedule & Evaluation Notice');
        setMessage('Greetings {StudentName},\n\nYour upcoming Module Evaluation is scheduled. Please log into the HTEIM Student Portal to review examination guidelines and study topics.\n\nIn His Service,\nHTEIM Faculty');
        break;
      case 'tuition':
        setSubject('💳 Tuition Statement & Financial Reminder');
        setMessage('Dear {StudentName},\n\nThis is a courtesy financial statement update regarding your HTEIM School of Ministry tuition account ({StudentId}). Please review your payment history or contact the Financial Office.\n\nThank you for your diligence,\nHTEIM Finance Office');
        break;
      case 'emergency':
        setSubject('🚨 Important HTEIM Ministry Announcement');
        setMessage('Attention {StudentName},\n\nPlease review an urgent update regarding class schedule changes or ministry notifications on the official portal.\n\nHTEIM Administration');
        break;
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSending(true);

    const safeSubject = sanitizeInput(subject);
    const safeMessage = sanitizeInput(message);

    setTimeout(() => {
      const newLog: BroadcastLog = {
        id: `bcast-${Date.now()}`,
        title: safeSubject,
        message: safeMessage,
        channel: channel.toUpperCase(),
        targetGroup: targetGroup === 'all' ? 'All Students' : targetGroup === 'pending_tuition' ? 'Pending Tuition' : 'Active Students',
        sentAt: new Date().toLocaleString(),
        recipientCount: targetStudents.length || availableStudents.length,
        status: 'Delivered'
      };

      setHistory(prev => [newLog, ...prev]);
      onSendBroadcast({
        title: safeSubject,
        message: safeMessage,
        channel,
        targetGroup,
        recipientCount: targetStudents.length || availableStudents.length
      });

      setIsSending(false);
      setSendSuccess(true);

      setTimeout(() => {
        setSendSuccess(false);
        setSubject('');
        setMessage('');
        setActiveTab('history');
      }, 1500);
    }, 1200);
  };

  const insertVariable = (variableStr: string) => {
    setMessage(prev => prev + ` ${variableStr} `);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 modal-material-scrim">
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Batch Email & SMS Announcement Broadcast"
        className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-scaleUp flex flex-col max-h-[90vh] modal-material-dialog"
      >
        {/* Header */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 modal-material-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Batch Email & SMS Announcement Broadcast</h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 text-[10px] font-mono rounded-full font-semibold">
                  Admin Broadcast Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Broadcast class reminders, exam alerts, and tuition notices directly to targeted student groups.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
           aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('compose')}
            className={`pb-3 text-xs font-black transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'compose'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-4 h-4" /> Compose Broadcast
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-xs font-black transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" /> Broadcast History & Logs ({history.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'compose' ? (
            <form onSubmit={handleSend} className="space-y-5">
              {sendSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 text-xs font-bold animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>Batch announcement successfully queued and broadcasted to {targetStudents.length || availableStudents.length} student recipients!</span>
                </div>
              )}

              {/* Target & Channel Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" /> Target Student Audience
                  </label>
                  <select
                    value={targetGroup}
                    onChange={(e) => setTargetGroup(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500"
                  >
                    <option value="all">All Enrolled Students ({availableStudents.length})</option>
                    <option value="active">Active Ministry Module Cohort</option>
                    <option value="pending_tuition">Pending Tuition Balance Students</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-700 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" /> Broadcast Channel
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                      { id: 'email', label: 'Email', icon: Mail },
                      { id: 'sms', label: 'SMS', icon: Phone },
                      { id: 'portal', label: 'Portal', icon: Bell },
                      { id: 'all', label: 'All Multi', icon: Sparkles }
                    ].map(ch => {
                      const Icon = ch.icon;
                      return (
                        <button
                          type="button"
                          key={ch.id}
                          onClick={() => setChannel(ch.id as any)}
                          className={`p-1.5 rounded-xl text-[10px] font-extrabold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            channel === ch.id 
                              ? ch.id === 'whatsapp' ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' : 'bg-indigo-600 text-white border-indigo-700 shadow-xs' 
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{ch.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Template Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase text-slate-500">Quick Announcement Templates</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('zoom_tuesday')}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    🎥 Tuesday Zoom Link
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('zoom_exception')}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    ⚠️ Zoom Schedule Exception
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('reminder')}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    📢 Class Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('exam')}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    📝 Exam Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('tuition')}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    💳 Tuition Notice
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('emergency')}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    🚨 Emergency Update
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase text-slate-700">Announcement Title / Email Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Important Reminder: HTEIM Module 2 Evaluation Next Monday"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500"
                  required
                />
              </div>

              {/* Message Body & Variable Tags */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold uppercase text-slate-700">Message Content</label>
                  <div className="flex gap-1 text-[10px] font-mono text-slate-500">
                    <span>Insert tag:</span>
                    <button type="button" onClick={() => insertVariable('{StudentName}')} className="hover:text-indigo-600 underline">{'{StudentName}'}</button>
                    <button type="button" onClick={() => insertVariable('{StudentId}')} className="hover:text-indigo-600 underline">{'{StudentId}'}</button>
                  </div>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Write your announcement message here..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 leading-relaxed"
                  required
                />
              </div>

              {/* Audience Preview Summary Box */}
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <CheckCheck className="w-4 h-4 text-indigo-600" />
                  <span>Targeted Student Recipients: <strong>{targetStudents.length || availableStudents.length} Students</strong></span>
                </div>
                <span className="text-[11px] font-mono text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                  Channel: {channel.toUpperCase()}
                </span>
              </div>

              {/* Submit Action */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending || !subject.trim() || !message.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:opacity-80"
                >
                  {isSending ? (
                    <>
                      <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                      <span>Broadcasting Message...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Batch Announcement</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">Past Broadcast Delivery Logs</h4>
              <div className="space-y-3">
                {history.map(item => (
                  <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h5 className="font-extrabold text-xs text-slate-900">{item.title}</h5>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{item.sentAt}</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed italic">"{item.message}"</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-200/70">
                      <span>Audience: <strong>{item.targetGroup}</strong> ({item.recipientCount} recipients)</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold font-mono">
                        {item.channel} • {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500 font-mono">
          <span>Software Powered by <strong className="text-slate-800">Rockproxy Technologies</strong></span>
          <span className="mx-1.5">•</span>
          <span>Director: Kendell Pierre</span>
          <span className="mx-1.5">•</span>
          <span className="text-indigo-600">rockproxytechnologies@gmail.com</span>
        </div>
      </div>
    </div>
  );
};
