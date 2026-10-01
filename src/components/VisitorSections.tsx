import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  Calendar, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Quote, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Award, 
  Users, 
  ShieldCheck, 
  HelpCircle,
  Video,
  MapPin,
  Flame,
  Search,
  ExternalLink
} from 'lucide-react';
import { TabType } from '../types';

interface VisitorSectionsProps {
  onOpenEnrollmentModal: () => void;
  onNavigate: (tab: TabType) => void;
  onOpenLogin: () => void;
  isLoggedIn?: boolean;
}

// 1. RECOMMENDATION 2: Enrollment / Inquiry Call-to-Action & Cohort Schedule Snippet
export const EnrollmentCtaSection: React.FC<{
  onOpenEnrollmentModal: () => void;
  onNavigate: (tab: TabType) => void;
  onPlayIntro?: () => void;
}> = ({ onOpenEnrollmentModal, onNavigate, onPlayIntro }) => {
  return (
    <section className="bg-gradient-to-br from-[#022044] via-[#023264] to-[#011b38] text-white rounded-xl p-6 sm:p-8 border border-[#b38f53]/30 shadow-xl relative overflow-hidden space-y-6">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#0277b8]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-[#b38f53]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Col: Headings & Value Props */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#b38f53] text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-md border border-[#dfc18b]/40">
              <Sparkles className="w-3 h-3 text-[#dfc18b]" /> Next Cohort Admissions Open
            </span>
            <span className="text-xs text-[#bae6fd] font-mono font-semibold">
              Fall & Spring Term Tracks
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Answer the Call. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#dfc18b] via-[#bae6fd] to-[#7dd3fc]">Equip Your Ministry.</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-xl">
              Whether you are stepping into pastoral leadership, apostolic ministry, or deepening your biblical doctrine, our structured 6-module curriculum provides theological depth and real-world spiritual power.
            </p>
          </div>

          {/* Quick Highlight Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[#dfc18b] font-bold text-[11px]">
                <Calendar className="w-3.5 h-3.5" /> Term Dates
              </div>
              <p className="text-slate-200 font-semibold text-[11px]">Upcoming 2026 Term</p>
              <p className="text-[10px] text-slate-400">Enrollment Active</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[#7dd3fc] font-bold text-[11px]">
                <Clock className="w-3.5 h-3.5" /> Class Schedule
              </div>
              <p className="text-slate-200 font-semibold text-[11px]">Tue & Thu @ 7PM EST</p>
              <p className="text-[10px] text-slate-400">Live & Recorded</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-[#86efac] font-bold text-[11px]">
                <Video className="w-3.5 h-3.5" /> Format
              </div>
              <p className="text-slate-200 font-semibold text-[11px]">Hybrid Delivery</p>
              <p className="text-[10px] text-slate-400">Campus + Global Stream</p>
            </div>
          </div>
        </div>

        {/* Right Col: Call-to-Action Card */}
        <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-xl p-5 sm:p-6 border border-white/20 space-y-4 shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-[#dfc18b] tracking-wider">
              Admissions & Inquiries
            </span>
            <h3 className="text-lg font-black text-white">
              Reserve Your Seat Today
            </h3>
            <p className="text-xs text-slate-200/90 leading-relaxed">
              Submit a quick application or inquiry to receive the complete syllabus, course schedule, and tuition guide.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onOpenEnrollmentModal}
              className="w-full py-2 px-4 bg-gradient-to-r from-[#b38f53] via-[#c4a166] to-[#b38f53] hover:from-[#c4a166] hover:to-[#dfc18b] text-[#022044] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-[#b38f53]/30 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#dfc18b]/40"
            >
              <GraduationCap className="w-4 h-4 text-[#022044]" />
              <span>Apply for Next Cohort</span>
              <ArrowRight className="w-4 h-4 text-[#022044]" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('courses')}
              className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-[#bae6fd]" />
              <span>Browse 6 Core Curriculum Tracks</span>
            </button>

            {onPlayIntro && (
              <button
                type="button"
                onClick={onPlayIntro}
                className="w-full py-2 px-4 bg-[#b38f53]/20 hover:bg-[#b38f53]/30 text-[#dfc18b] font-bold text-xs rounded-xl border border-[#b38f53]/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#dfc18b]" />
                <span>Watch Official Ministry Intro (6s)</span>
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-300">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4ade80]" /> Accredited Ministry Training
            </span>
            <span>Ephesians 2:20 Grounded</span>
          </div>
        </div>
      </div>
    </section>
  );
};


// 2. RECOMMENDATION 4: Student & Alumni Impact Stories
interface Testimony {
  id: string;
  name: string;
  role: string;
  cohort: string;
  quote: string;
  badge: string;
  accent: string;
}

const TESTIMONIES: Testimony[] = [
  {
    id: '1',
    name: 'Minister Renee Pierre',
    role: 'Graduate & Pastoral Ordination Candidate',
    cohort: 'Cohort of 2025',
    quote: 'The 6 core modules bridged the gap between raw theological knowledge and practical supernatural ministry in the field. The personal mentorship of Apostle Gillian and Pastor Samuel completely transformed my walk.',
    badge: 'Alumni Graduate',
    accent: 'border-[#b38f53]/40 bg-[#b38f53]/10 text-[#dfc18b]'
  },
  {
    id: '2',
    name: 'Sister Atiya Williams',
    role: 'Diploma Candidate & Outreach Leader',
    cohort: 'Level 2 Track',
    quote: 'Balancing a career and ministry was overwhelming until I joined the interactive Tuesday & Thursday live streams. The attendance accountability and quiz grading pushed me to excel at the highest standard.',
    badge: 'Current Student',
    accent: 'border-[#0277b8]/40 bg-[#0277b8]/10 text-[#7dd3fc]'
  },
  {
    id: '3',
    name: 'Pastor Christy Arthur',
    role: 'Church Planter & Global Missionary',
    cohort: 'Level 3 Cohort',
    quote: 'The apostolic governance and leadership practicum provided our church planting team with a bulletproof biblical foundation. Every leader in modern ministry needs this training.',
    badge: 'Ministry Leader',
    accent: 'border-[#01883c]/40 bg-[#01883c]/10 text-[#86efac]'
  }
];

export const StudentStoriesSection: React.FC = () => {
  const [activeTestimony, setActiveTestimony] = useState(0);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Quote className="w-4 h-4 text-[#b38f53]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#025798] dark:text-[#7dd3fc]">
              Transformational Impact
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Voices of Our Students & Alumni
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
            Hear how the HTEIM School of Ministry is equipping leaders, pastors, and disciples across the globe.
          </p>
        </div>

        {/* Carousel indicators */}
        <div className="flex items-center gap-1.5">
          {TESTIMONIES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTestimony(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === activeTestimony ? 'w-6 bg-[#023264] dark:bg-[#7dd3fc]' : 'w-2 bg-slate-200 dark:bg-slate-700'
              }`}
              aria-label={`View testimony ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Grid of Testimonies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TESTIMONIES.map((item, idx) => {
          const isSelected = idx === activeTestimony;
          return (
            <div
              key={item.id}
              onClick={() => setActiveTestimony(idx)}
              className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-slate-50 dark:bg-slate-800/80 border-[#025798]/60 shadow-md ring-1 ring-[#025798]/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${item.accent}`}>
                    {item.badge}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                    {item.cohort}
                  </span>
                </div>

                <div className="relative">
                  <Quote className="w-6 h-6 text-slate-200 dark:text-slate-700 absolute -top-2 -left-1 -z-0 opacity-60" />
                  <p className="text-xs text-slate-700 dark:text-slate-200 italic leading-relaxed relative z-10 pt-1">
                    "{item.quote}"
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#023264] to-[#025798] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {item.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {item.role}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};


// 3. RECOMMENDATION 5: Frequently Asked Questions (FAQ) Section
interface FaqItem {
  question: string;
  answer: string;
  category: 'admissions' | 'academics' | 'tuition' | 'format';
}

const FAQS: FaqItem[] = [
  {
    category: 'format',
    question: 'Are classes held online, in-person, or hybrid?',
    answer: 'The HTEIM School of Ministry provides a fully synchronized hybrid format. Students can attend in-person at our lecture campus or join our worldwide interactive livestream every Tuesday and Thursday at 7:00 PM EST. All sessions are archived for enrolled students in the digital library.'
  },
  {
    category: 'academics',
    question: 'What are the attendance and grading requirements for graduation?',
    answer: 'To ensure academic and spiritual rigor, students must maintain a minimum attendance rate of 75% across all scheduled class sessions. Course grades are compiled through weekly interactive quizzes, lecture assignments, and a practicum exam. Students achieving an 85% average or higher receive High Distinction Honor Roll.'
  },
  {
    category: 'admissions',
    question: 'Who is eligible to enroll in the School of Ministry?',
    answer: 'Our program is open to all believers, five-fold ministers, church leaders, Sunday school workers, and anyone seeking deeper grounding in sound biblical doctrine, prophetic order, and apostolic alignment. No prior theological degree is required for Level 1.'
  },
  {
    category: 'tuition',
    question: 'How does tuition and payment installments work?',
    answer: 'Students can pay in full or utilize customized payment installments tracked transparently through the student portal dashboard with instant digital receipts.'
  },
  {
    category: 'academics',
    question: 'What credentials or certificates are awarded upon completion?',
    answer: 'Graduates receive official certificates of completion for finishing the course'
  },
  {
    category: 'format',
    question: 'How do I access textbooks, handouts, and study notes?',
    answer: 'All official course syllabi, downloadable PDF handouts, and lecture resources are provided through the integrated Digital Library tab upon student enrollment.'
  }
];

export const FaqSection: React.FC<{
  onOpenEnrollmentModal: () => void;
}> = ({ onOpenEnrollmentModal }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredFaqs = FAQS.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#025798] dark:text-[#7dd3fc]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#025798] dark:text-[#7dd3fc]">
              Visitor & Prospective Guide
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
            Find immediate answers about curriculum structure, admissions, attendance policies, and tuition.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#025798]/30 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'All Questions' },
          { id: 'format', label: 'Schedule & Format' },
          { id: 'academics', label: 'Grading & Attendance' },
          { id: 'admissions', label: 'Admissions' },
          { id: 'tuition', label: 'Tuition & Plans' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              activeCategory === cat.id
                ? 'bg-[#023264] text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isOpen
                    ? 'bg-slate-50 dark:bg-slate-800/70 border-[#025798]/40 dark:border-[#025798]/60 shadow-xs'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {faq.question}
                  </span>
                  <div className={`p-1 rounded-lg shrink-0 transition-transform ${isOpen ? 'bg-[#023264]/10 dark:bg-[#023264]/40 text-[#023264] dark:text-[#7dd3fc] rotate-180' : 'text-slate-400'}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-slate-700/50">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            No matching questions found. Try searching a different term or reach out to admissions.
          </div>
        )}
      </div>

      {/* Still have questions footer banner */}
      <div className="p-4 bg-gradient-to-r from-slate-50 to-[#023264]/10 dark:from-slate-800 dark:to-[#023264]/30 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5 text-center sm:text-left">
          <p className="font-bold text-slate-900 dark:text-white">Have a specific question about your enrollment?</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Our faculty and admissions advisors are ready to assist you.</p>
        </div>
        <button
          type="button"
          onClick={onOpenEnrollmentModal}
          className="px-4 py-2 bg-[#023264] hover:bg-[#025798] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 border border-[#b38f53]/30"
        >
          Contact Admissions
        </button>
      </div>
    </section>
  );
};
