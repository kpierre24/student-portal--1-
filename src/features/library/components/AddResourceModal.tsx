import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Upload,
  FileText,
  Video,
  Globe,
  Headphones,
  File,
  Presentation,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Loader2,
  Play,
  Users,
  GraduationCap,
  Layers,
  Save,
  Rocket,
  AlertCircle,
  Tag,
  ExternalLink,
  BookOpen,
  Info,
  Film
} from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { Course } from '../../../types';
import { 
  ResourceType, 
  ResourceAccessLevel, 
  LearningResource,
  ResourceStatus 
} from '../types';
import { CURRICULUM_MODULES } from './LibraryTab';
import { HTEIM_CURRICULUM_COURSES } from '../data/curriculumStructure';
import { parseVideoMediaUrl } from '../../../lib/mediaUtils';
import { normalizeUrl } from '../utils/urlNormalizer';
import { extractCleanTextFromFile, readFileAsDataUrl, formatFileSize } from '../services/fileProcessingService';
import { createLearningResource, toLegacyResource } from '../model';
import { LibraryResource } from '../../../types';

export interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveResource: (resource: LibraryResource, isDraft: boolean) => void;
  courses?: Course[];
  initialPlacement?: {
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
  };
  currentUserRole?: string;
  currentUserName?: string;
}

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;

interface MaterialOption {
  type: ResourceType;
  label: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderColor: string;
  bgLight: string;
  formatsNotice: string;
}

const MATERIAL_OPTIONS: MaterialOption[] = [
  {
    type: 'pdf',
    label: 'PDF Document',
    badge: 'PDF',
    description: 'Syllabi, theological textbooks, student handbooks, and study manuals.',
    icon: FileText,
    accentColor: 'text-red-600',
    borderColor: 'border-red-200 dark:border-red-900 hover:border-red-500',
    bgLight: 'bg-red-50/50 dark:bg-red-950/30',
    formatsNotice: 'Upload .pdf files up to 50 MB'
  },
  {
    type: 'video',
    label: 'Video',
    badge: 'VIDEO',
    description: 'YouTube sermons, Vimeo lectures, Google Drive recordings, or MP4 video uploads.',
    icon: Video,
    accentColor: 'text-rose-600',
    borderColor: 'border-rose-200 dark:border-rose-900 hover:border-rose-500',
    bgLight: 'bg-rose-50/50 dark:bg-rose-950/30',
    formatsNotice: 'Paste YouTube / Vimeo / Drive links, or upload .mp4, .webm'
  },
  {
    type: 'link',
    label: 'Website / Web Link',
    badge: 'LINK',
    description: 'Online research portals, Greek/Hebrew lexicons, and ministry websites.',
    icon: Globe,
    accentColor: 'text-emerald-600',
    borderColor: 'border-emerald-200 dark:border-emerald-900 hover:border-emerald-500',
    bgLight: 'bg-emerald-50/50 dark:bg-emerald-950/30',
    formatsNotice: 'External URLs (https://...) with instant link verification'
  },
  {
    type: 'audio',
    label: 'Audio',
    badge: 'AUDIO',
    description: 'Sermon MP3s, chapel recordings, podcast episodes, and oral Bible lessons.',
    icon: Headphones,
    accentColor: 'text-amber-600',
    borderColor: 'border-amber-200 dark:border-amber-900 hover:border-amber-500',
    bgLight: 'bg-amber-50/50 dark:bg-amber-950/30',
    formatsNotice: 'Upload .mp3, .wav, .m4a or stream audio links'
  },
  {
    type: 'document',
    label: 'Document',
    badge: 'DOC',
    description: 'Word (.docx/.doc), Rich Text, or Markdown lecture notes and outlines.',
    icon: File,
    accentColor: 'text-blue-600',
    borderColor: 'border-blue-200 dark:border-blue-900 hover:border-blue-500',
    bgLight: 'bg-blue-50/50 dark:bg-blue-950/30',
    formatsNotice: 'Word (.docx/.doc), Markdown (.md), and Text (.txt)'
  },
  {
    type: 'presentation',
    label: 'Presentation',
    badge: 'SLIDES',
    description: 'PowerPoint (.pptx), Google Slides links, and classroom slide decks.',
    icon: Presentation,
    accentColor: 'text-purple-600',
    borderColor: 'border-purple-200 dark:border-purple-900 hover:border-purple-500',
    bgLight: 'bg-purple-50/50 dark:bg-purple-950/30',
    formatsNotice: 'PowerPoint (.pptx), PDF slides, or web deck URLs'
  },
  {
    type: 'image',
    label: 'Image / Infographic',
    badge: 'IMAGE',
    description: 'Biblical timelines, tabernacle diagrams, maps, and theological infographics.',
    icon: ImageIcon,
    accentColor: 'text-pink-600',
    borderColor: 'border-pink-200 dark:border-pink-900 hover:border-pink-500',
    bgLight: 'bg-pink-50/50 dark:bg-pink-950/30',
    formatsNotice: '.png, .jpg, .svg, .webp graphic assets'
  }
];

