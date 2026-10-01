import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Search,
  X,
  Download,
  Printer,
  Bookmark,
  RefreshCw,
  FileText,
  AlertCircle,
  ArrowRight,
  Sliders,
  Expand,
  Check
} from 'lucide-react';
import { ViewerBaseProps } from './types';
import {
  dataUrlToUint8Array,
  extractTextFromPdfData,
  renderPdfPageToCanvas,
  PdfDocumentInfo
} from '../../../../lib/pdfUtils';

interface SearchMatch {
  page: number;
  snippet: string;
}

export const PdfViewer: React.FC<ViewerBaseProps> = ({
  resource,
  onClose,
  canDownload = true,
  canPrint = true,
  studentId,
  initialPage,
  className = '',
  onProgressUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Storage key for "Continue reading"
  const storageKey = `hteim_pdf_progress_${studentId ? `${studentId}_` : ''}${resource.id}`;

  // PDF State
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage || 1);
  const [numPages, setNumPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.25);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Direct URL fallback when byte parsing cannot be performed
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);

  // Jump to page input
  const [pageInput, setPageInput] = useState<string>('1');

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pdfDocInfo, setPdfDocInfo] = useState<PdfDocumentInfo | null>(null);
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // "Continue reading" prompt state
  const [savedPagePrompt, setSavedPagePrompt] = useState<number | null>(null);
  const [hasDismissedResume, setHasDismissedResume] = useState<boolean>(false);

  // Touch swipe handling for mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Resolve PDF source URL or data
  const rawUrl = (resource as any).downloadUrl || (resource as any).url || (resource as any).fileDataUrl || '';
  const isDownloadPermitted = canDownload && (resource as any).isDownloadable !== false;
  const isPrintPermitted = canPrint;

  // 1. Initial Load: Check for saved progress & load PDF bytes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setRenderError(null);

    // Check localStorage for "Continue reading"
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedSaved = parseInt(saved, 10);
        if (!isNaN(parsedSaved) && parsedSaved > 1 && !initialPage) {
          setSavedPagePrompt(parsedSaved);
        }
      }
    } catch {
      // Ignore localStorage access issues
    }

    async function loadPdf() {
      try {
        let bytes: Uint8Array | null = null;

        if (rawUrl.startsWith('data:')) {
          bytes = dataUrlToUint8Array(rawUrl);
        } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
          try {
            const resp = await fetch(rawUrl, { mode: 'cors' });
            if (resp.ok) {
              const buffer = await resp.arrayBuffer();
              bytes = new Uint8Array(buffer);
            } else {
              setUseIframeFallback(true);
            }
          } catch {
            // CORS or network failure -> fallback to native iframe viewer
            setUseIframeFallback(true);
          }
        }

        if (!isMounted) return;

        if (bytes && bytes.length > 0) {
          setPdfBytes(bytes);
          // Pre-extract text for in-doc search
          extractTextFromPdfData(bytes)
            .then((info) => {
              if (isMounted) {
                setPdfDocInfo(info);
                if (info.numPages > 0) {
                  setNumPages(info.numPages);
                }
              }
            })
            .catch(() => {});
        } else if (!useIframeFallback) {
          setUseIframeFallback(true);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('PDF load error, using fallback:', err);
          setUseIframeFallback(true);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [rawUrl, storageKey, initialPage]);

  // 2. Render Page to Canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfBytes || !canvasRef.current || useIframeFallback) return;

    try {
      setRenderError(null);
      const result = await renderPdfPageToCanvas(pdfBytes, currentPage, canvasRef.current, scale);
      if (!result) {
        setRenderError('Could not render page. Please try zooming out or reloading.');
      }
    } catch (err: any) {
      console.error('Canvas render error:', err);
      setRenderError('Rendering error on page ' + currentPage);
    }
  }, [pdfBytes, currentPage, scale, useIframeFallback]);

  useEffect(() => {
    if (pdfBytes) {
      renderCurrentPage();
    }
  }, [pdfBytes, currentPage, scale, renderCurrentPage]);

  // 3. Keep page input in sync
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // 4. Save reading progress for "Continue reading"
  useEffect(() => {
    if (currentPage > 0) {
      try {
        localStorage.setItem(storageKey, currentPage.toString());
      } catch {
        // Ignore
      }

      onProgressUpdate?.({
        currentPage,
        totalPages: numPages,
        completed: currentPage >= numPages
      });
    }
  }, [currentPage, numPages, storageKey, onProgressUpdate]);

  // Navigation handlers
  const goToPage = useCallback(
    (page: number) => {
      const max = numPages > 1 ? numPages : Math.max(page, 1);
      const target = Math.max(1, Math.min(page, max));
      setCurrentPage(target);
      setPageInput(target.toString());
      // Dismiss the resume prompt once user navigates
      setSavedPagePrompt(null);
    },
    [numPages]
  );

  const handlePrevPage = () => goToPage(currentPage - 1);
  const handleNextPage = () => goToPage(currentPage + 1);
  const handleFirstPage = () => goToPage(1);
  const handleLastPage = () => goToPage(numPages);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setScale((prev) => Math.min(3.0, Number((prev + 0.25).toFixed(2))));
  const handleZoomOut = () => setScale((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))));
  const handleFitWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 48;
      // Standard A4 width is ~595pt. Calculate optimal scale
      const optimalScale = Math.max(0.75, Math.min(2.5, containerWidth / 600));
      setScale(Number(optimalScale.toFixed(2)));
    }
  };
  const handleFitPage = () => setScale(1.0);

  // Fullscreen handlers
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

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleFirstPage();
      } else if (e.key === 'End') {
        e.preventDefault();
        handleLastPage();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages]);

  // Mobile Touch Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    // Horizontal swipe must be stronger than vertical scroll
    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        handleNextPage(); // Swiped left -> next
      } else {
        handlePrevPage(); // Swiped right -> prev
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Search logic across extracted PDF pages
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !pdfDocInfo || !pdfDocInfo.pageTexts) {
      setSearchResults([]);
      setCurrentMatchIndex(-1);
      return;
    }

    setIsSearching(true);
    const qLower = query.toLowerCase();
    const matches: SearchMatch[] = [];

    pdfDocInfo.pageTexts.forEach((text, idx) => {
      const pageNum = idx + 1;
      const lower = text.toLowerCase();
      const pos = lower.indexOf(qLower);
      if (pos !== -1) {
        const start = Math.max(0, pos - 30);
        const end = Math.min(text.length, pos + query.length + 40);
        const snippet = (start > 0 ? '...' : '') + text.slice(start, end).trim() + (end < text.length ? '...' : '');
        matches.push({ page: pageNum, snippet });
      }
    });

    setSearchResults(matches);
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      goToPage(matches[0].page);
    } else {
      setCurrentMatchIndex(-1);
    }
    setIsSearching(false);
  };

  const handleNextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchResults.length;
    setCurrentMatchIndex(nextIdx);
    goToPage(searchResults[nextIdx].page);
  };

  const handlePrevMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentMatchIndex(prevIdx);
    goToPage(searchResults[prevIdx].page);
  };

  // Download handler
  const handleDownload = () => {
    if (!isDownloadPermitted) return;
    const link = document.createElement('a');
    link.href = rawUrl;
    link.download = (resource as any).fileName || `${resource.title || 'document'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print handler
  const handlePrint = () => {
    if (!isPrintPermitted) return;
    if (canvasRef.current) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head><title>${resource.title} - Page ${currentPage}</title></head>
            <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh;">
              <img src="${canvasRef.current.toDataURL()}" style="max-width:100%; max-height:100%; object-fit:contain;" />
            </body>
          </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => {
          win.print();
        }, 300);
      }
    } else {
      window.print();
    }
  };

  // Continue reading action
  const handleResumeSavedPage = () => {
    if (savedPagePrompt) {
      if (numPages < savedPagePrompt) {
        setNumPages(savedPagePrompt);
      }
      goToPage(savedPagePrompt);
      setSavedPagePrompt(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none overflow-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. TOP MAIN TOOLBAR */}
      <header className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-950 border-b border-slate-800 gap-2 flex-wrap sm:flex-nowrap">
        {/* Left: Document Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[160px] sm:max-w-xs md:max-w-md">
              {resource.title || 'PDF Document'}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="font-semibold text-rose-400">PDF</span>
              {numPages > 1 && <span>• {numPages} pages</span>}
            </div>
          </div>
        </div>

        {/* Center: Page Controls (Navigation) */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={handleFirstPage}
            disabled={currentPage <= 1}
            title="First Page (Home)"
            aria-label="First page"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            title="Previous Page (Left Arrow)"
            aria-label="Previous page"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page input form */}
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 px-1">
            <input
              type="text"
              inputMode="numeric"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => setPageInput(currentPage.toString())}
              aria-label="Page number"
              className="w-10 sm:w-12 text-center text-xs font-bold bg-slate-950 border border-slate-700 rounded-md py-1 text-white focus:outline-none focus:border-rose-500"
            />
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
              / {numPages || 1}
            </span>
          </form>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            title="Next Page (Right Arrow)"
            aria-label="Next page"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleLastPage}
            disabled={currentPage >= numPages}
            title="Last Page (End)"
            aria-label="Last page"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Zoom, Search, Print, Download, Fullscreen */}
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <div className="hidden md:flex items-center gap-0.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              title="Zoom Out"
              aria-label="Zoom out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-1 text-slate-300 min-w-[42px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
              title="Zoom In"
              aria-label="Zoom in"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleFitWidth}
              title="Fit to Width"
              className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              Fit
            </button>
          </div>

          {/* Search button */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen((prev) => !prev);
              if (!isSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
            title="Search Document (Ctrl+F)"
            aria-label="Search"
            className={`p-2 rounded-xl border transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
              isSearchOpen
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Print button (where permitted) */}
          {isPrintPermitted && (
            <button
              type="button"
              onClick={handlePrint}
              title="Print Document"
              aria-label="Print"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}

          {/* Download button (where permitted) */}
          {isDownloadPermitted ? (
            <button
              type="button"
              onClick={handleDownload}
              title="Download PDF"
              aria-label="Download"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              title="Downloads restricted for this resource"
              className="p-2 rounded-xl text-slate-600 border border-slate-800/50 cursor-not-allowed opacity-40 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle fullscreen"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close button if provided */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close Viewer"
              aria-label="Close"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-rose-600/80 border border-slate-800 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. CONTINUE READING BANNER (When saved page > 1 exists) */}
      {savedPagePrompt && !hasDismissedResume && (
        <div className="shrink-0 bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 border-b border-rose-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs z-10 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-rose-200">
            <Bookmark className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>Continue reading:</strong> You left off on <strong>page {savedPagePrompt}</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResumeSavedPage}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all text-xs"
            >
              Continue from page {savedPagePrompt}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setHasDismissedResume(true);
                setSavedPagePrompt(null);
              }}
              title="Start from page 1"
              className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs transition-colors"
            >
              Start from beginning
            </button>
          </div>
        </div>
      )}

      {/* 3. SEARCH BAR DRAWER (In-Document Search) */}
      {isSearchOpen && (
        <div className="shrink-0 bg-slate-950/95 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                placeholder="Search across PDF text..."
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {searchQuery && (
              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                {searchResults.length > 0
                  ? `Match ${currentMatchIndex + 1} of ${searchResults.length}`
                  : 'No matches found'}
              </span>
            )}
            <button
              type="button"
              onClick={handlePrevMatch}
              disabled={searchResults.length === 0}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-700 rounded text-[11px] font-semibold transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={handleNextMatch}
              disabled={searchResults.length === 0}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-700 rounded text-[11px] font-semibold transition-colors"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN PDF CANVAS DISPLAY AREA */}
      <div className="flex-1 overflow-auto bg-slate-950 p-2 sm:p-6 flex flex-col items-center justify-start relative">
        {isLoading ? (
          <div className="my-auto flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
            <p className="text-xs font-semibold">Rendering PDF page {currentPage}...</p>
          </div>
        ) : useIframeFallback ? (
          /* Fallback to browser embedded PDF viewer */
          <div className="w-full h-full flex flex-col items-center">
            <iframe
              src={`${rawUrl}#page=${currentPage}`}
              className="w-full h-full border-0 rounded-xl bg-white shadow-2xl"
              title={resource.title || 'PDF Viewer'}
            />
          </div>
        ) : renderError ? (
          <div className="my-auto max-w-md p-6 bg-slate-900 border border-red-500/30 rounded-2xl text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-white">Rendering Issue</h3>
            <p className="text-xs text-slate-400">{renderError}</p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={renderCurrentPage}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
              <button
                type="button"
                onClick={() => setUseIframeFallback(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Use Native Viewer
              </button>
            </div>
          </div>
        ) : (
          <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white max-w-full my-auto transition-all">
            <canvas ref={canvasRef} className="block max-w-full h-auto" />
          </div>
        )}
      </div>

      {/* 5. MOBILE & BOTTOM FLOATING BAR (Controls for small screens & reading progress) */}
      <footer className="shrink-0 bg-slate-950 border-t border-slate-800 px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">
            Page {currentPage} of {numPages || 1}
          </span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            ({Math.round(((currentPage) / (numPages || 1)) * 100)}% read)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-28 sm:w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden mx-2">
          <div
            className="bg-rose-500 h-full transition-all duration-300"
            style={{ width: `${Math.round(((currentPage) / (numPages || 1)) * 100)}%` }}
          />
        </div>

        {/* Quick mobile zoom toggles */}
        <div className="flex items-center gap-1 sm:hidden">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded border border-slate-800 min-w-[32px] min-h-[32px] flex items-center justify-center"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono px-1">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded border border-slate-800 min-w-[32px] min-h-[32px] flex items-center justify-center"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
          <span>Use ← → keys or swipe to navigate</span>
        </div>
      </footer>
    </div>
  );
};
