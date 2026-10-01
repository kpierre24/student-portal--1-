import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  Award, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Maximize2, 
  X, 
  Calendar, 
  Users, 
  Flame, 
  BookOpen, 
  Quote, 
  Plus, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Upload, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Heart,
  Share2,
  Filter,
  Sliders,
  Settings,
  ArrowUp,
  ArrowDown,
  Copy,
  Layers,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { GraduationPhoto } from '../types';
import { AppUser } from '../lib/userAuth';
import { Modal } from './Modal';
import { uploadToSupabaseStorage } from '../lib/supabaseClient';

// Import Generated Authentic Graduation Assets
import gradStageAsset from '../assets/images/645517144_1339672958204643_7091755527786435853_n.jpg';
import gradDiplomaAsset from '../assets/images/645546959_1339673388204600_3014549459957888322_n.jpg';
import gradCelebrateAsset from '../assets/images/646386921_1339673564871249_5223398103669922178_n.jpg';
import gradPrayerAsset from '../assets/images/646495875_1339674291537843_5023237460630996624_n.jpg';
import gradFellowshipAsset from '../assets/images/646578740_1339674121537860_5263687295641272570_n.jpg';

export interface GraduationShowcaseConfig {
  showcaseTitle: string;
  showcaseSubtitle: string;
  cohortBadgeText: string;
  admissionsBadgeText: string;
  enableAdmissionsPill: boolean;
  stat1Count: string;
  stat1Label: string;
  stat2Count: string;
  stat2Label: string;
  autoplaySpeedSeconds: number;
  defaultFitMode?: 'contain' | 'top' | 'cover';
}

export const DEFAULT_SHOWCASE_CONFIG: GraduationShowcaseConfig = {
  showcaseTitle: 'Graduation Showcase & Cohort Admissions',
  showcaseSubtitle: 'Honoring our commissioned graduates and opening registrations for the upcoming cohort in biblical doctrine, prophetic protocol, and apostolic governance.',
  cohortBadgeText: 'Class of 2025 Commencement',
  admissionsBadgeText: 'Next Cohort Admissions Open',
  enableAdmissionsPill: true,
  stat1Count: '24 Leaders',
  stat1Label: 'Commissioned',
  stat2Count: '6 Modules',
  stat2Label: 'Mastered',
  autoplaySpeedSeconds: 5,
  defaultFitMode: 'contain'
};

export const DEFAULT_GRADUATION_PHOTOS: GraduationPhoto[] = [
  {
    id: 'grad-2025-01',
    title: 'Class of 2025 Commencement Ceremony',
    caption: 'Graduates standing on the main altar in navy and gold academic regalia, holding their completed diplomas after rigorous 6-module equipping.',
    cohortYear: 'Class of 2025',
    date: 'June 2025',
    imageUrl: gradStageAsset,
    category: 'commencement',
    featuredQuote: '“And the things that thou hast heard of me among many witnesses, the same commit thou to faithful men, who shall be able to teach others also.”',
    scripture: '2 Timothy 2:2',
    studentHonors: ['Valedictorian Distinction', '100% Attendance Award', 'Exegesis Honors']
  },
  {
    id: 'grad-2025-02',
    title: 'Conferral of Ministry Diplomas & Honor Stoles',
    caption: 'Apostle Gillian Selkridge presenting the official diploma of ministerial licensing and gold stole to an honor graduate.',
    cohortYear: 'Class of 2025',
    date: 'June 2025',
    imageUrl: gradDiplomaAsset,
    category: 'diploma',
    featuredQuote: '“Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth.”',
    scripture: '2 Timothy 2:15',
    studentHonors: ['Ministerial Licensing', 'Apostolic Alignment']
  },
  {
    id: 'grad-2025-03',
    title: 'Apostolic Impartation & Anointing Prayer',
    caption: 'School faculty and elders laying hands on kneeling graduates, releasing prophetic commissioning and ministerial authority for kingdom deployment.',
    cohortYear: 'Class of 2025',
    date: 'June 2025',
    imageUrl: gradPrayerAsset,
    category: 'prayer',
    featuredQuote: '“The Spirit of the Lord God is upon me; because the Lord hath anointed me to preach good tidings unto the meek...”',
    scripture: 'Isaiah 61:1',
    studentHonors: ['Prophetic Commissioning', 'Five-Fold Anointing']
  },
  {
    id: 'grad-2025-04',
    title: 'Cohort Victory & Cap Toss Celebration',
    caption: 'Radiant graduates celebrating together at the altar, rejoicing in spiritual perseverance and fellowship after completing their academic requirements.',
    cohortYear: 'Class of 2025',
    date: 'June 2025',
    imageUrl: gradCelebrateAsset,
    category: 'celebration',
    featuredQuote: '“I have fought a good fight, I have finished my course, I have kept the faith.”',
    scripture: '2 Timothy 4:7',
    studentHonors: ['Cohort Unity Award', 'Supernatural Evangelism']
  },
  {
    id: 'grad-2025-05',
    title: 'Family, Faculty & Alumni Fellowship Reception',
    caption: 'Pastors, family members, and graduates gathering in joyful fellowship following the commencement benediction.',
    cohortYear: 'Class of 2025',
    date: 'June 2025',
    imageUrl: gradFellowshipAsset,
    category: 'fellowship',
    featuredQuote: '“Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost.”',
    scripture: 'Matthew 28:19',
    studentHonors: ['Leadership Excellence', 'Community Outreach']
  }
];

interface GraduationCarouselProps {
  appUser: AppUser | null;
  onOpenEnrollmentModal?: () => void;
  onNavigateToCourses?: () => void;
}

