import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Award, 
  FileText, 
  Trophy, 
  AlertCircle, 
  GraduationCap, 
  Sparkles, 
  Calendar,
  Clock,
  BookOpen,
  Medal,
  Download,
  Video,
  ExternalLink,
  Copy,
  Check,
  Camera,
  Upload,
  User,
  Lock,
  Flame,
  Search,
  Filter,
  MessageSquare,
  Layers,
  Send,
  X,
  TrendingUp,
  ShieldCheck,
  QrCode,
  Zap,
  Key
} from 'lucide-react';
import { downloadICSFile } from '../lib/calendarExport';
import { WeightedGradeBreakdownCard } from '../features/assessments/student/WeightedGradeBreakdownCard';
import { GradingWeights, DEFAULT_GRADING_WEIGHTS } from '../data/gradingWeights';

export type StudentPortalSummary = {
  name: string;
  rate: number;
  attended: number;
  totalDays: number;
  avgScore: number | null;
  attendanceByDay: Record<string, { present: boolean; timestamp?: string; score?: string }>;
  note?: string;
  photoUrl?: string;
  enrollmentStatus?: string;
  isDroppedOut?: boolean;
  dropoutReason?: string;
  dropoutDate?: string;
};

interface StudentAttendancePortalProps {
  student: StudentPortalSummary;
  classDays: { id: string; name: string }[];
  rubricScores: Record<string, { participation: number; scripture: number; assignment: number }>;
  onRequestTranscript: (student: any) => void;
  onRequestCertificate: (student: any) => void;
  onUpdateStudentPhoto?: (studentName: string, photoDataUrl: string) => void;
  atRiskThreshold: number;
  satisfactoryThreshold: number;
}

