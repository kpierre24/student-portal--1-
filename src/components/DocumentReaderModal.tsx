import React, { useState, useEffect, useMemo, useRef } from 'react';
import mammoth from 'mammoth';
import {
  X,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Search,
  BookOpen,
  FileText,
  Brain,
  CheckCircle2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ExternalLink,
  Pencil,
  FileCode2,
  Headphones,
  Eye,
  Layers,
  FileType,
  AlertCircle,
  CheckSquare,
  Square,
  Bookmark,
  Highlighter,
  Pin,
  Plus
} from 'lucide-react';
import { LibraryResource } from '../types';
import { parseVideoMediaUrl } from '../lib/mediaUtils';
import { dataUrlToUint8Array, extractTextFromPdfData, renderPdfPageToCanvas } from '../lib/pdfUtils';
import { ScriptureHoverPopover } from './ScriptureHoverPopover';
import { parseTextWithScriptures } from '../utils/scriptureDetector';
import { createNoteFromLibraryExcerpt } from '../utils/notesStorage';

interface DocumentReaderModalProps {
  isOpen: boolean;
  resource: LibraryResource | null;
  onClose: () => void;
  onDownload: (resource: LibraryResource, e?: React.MouseEvent) => void;
  onEdit?: (resource: LibraryResource) => void;
  onGenerateSummary?: (resource: LibraryResource) => void;
  isGeneratingSummary?: boolean;
  isStudent?: boolean;
  studentName?: string;
  isCompleted?: boolean;
  onToggleComplete?: (resourceId: string) => void;
  onOpenInBible?: (bookId: string, chapter: number, verse?: number) => void;
  onOpenNotes?: () => void;
}

type ReaderTheme = 'light' | 'sepia' | 'dark' | 'contrast';
type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';
type PdfViewMode = 'canvas' | 'text';

const FONT_SIZE_MAP: Record<FontSize, { label: string; tailwind: string; px: string }> = {
  sm: { label: 'Small', tailwind: 'text-sm leading-relaxed', px: '14px' },
  base: { label: 'Medium', tailwind: 'text-base leading-relaxed', px: '16px' },
  lg: { label: 'Large', tailwind: 'text-lg leading-loose', px: '18px' },
  xl: { label: 'X-Large', tailwind: 'text-xl leading-loose', px: '20px' },
  '2xl': { label: 'Display', tailwind: 'text-2xl leading-loose', px: '24px' },
};

const THEME_STYLES: Record<ReaderTheme, { name: string; bg: string; text: string; border: string; accent: string }> = {
  light: {
    name: 'Clean White',
    bg: 'bg-white',
    text: 'text-slate-900',
    border: 'border-slate-200',
    accent: 'bg-slate-100 text-slate-700'
  },
  sepia: {
    name: 'Sepia Book',
    bg: 'bg-[#FAF6EE]',
    text: 'text-[#433422]',
    border: 'border-[#E6DCC8]',
    accent: 'bg-[#EFE6D5] text-[#433422]'
  },
  dark: {
    name: 'Midnight Dark',
    bg: 'bg-slate-900',
    text: 'text-slate-100',
    border: 'border-slate-800',
    accent: 'bg-slate-800 text-slate-200'
  },
  contrast: {
    name: 'High Contrast',
    bg: 'bg-black',
    text: 'text-yellow-300',
    border: 'border-yellow-500/30',
    accent: 'bg-zinc-900 text-yellow-400'
  }
};

