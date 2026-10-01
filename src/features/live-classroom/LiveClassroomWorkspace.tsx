import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, 
  Video, 
  UserCheck, 
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  FileText, 
  Send, 
  MessageSquare, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Download, 
  ExternalLink, 
  Sliders, 
  Share2, 
  Heart, 
  AlertCircle,
  HelpCircle,
  Save,
  ChevronRight,
  BookOpenCheck,
  Bookmark
} from 'lucide-react';
import { AppUser } from '../../lib/userAuth';
import { ClassDay, StudentSummary, TabType } from '../../types';
import { logActivity } from '../../lib/auditLogger';
import { LiveWebRTCStudio } from './LiveWebRTCStudio';
import { LiveClassroomSession, LiveChatMessage } from './types';
import { appendStudentNote } from '../../utils/notesStorage';

export interface LiveClassroomWorkspaceProps {
  appUser: AppUser | null;
  classDays?: ClassDay[];
  students?: StudentSummary[];
  onNavigateTab?: (tab: TabType) => void;
  onRecordLiveAttendance?: (studentName: string, classDayTitle: string) => void;
  className?: string;
}

const DEFAULT_SCRIPTURE_MAP: Record<string, { ref: string; text: string }> = {
  'SOM-MOD-1': {
    ref: '1 Corinthians 3:10-11',
    text: 'According to the grace of God which is given unto me, as a wise masterbuilder, I have laid the foundation, and another buildeth thereon.'
  },
  'SOM-MOD-2': {
    ref: 'Mark 16:15',
    text: 'And he said unto them, Go ye into all the world, and preach the gospel to every creature.'
  },
  'SOM-MOD-3': {
    ref: '1 Timothy 3:2-7',
    text: 'A bishop then must be blameless, the husband of one wife, vigilant, sober, of good behaviour, given to hospitality, apt to teach.'
  },
  'SOM-MOD-4': {
    ref: 'Ephesians 4:11-12',
    text: 'And he gave some, apostles; and some, prophets; and some, evangelists; and some, pastors and teachers; for the perfecting of the saints, for the work of the ministry.'
  },
  'SOM-MOD-5': {
    ref: '1 Corinthians 14:3',
    text: 'But he that prophesieth speaketh unto men to edification, and exhortation, and comfort.'
  },
  'SOM-MOD-6': {
    ref: '2 Timothy 4:2',
    text: 'Preach the word; be instant in season, out of season; reprove, rebuke, exhort with all longsuffering and doctrine.'
  }
};

