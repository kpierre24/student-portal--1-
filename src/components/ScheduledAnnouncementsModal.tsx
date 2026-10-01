import React, { useState } from 'react';
import { Send, Bell, Filter, CheckCircle2, MessageSquare, Clock, Calendar, Users, Sparkles } from 'lucide-react';
import { Announcement } from '../types';

interface ScheduledAnnouncementsModalProps {
  onClose: () => void;
  onSendAnnouncement?: (announcement: Announcement) => void;
}

export const ScheduledAnnouncementsModal: React.FC<ScheduledAnnouncementsModalProps> = ({
  onClose,
  onSendAnnouncement
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: 'ann-1',
      title: 'Apostolic Ethics Midterm Exam Notice',
      content: 'Reminder: Module 3 Ministerial Ethics exegesis paper is due Friday at 11:59 PM EST. Please submit via the Custom Assignments tab.',
      targetCohort: 'Cohort 2026-A',
      targetModule: 'Module 3: Ministerial Ethics',
      targetRole: 'student',
      targetPaymentStatus: 'all',
      templateCategory: 'Exam Notice',
      createdAt: '2026-08-05 09:00',
      sentBy: 'Apostle Dr. H.E. Alexander',
      readByStudentNames: ['Alicia Noray Bowles', 'Afeshia', 'Candy Webb', 'Josanne Pompey']
    }
  ]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'student' | 'teacher' | 'admin'>('student');
  const [targetModule, setTargetModule] = useState<string>('Module 3: Ministerial Ethics');
  const [targetPaymentStatus, setTargetPaymentStatus] = useState<'all' | 'past_due' | 'paid'>('all');
  const [templateCategory, setTemplateCategory] = useState<'General' | 'Attendance Warning' | 'Tuition Reminder' | 'Exam Notice' | 'Class Schedule Change'>('General');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('2026-08-09T18:00');

  const applyTemplate = (cat: 'General' | 'Attendance Warning' | 'Tuition Reminder' | 'Exam Notice' | 'Class Schedule Change') => {
    setTemplateCategory(cat);
    if (cat === 'Attendance Warning') {
      setTitle('⚠️ Official Attendance Threshold Notice (75% Minimum)');
      setContent('Dear Student, HTEIM School of Ministry policy requires a minimum 75% attendance rate for level diploma eligibility. Please check in using class PINs or submit an excused absence request.');
    } else if (cat === 'Tuition Reminder') {
      setTitle('💳 Monthly Tuition Installment Balance Reminder');
      setContent('Friendly Reminder: Monthly tuition payments for Level 2 & 3 modules are due. You can review your balance and download your official statement in the Tuition & Billing tab.');
    } else if (cat === 'Exam Notice') {
      setTitle('📖 Upcoming Module Exegesis & Exam Schedule');
      setContent('Please be advised that the upcoming Scripture Exegesis exam will be administered online. Review course handouts in the Central Library prior to class.');
    } else if (cat === 'Class Schedule Change') {
      setTitle('📅 Class Session Time Update');
      setContent('Attention Students: Saturday morning class session will commence at 9:00 AM sharp via live Zoom link.');
    } else {
      setTitle('');
      setContent('');
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      targetRole,
      targetModule,
      targetPaymentStatus,
      templateCategory,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      scheduledFor: isScheduled ? scheduledFor : undefined,
      sentBy: 'Apostology Faculty Dean',
      readByStudentNames: [],
      channels: ['portal', 'email', 'whatsapp']
    };

    setAnnouncements([newAnn, ...announcements]);
    if (onSendAnnouncement) onSendAnnouncement(newAnn);
    setTitle('');
    setContent('');
    alert(isScheduled ? `Announcement scheduled for ${scheduledFor}!` : 'Broadcast dispatched successfully!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full p-6 shadow-xl space-y-5 overflow-hidden relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white font-syne">
              Targeted Communication & Broadcast Center
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filter announcements by cohort, module, role, or tuition status with read receipts.
            </p>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Quick Message Templates */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase mb-1">
              Select Message Template
            </label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'General', label: 'General' },
                { id: 'Attendance Warning', label: 'Attendance Warning' },
                { id: 'Tuition Reminder', label: 'Tuition Reminder' },
                { id: 'Exam Notice', label: 'Exam Notice' },
                { id: 'Class Schedule Change', label: 'Schedule Change' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all border ${
                    templateCategory === t.id
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSend} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            {/* Target Audience Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-0.5">Target Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="all">All Portal Users</option>
                  <option value="student">Students Only</option>
                  <option value="teacher">Faculty & Teachers</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-0.5">Target Module Track</label>
                <select
                  value={targetModule}
                  onChange={(e) => setTargetModule(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="All Modules">All 6 Modules</option>
                  <option value="Module 1: Hermeneutics">Module 1: Hermeneutics</option>
                  <option value="Module 2: Evangelism">Module 2: Evangelism</option>
                  <option value="Module 3: Ministerial Ethics">Module 3: Ministerial Ethics</option>
                  <option value="Module 4: Apostolic Governance">Module 4: Apostolic Governance</option>
                  <option value="Module 5: Prophetic Ministry">Module 5: Prophetic Ministry</option>
                  <option value="Module 6: Pastors School">Module 6: Pastors School</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-0.5">Tuition Status</label>
                <select
                  value={targetPaymentStatus}
                  onChange={(e) => setTargetPaymentStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="past_due">Past Due Balance Only</option>
                  <option value="paid">Paid In Full Students</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-0.5">Announcement Headline</label>
              <input
                type="text"
                required
                placeholder="e.g. Class Schedule Adjustment Notice..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-0.5">Broadcast Content</label>
              <textarea
                rows={3}
                required
                placeholder="Write detailed broadcast message..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
            </div>

            {/* Recurring / Schedule Toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Schedule Announcement for Future Date</span>
              </label>

              {isScheduled && (
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                />
              )}
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isScheduled ? 'Schedule Recurring Broadcast' : 'Dispatch Immediate Broadcast'}</span>
            </button>
          </form>

          {/* Past Broadcast History */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">
              Broadcast History & Read Receipts ({announcements.length})
            </h3>

            {announcements.map(ann => (
              <div key={ann.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{ann.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">Dispatched by {ann.sentBy} • {ann.createdAt}</span>
                  </div>

                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black text-[10px] rounded">
                    {ann.readByStudentNames?.length || 4} Read Receipts
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Close Center
          </button>
        </div>
      </div>
    </div>
  );
};
