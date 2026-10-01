import React, { useState, useEffect, useRef, useMemo } from 'react';
import mammoth from 'mammoth';
import { evaluateLesson } from '../../../lib/api/ai';
import { logger } from '../../../lib/logger';
import { 
  BookOpen, 
  Search, 
  Download, 
  FileText, 
  Filter, 
  CheckCircle2, 
  Headphones, 
  Video as VideoIcon,
  Play,
  Tv,
  Sparkles,
  BookMarked,
  Upload,
  Trash2,
  Plus,
  X,
  Eye,
  RotateCcw,
  FileCheck,
  Brain,
  Clock,
  User,
  Tag,
  Loader2,
  FileSpreadsheet,
  Lock,
  ShieldAlert,
  FileCode2,
  Copy,
  Pencil,
  Link,
  ExternalLink,
  Check,
  Edit3,
  Globe,
  GraduationCap,
  RefreshCw,
  CheckSquare,
  Square,
  Star,
  Award,
  Flame,
  Layers,
  Folder
} from 'lucide-react';
import { EmptyState } from '../../../components/UXPrimitives';
import { Modal } from '../../../components/Modal';
import { LibraryResource, MediaResource, Course, CustomAssignment } from '../../../types';
import { UserRole } from '../../../lib/userAuth';
import { ClassroomMediaPlayer, DEFAULT_PRESET_MEDIA } from '../../../components/ClassroomMediaPlayer';
import { parseVideoMediaUrl } from '../../../lib/mediaUtils';
import { DocumentReaderModal } from '../../../components/DocumentReaderModal';
import { ScriptureHoverPopover } from '../../../components/ScriptureHoverPopover';
import { ScriptureFlashcardsModal } from '../../../components/ScriptureFlashcardsModal';
import { parseTextWithScriptures, extractScriptureReferences } from '../../../utils/scriptureDetector';
import { createNoteFromLibraryExcerpt } from '../../../utils/notesStorage';
import { CurriculumHierarchyView } from './CurriculumHierarchyView';
import { AddResourceModal } from './AddResourceModal';
import { buildAcademicHierarchy } from '../services/curriculumHierarchyService';
import { toLegacyResource, toLearningResource } from '../model';
import { LibraryHomepage } from './LibraryHomepage';
import { MyLibraryView } from './MyLibraryView';
import { TeacherResourceManager } from './TeacherResourceManager';
import { ResourceViewer } from './viewers/ResourceViewer';
import { ResourceCollectionsView } from './ResourceCollectionsView';
import { ResourceShareModal } from './ResourceShareModal';
import { MyLibrarySection, LearningResource, ResourceCollection } from '../types';

export const CURRICULUM_MODULES = [
  { code: 'SOM-MOD-1', title: 'Mod 1: Intro', fullName: 'Module 1: Introduction & Foundations' },
  { code: 'SOM-MOD-2', title: 'Mod 2: Evangelism', fullName: 'Module 2: Evangelism & Soul Winning' },
  { code: 'SOM-MOD-3', title: 'Mod 3: Ethics', fullName: 'Module 3: Ministerial Character & Ethics' },
  { code: 'SOM-MOD-4', title: 'Mod 4: Apostolic', fullName: 'Module 4: Apostolic Governance & Epistles' },
  { code: 'SOM-MOD-5', title: 'Mod 5: Prophetic', fullName: 'Module 5: Prophetic Ministry & Discernment' },
  { code: 'SOM-MOD-6', title: 'Mod 6: Pastors', fullName: 'Module 6: School of Pastors & Expository Preaching' },
];

interface LibraryTabProps {
  userRole?: UserRole;
  resources?: LibraryResource[];
  setResources?: React.Dispatch<React.SetStateAction<LibraryResource[]>>;
  classroomMedia?: MediaResource[];
  setClassroomMedia?: React.Dispatch<React.SetStateAction<MediaResource[]>>;
  studentName?: string;
  onOpenDiagnostics?: () => void;
  onOpenNotes?: () => void;
  onOpenInBible?: (bookId: string, chapter: number, verse?: number) => void;
  courses?: Course[];
  customAssignments?: CustomAssignment[];
  onNavigateTab?: (tab: string) => void;
}

// Helper to check if text contains raw binary zip code / PK header from DOCX
const isBinaryZipContent = (text?: string): boolean => {
  if (!text) return false;
  return text.startsWith('PK\x03\x04') || 
         text.startsWith('PK') || 
         text.includes('[Content_Types].xml') || 
         text.includes('word/_rels/') || 
         text.includes('word/document.xml');
};

// Helper to extract clean text from file using Mammoth for DOCX
const extractCleanTextFromFile = async (file: File): Promise<string> => {
  const fileNameLower = (file.name || '').toLowerCase();
  const isDocx = fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc') || file.type.includes('wordprocessingml') || file.type.includes('msword');

  if (isDocx) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (result.value && result.value.trim().length > 0) {
        return result.value.trim();
      }
    } catch (err) {
      console.warn('Mammoth DOCX parsing notice:', err);
    }
  }

  // Plain text formats
  if (file.type.startsWith('text/') || fileNameLower.endsWith('.txt') || fileNameLower.endsWith('.md') || fileNameLower.endsWith('.json') || fileNameLower.endsWith('.csv')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  }

  return '';
};

// Helper to extract clean text from Base64 Data URL using Mammoth
const extractCleanTextFromDataUrl = async (dataUrl: string): Promise<string> => {
  try {
    const base64Parts = dataUrl.split(',');
    if (base64Parts.length < 2) return '';
    const base64Str = base64Parts[1];
    const binaryStr = atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
    return result.value ? result.value.trim() : '';
  } catch (err) {
    console.warn('Failed to parse base64 DOCX data URL with mammoth:', err);
    return '';
  }
};

export const INITIAL_RESOURCES: LibraryResource[] = [
  {
    id: 'res_som_mod4_video',
    title: 'Livestream Video: Apostolic Governance & Five-Fold Ministry Alignment',
    category: 'Livestream Recording',
    author: 'Apostle Dr. Kendell Pierre',
    courseCode: 'SOM-MOD-4',
    moduleTrack: 'SOM-MOD-4',
    format: 'VIDEO',
    size: '1.2 GB (HD Video)',
    downloadUrl: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
    summary: 'Official HTEIM livestream video recording covering foundational apostolic architecture, Ephesians 4:11 five-fold alignment, and spiritual governance.',
    keyTakeaways: [
      'Apostolic foundation based on Ephesians 2:20 & 4:11',
      'Synergy between Apostle, Prophet, Evangelist, Pastor, and Teacher',
      'Governmental authority and building spiritual fathers'
    ],
    fullContent: 'HTEIM School of Ministry Module 4: Apostolic Governance & Five-Fold Alignment\nInstructor: Apostle Dr. Kendell Pierre\n\n1. Apostolic Foundations\n2. Five-Fold Ministry Mechanics\n3. Spiritual Authority and Order\n4. Commissioning and Global Impact.',
    aiEvaluated: true,
    isRequiredReading: true,
    uploadedAt: '2026-08-25'
  },
  {
    id: 'res_som_mod5_video',
    title: 'Livestream Video: Prophetic Ministry, Spiritual Discernment & Warfare',
    category: 'Livestream Recording',
    author: 'Apostolic Faculty Team',
    courseCode: 'SOM-MOD-5',
    moduleTrack: 'SOM-MOD-5',
    format: 'VIDEO',
    size: '950 MB (HD Video)',
    downloadUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    summary: 'Classroom video recording on cultivating spiritual discernment, testing prophecy according to scripture, and prophetic assembly protocols.',
    keyTakeaways: [
      'Distinction between gift of prophecy and prophetic office',
      'Testing prophecy by scripture and spiritual fruit (1 Cor 14)',
      'Prophetic protocol in ministry assemblies'
    ],
    fullContent: 'HTEIM School of Ministry Module 5: Prophetic Ministry & Spiritual Discernment\n\n1. The Operation of Prophecy\n2. Judging and Discerning Spiritual Manifestations\n3. Warfare and Prophetic Intercession\n4. Order in the Sanctuary.',
    aiEvaluated: true,
    isRequiredReading: true,
    uploadedAt: '2026-08-18'
  },
  {
    id: 'res_som_mod1_video',
    title: 'Livestream Video: Biblical Hermeneutics & Exegesis Methodologies',
    category: 'Livestream Recording',
    author: 'Pastor Samuel Selkridge',
    courseCode: 'SOM-MOD-1',
    moduleTrack: 'SOM-MOD-1',
    format: 'VIDEO',
    size: '880 MB (HD Video)',
    downloadUrl: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
    summary: 'Comprehensive video stream on historical-grammatical exegesis, hermeneutical principles, and Christocentric interpretation.',
    keyTakeaways: [
      'Historical, cultural, and grammatical context analysis',
      'Avoiding eisegesis and allegorical distortions',
      'Extracting timeless spiritual principles'
    ],
    fullContent: 'HTEIM School of Ministry Module 1: Biblical Hermeneutics\nInstructor: Pastor Samuel Selkridge\n\n1. The Authority of Scripture\n2. Exegetical Principles\n3. Genre Analysis\n4. Homiletical Synthesis.',
    aiEvaluated: true,
    isRequiredReading: true,
    uploadedAt: '2026-05-05'
  },
  {
    id: 'res_som_mod2_video',
    title: 'Livestream Video: Evangelism, The Great Commission & Soul Winning',
    category: 'Livestream Recording',
    author: 'Pastor Christy Arthur',
    courseCode: 'SOM-MOD-2',
    moduleTrack: 'SOM-MOD-2',
    format: 'VIDEO',
    size: '760 MB (HD Video)',
    downloadUrl: 'https://www.youtube.com/watch?v=21X5lGlDOfg',
    summary: 'Practical evangelism strategies, personal soul-winning witnessing, overcoming objections, and discipleship retention.',
    keyTakeaways: [
      'The Matthew 28 mandate for modern ministry',
      'Personal witnessing without fear or compromise',
      'Discipleship integration pathways'
    ],
    fullContent: 'HTEIM School of Ministry Module 2: Evangelism & Soul Winning\nInstructor: Pastor Christy Arthur\n\n1. The Great Commission Mandate\n2. Gospel Presentation Protocols\n3. Street Ministry and City Outreach\n4. Follow-Up and Discipleship Tracking.',
    aiEvaluated: true,
    isRequiredReading: true,
    uploadedAt: '2026-05-19'
  },
  {
    id: 'res_som_mod3_textbook',
    title: 'Ministerial Character, Ethics & Financial Integrity',
    category: 'Textbook',
    author: 'Apostle Gillian Selkridge',
    courseCode: 'SOM-MOD-3',
    moduleTrack: 'SOM-MOD-3',
    format: 'PDF',
    size: '2.4 MB',
    summary: 'Foundational manual on ministerial ethics, pastoral confidentiality, financial transparency, and servant leadership.',
    keyTakeaways: [
      'High ethical standards in ministry leadership',
      'Accountability and financial transparency',
      'Pastoral counseling ethics and confidentiality'
    ],
    fullContent: 'HTEIM School of Ministry Module 3: Ministerial Character, Ethics & Financial Integrity\n\nChapter 1: The Character of the Leader\nChapter 2: Financial Stewardship & Accountability\nChapter 3: Pastoral Counseling Ethics\nChapter 4: Handling Church Conflict & Servant Leadership.',
    aiEvaluated: true,
    isRequiredReading: true,
    uploadedAt: '2026-06-16'
  },
  {
    id: 'res_som_mod6_studyguide',
    title: 'School of the Pastors: Shepherding & Expository Preaching',
    category: 'Study Guide',
    author: 'Pastor Samuel Selkridge',
    courseCode: 'SOM-MOD-6',
    moduleTrack: 'SOM-MOD-6',
    format: 'PDF',
    size: '1.8 MB',
    summary: 'Comprehensive study guide covering pastoral theology, care of souls, sermon manuscript development, and expository delivery.',
    keyTakeaways: [
      'Biblical shepherd leadership models',
      'Expository sermon structure and application',
      'Ministerial endurance and self-care'
    ],
    fullContent: 'HTEIM School of Ministry Module 6: School of the Pastors\n\nSection 1: The Pastoral Calling and Heart\nSection 2: Shepherding the Flock and Pastoral Care\nSection 3: Expository Preaching and Biblical Teaching\nSection 4: Ministry Longevity and Sustainable Service.',
    aiEvaluated: true,
    isRequiredReading: true,
    uploadedAt: '2026-09-01'
  }
];

