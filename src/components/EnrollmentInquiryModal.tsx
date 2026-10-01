import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  GraduationCap, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  BookOpen, 
  Phone, 
  Mail, 
  User, 
  HelpCircle,
  Clock,
  ShieldCheck,
  Download,
  ChevronLeft,
  ChevronRight,
  Quote,
  Award,
  Play,
  Pause,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from './Modal';
import { ACADEMIC_LEVELS, GraduationPhoto } from '../types';
import { DEFAULT_GRADUATION_PHOTOS } from './GraduationCarousel';

// Default Fallback Photo in case of load glitch
import gradStageAsset from '../assets/images/grad_stage_celebration_1787231699782.jpg';

export interface EnrollmentInquiry {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  academicLevel: string;
  learningFormat: 'hybrid' | 'online' | 'in_person';
  callingBackground: string;
  timestamp: string;
  status: 'new' | 'contacted' | 'approved';
}

interface EnrollmentInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToCourses?: () => void;
}

export const EnrollmentInquiryModal: React.FC<EnrollmentInquiryModalProps> = ({
  isOpen,
  onClose,
  onNavigateToCourses
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [academicLevel, setAcademicLevel] = useState('level_1');
  const [learningFormat, setLearningFormat] = useState<'hybrid' | 'online' | 'in_person'>('hybrid');
  const [callingBackground, setCallingBackground] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<EnrollmentInquiry | null>(null);

  // Roving Graduation Photos for the combined modal inspiration panel
  const [photos] = useState<GraduationPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('hteim_graduation_photos_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_GRADUATION_PHOTOS;
  });

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isRoving, setIsRoving] = useState(true);

  // Auto-roving loop in modal (4.5s)
  useEffect(() => {
    if (!isOpen || !isRoving || photos.length <= 1) return;
    const timer = setInterval(() => {
      setActivePhotoIdx(prev => (prev + 1) % photos.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isOpen, isRoving, photos.length]);

  const currentPhoto = photos[activePhotoIdx] || photos[0] || DEFAULT_GRADUATION_PHOTOS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    setIsSubmitting(true);

    const inquiry: EnrollmentInquiry = {
      id: `inq_${Date.now()}`,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      academicLevel,
      learningFormat,
      callingBackground: callingBackground.trim(),
      timestamp: new Date().toISOString(),
      status: 'new'
    };

    // Store in localStorage for persistent admin access
    try {
      const existing = JSON.parse(localStorage.getItem('hteim_enrollment_inquiries') || '[]');
      localStorage.setItem('hteim_enrollment_inquiries', JSON.stringify([inquiry, ...existing]));
    } catch (err) {
      console.error('Failed to save enrollment inquiry:', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setSubmittedData(inquiry);
    }, 600);
  };

  const handleReset = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setAcademicLevel('level_1');
    setLearningFormat('hybrid');
    setCallingBackground('');
    setIsSubmitted(false);
    setSubmittedData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title="Next Cohort Admissions Open • Class of 2026 Application"
      size="xl"
    >
      {isSubmitted && submittedData ? (
        <div className="p-6 space-y-6 text-center animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-[#01883c]/15 text-[#01883c] dark:text-[#86efac] mx-auto flex items-center justify-center shadow-md border border-[#01883c]/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-[#022044] dark:text-white font-syne">
              Admissions Application Received!
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              Praise God, <strong className="text-[#023264] dark:text-[#dfc18b]">{submittedData.fullName}</strong>! Your enrollment inquiry for the upcoming HTEIM School of Ministry cohort has been logged.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-5 border border-slate-200 dark:border-slate-700 text-left space-y-3 text-xs max-w-lg mx-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-slate-500 font-medium">Inquiry Reference</span>
              <span className="font-mono font-bold text-[#023264] dark:text-[#bae6fd]">{submittedData.id}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-slate-500 font-medium">Target Study Track</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {ACADEMIC_LEVELS.find(l => l.id === submittedData.academicLevel)?.name || 'Level 1: Foundation Certificate'}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-slate-500 font-medium">Learning Delivery</span>
              <span className="font-bold uppercase tracking-wider text-[#025798] dark:text-[#7dd3fc] font-mono">
                {submittedData.learningFormat.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Class Sessions</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">Tuesdays & Thursdays @ 7:00 PM EST</span>
            </div>
          </div>

          <div className="p-4 bg-[#023264]/10 dark:bg-[#023264]/30 rounded-xl border border-[#b38f53]/30 text-[#023264] dark:text-[#bae6fd] text-xs flex items-center gap-3 text-left max-w-lg mx-auto">
            <Sparkles className="w-5 h-5 text-[#b38f53] dark:text-[#dfc18b] shrink-0" />
            <p>
              Our admissions team and ministry faculty will contact you at <strong>{submittedData.email}</strong> with orientation packets and course syllabus.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2.5 bg-[#023264] hover:bg-[#025798] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer border border-[#b38f53]/30"
            >
              Done & Return to Portal
            </button>
            {onNavigateToCourses && (
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  onNavigateToCourses();
                }}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
              >
                Browse 6 Core Modules
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
          {/* LEFT COLUMN: Roving Graduation Carousel of Past Students */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#022044] via-[#023264] to-[#011b38] text-white p-5 sm:p-6 flex flex-col justify-between space-y-4 border-b lg:border-b-0 lg:border-r border-white/10 relative overflow-hidden">
            {/* Ambient Lighting */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-[#0277b8]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-[#b38f53]/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-3">
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full bg-[#b38f53] text-[#022044] font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-xs border border-[#dfc18b]/40">
                  <Award className="w-3 h-3 text-[#022044]" />
                  Alumni Testimony
                </span>
                <span className="text-[10px] font-mono text-[#bae6fd] font-bold">
                  Photo 0{activePhotoIdx + 1} of 0{photos.length}
                </span>
              </div>

              <div>
                <h4 className="text-base sm:text-lg font-black text-white leading-tight font-syne">
                  From Enrollment to Graduation
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Look at what God accomplished in our previous cohort graduates as they were equipped and commissioned!
                </p>
              </div>

              {/* Roving Photo Display Window */}
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-white/15 aspect-4/3 sm:aspect-16/10 shadow-lg group">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={`modal-grad-img-${currentPhoto.id}-${activePhotoIdx}`}
                    src={currentPhoto.imageUrl}
                    alt={currentPhoto.title}
                    referrerPolicy="no-referrer"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35 }}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = gradStageAsset;
                    }}
                  />
                </AnimatePresence>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />

                {/* Cohort Year & Category Tag */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-[#022044]/90 text-[#dfc18b] font-mono text-[9px] font-bold border border-[#b38f53]/50">
                    {currentPhoto.cohortYear}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-black/60 text-slate-300 text-[8px] uppercase font-bold">
                    {currentPhoto.category}
                  </span>
                </div>

                {/* Autoplay & Nav Controls inside Frame */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsRoving(!isRoving)}
                    className="p-1 bg-black/60 hover:bg-black/80 rounded-md text-white text-[10px] transition-colors cursor-pointer"
                    title={isRoving ? 'Pause Carousel' : 'Play Carousel'}
                  >
                    {isRoving ? <Pause className="w-3 h-3 text-[#dfc18b]" /> : <Play className="w-3 h-3 text-[#86efac]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePhotoIdx((activePhotoIdx - 1 + photos.length) % photos.length)}
                    className="p-1 bg-black/60 hover:bg-black/80 rounded-md text-white transition-colors cursor-pointer"
                    title="Previous"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePhotoIdx((activePhotoIdx + 1) % photos.length)}
                    className="p-1 bg-black/60 hover:bg-black/80 rounded-md text-white transition-colors cursor-pointer"
                    title="Next"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Title & Caption at Bottom of Photo */}
                <div className="absolute bottom-2 left-2 right-2 space-y-0.5">
                  <p className="text-xs font-black text-white truncate drop-shadow-xs">
                    {currentPhoto.title}
                  </p>
                  <p className="text-[10px] text-slate-300 line-clamp-1">
                    {currentPhoto.caption}
                  </p>
                </div>
              </div>

              {/* Featured Scripture / Benediction Quote */}
              {currentPhoto.featuredQuote && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1 backdrop-blur-xs">
                  <div className="flex items-center gap-1 text-[#dfc18b] text-[10px] font-bold">
                    <Quote className="w-3 h-3 text-[#b38f53]" />
                    <span>Graduation Dedication</span>
                  </div>
                  <p className="text-[11px] text-slate-200 italic font-serif leading-relaxed line-clamp-3">
                    "{currentPhoto.featuredQuote}"
                  </p>
                  {currentPhoto.scripture && (
                    <p className="text-[9px] text-[#dfc18b] font-mono text-right font-bold">
                      — {currentPhoto.scripture}
                    </p>
                  )}
                </div>
              )}

              {/* Photo Thumbnail Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                {photos.map((photo, idx) => (
                  <button
                    type="button"
                    key={photo.id}
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`w-9 h-7 rounded-lg overflow-hidden shrink-0 border transition-all cursor-pointer ${
                      idx === activePhotoIdx 
                        ? 'border-[#dfc18b] ring-2 ring-[#dfc18b]/60 scale-105' 
                        : 'border-white/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={photo.imageUrl} 
                      alt="" 
                      referrerPolicy="no-referrer" 
                      className="w-full h-full object-cover" 
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = gradStageAsset; }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Cohort Feature Callouts */}
            <div className="relative z-10 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                <span className="text-[9px] uppercase font-mono text-[#bae6fd] block">Academic Format</span>
                <span className="font-black text-[#dfc18b] text-xs">Hybrid Delivery</span>
              </div>
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                <span className="text-[9px] uppercase font-mono text-[#bae6fd] block">Curriculum</span>
                <span className="font-black text-[#86efac] text-xs">6 Core Modules</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Next Cohort Application & Inquiry Form */}
          <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#01883c]/15 text-[#01883c] dark:text-[#86efac] font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 border border-[#01883c]/30">
                    <Sparkles className="w-3 h-3 text-[#01883c] dark:text-[#86efac]" /> Admissions Open
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    2026 Academic Term
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-syne">
                  Reserve Your Seat for Next Cohort
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fill out this brief application to connect with admissions and receive your curriculum syllabus and schedule.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Full Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Min. David Johnson"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#025798] focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Address *</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#025798] focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phone / WhatsApp</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#025798] focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>Study Track Interest</span>
                  </label>
                  <select
                    value={academicLevel}
                    onChange={(e) => setAcademicLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#025798] focus:outline-none text-slate-900 dark:text-white font-medium"
                  >
                    {ACADEMIC_LEVELS.map(level => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Learning Delivery Format */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Preferred Delivery Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLearningFormat('hybrid')}
                    className={`p-2 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      learningFormat === 'hybrid'
                        ? 'bg-[#023264]/10 dark:bg-[#023264]/40 border-[#023264] text-[#023264] dark:text-[#bae6fd] ring-1 ring-[#023264]'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    Hybrid (Live & Campus)
                  </button>

                  <button
                    type="button"
                    onClick={() => setLearningFormat('online')}
                    className={`p-2 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      learningFormat === 'online'
                        ? 'bg-[#023264]/10 dark:bg-[#023264]/40 border-[#023264] text-[#023264] dark:text-[#bae6fd] ring-1 ring-[#023264]'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    100% Online Stream
                  </button>

                  <button
                    type="button"
                    onClick={() => setLearningFormat('in_person')}
                    className={`p-2 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      learningFormat === 'in_person'
                        ? 'bg-[#023264]/10 dark:bg-[#023264]/40 border-[#023264] text-[#023264] dark:text-[#bae6fd] ring-1 ring-[#023264]'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    In-Person Campus
                  </button>
                </div>
              </div>

              {/* Ministry Background / Questions */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Ministry Calling, Goals, or Inquiries</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Share a brief note on your spiritual background, current ministry involvement, or specific course questions..."
                  value={callingBackground}
                  onChange={(e) => setCallingBackground(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#025798] focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              {/* Schedule Info Banner */}
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Clock className="w-3.5 h-3.5 text-[#025798] dark:text-[#7dd3fc] shrink-0" />
                <span>Next cohort schedule: <strong>Tuesdays & Thursdays @ 7:00 PM EST</strong></span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !fullName.trim() || !email.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#023264] via-[#025798] to-[#01883c] hover:from-[#022044] hover:to-[#01682e] text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed border border-[#b38f53]/30 active:opacity-80"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-[#dfc18b]" />
                      <span>Submit Application for Next Cohort</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Modal>
  );
};