const STANDARD_CATEGORIES = [
  'Study Guide',
  'Textbook',
  'Lecture Audio',
  'Livestream Recording',
  'Syllabus',
  'Exegetical Paper',
  'Handout',
  'Research Portal',
  'Biblical Commentary',
  'Pastoral Manual',
  'General Ministry'
];

const SUGGESTED_TAGS = [
  'Hermeneutics',
  'Apostolic',
  'Five-Fold',
  'Exegesis',
  'Ethics',
  'Leadership',
  'Theology',
  'Eschatology',
  'Homiletics',
  'Prophetic',
  'Church History',
  'Greek & Hebrew'
];

export const AddResourceModal: React.FC<AddResourceModalProps> = ({
  isOpen,
  onClose,
  onSaveResource,
  courses = [],
  initialPlacement,
  currentUserName = 'HTEIM Faculty'
}) => {
  // Step state
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Material Selection
  const [materialType, setMaterialType] = useState<ResourceType>('pdf');

  // Step 2: Content
  const [videoSourceMode, setVideoSourceMode] = useState<'url' | 'upload'>('url');
  const [audioSourceMode, setAudioSourceMode] = useState<'upload' | 'url'>('upload');
  const [documentSourceMode, setDocumentSourceMode] = useState<'upload' | 'text'>('upload');
  
  const [contentUrl, setContentUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const [extractedContent, setExtractedContent] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [fileLoading, setFileLoading] = useState(false);

  // Step 3: Information
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Study Guide');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [author, setAuthor] = useState(currentUserName || 'HTEIM Faculty');
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState(false);

  // Step 4: Academic Placement
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialPlacement?.courseId || 'SOM-CORE'
  );
  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    initialPlacement?.moduleId || 'SOM-MOD-1'
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    initialPlacement?.lessonId || ''
  );
  const [weekNumber, setWeekNumber] = useState<number | undefined>(1);
  const [isRequiredReading, setIsRequiredReading] = useState(false);

  // Step 5: Access Control
  const [accessLevel, setAccessLevel] = useState<ResourceAccessLevel>('everyone');
  const [specificAccessTarget, setSpecificAccessTarget] = useState<string>('');

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset or initialize on modal open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMsg(null);
      if (initialPlacement) {
        if (initialPlacement.courseId) setSelectedCourseId(initialPlacement.courseId);
        if (initialPlacement.moduleId) setSelectedModuleId(initialPlacement.moduleId);
        if (initialPlacement.lessonId) setSelectedLessonId(initialPlacement.lessonId);
      }
    }
  }, [isOpen, initialPlacement]);

  // Derive available modules for the selected course
  const currentCourseModules = React.useMemo(() => {
    if (selectedCourseId === 'SOM-CORE') {
      const coreCourse = HTEIM_CURRICULUM_COURSES.find(c => c.code === 'SOM-CORE');
      return coreCourse ? coreCourse.modules : CURRICULUM_MODULES;
    }
    return CURRICULUM_MODULES;
  }, [selectedCourseId]);

  // Derive available lessons for the selected module
  const currentModuleLessons = React.useMemo(() => {
    const coreCourse = HTEIM_CURRICULUM_COURSES.find(c => c.code === 'SOM-CORE');
    const mod = coreCourse?.modules.find(m => m.code === selectedModuleId);
    return mod?.lessons || [];
  }, [selectedModuleId]);

  // Handle file selection
  const handleFileSelected = async (file: File) => {
    setFileLoading(true);
    setErrorMsg(null);
    try {
      setUploadedFile(file);

      // Auto-populate Title if empty
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setTitle(cleanName);
      }

      // Read as Data URL for local in-app viewing & persistence
      const dataUrl = await readFileAsDataUrl(file);
      setFileDataUrl(dataUrl);

      // Extract plain text for preview & AI summary if document/pdf/text
      const text = await extractCleanTextFromFile(file);
      setExtractedContent(text);

      // Auto-set Category based on file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') {
        if (category === 'Study Guide' && !description) setCategory('Study Guide');
      } else if (ext === 'mp3' || ext === 'wav' || ext === 'm4a') {
        setCategory('Lecture Audio');
      } else if (ext === 'pptx' || ext === 'ppt') {
        setCategory('Handout');
      }
    } catch (err: any) {
      setErrorMsg(`Failed to process file: ${err.message || 'Unknown error'}`);
    } finally {
      setFileLoading(false);
    }
  };

  // Add tag helper
  const handleAddTag = (newTag: string) => {
    const trimmed = newTag.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  // Remove tag helper
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Auto-generate AI summary
  const handleGenerateAiSummary = async () => {
    setIsGeneratingAiSummary(true);
    try {
      // Build sample content to summarize
      const sampleText = extractedContent || pastedText || contentUrl || title;
      if (!sampleText) {
        setDescription(`Theological training resource on ${title || 'biblical curriculum'} for ministerial development.`);
        return;
      }
      
      // Generate clean summary from text
      const cleanSnippet = sampleText.replace(/[\n\r]+/g, ' ').slice(0, 300);
      setDescription(`Comprehensive ministerial resource covering foundational principles: "${cleanSnippet.slice(0, 180)}...". Structured for theological alignment and practical ministry application.`);
    } catch (e) {
      console.warn('AI summary error:', e);
    } finally {
      setIsGeneratingAiSummary(false);
    }
  };

  // Step Validation & Navigation
  const validateCurrentStep = (): boolean => {
    setErrorMsg(null);

    if (currentStep === 1) {
      if (!materialType) {
        setErrorMsg('Please select a material type to continue.');
        return false;
      }
      return true;
    }

    if (currentStep === 2) {
      if (materialType === 'video') {
        if (videoSourceMode === 'url') {
          if (!contentUrl.trim()) {
            setErrorMsg('Please paste a video URL (YouTube, Vimeo, Google Drive, or streaming link).');
            return false;
          }
        } else {
          if (!uploadedFile) {
            setErrorMsg('Please choose a video file to upload (.mp4, .webm).');
            return false;
          }
        }
      } else if (materialType === 'link') {
        if (!contentUrl.trim() || !contentUrl.startsWith('http')) {
          setErrorMsg('Please enter a valid website URL starting with https:// or http://');
          return false;
        }
      } else if (materialType === 'audio') {
        if (audioSourceMode === 'upload' && !uploadedFile) {
          setErrorMsg('Please choose an audio file to upload (.mp3, .wav, .m4a).');
          return false;
        }
        if (audioSourceMode === 'url' && !contentUrl.trim()) {
          setErrorMsg('Please enter an audio stream or podcast URL.');
          return false;
        }
      } else if (materialType === 'document') {
        if (documentSourceMode === 'upload' && !uploadedFile) {
          setErrorMsg('Please choose a document file to upload (.docx, .doc, .txt, .md).');
          return false;
        }
        if (documentSourceMode === 'text' && !pastedText.trim()) {
          setErrorMsg('Please enter or paste your document text notes.');
          return false;
        }
      } else if (materialType === 'pdf' || materialType === 'presentation' || materialType === 'image') {
        if (!uploadedFile && !contentUrl.trim()) {
          setErrorMsg(`Please upload a ${materialType.toUpperCase()} file or enter a content link.`);
          return false;
        }
      }
      return true;
    }

    if (currentStep === 3) {
      if (!title.trim()) {
        setErrorMsg('Resource title is required.');
        return false;
      }
      return true;
    }

    if (currentStep === 4) {
      // Academic placement is optional or pre-filled with sensible defaults
      return true;
    }

    if (currentStep === 5) {
      if (!accessLevel) {
        setErrorMsg('Please select an access audience.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => (prev < 6 ? ((prev + 1) as StepNumber) : prev));
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as StepNumber) : prev));
  };

  // Final Action: Save Draft or Publish
  const handleFinalize = (isDraft: boolean) => {
    if (!title.trim()) {
      setErrorMsg('Resource Title is required.');
      setCurrentStep(3);
      return;
    }

    // Determine content URL / download URL
    let finalUrl = contentUrl.trim();
    let finalFileDataUrl = fileDataUrl;
    let finalFileName = uploadedFile?.name;
    let finalMimeType = uploadedFile?.type;
    let finalSize = uploadedFile ? formatFileSize(uploadedFile.size) : 'Online Resource';
    let finalFullContent = extractedContent || pastedText || '';

    // If video, normalize URL and check metadata
    if (materialType === 'video' && finalUrl) {
      const normalized = normalizeUrl(finalUrl);
      if (normalized.isValid) {
        if (normalized.canonicalUrl) finalUrl = normalized.canonicalUrl;
        if (normalized.provider === 'youtube') finalSize = 'YouTube HD Stream';
        else if (normalized.provider === 'vimeo') finalSize = 'Vimeo HD Stream';
        else if (normalized.provider === 'gdrive') finalSize = 'Google Drive Video';
        else if (normalized.provider === 'loom') finalSize = 'Loom Video';
      }
    }

    const newLearningRes: LearningResource = createLearningResource({
      id: `res_${materialType}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim() || `Theological learning resource for ${selectedModuleId || 'Ministry'} training.`,
      type: materialType,
      source: uploadedFile ? 'upload' : (materialType === 'video' && contentUrl.includes('youtube')) ? 'youtube' : 'external',
      url: finalUrl || undefined,
      fileDataUrl: finalFileDataUrl || undefined,
      fileName: finalFileName,
      mimeType: finalMimeType,
      size: finalSize,
      fullContent: finalFullContent || undefined,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      category,
      tags,
      courseId: selectedCourseId,
      moduleId: selectedModuleId,
      lessonId: selectedLessonId || undefined,
      weekNumber: weekNumber || undefined,
      isRequiredReading,
      uploadedBy: author || currentUserName || 'HTEIM Faculty',
      status: isDraft ? 'draft' : 'published',
      isPublished: !isDraft,
      accessLevel,
      accessCourseId: accessLevel === 'specific-course' ? (specificAccessTarget || selectedCourseId) : undefined,
      accessModuleId: accessLevel === 'specific-module' ? (specificAccessTarget || selectedModuleId) : undefined,
      isDownloadable: materialType !== 'link',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const legacyResource = toLegacyResource(newLearningRes);
    onSaveResource(legacyResource, isDraft);
    onClose();
  };

  const stepsList = [
    { num: 1, label: 'Material' },
    { num: 2, label: 'Content' },
    { num: 3, label: 'Information' },
    { num: 4, label: 'Placement' },
    { num: 5, label: 'Access' },
    { num: 6, label: 'Publishing' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Learning Resource Workflow"
      icon={<GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
      size="xl"
    >
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* Step-based progress tracker header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
            {stepsList.map((st, idx) => {
              const isCompleted = currentStep > st.num;
              const isActive = currentStep === st.num;

              return (
                <div key={st.num} className="flex items-center flex-1 min-w-[70px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (st.num < currentStep) {
                        setCurrentStep(st.num as StepNumber);
                      }
                    }}
                    disabled={st.num > currentStep}
                    className={`flex items-center gap-1.5 text-2xs font-extrabold transition-all cursor-pointer ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 font-black'
                        : isCompleted
                        ? 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
                        : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.num}
                    </span>
                    <span className="hidden sm:inline truncate">{st.label}</span>
                  </button>
                  {idx < stepsList.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-1.5 rounded transition-colors ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body: Content for each Step */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* ========================================================================= */}
          {/* STEP 1: MATERIAL — What are you adding? */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Step 1: Choose Material Type
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  What kind of learning material or resource are you adding to the library?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {MATERIAL_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = materialType === opt.type;

                  return (
                    <div
                      key={opt.type}
                      onClick={() => {
                        setMaterialType(opt.type);
                        setErrorMsg(null);
                        // Auto-assign default category
                        if (opt.type === 'video') setCategory('Livestream Recording');
                        else if (opt.type === 'audio') setCategory('Lecture Audio');
                        else if (opt.type === 'pdf') setCategory('Study Guide');
                        else if (opt.type === 'link') setCategory('Research Portal');
                      }}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 relative ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-sm'
                          : `${opt.borderColor} ${opt.bgLight} hover:shadow-xs`
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-xl bg-white dark:bg-slate-900 shadow-2xs shrink-0 ${opt.accentColor}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white">
                            {opt.label}
                          </h4>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {opt.description}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                          {opt.formatsNotice}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 text-indigo-600 dark:text-indigo-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: CONTENT — Depending on Type */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Step 2: Provide Content for {MATERIAL_OPTIONS.find(m => m.type === materialType)?.label}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload your file, paste a streaming video link, or enter web references.
                </p>
              </div>

              {/* ---------------- PDF CONTENT ---------------- */}
              {materialType === 'pdf' && (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-red-200 dark:border-red-900/60 hover:border-red-500 bg-red-50/40 dark:bg-red-950/20 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2"
                  >
                    <FileText className="w-8 h-8 text-red-600 mx-auto" />
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {uploadedFile ? uploadedFile.name : 'Click or Drag & Drop PDF File Here'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {uploadedFile
                          ? `Size: ${formatFileSize(uploadedFile.size)} • Ready to attach`
                          : 'Supports textbooks, syllabi, notes, and study outlines (.pdf)'}
                      </p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  <div className="pt-2">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Or Paste External PDF URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://domain.org/documents/manual.pdf"
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ---------------- VIDEO CONTENT ---------------- */}
              {materialType === 'video' && (
                <div className="space-y-3">
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setVideoSourceMode('url')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        videoSourceMode === 'url'
                          ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> YouTube / Vimeo / Drive URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoSourceMode('upload')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        videoSourceMode === 'upload'
                          ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" /> Upload Video File (.mp4)
                    </button>
                  </div>

                  {videoSourceMode === 'url' ? (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                            Video Share URL *
                          </label>
                          <div className="flex items-center gap-1.5 text-2xs">
                            <button
                              type="button"
                              onClick={() => {
                                setContentUrl('https://www.youtube.com/watch?v=0-7I443BLoE');
                                if (!title) setTitle('Apostolic Foundations & Ephesians 4:11 Ministry Governance');
                              }}
                              className="text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                            >
                              Sample YouTube
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                setContentUrl('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing');
                                if (!title) setTitle('Sunday Livestream Ministry Lecture');
                              }}
                              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                            >
                              Sample Drive
                            </button>
                          </div>
                        </div>
                        <input
                          type="url"
                          placeholder="YouTube, Vimeo, Google Drive link (e.g. https://youtu.be/... or https://vimeo.com/...)"
                          value={contentUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setContentUrl(val);
                            const norm = normalizeUrl(val);
                            if (norm.isValid) {
                              if (norm.provider === 'youtube' && !title) setTitle(`YouTube Sermon (${norm.externalId})`);
                              else if (norm.provider === 'vimeo' && !title) setTitle(`Vimeo Lecture (${norm.externalId})`);
                              else if (norm.provider === 'gdrive' && !title) setTitle('Classroom Video Recording');
                              if (norm.thumbnailUrl && !thumbnailUrl) setThumbnailUrl(norm.thumbnailUrl);
                            }
                          }}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-rose-700 dark:text-rose-300 focus:outline-none"
                        />
                      </div>

                      {/* Video Detection & Preview */}
                      {contentUrl.trim() && (() => {
                        const parsed = normalizeUrl(contentUrl);
                        return (
                          <div className="space-y-2">
                            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs flex items-center justify-between text-rose-900 dark:text-rose-200 font-semibold">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>Platform: <strong className="capitalize">{parsed.provider}</strong> {parsed.externalId ? `(ID: ${parsed.externalId})` : ''}</span>
                              </div>
                              {parsed.externalId && (
                                <span className="text-[10px] font-mono bg-rose-200 dark:bg-rose-900/60 px-2 py-0.5 rounded text-rose-800 dark:text-rose-200">
                                  externalId: {parsed.externalId}
                                </span>
                              )}
                            </div>

                            {parsed.embedUrl && (
                              <div className="w-full h-44 sm:h-52 bg-black rounded-xl overflow-hidden shadow-inner">
                                <iframe
                                  src={parsed.embedUrl}
                                  className="w-full h-full border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  title="Video Upload Preview"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-rose-200 dark:border-rose-900/60 hover:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2"
                      >
                        <Video className="w-8 h-8 text-rose-600 mx-auto" />
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {uploadedFile ? uploadedFile.name : 'Select Video File (.mp4, .webm, .mov)'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {uploadedFile ? `Size: ${formatFileSize(uploadedFile.size)}` : 'Direct video file upload'}
                          </p>
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileSelected(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- WEBSITE CONTENT ---------------- */}
              {materialType === 'link' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Website URL *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://www.blueletterbible.org or https://ecfa.org"
                        value={contentUrl}
                        onChange={(e) => setContentUrl(e.target.value)}
                        className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-emerald-700 dark:text-emerald-300 focus:outline-none"
                      />
                      {contentUrl.startsWith('http') && (
                        <a
                          href={contentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Test
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl space-y-1.5">
                    <p className="text-2xs font-bold uppercase text-emerald-800 dark:text-emerald-300">
                      Quick Theological Portals Preset:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { name: 'ECFA Financial Ethics', url: 'https://www.ecfa.org', title: 'ECFA Financial Integrity & Church Accountability Standards' },
                        { name: 'Blue Letter Bible', url: 'https://www.blueletterbible.org', title: 'Blue Letter Bible Greek & Hebrew Lexicon Portal' },
                        { name: 'Bible Gateway', url: 'https://www.biblegateway.com', title: 'Bible Gateway Multi-Translation Theological Database' },
                        { name: 'Christian Classics Library', url: 'https://www.ccel.org', title: 'CCEL Christian Classics Ethereal Library' },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setContentUrl(preset.url);
                            if (!title) setTitle(preset.title);
                          }}
                          className="text-2xs font-semibold px-2.5 py-1 bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- AUDIO CONTENT ---------------- */}
              {materialType === 'audio' && (
                <div className="space-y-3">
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAudioSourceMode('upload')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        audioSourceMode === 'upload'
                          ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Upload Audio (.mp3, .wav)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioSourceMode('url')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        audioSourceMode === 'url'
                          ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Streaming Audio / Podcast Link
                    </button>
                  </div>

                  {audioSourceMode === 'upload' ? (
                    <div>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-amber-200 dark:border-amber-900/60 hover:border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2"
                      >
                        <Headphones className="w-8 h-8 text-amber-600 mx-auto" />
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {uploadedFile ? uploadedFile.name : 'Upload Sermon or Lecture Audio File'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {uploadedFile ? `Size: ${formatFileSize(uploadedFile.size)}` : 'Supports MP3, WAV, M4A'}
                          </p>
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileSelected(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Audio Streaming Link (URL) *
                      </label>
                      <input
                        type="url"
                        placeholder="https://stream.server.org/audio/sermon.mp3"
                        value={contentUrl}
                        onChange={(e) => setContentUrl(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-amber-700 dark:text-amber-300 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Audio Preview Bar */}
                  {(fileDataUrl || contentUrl) && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900 space-y-1">
                      <p className="text-2xs font-bold text-slate-500 uppercase">Audio Preview Player:</p>
                      <audio controls src={fileDataUrl || contentUrl} className="w-full h-8">
                        Your browser does not support audio element.
                      </audio>
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- DOCUMENT CONTENT ---------------- */}
              {materialType === 'document' && (
                <div className="space-y-3">
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setDocumentSourceMode('upload')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        documentSourceMode === 'upload'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Upload Word / Markdown File
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocumentSourceMode('text')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        documentSourceMode === 'text'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Paste Notes / Transcript
                    </button>
                  </div>

                  {documentSourceMode === 'upload' ? (
                    <div>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-blue-200 dark:border-blue-900/60 hover:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2"
                      >
                        <File className="w-8 h-8 text-blue-600 mx-auto" />
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {uploadedFile ? uploadedFile.name : 'Upload Word (.docx), Markdown (.md), or Text (.txt)'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {uploadedFile
                              ? `Size: ${formatFileSize(uploadedFile.size)} • Text extracted successfully`
                              : 'Automatic text extraction & formatting enabled'}
                          </p>
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".docx,.doc,.txt,.md"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileSelected(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />

                      {extractedContent && (
                        <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-2xs text-slate-600 dark:text-slate-300 max-h-24 overflow-y-auto">
                          <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">Preview of extracted text:</p>
                          <p className="italic line-clamp-3">{extractedContent.slice(0, 300)}...</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Paste Notes, Lecture Outlines or Manuscript *
                      </label>
                      <textarea
                        rows={6}
                        placeholder="Paste complete sermon manuscript, lecture outline, or study notes here..."
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- PRESENTATION CONTENT ---------------- */}
              {materialType === 'presentation' && (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-purple-200 dark:border-purple-900/60 hover:border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2"
                  >
                    <Presentation className="w-8 h-8 text-purple-600 mx-auto" />
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {uploadedFile ? uploadedFile.name : 'Upload PowerPoint (.pptx) or Slide Deck'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {uploadedFile ? `Size: ${formatFileSize(uploadedFile.size)}` : 'Supports PPTX, PPT, and presentation slides'}
                      </p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pptx,.ppt,.pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Or Paste Google Slides / Canva Share Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://docs.google.com/presentation/d/.../edit"
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-purple-700 dark:text-purple-300 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ---------------- IMAGE CONTENT ---------------- */}
              {materialType === 'image' && (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-pink-200 dark:border-pink-900/60 hover:border-pink-500 bg-pink-50/40 dark:bg-pink-950/20 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2"
                  >
                    <ImageIcon className="w-8 h-8 text-pink-600 mx-auto" />
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {uploadedFile ? uploadedFile.name : 'Upload Image, Chart, or Infographic'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {uploadedFile ? `Size: ${formatFileSize(uploadedFile.size)}` : 'Supports PNG, JPG, WEBP, SVG'}
                      </p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {fileDataUrl && (
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-pink-200 dark:border-pink-900 text-center">
                      <img
                        src={fileDataUrl}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: INFORMATION — Metadata, Title, Summary, Tags, Thumbnail */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-3.5">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Step 3: Resource Information
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provide descriptive information and metadata for cataloging.
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Expository Hermeneutics & Grammatical Exegesis Handbook"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Description + AI Assistant */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                    Description & Overview
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAiSummary}
                    disabled={isGeneratingAiSummary}
                    className="text-2xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    {isGeneratingAiSummary ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-amber-500" />
                    )}
                    <span>AI Generate Summary</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  placeholder="Provide an overview of key takeaways, spiritual goals, and core ministerial topics..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              {/* Category & Author */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    {STANDARD_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Instructor / Author
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Faculty Director"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tags Input with Suggestions */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Theological & Curriculum Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Type tag and press Enter (e.g. Hermeneutics)..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagInput)}
                    className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-300"
                  >
                    Add
                  </button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-2xs font-extrabold border border-indigo-200 dark:border-indigo-800"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1 text-2xs text-slate-500">
                  <span className="font-bold">Suggested:</span>
                  {SUGGESTED_TAGS.slice(0, 6).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleAddTag(st)}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                    >
                      +{st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thumbnail URL */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Cover / Thumbnail Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://.../cover.jpg"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: ACADEMIC PLACEMENT — Course, Module, Lesson */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Step 4: Academic Curriculum Placement
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Link this material directly to Course, Module, and Lesson nodes for student curriculum bundles.
                </p>
              </div>

              {/* Course Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  1. Academic Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setSelectedCourseId(cId);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="SOM-CORE">
                    SOM-CORE — School of Ministry Core Curriculum (Diploma Track)
                  </option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.code || c.id}>
                      {c.code || c.id} — {c.title}
                    </option>
                  ))}
                  <option value="GENERAL">General Institutional Library (Not course specific)</option>
                </select>
              </div>

              {/* Module Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  2. Curriculum Module
                </label>
                <select
                  value={selectedModuleId}
                  onChange={(e) => {
                    setSelectedModuleId(e.target.value);
                    setSelectedLessonId(''); // reset lesson
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="">General Course Material (All Modules)</option>
                  {currentCourseModules.map((m: any) => (
                    <option key={m.code} value={m.code}>
                      {m.code} — {m.fullName || m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lesson Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  3. Specific Lesson Association
                </label>
                <select
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="">General Module Material (Associated with all lessons in this module)</option>
                  {currentModuleLessons.length > 0 ? (
                    currentModuleLessons.map((l: any) => (
                      <option key={l.id} value={l.id}>
                        Lesson {l.lessonNumber}: {l.title}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value={`${selectedModuleId}-L1`}>Lesson 1: Foundations & Core Principles</option>
                      <option value={`${selectedModuleId}-L2`}>Lesson 2: Exegetical Studies & Application</option>
                      <option value={`${selectedModuleId}-L3`}>Lesson 3: Practical Ministry & Governance</option>
                      <option value={`${selectedModuleId}-L4`}>Lesson 4: Leadership Synthesis & Review</option>
                    </>
                  )}
                </select>
              </div>

              {/* Week Number & Required Reading */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Syllabus Week (1–12)
                  </label>
                  <select
                    value={weekNumber || 1}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>
                        Week {w}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isRequiredReading}
                      onChange={(e) => setIsRequiredReading(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mark as Required Core Material
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: ACCESS — Who can access this? */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-3.5">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Step 5: Audience & Access Control
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Who can access and view this learning resource?
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    id: 'everyone',
                    label: 'Everyone',
                    desc: 'Public to all users, active students, teachers, alumni, and guest auditors.',
                    icon: Globe,
                    badge: 'Public'
                  },
                  {
                    id: 'students',
                    label: 'Students',
                    desc: 'Restricted to enrolled School of Ministry students and verified teaching faculty.',
                    icon: GraduationCap,
                    badge: 'Enrolled'
                  },
                  {
                    id: 'teachers',
                    label: 'Teachers & Faculty',
                    desc: 'Restricted to faculty and administrators only (lesson plans, answer keys, rubrics).',
                    icon: Users,
                    badge: 'Staff Only'
                  },
                  {
                    id: 'specific-course',
                    label: 'Specific Course',
                    desc: 'Accessible exclusively to students currently enrolled in the specified course.',
                    icon: Layers,
                    badge: 'Course Gated'
                  },
                  {
                    id: 'specific-module',
                    label: 'Specific Module',
                    desc: 'Accessible exclusively to students active in the designated module track.',
                    icon: BookOpen,
                    badge: 'Module Gated'
                  }
                ].map((acc) => {
                  const isSelected = accessLevel === acc.id;
                  const Icon = acc.icon;

                  return (
                    <label
                      key={acc.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <input
                        type="radio"
                        name="accessLevel"
                        value={acc.id}
                        checked={isSelected}
                        onChange={() => setAccessLevel(acc.id as ResourceAccessLevel)}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            {acc.label}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {acc.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {acc.desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Sub-selector if Specific Course or Specific Module is selected */}
              {(accessLevel === 'specific-course' || accessLevel === 'specific-module') && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <label className="block text-2xs font-bold uppercase text-slate-600 dark:text-slate-300">
                    {accessLevel === 'specific-course' ? 'Target Course Code:' : 'Target Module Code:'}
                  </label>
                  <input
                    type="text"
                    placeholder={accessLevel === 'specific-course' ? selectedCourseId || 'SOM-CORE' : selectedModuleId || 'SOM-MOD-1'}
                    value={specificAccessTarget}
                    onChange={(e) => setSpecificAccessTarget(e.target.value.toUpperCase())}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold focus:outline-none"
                  />
                  <p className="text-3xs text-slate-400">
                    Leave blank to use the placement selected in Step 4 ({accessLevel === 'specific-course' ? selectedCourseId : selectedModuleId}).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: PUBLISHING — Review, Draft vs Publish */}
          {/* ========================================================================= */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Step 6: Review & Finalize
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review the summary details and choose to save as a draft or publish live immediately.
                </p>
              </div>

              {/* Summary Review Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md text-2xs font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {materialType.toUpperCase()}
                      </span>
                      <span className="text-2xs font-bold text-slate-500">
                        {category}
                      </span>
                      {isRequiredReading && (
                        <span className="px-1.5 py-0.5 rounded text-3xs font-black uppercase bg-amber-100 text-amber-800">
                          Required Core
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {title || 'Untitled Resource'}
                    </h4>
                    {description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                        {description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-2xs">
                  <div>
                    <span className="font-bold text-slate-400 block uppercase text-3xs">Placement:</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {selectedCourseId} &gt; {selectedModuleId}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-slate-400 block uppercase text-3xs">Audience:</span>
                    <span className="font-extrabold text-indigo-700 dark:text-indigo-300 capitalize">
                      {accessLevel}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-slate-400 block uppercase text-3xs">Author:</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {author}
                    </span>
                  </div>
                </div>

                {tags.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-3xs font-bold border border-slate-200 dark:border-slate-800"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Publishing Choice Explanations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-white font-extrabold text-xs">
                    <Save className="w-4 h-4 text-slate-500" />
                    <span>Save Draft</span>
                  </div>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Saves the resource privately. Only faculty and admins can view and edit drafts before public release.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-extrabold text-xs">
                    <Rocket className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Publish Resource</span>
                  </div>
                  <p className="text-2xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                    Makes the material immediately live in the portal, academic curriculum tree, and student lesson bundles.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="pt-4 mt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          <div className="flex items-center gap-2">
            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleFinalize(true)}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-100 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleFinalize(false)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5" /> Publish Resource
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
