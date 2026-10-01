import React, { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  Image as ImageIcon,
  RefreshCw,
  X,
  Check,
  CheckCircle,
  Heart,
  Lock,
  BookOpen,
  User,
  ChevronLeft,
  ChevronRight,
  Hand
} from 'lucide-react';
import { ViewerBaseProps } from './types';

export const ImageViewer: React.FC<ViewerBaseProps> = ({
  resource,
  onClose,
  canDownload = true,
  className = '',
  onProgressUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawUrl =
    (resource as any).downloadUrl ||
    (resource as any).url ||
    (resource as any).fileDataUrl ||
    '';

  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Persistence keys
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

  // Mobile Touch Swipe Handling (Phase 12)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeNotice, setSwipeNotice] = useState<string | null>(null);

  const isDownloadPermitted =
    canDownload && (resource as any).isDownloadable !== false && Boolean(rawUrl);

  const courseName =
    (resource as any).courseName ||
    (resource as any).subject ||
    (resource as any).curriculum ||
    'Visual Diagram & Infographic';

  const title = resource.title || 'Infographic Diagram';

  const author =
    (resource as any).author ||
    (resource as any).instructor ||
    (resource as any).uploadedBy ||
    'Elder Renee Pierre';

  const formattedAuthor = author.toLowerCase().startsWith('elder')
    ? author
    : `Elder ${author}`;

  const description =
    (resource as any).description ||
    (resource as any).summary ||
    'High-resolution visual infographic, biblical chart, and ministry study diagram.';

  const handleZoomIn = () => setScale((prev) => Math.min(4, Math.round((prev + 0.25) * 100) / 100));
  const handleZoomOut = () => setScale((prev) => Math.max(0.25, Math.round((prev - 0.25) * 100) / 100));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
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

  const handleDownload = () => {
    if (!isDownloadPermitted || !rawUrl) return;
    const link = document.createElement('a');
    link.href = rawUrl;
    link.download = (resource as any).fileName || `${title}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - touchStartX.current;
    const diffY = endY - touchStartY.current;

    // Detect horizontal swipe if delta > 50px and predominantly horizontal
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        setSwipeNotice('Swiped Right');
      } else {
        setSwipeNotice('Swiped Left');
      }
      setTimeout(() => setSwipeNotice(null), 1500);
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header Toolbar */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-sm sm:max-w-md">
              {title}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{courseName}</span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-slate-300">{Math.round(scale * 100)}% Zoom</span>
            </div>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom out"
            aria-label="Zoom out"
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono text-slate-300 px-1 min-w-[48px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom in"
            aria-label="Zoom in"
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRotate}
            title="Rotate 90° clockwise"
            aria-label="Rotate image"
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors ml-1"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Reset scale and rotation"
            aria-label="Reset zoom"
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isDownloadPermitted ? (
            <button
              type="button"
              onClick={handleDownload}
              title="Download image"
              aria-label="Download image"
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors ml-1"
            >
              <Download className="w-4 h-4" />
            </button>
          ) : (
            <div
              title="Download is restricted for this image"
              className="p-2 text-slate-500 bg-slate-900 rounded-xl border border-slate-800 cursor-not-allowed opacity-60 ml-1"
            >
              <Lock className="w-4 h-4" />
            </div>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label="Toggle fullscreen"
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close viewer"
              className="p-2 text-slate-400 hover:text-white hover:bg-rose-600/80 bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Image Canvas with Zoom / Rotate / Mobile Swipe Feedback */}
      <div className="flex-1 overflow-auto bg-slate-950 p-6 flex flex-col items-center justify-center relative">
        {/* Swipe Feedback Overlay for mobile */}
        {swipeNotice && (
          <div className="absolute top-4 z-20 px-4 py-1.5 bg-emerald-600/90 text-white rounded-full text-xs font-bold shadow-lg animate-bounce flex items-center gap-1.5">
            <Hand className="w-3.5 h-3.5" />
            <span>{swipeNotice}</span>
          </div>
        )}

        <div
          className="transition-transform duration-150 ease-out shadow-2xl rounded-2xl overflow-hidden max-w-full max-h-full border border-slate-800/80"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`
          }}
        >
          <img
            src={rawUrl}
            alt={title}
            className="max-w-[85vw] max-h-[65vh] object-contain block rounded-xl pointer-events-none"
          />
        </div>

        {/* Action Toolbar Below Image: ✓ Mark as Complete | ♡ Save | Metadata */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={toggleComplete}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              isCompleted
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isCompleted ? '✓ Completed' : '✓ Mark as Complete'}</span>
          </button>

          <button
            type="button"
            onClick={toggleSave}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              isSaved
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? '♥ Saved' : '♡ Save'}</span>
          </button>

          {isDownloadPermitted && (
            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          )}

          <div className="text-[11px] text-slate-400 border-l border-slate-700 pl-3">
            <strong>Instructor:</strong> {formattedAuthor}
          </div>
        </div>
      </div>
    </div>
  );
};
