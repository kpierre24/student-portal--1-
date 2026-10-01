import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  FileCheck, 
  Library, 
  DollarSign, 
  Smartphone, 
  CheckCircle2, 
  Share2, 
  Maximize2, 
  Minimize2, 
  ChevronRight, 
  Tv, 
  Award, 
  Zap,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { LogoImage } from './LogoImage';
import hteimBannerAsset from '../assets/images/regenerated_image_1785852170450.png';
import { TabType } from '../types';

interface AppPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: TabType) => void;
}

interface Scene {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  duration: number; // in seconds
  startTime: number;
  icon: React.ElementType;
  targetTab: TabType;
  narration: string;
  highlights: string[];
  visualType: 'welcome' | 'schedule' | 'assignments' | 'library' | 'financials';
}

const TOTAL_DURATION = 30; // 30 seconds

const SCENES: Scene[] = [
  {
    id: 1,
    title: "Welcome to HTEIM School of Ministry",
    subtitle: "Heaven Touching Earth Int'l Ministries • Official Student Portal",
    badge: "0:00 - 0:06 | Intro & Mission",
    duration: 6,
    startTime: 0,
    icon: GraduationCap,
    targetTab: 'home',
    narration: "Welcome to HTEIM School of Ministry. Empowering leaders with biblical education, flexible schedules, and real-time student tracking.",
    highlights: ["24/7 Digital Student ID Portal", "Live Announcements & Cloud Sync", "Designed for Mobile & Desktop Access"],
    visualType: 'welcome'
  },
  {
    id: 2,
    title: "Course Schedules, Zoom & Attendance",
    subtitle: "Interactive Class Days, 1-Click Zoom Join & PIN/QR Attendance",
    badge: "0:06 - 0:12 | Class & Attendance",
    duration: 6,
    startTime: 6,
    icon: Calendar,
    targetTab: 'schedule',
    narration: "Access your class schedule, launch live Zoom sessions instantly, and log attendance seamlessly via QR code or PIN.",
    highlights: ["1-Click Live Classroom Zoom Join", "Real-Time Attendance Rate Analytics", "Student Attendance Self-Reporting"],
    visualType: 'schedule'
  },
  {
    id: 3,
    title: "Exams, Written Assignments & Quizzes",
    subtitle: "PDF Submissions, Automated Evaluation Matrix & Instant Scores",
    badge: "0:12 - 0:18 | Exams & Assignments",
    duration: 6,
    startTime: 12,
    icon: FileCheck,
    targetTab: 'exams',
    narration: "Submit written assignments, view instructor corrections, and take interactive class day quizzes with instant automated scoring.",
    highlights: ["PDF File Upload & Submission Portal", "Instructor Feedback & Correction Downloads", "Automated Quiz Matrix & Scorecards"],
    visualType: 'assignments'
  },
  {
    id: 4,
    title: "Digital Theological Library & Classroom Media",
    subtitle: "Course Textbooks, Sermon Audio & Video Lecture Player",
    badge: "0:18 - 0:24 | Library & Media",
    duration: 6,
    startTime: 18,
    icon: Library,
    targetTab: 'library',
    narration: "Stream video lectures, listen to sermon audio, and download theological textbooks directly to your device.",
    highlights: ["Rich Theological Textbooks & PDF Downloads", "Built-in Audio & Video Sermon Player", "Study Guides & Curriculum Resources"],
    visualType: 'library'
  },
  {
    id: 5,
    title: "Student Tuition Ledger & Mobile App",
    subtitle: "Instant PDF Receipts, Payment Options & PWA Installation",
    badge: "0:24 - 0:30 | Ledger & Mobile PWA",
    duration: 6,
    startTime: 24,
    icon: DollarSign,
    targetTab: 'payments',
    narration: "Manage tuition balance, generate official PDF receipts, and install the portal as a fast mobile app on your smartphone.",
    highlights: ["Clear Payment Ledger & Tuition Tracking", "Official PDF Receipts with Seal", "Installable Offline Mobile PWA App"],
    visualType: 'financials'
  }
];

