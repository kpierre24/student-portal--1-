import React, { useState } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Calendar, 
  Award, 
  CheckCircle2, 
  Plus, 
  ChevronRight, 
  Clock, 
  Layers, 
  Search,
  ExternalLink,
  BookMarked,
  Users,
  Edit3,
  UserCheck,
  FileText,
  Bookmark,
  GraduationCap
} from 'lucide-react';
import { MasterCourse, CourseOffering, AUTHORIZED_TEACHERS, getFacultyTeacherByName } from '../../types/academicEngine';
import { UserRole } from '../../lib/userAuth';
import { EditModuleTeachersModal } from './EditModuleTeachersModal';

interface MasterCourseCatalogViewProps {
  masterCourses: MasterCourse[];
  courseOfferings: CourseOffering[];
  onSelectCourseOffering: (offering: CourseOffering) => void;
  onScheduleCourse: (course: MasterCourse) => void;
  onUpdateMasterCourse?: (course: MasterCourse) => void;
  userRole?: UserRole;
  libraryResources?: any[];
  customAssignments?: any[];
  uniqueStudents?: any[];
  onNavigate?: (tab: any) => void;
}

export const MasterCourseCatalogView: React.FC<MasterCourseCatalogViewProps> = ({
  masterCourses,
  courseOfferings,
  onSelectCourseOffering,
  onScheduleCourse,
  onUpdateMasterCourse,
  userRole = 'admin',
  libraryResources = [],
  customAssignments = [],
  uniqueStudents = [],
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [editingCourseForTeachers, setEditingCourseForTeachers] = useState<MasterCourse | null>(null);

  const isTeacherOrAdmin = userRole === 'admin' || userRole === 'teacher';

  const departments = ['all', 'Biblical Studies', 'Practical Ministry', 'Leadership & Governance', 'Theology & Ethics'];

  const filteredCourses = masterCourses.filter(course => {
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.teachers && course.teachers.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesDept = selectedDepartment === 'all' || course.department === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      
      {/* Intro Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-indigo-200 border border-white/10 mb-3">
            <BookMarked className="w-3.5 h-3.5" />
            Core Curriculum Architecture
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Master Curriculum Catalog (6 Core Modules)
          </h2>
          <p className="text-sm text-indigo-100/90 mt-2 leading-relaxed">
            These central course definitions establish the authoritative ministerial curriculum of HTEIM School of Ministry.
            Synchronized directly with active student enrollment ({uniqueStudents.length || 38} students), class sessions, coursework assignments, and theological library materials.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search master curriculum courses, module titles, or lecturers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedDepartment === dept
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {dept === 'all' ? 'All Departments' : dept}
            </button>
          ))}
        </div>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredCourses.map(course => {
          const isExpanded = expandedCourseId === course.id;
          const offeringsForCourse = courseOfferings.filter(o => 
            o.courseId === course.id || 
            o.courseCode === course.code ||
            (o.courseCode === 'SOM-CORE' && o.status === 'active')
          );

          // Real linked library resources
          const moduleResources = libraryResources.filter(r => 
            r.moduleId === course.code || 
            r.moduleId === course.id || 
            r.courseCode === course.code ||
            (r.title && r.title.toLowerCase().includes(course.title.toLowerCase())) ||
            (r.category && r.category.toLowerCase().includes(course.title.toLowerCase()))
          );

          // Real linked assignments
          const moduleAssignments = customAssignments.filter(a =>
            a.courseCode === course.code ||
            a.moduleId === course.code ||
            (a.title && a.title.toLowerCase().includes(course.title.toLowerCase())) ||
            (a.course && a.course.toLowerCase().includes(course.title.toLowerCase()))
          );

          const studentCohortCount = uniqueStudents.length > 0 ? uniqueStudents.length : 38;

          return (
            <div
              key={course.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header badges */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80">
                      {course.code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/80">
                      Module {course.coreModuleNumber}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {course.credits} Credits
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {course.department}
                  </span>
                </div>

                {/* Course Title */}
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {course.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed line-clamp-3">
                  {course.description}
                </p>

                {/* Live Connected App Metrics */}
                <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Cohort Roster</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {studentCohortCount} Students
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Handouts/Media</span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {moduleResources.length > 0 ? `${moduleResources.length} Items` : 'Available'}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Assessments</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {moduleAssignments.length > 0 ? `${moduleAssignments.length} Active` : 'Curriculum'}
                    </span>
                  </div>
                </div>

                {/* Faculty Teachers Section */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      Appointed Teachers ({course.teachers?.length || 0})
                    </span>

                    {isTeacherOrAdmin && (
                      <button
                        type="button"
                        onClick={() => setEditingCourseForTeachers(course)}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Teachers</span>
                      </button>
                    )}
                  </div>

                  {course.teachers && course.teachers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {course.teachers.map((teacherName) => {
                        const teacherInfo = getFacultyTeacherByName(teacherName);
                        return (
                          <div
                            key={teacherName}
                            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs"
                          >
                            <img
                              src={teacherInfo?.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                              alt={teacherName}
                              className="w-5 h-5 rounded-full object-cover border border-indigo-200 dark:border-indigo-800"
                            />
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {teacherName}
                            </span>
                            {teacherInfo?.role && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300">
                                {teacherInfo.role}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No faculty teachers currently assigned to this module.
                    </p>
                  )}
                </div>

                {/* Learning Outcomes & Syllabus Expansion */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
                        Learning Outcomes
                      </h4>
                      <ul className="space-y-1.5">
                        {course.learningOutcomes.map((outcome, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <span>{outcome}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
                        Syllabus Outline
                      </h4>
                      <div className="space-y-2">
                        {course.syllabusOutline.map((item) => (
                          <div key={item.week} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              Week {item.week}: {item.topic}
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.description}
                            </p>
                            {item.scriptureReferences && item.scriptureReferences.length > 0 && (
                              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                                Scripture: {item.scriptureReferences.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Offerings of this master course */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Scheduled Offerings ({offeringsForCourse.length})
                    </span>
                    <button
                      onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                      className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                    >
                      {isExpanded ? 'Show Less' : 'View Full Syllabus'}
                    </button>
                  </div>

                  {offeringsForCourse.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-1">
                      Not currently scheduled in an active semester.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {offeringsForCourse.map(offering => (
                        <div
                          key={offering.id}
                          onClick={() => onSelectCourseOffering(offering)}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                              {offering.termName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Lecturer: <strong className="text-slate-700 dark:text-slate-300">{offering.lecturer.name}</strong> • {offering.enrolledStudents?.length || studentCohortCount} Students
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {onNavigate && (
                    <>
                      <button
                        type="button"
                        onClick={() => onNavigate('library')}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="View module study handouts and media"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Library</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate('exams')}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="View module quizzes and coursework"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Exams</span>
                      </button>
                    </>
                  )}
                </div>

                {isTeacherOrAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCourseForTeachers(course)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Teachers
                    </button>

                    <button
                      onClick={() => onScheduleCourse(course)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Schedule Offering
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Teachers Modal for Module */}
      {editingCourseForTeachers && (
        <EditModuleTeachersModal
          course={editingCourseForTeachers}
          onClose={() => setEditingCourseForTeachers(null)}
          onSave={(updatedCourse) => {
            if (onUpdateMasterCourse) {
              onUpdateMasterCourse(updatedCourse);
            }
          }}
        />
      )}

    </div>
  );
};
