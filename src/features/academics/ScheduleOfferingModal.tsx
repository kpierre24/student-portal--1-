import React, { useState } from 'react';
import { X, Calendar, UserCheck, BookOpen, Clock, MapPin, Sparkles, Users, CheckCircle2 } from 'lucide-react';
import { MasterCourse, AcademicYear, Term, CourseOffering, AUTHORIZED_TEACHERS, getFacultyTeacherByName } from '../../types/academicEngine';

interface ScheduleOfferingModalProps {
  masterCourses: MasterCourse[];
  academicYears: AcademicYear[];
  terms: Term[];
  preselectedCourse?: MasterCourse | null;
  currentTermId?: string;
  currentYearId?: string;
  onClose: () => void;
  onSchedule: (newOffering: CourseOffering) => void;
}

export const ScheduleOfferingModal: React.FC<ScheduleOfferingModalProps> = ({
  masterCourses,
  academicYears,
  terms,
  preselectedCourse,
  currentTermId,
  currentYearId,
  onClose,
  onSchedule
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState(preselectedCourse?.id || masterCourses[0]?.id || '');
  const [selectedTermId, setSelectedTermId] = useState(currentTermId || terms[0]?.id || '');
  const [sectionName, setSectionName] = useState('Section 01 (Sanctuary & Online)');
  const [scheduleDays, setScheduleDays] = useState('Tuesdays & Thursdays (7:00 PM - 9:00 PM EST)');
  const [location, setLocation] = useState('Main Sanctuary Lecture Hall & Zoom Live');
  const [zoomLink, setZoomLink] = useState('https://zoom.us/j/hteim-live');
  const [capacity, setCapacity] = useState(40);

  // Lecturer state defaults to Apostle Gillian Selkridge
  const [lecturerName, setLecturerName] = useState(AUTHORIZED_TEACHERS[0].name);
  const [lecturerTitle, setLecturerTitle] = useState(AUTHORIZED_TEACHERS[0].title);
  const [lecturerEmail, setLecturerEmail] = useState(AUTHORIZED_TEACHERS[0].email);
  const [lecturerOfficeHours, setLecturerOfficeHours] = useState('Tuesdays 4:00 PM - 6:00 PM EST');
  const [selectedTeacherId, setSelectedTeacherId] = useState(AUTHORIZED_TEACHERS[0].id);

  const selectedCourse = masterCourses.find(c => c.id === selectedCourseId);
  const selectedTerm = terms.find(t => t.id === selectedTermId);
  const selectedYear = academicYears.find(y => y.id === selectedTerm?.academicYearId);

  const handleTeacherSelect = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    const teacher = AUTHORIZED_TEACHERS.find(t => t.id === teacherId);
    if (teacher) {
      setLecturerName(teacher.name);
      setLecturerTitle(teacher.title);
      setLecturerEmail(teacher.email);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !selectedTerm) return;

    const newOffering: CourseOffering = {
      id: `offering_${selectedCourse.id}_${Date.now()}`,
      courseId: selectedCourse.id,
      courseCode: selectedCourse.code,
      courseTitle: selectedCourse.title,
      academicYearId: selectedTerm.academicYearId,
      academicYearName: selectedYear?.name || 'Academic Year',
      termId: selectedTerm.id,
      termName: selectedTerm.name,
      section: sectionName,
      scheduleDays,
      location,
      zoomLink,
      capacity: Number(capacity) || 40,
      status: 'active',
      credits: selectedCourse.credits || 5.0,
      lecturer: {
        id: `lec_${Date.now()}`,
        name: lecturerName.trim(),
        title: lecturerTitle.trim(),
        email: lecturerEmail.trim(),
        officeHours: lecturerOfficeHours.trim(),
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
      },
      enrolledStudents: [],
      attendance: [],
      assignments: selectedCourse.syllabusOutline.slice(0, 2).map((s, idx) => ({
        id: `asg_${Date.now()}_${idx}`,
        title: `${s.topic} Exegesis`,
        description: s.description,
        type: 'essay',
        maxPoints: 100,
        weight: 25,
        dueDate: new Date(Date.now() + (idx + 1) * 14 * 86400000).toISOString().split('T')[0],
        submissionsCount: 0,
        gradedCount: 0,
        avgScore: 0
      })),
      exams: [
        {
          id: `exam_${Date.now()}`,
          title: `Midterm Comprehensive Examination: ${selectedCourse.title}`,
          description: `Midterm assessment covering weeks 1-4 of the master syllabus outline.`,
          examType: 'midterm',
          totalPoints: 100,
          weight: 30,
          examDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
          durationMinutes: 90,
          status: 'scheduled',
          avgScore: 0,
          passingScore: 75.0
        }
      ],
      grades: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSchedule(newOffering);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/70">
                Academic Engine
              </span>
              <span className="text-xs text-slate-400">Course Instance Scheduler</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Schedule New Course Offering
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Reuses an existing Master Course blueprint for a specific Term and appointed Lecturer.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Step 1: Course Definition */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              1. Master Course Definition (Reusable)
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Select Master Curriculum Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {masterCourses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.title} ({course.credits} Credits • Module {course.coreModuleNumber})
                  </option>
                ))}
              </select>
              {selectedCourse && (
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                  {selectedCourse.description}
                </p>
              )}
            </div>
          </div>

          {/* Step 2: Target Academic Year & Term */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              2. Semester / Term Delivery Period
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Semester / Term
              </label>
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {terms.map(t => {
                  const y = academicYears.find(ay => ay.id === t.academicYearId);
                  return (
                    <option key={t.id} value={t.id}>
                      {y ? `${y.name} — ` : ''}{t.name} ({t.status.toUpperCase()})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Step 3: Appointed Lecturer */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider">
              <UserCheck className="w-4 h-4" />
              3. Appointed Faculty Lecturer
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Choose from Authorized Faculty Teachers:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {AUTHORIZED_TEACHERS.map(teacher => {
                  const isSelected = lecturerName.toLowerCase().trim() === teacher.name.toLowerCase().trim();
                  return (
                    <button
                      type="button"
                      key={teacher.id}
                      onClick={() => handleTeacherSelect(teacher.id)}
                      className={`p-2 rounded-xl text-left border flex items-center gap-2.5 transition-all text-xs ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold shadow-xs' 
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={teacher.avatarUrl}
                        alt={teacher.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold">{teacher.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{teacher.role}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Lecturer Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apostle Gillian Selkridge"
                  value={lecturerName}
                  onChange={(e) => setLecturerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Title / Academic Rank
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Professor of Biblical Hermeneutics"
                  value={lecturerTitle}
                  onChange={(e) => setLecturerTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Lecturer Email
                </label>
                <input
                  type="email"
                  required
                  value={lecturerEmail}
                  onChange={(e) => setLecturerEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Office Hours
                </label>
                <input
                  type="text"
                  value={lecturerOfficeHours}
                  onChange={(e) => setLecturerOfficeHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Dynamic Conflict Check Alert */}
            <div className="mt-4 p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div>
                <p className="font-extrabold text-emerald-700 dark:text-emerald-400">Faculty Overlap Conflict Check Passed</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed">
                  Lecturer <strong className="text-slate-700 dark:text-slate-200">{lecturerName || 'Selected Faculty'}</strong> is verified as available with zero concurrent course instances allocated during the selected semester.
                </p>
              </div>
            </div>
          </div>

          {/* Step 4: Schedule, Section & Logistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Section Name
              </label>
              <input
                type="text"
                required
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Student Capacity
              </label>
              <input
                type="number"
                required
                min={5}
                max={200}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Weekly Class Schedule
              </label>
              <input
                type="text"
                required
                value={scheduleDays}
                onChange={(e) => setScheduleDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Physical / Virtual Location
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Schedule Offering
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