export const AppPresentationModal: React.FC<AppPresentationModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  // Current scene detection
  const currentScene = SCENES.find(
    (scene) => currentTime >= scene.startTime && currentTime < scene.startTime + scene.duration
  ) || SCENES[SCENES.length - 1];

  // Speech synthesis for narration
  const speakNarration = (text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02 * playbackSpeed;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  // Trigger speech on scene change
  const lastSceneIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (isPlaying && currentScene && currentScene.id !== lastSceneIdRef.current) {
      lastSceneIdRef.current = currentScene.id;
      speakNarration(currentScene.narration);
    }
  }, [currentScene?.id, isPlaying, isMuted, playbackSpeed]);

  // Main animation timer loop
  useEffect(() => {
    if (!isOpen) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current !== null && isPlaying) {
        const delta = (timestamp - lastTimeRef.current) / 1000;
        setCurrentTime((prev) => {
          const next = prev + delta * playbackSpeed;
          if (next >= TOTAL_DURATION) {
            setIsPlaying(false);
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            return TOTAL_DURATION;
          }
          return next;
        });
      }
      lastTimeRef.current = timestamp;
      if (isPlaying) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, isOpen, playbackSpeed]);

  if (!isOpen) return null;

  const handlePlayPause = () => {
    if (currentTime >= TOTAL_DURATION) {
      setCurrentTime(0);
      setIsPlaying(true);
      lastSceneIdRef.current = null;
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleReplay = () => {
    setCurrentTime(0);
    setIsPlaying(true);
    lastSceneIdRef.current = null;
  };

  const handleSelectScene = (scene: Scene) => {
    setCurrentTime(scene.startTime);
    setIsPlaying(true);
    lastSceneIdRef.current = null;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    lastSceneIdRef.current = null;
  };

  const toggleFullscreen = () => {
    if (!isFullscreen && modalContainerRef.current) {
      if (modalContainerRef.current.requestFullscreen) {
        modalContainerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleCopyDemoShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="modal-material-scrim fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div 
        ref={modalContainerRef}
        className={`modal-material-dialog w-full max-w-4xl bg-slate-900 border border-indigo-500/30 rounded-xl shadow-xl overflow-hidden flex flex-col ${
          isFullscreen ? 'fixed inset-0 max-w-none rounded-none z-50' : 'max-h-[92vh]'
        }`}
      >
        {/* Modal Top Bar */}
        <div className="modal-material-header bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-3 sm:p-4 border-b border-indigo-900/60 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
              <LogoImage className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-white tracking-tight truncate">
                  HTEIM Student Portal — 30s Animated Presentation Demo
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 rounded-full border border-amber-400/30 items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" /> 30 Sec HD
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                Interactive orientation walkthrough for new & prospective students
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyDemoShare}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-slate-700/80"
              title="Copy shareable link"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Share Demo'}</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                onClose();
              }}
              className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl transition-all cursor-pointer border border-rose-500/30"
              title="Close Presentation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Stage & Player Viewport */}
        <div className="relative bg-slate-950 flex-1 flex flex-col justify-center items-center min-h-[320px] sm:min-h-[420px] p-4 sm:p-6 overflow-hidden">
          
          {/* Animated Background Mesh & Lights */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-950/80 to-slate-950" />
          </div>

          {/* Current Scene Display Card */}
          <div className="relative z-10 w-full max-w-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-indigo-500/30 rounded-xl p-5 sm:p-8 shadow-xl backdrop-blur-md transition-all duration-500 animate-fadeIn space-y-6">
            
            {/* Scene Header & Badge */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-600 to-amber-500 text-slate-950 rounded-xl shadow-lg shrink-0">
                  <currentScene.icon className="w-6 h-6 text-slate-950 font-black" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                    {currentScene.badge}
                  </span>
                  <h2 className="text-base sm:text-xl font-black text-white tracking-tight mt-1">
                    {currentScene.title}
                  </h2>
                </div>
              </div>

              <div className="hidden sm:block text-right">
                <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950 px-3 py-1 rounded-xl border border-indigo-800/60">
                  {currentTime.toFixed(1)}s / {TOTAL_DURATION}s
                </span>
              </div>
            </div>

            {/* Visual Dynamic Preview Content based on Scene */}
            <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-4 sm:p-5 space-y-3 shadow-inner">
              
              {currentScene.visualType === 'welcome' && (
                <div className="space-y-3 text-center sm:text-left">
                  <div className="rounded-xl overflow-hidden border border-amber-400/50 shadow-md bg-white p-1">
                    <img src={hteimBannerAsset} alt="HTEIM Official Banner" className="w-full h-auto max-h-[140px] object-contain rounded-lg bg-white" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-300">Heaven Touching Earth Int'l Ministries</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      Equipping ministers and theological scholars with world-class biblical curriculum, live attendance tracking, and instant digital academic records.
                    </p>
                  </div>
                </div>
              )}

              {currentScene.visualType === 'schedule' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="flex items-center gap-2 text-emerald-400">
                      <Calendar className="w-4 h-4" /> Next Class: Day 1 - Ministry Foundations
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono rounded-full border border-emerald-500/30">
                      Zoom Ready
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-slate-900/80 rounded-lg text-slate-300 border border-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>PIN & QR Attendance Self-Report</span>
                    </div>
                    <div className="p-2 bg-slate-900/80 rounded-lg text-slate-300 border border-slate-800 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Live Student Attendance %</span>
                    </div>
                  </div>
                </div>
              )}

              {currentScene.visualType === 'assignments' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="flex items-center gap-2 text-indigo-300">
                      <FileCheck className="w-4 h-4 text-indigo-400" /> Class Day Quizzes & PDF Submissions
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-mono rounded-full border border-indigo-500/30">
                      Auto-Scored
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Upload term papers, receive graded corrections, and complete interactive multiple-choice quizzes with instant scorecard feedback.
                  </p>
                </div>
              )}

              {currentScene.visualType === 'library' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="flex items-center gap-2 text-amber-300">
                      <Library className="w-4 h-4 text-amber-400" /> Digital Library & Video Sermon Player
                    </span>
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-mono rounded-full border border-amber-500/30">
                      Offline PDF Support
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Access course handbooks, theological reference eBooks, MP3 sermon audio recordings, and video lectures anywhere.
                  </p>
                </div>
              )}

              {currentScene.visualType === 'financials' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="flex items-center gap-2 text-emerald-300">
                      <DollarSign className="w-4 h-4 text-emerald-400" /> Tuition Balance & Mobile PWA App
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono rounded-full border border-emerald-500/30">
                      Instant PDF Receipt
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Track tuition installments, download official sealed PDF payment receipts, and install the app directly on your smartphone home screen.
                  </p>
                </div>
              )}

              {/* Highlights Bullet Badges */}
              <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                {currentScene.highlights.map((hl, idx) => (
                  <span key={idx} className="text-[10px] font-bold text-slate-200 bg-indigo-950/80 border border-indigo-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    {hl}
                  </span>
                ))}
              </div>
            </div>

            {/* Subtitle / Live Narration Caption Box */}
            <div className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-center relative overflow-hidden">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-200">
                <Volume2 className={`w-4 h-4 text-amber-400 ${isPlaying && !isMuted ? 'animate-bounce' : ''}`} />
                <span className="italic">"{currentScene.narration}"</span>
              </div>
            </div>

            {/* Jump to Feature Button */}
            {onNavigateTab && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    onNavigateTab(currentScene.targetTab);
                    onClose();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:opacity-80"
                >
                  <span>Explore {currentScene.title.split(' ')[0]} Feature in App</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Slider & Scene Navigation Tabs */}
        <div className="bg-slate-950 p-3 sm:p-4 border-t border-slate-800/80 space-y-3 shrink-0">
          
          {/* Progress Timeline Scrub Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <Tv className="w-3.5 h-3.5" /> Scene {currentScene.id} of {SCENES.length}: {currentScene.title}
              </span>
              <span>{currentTime.toFixed(1)}s / {TOTAL_DURATION}.0s</span>
            </div>

            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max={TOTAL_DURATION}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Player Action Buttons & Controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            
            {/* Play, Replay & Speed */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayPause}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:opacity-80"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isPlaying ? 'Pause' : currentTime >= TOTAL_DURATION ? 'Replay Demo' : 'Play'}</span>
              </button>

              <button
                onClick={handleReplay}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
                title="Restart 30s Presentation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-xl transition-all cursor-pointer border ${
                  isMuted 
                    ? 'bg-rose-950/50 text-rose-300 border-rose-800/60' 
                    : 'bg-slate-800 text-indigo-300 border-slate-700/60'
                }`}
                title={isMuted ? 'Unmute Voice Narration' : 'Mute Voice Narration'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Speed Switcher */}
              <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[10px] font-bold">
                {[1.0, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                      playbackSpeed === spd 
                        ? 'bg-amber-400 text-slate-950 font-black' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Scene Selector Quick Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full custom-scrollbar py-0.5">
              {SCENES.map((scene) => {
                const isActive = currentScene.id === scene.id;
                return (
                  <button
                    key={scene.id}
                    onClick={() => handleSelectScene(scene)}
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shrink-0 ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <scene.icon className="w-3 h-3" />
                    <span>Scene {scene.id}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppPresentationModal;