export const LibraryTab: React.FC<LibraryTabProps> = ({ 
  userRole = 'admin',
  resources: propResources,
  setResources: propSetResources,
  classroomMedia: propClassroomMedia,
  setClassroomMedia: propSetClassroomMedia,
  studentName = 'General Student',
  onOpenDiagnostics,
  onOpenNotes,
  onOpenInBible,
  courses = [],
  customAssignments = [],
  onNavigateTab,
}) => {
  const isStudent = userRole === 'student';

  // View Mode: Homepage vs My Library vs Academic Curriculum vs Flat Catalog vs Collections vs Teacher Manager
  const [libraryViewMode, setLibraryViewMode] = useState<'homepage' | 'my_library' | 'curriculum' | 'catalog' | 'collections' | 'teacher_manager'>('homepage');
  const [myLibrarySection, setMyLibrarySection] = useState<MyLibrarySection>('favorites');
  const [universalViewerResource, setUniversalViewerResource] = useState<any | null>(null);
  const [shareModalResource, setShareModalResource] = useState<LearningResource | null>(null);

  // Collections State (Phase 25)
  const [collections, setCollections] = useState<ResourceCollection[]>(() => {
    const saved = localStorage.getItem('hteim_library_collections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: "col-orientation",
        title: "New Student Orientation",
        description: "Essential introduction materials, student handbook, and academic guidance for HTEIM School of Ministry.",
        category: "Orientation",
        resourceIds: ["res_som_mod1_video", "res_som_mod3_textbook"],
        createdBy: "HTEIM Faculty",
        createdAt: "2026-01-10T00:00:00.000Z",
        updatedAt: "2026-01-10T00:00:00.000Z",
        isPublic: true,
        tags: ["#Orientation", "#Handbook"],
        iconName: "Compass"
      },
      {
        id: "col-foundations",
        title: "Biblical Foundations",
        description: "Core theological foundational texts, Hermeneutics study guides, and Old/New Testament surveys.",
        category: "Theology",
        resourceIds: ["res_som_mod1_video"],
        createdBy: "Academic Dean",
        createdAt: "2026-01-15T00:00:00.000Z",
        updatedAt: "2026-01-15T00:00:00.000Z",
        isPublic: true,
        tags: ["#BibleStudy", "#Theology"],
        iconName: "BookOpen"
      },
      {
        id: "col-prayer",
        title: "Prayer Resources",
        description: "Comprehensive guides on intercessory prayer, spiritual warfare, and personal prayer devotional outlines.",
        category: "Spiritual Formation",
        resourceIds: ["res_som_mod5_video"],
        createdBy: "Prayer Ministry Dept",
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
        isPublic: true,
        tags: ["#Prayer", "#SpiritualWarfare"],
        iconName: "Flame"
      },
      {
        id: "col-leadership",
        title: "Leadership Training",
        description: "Apostolic and pastoral ministry leadership principles, ethical decision making, and team dynamics.",
        category: "Leadership",
        resourceIds: ["res_som_mod4_video", "res_som_mod3_textbook"],
        createdBy: "HTEIM Faculty",
        createdAt: "2026-02-10T00:00:00.000Z",
        updatedAt: "2026-02-10T00:00:00.000Z",
        isPublic: true,
        tags: ["#Leadership", "#PastoralMinistry"],
        iconName: "Shield"
      },
      {
        id: "col-evangelism",
        title: "Evangelism Resources",
        description: "Outreach training manuals, personal testimony templates, and global mission field handbooks.",
        category: "Missions & Outreach",
        resourceIds: ["res_som_mod2_video"],
        createdBy: "Missions Director",
        createdAt: "2026-02-15T00:00:00.000Z",
        updatedAt: "2026-02-15T00:00:00.000Z",
        isPublic: true,
        tags: ["#Evangelism", "#Missions"],
        iconName: "Globe"
      },
      {
        id: "col-som-2026",
        title: "School of Ministry 2026",
        description: "Master academic collection containing required course textbooks, syllabus notes, and lecture media for 2026.",
        category: "Academic Curriculum",
        resourceIds: ["res_som_mod4_video", "res_som_mod5_video", "res_som_mod1_video", "res_som_mod2_video", "res_som_mod3_textbook", "res_som_mod6_studyguide"],
        createdBy: "Academic Registrar",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
        isPublic: true,
        tags: ["#HTEIM2026", "#Curriculum"],
        iconName: "GraduationCap"
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('hteim_library_collections', JSON.stringify(collections));
  }, [collections]);

  const handleCreateCollection = (newColData: Partial<ResourceCollection>) => {
    const newCol: ResourceCollection = {
      id: `col-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newColData.title || 'Untitled Collection',
      description: newColData.description || '',
      category: newColData.category || 'General',
      resourceIds: newColData.resourceIds || [],
      createdBy: studentName || 'HTEIM Faculty',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: true,
      tags: newColData.tags || [],
      iconName: 'Folder',
    };
    setCollections(prev => [newCol, ...prev]);
  };

  const handleUpdateCollection = (id: string, updates: Partial<ResourceCollection>) => {
    setCollections(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c))
    );
  };

  const handleDeleteCollection = (id: string) => {
    setCollections(prev => prev.filter(c => c.id !== id));
  };

  const [localResources, setLocalResources] = useState<LibraryResource[]>(() => {
    const saved = localStorage.getItem('hteim_library_resources');
    if (saved) {
      try {
        const parsed: LibraryResource[] = JSON.parse(saved);
        // Strip any Supabase file links or data urls from downloadUrl to ensure clean lesson cards
        return parsed.map(r => {
          let cleaned = { ...r };
          if (cleaned.downloadUrl && (cleaned.downloadUrl.includes('supabase.co') || cleaned.downloadUrl.startsWith('data:'))) {
            delete cleaned.downloadUrl;
          }
          if (cleaned.summary && cleaned.summary.includes("Imported from Supabase Storage bucket")) {
            cleaned.summary = `Curriculum resource titled "${cleaned.title}" for the School of Ministry student body.`;
          }
          return cleaned;
        });
      } catch (e) {
        return INITIAL_RESOURCES;
      }
    }
    return INITIAL_RESOURCES;
  });

  const resources = propResources !== undefined ? propResources : localResources;
  const setResources = propSetResources !== undefined ? propSetResources : setLocalResources;

  // Memoized academic hierarchy tree (Course -> Module -> Lesson -> [Resources, Quizzes, Assignments])
  const academicCourses = useMemo(() => {
    return buildAcademicHierarchy({
      courses,
      resources,
      assignments: customAssignments,
      studentIdentifier: studentName,
    });
  }, [courses, resources, customAssignments, studentName]);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('hteim_library_resources', JSON.stringify(resources));
  }, [resources]);

  // Global classroom sermon & lecture audio/video media player state
  const [localClassroomMedia, setLocalClassroomMedia] = useState<MediaResource[]>(() => {
    const saved = localStorage.getItem('hteim_classroom_media');
    return saved ? JSON.parse(saved) : DEFAULT_PRESET_MEDIA;
  });

  const classroomMedia = propClassroomMedia !== undefined ? propClassroomMedia : localClassroomMedia;
  const setClassroomMedia = propSetClassroomMedia !== undefined ? propSetClassroomMedia : setLocalClassroomMedia;

  useEffect(() => {
    localStorage.setItem('hteim_classroom_media', JSON.stringify(classroomMedia));
  }, [classroomMedia]);

  const handleAddGlobalMedia = (newMedia: MediaResource) => {
    setClassroomMedia(prev => [newMedia, ...prev]);
  };

  const handleUpdateGlobalMedia = (updatedMedia: MediaResource) => {
    setClassroomMedia(prev => prev.map(m => m.id === updatedMedia.id ? updatedMedia : m));
    // Also sync corresponding lesson resource if one was registered in the library cards
    setResources(prev => prev.map(res => {
      if (res.id === updatedMedia.id || (res.category === 'Livestream Recording' && res.downloadUrl === updatedMedia.url)) {
        return {
          ...res,
          title: updatedMedia.title,
          author: updatedMedia.speaker,
          downloadUrl: updatedMedia.url,
          summary: updatedMedia.description || res.summary
        };
      }
      return res;
    }));
  };

  const handleRemoveGlobalMedia = (mediaId: string) => {
    setClassroomMedia(prev => prev.filter(m => m.id !== mediaId));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'required' | 'completed' | 'to-read'>('all');
  const [showFlashcardsModal, setShowFlashcardsModal] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [addResourcePlacement, setAddResourcePlacement] = useState<{ courseId?: string; moduleId?: string; lessonId?: string } | undefined>(undefined);
  const [previewResource, setPreviewResource] = useState<LibraryResource | null>(null);
  const [previewExtractedText, setPreviewExtractedText] = useState<string>('');
  const [isParsingPreview, setIsParsingPreview] = useState<boolean>(false);
  const [deleteConfirmResourceId, setDeleteConfirmResourceId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // AI Lesson Summary states
  const [generatingSummaryId, setGeneratingSummaryId] = useState<string | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [selectedSummaryLesson, setSelectedSummaryLesson] = useState<LibraryResource | null>(null);
  const [copiedSummaryId, setCopiedSummaryId] = useState<string | null>(null);
  const [aiSummaryFeedback, setAiSummaryFeedback] = useState<{ id: string; message: string; type: 'success' | 'error' } | null>(null);

  // Editing state
  const [editingResource, setEditingResource] = useState<LibraryResource | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editModuleTrack, setEditModuleTrack] = useState('SOM-MOD-1');
  const [editIsRequired, setEditIsRequired] = useState(false);
  const [editSummary, setEditSummary] = useState('');
  const [editKeyTakeaways, setEditKeyTakeaways] = useState('');
  const [editFullContent, setEditFullContent] = useState('');

  const startEditing = (res: LibraryResource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingResource(res);
    setEditTitle(res.title);
    setEditCategory(res.category);
    setEditAuthor(res.author);
    setEditCourseCode(res.courseCode);
    setEditModuleTrack(res.moduleTrack || res.courseCode || 'SOM-MOD-1');
    setEditIsRequired(!!res.isRequiredReading);
    setEditSummary(res.summary);
    setEditKeyTakeaways((res.keyTakeaways || []).join('\n'));
    setEditFullContent(res.fullContent || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource) return;

    const updatedResources = resources.map(r => {
      if (r.id === editingResource.id) {
        return {
          ...r,
          title: editTitle.trim(),
          category: editCategory,
          author: editAuthor.trim(),
          courseCode: editCourseCode.toUpperCase().trim(),
          moduleTrack: editModuleTrack,
          isRequiredReading: editIsRequired,
          summary: editSummary.trim(),
          keyTakeaways: editKeyTakeaways.split('\n').map(line => line.trim()).filter(Boolean),
          fullContent: editFullContent
        };
      }
      return r;
    });

    setResources(updatedResources);
    setEditingResource(null);
  };

  const handleSaveNewResource = (newRes: LibraryResource, isDraft: boolean) => {
    setResources(prev => {
      const updated = [newRes, ...prev];
      try {
        localStorage.setItem('schoolLibraryResources', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save resources to localStorage:', err);
      }
      return updated;
    });

    // Also sync video or audio resources to classroom media player
    if ((newRes.format === 'VIDEO' || newRes.format === 'AUDIO') && newRes.downloadUrl && setClassroomMedia) {
      const isVideo = newRes.format === 'VIDEO';
      const newMediaTrack: MediaResource = {
        id: `media_${isVideo ? 'video' : 'audio'}_${Date.now()}`,
        title: newRes.title,
        speaker: newRes.author || 'HTEIM Faculty',
        duration: newRes.size || (isVideo ? 'Video Stream' : 'Audio Track'),
        type: isVideo ? 'video' : 'audio',
        url: newRes.downloadUrl,
        description: newRes.summary || '',
        dateAdded: new Date().toISOString().split('T')[0]
      };
      setClassroomMedia(prev => [newMediaTrack, ...prev]);
    }

    setShowUploadModal(false);
    setAddResourcePlacement(undefined);
  };

  // Inline Edit Mode State for Direct Card Edits
  const [editingInlineId, setEditingInlineId] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineLink, setInlineLink] = useState('');
  const [inlineCategory, setInlineCategory] = useState('');
  const [inlineAuthor, setInlineAuthor] = useState('');
  const [inlineCourseCode, setInlineCourseCode] = useState('');
  const [inlineModuleTrack, setInlineModuleTrack] = useState('SOM-MOD-1');
  const [inlineIsRequired, setInlineIsRequired] = useState(false);
  const [inlineSummary, setInlineSummary] = useState('');

  const startInlineEdit = (res: LibraryResource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingInlineId(res.id);
    setInlineTitle(res.title);
    setInlineLink(res.downloadUrl || '');
    setInlineCategory(res.category);
    setInlineAuthor(res.author);
    setInlineCourseCode(res.courseCode);
    setInlineModuleTrack(res.moduleTrack || res.courseCode || 'SOM-MOD-1');
    setInlineIsRequired(!!res.isRequiredReading);
    setInlineSummary(res.summary);
  };

  const cancelInlineEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingInlineId(null);
  };

  const handleSaveInlineEdit = (id: string, e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setResources(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          title: inlineTitle.trim(),
          downloadUrl: inlineLink.trim() || undefined,
          category: inlineCategory,
          author: inlineAuthor.trim(),
          courseCode: inlineCourseCode.toUpperCase().trim(),
          moduleTrack: inlineModuleTrack,
          isRequiredReading: inlineIsRequired,
          summary: inlineSummary.trim()
        };
      }
      return r;
    }));
    setEditingInlineId(null);
  };

  // Automatically extract clean text for DOCX files when viewing preview
  useEffect(() => {
    if (!previewResource) {
      setPreviewExtractedText('');
      setIsParsingPreview(false);
      return;
    }

    if (previewResource.fullContent && !isBinaryZipContent(previewResource.fullContent)) {
      setPreviewExtractedText(previewResource.fullContent);
      setIsParsingPreview(false);
    } else if (previewResource.fileDataUrl) {
      setIsParsingPreview(true);
      extractCleanTextFromDataUrl(previewResource.fileDataUrl).then(cleanText => {
        if (cleanText) {
          setPreviewExtractedText(cleanText);
          // Also update stored resource in state so it doesn't need to re-parse next time
          setResources(prev => prev.map(r => r.id === previewResource.id ? { ...r, fullContent: cleanText } : r));
        } else {
          setPreviewExtractedText('');
        }
        setIsParsingPreview(false);
      });
    } else {
      setPreviewExtractedText('');
      setIsParsingPreview(false);
    }
  }, [previewResource]);

  // Upload Form State
  const [uploadMode, setUploadMode] = useState<'file' | 'text' | 'gdrive'>('file');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [textTitle, setTextTitle] = useState('');
  const [textAuthor, setTextAuthor] = useState('HTEIM Faculty');
  const [textCourseCode, setTextCourseCode] = useState('SOM-101');
  const [textContent, setTextContent] = useState('');

  // Google Drive Upload State
  const [gdriveUrl, setGdriveUrl] = useState('');
  const [gdriveTitle, setGdriveTitle] = useState('');
  const [gdriveAuthor, setGdriveAuthor] = useState('Dr. Faculty Director');
  const [gdriveCourseCode, setGdriveCourseCode] = useState('SOM-101');
  const [gdriveCategory, setGdriveCategory] = useState('Livestream Recording');
  const [gdriveSummary, setGdriveSummary] = useState('');

  // Playing Video Lightbox Modal State
  const [playingVideoModalResource, setPlayingVideoModalResource] = useState<LibraryResource | null>(null);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear all lessons
  const handleClearAllLessons = () => {
    setShowClearAllConfirm(true);
  };

  const executeClearAllLessons = () => {
    setResources([]);
    setPreviewResource(null);
    setShowClearAllConfirm(false);
  };

  // Reset to sample lessons
  const handleResetSampleLessons = () => {
    setResources(INITIAL_RESOURCES);
  };

  // Delete single lesson
  const handleDeleteLesson = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setResources(prev => prev.filter(r => r.id !== id));
    if (previewResource?.id === id) {
      setPreviewResource(null);
    }
  };

  // Toggle Student Reading Completion
  const handleToggleComplete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setResources(prev => prev.map(r => {
      if (r.id === id) {
        const list = r.completedByStudents || [];
        const isCompleted = list.includes(studentName);
        const updatedList = isCompleted 
          ? list.filter(n => n !== studentName)
          : [...list, studentName];
        return {
          ...r,
          completedByStudents: updatedList
        };
      }
      return r;
    }));
  };

  // Full-text match snippet extractor for search previews
  const getContentSnippet = (content?: string, query?: string): string | null => {
    if (!content || !query || !query.trim()) return null;
    const q = query.toLowerCase().trim();
    const idx = content.toLowerCase().indexOf(q);
    if (idx === -1) return null;
    const start = Math.max(0, idx - 45);
    const end = Math.min(content.length, idx + q.length + 55);
    return (start > 0 ? '...' : '') + content.substring(start, end).trim() + (end < content.length ? '...' : '');
  };

  // Curriculum Reading Progress metrics
  const moduleStats = useMemo(() => {
    const relevant = moduleFilter === 'all'
      ? resources
      : resources.filter(r => (r.moduleTrack || r.courseCode || '').toUpperCase().includes(moduleFilter));

    const total = relevant.length;
    const completed = relevant.filter(r => r.completedByStudents?.includes(studentName)).length;
    const required = relevant.filter(r => r.isRequiredReading).length;
    const requiredCompleted = relevant.filter(r => r.isRequiredReading && r.completedByStudents?.includes(studentName)).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, required, requiredCompleted, percent };
  }, [resources, moduleFilter, studentName]);

  // Deep Full-Text Filter logic
  const filteredResources = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return resources.filter(r => {
      // 1. Full-text search across Title, Author, Course Code, Summary, AND Full Document Content
      if (q) {
        const titleMatch = (r.title || '').toLowerCase().includes(q);
        const authorMatch = (r.author || '').toLowerCase().includes(q);
        const courseMatch = (r.courseCode || '').toLowerCase().includes(q);
        const summaryMatch = (r.summary || '').toLowerCase().includes(q);
        const contentMatch = (r.fullContent || '').toLowerCase().includes(q);

        if (!titleMatch && !authorMatch && !courseMatch && !summaryMatch && !contentMatch) {
          return false;
        }
      }

      // 2. Category Filter
      if (categoryFilter !== 'all' && r.category !== categoryFilter) {
        return false;
      }

      // 3. Module Filter
      if (moduleFilter !== 'all') {
        const modKey = (r.moduleTrack || r.courseCode || '').toUpperCase();
        if (!modKey.includes(moduleFilter)) {
          return false;
        }
      }

      // 4. Status Filter (Required / Completed / To Read)
      const isCompleted = r.completedByStudents?.includes(studentName);
      if (statusFilter === 'required' && !r.isRequiredReading) return false;
      if (statusFilter === 'completed' && !isCompleted) return false;
      if (statusFilter === 'to-read' && isCompleted) return false;

      return true;
    });
  }, [resources, searchQuery, categoryFilter, moduleFilter, statusFilter, studentName]);

  // Download Handler
  const handleDownload = (resource: LibraryResource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadedIds(prev => [...prev, resource.id]);

    if (resource.fileDataUrl) {
      // Direct file data url download
      const link = document.createElement('a');
      link.href = resource.fileDataUrl;
      link.download = resource.fileName || `${resource.title.replace(/\s+/g, '_')}.${(resource.format || '').toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Generate formatted text/markdown downloadable file
      const fileText = `=====================================================
HTEIM SCHOOL OF MINISTRY - OFFICIAL LESSON RESOURCE
=====================================================
TITLE: ${resource.title}
AUTHOR / INSTRUCTOR: ${resource.author}
COURSE CODE: ${resource.courseCode}
CATEGORY: ${resource.category}
EVALUATED BY AI: ${resource.aiEvaluated ? 'YES (Gemini AI)' : 'NO'}
UPLOADED DATE: ${resource.uploadedAt || 'N/A'}
=====================================================

AI LESSON EVALUATION SUMMARY:
-----------------------------------------------------
${resource.summary}

${resource.keyTakeaways && resource.keyTakeaways.length > 0 ? `KEY TAKEAWAYS & OUTCOMES:
${resource.keyTakeaways.map((k, i) => `${i + 1}. ${k}`).join('\n')}
-----------------------------------------------------` : ''}

LESSON CONTENT:
-----------------------------------------------------
${resource.fullContent || 'Full lesson document content loaded for student reference.'}
`;

      const blob = new Blob([fileText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resource.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Lesson.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Helper to trigger AI Evaluation via API
  const evaluateWithAI = async (title: string, content: string, author: string, courseCode: string, fileName?: string) => {
    try {
      const result = await evaluateLesson({ title, content, author, courseCode, fileName });
      if (result.success && result.data) {
        return result.data;
      }
      logger.warn('AI evaluation API returned error:', result.error);
      return {
        summary: content ? `Summary: ${content.slice(0, 160)}...` : `Ministry lesson on ${title} structured for student training.`,
        category: 'Study Guide',
        keyTakeaways: ['Key ministerial concepts and biblical principles included.'],
        courseCode: courseCode || 'SOM-CORE'
      };
    } catch (err) {
      logger.warn('AI evaluation API call fallback:', err);
      return {
        summary: content ? `Summary: ${content.slice(0, 160)}...` : `Ministry lesson on ${title} structured for student training.`,
        category: 'Study Guide',
        keyTakeaways: ['Key ministerial concepts and biblical principles included.'],
        courseCode: courseCode || 'SOM-CORE'
      };
    }
  };

  // Generate AI Lesson Summary for an individual lesson (when missing or requested)
  const handleGenerateAiSummary = async (lesson: LibraryResource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setGeneratingSummaryId(lesson.id);
    setAiSummaryFeedback(null);

    try {
      let contentToEvaluate = lesson.fullContent || '';
      if (!contentToEvaluate && lesson.fileDataUrl) {
        contentToEvaluate = await extractCleanTextFromDataUrl(lesson.fileDataUrl);
      }
      if (!contentToEvaluate) {
        contentToEvaluate = `${lesson.title} - ${lesson.category} for course code ${lesson.courseCode} authored by ${lesson.author}. Download URL: ${lesson.downloadUrl || 'Internal'}`;
      }

      const evaluation = await evaluateWithAI(
        lesson.title,
        contentToEvaluate,
        lesson.author,
        lesson.courseCode,
        lesson.fileName || `${lesson.title}.pdf`
      );

      const updated = resources.map(r => {
        if (r.id === lesson.id) {
          return {
            ...r,
            summary: evaluation.summary || r.summary,
            category: (evaluation.category as any) || r.category,
            keyTakeaways: evaluation.keyTakeaways && evaluation.keyTakeaways.length > 0 ? evaluation.keyTakeaways : r.keyTakeaways,
            courseCode: evaluation.courseCode || r.courseCode,
            aiEvaluated: true
          };
        }
        return r;
      });

      setResources(updated);
      try {
        localStorage.setItem('schoolLibraryResources', JSON.stringify(updated));
      } catch (err) {
        console.warn('Storage save warning:', err);
      }

      setAiSummaryFeedback({
        id: lesson.id,
        message: `AI Summary successfully generated for "${lesson.title}"!`,
        type: 'success'
      });

      if (previewResource && previewResource.id === lesson.id) {
        setPreviewResource(prev => prev ? {
          ...prev,
          summary: evaluation.summary || prev.summary,
          category: evaluation.category || prev.category,
          keyTakeaways: evaluation.keyTakeaways || prev.keyTakeaways,
          aiEvaluated: true
        } : null);
      }

      if (selectedSummaryLesson && selectedSummaryLesson.id === lesson.id) {
        setSelectedSummaryLesson(prev => prev ? {
          ...prev,
          summary: evaluation.summary || prev.summary,
          category: evaluation.category || prev.category,
          keyTakeaways: evaluation.keyTakeaways || prev.keyTakeaways,
          aiEvaluated: true
        } : null);
      }

      setTimeout(() => {
        setAiSummaryFeedback(null);
      }, 4000);
    } catch (err) {
      logger.error('Failed to generate AI summary:', err);
      setAiSummaryFeedback({
        id: lesson.id,
        message: 'Failed to generate AI summary. Please try again.',
        type: 'error'
      });
    } finally {
      setGeneratingSummaryId(null);
    }
  };

  // Batch generate summaries for all lessons currently lacking a summary
  const handleBatchGenerateSummaries = async () => {
    const missingLessons = resources.filter(r => !r.summary || r.summary.trim() === '');
    if (missingLessons.length === 0) return;

    setIsBatchGenerating(true);
    let currentList = [...resources];

    for (const lesson of missingLessons) {
      try {
        setGeneratingSummaryId(lesson.id);
        let content = lesson.fullContent || '';
        if (!content && lesson.fileDataUrl) {
          content = await extractCleanTextFromDataUrl(lesson.fileDataUrl);
        }
        if (!content) {
          content = `${lesson.title} - ${lesson.category} (${lesson.courseCode})`;
        }

        const res = await evaluateWithAI(lesson.title, content, lesson.author, lesson.courseCode, lesson.fileName);
        currentList = currentList.map(r => r.id === lesson.id ? {
          ...r,
          summary: res.summary || r.summary,
          category: res.category || r.category,
          keyTakeaways: res.keyTakeaways || r.keyTakeaways,
          aiEvaluated: true
        } : r);
        setResources([...currentList]);
      } catch (err) {
        logger.warn('Batch summary item error:', err);
      }
    }

    try {
      localStorage.setItem('schoolLibraryResources', JSON.stringify(currentList));
    } catch (e) {}

    setGeneratingSummaryId(null);
    setIsBatchGenerating(false);
  };

  const handleCopySummary = (lesson: LibraryResource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const textToCopy = `Lesson: ${lesson.title} (${lesson.courseCode})\nInstructor: ${lesson.author}\nCategory: ${lesson.category}\n\nAI Summary:\n${lesson.summary}\n\nKey Learning Takeaways:\n${(lesson.keyTakeaways || []).map(k => `• ${k}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSummaryId(lesson.id);
    setTimeout(() => setCopiedSummaryId(null), 2500);
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
    }
  };

  // Process & Upload Lessons
  const handleProcessUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEvaluating(true);

    const newUploadedResources: LibraryResource[] = [];

    if (uploadMode === 'gdrive') {
      if (!gdriveUrl.trim() || !gdriveTitle.trim()) {
        setIsEvaluating(false);
        return;
      }

      const parsedMedia = parseVideoMediaUrl(gdriveUrl.trim());
      const platformLabel = parsedMedia.isYouTube ? 'YouTube Video' : parsedMedia.isDrive ? 'Google Drive Video' : parsedMedia.isVimeo ? 'Vimeo Video' : 'Online Video Stream';

      setEvaluationProgress(`AI Registering ${platformLabel} "${gdriveTitle}"...`);

      const defaultSummary = parsedMedia.isYouTube
        ? 'YouTube sermon and theological lecture video stream. Streamable directly inside the portal media player.'
        : parsedMedia.isDrive
        ? 'Google Drive livestream video recording. Streamable directly inside the portal video player.'
        : 'Online video resource for ministry and theological study.';

      const summaryText = gdriveSummary.trim() || defaultSummary;

      const newRes: LibraryResource = {
        id: `res_video_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: gdriveTitle.trim(),
        category: gdriveCategory || (parsedMedia.isYouTube ? 'Lecture Audio' : 'Livestream Recording'),
        author: gdriveAuthor.trim() || 'HTEIM Faculty',
        courseCode: gdriveCourseCode.toUpperCase().trim() || 'SOM-101',
        format: 'VIDEO',
        size: platformLabel,
        downloadUrl: gdriveUrl.trim(),
        summary: summaryText,
        fullContent: `${platformLabel} Reference\nLink: ${gdriveUrl}\nTitle: ${gdriveTitle}\nPlatform: ${parsedMedia.type.toUpperCase()}`,
        keyTakeaways: [
          `Stream ${platformLabel} directly inside the app video player.`,
          'Integrated with notes, scripture popovers, and classroom sermon player.'
        ],
        aiEvaluated: true,
        uploadedAt: new Date().toISOString().split('T')[0]
      };

      newUploadedResources.push(newRes);

      // Auto-sync to Classroom Media Player tracks as well
      const newMediaTrack: MediaResource = {
        id: `media_video_${Date.now()}`,
        title: gdriveTitle.trim(),
        speaker: gdriveAuthor.trim() || 'HTEIM Faculty',
        duration: parsedMedia.isYouTube ? 'YouTube HD' : 'Livestream Video',
        type: 'video',
        url: gdriveUrl.trim(),
        description: summaryText,
        dateAdded: new Date().toISOString().split('T')[0]
      };

      if (setClassroomMedia) {
        setClassroomMedia(prev => [newMediaTrack, ...prev]);
      }
    } else if (uploadMode === 'text') {
      if (!textTitle.trim() || !textContent.trim()) {
        setIsEvaluating(false);
        return;
      }

      setEvaluationProgress(`AI Evaluating "${textTitle}"...`);
      const aiResult = await evaluateWithAI(textTitle, textContent, textAuthor, textCourseCode);

      const newRes: LibraryResource = {
        id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: textTitle.trim(),
        category: aiResult.category || 'Study Guide',
        author: textAuthor.trim() || 'HTEIM Faculty',
        courseCode: aiResult.courseCode || textCourseCode.toUpperCase().trim(),
        format: 'TXT',
        size: `${(new Blob([textContent]).size / 1024).toFixed(1)} KB`,
        summary: aiResult.summary,
        fullContent: textContent,
        keyTakeaways: aiResult.keyTakeaways || [],
        aiEvaluated: true,
        uploadedAt: new Date().toISOString().split('T')[0]
      };

      newUploadedResources.push(newRes);
    } else {
      // Process File Uploads
      if (selectedFiles.length === 0) {
        setIsEvaluating(false);
        return;
      }

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setEvaluationProgress(`AI Evaluating (${i + 1}/${selectedFiles.length}): "${file.name}"...`);

        // Extract clean text from file (using Mammoth for DOCX / Word files)
        let fileContentText = await extractCleanTextFromFile(file);

        // Convert file to base64 data URL for reliable in-app reading and direct downloading
        let fileDataUrl = '';
        try {
          fileDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve((event.target?.result as string) || '');
            };
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
        } catch (err) {
          console.error("Failed to read file into data URL:", err);
        }

        const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

        // Send clean extracted text to AI evaluator
        const aiResult = await evaluateWithAI(
          cleanTitle, 
          fileContentText.length > 0 ? fileContentText.slice(0, 8000) : `Lesson document file: ${file.name}`, 
          textAuthor || 'Uploaded Faculty File', 
          textCourseCode || 'SOM-CORE',
          file.name
        );

        const newRes: LibraryResource = {
          id: `res_f_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          title: cleanTitle,
          category: aiResult.category || (ext === 'MP3' || ext === 'WAV' ? 'Lecture Audio' : 'Textbook'),
          author: textAuthor.trim() || 'HTEIM Faculty',
          courseCode: aiResult.courseCode || textCourseCode.toUpperCase().trim() || 'SOM-CORE',
          format: ext === 'MP3' || ext === 'WAV' || ext === 'M4A' ? 'AUDIO' : ext === 'PDF' ? 'PDF' : ext,
          size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(1)} KB`,
          summary: aiResult.summary,
          fullContent: fileContentText || '',
          fileDataUrl,
          fileName: file.name,
          mimeType: file.type,
          keyTakeaways: aiResult.keyTakeaways || [],
          aiEvaluated: true,
          uploadedAt: new Date().toISOString().split('T')[0]
        };

        newUploadedResources.push(newRes);
      }
    }

    setResources(prev => [...newUploadedResources, ...prev]);
    setIsEvaluating(false);
    setEvaluationProgress('');
    setShowUploadModal(false);

    // Reset Form
    setSelectedFiles([]);
    setTextTitle('');
    setTextContent('');
    setGdriveUrl('');
    setGdriveTitle('');
    setGdriveSummary('');
  };

  const handleTeacherUpdateResource = (updated: LearningResource) => {
    const legacy = toLegacyResource(updated);
    setResources(prev => {
      const exists = prev.some(r => r.id === legacy.id);
      const next = exists ? prev.map(r => r.id === legacy.id ? legacy : r) : [legacy, ...prev];
      localStorage.setItem('hteim_library_resources', JSON.stringify(next));
      return next;
    });
  };

  const handleTeacherDeleteResource = (resourceId: string) => {
    setResources(prev => {
      const next = prev.filter(r => r.id !== resourceId);
      localStorage.setItem('hteim_library_resources', JSON.stringify(next));
      return next;
    });
  };

  const handleTeacherDuplicateResource = (resource: LearningResource) => {
    const newId = `res-dup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const duplicated: LearningResource = {
      ...resource,
      id: newId,
      title: `${resource.title} (Copy)`,
      status: 'draft',
      isPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const legacy = toLegacyResource(duplicated);
    setResources(prev => {
      const next = [legacy, ...prev];
      localStorage.setItem('hteim_library_resources', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="material-screen space-y-6 animate-fadeIn pb-28 sm:pb-24 md:pb-8">
      {/* AI Summary Feedback Toast Banner */}
      {aiSummaryFeedback && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center justify-between gap-3 px-4 py-2 rounded-xl border text-xs font-bold animate-fadeIn shadow-xs ${
            aiSummaryFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {aiSummaryFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{aiSummaryFeedback.message}</span>
          </div>
          <button
            onClick={() => setAiSummaryFeedback(null)}
            className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer"
            aria-label="Dismiss AI summary alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Digital Library & AI Lesson Repository</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Upload custom lesson files or transcripts. AI automatically evaluates content, generates concise summaries, and makes files instantly downloadable anytime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Interactive Scripture Memory Flashcard Action */}
          <button
            type="button"
            onClick={() => setShowFlashcardsModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="Study scripture memory verses and key takeaways with interactive flashcards"
          >
            <Brain className="w-4 h-4" />
            <span>Scripture Flashcards</span>
          </button>

          {!isStudent && (
            <>
              {resources.length > 0 && (
                (() => {
                  const missingSummaryCount = resources.filter(r => !r.summary || r.summary.trim() === '').length;
                  if (missingSummaryCount === 0) return null;
                  return (
                    <button
                      type="button"
                      onClick={handleBatchGenerateSummaries}
                      disabled={isBatchGenerating}
                      className="px-3.5 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/60 dark:to-purple-950/60 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                      title="Generate AI summaries for all lessons currently lacking one"
                    >
                      {isBatchGenerating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                          <span>Analyzing Lessons ({missingSummaryCount})...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>AI Summarize Missing ({missingSummaryCount})</span>
                        </>
                      )}
                    </button>
                  );
                })()
              )}

              {resources.length > 0 ? (
                <button
                  onClick={handleClearAllLessons}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Clear current lessons to upload fresh lesson files"
                >
                  <Trash2 className="w-4 h-4" /> Clear All Lessons
                </button>
              ) : (
                <button
                  onClick={handleResetSampleLessons}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" /> Restore Sample Lessons
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setAddResourcePlacement(undefined);
                  setShowUploadModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                title="Add learning material (PDF, Video, Website, Audio, Document, Presentation, Image)"
              >
                <Plus className="w-4 h-4" /> Add Resource
              </button>
            </>
          )}
        </div>
      </div>

      {/* View Mode Switcher: Library Home vs My Library vs Academic Curriculum vs Resource Catalog vs Teacher Manager */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setLibraryViewMode('homepage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
              libraryViewMode === 'homepage'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>LIBRARY Home</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMyLibrarySection('favorites');
              setLibraryViewMode('my_library');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
              libraryViewMode === 'my_library'
                ? 'bg-rose-500 text-white font-black shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>My Library (Saved & History)</span>
          </button>
          <button
            type="button"
            onClick={() => setLibraryViewMode('curriculum')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
              libraryViewMode === 'curriculum'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Academic Curriculum</span>
          </button>
          <button
            type="button"
            onClick={() => setLibraryViewMode('collections')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
              libraryViewMode === 'collections'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Folder className="w-4 h-4 text-blue-400" />
            <span>Collections ({collections.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setLibraryViewMode('catalog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
              libraryViewMode === 'catalog'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Resources Catalog ({resources.length})</span>
          </button>
          {!isStudent && (
            <button
              type="button"
              onClick={() => setLibraryViewMode('teacher_manager')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
                libraryViewMode === 'teacher_manager'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Teacher Manager</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 px-2 text-2xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold">
            {libraryViewMode === 'homepage'
              ? 'Homepage & Full-Text Search'
              : libraryViewMode === 'my_library'
              ? 'Favorites, History & Downloads'
              : libraryViewMode === 'curriculum'
              ? 'Structured Academic Content'
              : libraryViewMode === 'teacher_manager'
              ? 'Faculty Resource Management'
              : 'Flat File & Media Library'}
          </span>
        </div>
      </div>

      {libraryViewMode === 'homepage' ? (
        <LibraryHomepage
          resources={resources}
          onSelectResource={(selectedRes) => {
            setUniversalViewerResource(selectedRes);
          }}
          onOpenAddResource={() => {
            setAddResourcePlacement(undefined);
            setShowUploadModal(true);
          }}
          onOpenMyLibrary={(section) => {
            if (section) setMyLibrarySection(section);
            setLibraryViewMode('my_library');
          }}
          onSelectCourse={(courseCode, courseTitle) => {
            setLibraryViewMode('curriculum');
          }}
          userRole={userRole}
        />
      ) : libraryViewMode === 'my_library' ? (
        <MyLibraryView
          resources={resources.map((r: any) => toLearningResource(r))}
          initialSection={myLibrarySection}
          onSelectResource={(learningRes) => {
            setUniversalViewerResource(learningRes);
          }}
          onNavigateToCatalog={() => setLibraryViewMode('homepage')}
        />
      ) : libraryViewMode === 'teacher_manager' ? (
        <TeacherResourceManager
          resources={resources.map((r: any) => toLearningResource(r))}
          onAddResource={() => {
            setAddResourcePlacement(undefined);
            setShowUploadModal(true);
          }}
          onSelectResource={(learningRes) => {
            setUniversalViewerResource(learningRes);
          }}
          onUpdateResource={handleTeacherUpdateResource}
          onDeleteResource={handleTeacherDeleteResource}
          onDuplicateResource={handleTeacherDuplicateResource}
          userRole={userRole}
          userName={studentName}
        />
      ) : libraryViewMode === 'collections' ? (
        <ResourceCollectionsView
          collections={collections}
          resources={resources.map((r: any) => toLearningResource(r))}
          isTeacherOrAdmin={!isStudent}
          onSelectCollection={(col) => {}}
          onCreateCollection={handleCreateCollection}
          onUpdateCollection={handleUpdateCollection}
          onDeleteCollection={handleDeleteCollection}
          onOpenResource={(learningRes) => {
            setUniversalViewerResource(learningRes);
          }}
        />
      ) : libraryViewMode === 'curriculum' ? (
        <CurriculumHierarchyView
          courses={academicCourses}
          onOpenReader={(learningRes) => {
            setUniversalViewerResource(learningRes);
          }}
          onPlayVideo={(learningRes) => {
            setUniversalViewerResource(learningRes);
          }}
          onDownloadResource={(learningRes, e) => {
            const legacy = toLegacyResource(learningRes);
            handleDownload(legacy, e);
          }}
          onTakeQuiz={(quizId) => {
            if (onNavigateTab) {
              onNavigateTab('exams');
            }
          }}
          onAddResource={(placement) => {
            setAddResourcePlacement(placement);
            setShowUploadModal(true);
          }}
          studentName={studentName}
          userRole={userRole}
        />
      ) : (
        <>
          {/* Classroom Sermon & Lecture Audio/Video Player */}
      <ClassroomMediaPlayer
        mediaResources={classroomMedia}
        userRole={userRole}
        studentName={studentName}
        onAddMedia={handleAddGlobalMedia}
        onUpdateMedia={handleUpdateGlobalMedia}
        onRemoveMedia={handleRemoveGlobalMedia}
        onOpenNotes={onOpenNotes}
      />

      {/* Curriculum Module 1-6 Selector & Student Reading Progress Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Curriculum Modules (1–6):
            </span>
          </div>

          {/* Student Progress Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
              <CheckSquare className="w-4 h-4 text-emerald-500" />
              <span>
                {moduleStats.completed} of {moduleStats.total} Completed ({moduleStats.percent}%)
              </span>
              {moduleStats.required > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 rounded text-[10px] font-black">
                  ⭐ {moduleStats.requiredCompleted}/{moduleStats.required} Required
                </span>
              )}
            </div>
            <div className="w-28 sm:w-36 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${moduleStats.percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Module Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setModuleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              moduleFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Modules
          </button>
          {CURRICULUM_MODULES.map((m) => (
            <button
              key={m.code}
              type="button"
              onClick={() => setModuleFilter(m.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                moduleFilter === m.code
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={m.fullName}
            >
              <span>{m.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search uploaded lessons, topics, AI summaries, course code, or full document content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white"
            />
          </div>

          {/* Quick Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            <span className="text-xs font-bold text-slate-400 hidden sm:inline">Status:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('required')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'required' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" /> Required Only
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'completed' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" /> Completed
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('to-read')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'to-read' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
              }`}
            >
              <Square className="w-3.5 h-3.5" /> To Read
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Category:
          </span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              categoryFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All ({resources.length})
          </button>
          <button
            onClick={() => setCategoryFilter('Textbook')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              categoryFilter === 'Textbook' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'
            }`}
          >
            Textbooks
          </button>
          <button
            onClick={() => setCategoryFilter('Study Guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              categoryFilter === 'Study Guide' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
            }`}
          >
            Study Guides
          </button>
          <button
            onClick={() => setCategoryFilter('Scripture Memory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              categoryFilter === 'Scripture Memory' ? 'bg-amber-500 text-slate-950' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
            }`}
          >
            Scripture Memory
          </button>
          <button
            onClick={() => setCategoryFilter('Lecture Audio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              categoryFilter === 'Lecture Audio' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            Lecture Audio
          </button>
          <button
            onClick={() => setCategoryFilter('Livestream Recording')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              categoryFilter === 'Livestream Recording' ? 'bg-rose-600 text-white' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
            }`}
          >
            🎥 Livestream Recordings
          </button>
        </div>
      </div>

      {/* Empty State */}
      {resources.length === 0 && (
        <EmptyState
          title="The lesson library is currently empty"
          description="Upload lesson files, PDFs, or lecture notes, or restore the sample lessons to get started."
          icon={<BookOpen className="h-6 w-6" />}
          action={<div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => setShowUploadModal(true)} className="md-btn-filled inline-flex items-center gap-2 text-sm"><Upload className="h-4 w-4" /> Upload lessons</button>
            <button type="button" onClick={handleResetSampleLessons} className="md-btn-tonal text-sm">Restore samples</button>
          </div>}
        />
      )}

      {/* Lesson Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredResources.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              title={resources.length === 0 ? 'No resources in your library yet' : 'No resources match your search'}
              description={resources.length === 0
                ? 'Upload lesson files, paste text content, or add a Google Drive link to get started.'
                : 'Try clearing your search query or selecting a different category filter.'
              }
              icon={<BookOpen className="h-6 w-6" />}
              action={
                resources.length === 0 && !isStudent ? (
                  <button type="button" onClick={() => setShowUploadModal(true)} className="md-btn-primary text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Upload First Resource
                  </button>
                ) : filteredResources.length === 0 && resources.length > 0 ? (
                  <button type="button" onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }} className="md-btn-tonal text-sm">
                    Clear Filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : filteredResources.map((res) => {
          const isDownloaded = downloadedIds.includes(res.id);
          const isInlineEditing = editingInlineId === res.id;

          if (isInlineEditing) {
            return (
              <div 
                key={res.id} 
                className="bg-slate-900 border border-amber-500 rounded-xl p-5 shadow-xl transition-all space-y-3.5 relative text-white animate-fadeIn"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" /> Inline Edit Mode
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleSaveInlineEdit(res.id, e)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-md"
                      title="Save inline changes"
                    >
                      <Check className="w-3.5 h-3.5" /> Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelInlineEdit}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                      title="Cancel inline editing"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 text-left">
                  {/* Title Input */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                      Resource Title
                    </label>
                    <input
                      type="text"
                      value={inlineTitle}
                      onChange={(e) => setInlineTitle(e.target.value)}
                      placeholder="Resource title..."
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Resource Link / URL Input */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Link className="w-3 h-3 text-amber-400" /> Resource Link / Download URL
                    </label>
                    <div className="relative">
                      <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="url"
                        value={inlineLink}
                        onChange={(e) => setInlineLink(e.target.value)}
                        placeholder="https://hteim.org/resources/file.pdf"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  {/* Category & Course Code */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-400 uppercase mb-1">Category</label>
                      <select
                        value={inlineCategory}
                        onChange={(e) => setInlineCategory(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-[11px] font-bold text-slate-200 focus:outline-none"
                      >
                        <option value="Textbook">Textbook</option>
                        <option value="Study Guide">Study Guide</option>
                        <option value="Scripture Memory">Scripture Memory</option>
                        <option value="Lecture Audio">Lecture Audio</option>
                        <option value="Syllabus">Syllabus</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-400 uppercase mb-1">Course Code</label>
                      <input
                        type="text"
                        value={inlineCourseCode}
                        onChange={(e) => setInlineCourseCode(e.target.value)}
                        placeholder="SOM-101"
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-[11px] font-mono text-slate-200 focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  {/* Module Track & Required Reading */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-400 uppercase mb-1">Curriculum Module Track</label>
                      <select
                        value={inlineModuleTrack}
                        onChange={(e) => setInlineModuleTrack(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-[11px] font-bold text-slate-200 focus:outline-none"
                      >
                        {CURRICULUM_MODULES.map(m => (
                          <option key={m.code} value={m.code}>{m.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <label className="flex items-center gap-2 text-[11px] font-bold text-amber-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inlineIsRequired}
                          onChange={(e) => setInlineIsRequired(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 bg-slate-950 border-slate-700"
                        />
                        <span>⭐ Required Reading</span>
                      </label>
                    </div>
                  </div>

                  {/* Author / Instructor */}
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase mb-1">Author / Instructor</label>
                    <input
                      type="text"
                      value={inlineAuthor}
                      onChange={(e) => setInlineAuthor(e.target.value)}
                      placeholder="Instructor Name"
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-[11px] font-medium text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Summary / Notes */}
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase mb-1">Summary / AI Notes</label>
                    <textarea
                      rows={2}
                      value={inlineSummary}
                      onChange={(e) => setInlineSummary(e.target.value)}
                      placeholder="Brief lesson overview..."
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelInlineEdit}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSaveInlineEdit(res.id, e)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Save Changes
                  </button>
                </div>
              </div>
            );
          }

          const isCompleted = (res.completedByStudents || []).includes(studentName);

          return (
            <div 
              key={res.id} 
              className={`border rounded-xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group ${
                isCompleted 
                  ? 'bg-slate-50/50 dark:bg-slate-900/40 border-emerald-300/60 dark:border-emerald-800/60' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                {/* Header Badge & Action Buttons */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      res.format === 'PDF' 
                        ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                        : res.format === 'AUDIO' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {res.format === 'AUDIO' ? <Headphones className="w-3 h-3 inline mr-1" /> : <FileText className="w-3 h-3 inline mr-1" />}
                      {res.format} ({res.size})
                    </span>

                    <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold rounded">
                      {res.courseCode}
                    </span>

                    {res.moduleTrack && (
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 text-[10px] font-bold rounded">
                        {res.moduleTrack}
                      </span>
                    )}

                    {res.isRequiredReading && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-black rounded flex items-center gap-1 shadow-2xs">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Required
                      </span>
                    )}

                    {/* Completion Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleComplete(res.id, e)}
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md flex items-center gap-1 transition-all cursor-pointer border ${
                        isCompleted
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title={isCompleted ? `Completed by ${studentName} - click to unmark` : `Mark as completed for ${studentName}`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Completed</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3 h-3 text-slate-400" />
                          <span>Mark Read</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {res.aiEvaluated && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-extrabold flex items-center gap-1" title="Evaluated by Gemini AI">
                        <Sparkles className="w-3 h-3 text-amber-500" /> AI
                      </span>
                    )}
                    {!isStudent && (
                      <button
                        type="button"
                        onClick={(e) => startInlineEdit(res, e)}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title="Inline edit title & link directly on card"
                      >
                        <Edit3 className="w-3 h-3 text-amber-600" /> Inline Edit
                      </button>
                    )}
                    {!isStudent && (
                      <button
                        type="button"
                        onClick={(e) => startEditing(res, e)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all cursor-pointer"
                        title="Full Modal Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isStudent && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteLesson(res.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                        title="Delete Lesson"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3
                  onClick={() => setPreviewResource(res)}
                  className="text-sm font-extrabold text-slate-900 dark:text-white mb-1 leading-snug line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                  title="Click to read document"
                >
                  {res.title}
                </h3>

                <p className="text-[11px] text-slate-500 mb-2 font-semibold flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" /> {res.author}
                </p>

                {/* Full-Text Search Match Snippet Box */}
                {searchQuery.trim() && (() => {
                  const snippet = getContentSnippet(res.fullContent, searchQuery);
                  if (!snippet) return null;
                  return (
                    <div className="mb-2.5 p-2.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-900 dark:text-amber-400">
                        <Search className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Matched in Full Content:
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 font-mono italic leading-relaxed line-clamp-2">
                        "...{snippet}..."
                      </p>
                    </div>
                  );
                })()}

                {/* Scripture Memory Practice Launcher */}
                {res.category === 'Scripture Memory' && (
                  <div className="mb-2.5 p-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Memorization Track
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFlashcardsModal(true)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer transition-all active:scale-95"
                    >
                      <Brain className="w-3 h-3" /> Practice Flashcards
                    </button>
                  </div>
                )}

                {/* External Video / Stream Link Badge if present (Google Drive / YouTube) */}
                {res.downloadUrl && 
                  !res.downloadUrl.includes('supabase.co') && 
                  !res.downloadUrl.startsWith('data:') && 
                  (res.format === 'VIDEO' || res.category === 'Livestream Recording' || res.downloadUrl.includes('drive.google.com') || res.downloadUrl.includes('youtube.com') || res.downloadUrl.includes('youtu.be')) && (
                  <div className="mb-3 p-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <Link className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                      <span className="text-[10px] font-mono font-bold text-indigo-900 dark:text-indigo-300 truncate">
                        {res.downloadUrl}
                      </span>
                    </div>
                    <a
                      href={res.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-md flex items-center gap-1 flex-shrink-0 cursor-pointer shadow-2xs"
                      title="Open video in new tab"
                    >
                      <ExternalLink className="w-3 h-3" /> Visit
                    </a>
                  </div>
                )}

                {/* AI Summary Card Box or Generate Button if Missing */}
                {res.summary && res.summary.trim() !== '' ? (
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 mb-2 relative space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedSummaryLesson(res)}
                        className="text-[9px] font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider flex items-center gap-1 hover:underline cursor-pointer"
                        title="View complete AI Lesson Summary breakdown"
                      >
                        <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> AI Lesson Summary
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400">
                          {res.category}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleGenerateAiSummary(res, e)}
                          disabled={generatingSummaryId === res.id}
                          className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title="Regenerate summary with Gemini 3.7 Flash"
                        >
                          {generatingSummaryId === res.id ? (
                            <>
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-600" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                              <span>Regenerate</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {res.summary}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-gradient-to-br from-indigo-50/80 via-purple-50/60 to-amber-50/60 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-amber-950/30 border border-dashed border-indigo-200 dark:border-indigo-800/80 rounded-xl mb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" /> No Summary Yet
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                        Gemini AI
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleGenerateAiSummary(res, e)}
                      disabled={generatingSummaryId === res.id}
                      className="w-full py-1.5 px-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white font-extrabold text-xs rounded-lg shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 active:scale-98"
                      title="Generate AI Lesson Summary for this lesson"
                    >
                      {generatingSummaryId === res.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Analyzing with Gemini AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>Generate AI Lesson Summary</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Key Takeaways snippet if present with interactive Scripture Hover Popovers */}
                {res.keyTakeaways && res.keyTakeaways.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Key Takeaways:</p>
                    {res.keyTakeaways.slice(0, 2).map((k, idx) => (
                      <div key={idx} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1">
                        <span className="text-emerald-500 font-bold flex-shrink-0">•</span>
                        <div className="line-clamp-1 inline">
                          {parseTextWithScriptures(k).map((token, tIdx) => {
                              if (token.type === 'scripture' && token.scripture) {
                              return (
                                <ScriptureHoverPopover
                                  key={tIdx}
                                  scripture={token.scripture}
                                  onOpenInBible={onOpenInBible}
                                />
                              );
                            }
                            return <span key={tIdx}>{token.content}</span>;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setPreviewResource(res)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Read
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!res.summary || res.summary.trim() === '') {
                        handleGenerateAiSummary(res);
                      } else {
                        setSelectedSummaryLesson(res);
                      }
                    }}
                    disabled={generatingSummaryId === res.id}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title={!res.summary ? "Generate AI Lesson Summary" : "View AI Lesson Summary"}
                  >
                    {generatingSummaryId === res.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    ) : (
                      <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                    <span>AI Summary</span>
                  </button>

                  {(res.format === 'VIDEO' || res.category === 'Livestream Recording' || parseVideoMediaUrl(res.downloadUrl).isDrive || parseVideoMediaUrl(res.downloadUrl).isYouTube) && (
                    <button
                      type="button"
                      onClick={() => setPlayingVideoModalResource(res)}
                      className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-xs animate-pulse hover:animate-none"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Play Video
                    </button>
                  )}
                </div>

                <button
                  onClick={(e) => handleDownload(res, e)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isDownloaded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  title="Download lesson file anytime"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isDownloaded ? 'Downloaded' : 'Download File'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Step-Based Add Resource Workflow Modal */}
      {showUploadModal && (
        <AddResourceModal
          isOpen={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setAddResourcePlacement(undefined);
          }}
          onSaveResource={handleSaveNewResource}
          courses={courses}
          initialPlacement={addResourcePlacement}
          currentUserRole={userRole}
          currentUserName={studentName || 'HTEIM Faculty'}
        />
      )}

      {/* Full Multi-Format Document Reader Modal (PDF, DOCX, Word, Text, Audio, Video) */}
      <DocumentReaderModal
        isOpen={!!previewResource}
        resource={previewResource}
        onClose={() => setPreviewResource(null)}
        onDownload={handleDownload}
        onEdit={startEditing}
        onGenerateSummary={handleGenerateAiSummary}
        isGeneratingSummary={generatingSummaryId === previewResource?.id}
        isStudent={isStudent}
        isCompleted={!!previewResource && (previewResource.completedByStudents || []).includes(studentName)}
        onToggleComplete={(resourceId: string) => handleToggleComplete(resourceId)}
        studentName={studentName}
        onOpenInBible={onOpenInBible}
        onOpenNotes={onOpenNotes}
      />

      {/* Interactive Scripture Memory & Flashcards Study Modal */}
      <ScriptureFlashcardsModal
        isOpen={showFlashcardsModal}
        onClose={() => setShowFlashcardsModal(false)}
        resources={resources}
        currentModuleFilter={moduleFilter}
        studentName={studentName}
        onOpenInBible={onOpenInBible}
      />

      {/* ========================================================= */}
      {/* MODAL: AI LESSON SUMMARY & THEOLOGICAL INSIGHTS */}
      {/* ========================================================= */}
      {selectedSummaryLesson && (
        <Modal
          isOpen={!!selectedSummaryLesson}
          onClose={() => setSelectedSummaryLesson(null)}
          title={selectedSummaryLesson.title}
          subtitle={`${selectedSummaryLesson.courseCode} • ${selectedSummaryLesson.category} • Instructor: ${selectedSummaryLesson.author}`}
          icon={<Brain className="w-5 h-5 text-indigo-600 shrink-0" />}
          size="2xl"
        >
          <div className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
            {/* Header info banner */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-mono font-bold rounded-lg text-xs">
                  {selectedSummaryLesson.courseCode}
                </span>
                <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-xs">
                  {selectedSummaryLesson.category}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {selectedSummaryLesson.format} ({selectedSummaryLesson.size})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {selectedSummaryLesson.summary && (
                  <button
                    type="button"
                    onClick={(e) => handleCopySummary(selectedSummaryLesson, e)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    title="Copy AI Summary & Key Takeaways"
                  >
                    {copiedSummaryId === selectedSummaryLesson.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Summary</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => handleGenerateAiSummary(selectedSummaryLesson, e)}
                  disabled={generatingSummaryId === selectedSummaryLesson.id}
                  className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-lg flex items-center gap-1 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  title="Regenerate summary using Gemini 3.7 Flash"
                >
                  {generatingSummaryId === selectedSummaryLesson.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Regenerating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{selectedSummaryLesson.summary ? 'Regenerate with AI' : 'Generate AI Summary'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Summary Content Card */}
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 text-sm">
                  <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Executive Lesson Summary
                </span>
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-extrabold text-[10px] rounded-md flex items-center gap-1 border border-amber-300 dark:border-amber-800">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Powered by Gemini
                </span>
              </div>

              {selectedSummaryLesson.summary ? (
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium text-xs sm:text-sm">
                  {selectedSummaryLesson.summary}
                </p>
              ) : (
                <div className="py-4 text-center space-y-2">
                  <p className="text-slate-500 dark:text-slate-400 italic">No summary generated yet for this lesson.</p>
                  <button
                    type="button"
                    onClick={(e) => handleGenerateAiSummary(selectedSummaryLesson, e)}
                    disabled={generatingSummaryId === selectedSummaryLesson.id}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md cursor-pointer inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" /> Generate AI Summary Now
                  </button>
                </div>
              )}
            </div>

            {/* Key Learning Takeaways */}
            {selectedSummaryLesson.keyTakeaways && selectedSummaryLesson.keyTakeaways.length > 0 && (
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
                <span className="font-black text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <BookMarked className="w-4 h-4 text-emerald-600" /> Ministerial & Academic Takeaways
                </span>
                <div className="space-y-2 pt-1">
                  {selectedSummaryLesson.keyTakeaways.map((takeaway, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{takeaway}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = selectedSummaryLesson;
                  setSelectedSummaryLesson(null);
                  setPreviewResource(target);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Eye className="w-4 h-4" /> Read Full Lesson
              </button>

              <button
                type="button"
                onClick={() => setSelectedSummaryLesson(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-extrabold text-xs rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Resource Modal */}
      {editingResource && (
        <Modal
          isOpen={!!editingResource}
          onClose={() => setEditingResource(null)}
          title="Edit Library Resource Details"
          icon={<Pencil className="w-5 h-5 text-indigo-600 shrink-0" />}
          size="xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Author / Instructor</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Faculty Director"
                    value={editAuthor ?? ''}
                    onChange={(e) => setEditAuthor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="SOM-101"
                    value={editCourseCode ?? ''}
                    onChange={(e) => setEditCourseCode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Category</label>
                  <select
                    value={editCategory ?? ''}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="Textbook">Textbook</option>
                    <option value="Study Guide">Study Guide</option>
                    <option value="Scripture Memory">Scripture Memory</option>
                    <option value="Lecture Audio">Lecture Audio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Format / Size</label>
                  <input
                    type="text"
                    disabled
                    value={`${editingResource.format} (${editingResource.size})`}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Module Track & Required Reading */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Curriculum Module Track</label>
                  <select
                    value={editModuleTrack}
                    onChange={(e) => setEditModuleTrack(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    {CURRICULUM_MODULES.map(m => (
                      <option key={m.code} value={m.code}>{m.title} - {m.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <label className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-400 cursor-pointer">
                    <input
                      type="checkbox"
                      id="editIsRequired"
                      checked={editIsRequired}
                      onChange={(e) => setEditIsRequired(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                    />
                    <span>⭐ Required Reading for Graduation</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Resource Title *</label>
                <input
                  required
                  type="text"
                  placeholder="Expository Hermeneutics"
                  value={editTitle ?? ''}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Executive Summary *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize this library resource..."
                  value={editSummary ?? ''}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Key Learning Takeaways (one takeaway per line)</label>
                <textarea
                  rows={3}
                  placeholder="Add key learning points, each on a new line..."
                  value={editKeyTakeaways ?? ''}
                  onChange={(e) => setEditKeyTakeaways(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Full Document Content / Transcripts</label>
                <textarea
                  rows={6}
                  placeholder="Complete reference text or lesson transcripts..."
                  value={editFullContent ?? ''}
                  onChange={(e) => setEditFullContent(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:bg-white font-mono text-[11px]"
                />
              </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingResource(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL: CLEAR ALL CONFIRMATION */}
      {/* ========================================================= */}
      {showClearAllConfirm && (
        <Modal
          isOpen={showClearAllConfirm}
          onClose={() => setShowClearAllConfirm(false)}
          title="Clear Library"
          icon={<Trash2 className="w-5 h-5 text-rose-600 shrink-0" />}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to clear all current lessons from the library? You will still be able to upload your own custom lessons later.
            </p>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button
                onClick={() => setShowClearAllConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeClearAllLessons}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL: VIDEO PLAYER LIGHTBOX (Google Drive & Video Embed) */}
      {/* ========================================================= */}
      {playingVideoModalResource && (() => {
        const parsed = parseVideoMediaUrl(playingVideoModalResource.downloadUrl || playingVideoModalResource.fileDataUrl || '');

        return (
          <Modal
            isOpen={!!playingVideoModalResource}
            onClose={() => setPlayingVideoModalResource(null)}
            title={playingVideoModalResource.title}
            subtitle={`${playingVideoModalResource.courseCode} • ${playingVideoModalResource.category}`}
            icon={<Tv className="w-5 h-5 text-indigo-400 shrink-0" />}
            size="4xl"
          >
            <div className="space-y-4">
              {/* Video Player Frame */}
              <div className="p-4 bg-black flex flex-col justify-center items-center overflow-hidden rounded-xl">
                {parsed.isDrive ? (
                  <div className="w-full space-y-3">
                    <iframe
                      src={parsed.embedUrl}
                      title={playingVideoModalResource.title}
                      className="w-full h-80 sm:h-[420px] md:h-[500px] border-0 rounded-xl shadow-xl bg-slate-950"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs px-1 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        Google Drive Stream (File ID: <code className="font-mono text-amber-300">{parsed.fileId}</code>)
                      </span>
                      <a
                        href={playingVideoModalResource.downloadUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:text-amber-300 font-extrabold flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all self-end sm:self-auto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Google Drive</span>
                      </a>
                    </div>
                  </div>
                ) : (parsed.isYouTube || parsed.isVimeo || parsed.isLoom) && parsed.embedUrl ? (
                  <div className="w-full space-y-3">
                    <iframe
                      src={parsed.embedUrl}
                      title={playingVideoModalResource.title}
                      className="w-full h-80 sm:h-[420px] md:h-[500px] border-0 rounded-xl shadow-xl bg-slate-950"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    {parsed.isYouTube && (
                      <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-[11px] text-rose-200/90 leading-relaxed flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>If YouTube displays <em>"This content is blocked"</em> in your browser, YouTube restricts embedded playback in nested frames.</span>
                        </div>
                        <a
                          href={parsed.directWatchUrl || playingVideoModalResource.downloadUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[10px] rounded-lg transition-all flex items-center gap-1 shadow-sm"
                        >
                          <ExternalLink className="w-3 h-3" /> Watch on YouTube
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <video
                    controls
                    autoPlay
                    src={playingVideoModalResource.downloadUrl || playingVideoModalResource.fileDataUrl}
                    className="w-full h-80 sm:h-[420px] md:h-[500px] rounded-xl bg-slate-950 object-contain"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>

              {/* Controls & Details Footer */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-extrabold text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" /> Instructor / Speaker: {playingVideoModalResource.author}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {playingVideoModalResource.summary}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                  {playingVideoModalResource.downloadUrl && (
                    <a
                      href={playingVideoModalResource.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 text-blue-400" /> Open Link
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const newMediaTrack: MediaResource = {
                        id: `media_gdrive_${Date.now()}`,
                        title: playingVideoModalResource.title,
                        speaker: playingVideoModalResource.author,
                        duration: 'Livestream',
                        type: 'video',
                        url: playingVideoModalResource.downloadUrl || playingVideoModalResource.fileDataUrl || '',
                        description: playingVideoModalResource.summary,
                        dateAdded: new Date().toISOString().split('T')[0]
                      };
                      if (setClassroomMedia) {
                        setClassroomMedia(prev => [newMediaTrack, ...prev]);
                      }
                      setPlayingVideoModalResource(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Tv className="w-3.5 h-3.5" /> Send to Top Player
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ========================================================= */}
      {/* UNIVERSAL RESOURCE VIEWER MODAL (Phases 7–12) */}
      {/* ========================================================= */}
      {universalViewerResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2 truncate pr-4">
                <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  {universalViewerResource.title}
                </span>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {universalViewerResource.format || universalViewerResource.type || 'RESOURCE'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUniversalViewerResource(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                aria-label="Close Viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/60">
              <ResourceViewer
                resource={universalViewerResource}
                onComplete={() => {
                  if (universalViewerResource?.id) {
                    handleToggleComplete(universalViewerResource.id);
                  }
                }}
                onSave={() => {
                  // saved
                }}
                onDownload={(res) => {
                  const legacy = toLegacyResource(res as any);
                  handleDownload(legacy);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Resource Share Modal (Phase 24) */}
      <ResourceShareModal
        resource={shareModalResource}
        isOpen={!!shareModalResource}
        onClose={() => setShareModalResource(null)}
        onShareToCourse={(resId, courseId) => {
          logger.info(`Shared resource ${resId} to course ${courseId}`);
        }}
        onShareToModule={(resId, moduleId) => {
          logger.info(`Shared resource ${resId} to module ${moduleId}`);
        }}
        onShareWithStudents={(resId, note) => {
          logger.info(`Shared resource ${resId} with students with note: ${note}`);
        }}
      />

    </div>
  );
};