export const StudentAttendancePortal: React.FC<Partial<StudentAttendancePortalProps>> = ({
  student,
  classDays = [],
  rubricScores = {},
  onRequestTranscript = (_s?: any) => {},
  onRequestCertificate = (_s?: any) => {},
  onUpdateStudentPhoto,
  atRiskThreshold = 75,
  satisfactoryThreshold = 85
}) => {
  const safeName = student?.name || 'Student';
  const studentKey = safeName.toLowerCase().trim();
  const safeRate = student?.rate ?? 0;
  const safeAttended = student?.attended ?? 0;
  const safeTotalDays = student?.totalDays ?? (classDays.length || 1);
  const safeAvgScore = student?.avgScore ?? null;
  const safeAttendanceByDay = student?.attendanceByDay || {};

  const [currentPhoto, setCurrentPhoto] = useState<string>(student?.photoUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter & Search states for attendance log
  const [logFilter, setLogFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [logSearch, setLogSearch] = useState('');

  // Excuse note modal state
  const [excuseModalDay, setExcuseModalDay] = useState<{ id: string; name: string } | null>(null);
  const [excuseReason, setExcuseReason] = useState('Medical / Illness');
  const [excuseComment, setExcuseComment] = useState('');
  const [submittedExcuses, setSubmittedExcuses] = useState<Record<string, { reason: string; comment: string; date: string }>>(() => {
    const saved = localStorage.getItem(`hteim_excuses_${studentKey}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [excuseSubmittedToast, setExcuseSubmittedToast] = useState(false);

  // Tab Segmented Control state
  const [activePortalTab, setActivePortalTab] = useState<'overview' | 'log' | 'modules'>('overview');

  // Quick Classroom PIN Check-in state
  const [pinInput, setPinInput] = useState('');
  const [pinVerifyStatus, setPinVerifyStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [pinFeedbackMessage, setPinFeedbackMessage] = useState('');

  const handleVerifyClassPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    setPinVerifyStatus('verifying');
    setTimeout(() => {
      try {
        const storedSession = localStorage.getItem('hteim_active_pin_session');
        if (!storedSession) {
          setPinVerifyStatus('error');
          setPinFeedbackMessage('No active classroom session found. Please ask the instructor to start the Live PIN & QR Check-in screen.');
          return;
        }

        const session = JSON.parse(storedSession);
        const cleanInput = pinInput.trim();
        const cleanPin = String(session.pin).trim();

        if (cleanInput !== cleanPin) {
          setPinVerifyStatus('error');
          setPinFeedbackMessage('Incorrect PIN. Note that the PIN auto-rotates every 45s—check the classroom projector for the current code.');
          return;
        }

        if (new Date(session.expiresAt) < new Date()) {
          setPinVerifyStatus('error');
          setPinFeedbackMessage('This classroom check-in session has expired. Request a new session from your instructor.');
          return;
        }

        // Record check-in to session check-ins
        const classDayId = session.classDayId || 'day_1';
        const key = `hteim_pin_checkins_${classDayId}`;
        const existingRaw = localStorage.getItem(key);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const updated = [...existing.filter((item: any) => item.studentName !== safeName), {
          studentName: safeName,
          time: nowStr,
          verifiedVia: 'pin_token'
        }];
        localStorage.setItem(key, JSON.stringify(updated));

        // Queue in offline / persistent sync buffer
        try {
          const queueRaw = localStorage.getItem('hteim_offline_queue');
          const queue = queueRaw ? JSON.parse(queueRaw) : [];
          queue.push({
            id: `q_${Date.now()}`,
            type: 'attendance_checkin',
            description: `${safeName} verified attendance for ${session.classDayName || 'Class'} via PIN`,
            timestamp: new Date().toISOString(),
            status: 'pending',
            retryCount: 0,
            payload: { studentName: safeName, classDayId, pin: cleanPin }
          });
          localStorage.setItem('hteim_offline_queue', JSON.stringify(queue));
        } catch {
          // ignore
        }

        setPinVerifyStatus('success');
        setPinFeedbackMessage(`Attendance Verified! Marked present for ${session.classDayName || 'Today\'s Session'} at ${nowStr}.`);
        setPinInput('');
      } catch {
        setPinVerifyStatus('error');
        setPinFeedbackMessage('Failed to verify PIN. Please try again.');
      }
    }, 500);
  };

  useEffect(() => {
    if (student?.photoUrl) {
      setCurrentPhoto(student.photoUrl);
    }
  }, [student?.photoUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 480;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setCurrentPhoto(resizedDataUrl);
          if (onUpdateStudentPhoto) {
            onUpdateStudentPhoto(safeName, resizedDataUrl);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Streak counter calculation
  const streakCount = useMemo(() => {
    let count = 0;
    for (let i = classDays.length - 1; i >= 0; i--) {
      const day = classDays[i];
      const att = safeAttendanceByDay[day.id];
      if (att && att.present) {
        count++;
      } else if (att && !att.present) {
        break;
      }
    }
    return count;
  }, [classDays, safeAttendanceByDay]);

  // Filtered log items
  const filteredClassDays = useMemo(() => {
    return classDays.filter(day => {
      const att = safeAttendanceByDay[day.id];
      const isPresent = !!att?.present;

      if (logFilter === 'present' && !isPresent) return false;
      if (logFilter === 'absent' && isPresent) return false;

      if (logSearch.trim()) {
        const query = logSearch.toLowerCase().trim();
        return (day.name || '').toLowerCase().includes(query);
      }
      return true;
    });
  }, [classDays, safeAttendanceByDay, logFilter, logSearch]);

  // Module Breakdown computation
  const moduleBreakdown = useMemo(() => {
    const modules = [
      { code: 'M1', name: 'Module 1: Introduction' },
      { code: 'M2', name: 'Module 2: Evangelism' },
      { code: 'M3', name: 'Module 3: Ministerial Ethics' },
      { code: 'M4', name: 'Module 4: Apostolic Ministry' },
      { code: 'M5', name: 'Module 5: Prophetic Ministry' },
      { code: 'M6', name: 'Module 6: Pastors & Teachers' }
    ];

    const totalDays = classDays.length || 1;
    const daysPerMod = Math.max(1, Math.ceil(totalDays / 6));

    return modules.map((m, idx) => {
      const start = idx * daysPerMod;
      const modDays = classDays.slice(start, start + daysPerMod);
      
      let attended = 0;
      modDays.forEach(d => {
        if (safeAttendanceByDay[d.id]?.present) {
          attended++;
        }
      });

      const total = modDays.length;
      const rate = total > 0 ? Math.round((attended / total) * 100) : 100;

      return {
        ...m,
        total,
        attended,
        rate
      };
    });
  }, [classDays, safeAttendanceByDay]);

  const handleAddZoomToCalendar = () => {
    downloadICSFile([{
      id: 'hteim-zoom-class',
      title: 'HTEIM School of Ministry Tuesday Live Zoom',
      description: 'Weekly Live Lecture via Zoom. Meeting ID: 815 0537 7396 Passcode: 163738',
      location: 'Zoom Online',
      date: new Date().toISOString().split('T')[0],
      startTime: '07:00 pm',
      endTime: '09:00 pm'
    }], 'HTEIM_Tuesday_Live_Zoom.ics');
  };

  const handleSubmitExcuse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!excuseModalDay) return;

    const updated = {
      ...submittedExcuses,
      [excuseModalDay.id]: {
        reason: excuseReason,
        comment: excuseComment,
        date: new Date().toLocaleDateString()
      }
    };

    setSubmittedExcuses(updated);
    localStorage.setItem(`hteim_excuses_${studentKey}`, JSON.stringify(updated));
    setExcuseModalDay(null);
    setExcuseComment('');
    setExcuseSubmittedToast(true);
    setTimeout(() => setExcuseSubmittedToast(false), 3000);
  };

  return (
    <div className="material-screen min-w-0 p-2.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 pb-28 sm:pb-24 md:pb-12 animate-fadeIn">
      
      {/* Toast Notification */}
      {excuseSubmittedToast && (
        <div className="p-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-between gap-2 animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>Absence excuse submitted successfully to HTEIM Faculty!</span>
          </div>
          <button onClick={() => setExcuseSubmittedToast(false)} className="hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Segmented Navigation Tab Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-xs flex items-center gap-1 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActivePortalTab('overview')}
          className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap touch-min-44 ${
            activePortalTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Overview & Live Zoom</span>
        </button>

        <button
          onClick={() => setActivePortalTab('log')}
          className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap touch-min-44 ${
            activePortalTab === 'log'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Attendance Session Log ({classDays.length})</span>
        </button>

        <button
          onClick={() => setActivePortalTab('modules')}
          className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap touch-min-44 ${
            activePortalTab === 'modules'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Module Breakdown (6)</span>
        </button>
      </div>

      {/* Overview Tab Content */}
      {activePortalTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn">
          {/* Weekly Tuesday Live Zoom Class Notice Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-700 interactive-hover-card shadow-xs">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 flex-shrink-0">
                  <Video className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-semibold uppercase rounded-full">
                      Weekly Live Schedule
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 live-indicator-ring shrink-0" />
                      Every Tuesday @ 7:00 PM EST
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Classes Go Live via Zoom Every Tuesday (Unless Notified Otherwise)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Official School of Ministry live lectures take place every Tuesday evening at 7:00 PM EST. Check announcements for any schedule updates.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-700">
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs font-mono">
                  <div>
                    <p className="text-[9px] uppercase font-semibold text-slate-400">Meeting ID</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">815 0537 7396</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText('815 0537 7396', 'meetingId')}
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer touch-min-44"
                    title="Copy Meeting ID"
                    aria-label="Copy Zoom Meeting ID"
                  >
                    {copiedField === 'meetingId' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs font-mono">
                  <div>
                    <p className="text-[9px] uppercase font-semibold text-slate-400">Passcode</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">163738</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText('163738', 'passcode')}
                    className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer touch-min-44"
                    title="Copy Passcode"
                    aria-label="Copy Zoom Passcode"
                  >
                    {copiedField === 'passcode' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleAddZoomToCalendar}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                    title="Download .ics event to sync to Google Calendar / iCal"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Add to Calendar</span>
                  </button>

                  <a
                    href="https://us02web.zoom.us/j/81505377396"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#023264] hover:bg-[#025798] text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer min-h-[44px]"
                  >
                    <span>Join Tuesday Live Zoom</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Live Classroom Quick PIN Check-in Card */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900/10 via-slate-900/5 to-amber-900/10 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-amber-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/60 shadow-xs space-y-3 glass-morphism interactive-hover-card">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
                      Live Classroom Check-In
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Auto-Rotating 45s PIN
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Enter Today's 4-Digit Classroom Code
                  </h3>
                </div>
              </div>

              {/* Form Input */}
              <form onSubmit={handleVerifyClassPin} className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 7482"
                  className="w-28 sm:w-32 px-3 py-2 text-center text-base sm:text-lg font-black font-mono tracking-widest bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white shadow-xs"
                />
                <button
                  type="submit"
                  disabled={pinInput.length < 4 || pinVerifyStatus === 'verifying'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 min-h-[40px]"
                >
                  {pinVerifyStatus === 'verifying' ? (
                    <span>Verifying...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Check In</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Feedback alert */}
            {pinFeedbackMessage && (
              <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 animate-fadeIn ${
                pinVerifyStatus === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              }`}>
                {pinVerifyStatus === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span>{pinFeedbackMessage}</span>
              </div>
            )}
          </div>

          {/* Student Welcome & Status Hero Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 relative">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0 group cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-2xl flex items-center justify-center uppercase"
                  title="Click to upload profile photo"
                >
                  {currentPhoto ? (
                    <img 
                      src={currentPhoto} 
                      alt={safeName} 
                      className="w-full h-full object-cover transition-transform group-hover:bg-slate-100 dark:hover:bg-slate-700" 
                    />
                  ) : (
                    <span>{safeName.charAt(0)}{safeName.split(' ')[1] ? safeName.split(' ')[1].charAt(0) : ''}</span>
                  )}

                  {/* Upload overlay on hover */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1">
                    <Camera className="w-5 h-5" />
                    <span className="text-[8px] font-semibold uppercase tracking-wider mt-0.5">Upload</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white break-words">{safeName}</h2>
                    {student?.isDroppedOut || student?.enrollmentStatus === 'dropped_out' || student?.enrollmentStatus === 'withdrawn' ? (
                      <span className="px-3 py-0.5 text-xs font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 rounded-full flex items-center gap-1">
                        🔴 {student?.enrollmentStatus === 'withdrawn' ? 'Withdrawn' : 'Dropped Out'}
                      </span>
                    ) : (
                      <span className="px-3 py-0.5 text-xs font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Student Portal
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer min-h-[36px]"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{currentPhoto ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>
                  </div>
                  {(student?.isDroppedOut || student?.enrollmentStatus === 'dropped_out' || student?.enrollmentStatus === 'withdrawn') && (
                    <div className="mt-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-900 dark:text-rose-200">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Status Note: {student.dropoutReason ? `Reason: ${student.dropoutReason}` : 'Student has dropped out/withdrawn from active sessions.'} {student.dropoutDate ? `(Date: ${student.dropoutDate})` : ''}</span>
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap font-medium">
                    <span>HTEIM Ministry Candidate</span>
                    <span>•</span>
                    <span className="font-mono">ID: HTEIM-2026-{Math.abs(safeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)).toString().substring(0, 4)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Graduation Readiness Visual Bar */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" /> Graduation Requirement Attendance Threshold (75%)
                </span>
                <span className="font-mono">{Math.round(safeRate)}% Current</span>
              </div>

              <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-600">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    safeRate >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, safeRate)}%` }}
                />
                {/* Target Marker at 75% */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400"
                  style={{ left: '75%' }}
                  title="75% Graduation Target"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>0%</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">★ 75% Minimum Required</span>
                <span>100% Perfect</span>
              </div>
            </div>

            {/* 4 Summary Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Attendance Rate</p>
                <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{Math.round(safeRate)}%</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{safeAttended} of {safeTotalDays} sessions attended</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Streak</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{streakCount}</span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-0.5">
                    <Flame className="w-4 h-4" /> Sessions
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Consecutive classes present</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Academic Standing</p>
                <div className="mt-1">
                  {safeRate >= 100 ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 text-sm">
                      <Trophy className="w-4 h-4" /> Perfect Standing
                    </span>
                  ) : safeRate >= 75 ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Good Standing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 text-sm">
                      <AlertCircle className="w-4 h-4" /> Attendance Advisory
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Required for graduation: ≥ 75%</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Absences Recorded</p>
                <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">{Math.max(0, safeTotalDays - safeAttended)}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Missed Sessions</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Module Breakdown Tab Content */}
      {activePortalTab === 'modules' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Module Attendance Progress Breakdown</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Track your attendance rate across all 6 core curriculum modules.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {moduleBreakdown.map((mod) => (
              <div key={mod.code} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded text-[9px] font-mono font-bold">
                    {mod.code}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    {mod.attended}/{mod.total}
                  </span>
                </div>

                <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{mod.name}</h4>

                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${mod.rate >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${mod.rate}%` }}
                  />
                </div>

                <p className="text-[10px] font-bold text-slate-500 font-mono text-right">{mod.rate}%</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Class Attendance History Log Tab Content */}
      {activePortalTab === 'log' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-6 shadow-2xs space-y-4 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>My Class Attendance Log</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified record of your class attendance presence recorded by ministry instructors.
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter session..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full sm:w-40 pl-8 pr-3 py-2 min-h-11 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
              <button
                onClick={() => setLogFilter('all')}
                className={`flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center touch-min-44 ${logFilter === 'all' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                All
              </button>
              <button
                onClick={() => setLogFilter('present')}
                className={`flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center touch-min-44 ${logFilter === 'present' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Present
              </button>
              <button
                onClick={() => setLogFilter('absent')}
                className={`flex-1 sm:flex-none min-h-[44px] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center touch-min-44 ${logFilter === 'absent' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Absent
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View (< md) */}
        <div className="md:hidden space-y-2.5">
          {filteredClassDays.map((day, dIdx) => {
            const att = safeAttendanceByDay[day.id];
            const isPresent = !!att?.present;
            const excuse = submittedExcuses[day.id];

            return (
              <div 
                key={`std-mob-day-${day.id || 'd'}-${dIdx}`} 
                className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3 space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      isPresent ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                    }`}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{day.name}</p>
                      {att?.timestamp ? (
                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" /> {att.timestamp}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">No timestamp</p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isPresent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500 text-white shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Present
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" /> Absent
                      </span>
                    )}
                  </div>
                </div>

                {!isPresent && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-[11px]">
                    {excuse ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Excuse Note: {excuse.reason}
                      </span>
                    ) : (
                      <button
                        onClick={() => setExcuseModalDay(day)}
                        className="min-h-11 text-left text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" /> Submit Absence Reason
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse" aria-label="Student Attendance History Log">
            <caption className="sr-only">Student Attendance Session History Log showing session name, attendance status, date, and excuse note submissions</caption>
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                <th scope="col" className="p-3.5 rounded-l-xl">Class Day / Session</th>
                <th scope="col" className="p-3.5">Attendance Status</th>
                <th scope="col" className="p-3.5">Attendance Date / Time</th>
                <th scope="col" className="p-3.5 rounded-r-xl text-right">Faculty Actions / Excuse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredClassDays.map((day, dIdx) => {
                const att = safeAttendanceByDay[day.id];
                const isPresent = !!att?.present;
                const excuse = submittedExcuses[day.id];

                return (
                  <tr key={`std-row-day-${day.id || 'd'}-${dIdx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                      <span>{day.name}</span>
                    </td>
                    <td className="p-3.5">
                      {isPresent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                          <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Absent
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {att?.timestamp ? (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> {att.timestamp}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      {!isPresent && (
                        excuse ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px] flex items-center justify-end gap-1">
                            <MessageSquare className="w-3.5 h-3.5" /> {excuse.reason}
                          </span>
                        ) : (
                          <button
                            onClick={() => setExcuseModalDay(day)}
                            className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-lg text-[11px] font-extrabold border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
                          >
                            Submit Reason
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Advisory & Faculty Comment Box */}
      {student?.note && (
        <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl space-y-1">
          <p className="text-xs font-black uppercase text-amber-900 dark:text-amber-400 tracking-wider">Faculty Advisory Note for You:</p>
          <p className="text-xs text-amber-950 dark:text-amber-200 font-medium leading-relaxed italic">"{student.note}"</p>
        </div>
      )}

      {/* Submit Excuse Reason Modal */}
      {excuseModalDay && (
        <div className="modal-material-scrim fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="modal-material-dialog bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>Submit Excuse for {excuseModalDay.name}</span>
              </h3>
              <button onClick={() => setExcuseModalDay(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitExcuse} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reason Category</label>
                <select
                  value={excuseReason ?? ''}
                  onChange={(e) => setExcuseReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                >
                  <option value="Medical / Illness">Medical / Illness</option>
                  <option value="Ministry Service / Mission Trip">Ministry Service / Mission Trip</option>
                  <option value="Work Conflict">Work Conflict</option>
                  <option value="Family Emergency">Family Emergency</option>
                  <option value="Travel / Bereavement">Travel / Bereavement</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Explanation Note</label>
                <textarea
                  rows={3}
                  value={excuseComment ?? ''}
                  onChange={(e) => setExcuseComment(e.target.value)}
                  placeholder="Provide brief details for faculty records..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExcuseModalDay(null)}
                  className="min-h-11 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-11 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit to Faculty</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