export const LiveClassroomWorkspace: React.FC<LiveClassroomWorkspaceProps> = ({
  appUser,
  classDays = [],
  students = [],
  onNavigateTab,
  onRecordLiveAttendance,
  className = ''
}) => {
  const isTeacherOrAdmin = appUser?.role === 'admin' || appUser?.role === 'teacher';
  const currentStudentName = appUser?.studentName || appUser?.name || 'Student Candidate';

  // 1. Live Session Configuration State
  const [session, setSession] = useState<LiveClassroomSession>(() => {
    return {
      id: 'live_som_active',
      title: 'Module 6: School of the Pastors & Practical Homiletics Lab',
      moduleCode: 'SOM-MOD-6',
      moduleTitle: 'School of Pastors & Teachers',
      instructorName: 'Pastor Samuel Selkridge',
      roomName: 'HTEIM-SchoolOfMinistry-Cohort2026-Module6',
      isLive: true,
      startTime: new Date().toISOString(),
      sessionMode: 'interactive_lab',
      activeAttendancePrompt: true,
      pinnedScripture: '2 Timothy 4:2 — Preach the word; be instant in season, out of season...',
      pinnedHandoutUrl: '/resources/Module6_Homiletics_Guide.pdf'
    };
  });

  // 2. Attendance Check-In State
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTimestamp, setCheckInTimestamp] = useState<string | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(14);
  const [activeTab, setActiveTab] = useState<'notes' | 'chat' | 'scriptures'>('notes');

  // 3. Live Lecture Notes State
  const [liveNoteText, setLiveNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedMessage, setNoteSavedMessage] = useState<string | null>(null);

  // 4. Live Chat & Prayer Requests State
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([
    {
      id: 'msg-1',
      senderName: 'Pastor Samuel Selkridge',
      senderRole: 'teacher',
      text: 'Welcome ministers! Please open your Bibles to 2 Timothy 4 and prepare for the homiletics activation.',
      timestamp: '7:01 PM'
    },
    {
      id: 'msg-2',
      senderName: 'Danielle Clarke',
      senderRole: 'student',
      text: 'Good evening Pastor! Connected and ready.',
      timestamp: '7:02 PM'
    },
    {
      id: 'msg-3',
      senderName: 'Minister Caleb Washington',
      senderRole: 'student',
      text: 'Prayer Request: Strength for the youth outreach this Saturday.',
      timestamp: '7:05 PM',
      isPrayerRequest: true
    }
  ]);
  const [inputChatText, setInputChatText] = useState('');
  const [isPrayerTag, setIsPrayerTag] = useState(false);

  // Check if student already checked in previously in local storage
  useEffect(() => {
    if (appUser?.name) {
      const key = `hteim_live_checkin_${session.id}_${appUser.name.toLowerCase().trim()}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setIsCheckedIn(true);
        setCheckInTimestamp(saved);
      }
    }
  }, [appUser?.name, session.id]);

  // Handle student clicking "Confirm Live Attendance"
  const handleConfirmAttendance = () => {
    if (!appUser?.name) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setIsCheckedIn(true);
    setCheckInTimestamp(now);
    setCheckedInCount(prev => prev + 1);

    const key = `hteim_live_checkin_${session.id}_${appUser.name.toLowerCase().trim()}`;
    localStorage.setItem(key, now);

    // Call upstream attendance recorder
    if (onRecordLiveAttendance) {
      onRecordLiveAttendance(appUser.name, session.title);
    }

    logActivity({
      actor: appUser.name,
      role: (appUser.role as any) || 'student',
      actionCategory: 'Attendance Override',
      actionTitle: 'Live Classroom Attendance Logged',
      targetStudent: appUser.name,
      details: `Student verified live participation in WebRTC session: ${session.title} at ${now}.`
    });
  };

  // Save live notes into personal student notes collection
  const handleSaveLiveNotes = () => {
    if (!liveNoteText.trim() || !currentStudentName) return;
    setIsSavingNote(true);

    try {
      appendStudentNote(currentStudentName, {
        id: `live_note_${Date.now()}`,
        studentName: currentStudentName,
        title: `[Live Class] ${session.title}`,
        classDayId: session.moduleCode,
        classDayName: session.title,
        classDate: new Date().toISOString().split('T')[0],
        moduleCode: session.moduleCode,
        instructor: session.instructorName,
        content: liveNoteText,
        keyScriptures: [session.pinnedScripture || '2 Timothy 4:2'],
        tags: ['live-class', session.moduleCode, 'homiletics'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setNoteSavedMessage('Saved to personal notes!');
      setTimeout(() => setNoteSavedMessage(null), 3000);
    } catch (e) {
      console.warn('Failed saving note:', e);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Send in-room chat message
  const handleSendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputChatText.trim()) return;

    const newMsg: LiveChatMessage = {
      id: `msg-${Date.now()}`,
      senderName: appUser?.name || 'Student Candidate',
      senderRole: (appUser?.role as any) || 'student',
      text: inputChatText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isPrayerRequest: isPrayerTag
    };

    setChatMessages(prev => [...prev, newMsg]);
    setInputChatText('');
    setIsPrayerTag(false);
  };

  // Module Preset Rooms
  const MODULE_ROOMS = [
    { code: 'SOM-MOD-1', title: 'Module 1: Biblical Hermeneutics & Foundation', instructor: 'Pastor Samuel Selkridge', room: 'HTEIM-SchoolOfMinistry-Cohort2026-Module1', scripture: '1 Corinthians 3:10-11 — According to the grace of God which is given unto me...' },
    { code: 'SOM-MOD-2', title: 'Module 2: Evangelism & Soul Winning Practicum', instructor: 'Minister Caleb Washington', room: 'HTEIM-SchoolOfMinistry-Cohort2026-Module2', scripture: 'Mark 16:15 — Go ye into all the world, and preach the gospel...' },
    { code: 'SOM-MOD-3', title: 'Module 3: Ministerial Ethics & Pastoral Leadership', instructor: 'Pastor Samuel Selkridge', room: 'HTEIM-SchoolOfMinistry-Cohort2026-Module3', scripture: '1 Timothy 3:2-7 — A bishop then must be blameless...' },
    { code: 'SOM-MOD-4', title: 'Module 4: Apostolic Governance & Church Planting', instructor: 'Apostle Dr. Selkridge', room: 'HTEIM-SchoolOfMinistry-Cohort2026-Module4', scripture: 'Ephesians 4:11-12 — And he gave some, apostles; and some, prophets...' },
    { code: 'SOM-MOD-5', title: 'Module 5: Prophetic Ministry & Spiritual Warfare', instructor: 'Pastor Samuel Selkridge', room: 'HTEIM-SchoolOfMinistry-Cohort2026-Module5', scripture: '1 Corinthians 14:3 — But he that prophesieth speaketh unto men...' },
    { code: 'SOM-MOD-6', title: 'Module 6: School of the Pastors & Practical Homiletics Lab', instructor: 'Pastor Samuel Selkridge', room: 'HTEIM-SchoolOfMinistry-Cohort2026-Module6', scripture: '2 Timothy 4:2 — Preach the word; be instant in season, out of season...' }
  ];

  const handleSelectModuleRoom = (moduleCode: string) => {
    const selected = MODULE_ROOMS.find(m => m.code === moduleCode);
    if (selected) {
      setSession({
        id: `live_${moduleCode.toLowerCase().replace(/-/g, '_')}`,
        title: selected.title,
        moduleCode: selected.code,
        moduleTitle: selected.title,
        instructorName: selected.instructor,
        roomName: selected.room,
        isLive: true,
        startTime: new Date().toISOString(),
        sessionMode: 'interactive_lab',
        activeAttendancePrompt: true,
        pinnedScripture: selected.scripture,
        pinnedHandoutUrl: `/resources/${selected.code}_Guide.pdf`
      });
      setIsCheckedIn(false);
      setCheckInTimestamp(null);
    }
  };

  const activeScripture = DEFAULT_SCRIPTURE_MAP[session.moduleCode] || DEFAULT_SCRIPTURE_MAP['SOM-MOD-6'];

  return (
    <div className={`space-y-6 ${className}`} id="live-classroom-module">
      
      {/* ─── 1. Live Attendance Verification Banner ─── */}
      <section className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#022044] via-[#023264] to-[#041a33] text-white border border-[#025798]/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[#b38f53]/20 border border-[#dfc18b]/40 text-[#dfc18b] shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Live Classroom Session
              </span>
              <span className="text-[10px] font-mono text-sky-200/90 px-2 py-0.5 rounded-full bg-white/10">
                {checkedInCount} Students In Room
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-white">
              {session.title}
            </h1>
            <p className="text-xs text-sky-100/80">
              Lead Lecturer: <strong className="text-white">{session.instructorName}</strong> • Real-Time WebRTC Audio/Video
            </p>
          </div>
        </div>

        {/* Room Switcher & Attendance Action Trigger */}
        <div className="shrink-0 flex items-center gap-3 flex-wrap">
          {/* 6-Module Room Dropdown Selector */}
          <select
            value={session.moduleCode}
            onChange={(e) => handleSelectModuleRoom(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-100 text-xs font-bold cursor-pointer focus:ring-2 focus:ring-[#dfc18b] focus:outline-none"
            title="Switch Live Classroom Module Room"
          >
            {MODULE_ROOMS.map(m => (
              <option key={m.code} value={m.code}>
                {m.code}: {m.title.split(':')[1] || m.title}
              </option>
            ))}
          </select>

          {isCheckedIn ? (
            <div className="px-4 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 flex items-center gap-2 text-xs font-black shadow-md animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Attendance Confirmed ({checkInTimestamp})</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConfirmAttendance}
              className="px-4 py-2.5 rounded-2xl bg-[#b38f53] hover:bg-[#a07c42] text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 border border-[#dfc18b]"
            >
              <UserCheck className="w-4 h-4 text-slate-950" />
              <span>Confirm Presence & Log Attendance</span>
            </button>
          )}
        </div>
      </section>

      {/* ─── 2. Main Studio Canvas (Video Left 8 cols, Companion Right 4 cols) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive WebRTC Video Conference Studio (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <LiveWebRTCStudio
            session={session}
            appUser={appUser}
            isModerator={isTeacherOrAdmin}
            onAttendanceVerified={handleConfirmAttendance}
          />

          {/* Module Syllabus & Pinned Resources Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-extrabold text-slate-900 dark:text-white">Pinned Scripture: </span>
                <span className="font-mono text-slate-600 dark:text-slate-300">{session.pinnedScripture}</span>
              </div>
            </div>

            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('library')}
                className="text-[#025798] dark:text-[#7dd3fc] font-bold hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Open Resource Handouts</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Live Companion Studio (Chat, Notes, Scriptures) (4 cols) */}
        <div className="lg:col-span-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-md min-h-[550px]">
          
          {/* Tab Selection Bar */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'notes'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Live Notes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Q&A / Chat</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                {chatMessages.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('scriptures')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'scriptures'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpenCheck className="w-3.5 h-3.5" />
              <span>Bible</span>
            </button>
          </div>

          {/* Tab 1: Synchronized Live Lecture Notes Pad */}
          {activeTab === 'notes' && (
            <div className="flex-1 p-4 flex flex-col justify-between space-y-3 animate-fadeIn">
              <div className="space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    Candidate Lecture Notes
                  </span>
                  {noteSavedMessage && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-fadeIn">
                      ✓ {noteSavedMessage}
                    </span>
                  )}
                </div>

                <textarea
                  value={liveNoteText}
                  onChange={(e) => setLiveNoteText(e.target.value)}
                  placeholder="Type sermon notes, key prophetic insights, ministerial principles, and key action items here..."
                  className="flex-1 w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none font-sans leading-relaxed min-h-[300px]"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-400">
                  Notes are stored directly in your portal journal.
                </p>
                <button
                  type="button"
                  onClick={handleSaveLiveNotes}
                  disabled={isSavingNote || !liveNoteText.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 shadow-2xs active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingNote ? 'Saving...' : 'Save to Journal'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Live In-Room Chat & Intercessory Prayer Wall */}
          {activeTab === 'chat' && (
            <div className="flex-1 p-4 flex flex-col justify-between space-y-3 animate-fadeIn">
              
              {/* Message List */}
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
                {chatMessages.map(msg => (
                  <div 
                    key={msg.id}
                    className={`p-2.5 rounded-2xl text-xs space-y-1 ${
                      msg.isPrayerRequest
                        ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200'
                        : msg.senderRole === 'teacher' || msg.senderRole === 'admin'
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100'
                        : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>{msg.senderName}</span>
                        {msg.senderRole === 'teacher' && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[9px]">Faculty</span>
                        )}
                        {msg.isPrayerRequest && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-black">Prayer</span>
                        )}
                      </div>
                      <span className="text-slate-400 font-mono">{msg.timestamp}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendChatMessage} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrayerTag(prev => !prev)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                      isPrayerTag 
                        ? 'bg-amber-500 text-slate-950' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Heart className="w-3 h-3 text-rose-500" />
                    <span>Prayer Request</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputChatText}
                    onChange={(e) => setInputChatText(e.target.value)}
                    placeholder={isPrayerTag ? "Type your intercessory prayer request..." : "Ask a question or share comment..."}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <button
                    type="submit"
                    disabled={!inputChatText.trim()}
                    className="p-2 rounded-xl bg-[#023264] hover:bg-[#025798] text-white disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Send className="w-4 h-4 text-[#dfc18b]" />
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* Tab 3: Scripture Companion */}
          {activeTab === 'scriptures' && (
            <div className="flex-1 p-4 space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Key Scripture Passage
                </span>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {activeScripture.ref}
                </h4>
                <blockquote className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed border-l-2 border-amber-400 pl-3">
                  "{activeScripture.text}"
                </blockquote>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-black text-slate-800 dark:text-slate-200">
                  Course Modules Scripture Foundations
                </h5>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(DEFAULT_SCRIPTURE_MAP).map(([mod, item]) => (
                    <div key={mod} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <p className="font-extrabold text-[11px] text-indigo-700 dark:text-indigo-400">{mod}: {item.ref}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
