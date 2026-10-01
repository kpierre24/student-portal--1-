import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, ExternalLink, Loader2, Sparkles, X, Check, Copy } from 'lucide-react';
import { pullPassage, getBibleChapter } from '../services/bibleService';
import { DetectedScripture } from '../utils/scriptureDetector';

interface ScriptureHoverPopoverProps {
  scripture: DetectedScripture;
  onOpenInBible?: (bookId: string, chapter: number, verse?: number) => void;
  children?: React.ReactNode;
}

export const ScriptureHoverPopover: React.FC<ScriptureHoverPopoverProps> = ({
  scripture,
  onOpenInBible,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verseText, setVerseText] = useState<{ amp?: string; kjv?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'AMP' | 'KJV'>('AMP');

  const containerRef = useRef<HTMLSpanElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Fetch scripture text when opened
  useEffect(() => {
    if (!isOpen || verseText) return;

    let isMounted = true;
    setIsLoading(true);

    const loadPassage = async () => {
      try {
        // Try getting the chapter first
        const chapterData = await getBibleChapter(scripture.bookId, scripture.chapter, 'parallel');
        if (isMounted && chapterData && chapterData.verses.length > 0) {
          if (scripture.verse) {
            const startV = scripture.verse;
            const endV = scripture.endVerse || scripture.verse;
            const matchedVerses = chapterData.verses.filter(
              v => v.verse >= startV && v.verse <= endV
            );

            if (matchedVerses.length > 0) {
              const ampCombined = matchedVerses
                .map(v => (matchedVerses.length > 1 ? `[${v.verse}] ` : '') + (v.amp || v.text || ''))
                .join(' ');
              const kjvCombined = matchedVerses
                .map(v => (matchedVerses.length > 1 ? `[${v.verse}] ` : '') + (v.kjv || v.text || ''))
                .join(' ');

              setVerseText({ amp: ampCombined, kjv: kjvCombined });
              setIsLoading(false);
              return;
            }
          }
        }

        // Fallback: pull passage directly by string
        const passageData = await pullPassage(scripture.cleanReference, 'parallel');
        if (isMounted && passageData) {
          const text = passageData.text || passageData.amp || passageData.kjv || '';
          setVerseText({
            amp: passageData.amp || text,
            kjv: passageData.kjv || text
          });
        }
      } catch (err) {
        console.warn('Failed to load scripture popup passage:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadPassage();

    return () => {
      isMounted = false;
    };
  }, [isOpen, scripture, verseText]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `${scripture.cleanReference} (${activeTab}): ${
      activeTab === 'AMP' ? verseText?.amp || '' : verseText?.kjv || ''
    }`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span ref={containerRef} className="relative inline-block my-0.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 transition-all cursor-pointer shadow-2xs group"
        title={`Click to read ${scripture.cleanReference}`}
      >
        <BookOpen className="w-3 h-3 text-indigo-500 group-hover:scale-110 transition-transform" />
        <span>{children || scripture.cleanReference}</span>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={scripture.cleanReference}
          className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-80 sm:w-96 p-4 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-indigo-200 dark:border-indigo-900/80 shadow-2xl animate-fadeIn text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-3.5 h-3.5" />
              </span>
              <h4 className="font-extrabold text-xs text-indigo-950 dark:text-indigo-200">
                {scripture.cleanReference}
              </h4>
            </div>

            <div className="flex items-center gap-1">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('AMP')}
                  className={`px-1.5 py-0.5 rounded ${
                    activeTab === 'AMP'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  AMP
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('KJV')}
                  className={`px-1.5 py-0.5 rounded ${
                    activeTab === 'KJV'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  KJV
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                title="Copy scripture"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="py-3 text-xs leading-relaxed max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-[11px]">Loading scripture passage...</span>
              </div>
            ) : verseText ? (
              <p className="font-serif text-slate-700 dark:text-slate-300 italic">
                "{activeTab === 'AMP' ? verseText.amp || verseText.kjv : verseText.kjv || verseText.amp}"
              </p>
            ) : (
              <p className="text-slate-400 text-[11px] italic">
                Scripture text not found locally. Click below to view in the Bible Reader.
              </p>
            )}
          </div>

          {/* Footer Actions */}
          {onOpenInBible && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenInBible(scripture.bookId, scripture.chapter, scripture.verse);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <span>Read in Full Bible Reader</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </span>
  );
};