export const GraduationCarousel: React.FC<GraduationCarouselProps> = ({
  appUser,
  onOpenEnrollmentModal,
  onNavigateToCourses
}) => {
  const isAdminOrTeacher = appUser?.role === 'admin' || appUser?.role === 'teacher';

  // Showcase Header and Details Configuration State with Local Persistence
  const [showcaseConfig, setShowcaseConfig] = useState<GraduationShowcaseConfig>(() => {
    try {
      const saved = localStorage.getItem('hteim_graduation_showcase_config_v2');
      if (saved) {
        return { ...DEFAULT_SHOWCASE_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Error loading showcase config:', e);
    }
    return DEFAULT_SHOWCASE_CONFIG;
  });

  // Photo Collection State with Local Persistence
  const [photos, setPhotos] = useState<GraduationPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('hteim_graduation_photos_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading graduation photos:', e);
    }
    return DEFAULT_GRADUATION_PHOTOS;
  });

  // Category Filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filtered Photos
  const filteredPhotos = useMemo(() => {
    if (selectedCategory === 'all') return photos;
    return photos.filter(p => p.category === selectedCategory);
  }, [photos, selectedCategory]);

  // Active Slide Index
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Lightbox Modal State
  const [lightboxPhoto, setLightboxPhoto] = useState<GraduationPhoto | null>(null);

  // Framing & Fit State
  const [userFitOverride, setUserFitOverride] = useState<'contain' | 'top' | 'cover' | null>(null);

  // Admin Showcase & Photo Management Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'details' | 'photos' | 'edit_form'>('details');
  const [editingPhoto, setEditingPhoto] = useState<GraduationPhoto | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<GraduationPhoto | null>(null);
  const [isResetConfirming, setIsResetConfirming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [adminSuccessMsg, setAdminSuccessMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State for Showcase Details
  const [configForm, setConfigForm] = useState<GraduationShowcaseConfig>(showcaseConfig);

  // Form State for Adding / Editing Photo
  const [formTitle, setFormTitle] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formCohortYear, setFormCohortYear] = useState('Class of 2025');
  const [formCategory, setFormCategory] = useState<GraduationPhoto['category']>('commencement');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formQuote, setFormQuote] = useState('');
  const [formScripture, setFormScripture] = useState('');
  const [formHonors, setFormHonors] = useState('');
  const [formImageFit, setFormImageFit] = useState<'contain' | 'top' | 'cover'>('contain');

  // Sync config form whenever modal opens
  useEffect(() => {
    if (isManageModalOpen) {
      setConfigForm(showcaseConfig);
    }
  }, [isManageModalOpen, showcaseConfig]);

  // Reset index if filtered list length changes
  useEffect(() => {
    if (currentIndex >= filteredPhotos.length) {
      setCurrentIndex(0);
    }
  }, [filteredPhotos.length, currentIndex]);

  // Slide progress percentage state (0 to 100) for smooth countdown visual
  const [slideProgress, setSlideProgress] = useState(0);

  // Touch swipe support
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  // Roving Carousel Auto-play Timer with Smooth Tick Progress
  useEffect(() => {
    setSlideProgress(0);
    if (!isPlaying || isHovered || filteredPhotos.length <= 1) return;

    const speedMs = (showcaseConfig.autoplaySpeedSeconds || 5) * 1000;
    const intervalTickMs = 50;
    const increment = (intervalTickMs / speedMs) * 100;

    const progressInterval = setInterval(() => {
      setSlideProgress(prev => {
        if (prev >= 100) {
          setCurrentIndex(current => (current + 1) % filteredPhotos.length);
          return 0;
        }
        return prev + increment;
      });
    }, intervalTickMs);

    return () => clearInterval(progressInterval);
  }, [isPlaying, isHovered, filteredPhotos.length, showcaseConfig.autoplaySpeedSeconds, currentIndex]);

  const handleNext = () => {
    if (filteredPhotos.length === 0) return;
    setSlideProgress(0);
    setCurrentIndex(prev => (prev + 1) % filteredPhotos.length);
  };

  const handlePrev = () => {
    if (filteredPhotos.length === 0) return;
    setSlideProgress(0);
    setCurrentIndex(prev => (prev - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  // Keyboard navigation for carousel & lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ' && !isManageModalOpen) {
        // Spacebar toggle pause/play if lightbox is closed
        if (!lightboxPhoto) {
          e.preventDefault();
          setIsPlaying(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredPhotos.length, isManageModalOpen, lightboxPhoto]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    const threshold = 40; // minimum swipe distance px
    if (diff > threshold) {
      handleNext(); // swipe left -> next
    } else if (diff < -threshold) {
      handlePrev(); // swipe right -> prev
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  const activePhoto = filteredPhotos[currentIndex] || filteredPhotos[0] || DEFAULT_GRADUATION_PHOTOS[0];

  // Save Photos Helper
  const savePhotos = (newList: GraduationPhoto[]) => {
    setPhotos(newList);
    try {
      localStorage.setItem('hteim_graduation_photos_v2', JSON.stringify(newList));
    } catch (e) {
      console.error('Error saving graduation photos:', e);
    }
  };

  // Save Config Helper
  const saveConfig = (newConfig: GraduationShowcaseConfig) => {
    setShowcaseConfig(newConfig);
    try {
      localStorage.setItem('hteim_graduation_showcase_config_v2', JSON.stringify(newConfig));
    } catch (e) {
      console.error('Error saving showcase config:', e);
    }
  };

  const handleSaveShowcaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveConfig(configForm);
    setAdminSuccessMsg('Showcase details successfully updated!');
    setTimeout(() => setAdminSuccessMsg(null), 3000);
  };

  const handleResetToDefault = () => {
    savePhotos(DEFAULT_GRADUATION_PHOTOS);
    saveConfig(DEFAULT_SHOWCASE_CONFIG);
    setConfigForm(DEFAULT_SHOWCASE_CONFIG);
    setIsResetConfirming(false);
    setAdminSuccessMsg('Reset all showcase details and gallery to factory defaults.');
    setTimeout(() => setAdminSuccessMsg(null), 3000);
  };

  const openAddPhotoModal = () => {
    setEditingPhoto(null);
    setFormError(null);
    setFormTitle('');
    setFormCaption('');
    setFormCohortYear('Class of 2025');
    setFormCategory('commencement');
    setFormImageUrl('');
    setFormQuote('');
    setFormScripture('');
    setFormHonors('');
    setFormImageFit(showcaseConfig.defaultFitMode || 'contain');
    setActiveAdminTab('edit_form');
    setIsManageModalOpen(true);
  };

  const openEditPhotoModal = (p: GraduationPhoto) => {
    setEditingPhoto(p);
    setFormError(null);
    setFormTitle(p.title);
    setFormCaption(p.caption);
    setFormCohortYear(p.cohortYear || 'Class of 2025');
    setFormCategory(p.category || 'commencement');
    setFormImageUrl(p.imageUrl);
    setFormQuote(p.featuredQuote || '');
    setFormScripture(p.scripture || '');
    setFormHonors((p.studentHonors || []).join(', '));
    setFormImageFit(p.imageFit || showcaseConfig.defaultFitMode || 'contain');
    setActiveAdminTab('edit_form');
    setIsManageModalOpen(true);
  };

  const openShowcaseManager = (tab: 'details' | 'photos' = 'details') => {
    setActiveAdminTab(tab);
    setIsManageModalOpen(true);
  };

  const handleSavePhotoForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formTitle.trim() || !formImageUrl.trim()) {
      setFormError('Please provide a photo title and image URL (or upload an image).');
      return;
    }

    const honorsArray = formHonors
      .split(',')
      .map(h => h.trim())
      .filter(Boolean);

    if (editingPhoto) {
      const updated = photos.map(p => 
        p.id === editingPhoto.id 
          ? {
              ...p,
              title: formTitle.trim(),
              caption: formCaption.trim(),
              cohortYear: formCohortYear.trim(),
              category: formCategory,
              imageUrl: formImageUrl.trim(),
              featuredQuote: formQuote.trim() || undefined,
              scripture: formScripture.trim() || undefined,
              studentHonors: honorsArray.length > 0 ? honorsArray : undefined,
              imageFit: formImageFit
            }
          : p
      );
      savePhotos(updated);
      setAdminSuccessMsg(`Photo "${formTitle}" updated successfully.`);
    } else {
      const newPhoto: GraduationPhoto = {
        id: `grad-${Date.now()}`,
        title: formTitle.trim(),
        caption: formCaption.trim(),
        cohortYear: formCohortYear.trim() || 'Class of 2025',
        category: formCategory,
        imageUrl: formImageUrl.trim(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        featuredQuote: formQuote.trim() || undefined,
        scripture: formScripture.trim() || undefined,
        studentHonors: honorsArray.length > 0 ? honorsArray : undefined,
        imageFit: formImageFit
      };
      savePhotos([newPhoto, ...photos]);
      setAdminSuccessMsg(`New photo "${formTitle}" added to showcase!`);
    }

    setTimeout(() => setAdminSuccessMsg(null), 3000);
    setActiveAdminTab('photos');
  };

  // Immediate deletion execution
  const executeDeletePhoto = (id: string) => {
    const targetPhoto = photos.find(p => p.id === id);
    const updated = photos.filter(p => p.id !== id);
    savePhotos(updated);
    if (currentIndex >= updated.length && updated.length > 0) {
      setCurrentIndex(updated.length - 1);
    } else if (updated.length === 0) {
      setCurrentIndex(0);
    }
    setPhotoToDelete(null);
    if (editingPhoto?.id === id) {
      setEditingPhoto(null);
      setActiveAdminTab('photos');
    }
    setAdminSuccessMsg(`Photo "${targetPhoto?.title || 'Selected item'}" removed from showcase.`);
    setTimeout(() => setAdminSuccessMsg(null), 3500);
  };

  const handleRequestDeletePhoto = (p: GraduationPhoto) => {
    setPhotoToDelete(p);
  };

  const handleDuplicatePhoto = (p: GraduationPhoto) => {
    const cloned: GraduationPhoto = {
      ...p,
      id: `grad-${Date.now()}`,
      title: `${p.title} (Copy)`,
    };
    savePhotos([...photos, cloned]);
    setAdminSuccessMsg(`Cloned "${p.title}" successfully.`);
    setTimeout(() => setAdminSuccessMsg(null), 3000);
  };

  const handleMovePhoto = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= photos.length) return;
    const newPhotos = [...photos];
    const [moved] = newPhotos.splice(index, 1);
    newPhotos.splice(targetIdx, 0, moved);
    savePhotos(newPhotos);
  };

  // Image File Upload Helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const publicUrl = await uploadToSupabaseStorage(
        'library-documents',
        `graduations_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
        file
      );
      if (publicUrl) {
        setFormImageUrl(publicUrl);
      } else {
        // Fallback local base64 reader
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setFormImageUrl(reader.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Failed uploading graduation image:', err);
      // Fallback base64
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setFormImageUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section 
      className="bg-gradient-to-br from-[#022044] via-[#023264] to-[#011b38] text-white rounded-xl p-4 sm:p-7 border border-[#b38f53]/30 shadow-xl relative overflow-hidden space-y-5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Subtle Glowing Accents */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-[#0277b8]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#b38f53]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section with Admissions Open Badge, Navigation & Controls */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Clickable Next Cohort Admissions Open Badge */}
            {showcaseConfig.enableAdmissionsPill && (
              <button
                type="button"
                onClick={onOpenEnrollmentModal}
                className="px-3 py-1 rounded-full bg-gradient-to-r from-[#b38f53] via-[#c4a166] to-[#b38f53] text-[#022044] font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-md border border-[#dfc18b]/60 hover:brightness-110 active:opacity-80 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#022044]" />
                <span>{showcaseConfig.admissionsBadgeText}</span>
              </button>
            )}

            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[#bae6fd] text-[10px] font-mono font-bold uppercase tracking-wider border border-white/10 flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-[#dfc18b]" />
              {showcaseConfig.cohortBadgeText}
            </span>
            <span className="text-[11px] text-[#7dd3fc] font-bold font-mono">
              • Photo 0{currentIndex + 1} of 0{filteredPhotos.length}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 font-syne">
            {showcaseConfig.showcaseTitle}
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl font-medium leading-relaxed">
            {showcaseConfig.showcaseSubtitle}
          </p>
        </div>

        {/* Carousel Controls & Admin Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {onOpenEnrollmentModal && (
            <button
              onClick={onOpenEnrollmentModal}
              className="px-3 py-1.5 bg-[#01883c] hover:bg-[#01682e] text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:opacity-80 border border-[#86efac]/30"
              title="Apply for Next Cohort"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#86efac]" />
              <span>Apply for Cohort</span>
            </button>
          )}

          {isAdminOrTeacher && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => openShowcaseManager('details')}
                className="px-3 py-1.5 bg-[#b38f53] hover:bg-[#c4a166] text-[#022044] font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:opacity-80 border border-[#dfc18b]/40"
                title="Edit Showcase Title, Subtitle, Stats & Photos"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Edit Showcase</span>
              </button>

              <button
                onClick={openAddPhotoModal}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1 border border-white/15 transition-colors cursor-pointer"
                title="Add a new graduation photo"
              >
                <Plus className="w-3.5 h-3.5 text-[#dfc18b]" />
                <span className="hidden sm:inline">Add Photo</span>
              </button>
            </div>
          )}

          {/* Autoplay Pause / Play Toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/15 transition-colors cursor-pointer"
            title={isPlaying ? 'Pause Auto-rotation' : 'Resume Auto-rotation'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-[#dfc18b]" />
                <span className="hidden sm:inline text-[11px]">Roving ({showcaseConfig.autoplaySpeedSeconds}s)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-[#86efac]" />
                <span className="hidden sm:inline text-[11px]">Paused</span>
              </>
            )}
          </button>

          {/* Prev / Next Arrows */}
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/15">
            <button
              onClick={handlePrev}
              className="p-1 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label="Previous Graduation Photo"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono font-black text-[#dfc18b] px-1.5">
              0{currentIndex + 1}/0{filteredPhotos.length}
            </span>
            <button
              onClick={handleNext}
              className="p-1 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label="Next Graduation Photo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="relative z-10 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
        <span className="text-[11px] font-bold text-[#bae6fd] mr-1 flex items-center gap-1 shrink-0">
          <Filter className="w-3 h-3 text-[#dfc18b]" /> View:
        </span>
        {[
          { id: 'all', label: 'All Highlights', count: photos.length },
          { id: 'commencement', label: 'Commencement', count: photos.filter(p => p.category === 'commencement').length },
          { id: 'diploma', label: 'Diploma Honors', count: photos.filter(p => p.category === 'diploma').length },
          { id: 'prayer', label: 'Anointing & Prayer', count: photos.filter(p => p.category === 'prayer').length },
          { id: 'celebration', label: 'Victory Celebration', count: photos.filter(p => p.category === 'celebration').length },
          { id: 'fellowship', label: 'Fellowship', count: photos.filter(p => p.category === 'fellowship').length }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id);
              setCurrentIndex(0);
            }}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer shrink-0 border flex items-center gap-1.5 ${
              selectedCategory === cat.id
                ? 'bg-[#b38f53] text-[#022044] border-[#dfc18b] shadow-md ring-1 ring-[#dfc18b]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:border-white/20'
            }`}
          >
            <span>{cat.label}</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              selectedCategory === cat.id ? 'bg-[#022044] text-[#dfc18b]' : 'bg-white/10 text-slate-300'
            }`}>
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Roving Display Carousel Stage with Touch Swipes & Dynamic Countdown Progress */}
      <div 
        className="relative z-10"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Dynamic Countdown Slide Progress Ticker */}
        {isPlaying && !isHovered && filteredPhotos.length > 1 && (
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-gradient-to-r from-[#dfc18b] via-[#b38f53] to-[#86efac] transition-all duration-75 ease-linear rounded-full shadow-xs"
              style={{ width: `${slideProgress}%` }}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {activePhoto && (
            <motion.div
              key={`grad-slide-${activePhoto.id}-${currentIndex}`}
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch bg-slate-950/60 backdrop-blur-md rounded-xl border border-white/15 p-4 sm:p-5 shadow-xl overflow-hidden"
            >
              {/* Photo Showcase Display with Dual-Layer Ambient Stage & Framing Controls */}
              <div className="lg:col-span-7 relative group rounded-xl overflow-hidden bg-slate-950 border border-white/15 min-h-[280px] sm:min-h-[380px] lg:min-h-[430px] flex items-center justify-center shadow-xl">
                {/* Ambient Blurred Underlay - Gives glowing theater backdrop so no harsh empty bars */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img
                    src={activePhoto.imageUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover blur-2xl scale-125 opacity-35 brightness-75"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = gradStageAsset;
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs" />
                </div>

                {/* Main Foreground Photo with Aspect-Aware Framing */}
                {(() => {
                  const effectiveFit = userFitOverride || activePhoto.imageFit || showcaseConfig.defaultFitMode || 'contain';
                  return (
                    <div className="relative z-10 w-full h-full flex items-center justify-center p-2 sm:p-4 pb-14 sm:pb-16">
                      <img
                        src={activePhoto.imageUrl}
                        alt={activePhoto.title}
                        referrerPolicy="no-referrer"
                        className={`transition-all duration-500 ${
                          effectiveFit === 'contain'
                            ? 'w-auto max-w-full h-auto max-h-[300px] sm:max-h-[370px] lg:max-h-[410px] object-contain rounded-xl shadow-xl ring-1 ring-white/15 drop-shadow-xl group-hover:scale-[1.01]'
                            : effectiveFit === 'top'
                            ? 'w-full h-full max-h-[420px] object-cover object-top rounded-xl shadow-xl ring-1 ring-white/15'
                            : 'w-full h-full max-h-[420px] object-cover object-center rounded-xl shadow-xl ring-1 ring-white/15 group-hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = gradStageAsset;
                        }}
                      />
                    </div>
                  );
                })()}

                {/* Top Left Badge: Cohort Year & Date */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#022044]/90 backdrop-blur-md text-[#dfc18b] border border-[#b38f53]/50 font-black text-[10px] uppercase tracking-wider shadow-md">
                    {activePhoto.cohortYear}
                  </span>
                  {activePhoto.date && (
                    <span className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-slate-300 font-mono text-[10px] border border-white/10 shadow-md">
                      {activePhoto.date}
                    </span>
                  )}
                </div>

                {/* Top Right Controls: Quick Fit Switcher + Fullscreen Lightbox */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                  {(() => {
                    const effectiveFit = userFitOverride || activePhoto.imageFit || showcaseConfig.defaultFitMode || 'contain';
                    return (
                      <button
                        onClick={() => {
                          const nextFit = effectiveFit === 'contain' ? 'top' : effectiveFit === 'top' ? 'cover' : 'contain';
                          setUserFitOverride(nextFit);
                        }}
                        className="px-2.5 py-1.5 bg-black/70 hover:bg-[#b38f53] text-white hover:text-[#022044] rounded-xl backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg active:opacity-80 flex items-center gap-1.5 text-[10px] font-bold"
                        title={`Framing: ${
                          effectiveFit === 'contain'
                            ? 'Smart Fit (Full Photo Uncropped)'
                            : effectiveFit === 'top'
                            ? 'Top Focus (Keep Heads in Frame)'
                            : 'Fill Stage (Cover)'
                        }. Click to cycle.`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {effectiveFit === 'contain' ? 'Full Fit' : effectiveFit === 'top' ? 'Top Focus' : 'Fill Stage'}
                        </span>
                      </button>
                    );
                  })()}

                  <button
                    onClick={() => setLightboxPhoto(activePhoto)}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 bg-black/70 hover:bg-[#b38f53] text-white hover:text-[#022044] rounded-xl backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg active:opacity-80 flex items-center gap-1 text-[10px] font-bold"
                    title="Expand to Fullscreen View"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Expand</span>
                  </button>
                </div>

                {/* Bottom Overlay Title Bar with Frosted Vignette Protection */}
                <div className="absolute bottom-0 inset-x-0 z-20 p-3 pt-6 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#dfc18b] block drop-shadow">
                      {activePhoto.category.toUpperCase()} HIGHLIGHT
                    </span>
                    <h4 className="text-xs sm:text-sm font-black text-white truncate drop-shadow-md">
                      {activePhoto.title}
                    </h4>
                  </div>

                  {isAdminOrTeacher && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditPhotoModal(activePhoto)}
                        className="p-1.5 bg-[#023264]/90 hover:bg-[#025798] text-white rounded-lg border border-[#0277b8]/40 transition-colors cursor-pointer text-xs shadow"
                        title="Edit photo details & framing"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#dfc18b]" />
                      </button>
                      <button
                        onClick={() => {
                          setPhotoToDelete(activePhoto);
                          openShowcaseManager('photos');
                        }}
                        className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-800 transition-colors cursor-pointer text-xs shadow"
                        title="Delete photo from showcase"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Description, Scripture & Spiritual Impact Card */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#01883c]/20 text-[#86efac] border border-[#01883c]/40 text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-[#86efac]" />
                        Officially Commissioned
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug font-syne">
                      {activePhoto.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                    {activePhoto.caption}
                  </p>

                  {/* Featured Quote / Scripture Callout */}
                  {activePhoto.featuredQuote && (
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[#dfc18b] text-[11px] font-bold">
                        <Quote className="w-3.5 h-3.5 text-[#b38f53]" />
                        <span>Scripture & Ministry Benediction</span>
                      </div>
                      <p className="text-xs text-slate-200 italic font-serif leading-relaxed">
                        {activePhoto.featuredQuote}
                      </p>
                      {activePhoto.scripture && (
                        <p className="text-[10px] text-[#dfc18b] font-mono font-bold text-right">
                          — {activePhoto.scripture}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Student Honors / Recognition Badges */}
                  {activePhoto.studentHonors && activePhoto.studentHonors.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                        Recognitions & Impartations:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activePhoto.studentHonors.map((honor, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-[#023264] text-[#bae6fd] border border-[#025798]/50 text-[10px] font-extrabold flex items-center gap-1"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-[#dfc18b]" />
                            {honor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Milestone Stats & Action Pathway */}
                <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-sm font-black text-[#dfc18b]">{showcaseConfig.stat1Count}</p>
                      <p className="text-[9px] text-slate-300 uppercase font-mono">{showcaseConfig.stat1Label}</p>
                    </div>
                    <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-sm font-black text-[#86efac]">{showcaseConfig.stat2Count}</p>
                      <p className="text-[9px] text-slate-300 uppercase font-mono">{showcaseConfig.stat2Label}</p>
                    </div>
                  </div>

                  {!appUser ? (
                    <button
                      onClick={onOpenEnrollmentModal}
                      className="py-2.5 px-4 bg-[#b38f53] hover:bg-[#c4a166] text-[#022044] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#dfc18b]/50 active:opacity-80"
                    >
                      <Sparkles className="w-4 h-4 text-[#022044]" />
                      <span>Join Next Cohort</span>
                    </button>
                  ) : (
                    <button
                      onClick={onNavigateToCourses}
                      className="py-2.5 px-4 bg-[#023264] hover:bg-[#025798] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#0277b8]/40 active:opacity-80"
                    >
                      <BookOpen className="w-4 h-4 text-[#dfc18b]" />
                      <span>View 6 Core Modules</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thumbnail Filmstrip Selector Below Main Screen */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {filteredPhotos.map((photo, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={photo.id}
                onClick={() => setCurrentIndex(idx)}
                className={`p-1.5 rounded-xl text-left transition-all cursor-pointer flex items-center gap-2 border shrink-0 min-w-[150px] sm:min-w-0 sm:flex-1 ${
                  isCurrent
                    ? 'bg-[#b38f53]/25 border-[#dfc18b] text-white shadow-md ring-1 ring-[#dfc18b]'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/15 bg-slate-950">
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = gradStageAsset;
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold truncate text-white">
                    {photo.title}
                  </p>
                  <p className="text-[8px] text-[#dfc18b] font-mono truncate">
                    {photo.cohortYear} • 0{idx + 1}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lightbox Expanded Fullscreen Modal */}
      {lightboxPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={() => setLightboxPhoto(null)}
        >
          <div 
            className="bg-slate-950 border border-white/20 rounded-xl max-w-5xl w-full overflow-hidden shadow-xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="p-4 bg-slate-900 border-b border-white/10 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#dfc18b]" />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {lightboxPhoto.title}
                  </h3>
                  <p className="text-[10px] font-mono text-[#dfc18b]">
                    {lightboxPhoto.cohortYear} — {lightboxPhoto.date || 'June 2025'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const idx = filteredPhotos.findIndex(p => p.id === lightboxPhoto.id);
                    if (idx > 0) setLightboxPhoto(filteredPhotos[idx - 1]);
                    else setLightboxPhoto(filteredPhotos[filteredPhotos.length - 1]);
                  }}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                  title="Previous Photo"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const idx = filteredPhotos.findIndex(p => p.id === lightboxPhoto.id);
                    if (idx < filteredPhotos.length - 1) setLightboxPhoto(filteredPhotos[idx + 1]);
                    else setLightboxPhoto(filteredPhotos[0]);
                  }}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                  title="Next Photo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLightboxPhoto(null)}
                  className="p-1.5 bg-rose-600/80 hover:bg-rose-600 rounded-lg text-white transition-colors cursor-pointer"
                  title="Close Gallery Lightbox"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lightbox Image Container with Dual-Layer Ambient Backdrop */}
            <div className="flex-1 relative overflow-hidden p-4 sm:p-6 flex items-center justify-center bg-slate-950 min-h-[300px]">
              {/* Ambient Glow */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                  src={lightboxPhoto.imageUrl}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover blur-3xl scale-125 opacity-30 brightness-75"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = gradStageAsset;
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
              </div>

              <img
                src={lightboxPhoto.imageUrl}
                alt={lightboxPhoto.title}
                referrerPolicy="no-referrer"
                className="relative z-10 max-h-[72vh] w-auto max-w-full object-contain rounded-xl shadow-xl border border-white/20 drop-shadow-xl"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = gradStageAsset;
                }}
              />
            </div>

            {/* Lightbox Caption & Scripture Footer */}
            <div className="p-4 sm:p-5 bg-slate-900 border-t border-white/10 text-white space-y-2">
              <p className="text-xs sm:text-sm text-slate-200">
                {lightboxPhoto.caption}
              </p>
              {lightboxPhoto.featuredQuote && (
                <p className="text-xs text-[#dfc18b] italic font-serif">
                  "{lightboxPhoto.featuredQuote}" <span className="font-mono not-italic font-bold">({lightboxPhoto.scripture})</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Full Showcase & Photo Management Modal */}
      {isManageModalOpen && (
        <Modal
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
          title="Graduation Showcase & Photo Gallery Admin Manager"
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Success Alert Banner */}
            {adminSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{adminSuccessMsg}</span>
              </div>
            )}

            {/* Management Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveAdminTab('details')}
                className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeAdminTab === 'details'
                    ? 'bg-[#023264] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-[#dfc18b]" />
                <span>Showcase Details & Texts</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAdminTab('photos')}
                className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeAdminTab === 'photos'
                    ? 'bg-[#023264] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#86efac]" />
                <span>Gallery & Reorder ({photos.length})</span>
              </button>

              <button
                type="button"
                onClick={openAddPhotoModal}
                className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeAdminTab === 'edit_form'
                    ? 'bg-[#023264] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-[#dfc18b]" />
                <span>{editingPhoto ? 'Edit Photo' : 'Add New Photo'}</span>
              </button>
            </div>

            {/* TAB 1: SHOWCASE DETAILS CONFIGURATION */}
            {activeAdminTab === 'details' && (
              <form onSubmit={handleSaveShowcaseConfig} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-200">
                    Showcase Section Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={configForm.showcaseTitle}
                    onChange={(e) => setConfigForm({ ...configForm, showcaseTitle: e.target.value })}
                    placeholder="e.g. Graduation Showcase & Cohort Admissions"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-200">
                    Showcase Subtitle / Mission Statement *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={configForm.showcaseSubtitle}
                    onChange={(e) => setConfigForm({ ...configForm, showcaseSubtitle: e.target.value })}
                    placeholder="Describe the cohort graduation equipping and admissions callout..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      Cohort Highlight Badge Text *
                    </label>
                    <input
                      type="text"
                      required
                      value={configForm.cohortBadgeText}
                      onChange={(e) => setConfigForm({ ...configForm, cohortBadgeText: e.target.value })}
                      placeholder="e.g. Class of 2025 Commencement"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      Admissions Button / Pill Text
                    </label>
                    <input
                      type="text"
                      value={configForm.admissionsBadgeText}
                      onChange={(e) => setConfigForm({ ...configForm, admissionsBadgeText: e.target.value })}
                      placeholder="e.g. Next Cohort Admissions Open"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Milestone Statistics */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Milestone Badges (Bottom Right of Slide)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Stat 1 Count</label>
                      <input
                        type="text"
                        value={configForm.stat1Count}
                        onChange={(e) => setConfigForm({ ...configForm, stat1Count: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Stat 1 Label</label>
                      <input
                        type="text"
                        value={configForm.stat1Label}
                        onChange={(e) => setConfigForm({ ...configForm, stat1Label: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Stat 2 Count</label>
                      <input
                        type="text"
                        value={configForm.stat2Count}
                        onChange={(e) => setConfigForm({ ...configForm, stat2Count: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Stat 2 Label</label>
                      <input
                        type="text"
                        value={configForm.stat2Label}
                        onChange={(e) => setConfigForm({ ...configForm, stat2Label: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Autoplay Speed & Framing & Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      Roving Auto-rotation Speed
                    </label>
                    <select
                      value={configForm.autoplaySpeedSeconds}
                      onChange={(e) => setConfigForm({ ...configForm, autoplaySpeedSeconds: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    >
                      <option value={3}>Fast (3 Seconds)</option>
                      <option value={5}>Standard (5 Seconds)</option>
                      <option value={7}>Relaxed (7 Seconds)</option>
                      <option value={10}>Slow (10 Seconds)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      Default Image Framing
                    </label>
                    <select
                      value={configForm.defaultFitMode || 'contain'}
                      onChange={(e) => setConfigForm({ ...configForm, defaultFitMode: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="contain">Smart Fit (Full Photo Uncropped — Recommended)</option>
                      <option value="top">Top Focus (Keep Heads in Frame)</option>
                      <option value="cover">Fill Stage (Full Bleed Cover)</option>
                    </select>
                  </div>

                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configForm.enableAdmissionsPill}
                        onChange={(e) => setConfigForm({ ...configForm, enableAdmissionsPill: e.target.checked })}
                        className="rounded text-[#023264] focus:ring-[#023264]"
                      />
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                        Display "Next Cohort" Badge
                      </span>
                    </label>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
                  {isResetConfirming ? (
                    <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/70 p-1.5 rounded-xl border border-rose-300 dark:border-rose-700 animate-fadeIn">
                      <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                        Reset all to Class of 2025 defaults?
                      </span>
                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                      >
                        Yes, Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsResetConfirming(false)}
                        className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsResetConfirming(true)}
                      className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset All Defaults</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#023264] hover:bg-[#025798] text-white font-black rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md border border-[#b38f53]/30"
                  >
                    <Check className="w-4 h-4 text-[#dfc18b]" />
                    <span>Save Showcase Details</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: PHOTO GALLERY MANAGER & REORDER */}
            {activeAdminTab === 'photos' && (
              <div className="space-y-3">
                {/* Active Photo Deletion Confirmation Banner */}
                {photoToDelete && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-400 dark:border-rose-700 rounded-xl flex items-center justify-between gap-3 text-xs animate-fadeIn shadow-xs">
                    <div className="flex items-center gap-2.5 text-rose-900 dark:text-rose-200 font-bold min-w-0">
                      <div className="p-1.5 bg-rose-100 dark:bg-rose-900 rounded-lg text-rose-600 dark:text-rose-200 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-black">
                          Delete "{photoToDelete.title}"?
                        </p>
                        <p className="text-[10px] text-rose-600 dark:text-rose-300 font-normal">
                          This photo will be immediately removed from the carousel rotation.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPhotoToDelete(null)}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded-lg cursor-pointer text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => executeDeletePhoto(photoToDelete.id)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-lg cursor-pointer text-xs shadow flex items-center gap-1 active:opacity-80"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Delete</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      Graduation Photos Sequence ({photos.length} Total)
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Reorder, duplicate, edit, or delete slides in the carousel.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openAddPhotoModal}
                    className="px-3 py-1.5 bg-[#023264] hover:bg-[#025798] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-xs shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#dfc18b]" />
                    <span>Add New Photo</span>
                  </button>
                </div>

                {photos.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <GraduationCap className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">No photos in the gallery</p>
                    <p className="text-xs text-slate-500 mb-3">Add graduation photos or restore default highlights.</p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={openAddPhotoModal}
                        className="px-3 py-1.5 bg-[#023264] text-white rounded-lg text-xs font-bold"
                      >
                        Add Photo
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold"
                      >
                        Restore Defaults
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {photos.map((p, idx) => {
                      const isPendingDelete = photoToDelete?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isPendingDelete
                              ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 ring-2 ring-rose-400/50'
                              : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Order Number & Move Buttons */}
                            <div className="flex flex-col items-center">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMovePhoto(idx, 'up')}
                                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                                title="Move Up in Sequence"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-mono text-[10px] font-bold text-slate-500">
                                0{idx + 1}
                              </span>
                              <button
                                type="button"
                                disabled={idx === photos.length - 1}
                                onClick={() => handleMovePhoto(idx, 'down')}
                                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                                title="Move Down in Sequence"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Thumbnail */}
                            <div className="w-12 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
                              <img
                                src={p.imageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = gradStageAsset; }}
                              />
                            </div>

                            {/* Details */}
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-900 dark:text-white truncate text-xs">
                                {p.title}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {p.cohortYear} • <span className="uppercase font-bold text-[#025798] dark:text-[#bae6fd]">{p.category}</span> {p.scripture && `• ${p.scripture}`}
                              </p>
                            </div>
                          </div>

                          {/* Photo Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDuplicatePhoto(p)}
                              className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Duplicate photo"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditPhotoModal(p)}
                              className="p-1.5 bg-[#023264] hover:bg-[#025798] text-white rounded-lg transition-colors cursor-pointer"
                              title="Edit photo details"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#dfc18b]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequestDeletePhoto(p)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isPendingDelete
                                  ? 'bg-rose-600 text-white font-bold'
                                  : 'bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-600 dark:text-rose-300'
                              }`}
                              title="Delete photo from sequence"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ADD / EDIT PHOTO FORM */}
            {activeAdminTab === 'edit_form' && (
              <form onSubmit={handleSavePhotoForm} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700 rounded-xl text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
                    <X className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-200">
                    Photo Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Class of 2025 Commencement Ceremony"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      Cohort Year *
                    </label>
                    <input
                      type="text"
                      required
                      value={formCohortYear}
                      onChange={(e) => setFormCohortYear(e.target.value)}
                      placeholder="e.g., Class of 2025"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      Category Tag *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="commencement">Commencement Stage</option>
                      <option value="diploma">Diploma Presentation</option>
                      <option value="prayer">Apostolic Impartation & Prayer</option>
                      <option value="celebration">Victory Celebration</option>
                      <option value="fellowship">Family & Reception</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      Framing & Aspect Fit
                    </label>
                    <select
                      value={formImageFit}
                      onChange={(e) => setFormImageFit(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="contain">Smart Fit (Full Photo, No Cropping - Recommended)</option>
                      <option value="top">Top Focus (Keep Heads in Frame)</option>
                      <option value="cover">Fill Stage (Cover Crop)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-200">
                    Photo Image (URL or Upload) *
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      required
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="https://... or upload image below"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
                    />
                    
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-[#023264] hover:bg-[#025798] text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 text-xs transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Image File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      {isUploading && <span className="text-slate-500 animate-pulse">Uploading photo...</span>}
                    </div>
                  </div>
                </div>

                {formImageUrl && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-950 border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                        <img
                          src={formImageUrl}
                          alt="Preview"
                          className={`w-full h-full ${
                            formImageFit === 'contain'
                              ? 'object-contain'
                              : formImageFit === 'top'
                              ? 'object-cover object-top'
                              : 'object-cover object-center'
                          }`}
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-700 dark:text-slate-200 font-bold block">
                          Framing Preview: {formImageFit === 'contain' ? 'Smart Fit (Uncropped)' : formImageFit === 'top' ? 'Top Focused' : 'Fill Stage'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formImageFit === 'contain' ? 'Entire photo visible without clipping' : 'Stage filled with selected anchor'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold">
                      Ready
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-200">
                    Description / Caption
                  </label>
                  <textarea
                    rows={2}
                    value={formCaption}
                    onChange={(e) => setFormCaption(e.target.value)}
                    placeholder="Describe this graduation moment..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      Scripture Verse (Optional)
                    </label>
                    <input
                      type="text"
                      value={formScripture}
                      onChange={(e) => setFormScripture(e.target.value)}
                      placeholder="e.g., 2 Timothy 2:2"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200">
                      Student Honors (Comma Separated)
                    </label>
                    <input
                      type="text"
                      value={formHonors}
                      onChange={(e) => setFormHonors(e.target.value)}
                      placeholder="Valedictorian Distinction, 100% Attendance, Exegesis Honors"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-200">
                    Benediction Quote / Scripture Text
                  </label>
                  <input
                    type="text"
                    value={formQuote}
                    onChange={(e) => setFormQuote(e.target.value)}
                    placeholder="Quote or scripture text..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveAdminTab('photos')}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                    >
                      Back to Photo List
                    </button>

                    {editingPhoto && (
                      <button
                        type="button"
                        onClick={() => {
                          handleRequestDeletePhoto(editingPhoto);
                          setActiveAdminTab('photos');
                        }}
                        className="px-3 py-2 bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-600 rounded-xl font-bold flex items-center gap-1 cursor-pointer text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Photo</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#023264] hover:bg-[#025798] text-white font-black rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md border border-[#b38f53]/30"
                  >
                    <Check className="w-4 h-4 text-[#dfc18b]" />
                    <span>{editingPhoto ? 'Save Changes to Photo' : 'Add Photo to Gallery'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
};
