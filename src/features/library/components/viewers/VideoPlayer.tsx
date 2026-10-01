import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  ExternalLink,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  FileText,
  Video,
  CheckCircle,
  Check,
  Heart,
  Download,
  Lock,
  User,
  BookOpen,
  Sparkles,
  X
} from 'lucide-react';
import { ViewerBaseProps } from './types';
import { normalizeUrl } from '../../utils/urlNormalizer';

export const VideoPlayer: React.FC<ViewerBaseProps> = ({
  resource,
  onClose,
  canDownload = true,
  className = '',
  onProgressUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const rawUrl = (resource as any).downloadUrl || (resource as any).url || (resource as any).fileDataUrl || '';
  const normalized = normalizeUrl(rawUrl);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>((resource as any).durationSeconds || 0);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Persistence keys
  const progressStorageKey = `hteim_video_progress_${resource.id}`;
  const completedStorageKey = `hteim_resource_completed_${resource.id}`;
  const savedStorageKey = `hteim_resource_saved_${resource.id}`;

  // Complete & Save state
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

  const isEmbedProvider =
    normalized.isValid &&
    (normalized.provider === 'youtube' ||
      normalized.provider === 'vimeo' ||
      normalized.provider === 'gdrive' ||
      normalized.provider === 'loom');

  const isDownloadPermitted = canDownload && (resource as any).isDownloadable !== false && Boolean(rawUrl && !isEmbedProvider);

  // Curriculum & Metadata defaults
  const courseName =
    (resource as any).courseName ||
    (resource as any).subject ||
    (resource as any).curriculum ||
    (resource as any).courseCode ||
    'Systematic Theology';

  const lessonTitle = resource.title || 'Introduction to Theology';

  const instructorName =
    (resource as any).instructor ||
    (resource as any).author ||
    (resource as any).uploadedBy ||
    'Elder Renee Pierre';

  const formattedInstructor = instructorName.toLowerCase().startsWith('elder')
    ? instructorName
    : `Elder ${instructorName}`;

  const description =
    (resource as any).description ||
    (resource as any).summary ||
    'Comprehensive lecture video and biblical ministry training module.';

  // Load saved progress for direct video
  useEffect(() => {
    if (!isEmbedProvider) {
      try {
        const saved = localStorage.getItem(progressStorageKey);
        if (saved && videoRef.current) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed > 5) {
            videoRef.current.currentTime = parsed;
          }
        }
      } catch {
        // Ignore
      }
    }
  }, [progressStorageKey, isEmbedProvider]);

  // Handle direct video playback events
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || duration;
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

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds)
      );
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
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
    link.download = (resource as any).fileName || `${lessonTitle}.mp4`;
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

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-y-auto ${className}`}
    >
      {/* Top Navigation Bar */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 shrink-0">
            <Video className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-sm sm:max-w-md">
              {lessonTitle}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="font-semibold text-rose-400 capitalize">
                {normalized.provider}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 font-medium truncate">{courseName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notes toggle */}
          {((resource as any).fullContent || (resource as any).description) && (
            <button
              type="button"
              onClick={() => setShowNotes((prev) => !prev)}
              title="Toggle Study Notes"
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                showNotes
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'text-slate-400 hover:text-white bg-slate-900 border-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Notes</span>
            </button>
          )}

          {/* External Platform Link */}
          {normalized.canonicalUrl && (
            <a
              href={normalized.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Watch on {normalized.provider}</span>
            </a>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

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

      {/* Main Content Area: Video Player Viewport */}
      <div className="flex-1 flex flex-col">
        {/* VIDEO PLAYER VIEWPORT */}
        <div className="w-full bg-black flex items-center justify-center relative aspect-video max-h-[60vh] shrink-0 border-b border-slate-800 overflow-hidden">
          {isEmbedProvider && normalized.embedUrl ? (
            <iframe
              src={normalized.embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title={lessonTitle}
            />
          ) : (
            <div className="w-full h-full flex flex-col justify-center items-center relative group">
              <video
                ref={videoRef}
                src={rawUrl}
                controls={false}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-full object-contain cursor-pointer"
                onClick={togglePlay}
              />

              {/* Centered Play Button when paused */}
              {!isPlaying && (
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label="Play video"
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl transition-transform transform hover:scale-110"
                >
                  <Play className="w-8 h-8 fill-current translate-x-0.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Custom Video Controls (for direct / uploaded storage videos) */}
        {!isEmbedProvider && (
          <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => handleSkip(-10)}
                title="Rewind 10s"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleSkip(10)}
                title="Forward 10s"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono text-slate-300 ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Speed:</span>
              {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    playbackSpeed === s
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phase 9 Student Study & Metadata Layout */}
        <div className="p-6 max-w-4xl w-full mx-auto space-y-6">
          {/* Header Section: Course, Lesson & Instructor */}
          <div className="space-y-2 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-bold tracking-wide flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {courseName}
              </span>
              {isCompleted && (
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Completed
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {lessonTitle}
            </h1>

            <div className="flex items-center gap-2 text-sm text-slate-300 pt-1">
              <User className="w-4 h-4 text-rose-400" />
              <span>
                <strong>Instructor:</strong> {formattedInstructor}
              </span>
            </div>
          </div>

          {/* Action Toolbar: ✓ Mark as Complete | ♡ Save | ↓ Download */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-sm">
            {/* Mark as Complete Button */}
            <button
              type="button"
              onClick={toggleComplete}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                isCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isCompleted ? '✓ Completed' : '✓ Mark as Complete'}</span>
            </button>

            {/* Save / Favorite Button */}
            <button
              type="button"
              onClick={toggleSave}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                isSaved
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              <span>{isSaved ? '♥ Saved' : '♡ Save'}</span>
            </button>

            {/* Download Button (where permitted) */}
            {isDownloadPermitted ? (
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>↓ Download</span>
              </button>
            ) : (
              <div
                title="Download is restricted for this video lecture"
                className="px-4 py-2.5 bg-slate-900 text-slate-500 border border-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-60"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>↓ Download (Restricted)</span>
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="space-y-2 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              Description
            </h3>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
              {description}
            </div>
          </div>

          {/* Attached Study Notes / Transcript if present */}
          {((resource as any).fullContent || (resource as any).extractedContent) && (
            <div className="space-y-3 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Lecture Study Notes & Transcript
              </h3>
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-60 overflow-y-auto">
                {(resource as any).fullContent || (resource as any).extractedContent}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