export const DocumentReaderModal: React.FC<DocumentReaderModalProps> = ({
  isOpen,
  resource,
  onClose,
  onDownload,
  onEdit,
  onGenerateSummary,
  isGeneratingSummary = false,
  isStudent = false,
  studentName = 'General Student',
  isCompleted = false,
  onToggleComplete,
  onOpenInBible,
  onOpenNotes,
}) => {
  // Reader Settings State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<ReaderTheme>('light');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [showSummarySidebar, setShowSummarySidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Selection & Notes Capture State
  const [selectedText, setSelectedText] = useState<string>('');
  const [noteCreatedToast, setNoteCreatedToast] = useState<string | null>(null);

  const handleMouseUpCapture = () => {
    const sel = window.getSelection();
    const str = sel ? sel.toString().trim() : '';
    if (str && str.length >= 3) {
      setSelectedText(str);
    } else {
      setSelectedText('');
    }
  };

  const handleSendSelectedToNotes = () => {
    if (!resource || !selectedText) return;
    createNoteFromLibraryExcerpt(studentName, {
      resourceTitle: resource.title,
      courseCode: resource.courseCode,
      instructor: resource.author,
      excerpt: selectedText
    });
    setNoteCreatedToast(`Saved excerpt to Class Notes!`);
    setSelectedText('');
    setTimeout(() => setNoteCreatedToast(null), 3500);
  };

  const handleSendSummaryToNotes = () => {
    if (!resource) return;
    const body = `${resource.summary || ''}\n\nKey Learning Takeaways:\n${(resource.keyTakeaways || []).map(t => `• ${t}`).join('\n')}`;
    createNoteFromLibraryExcerpt(studentName, {
      resourceTitle: resource.title,
      courseCode: resource.courseCode,
      instructor: resource.author,
      excerpt: body
    });
    setNoteCreatedToast(`Saved lesson summary & takeaways to Class Notes!`);
    setTimeout(() => setNoteCreatedToast(null), 3500);
  };

  // Content Extraction State for DOCX
  const [parsedHtml, setParsedHtml] = useState<string>('');
  const [parsedRawText, setParsedRawText] = useState<string>('');
  const [isParsingDocx, setIsParsingDocx] = useState(false);

  // PDF Canvas & Text State
  const [pdfViewMode, setPdfViewMode] = useState<PdfViewMode>('canvas');
  const [pdfNumPages, setPdfNumPages] = useState<number>(1);
  const [pdfCurrentPage, setPdfCurrentPage] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1.3);
  const [isRenderingPdf, setIsRenderingPdf] = useState(false);
  const [pdfExtractedText, setPdfExtractedText] = useState<string>('');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  // Audio Player State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Determine document type safely
  const formatUpper = (resource?.format || '').toUpperCase();
  const fileNameLower = (resource?.fileName || resource?.title || '').toLowerCase();
  const isPdf = formatUpper === 'PDF' || fileNameLower.endsWith('.pdf') || (resource?.mimeType || '').includes('pdf') || (resource?.fileDataUrl || '').startsWith('data:application/pdf');
  const isDocx = formatUpper === 'DOCX' || formatUpper === 'DOC' || fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc') || (resource?.mimeType || '').includes('wordprocessingml') || (resource?.mimeType || '').includes('msword');
  const isAudio = formatUpper === 'AUDIO' || formatUpper === 'MP3' || formatUpper === 'WAV' || formatUpper === 'M4A' || fileNameLower.endsWith('.mp3') || fileNameLower.endsWith('.wav') || fileNameLower.endsWith('.m4a') || resource?.category === 'Lecture Audio';
  const videoDetails = parseVideoMediaUrl(resource?.downloadUrl || resource?.fileDataUrl || '');
  const isVideo = formatUpper === 'VIDEO' || resource?.category === 'Livestream Recording' || videoDetails.isDrive || videoDetails.isYouTube || videoDetails.isVimeo || videoDetails.isLoom;

  // Load PDF Data and Extract Text
  useEffect(() => {
    if (!isOpen || !resource || !isPdf) {
      setPdfBytes(null);
      setPdfNumPages(1);
      setPdfCurrentPage(1);
      setPdfExtractedText('');
      setPdfError(null);
      return;
    }

    if (resource.fileDataUrl && resource.fileDataUrl.startsWith('data:')) {
      const bytes = dataUrlToUint8Array(resource.fileDataUrl);
      if (bytes) {
        setPdfBytes(bytes);
        setPdfCurrentPage(1);
        setIsRenderingPdf(true);
        setPdfError(null);

        extractTextFromPdfData(bytes)
          .then((info) => {
            if (info.numPages > 0) {
              setPdfNumPages(info.numPages);
              setPdfExtractedText(info.extractedText);
            }
          })
          .catch((err) => {
            console.warn('PDF text parse note:', err);
          })
          .finally(() => {
            setIsRenderingPdf(false);
          });
      } else {
        setPdfError('Unable to decode PDF data.');
      }
    } else {
      setPdfBytes(null);
    }
  }, [isOpen, resource, isPdf]);

  // Render PDF Page to HTML5 Canvas
  useEffect(() => {
    if (!isOpen || !resource || !isPdf || !pdfBytes || !canvasRef.current || pdfViewMode !== 'canvas') return;

    let isMounted = true;
    setIsRenderingPdf(true);

    renderPdfPageToCanvas(pdfBytes, pdfCurrentPage, canvasRef.current, pdfScale)
      .then((res) => {
        if (isMounted) {
          if (!res) {
            setPdfError('Failed to render PDF page on canvas.');
          } else {
            setPdfError(null);
          }
          setIsRenderingPdf(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('PDF Canvas Render Error:', err);
          setPdfError('Canvas render error. You can switch to Text Mode or download the file.');
          setIsRenderingPdf(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, resource, isPdf, pdfBytes, pdfCurrentPage, pdfScale, pdfViewMode]);

  // Handle DOCX HTML Parsing with Mammoth
  useEffect(() => {
    let isCancelled = false;

    if (isOpen && resource && isDocx && resource.fileDataUrl && resource.fileDataUrl.startsWith('data:')) {
      setIsParsingDocx(true);
      (async () => {
        try {
          const base64Parts = resource.fileDataUrl!.split(',');
          if (base64Parts.length < 2) return;
          const base64Str = base64Parts[1];
          const binaryStr = atob(base64Str);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          const htmlResult = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
          const textResult = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });

          if (!isCancelled) {
            setParsedHtml(htmlResult.value || '');
            setParsedRawText(textResult.value || '');
            setIsParsingDocx(false);
          }
        } catch (err) {
          console.warn("Mammoth HTML parsing error:", err);
          if (!isCancelled) {
            setParsedHtml('');
            setParsedRawText(resource?.fullContent || '');
            setIsParsingDocx(false);
          }
        }
      })();
    } else {
      setParsedHtml('');
      setParsedRawText(resource?.fullContent || '');
      setIsParsingDocx(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [isOpen, resource, isDocx]);

  // Calculate Reading Stats
  const readingStats = useMemo(() => {
    const raw = pdfExtractedText || parsedRawText || resource?.fullContent || resource?.summary || '';
    const cleanWords = raw.trim().split(/\s+/).filter(Boolean);
    const wordCount = cleanWords.length;
    const minutes = Math.max(1, Math.ceil(wordCount / 200));
    return {
      wordCount,
      minutes,
      charCount: raw.length
    };
  }, [pdfExtractedText, parsedRawText, resource]);

  // Copy Full Text
  const handleCopyText = () => {
    const textToCopy = pdfExtractedText || parsedRawText || resource?.fullContent || resource?.summary || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  // Copy Summary
  const handleCopySummary = () => {
    if (!resource) return;
    const summaryText = `${resource.title} - AI Lesson Summary\nCourse: ${resource.courseCode} | Author: ${resource.author}\n\nSummary:\n${resource.summary || ''}\n\nKey Takeaways:\n${(resource.keyTakeaways || []).map(k => `• ${k}`).join('\n')}`;
    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Print Document Content
  const handlePrint = () => {
    if (!resource) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const title = resource.title;
    const author = resource.author;
    const course = resource.courseCode;
    const content = parsedHtml || `<div style="white-space: pre-wrap; font-family: sans-serif; line-height: 1.6;">${pdfExtractedText || parsedRawText || resource.fullContent || resource.summary || ''}</div>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - HTEIM School of Ministry</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; margin: 40px; color: #111; line-height: 1.6; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            .meta { font-size: 13px; color: #555; border-bottom: 2px solid #ccc; padding-bottom: 12px; margin-bottom: 24px; }
            p { margin-bottom: 14px; }
            h2, h3, h4 { margin-top: 20px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            ul, ol { margin-left: 24px; margin-bottom: 16px; }
            li { margin-bottom: 6px; }
            @media print { body { margin: 20mm; } }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">
            <strong>HTEIM School of Ministry</strong> | Course Code: ${course} | Instructor: ${author} | Document: ${resource.format}
          </div>
          <div>${content}</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Audio Playback Controls
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => {});
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setAudioCurrentTime(targetTime);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const nextIndex = (rates.indexOf(audioPlaybackRate) + 1) % rates.length;
    const newRate = rates[nextIndex];
    setAudioPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Highlighting in text for search and interactive scripture hover popovers
  const renderHighlightedText = (text: string) => {
    if (!text) return null;

    // Detect scriptures and tokenize
    const segments = parseTextWithScriptures(text);

    return segments.map((seg, sIdx) => {
      if (seg.type === 'scripture' && seg.scripture) {
        return (
          <ScriptureHoverPopover
            key={`sc_${sIdx}_${seg.scripture.cleanReference}`}
            scripture={seg.scripture}
            onOpenInBible={onOpenInBible}
          >
            {seg.content}
          </ScriptureHoverPopover>
        );
      }

      if (!searchQuery.trim()) {
        return <React.Fragment key={`txt_${sIdx}`}>{seg.content}</React.Fragment>;
      }

      const parts = seg.content.split(new RegExp(`(${searchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
      return (
        <React.Fragment key={`txt_${sIdx}`}>
          {parts.map((part, index) =>
            part.toLowerCase() === searchQuery.toLowerCase() ? (
              <mark key={index} className="bg-amber-300 text-slate-900 font-bold px-1 rounded">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </React.Fragment>
      );
    });
  };

  const activeTheme = THEME_STYLES[theme];

  // Early return after all hooks are declared
  if (!isOpen || !resource) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full flex flex-col rounded-xl shadow-xl overflow-hidden border border-slate-700/60 bg-slate-900 transition-all duration-200 ${
          isFullscreen
            ? 'fixed inset-0 z-50 rounded-none h-screen'
            : 'max-w-6xl max-h-[94vh] h-[90vh]'
        }`}
      >
        {/* ========================================================= */}
        {/* HEADER TOOLBAR */}
        {/* ========================================================= */}
        <div className="bg-slate-950 border-b border-slate-800 p-3 sm:px-5 flex items-center justify-between gap-3 text-white shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl shrink-0">
              {isPdf ? (
                <FileText className="w-5 h-5" />
              ) : isDocx ? (
                <BookOpen className="w-5 h-5 text-blue-400" />
              ) : isAudio ? (
                <Headphones className="w-5 h-5 text-emerald-400" />
              ) : isVideo ? (
                <Play className="w-5 h-5 text-rose-400" />
              ) : (
                <FileCode2 className="w-5 h-5 text-amber-400" />
              )}
            </div>

            <div className="overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 font-mono text-[10px] font-bold rounded-md border border-indigo-800/80">
                  {resource.courseCode}
                </span>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-semibold rounded-md">
                  {resource.format} • {resource.size}
                </span>
                <span className="text-slate-400 text-xs hidden sm:inline">•</span>
                <span className="text-slate-400 text-xs truncate hidden sm:inline">
                  Instructor: <strong className="text-slate-200">{resource.author}</strong>
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate mt-0.5" title={resource.title}>
                {resource.title}
              </h2>
            </div>
          </div>

          {/* Action buttons on top right */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Mark as Completed Toggle */}
            {onToggleComplete && (
              <button
                type="button"
                onClick={() => onToggleComplete(resource.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isCompleted
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:border-emerald-500/50'
                }`}
                title={isCompleted ? "Lesson completed (Click to unmark)" : "Mark lesson as completed"}
              >
                {isCompleted ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span className="hidden lg:inline">{isCompleted ? 'Completed' : 'Mark Completed'}</span>
              </button>
            )}

            {/* Send Summary & Takeaways to Class Notes */}
            <button
              type="button"
              onClick={handleSendSummaryToNotes}
              className="px-3 py-1.5 bg-indigo-950/90 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-700/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Add lesson overview & key takeaways to your Class Notes notebook"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Add to Notes</span>
            </button>

            {/* Toggle Summary Sidebar */}
            <button
              type="button"
              onClick={() => setShowSummarySidebar(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                showSummarySidebar
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Toggle AI Summary & Key Takeaways Panel"
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden md:inline">AI Summary</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-700"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={(e) => onDownload(resource, e)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-700"
              title="Download Original File"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-700 hidden sm:flex"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-700"
              title="Close Reader"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Note Created Notification Toast */}
        {noteCreatedToast && (
          <div className="p-2.5 bg-emerald-600 text-white text-xs font-extrabold text-center flex items-center justify-center gap-2 shadow-lg animate-fadeIn shrink-0">
            <Check className="w-4 h-4" />
            <span>{noteCreatedToast}</span>
            {onOpenNotes && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNotes();
                }}
                className="ml-2 underline font-black text-amber-200 hover:text-white cursor-pointer"
              >
                View in Class Notes →
              </button>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* SECONDARY TOOLBAR: Search, Themes, PDF Page Controls */}
        {/* ========================================================= */}
        {!isVideo && (
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            {/* PDF View Mode & Page Selector Controls */}
            {isPdf ? (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Mode toggle: Page Canvas vs Clean Text */}
                <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setPdfViewMode('canvas')}
                    className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all cursor-pointer ${
                      pdfViewMode === 'canvas'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Page View
                  </button>
                  <button
                    onClick={() => setPdfViewMode('text')}
                    className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all cursor-pointer ${
                      pdfViewMode === 'text'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <FileType className="w-3.5 h-3.5" /> Clean Text
                  </button>
                </div>

                {/* Page Navigation for Canvas Mode */}
                {pdfViewMode === 'canvas' && (
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-white">
                    <button
                      onClick={() => setPdfCurrentPage(p => Math.max(1, p - 1))}
                      disabled={pdfCurrentPage <= 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800 cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold px-1 text-indigo-300">
                      Page {pdfCurrentPage} of {pdfNumPages}
                    </span>
                    <button
                      onClick={() => setPdfCurrentPage(p => Math.min(pdfNumPages, p + 1))}
                      disabled={pdfCurrentPage >= pdfNumPages}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800 cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Zoom for Canvas */}
                {pdfViewMode === 'canvas' && (
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-white">
                    <button
                      onClick={() => setPdfScale(s => Math.max(0.8, s - 0.2))}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono font-bold text-slate-300 px-1">
                      {Math.round(pdfScale * 100)}%
                    </span>
                    <button
                      onClick={() => setPdfScale(s => Math.min(2.4, s + 0.2))}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Search in Document for DOCX/Text */
              <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search in document..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Typography and Reading Tools */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Font Size Controls (for Text / DOCX / PDF Text mode) */}
              {(!isPdf || pdfViewMode === 'text') && (
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => {
                      const sizes: FontSize[] = ['sm', 'base', 'lg', 'xl', '2xl'];
                      const curr = sizes.indexOf(fontSize);
                      if (curr > 0) setFontSize(sizes[curr - 1]);
                    }}
                    className="px-2 py-0.5 text-slate-300 hover:text-white font-bold text-xs rounded hover:bg-slate-800 cursor-pointer"
                    title="Decrease text size"
                  >
                    A-
                  </button>
                  <span className="text-[10px] font-mono text-indigo-400 font-bold px-1">
                    {FONT_SIZE_MAP[fontSize].label}
                  </span>
                  <button
                    onClick={() => {
                      const sizes: FontSize[] = ['sm', 'base', 'lg', 'xl', '2xl'];
                      const curr = sizes.indexOf(fontSize);
                      if (curr < sizes.length - 1) setFontSize(sizes[curr + 1]);
                    }}
                    className="px-2 py-0.5 text-slate-300 hover:text-white font-bold text-xs rounded hover:bg-slate-800 cursor-pointer"
                    title="Increase text size"
                  >
                    A+
                  </button>
                </div>
              )}

              {/* Reader Theme Palette */}
              {(!isPdf || pdfViewMode === 'text') && (
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {(['light', 'sepia', 'dark', 'contrast'] as ReaderTheme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                        theme === t
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {THEME_STYLES[t].name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}

              {/* Word Count / Estimated Reading Time */}
              <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400">
                <span>{readingStats.wordCount.toLocaleString()} words</span>
                <span>•</span>
                <span className="text-amber-400 font-medium">~{readingStats.minutes} min read</span>
              </div>

              {/* Copy Text */}
              <button
                onClick={handleCopyText}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-slate-700"
                title="Copy full text to clipboard"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MAIN READER BODY & SIDEBAR SPLIT */}
        {/* ========================================================= */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Reading Canvas */}
          <div 
            onMouseUp={handleMouseUpCapture}
            className={`flex-1 overflow-y-auto ${activeTheme.bg} ${activeTheme.text} transition-colors duration-150 relative flex flex-col`}
          >
            {/* Loading Indicator for DOCX parsing */}
            {isParsingDocx && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/90 text-white gap-3 p-6">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-sm font-bold">Rendering clean document layout from Word file...</p>
                <span className="text-xs text-slate-400">Converting headings, paragraphs, and tables</span>
              </div>
            )}

            {/* Document Header Banner */}
            <div className={`p-6 sm:p-10 border-b ${activeTheme.border} max-w-4xl mx-auto w-full`}>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                <span>{resource.category}</span>
                <span>•</span>
                <span>{resource.courseCode}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                {resource.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs opacity-75 font-medium">
                <span>Instructor: <strong>{resource.author}</strong></span>
                <span>Format: <strong>{resource.format}</strong></span>
                <span>File Size: <strong>{resource.size}</strong></span>
                {resource.uploadedAt && <span>Added: <strong>{resource.uploadedAt}</strong></span>}
              </div>
            </div>

            {/* Content Container by Format */}
            <div className="flex-1 p-4 sm:p-8 max-w-4xl mx-auto w-full">
              {/* PDF VIEWER (Canvas & Clean Text) */}
              {isPdf ? (
                <div className="space-y-4">
                  {pdfViewMode === 'canvas' ? (
                    <div className="flex flex-col items-center space-y-4">
                      {/* Canvas Container */}
                      <div className="w-full flex justify-center bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-xl overflow-x-auto min-h-[500px] relative">
                        {isRenderingPdf && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 z-10 text-white gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                            <span className="text-xs font-bold">Rendering Page {pdfCurrentPage}...</span>
                          </div>
                        )}
                        <canvas
                          ref={canvasRef}
                          className="max-w-full h-auto rounded-lg shadow-xl bg-white"
                        />
                      </div>

                      {/* Bottom Canvas Page Bar */}
                      <div className="flex items-center justify-between w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPdfCurrentPage(p => Math.max(1, p - 1))}
                            disabled={pdfCurrentPage <= 1}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                          >
                            <ChevronLeft className="w-4 h-4" /> Previous
                          </button>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                            Page {pdfCurrentPage} of {pdfNumPages}
                          </span>
                          <button
                            onClick={() => setPdfCurrentPage(p => Math.min(pdfNumPages, p + 1))}
                            disabled={pdfCurrentPage >= pdfNumPages}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                          >
                            Next <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPdfViewMode('text')}
                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 cursor-pointer"
                          >
                            <FileType className="w-3.5 h-3.5" /> Read Full Text
                          </button>
                          <button
                            onClick={(e) => onDownload(resource, e)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" /> Download PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* PDF Clean Text Extracted View */
                    <div className="space-y-4">
                      {pdfExtractedText ? (
                        <div className={`whitespace-pre-wrap leading-relaxed ${FONT_SIZE_MAP[fontSize].tailwind}`}>
                          {renderHighlightedText(pdfExtractedText)}
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                          <FileText className="w-10 h-10 mx-auto text-indigo-500" />
                          <h3 className="text-base font-bold">PDF Document Ready</h3>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Switch to Page View above to read the original layout or download the original file.
                          </p>
                          <button
                            onClick={() => setPdfViewMode('canvas')}
                            className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer"
                          >
                            Switch to Page View
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : isAudio ? (
                /* AUDIO LESSON PLAYER & TRANSCRIPT */
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-br from-indigo-900 to-slate-950 text-white rounded-xl shadow-xl border border-indigo-800/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
                          <Headphones className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                            Audio Lecture • {resource.courseCode}
                          </span>
                          <h3 className="text-base font-bold text-white">{resource.title}</h3>
                          <p className="text-xs text-slate-300 font-medium">Speaker: {resource.author}</p>
                        </div>
                      </div>

                      <button
                        onClick={cyclePlaybackRate}
                        className="px-2.5 py-1 bg-indigo-950 border border-indigo-700 text-indigo-300 hover:text-white font-mono text-xs font-bold rounded-lg cursor-pointer transition-all"
                        title="Change audio playback speed"
                      >
                        {audioPlaybackRate}x Speed
                      </button>
                    </div>

                    {/* Native Audio Element */}
                    <audio
                      ref={audioRef}
                      src={resource.fileDataUrl || resource.downloadUrl}
                      onTimeUpdate={() => {
                        if (audioRef.current) setAudioCurrentTime(audioRef.current.currentTime);
                      }}
                      onLoadedMetadata={() => {
                        if (audioRef.current) setAudioDuration(audioRef.current.duration);
                      }}
                      onEnded={() => setIsPlayingAudio(false)}
                      className="hidden"
                    />

                    {/* Seekbar */}
                    <div className="space-y-1">
                      <input
                        type="range"
                        min={0}
                        max={audioDuration || 100}
                        value={audioCurrentTime}
                        onChange={handleAudioSeek}
                        className="w-full h-2 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                      />
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>{formatAudioTime(audioCurrentTime)}</span>
                        <span>{formatAudioTime(audioDuration)}</span>
                      </div>
                    </div>

                    {/* Audio Controls */}
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => {
                          if (audioRef.current) {
                            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                          }
                        }}
                        className="p-2.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all cursor-pointer font-bold text-xs flex items-center gap-1"
                        title="Rewind 10 seconds"
                      >
                        <RotateCcw className="w-4 h-4" /> -10s
                      </button>

                      <button
                        onClick={togglePlayAudio}
                        className="w-14 h-14 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-all cursor-pointer transform hover:bg-slate-100 dark:hover:bg-slate-700"
                        title={isPlayingAudio ? "Pause" : "Play"}
                      >
                        {isPlayingAudio ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white ml-0.5" />}
                      </button>

                      <button
                        onClick={() => {
                          if (audioRef.current) {
                            audioRef.current.currentTime = Math.min(audioDuration, audioRef.current.currentTime + 10);
                          }
                        }}
                        className="p-2.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all cursor-pointer font-bold text-xs flex items-center gap-1"
                        title="Forward 10 seconds"
                      >
                        +10s
                      </button>
                    </div>
                  </div>

                  {/* Audio Transcript / Accompanying Lecture Text */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-500" /> Lecture Notes & Transcripts
                    </h3>
                    <div className={`p-6 rounded-xl border ${activeTheme.border} ${FONT_SIZE_MAP[fontSize].tailwind} leading-relaxed whitespace-pre-wrap`}>
                      {parsedRawText || resource.fullContent || (
                        <p className="italic opacity-60">No transcript provided for this audio lecture. AI executive summary is available in the right sidebar.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : isVideo ? (
                /* VIDEO VIEWER */
                <div className="space-y-4">
                  {videoDetails.embedUrl && (videoDetails.isYouTube || videoDetails.isVimeo || videoDetails.isLoom || videoDetails.isDrive) ? (
                    <div className="space-y-3">
                      <div className="w-full h-[65vh] rounded-xl bg-slate-950 overflow-hidden shadow-xl border border-slate-800 relative">
                        <iframe
                          src={videoDetails.embedUrl}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          title={resource.title || 'Video Player'}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex-wrap gap-2">
                        <span className="font-semibold text-slate-300">
                          Platform: <strong className="text-white capitalize">{videoDetails.type}</strong> {videoDetails.fileId ? `(ID: ${videoDetails.fileId})` : ''}
                        </span>
                        <div className="flex items-center gap-3">
                          {videoDetails.directWatchUrl && (
                            <a
                              href={videoDetails.directWatchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1.5 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Watch on {videoDetails.isYouTube ? 'YouTube' : videoDetails.isVimeo ? 'Vimeo' : videoDetails.isDrive ? 'Google Drive' : 'Original Site'}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <video
                      controls
                      src={resource.downloadUrl || resource.fileDataUrl}
                      className="w-full h-[65vh] rounded-xl bg-slate-950 object-contain shadow-xl border border-slate-800"
                    />
                  )}

                  {/* Video Lesson Notes */}
                  {(parsedRawText || resource.fullContent) && (
                    <div className="mt-6">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Lesson Notes & Reference Study Text
                      </h3>
                      <div className={`p-6 rounded-xl border ${activeTheme.border} ${FONT_SIZE_MAP[fontSize].tailwind} leading-relaxed whitespace-pre-wrap`}>
                        {parsedRawText || resource.fullContent}
                      </div>
                    </div>
                  )}
                </div>
              ) : parsedHtml ? (
                /* RICH DOCX / HTML FORMATTED VIEW */
                <div
                  className={`docx-reader-content ${FONT_SIZE_MAP[fontSize].tailwind} space-y-4`}
                  dangerouslySetInnerHTML={{ __html: parsedHtml }}
                />
              ) : (
                /* FORMATTED TEXT / MARKDOWN FALLBACK */
                <div className={`space-y-4 ${FONT_SIZE_MAP[fontSize].tailwind}`}>
                  {parsedRawText || resource.fullContent ? (
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {renderHighlightedText(parsedRawText || resource.fullContent || '')}
                    </div>
                  ) : (
                    <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                      <BookOpen className="w-10 h-10 mx-auto text-indigo-500 opacity-60" />
                      <p className="text-sm font-semibold">
                        This document file is stored in native format.
                      </p>
                      <p className="text-xs opacity-75 max-w-md mx-auto">
                        You can download the full original file anytime or reference the AI Executive Summary and Key Takeaways generated by Gemini.
                      </p>
                      <button
                        onClick={(e) => onDownload(resource, e)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Download className="w-4 h-4" /> Download Original File ({resource.size})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Floating Selection Toolbar for Class Notes */}
            {selectedText && (
              <div className="sticky bottom-4 z-40 mx-auto max-w-md p-2.5 bg-slate-900/95 text-white border border-indigo-500/50 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-slideUp">
                <div className="flex items-center gap-2 overflow-hidden text-xs">
                  <Pin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate italic font-serif opacity-90">"{selectedText.slice(0, 35)}..."</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSendSelectedToNotes}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Send to Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedText('')}
                    className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* AI SUMMARY & KEY TAKEAWAYS SIDEBAR DRAWER */}
          {/* ========================================================= */}
          {showSummarySidebar && (
            <div className="w-80 sm:w-96 bg-slate-950 border-l border-slate-800 flex flex-col shrink-0 text-white overflow-hidden animate-fadeIn">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    AI Lesson Summary
                  </h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopySummary}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                    title="Copy AI Summary & Takeaways"
                  >
                    {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setShowSummarySidebar(false)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                    title="Close Summary Panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* Executive Summary */}
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[10px] uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" /> Executive Overview
                    </span>

                    {onGenerateSummary && (
                      <button
                        onClick={() => onGenerateSummary(resource)}
                        disabled={isGeneratingSummary}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800 cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingSummary ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Updating...
                          </span>
                        ) : (
                          'Regenerate'
                        )}
                      </button>
                    )}
                  </div>

                  {resource.summary ? (
                    <p className="text-slate-300 leading-relaxed font-normal">
                      {resource.summary}
                    </p>
                  ) : (
                    <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg space-y-2">
                      <p className="text-amber-300 text-xs">No AI summary generated yet for this resource.</p>
                      {onGenerateSummary && (
                        <button
                          onClick={() => onGenerateSummary(resource)}
                          disabled={isGeneratingSummary}
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                        >
                          Generate AI Summary
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Key Takeaways */}
                {resource.keyTakeaways && resource.keyTakeaways.length > 0 && (
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <span className="font-extrabold text-[10px] uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Key Learning Takeaways
                    </span>
                    <div className="space-y-2">
                      {resource.keyTakeaways.map((point, index) => (
                        <div key={index} className="flex items-start gap-2 text-slate-300">
                          <span className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <span className="leading-snug">{renderHighlightedText(point)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Curriculum Details */}
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-slate-400 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span>Course Code</span>
                    <span className="font-mono font-bold text-white">{resource.courseCode}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span>Instructor</span>
                    <span className="font-semibold text-white">{resource.author}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span>Category</span>
                    <span className="font-semibold text-white">{resource.category}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span>Format / Size</span>
                    <span className="font-semibold text-white">{resource.format} ({resource.size})</span>
                  </div>
                  {resource.uploadedAt && (
                    <div className="flex justify-between py-1">
                      <span>Upload Date</span>
                      <span className="text-slate-300">{resource.uploadedAt}</span>
                    </div>
                  )}
                </div>

                {/* Edit Resource Link for Faculty/Admin */}
                {!isStudent && onEdit && (
                  <button
                    onClick={() => {
                      onEdit(resource);
                      onClose();
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit Lesson Metadata
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* FOOTER BAR */}
        {/* ========================================================= */}
        <div className="bg-slate-950 border-t border-slate-800 px-4 py-2 flex items-center justify-between gap-3 text-xs shrink-0 text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">HTEIM School of Ministry</span>
            <span>•</span>
            <span>{resource.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={(e) => onDownload(resource, e)}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Download File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
