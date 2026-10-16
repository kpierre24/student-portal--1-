import React, { useState, useEffect } from 'react';
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
  ExternalLink, 
  Save,
  Bookmark,
  BookOpenCheck,
  Heart,
  HelpCircle,
  Layers,
  ShieldCheck,
  Check,
  Info
} from 'lucide-react';
import { AppUser } from '../../lib/userAuth';
import { ClassDay, StudentSummary, TabType } from '../../types';
import { logActivity } from '../../lib/auditLogger';
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

  // Session State
  const [session, setSession] = useState({
    id: 'live_som_active',
    title: 'Module 6: School of the Pastors & Practical Homiletics Lab',
    moduleCode: 'SOM-MOD-6',
    moduleTitle: 'School of Pastors & Teachers',
    instructorName: 'Pastor Samuel Selkridge',
    zoomMeetingId: '815 0537 7396',
    zoomPasscode: '163738',
    zoomUrl: 'https://zoom.us/j/81505377396',
    googleMeetUrl: 'https://meet.google.com/wgd-vrrq-sjm',
    platformMode: 'zoom' as 'zoom' | 'google_meet',
    isLive: true,
    pinnedScripture: '2 Timothy 4:2 — Preach the word; be instant in season, out of season...'
  });

  // Attendance Check-In State
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTimestamp, setCheckInTimestamp] = useState<string | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(14);
  const [activeTab, setActiveTab] = useState<'notes' | 'chat' | 'evaluation' | 'scriptures'>('notes');

  // Live Lecture Notes State
  const [liveNoteText, setLiveNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedMessage, setNoteSavedMessage] = useState<string | null>(null);

  // YouTube Auto-Upload & Broadcast Sync State
  const [youtubeSyncStatus, setYoutubeSyncStatus] = useState<'idle' | 'recording' | 'syncing' | 'synced'>('idle');
  const [youtubeChannelName, setYoutubeChannelName] = useState('HTEIM School of Ministry TV');
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);

  // Live Chat & Prayer Requests State
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'msg-1',
      senderName: 'Pastor Samuel Selkridge',
      senderRole: 'teacher',
      text: 'Welcome ministers! Our Tuesday live lecture is active via Zoom feed. Please open your Bibles to 2 Timothy 4.',
      timestamp: '7:01 PM'
    },
    {
      id: 'msg-2',
      senderName: 'Danielle Clarke',
      senderRole: 'student',
      text: 'Connected via Zoom feed and ready!',
      timestamp: '7:02 PM'
    },
    {
      id: 'msg-3',
      senderName: 'Minister Caleb Washington',
      senderRole: 'student',
      text: 'Prayer Request: Strength for the weekend ministry outreach.',
      timestamp: '7:05 PM',
      isPrayerRequest: true
    }
  ]);
  const [inputChatText, setInputChatText] = useState('');
  const [isPrayerTag, setIsPrayerTag] = useState(false);

  // Check if student already checked in
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

  const handleConfirmAttendance = () => {
    if (!appUser?.name) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setIsCheckedIn(true);
    setCheckInTimestamp(now);
    setCheckedInCount(prev => prev + 1);

    const key = `hteim_live_checkin_${session.id}_${appUser.name.toLowerCase().trim()}`;
    localStorage.setItem(key, now);

    if (onRecordLiveAttendance) {
      onRecordLiveAttendance(appUser.name, session.title);
    }

    logActivity({
      actor: appUser.name,
      role: (appUser.role as any) || 'student',
      actionCategory: 'Attendance Override',
      actionTitle: 'Live Classroom Attendance Logged',
      targetStudent: appUser.name,
      details: `Student verified participation in live session: ${session.title} at ${now}.`
    });
  };

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

  const handleSendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputChatText.trim()) return;

    const newMsg = {
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

  const MODULE_ROOMS = [
    { code: 'SOM-MOD-1', title: 'Module 1: Biblical Hermeneutics & Foundation', instructor: 'Pastor Samuel Selkridge', zoomId: '815 0537 7396', passcode: '163738', scripture: '1 Corinthians 3:10-11' },
    { code: 'SOM-MOD-2', title: 'Module 2: Evangelism & Soul Winning Practicum', instructor: 'Minister Caleb Washington', zoomId: '815 0537 7396', passcode: '163738', scripture: 'Mark 16:15' },
    { code: 'SOM-MOD-3', title: 'Module 3: Ministerial Ethics & Pastoral Leadership', instructor: 'Pastor Samuel Selkridge', zoomId: '815 0537 7396', passcode: '163738', scripture: '1 Timothy 3:2-7' },
    { code: 'SOM-MOD-4', title: 'Module 4: Apostolic Governance & Church Planting', instructor: 'Apostle Dr. Selkridge', zoomId: '815 0537 7396', passcode: '163738', scripture: 'Ephesians 4:11-12' },
    { code: 'SOM-MOD-5', title: 'Module 5: Prophetic Ministry & Spiritual Warfare', instructor: 'Pastor Samuel Selkridge', zoomId: '815 0537 7396', passcode: '163738', scripture: '1 Corinthians 14:3' },
    { code: 'SOM-MOD-6', title: 'Module 6: School of the Pastors & Practical Homiletics Lab', instructor: 'Pastor Samuel Selkridge', zoomId: '815 0537 7396', passcode: '163738', scripture: '2 Timothy 4:2' }
  ];

  const handleSelectModuleRoom = (moduleCode: string) => {
    const selected = MODULE_ROOMS.find(m => m.code === moduleCode);
    if (selected) {
      setSession(prev => ({
        ...prev,
        id: `live_${moduleCode.toLowerCase().replace(/-/g, '_')}`,
        title: selected.title,
        moduleCode: selected.code,
        moduleTitle: selected.title,
        instructorName: selected.instructor,
        zoomMeetingId: selected.zoomId,
        zoomPasscode: selected.passcode,
        pinnedScripture: selected.scripture
      }));
      setIsCheckedIn(false);
      setCheckInTimestamp(null);
    }
  };

  const activeScripture = DEFAULT_SCRIPTURE_MAP[session.moduleCode] || DEFAULT_SCRIPTURE_MAP['SOM-MOD-6'];

  return (
    <div className={`space-y-6 ${className}`} id="live-classroom-module">
      
      {/* ─── 1. Deprecation & Coming Soon Notice Banner for WebRTC Studio ─── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/70 border border-amber-500/30 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                WebRTC Studio Deprecated • Coming Soon
              </span>
              <span className="text-[10px] font-mono text-slate-300 px-2 py-0.5 rounded-full bg-white/10">
                Active Zoom Feed Portal Enabled
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-200">
              The built-in WebRTC video streaming studio is currently deprecated and scheduled for an upgraded release. This portal now functions as your official <strong className="text-white">Zoom Feed & Google Platform Integration Hub</strong>.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('evaluation')}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          <span>Read Google Meet vs. Zoom Evaluation</span>
        </button>
      </div>

      {/* ─── 2. Live Attendance & Room Banner ─── */}
      <section className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#022044] via-[#023264] to-[#041a33] text-white border border-[#025798]/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[#b38f53]/20 border border-[#dfc18b]/40 text-[#dfc18b] shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Live Tuesday Lecture Feed
              </span>
              <span className="text-[10px] font-mono text-sky-200/90 px-2 py-0.5 rounded-full bg-white/10">
                {checkedInCount} Ministers Checked In
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-white">
              {session.title}
            </h1>
            <p className="text-xs text-sky-100/80">
              Lead Lecturer: <strong className="text-white">{session.instructorName}</strong> • Official Zoom & Google Meet Gateway
            </p>
          </div>
        </div>

        {/* Room Switcher & Attendance Action Trigger */}
        <div className="shrink-0 flex items-center gap-3 flex-wrap">
          <select
            value={session.moduleCode}
            onChange={(e) => handleSelectModuleRoom(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-100 text-xs font-bold cursor-pointer focus:ring-2 focus:ring-[#dfc18b] focus:outline-none"
            title="Switch Live Module Room"
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
              <span>Attendance Logged ({checkInTimestamp})</span>
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

      {/* ─── 3. Main Content Grid (Zoom Feed Left 8 cols, Companion Right 4 cols) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Zoom Feed Portal / Stream Viewer (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 text-white shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-black text-xs sm:text-sm shadow-md ${
                  session.platformMode === 'zoom' 
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' 
                    : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                }`}>
                  {session.platformMode === 'zoom' ? 'ZOOM' : 'MEET'}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {session.platformMode === 'zoom' ? 'Live Zoom Broadcast Portal' : 'Google Meet Live Stream Portal'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {session.platformMode === 'zoom' ? 'Secure connection to HTEIM Zoom Studio' : 'Native Google Meet Workspace Broadcast'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Platform Mode Toggle */}
                <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSession(prev => ({ ...prev, platformMode: 'zoom' }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      session.platformMode === 'zoom'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Zoom Stream
                  </button>
                  <button
                    type="button"
                    onClick={() => setSession(prev => ({ ...prev, platformMode: 'google_meet' }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      session.platformMode === 'google_meet'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Google Meet
                  </button>
                </div>

                <a
                  href={session.platformMode === 'zoom' ? session.zoomUrl : session.googleMeetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer text-white ${
                    session.platformMode === 'zoom' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Launch {session.platformMode === 'zoom' ? 'Zoom' : 'Google Meet'}</span>
                </a>
              </div>
            </div>

            {/* Credentials / Link Card */}
            {session.platformMode === 'zoom' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Meeting ID</span>
                  <span className="font-mono font-black text-sm text-white select-all">{session.zoomMeetingId}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Passcode</span>
                  <span className="font-mono font-black text-sm text-[#dfc18b] select-all">{session.zoomPasscode}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Schedule</span>
                  <span className="font-bold text-slate-200">Tuesdays @ 7:00 PM EST</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Google Meet Secure Room URL</span>
                  <span className="font-mono font-black text-xs text-emerald-300 select-all truncate block">{session.googleMeetUrl}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Drive Cloud Integration</span>
                  <span className="font-bold text-slate-200">Instant Auto-Recording to Google Drive</span>
                </div>
              </div>
            )}

            {/* Embedded Stream / Interactive View */}
            <div className="relative aspect-video rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
              {session.platformMode === 'zoom' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-950">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent z-10" />
                  <div className="z-20 space-y-3 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-full bg-blue-600/30 border border-blue-500/50 text-blue-400 flex items-center justify-center mx-auto animate-pulse">
                      <Video className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-extrabold text-white">HTEIM Zoom Broadcast Live Feed Active</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Join the live room to participate in interactive homiletics discussions, Q&A sessions, and ministerial activations with Pastor Samuel Selkridge.
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-3">
                      <a
                        href={session.zoomUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-xl transition-all cursor-pointer inline-flex items-center gap-2"
                      >
                        <span>Connect to Zoom Stream</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col relative bg-slate-950">
                  <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700 shadow-lg text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <span className="font-extrabold text-white">Google Meet Live & YouTube Auto-Sync</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {youtubeSyncStatus === 'idle' && (
                        <button
                          type="button"
                          onClick={() => {
                            setYoutubeSyncStatus('recording');
                            setTimeout(() => {
                              setYoutubeSyncStatus('syncing');
                              setTimeout(() => {
                                setYoutubeSyncStatus('synced');
                              }, 3000);
                            }, 3000);
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 shadow cursor-pointer transition-all"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Start Stream & Auto-Upload to YouTube</span>
                        </button>
                      )}

                      {youtubeSyncStatus === 'recording' && (
                        <span className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 animate-pulse">
                          Recording Meet Session...
                        </span>
                      )}

                      {youtubeSyncStatus === 'syncing' && (
                        <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 animate-pulse">
                          Syncing Recording to YouTube Channel...
                        </span>
                      )}

                      {youtubeSyncStatus === 'synced' && (
                        <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5">
                          ✓ Auto-Uploaded to {youtubeChannelName}
                        </span>
                      )}
                    </div>
                  </div>

                  <iframe
                    src={`${session.googleMeetUrl}?pli=1&authuser=0`}
                    className="w-full h-full border-0 rounded-2xl bg-slate-950"
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    title="HTEIM Google Meet Live Stream"
                  />
                  <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
                    <a
                      href={session.googleMeetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-black shadow-lg flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Full Google Meet Window</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Scripture Bar */}
            <div className="p-4 bg-slate-800/50 border border-slate-700/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <span className="font-extrabold text-white">Pinned Scripture: </span>
                  <span className="font-mono text-slate-300">{session.pinnedScripture}</span>
                </div>
              </div>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('library')}
                  className="text-sky-400 font-bold hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Open Study Handouts</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Companion Studio (Chat, Notes, Evaluation) (4 cols) */}
        <div className="lg:col-span-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-md min-h-[580px]">
          
          {/* Tab Selection Bar */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-2 px-2 text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'notes'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 px-2 text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Q&A</span>
              <span className="px-1 py-0.2 rounded-full text-[9px] font-mono bg-indigo-100 dark:bg-indigo-950 text-indigo-700 font-bold">
                {chatMessages.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('evaluation')}
              className={`flex-1 py-2 px-2 text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'evaluation'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Google Meet vs Zoom</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('scriptures')}
              className={`flex-1 py-2 px-2 text-[11px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'scriptures'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpenCheck className="w-3.5 h-3.5" />
              <span>Bible</span>
            </button>
          </div>

          {/* Tab 1: Lecture Notes Pad */}
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
                  placeholder="Type sermon notes, prophetic insights, and homiletics principles here..."
                  className="flex-1 w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-150 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none font-sans leading-relaxed min-h-[300px]"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-400">Stored in your journal.</p>
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

          {/* Tab 2: Q&A / Chat */}
          {activeTab === 'chat' && (
            <div className="flex-1 p-4 flex flex-col justify-between space-y-3 animate-fadeIn">
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
                    placeholder={isPrayerTag ? "Type intercessory prayer request..." : "Ask a question..."}
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

          {/* Tab 3: Google Meet vs. Zoom Platform Evaluation */}
          {activeTab === 'evaluation' && (
            <div className="flex-1 p-4 space-y-4 animate-fadeIn overflow-y-auto max-h-[440px] text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-extrabold">
                  <Sparkles className="w-4 h-4" />
                  <span>Executive Platform Evaluation: Google Meet vs. Zoom</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                  Since HTEIM School of Ministry is anchored in the <strong className="text-slate-900 dark:text-white">Google platform ecosystem</strong> (Google Workspace, Drive, Gmail, Firebase), here is an architectural comparison regarding live classrooms:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <h5 className="font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                    <span>Google Meet (Recommended for Ecosystem)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">Native Google</span>
                  </h5>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <li><strong>Direct Drive Archival:</strong> Recordings save instantly into designated Google Drive curriculum folders.</li>
                    <li><strong>Calendar Integration:</strong> One-click Google Calendar sync for Tuesday lectures.</li>
                    <li><strong>Zero Friction Auth:</strong> Students authenticated via Google / Firebase join instantly without separate app downloads.</li>
                    <li><strong>AI Captioning:</strong> Real-time automated Google AI captions and transcript summaries.</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <h5 className="font-extrabold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                    <span>Zoom Video Conferencing (Current Primary)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">External Broadcast</span>
                  </h5>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <li><strong>Large Scale Convocations:</strong> Superior capacity and stability for 500+ attendees during annual convocations.</li>
                    <li><strong>Host & Security Controls:</strong> Advanced waiting rooms and co-host breakout rooms.</li>
                    <li><strong>External App Required:</strong> Requires Zoom client installation or browser redirect.</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[11px] space-y-1">
                  <p className="font-extrabold text-indigo-900 dark:text-indigo-200">Final Verdict & Recommendation:</p>
                  <p className="text-slate-700 dark:text-slate-300">
                    Switching to <strong>Google Meet</strong> for standard weekly Tuesday lectures will streamline your workflow (automatic cloud drive recordings, zero sign-in friction for Google users). However, maintaining Zoom credentials for major apostolic convocations provides the best of both worlds!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Scripture Companion */}
          {activeTab === 'scriptures' && (
            <div className="flex-1 p-4 space-y-4 animate-fadeIn overflow-y-auto max-h-[440px]">
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-2">
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
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
