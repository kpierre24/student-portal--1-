import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  QrCode, 
  Lock, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw, 
  Copy, 
  Sparkles, 
  Users, 
  Volume2, 
  VolumeX, 
  Share2, 
  Zap, 
  AlertCircle 
} from 'lucide-react';
import { PINCheckinSession } from '../types';

interface PINCheckinQRModalProps {
  classDayName: string;
  classDayId?: string;
  onClose: () => void;
  onSessionCreated?: (session: PINCheckinSession) => void;
  onStudentCheckedIn?: (studentName: string, classDayId: string) => void;
}

export const PINCheckinQRModal: React.FC<PINCheckinQRModalProps> = ({
  classDayName,
  classDayId = 'day_1',
  onClose,
  onSessionCreated,
  onStudentCheckedIn
}) => {
  const [pinCode, setPinCode] = useState<string>('');
  const [rotationCycleSeconds, setRotationCycleSeconds] = useState<number>(45);
  const [cycleTimeLeft, setCycleTimeLeft] = useState<number>(45);
  const [sessionExpirationMinutes, setSessionExpirationMinutes] = useState<number>(30);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(30 * 60);
  const [geoEnabled, setGeoEnabled] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [chimeEnabled, setChimeEnabled] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState<{ studentName: string; time: string }[]>([]);

  // Generate 4-digit PIN code and publish to storage
  const generateNewPIN = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setPinCode(code);
    setCycleTimeLeft(rotationCycleSeconds);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + sessionExpirationMinutes * 60000).toISOString();
    
    const newSession: PINCheckinSession = {
      id: `pin_sess_${Date.now()}`,
      classDayId,
      pin: code,
      active: true,
      expiresAt,
      checkedInStudents: recentCheckIns.map(c => c.studentName)
    };

    try {
      localStorage.setItem('hteim_active_pin_session', JSON.stringify({
        ...newSession,
        classDayName,
        rotatedAt: new Date().toISOString(),
        rotationSeconds: rotationCycleSeconds
      }));
    } catch {
      // Ignore storage error
    }

    if (onSessionCreated) {
      onSessionCreated(newSession);
    }
  };

  // Initial load
  useEffect(() => {
    generateNewPIN();
    setSessionTimeLeft(sessionExpirationMinutes * 60);
  }, [classDayId]);

  // Session countdown timer
  useEffect(() => {
    if (sessionTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setSessionTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionTimeLeft]);

  // Rolling PIN rotation timer
  useEffect(() => {
    if (!autoRotate || sessionTimeLeft <= 0) return;

    const interval = setInterval(() => {
      setCycleTimeLeft(prev => {
        if (prev <= 1) {
          generateNewPIN();
          return rotationCycleSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRotate, rotationCycleSeconds, sessionTimeLeft, classDayId]);

  // Listen for student check-ins
  useEffect(() => {
    const pollInterval = setInterval(() => {
      try {
        const storedCheckins = localStorage.getItem(`hteim_pin_checkins_${classDayId}`);
        if (storedCheckins) {
          const list = JSON.parse(storedCheckins);
          if (Array.isArray(list) && list.length > recentCheckIns.length) {
            setRecentCheckIns(list);
            if (chimeEnabled) {
              playChime();
            }
          }
        }
      } catch {
        // ignore
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [classDayId, recentCheckIns.length, chimeEnabled]);

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  const handleCopyPIN = () => {
    navigator.clipboard.writeText(pinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyDirectLink = () => {
    const origin = window.location.origin;
    const link = `${origin}?action=checkin&day=${encodeURIComponent(classDayId)}&pin=${pinCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const sessionMins = Math.floor(sessionTimeLeft / 60);
  const sessionSecs = sessionTimeLeft % 60;
  const cyclePercent = ((rotationCycleSeconds - cycleTimeLeft) / rotationCycleSeconds) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-center relative overflow-hidden my-auto">
        {/* Top Header */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          ✕
        </button>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="px-3 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 font-extrabold text-[10px] rounded-full uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              Dynamic Rolling Attendance Token
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-syne pt-1">
            {classDayName} Live Verification
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Project this screen in class. The PIN automatically rotates to prevent unverified check-ins.
          </p>
        </div>

        {/* Big Rotating PIN Box */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl border border-indigo-500/40 space-y-3 relative shadow-xl overflow-hidden animate-radiant-glow">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 live-indicator-ring mr-0.5" />
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Active Dynamic PIN
            </span>
            <span className="text-amber-300 flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5" />
              Session ends in: {sessionMins}:{sessionSecs.toString().padStart(2, '0')}
            </span>
          </div>

          <div className="text-5xl sm:text-6xl font-black font-mono tracking-widest text-amber-400 flex items-center justify-center gap-3 py-1">
            <AnimatePresence mode="wait">
              <motion.span
                key={pinCode}
                initial={{ opacity: 0, scale: 0.88, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.12, filter: 'blur(4px)' }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {pinCode || '----'}
              </motion.span>
            </AnimatePresence>
            <button
              onClick={handleCopyPIN}
              title="Copy PIN Code"
              className="p-2 rounded-lg bg-indigo-800/50 hover:bg-indigo-700/60 text-slate-200 hover:text-white transition-all cursor-pointer active:scale-95"
            >
              {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          {/* Rolling Cycle Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold">
              <span>Next PIN Rotation:</span>
              <span className="text-emerald-400">{cycleTimeLeft}s remaining</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-indigo-400 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${100 - cyclePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* QR Code & Direct Scan Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 items-center">
          <div className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="w-28 h-28 p-1 bg-white rounded-lg flex items-center justify-center">
              {/* Dynamic SVG QR visual pattern */}
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-950 fill-current">
                <rect x="0" y="0" width="100" height="100" fill="white" />
                <path d="M10 10h28v28H10zM14 14v20h20V14zm4 4h12v12H18zM62 10h28v28H62zM66 14v20h20V14zm4 4h12v12H70zM10 62h28v28H10zM14 66v20h20V66zm4 4h12v12H18zM44 10h12v12H44zM44 26h12v12H44zM44 42h12v12H44zM10 44h12v12H10zM26 44h12v12H26zM62 44h12v12H62zM78 44h12v12H78zM44 62h12v12H44zM62 62h12v12H62zM78 62h12v12H78zM44 78h12v12H44zM62 78h12v12H62zM78 78h12v12H78z" />
                <circle cx="50" cy="50" r="6" fill="#4f46e5" />
              </svg>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
              Token: {pinCode}-{classDayId.slice(0, 4)}
            </span>
          </div>

          <div className="text-left space-y-2 text-xs">
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Quick Student Instructions
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              1. Open Portal &gt; Attendance tab.<br />
              2. Click <b>Enter Class PIN</b> or scan the QR.<br />
              3. Status is recorded and verified in real-time.
            </p>
            <button
              onClick={handleCopyDirectLink}
              className="w-full py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
            >
              {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              {copiedLink ? 'Link Copied!' : 'Copy Direct Student Link'}
            </button>
          </div>
        </div>

        {/* Live Checked-In Feed */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-500" />
              Live Check-Ins This Session ({recentCheckIns.length})
            </span>
            <button
              onClick={() => setChimeEnabled(!chimeEnabled)}
              className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {chimeEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-500" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              {chimeEnabled ? 'Chime ON' : 'Chime Muted'}
            </button>
          </div>

          {recentCheckIns.length === 0 ? (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic py-1 text-center">
              Waiting for students to enter PIN or scan...
            </p>
          ) : (
            <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
              {recentCheckIns.slice(-5).reverse().map((c, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{c.studentName}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{c.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configuration Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold cursor-pointer text-[11px]">
            <input
              type="checkbox"
              checked={autoRotate}
              onChange={(e) => setAutoRotate(e.target.checked)}
              className="rounded text-indigo-600"
            />
            Auto-rotate PIN ({rotationCycleSeconds}s)
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={generateNewPIN}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Rotate Now</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
