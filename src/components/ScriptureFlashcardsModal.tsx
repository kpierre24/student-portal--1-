import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Brain,
  Award,
  Eye,
  Shuffle,
  Volume2,
  Share2,
  HelpCircle,
  Layers,
  BookMarked,
  Check,
  Flame
} from 'lucide-react';
import { LibraryResource } from '../types';
import { extractScriptureReferences } from '../utils/scriptureDetector';

export interface FlashcardItem {
  id: string;
  reference: string;
  verseText: string;
  sourceTitle: string;
  courseCode: string;
  moduleTrack?: string;
  category: string;
  applicationTakeaway?: string;
  maskedWords?: string[];
}

interface ScriptureFlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: LibraryResource[];
  currentModuleFilter?: string;
  studentName?: string;
  onOpenInBible?: (bookId: string, chapter: number, verse?: number) => void;
}

export const ScriptureFlashcardsModal: React.FC<ScriptureFlashcardsModalProps> = ({
  isOpen,
  onClose,
  resources,
  currentModuleFilter = 'all',
  studentName = 'General Student',
  onOpenInBible
}) => {
  // Built-in starter core memory verses if library doesn't have many yet
  const DEFAULT_MEMORY_VERSES: FlashcardItem[] = [
    {
      id: 'core-2ti-2-15',
      reference: '2 Timothy 2:15',
      verseText: 'Study and do your utmost to present yourself approved unto God, a workman that needeth not to be ashamed, accurately handling and skillfully teaching the word of truth.',
      sourceTitle: 'Foundations of Ministerial Study',
      courseCode: 'SOM-MOD-1',
      moduleTrack: 'SOM-MOD-1',
      category: 'Scripture Memory',
      applicationTakeaway: 'Diligent scholarship is an act of worship. Accurate handling of scripture guards the flock against deception.'
    },
    {
      id: 'core-eph-4-11',
      reference: 'Ephesians 4:11-12',
      verseText: 'And He Himself appointed some to be apostles, some prophets, some evangelists, and some pastors and teachers, for the equipping of the saints for the work of ministry, for the building up of the body of Christ.',
      sourceTitle: 'Apostolic Government & Fivefold Mantles',
      courseCode: 'SOM-MOD-4',
      moduleTrack: 'SOM-MOD-4',
      category: 'Scripture Memory',
      applicationTakeaway: 'The fivefold ministry gifts exist not for personal title, but for empowering every believer for supernatural service.'
    },
    {
      id: 'core-1pe-5-2',
      reference: '1 Peter 5:2-3',
      verseText: 'Shepherd and guide and protect the flock of God among you, exercising oversight not under compulsion, but voluntarily, according to the will of God; not domineering over those in your charge, but being examples of Christian living to the flock.',
      sourceTitle: 'School of the Pastors: Flock Governance',
      courseCode: 'SOM-MOD-6',
      moduleTrack: 'SOM-MOD-6',
      category: 'Scripture Memory',
      applicationTakeaway: 'Pastoral authority is rooted in sacrificial servant leadership, tender protection, and voluntary oversight.'
    },
    {
      id: 'core-rom-12-1',
      reference: 'Romans 12:1-2',
      verseText: 'Present your bodies as a living sacrifice, holy and acceptable to God, which is your spiritual worship. Do not be conformed to this world, but be transformed by the renewing of your mind.',
      sourceTitle: 'Ministerial Character & Spiritual Ethics',
      courseCode: 'SOM-MOD-3',
      moduleTrack: 'SOM-MOD-3',
      category: 'Scripture Memory',
      applicationTakeaway: 'Ministerial power flows from continuous personal consecration and a renewed biblical worldview.'
    },
    {
      id: 'core-act-1-8',
      reference: 'Acts 1:8',
      verseText: 'But you will receive power when the Holy Spirit comes on you; and you will be My witnesses in Jerusalem, and in all Judea and Samaria, and to the ends of the earth.',
      sourceTitle: 'Evangelism & Dynamic Soul Winning',
      courseCode: 'SOM-MOD-2',
      moduleTrack: 'SOM-MOD-2',
      category: 'Scripture Memory',
      applicationTakeaway: 'Evangelism without Holy Spirit empowerment is mere human persuasion; power brings supernatural conviction.'
    }
  ];

  // Compile flashcards from actual resources
  const flashcards: FlashcardItem[] = useMemo(() => {
    const cards: FlashcardItem[] = [];

    resources.forEach(res => {
      // 1. If resource is Scripture Memory or has scripture in title/takeaways
      const textToScan = `${res.title} ${res.summary} ${(res.keyTakeaways || []).join(' ')} ${res.fullContent || ''}`;
      const detected = extractScriptureReferences(textToScan);

      if (res.category === 'Scripture Memory' || detected.length > 0) {
        if (detected.length > 0) {
          detected.slice(0, 3).forEach((sc, idx) => {
            cards.push({
              id: `${res.id}_card_${idx}`,
              reference: sc.cleanReference,
              verseText: res.summary || (res.keyTakeaways?.[0] ?? `Scripture passage from ${res.title}`),
              sourceTitle: res.title,
              courseCode: res.courseCode || 'SOM-CORE',
              moduleTrack: res.moduleTrack || res.courseCode,
              category: res.category,
              applicationTakeaway: res.keyTakeaways?.[idx] || res.keyTakeaways?.[0]
            });
          });
        } else if (res.category === 'Scripture Memory') {
          cards.push({
            id: `${res.id}_mem`,
            reference: res.title,
            verseText: res.summary || (res.keyTakeaways || []).join('\n'),
            sourceTitle: res.title,
            courseCode: res.courseCode || 'SOM-CORE',
            moduleTrack: res.moduleTrack || res.courseCode,
            category: res.category,
            applicationTakeaway: res.keyTakeaways?.[0]
          });
        }
      }
    });

    // Merge default core verses so the user always has a rich deck
    const all = [...cards, ...DEFAULT_MEMORY_VERSES];
    const unique = all.filter((item, index, self) => 
      index === self.findIndex(t => t.reference.toLowerCase() === item.reference.toLowerCase())
    );

    return unique;
  }, [resources]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState<'flip' | 'cloze'>('flip');
  const [revealedClozeWords, setRevealedClozeWords] = useState<Set<number>>(new Set());

  // Mastery state saved to localStorage
  const [masteredIds, setMasteredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`hteim_flashcards_mastered_${studentName.toLowerCase().trim()}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`hteim_flashcards_mastered_${studentName.toLowerCase().trim()}`, JSON.stringify(masteredIds));
    } catch {}
  }, [masteredIds, studentName]);

  // Reset flip state when card index changes
  useEffect(() => {
    setIsFlipped(false);
    setRevealedClozeWords(new Set());
  }, [currentIndex, studyMode]);

  if (!isOpen) return null;

  const currentCard = flashcards[currentIndex] || flashcards[0];
  const isMastered = currentCard ? masteredIds.includes(currentCard.id) : false;

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0); // loop back
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(flashcards.length - 1);
    }
  };

  const toggleMastery = () => {
    if (!currentCard) return;
    setMasteredIds(prev => {
      if (prev.includes(currentCard.id)) {
        return prev.filter(id => id !== currentCard.id);
      } else {
        return [...prev, currentCard.id];
      }
    });
  };

  const handleShuffle = () => {
    const randomIndex = Math.floor(Math.random() * flashcards.length);
    setCurrentIndex(randomIndex);
  };

  // Split verse text for Cloze Mode: mask every 3rd or 4th keyword
  const clozeWords = (currentCard?.verseText || '').split(/\s+/);
  const shouldMaskWord = (idx: number, word: string) => {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (clean.length <= 3) return false;
    return (idx + 1) % 3 === 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Scripture Memory Flashcards
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  SOM Mastery
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Interactive memory verse training & ministerial recall
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Study Mode Selector */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setStudyMode('flip')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  studyMode === 'flip'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Flip Card
              </button>
              <button
                type="button"
                onClick={() => setStudyMode('cloze')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  studyMode === 'cloze'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Fill-in-Blank
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress & Deck Stats Bar */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>Card {currentIndex + 1} of {flashcards.length}</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Award className="w-3.5 h-3.5" />
              {masteredIds.length} Mastered
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShuffle}
              className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Shuffle className="w-3 h-3 text-indigo-500" /> Shuffle
            </button>
          </div>
        </div>

        {/* Card Study Area */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col justify-center items-center text-center min-h-[300px]">
          {flashcards.length === 0 ? (
            <div className="text-slate-400 py-12">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-bold">No flashcards found for this selection.</p>
            </div>
          ) : studyMode === 'flip' ? (
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className={`w-full max-w-lg min-h-[260px] p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between cursor-pointer select-none shadow-md hover:shadow-lg ${
                isFlipped
                  ? 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border-indigo-300 dark:border-indigo-800'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              {/* Card Meta Top */}
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded text-slate-700 dark:text-slate-300 font-mono">
                  {currentCard.courseCode}
                </span>
                <span>{isFlipped ? 'BACK: SCRIPTURE & APPLICATION' : 'FRONT: REFERENCE PROMPT'}</span>
              </div>

              {/* Card Center Content */}
              <div className="py-6 my-auto">
                {!isFlipped ? (
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase tracking-widest font-black text-indigo-600 dark:text-indigo-400">
                      Recite this Passage:
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {currentCard.reference}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Source: "{currentCard.sourceTitle}"
                    </p>
                    <div className="pt-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Tap card or press Space to flip
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fadeIn">
                    <p className="font-serif text-base sm:text-lg italic leading-relaxed text-slate-800 dark:text-slate-200">
                      "{currentCard.verseText}"
                    </p>
                    {currentCard.applicationTakeaway && (
                      <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-left">
                        <span className="text-[10px] uppercase font-black tracking-wider text-indigo-600 dark:text-indigo-400 block mb-0.5">
                          Spiritual Ministry Key:
                        </span>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {currentCard.applicationTakeaway}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Bottom Hint */}
              <div className="text-[10px] font-extrabold text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <span>{isFlipped ? 'Tap to flip back' : 'Can you quote this verse?'}</span>
                {isMastered && (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Mastered
                  </span>
                )}
              </div>
            </div>
          ) : (
            // Cloze / Fill-in-the-Blank Mode
            <div className="w-full max-w-lg min-h-[260px] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="font-black text-indigo-600 dark:text-indigo-400">{currentCard.reference}</span>
                <span>FILL-IN-THE-BLANK MODE</span>
              </div>

              <div className="py-6 my-auto text-left leading-loose text-base font-serif">
                {clozeWords.map((word, idx) => {
                  const isMasked = shouldMaskWord(idx, word);
                  const isRevealed = revealedClozeWords.has(idx);

                  if (!isMasked) {
                    return <span key={idx} className="text-slate-800 dark:text-slate-200 mr-1.5">{word}</span>;
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRevealedClozeWords(prev => {
                          const next = new Set(prev);
                          if (next.has(idx)) next.delete(idx);
                          else next.add(idx);
                          return next;
                        });
                      }}
                      className={`inline-block mr-1.5 px-2 py-0.5 rounded-md font-sans text-xs font-bold transition-all cursor-pointer ${
                        isRevealed
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 animate-fadeIn'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 underline decoration-dotted'
                      }`}
                      title="Click to reveal/hide word"
                    >
                      {isRevealed ? word : '____ [reveal]'}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const allIndices = new Set<number>();
                    clozeWords.forEach((w, i) => {
                      if (shouldMaskWord(i, w)) allIndices.add(i);
                    });
                    setRevealedClozeWords(allIndices);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Reveal All Missing Words
                </button>
                <button
                  type="button"
                  onClick={() => setRevealedClozeWords(new Set())}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Reset Blanks
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs"
              title="Previous card"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs"
              title="Next card"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMastery}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isMastered
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 ${isMastered ? 'text-white' : 'text-slate-400'}`} />
              <span>{isMastered ? 'Mastered!' : 'Mark as Mastered'}</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Next Card</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
