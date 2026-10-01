import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  FileText, 
  Video, 
  Globe, 
  BookMarked, 
  CheckCircle2, 
  Circle, 
  Download, 
  ChevronRight, 
  ExternalLink, 
  Play, 
  HelpCircle, 
  Award, 
  Calendar, 
  Clock, 
  User, 
  Layers, 
  Sparkles, 
  Copy, 
  Check, 
  FolderCheck,
  Search,
  BookCheck,
  ArrowRight,
  Headphones,
  Presentation,
  FileCheck,
  Plus
} from 'lucide-react';
import { 
  AcademicCourseNode, 
  AcademicModuleNode, 
  AcademicLessonNode, 
  LearningResource,
  LessonResourceBundle
} from '../types';
import { 
  categorizeLessonResources, 
  toggleLessonCompletion 
} from '../services/curriculumHierarchyService';
import { ScriptureHoverPopover } from '../../../components/ScriptureHoverPopover';
import { extractScriptureReferences } from '../../../utils/scriptureDetector';

interface CurriculumHierarchyViewProps {
  courses: AcademicCourseNode[];
  selectedCourseId?: string;
  selectedModuleId?: string;
  selectedLessonId?: string;
  onSelectLesson?: (courseId: string, moduleId: string, lessonId: string) => void;
  onOpenReader?: (resource: LearningResource) => void;
  onPlayVideo?: (resource: LearningResource) => void;
  onDownloadResource?: (resource: LearningResource, e?: React.MouseEvent) => void;
  onTakeQuiz?: (quizId: string) => void;
  onAddResource?: (placement?: { courseId?: string; moduleId?: string; lessonId?: string }) => void;
  studentName?: string;
  userRole?: string;
}

