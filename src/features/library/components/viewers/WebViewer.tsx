import React, { useState } from 'react';
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  X,
  Maximize2,
  Minimize2,
  AlertTriangle,
  BookOpen,
  User,
  Heart,
  CheckCircle,
  FileText,
  RefreshCw
} from 'lucide-react';
import { ViewerBaseProps } from './types';
import { checkWebsiteEmbeddability } from '../../utils/urlNormalizer';

export const WebViewer: React.FC<ViewerBaseProps> = ({
  resource,
  onClose,
  className = '',
  onProgressUpdate
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [iframeError, setIframeError] = useState<boolean>(false);
  const [forceEmbedAttempt, setForceEmbedAttempt] = useState<boolean>(false);

  const rawUrl =
    (resource as any).downloadUrl ||
    (resource as any).url ||
    (resource as any).fileDataUrl ||
    '';

  // Complete and Save state persistence
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

  let hostname = '';
  try {
    const parsed = new URL(rawUrl);
    hostname = parsed.hostname;
  } catch {
    hostname = 'external-web';
  }

  // Phase 10: Check if URL can be safely embedded in an iframe
  const embedCheck = checkWebsiteEmbeddability(rawUrl, {
    allowEmbedding: (resource as any).allowEmbedding,
    embeddable: (resource as any).embeddable
  });

  const shouldEmbed = (embedCheck.canEmbed || forceEmbedAttempt) && !iframeError;

  // Metadata
  const courseName =
    (resource as any).courseName ||
    (resource as any).subject ||
    (resource as any).curriculum ||
    'Curriculum Web Study';

  const lessonTitle = resource.title || 'Online Ministry Resource';

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
    'External educational reference, scripture research tool, or ministry training publication.';

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(rawUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
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

  return (
    <div
      className={`flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden ${className}`}
    >
      {/* Top Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20 shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-sm sm:max-w-md">
              {lessonTitle}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              {shouldEmbed ? (
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-3 h-3 text-amber-400" />
              )}
              <span className="font-mono text-slate-300 truncate">{hostname}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 truncate">{courseName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy URL"
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Link'}</span>
          </button>

          <a
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Website ↗</span>
          </a>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-rose-600/80 bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      {shouldEmbed ? (
        // EMBEDDED IFRAME VIEWER
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-900">
          <div className="shrink-0 bg-slate-900/90 px-4 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>In-App Frame View: <strong className="text-slate-200">{hostname}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIframeError(true)}
                className="text-slate-400 hover:text-sky-300 underline"
              >
                Not loading properly?
              </button>
              <a
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline font-semibold flex items-center gap-1"
              >
                Open Website ↗
              </a>
            </div>
          </div>

          <iframe
            src={rawUrl}
            title={lessonTitle}
            className="w-full flex-1 border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onError={() => setIframeError(true)}
          />
        </div>
      ) : (
        // PHASE 10: NON-EMBEDDABLE EXTERNAL FALLBACK DISPLAY
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col items-center justify-center relative">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            {/* Warning Shield Badge */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Globe className="w-8 h-8" />
            </div>

            {/* Required Phase 10 Notice & Title */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                External Security Policy
              </div>

              <h3 className="text-lg sm:text-xl font-extrabold text-white">
                This website cannot be displayed inside the School of Ministry app.
              </h3>

              <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                Many external websites block iframe embedding through modern security policies
                (such as <code className="text-slate-300 font-mono">X-Frame-Options</code> or <code className="text-slate-300 font-mono">Content-Security-Policy</code>).
                To protect your browsing security, please open this link in a new tab.
              </p>
            </div>

            {/* Course & Lesson Info */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-medium">Resource Title:</span>
                <span className="font-bold text-white truncate max-w-xs">{lessonTitle}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-medium">Course:</span>
                <span className="text-rose-400 font-semibold">{courseName}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-medium">Instructor:</span>
                <span className="text-slate-200">{formattedInstructor}</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-400 block mb-1">Destination URL:</span>
                <span className="font-mono text-sky-400 break-all">{rawUrl}</span>
              </div>
            </div>

            {/* Primary Action Button: Open Website ↗ */}
            <div className="pt-1 flex flex-wrap justify-center gap-3">
              <a
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-sm rounded-xl shadow-lg shadow-sky-900/30 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Website ↗</span>
              </a>

              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            {/* Action Toolbar: ✓ Mark as Complete | ♡ Save */}
            <div className="flex justify-center items-center gap-3 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={toggleComplete}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isCompleted ? '✓ Completed' : '✓ Mark as Complete'}</span>
              </button>

              <button
                type="button"
                onClick={toggleSave}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  isSaved
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                <span>{isSaved ? '♥ Saved' : '♡ Save'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Your School of Ministry portal session remains open and active in this tab while you explore external resources.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
