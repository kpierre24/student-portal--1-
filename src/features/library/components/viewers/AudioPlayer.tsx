import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Download,
  Headphones,
  FileText,
  CheckCircle,
  Check,
  Heart,
  Lock,
  User,
  BookOpen,
  Music,
  Radio,
  Sparkles,
  X
} from 'lucide-react';
import { ViewerBaseProps } from './types';

export const AudioPlayer: React.FC<ViewerBaseProps> = ({
  resource,
  onClose,
  canDownload = true,
  className = '',
  onProgressUpdate
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const rawUrl =
    (resource as any).downloadUrl ||
    (resource as any).url ||
    (resource as any).fileDataUrl ||
    '';

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>((resource as any).durationSeconds || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [showNotes, setShowNotes] = useState<boolean>(true);

  // Persistence keys
  const progressStorageKey = `hteim_audio_progress_${resource.id}`;
  const completedStorageKey = `hteim_resource_completed_${resource.id}`;
  const savedStorageKey = `hteim_resource_saved_${resource.id}`;

  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(completedStorageKey) === 'true';
    } catch {
      return false;
    }
  });

  const [isSaved, setIsSaved] = useState<boolean>(() => {
    try {
      return localStorage.getItem(savedStorageKey) === 'true';
    } catch {
      return false;
    }
  });

  const isDownloadPermitted = canDownload && (resource as any).isDownloadable !== false && Boolean(rawUrl);

  // Metadata
  const courseName =
    (resource as any).courseName ||
    (resource as any).subject ||
    (resource as any).curriculum ||
    'School of Ministry Audio';

  const title = resource.title || 'Audio Recording';

  const category =
    (resource as any).category ||
    (resource as any).audioCategory ||
    'Sermon & Lecture';

  const speakerName =
    (resource as any).instructor ||
    (resource as any).author ||
    (resource as any).speaker ||
    (resource as any).uploadedBy ||
    'Elder Renee Pierre';

  const formattedSpeaker = speakerName.toLowerCase().startsWith('elder')
    ? speakerName
    : `Elder ${speakerName}`;

  const description =
    (resource as any).description ||
    (resource as any).summary ||
    'Anointed audio recording for theological reflection, sermons, worship material, and biblical lecture training.';

  // Format detection
  const audioFormat = ((resource as any).format || 'MP3').toUpperCase();

  // Load saved progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem(progressStorageKey);
      if (saved && audioRef.current) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 5) {
          audioRef.current.currentTime = parsed;
        }
      }
    } catch {
      // Ignore
    }
  }, [progressStorageKey]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      const dur = audioRef.current.duration || duration;
      setCurrentTime(cur);
      setDuration(dur);

      try {
        localStorage.setItem(progressStorageKey, cur.toString());
      } catch {
        // Ignore
      }

      const completed = dur > 0 && cur / dur >= 0.9;
      if (completed && !isCompleted) {
        setIsCompleted(true);
        try {
          localStorage.setItem(completedStorageKey, 'true');
        } catch {
          // Ignore
        }
      }

      onProgressUpdate?.({
        currentTimeSeconds: Math.floor(cur),
        durationSeconds: Math.floor(dur),
        completed
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds)
      );
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMuted = !isMuted;
      audioRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const toggleComplete = () => {
    const next = !isCompleted;
    setIsCompleted(next);
    try {
      localStorage.setItem(completedStorageKey, next.toString());
    } catch {
      // Ignore
    }
    onProgressUpdate?.({
      completed: next
    });
  };

  const toggleSave = () => {
    const next = !isSaved;
    setIsSaved(next);
    try {
      localStorage.setItem(savedStorageKey, next.toString());
    } catch {
      // Ignore
    }
  };

  const handleDownload = () => {
    if (!isDownloadPermitted || !rawUrl) return;
    const link = document.createElement('a');
    link.href = rawUrl;
    link.download = (resource as any).fileName || `${title}.${audioFormat.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden ${className}`}>
      {/* Native Audio Element */}
      <audio
        ref={audioRef}
        src={rawUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setIsCompleted(true);
        }}
      />

      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 shrink-0">
            <Headphones className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-sm sm:max-w-md">
              {title}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="font-semibold text-amber-400">{audioFormat} Audio</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 font-medium truncate">{category}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {((resource as any).fullContent || (resource as any).description) && (
            <button
              type="button"
              onClick={() => setShowNotes((prev) => !prev)}
              title="Toggle Study Notes"
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                showNotes
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'text-slate-400 hover:text-white bg-slate-900 border-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Notes</span>
            </button>
          )}

          {isDownloadPermitted ? (
            <button
              type="button"
              onClick={handleDownload}
              title="Download Audio File"
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          ) : (
            <div
              title="Downloads are restricted for this audio resource"
              className="p-2 rounded-xl text-slate-500 bg-slate-900 border border-slate-800 cursor-not-allowed opacity-60"
            >
              <Lock className="w-4 h-4" />
            </div>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-rose-600/80 border border-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Visualizer & Audio Player Center */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col items-center justify-center space-y-6">
          {/* Animated Vinyl / Soundwave Visualizer Disc */}
          <div className="relative group">
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-amber-600 via-rose-700 to-indigo-700 p-1 shadow-2xl flex items-center justify-center transition-all ${
                isPlaying ? 'shadow-amber-500/20 scale-105' : ''
              }`}
            >
              <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center border-4 border-slate-900 text-center p-4 relative overflow-hidden">
                {/* Waveform graphic animation */}
                <div className="flex items-center gap-1 h-10 mb-2">
                  {[24, 38, 18, 44, 28, 50, 20, 36, 16, 42].map((h, i) => (
                    <span
                      key={i}
                      className={`w-1 bg-amber-400 rounded-full transition-all duration-300 ${
                        isPlaying ? 'animate-pulse' : 'opacity-40'
                      }`}
                      style={{
                        height: isPlaying ? `${Math.max(8, (h * (i % 2 === 0 ? 1 : 0.7)))}px` : '8px',
                        animationDelay: `${i * 100}ms`
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">
                  {isPlaying ? 'Streaming' : 'Audio Player'}
                </span>
              </div>
            </div>
          </div>

          {/* Title, Speaker & Course Hierarchy */}
          <div className="text-center space-y-1.5 max-w-lg">
            <div className="flex items-center justify-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold tracking-wide">
                {courseName}
              </span>
              {isCompleted && (
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Completed
                </span>
              )}
            </div>

            <h1 className="text-lg sm:text-xl font-black text-white">
              {title}
            </h1>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span><strong>Speaker:</strong> {formattedSpeaker}</span>
            </div>
          </div>

          {/* Seekbar & Progress Scrubber */}
          <div className="w-full max-w-md space-y-2">
            <div className="relative w-full flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Seek audio"
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 z-10"
              />
            </div>
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span className="text-[10px] text-slate-500 font-sans">{Math.round(progressPercent)}% Played</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls (Skip -10s, Play/Pause, Skip +10s) */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleSkip(-10)}
              title="Rewind 10 seconds"
              className="p-3 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-full border border-slate-800 transition-colors shadow-sm"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              className="p-5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full shadow-xl shadow-amber-950/40 transition-transform transform hover:scale-105 active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current translate-x-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSkip(10)}
              title="Forward 10 seconds"
              className="p-3 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-full border border-slate-800 transition-colors shadow-sm"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          {/* Volume & Speed Toolbar */}
          <div className="flex flex-wrap items-center justify-center gap-6 bg-slate-900/60 px-5 py-3 rounded-2xl border border-slate-800 max-w-md w-full">
            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="text-slate-400 hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4 text-slate-300" />
                ) : (
                  <Volume2 className="w-4 h-4 text-slate-300" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume slider"
                className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Playback Speed */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Speed:</span>
              {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    playbackSpeed === s
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Action Toolbar: ✓ Mark as Complete | ♡ Save | ↓ Download */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={toggleComplete}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                isCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isCompleted ? '✓ Completed' : '✓ Mark as Complete'}</span>
            </button>

            <button
              type="button"
              onClick={toggleSave}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                isSaved
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? '♥ Saved' : '♡ Save'}</span>
            </button>

            {isDownloadPermitted ? (
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>↓ Download</span>
              </button>
            ) : (
              <div className="px-4 py-2.5 bg-slate-900/50 text-slate-500 border border-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-60">
                <Lock className="w-3.5 h-3.5" />
                <span>↓ Download (Restricted)</span>
              </div>
            )}
          </div>
        </div>

        {/* Accompanying Sermon / Lecture Notes Drawer */}
        {showNotes && (
          <aside className="w-full md:w-80 lg:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-5 overflow-y-auto space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Sermon & Lecture Notes
              </h3>
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans bg-slate-950 p-4 rounded-xl border border-slate-800">
              {description}
            </div>

            {((resource as any).fullContent || (resource as any).extractedContent) && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Scripture Transcripts
                </h4>
                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-64 overflow-y-auto">
                  {(resource as any).fullContent || (resource as any).extractedContent}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
