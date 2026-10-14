import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Copy,
  Check,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  FileText,
  BookMarked
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getBibleBooksCatalog,
  getBibleChapter,
  BibleBookMeta,
  ScriptureChapterResult
} from '../services/bibleService';
import { safeStorage } from '../lib/safeStorage';

interface StudentNotesBibleTabProps {
  currentStudentName?: string;
  userRole?: string;
  availableClassDays?: { id: string; name: string; date?: string }[];
  onNavigateTab?: (tab: string) => void;
}

interface BibleNote {
  id: string;
  reference: string;
  title: string;
  content: string;
  date: string;
}

export const StudentNotesBibleTab: React.FC<StudentNotesBibleTabProps> = ({
  currentStudentName = 'Student',
  userRole = 'student',
  availableClassDays = [],
  onNavigateTab
}) => {
  // --- Bible State ---
  const [bibleBooks, setBibleBooks] = useState<BibleBookMeta[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [selectedBookId, setSelectedBookId] = useState<string>('2ti');
  const [selectedChapterNumber, setSelectedChapterNumber] = useState<number>(2);
  const [bibleSearchQuery, setBibleSearchQuery] = useState<string>('');
  const [bibleSearchResults, setBibleSearchResults] = useState<
    { reference: string; text: string; translation: string }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [bibleFontSize, setBibleFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [copiedVerse, setCopiedVerse] = useState<string | null>(null);
  const [bibleTranslation, setBibleTranslation] = useState<'AMP' | 'KJV' | 'parallel'>('AMP');

  // Dynamic chapter data
  const [currentChapterData, setCurrentChapterData] = useState<ScriptureChapterResult | null>(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');

  // --- Simplified Scripture Notes State ---
  const [notes, setNotes] = useState<BibleNote[]>(() => {
    const saved = safeStorage.getJSON<BibleNote[]>('hteim_minimalist_bible_notes', []);
    if (saved && saved.length > 0) return saved;
    return [
      {
        id: 'note-1',
        reference: '2 Timothy 2:15',
        title: 'Study & Approved Workman',
        content: 'Study and do your utmost to present yourself approved unto God, a workman that needeth not to be ashamed, accurately handling the word of truth.',
        date: new Date().toISOString().split('T')[0]
      }
    ];
  });
  const [activeNoteId, setActiveNoteId] = useState<string>('note-1');
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);

  // Active note lookup
  const activeNote = useMemo(
    () => notes.find(n => n.id === activeNoteId) || notes[0] || null,
    [notes, activeNoteId]
  );

  // Save notes
  useEffect(() => {
    safeStorage.setJSON('hteim_minimalist_bible_notes', notes);
  }, [notes]);

  // Current book metadata
  const currentBookMeta = useMemo(
    () => bibleBooks.find(b => b.id === selectedBookId) || null,
    [bibleBooks, selectedBookId]
  );
  const chapterCount = currentBookMeta?.chaptersCount || 1;

  // --- Load Bible Books Catalog ---
  useEffect(() => {
    setBooksLoading(true);
    getBibleBooksCatalog()
      .then(books => setBibleBooks(books))
      .catch(() => toast.error('Could not load Bible catalog. Using offline fallback.'))
      .finally(() => setBooksLoading(false));
  }, []);

  // --- Load Chapter ---
  const chapterLoadRef = useRef<number>(0);
  const loadChapter = useCallback(async () => {
    const loadId = ++chapterLoadRef.current;
    setChapterLoading(true);
    setChapterError(null);

    try {
      const result = await getBibleChapter(selectedBookId, selectedChapterNumber, bibleTranslation);
      if (loadId !== chapterLoadRef.current) return;

      setCurrentChapterData(result);
      setDataSource(result.source || 'local_json');
    } catch (err) {
      if (loadId !== chapterLoadRef.current) return;
      setChapterError('Failed to load chapter. Please check your connection.');
      setCurrentChapterData(null);
    } finally {
      if (loadId === chapterLoadRef.current) {
        setChapterLoading(false);
      }
    }
  }, [selectedBookId, selectedChapterNumber, bibleTranslation]);

  useEffect(() => {
    loadChapter();
  }, [loadChapter]);

  // --- Bible Search ---
  const searchTimeoutRef = useRef<any>(null);
  useEffect(() => {
    if (!bibleSearchQuery || bibleSearchQuery.trim().length < 3) {
      setBibleSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/bible/passage?ref=${encodeURIComponent(bibleSearchQuery)}&translation=${bibleTranslation}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.verses)) {
            const results = json.verses.map((v: any) => ({
              reference: `${v.book_name || json.reference} ${v.chapter}:${v.verse}`,
              text: (v.text || '').trim(),
              translation: bibleTranslation
            }));
            setBibleSearchResults(results);
          }
        }
      } catch {
        setBibleSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 600);
  }, [bibleSearchQuery, bibleTranslation]);

  // --- Note Actions ---
  const handleCreateNote = (defaultRef = `${currentBookMeta?.name || 'Scripture'} ${selectedChapterNumber}`) => {
    const newNote: BibleNote = {
      id: `note-${Date.now()}`,
      reference: defaultRef,
      title: `Reflection on ${defaultRef}`,
      content: 'Write your spiritual takeaways and personal devotion here...',
      date: new Date().toISOString().split('T')[0]
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    toast.success('Created new devotional note');
  };

  const handleUpdateActiveNote = (updates: Partial<BibleNote>) => {
    if (!activeNote) return;
    setNotes(prev =>
      prev.map(n => (n.id === activeNote.id ? { ...n, ...updates } : n))
    );
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notes.length <= 1) {
      toast.error('You must keep at least one note.');
      return;
    }
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    if (activeNoteId === id) {
      setActiveNoteId(updated[0].id);
    }
    toast.success('Note deleted');
  };

  const handleInsertVerseToNote = (verseText: string, referenceStr: string) => {
    if (!activeNote) {
      handleCreateNote(referenceStr);
      return;
    }
    const newContent = `${activeNote.content}\n\n> **${referenceStr}**\n> "${verseText}"\n`;
    handleUpdateActiveNote({ content: newContent });
    toast.success(`Inserted ${referenceStr} into active note`);
  };

  const handleCopyScripture = (text: string, refStr: string) => {
    navigator.clipboard.writeText(`"${text}" — ${refStr}`);
    setCopiedVerse(refStr);
    toast.success('Copied verse to clipboard');
    setTimeout(() => setCopiedVerse(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#023264] to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold tracking-wider uppercase mb-1">
            <BookMarked className="w-4 h-4" />
            <span>HTEIM School of Ministry — Minimalist Study & Scripture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Scripture Reading & Devotional Journal
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Distraction-free Bible reading across multiple translations with an integrated, simplified note-taking pad for spiritual revelations.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={() => setShowRecommendationsModal(true)}
            className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Module Evaluation & Recommendations</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid: Bible Reader (Left/Main) & Simplified Notes (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Bible Reader Workspace (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          
          {/* Reader Top Controls */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            
            {/* Book & Chapter Selection */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedBookId}
                onChange={e => {
                  setSelectedBookId(e.target.value);
                  setSelectedChapterNumber(1);
                }}
                disabled={booksLoading}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
              >
                {bibleBooks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1">
                <span className="text-[11px] text-slate-400 uppercase font-bold mr-1">Ch:</span>
                <select
                  value={selectedChapterNumber}
                  onChange={e => setSelectedChapterNumber(Number(e.target.value))}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: chapterCount }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 ml-1">/ {chapterCount}</span>
              </div>
            </div>

            {/* Translation & Font Size */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg">
                {(['AMP', 'KJV', 'parallel'] as const).map(tr => (
                  <button
                    key={tr}
                    onClick={() => setBibleTranslation(tr)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                      bibleTranslation === tr
                        ? 'bg-[#023264] text-amber-300 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tr.toUpperCase()}
                  </button>
                ))}
              </div>

              <select
                value={bibleFontSize}
                onChange={e => setBibleFontSize(e.target.value as any)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="normal">Normal Text</option>
                <option value="large">Large Text</option>
                <option value="xlarge">Extra Large</option>
              </select>
            </div>
          </div>

          {/* Search Bar for Bible */}
          <div className="p-3 bg-slate-100/60 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 ml-1" />
            <input
              type="text"
              placeholder="Search scripture passages (e.g. John 3:16, Romans 8:28)..."
              value={bibleSearchQuery}
              onChange={e => setBibleSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
            />
            {bibleSearchQuery && (
              <button
                onClick={() => setBibleSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Reader Body */}
          <div className="p-6 min-h-[420px] max-h-[600px] overflow-y-auto space-y-4">
            
            {/* If searching */}
            {bibleSearchQuery.trim().length >= 3 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span>Search Results for "{bibleSearchQuery}"</span>
                  <span>{searchLoading ? 'Searching...' : `${bibleSearchResults.length} found`}</span>
                </div>

                {searchLoading ? (
                  <div className="py-12 text-center text-sm text-slate-400">Searching scriptures...</div>
                ) : bibleSearchResults.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">No verses found matching query.</div>
                ) : (
                  bibleSearchResults.map((res, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1 group hover:border-amber-500/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                          {res.reference} ({res.translation})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyScripture(res.text, res.reference)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer text-xs"
                            title="Copy"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleInsertVerseToNote(res.text, res.reference)}
                            className="px-2 py-0.5 bg-[#023264] text-amber-300 font-bold text-[10px] rounded hover:bg-[#022347] cursor-pointer"
                          >
                            Insert to Note
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-serif text-slate-800 dark:text-slate-200 leading-relaxed">
                        {res.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Normal Chapter View
              <div>
                {chapterLoading ? (
                  <div className="py-20 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                    <span>Loading {currentBookMeta?.name || selectedBookId} chapter {selectedChapterNumber}...</span>
                  </div>
                ) : chapterError ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 rounded-xl text-sm">
                    {chapterError}
                  </div>
                ) : !currentChapterData || currentChapterData.verses.length === 0 ? (
                  <div className="py-20 text-center text-sm text-slate-400">
                    No verses available for this chapter.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white font-serif">
                        {currentBookMeta?.name || selectedBookId} Chapter {selectedChapterNumber}
                      </h2>
                      <span className="text-xs font-mono text-slate-400 uppercase">
                        {bibleTranslation} • Source: {dataSource}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {currentChapterData.verses.map((v) => {
                        const bookName = currentBookMeta?.name || selectedBookId;
                        const verseRef = `${bookName} ${selectedChapterNumber}:${v.verse} (${bibleTranslation})`;
                        const displayText =
                          bibleTranslation === 'KJV'
                            ? v.kjv || v.text
                            : bibleTranslation === 'AMP'
                            ? v.amp || v.text
                            : `[AMP] ${v.amp || v.text}\n[KJV] ${v.kjv || v.text}`;

                        return (
                          <div
                            key={v.verse}
                            className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 transition-colors group space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400">
                                {bookName} {selectedChapterNumber}:{v.verse}
                              </span>

                              <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleCopyScripture(displayText || '', verseRef)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs cursor-pointer"
                                  title="Copy Verse"
                                >
                                  {copiedVerse === verseRef ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleInsertVerseToNote(displayText || '', verseRef)}
                                  className="px-2 py-0.5 bg-[#023264] hover:bg-[#022347] text-amber-300 font-bold text-[10px] rounded-md flex items-center gap-1 cursor-pointer border border-amber-500/30 shadow-2xs"
                                  title="Insert into active note"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Insert to Note</span>
                                </button>
                              </div>
                            </div>

                            <p
                              className={`font-serif text-slate-800 dark:text-slate-200 leading-relaxed ${
                                bibleFontSize === 'normal'
                                  ? 'text-sm'
                                  : bibleFontSize === 'large'
                                  ? 'text-base'
                                  : 'text-lg'
                              }`}
                            >
                              {displayText}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chapter Pagination */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => setSelectedChapterNumber(Math.max(1, selectedChapterNumber - 1))}
                        disabled={selectedChapterNumber <= 1}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Ch. {selectedChapterNumber - 1}
                      </button>
                      <span className="text-xs font-mono text-slate-400">
                        {currentBookMeta?.name} {selectedChapterNumber} of {chapterCount}
                      </span>
                      <button
                        onClick={() => setSelectedChapterNumber(Math.min(chapterCount, selectedChapterNumber + 1))}
                        disabled={selectedChapterNumber >= chapterCount}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      >
                        Ch. {selectedChapterNumber + 1}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Simplified Scripture Notes & Devotional Journal (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[640px]">
          
          {/* Notes Header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Devotional Journal</h2>
            </div>
            <button
              onClick={() => handleCreateNote(`${currentBookMeta?.name || 'Scripture'} ${selectedChapterNumber}`)}
              className="px-2.5 py-1 bg-[#023264] hover:bg-[#022347] text-amber-300 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Note</span>
            </button>
          </div>

          {/* Notes Selector / List */}
          <div className="px-3 py-2 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto">
            {notes.map(n => (
              <button
                key={n.id}
                onClick={() => setActiveNoteId(n.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeNoteId === n.id
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{n.reference}</span>
                {notes.length > 1 && (
                  <span
                    onClick={(e) => handleDeleteNote(n.id, e)}
                    className="hover:text-red-600 ml-1 text-[10px]"
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Active Note Editor */}
          {activeNote ? (
            <div className="p-4 flex-1 flex flex-col space-y-3 overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Scripture Reference</label>
                <input
                  type="text"
                  value={activeNote.reference}
                  onChange={e => handleUpdateActiveNote({ reference: e.target.value })}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Title / Theme</label>
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={e => handleUpdateActiveNote({ title: e.target.value })}
                  className="w-full mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Reflections & Notes</label>
                <textarea
                  value={activeNote.content}
                  onChange={e => handleUpdateActiveNote({ content: e.target.value })}
                  placeholder="Record your insights, prayers, and takeaways..."
                  className="w-full flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-serif leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="text-[10px] text-slate-400 text-right">
                Auto-saved locally
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-400">No active note selected.</div>
          )}
        </div>
      </div>

      {/* Recommendations & Evaluation Modal */}
      {showRecommendationsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-amber-500">
                <Lightbulb className="w-5 h-5" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Study & Bible Module Evaluation & Recommendations
                </h3>
              </div>
              <button
                onClick={() => setShowRecommendationsModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>1. Architectural Audit & Simplification</span>
                </h4>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Previously, the study tab bundled heavy curriculum lecture filters, assignment notes, and class day selectors alongside the scripture reader. Per your directive, we have stripped away all non-bible clutter to achieve a pure, minimalist reading and journaling experience.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>2. Recommended Enhancements for Minimalist Growth</span>
                </h4>
                <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300 list-disc pl-4">
                  <li><strong>Scripture Memory Integration:</strong> Embed weekly memory verse prompts directly into the sidebar to align with HTEIM curriculum milestones.</li>
                  <li><strong>Exportable Devotionals:</strong> Provide one-click PDF export of saved journaling notes for pastoral review or weekly fellowship sharing.</li>
                  <li><strong>Offline PWA Scripture Caching:</strong> Cache preloaded scripture chapters in indexed local storage so students can study without an active internet connection during outreach or travel.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowRecommendationsModal(false)}
                className="px-5 py-2 bg-[#023264] text-amber-300 font-bold rounded-xl text-xs hover:bg-[#022347] cursor-pointer shadow-md"
              >
                Close Recommendations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentNotesBibleTab;