export const CurriculumHierarchyView: React.FC<CurriculumHierarchyViewProps> = ({
  courses,
  selectedCourseId: initialCourseId,
  selectedModuleId: initialModuleId,
  selectedLessonId: initialLessonId,
  onSelectLesson,
  onOpenReader,
  onPlayVideo,
  onDownloadResource,
  onTakeQuiz,
  onAddResource,
  studentName = 'Student',
  userRole = 'student',
}) => {
  // Determine default selections
  const defaultCourse = courses[0];
  const [courseId, setCourseId] = useState<string>(initialCourseId || defaultCourse?.id || 'c_main');

  const currentCourse = useMemo(() => {
    return courses.find(c => c.id === courseId || c.code === courseId) || courses[0];
  }, [courses, courseId]);

  // Default to Module 3 or Module 1
  const defaultModule = currentCourse?.modules.find(m => m.code === 'SOM-MOD-3') || currentCourse?.modules[0];
  const [moduleId, setModuleId] = useState<string>(initialModuleId || defaultModule?.code || 'SOM-MOD-3');

  const currentModule = useMemo(() => {
    if (!currentCourse) return null;
    return currentCourse.modules.find(m => m.code === moduleId || m.id === moduleId) || currentCourse.modules[0];
  }, [currentCourse, moduleId]);

  // Default to Lesson 2 (as highlighted in the user prompt: "Systematic Theology → Module 3 → Lesson 2")
  const defaultLesson = currentModule?.lessons.find(l => l.lessonNumber === 2) || currentModule?.lessons[0];
  const [lessonId, setLessonId] = useState<string>(initialLessonId || defaultLesson?.id || 'SOM-MOD-3-L2');

  const currentLesson = useMemo(() => {
    if (!currentModule) return null;
    return currentModule.lessons.find(l => l.id === lessonId) || currentModule.lessons[0];
  }, [currentModule, lessonId]);

  // Active section filter tab in lesson view: 'all' | 'notes' | 'video' | 'website' | 'scriptures' | 'quiz' | 'downloads'
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('all');
  const [copiedVerses, setCopiedVerses] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local state for completed lesson ids to provide instant feedback
  const [completedLessons, setCompletedLessons] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    courses.forEach(c => {
      c.modules.forEach(m => {
        m.lessons.forEach(l => {
          if (l.isCompleted) map[l.id] = true;
        });
      });
    });
    return map;
  });

  const handleToggleComplete = (lId: string) => {
    const isCompletedNow = toggleLessonCompletion(lId, studentName);
    setCompletedLessons(prev => ({
      ...prev,
      [lId]: isCompletedNow,
    }));
  };

  const handleSelectLesson = (cId: string, mCode: string, lId: string) => {
    setCourseId(cId);
    setModuleId(mCode);
    setLessonId(lId);
    if (onSelectLesson) {
      onSelectLesson(cId, mCode, lId);
    }
  };

  // Categorized bundle for currently selected lesson
  const resourceBundle: LessonResourceBundle = useMemo(() => {
    if (!currentLesson) {
      return {
        notes: [],
        videos: [],
        websites: [],
        audios: [],
        presentations: [],
        scriptures: [],
        quizzes: [],
        assignments: [],
        downloadables: [],
      };
    }
    return categorizeLessonResources(
      currentLesson.resources,
      currentLesson.scriptureReferences,
      currentLesson.quizzes,
      currentLesson.assignments
    );
  }, [currentLesson]);

  // Copy scriptures to clipboard
  const handleCopyScriptures = () => {
    if (!resourceBundle.scriptures.length) return;
    const text = resourceBundle.scriptures.join(', ');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedVerses(true);
      setTimeout(() => setCopiedVerses(false), 2000);
    });
  };

  // Filter lessons for quick search
  const filteredLessons = useMemo(() => {
    if (!searchQuery.trim() || !currentModule) return currentModule?.lessons || [];
    const q = searchQuery.toLowerCase();
    return currentModule.lessons.filter(
      l => l.title.toLowerCase().includes(q) ||
           l.description?.toLowerCase().includes(q) ||
           l.scriptureReferences.some(s => s.toLowerCase().includes(q))
    );
  }, [currentModule, searchQuery]);

  if (!currentCourse || !currentModule || !currentLesson) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <BookOpen className="w-10 h-10 mx-auto text-indigo-500 mb-3" />
        <p className="text-slate-600 dark:text-slate-300 font-medium">Curriculum structure is currently loading...</p>
      </div>
    );
  }

  const isCurrentLessonCompleted = !!completedLessons[currentLesson.id];

  return (
    <div className="space-y-6">
      {/* 1. Academic Pathway Breadcrumb & Selector Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            {/* Pathway Breadcrumb */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-indigo-300">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                {currentCourse.programTitle || currentCourse.title}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
              <span className="bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-700/50">
                {currentModule.code}: {currentModule.title}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-white font-bold bg-indigo-600/60 px-2.5 py-0.5 rounded-md">
                Lesson {currentLesson.lessonNumber}
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {currentLesson.title}
            </h1>
            {currentLesson.subtitle && (
              <p className="text-xs sm:text-sm text-indigo-200/80 font-medium">
                {currentLesson.subtitle}
              </p>
            )}
          </div>

          {/* Action: Mark Complete / Status Button */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            <button
              type="button"
              onClick={() => handleToggleComplete(currentLesson.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs ${
                isCurrentLessonCompleted
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              {isCurrentLessonCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Lesson Completed</span>
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4 text-indigo-300" />
                  <span>Mark as Completed</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Academic Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Course Modules & Lessons Navigation Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Module Selector Accordion */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                Curriculum Modules
              </h2>
              <span className="text-2xs font-bold text-slate-400">
                6 Modules
              </span>
            </div>

            {/* Modules List */}
            <div className="space-y-1.5">
              {currentCourse.modules.map((mod) => {
                const isSelectedMod = mod.code === currentModule.code;
                const completedCount = mod.lessons.filter(l => completedLessons[l.id]).length;
                const totalLessons = mod.lessons.length;

                return (
                  <button
                    key={mod.code}
                    type="button"
                    onClick={() => {
                      setModuleId(mod.code);
                      // default to first lesson of this module
                      if (mod.lessons.length > 0) {
                        setLessonId(mod.lessons[0].id);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer border flex items-center justify-between ${
                      isSelectedMod
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-2xs'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-2xs font-extrabold px-1.5 py-0.5 rounded ${
                          isSelectedMod ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {mod.code}
                        </span>
                        <h3 className={`text-xs font-bold truncate ${
                          isSelectedMod ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {mod.title}
                        </h3>
                      </div>
                      <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {completedCount}/{totalLessons} lessons completed
                      </p>
                    </div>

                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelectedMod ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5' : 'text-slate-400'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Module Lessons List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <BookCheck className="w-4 h-4 text-emerald-500" />
                {currentModule.code} Lessons
              </h2>
              <span className="text-2xs font-bold text-indigo-600 dark:text-indigo-400">
                Week 1 - {currentModule.lessons.length}
              </span>
            </div>

            {/* Lesson Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter module lessons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Lessons Accordion Stack */}
            <div className="space-y-2">
              {filteredLessons.map((lesson) => {
                const isSelected = lesson.id === currentLesson.id;
                const isDone = !!completedLessons[lesson.id];
                const bundle = categorizeLessonResources(lesson.resources, lesson.scriptureReferences, lesson.quizzes);

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => handleSelectLesson(currentCourse.id, currentModule.code, lesson.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-2xs font-extrabold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          L{lesson.lessonNumber}
                        </span>
                        <h4 className="text-xs font-bold line-clamp-1">
                          {lesson.title}
                        </h4>
                      </div>
                      {isDone ? (
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-300' : 'text-emerald-500'}`} />
                      ) : (
                        <Circle className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white/40' : 'text-slate-300 dark:text-slate-600'}`} />
                      )}
                    </div>

                    {/* Lesson Resource Badges Pills */}
                    <div className={`flex flex-wrap items-center gap-2 mt-2 pt-2 border-t text-2xs ${
                      isSelected ? 'border-white/20 text-indigo-100' : 'border-slate-100 dark:border-slate-700/80 text-slate-500 dark:text-slate-400'
                    }`}>
                      {bundle.notes.length > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {bundle.notes.length} Notes
                        </span>
                      )}
                      {bundle.videos.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3" /> {bundle.videos.length} Video
                        </span>
                      )}
                      {bundle.websites.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" /> {bundle.websites.length} Link
                        </span>
                      )}
                      {bundle.quizzes.length > 0 && (
                        <span className="flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" /> Quiz
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Lesson Academic Content Hub (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Quick Filter Pills for Content Types */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveSectionFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeSectionFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All Content
              </button>
              <button
                type="button"
                onClick={() => setActiveSectionFilter('notes')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSectionFilter === 'notes'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Notes ({resourceBundle.notes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSectionFilter('video')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSectionFilter === 'video'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                Videos ({resourceBundle.videos.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSectionFilter('website')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSectionFilter === 'website'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Websites ({resourceBundle.websites.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSectionFilter('scriptures')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSectionFilter === 'scriptures'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                <BookMarked className="w-3.5 h-3.5" />
                Scriptures ({resourceBundle.scriptures.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSectionFilter('quiz')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSectionFilter === 'quiz'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Quiz ({resourceBundle.quizzes.length})
              </button>
            </div>

            {/* Quick Stats Pill & Teacher Add Resource Action */}
            <div className="flex items-center gap-2">
              {onAddResource && (userRole === 'admin' || userRole === 'teacher') && (
                <button
                  type="button"
                  onClick={() => onAddResource({
                    courseId: currentCourse.code || currentCourse.id,
                    moduleId: currentModule.code,
                    lessonId: currentLesson.id
                  })}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Add learning material to this lesson"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Resource
                </button>
              )}
              <div className="hidden sm:flex items-center gap-2 text-2xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {currentLesson.resources.length} Academic Resources
                </span>
              </div>
            </div>
          </div>

          {/* Lesson Overview Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Week {currentLesson.weekNumber || currentLesson.lessonNumber} Session
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <User className="w-3.5 h-3.5 text-indigo-500" />
                Instructor: {currentModule.instructor}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  Required Curriculum
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {currentLesson.description}
            </p>

            {/* Key Topics Covered */}
            {currentLesson.keyTopics && currentLesson.keyTopics.length > 0 && (
              <div className="pt-2">
                <h3 className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-2">Key Discussion Topics</h3>
                <div className="flex flex-wrap gap-1.5">
                  {currentLesson.keyTopics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 📄 Section 1: Lesson Notes & Handouts */}
          {(activeSectionFilter === 'all' || activeSectionFilter === 'notes') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  📄 Lesson Notes & Study Handouts
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  {resourceBundle.notes.length} item{resourceBundle.notes.length === 1 ? '' : 's'}
                </span>
              </div>

              {resourceBundle.notes.length === 0 ? (
                <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                  No lesson notes currently uploaded for this session.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resourceBundle.notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/40">
                            {note.type.toUpperCase()} • {note.size || 'PDF'}
                          </span>
                          {note.pageCount && (
                            <span className="text-2xs font-bold text-slate-400">
                              {note.pageCount} Pages
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                          {note.title}
                        </h4>

                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {note.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {onOpenReader && (
                          <button
                            type="button"
                            onClick={() => onOpenReader(note)}
                            className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Read Document
                          </button>
                        )}
                        {onDownloadResource && note.isDownloadable && (
                          <button
                            type="button"
                            onClick={(e) => onDownloadResource(note, e)}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer"
                            title="Download Notes"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ▶️ Section 2: Lecture Video */}
          {(activeSectionFilter === 'all' || activeSectionFilter === 'video') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-rose-600" />
                  ▶️ Lecture Video
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  {resourceBundle.videos.length} recording{resourceBundle.videos.length === 1 ? '' : 's'}
                </span>
              </div>

              {resourceBundle.videos.length === 0 ? (
                <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                  No video lecture recorded for this lesson yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {resourceBundle.videos.map((vid) => (
                    <div
                      key={vid.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs"
                    >
                      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                              {vid.source.toUpperCase()} STREAM
                            </span>
                            {vid.durationSeconds && (
                              <span className="text-2xs font-bold text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.round(vid.durationSeconds / 60)} mins
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {vid.title}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                            {vid.description}
                          </p>
                        </div>

                        {onPlayVideo && (
                          <button
                            type="button"
                            onClick={() => onPlayVideo(vid)}
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs shrink-0"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            Watch Lecture
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 🌐 Section 3: Recommended Website */}
          {(activeSectionFilter === 'all' || activeSectionFilter === 'website') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-600" />
                  🌐 Recommended Website & External Resources
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  {resourceBundle.websites.length} link{resourceBundle.websites.length === 1 ? '' : 's'}
                </span>
              </div>

              {resourceBundle.websites.length === 0 ? (
                <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                  No external website links assigned to this lesson.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resourceBundle.websites.map((site) => (
                    <div
                      key={site.id}
                      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-sky-300 dark:hover:border-sky-700 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                            EXTERNAL PORTAL
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                          {site.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {site.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <span>Visit Website</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 📖 Section 4: Scripture References */}
          {(activeSectionFilter === 'all' || activeSectionFilter === 'scriptures') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-amber-600" />
                  📖 Scripture References
                </h3>
                {resourceBundle.scriptures.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCopyScriptures}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedVerses ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedVerses ? 'Copied Verses' : 'Copy All Verses'}
                  </button>
                )}
              </div>

              {resourceBundle.scriptures.length === 0 ? (
                <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                  No scripture references indexed for this lesson.
                </div>
              ) : (
                <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-5 space-y-3">
                  <p className="text-2xs font-bold uppercase tracking-wider text-amber-900/80 dark:text-amber-400">
                    Assigned Foundation Verses (Hover or click to read excerpt):
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {resourceBundle.scriptures.map((verseRef, idx) => {
                      const detected = extractScriptureReferences(verseRef)[0] || {
                        raw: verseRef,
                        book: verseRef,
                        bookId: 'gen',
                        chapter: 1,
                        cleanReference: verseRef,
                      };
                      return (
                        <ScriptureHoverPopover key={idx} scripture={detected}>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 shadow-2xs hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-all cursor-pointer">
                            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                            {verseRef}
                          </span>
                        </ScriptureHoverPopover>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 📝 Section 5: Quiz Assessment */}
          {(activeSectionFilter === 'all' || activeSectionFilter === 'quiz') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-600" />
                  📝 Lesson Quiz & Knowledge Check
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  {resourceBundle.quizzes.length} quiz{resourceBundle.quizzes.length === 1 ? '' : 'zes'}
                </span>
              </div>

              {resourceBundle.quizzes.length === 0 ? (
                <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                  No quiz assigned directly to this session. Check module evaluations in the Examinations tab.
                </div>
              ) : (
                <div className="space-y-4">
                  {resourceBundle.quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                            {quiz.totalPoints || 100} POINTS
                          </span>
                          <span className="text-2xs font-bold text-slate-400">
                            Passing: 75% • {quiz.questions?.length || 4} Questions
                          </span>
                          {quiz.timeLimitMinutes && (
                            <span className="text-2xs font-bold text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {quiz.timeLimitMinutes} Mins
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {quiz.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                          {quiz.description}
                        </p>
                      </div>

                      {onTakeQuiz && (
                        <button
                          type="button"
                          onClick={() => onTakeQuiz(quiz.id)}
                          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs shrink-0"
                        >
                          <HelpCircle className="w-4 h-4" />
                          Take Quiz
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 📥 Section 6: Download Materials */}
          {(activeSectionFilter === 'all' || activeSectionFilter === 'downloads') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-600" />
                  📥 Download Materials
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  {resourceBundle.downloadables.length} file{resourceBundle.downloadables.length === 1 ? '' : 's'}
                </span>
              </div>

              {resourceBundle.downloadables.length === 0 ? (
                <div className="p-5 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                  No downloadable files attached to this lesson.
                </div>
              ) : (
                <div className="space-y-2">
                  {resourceBundle.downloadables.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                          {item.type === 'audio' ? (
                            <Headphones className="w-4 h-4" />
                          ) : item.type === 'presentation' ? (
                            <Presentation className="w-4 h-4" />
                          ) : (
                            <FileCheck className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </h4>
                          <p className="text-2xs text-slate-400">
                            {item.type.toUpperCase()} • {item.size || 'Downloadable Asset'}
                          </p>
                        </div>
                      </div>

                      {onDownloadResource && (
                        <button
                          type="button"
                          onClick={(e) => onDownloadResource(item, e)}
                          className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
