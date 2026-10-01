import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, RotateCcw, BrainCircuit, Check, CheckCircle2, Sparkles, BookOpen } from 'lucide-react';
import { CORE_MODULES } from './ScheduleTab';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  module: string;
}

const SAMPLE_FLASHCARDS: Flashcard[] = [
  { id: 'fc-1', module: 'MIN-101 Biblical Foundations', front: 'What are the three main sections of the Hebrew Bible (Tanakh)?', back: 'Torah (Law), Nevi\'im (Prophets), and Ketuvim (Writings).' },
  { id: 'fc-2', module: 'MIN-101 Biblical Foundations', front: 'Define "Exegesis".', back: 'The critical explanation or interpretation of a text, especially of scripture, drawing the meaning out of the text.' },
  { id: 'fc-3', module: 'MIN-102 Homiletics', front: 'What is the primary purpose of Homiletics?', back: 'The art of preaching or writing sermons; effectively communicating the Gospel message.' },
  { id: 'fc-4', module: 'MIN-102 Homiletics', front: 'Name the three key components of a well-structured sermon.', back: 'Introduction, Body (Main Points), and Conclusion (Application).' },
  { id: 'fc-5', module: 'MIN-103 Pastoral Care', front: 'What is the primary role of a pastor in counseling?', back: 'To guide, listen, and offer spiritually grounded support and biblical wisdom rather than professional psychological therapy.' },
  { id: 'fc-6', module: 'MIN-104 Church Administration', front: 'Why is financial transparency crucial in church administration?', back: 'It builds trust with the congregation, maintains legal compliance, and honors biblical stewardship.' },
  { id: 'fc-7', module: 'MOD-301 Ministerial Ethics', front: 'What is a "Conflict of Interest" in ministry?', back: 'A situation in which a minister\'s personal or financial interests could compromise their judgment, decisions, or actions in their ministerial duties.' },
];

interface InteractiveFlashcardsProps {
  onClose: () => void;
}

export const InteractiveFlashcards: React.FC<InteractiveFlashcardsProps> = ({ onClose }) => {
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [cards, setCards] = useState<Flashcard[]>(SAMPLE_FLASHCARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let filtered = SAMPLE_FLASHCARDS;
    if (selectedModule !== 'all') {
      filtered = SAMPLE_FLASHCARDS.filter(c => c.module.includes(selectedModule.split(' ')[0]));
    }
    setCards(filtered);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedModule]);

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % cards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  const toggleMastery = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = cards[currentIndex].id;
    setMasteredIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (cards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-2xl p-6 relative">
           <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="w-6 h-6" /></button>
           <div className="text-center py-12">
             <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <h3 className="text-xl font-bold">No flashcards found</h3>
             <p className="text-slate-500 mt-2">Try selecting a different module.</p>
           </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const isMastered = masteredIds.has(currentCard.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-inner">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Interactive Study Flashcards</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Spaced-repetition review for core curriculum modules</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Progress */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
            <select 
              value={selectedModule} 
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Modules</option>
              {CORE_MODULES.map(m => (
                <option key={m.code} value={m.code}>{m.code} {m.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Mastery Progress</span>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{masteredIds.size} / {cards.length} Cards</span>
            </div>
            <div className="w-24 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-indigo-600 transition-all duration-500" 
                style={{ width: `${(masteredIds.size / cards.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Flashcard Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-slate-50 dark:bg-slate-900/50 min-h-[400px]">
          
          {/* Card Component */}
          <div className="relative w-full max-w-2xl h-80 sm:h-96 perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
            <motion.div 
              className="w-full h-full relative preserve-3d transition-all duration-500 ease-out"
              animate={{ rotateX: isFlipped ? 180 : 0 }}
            >
              
              {/* Front side */}
              <div className="absolute inset-0 backface-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl flex flex-col p-8 group-hover:border-indigo-300 dark:group-hover:border-indigo-600 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-black uppercase tracking-widest">{currentCard.module}</span>
                  {isMastered && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                </div>
                <div className="flex-1 flex items-center justify-center text-center">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                    {currentCard.front}
                  </h3>
                </div>
                <div className="text-center mt-4">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 animate-pulse">Tap to reveal answer</span>
                </div>
              </div>

              {/* Back side */}
              <div className="absolute inset-0 backface-hidden bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl shadow-xl flex flex-col p-8 rotate-x-180 border border-indigo-500">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Answer</span>
                  <Sparkles className="w-5 h-5 text-indigo-200" />
                </div>
                <div className="flex-1 flex items-center justify-center text-center">
                  <p className="text-xl sm:text-2xl font-bold leading-relaxed text-indigo-50">
                    {currentCard.back}
                  </p>
                </div>
                <div className="flex justify-center mt-4 gap-3">
                  <button 
                    onClick={toggleMastery}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${isMastered ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'}`}
                  >
                    <Check className="w-4 h-4" />
                    {isMastered ? 'Mastered' : 'Mark as Mastered'}
                  </button>
                </div>
              </div>

            </motion.div>
          </div>

          {/* Navigation Controls */}
          <div className="mt-10 flex items-center gap-6 sm:gap-8">
            <button 
              onClick={handlePrev}
              className="w-14 h-14 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-md active:opacity-80 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-sm font-black text-slate-900 dark:text-white">{currentIndex + 1} / {cards.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Card</span>
            </div>
            <button 
              onClick={handleNext}
              className="w-14 h-14 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-md active:opacity-80 transition-all cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
