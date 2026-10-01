import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Calendar, Award, BookOpen, Paperclip, Save, X, AlertCircle, Users, Plus, Trash2, Check, Search } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { CustomAssignment, AssignmentGroup } from '../../../types';
import { MASTER_ENROLLED_STUDENTS } from '../../../data/curriculum';
import { AssignmentFormData } from '../types';

interface AssignmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: AssignmentFormData) => void;
  assignment?: CustomAssignment | null;
  courses?: { code: string; title: string }[];
  students?: import('../../../types').StudentSummary[];
  studentRoster?: string[];
}

export const AssignmentForm: React.FC<AssignmentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  assignment,
  courses = [
    { code: 'M101', title: 'Old Testament Survey' },
    { code: 'M102', title: 'New Testament Survey' },
    { code: 'M103', title: 'Systematic Theology' },
    { code: 'M104', title: 'Homiletics & Preaching' },
    { code: 'M105', title: 'Leadership Dynamics' },
    { code: 'M106', title: 'Pastoral Care & Counseling' },
  ],
  students = [],
  studentRoster = [],
}) => {
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('M101');
  const [moduleTrack, setModuleTrack] = useState('Core Curriculum');
  const [cohortId, setCohortId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxPoints, setMaxPoints] = useState(100);
  const [type, setType] = useState<'document' | 'quiz'>('document');
  const [description, setDescription] = useState('');
  const [teacherAttachmentUrl, setTeacherAttachmentUrl] = useState('');
  const [teacherAttachmentName, setTeacherAttachmentName] = useState('');
  const [published, setPublished] = useState(true);
  const [isGroupAssignment, setIsGroupAssignment] = useState(false);
  const [groups, setGroups] = useState<AssignmentGroup[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dynamically resolve real cohort student names from props or storage
  const activeCohortRoster = useMemo(() => {
    if (students && students.length > 0) {
      const active = students
        .filter((s) => !s.isDroppedOut)
        .map((s) => s.name || (s as any).studentName)
        .filter(Boolean);
      if (active.length > 0) return Array.from(new Set(active));
    }

    if (studentRoster && studentRoster.length > 0) {
      return Array.from(new Set(studentRoster));
    }

    try {
      const local = localStorage.getItem('hteim_students');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = parsed
            .filter((s: any) => !s.isDroppedOut)
            .map((s: any) => s.name || s.studentName)
            .filter(Boolean);
          if (names.length > 0) return Array.from(new Set(names)) as string[];
        }
      }

      const recs = localStorage.getItem('hteim_attendance_records');
      if (recs) {
        const parsed = JSON.parse(recs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = parsed.map((r: any) => r.studentName).filter(Boolean);
          if (names.length > 0) return Array.from(new Set(names)) as string[];
        }
      }
    } catch (e) {
      console.error('Error resolving cohort roster:', e);
    }

    return MASTER_ENROLLED_STUDENTS && MASTER_ENROLLED_STUDENTS.length > 0 ? MASTER_ENROLLED_STUDENTS : [];
  }, [students, studentRoster]);

  useEffect(() => {
    if (assignment) {
      setTitle(assignment.title || '');
      setCourseCode(assignment.courseCode || 'M101');
      setModuleTrack(assignment.moduleTrack || 'Core Curriculum');
      setCohortId(assignment.cohortId || '');
      setDueDate(assignment.dueDate || '');
      setMaxPoints(assignment.maxPoints || 100);
      setType(assignment.type || 'document');
      setDescription(assignment.description || '');
      setTeacherAttachmentUrl(assignment.teacherAttachmentUrl || '');
      setTeacherAttachmentName(assignment.teacherAttachmentName || '');
      setPublished(assignment.published !== false);
      setIsGroupAssignment(assignment.isGroupAssignment || false);
      setGroups(assignment.groups || []);
    } else {
      // Default state for new assignment
      setTitle('');
      setCourseCode('M101');
      setModuleTrack('Core Curriculum');
      setCohortId('');
      const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      setDueDate(defaultDue);
      setMaxPoints(100);
      setType('document');
      setDescription('');
      setTeacherAttachmentUrl('');
      setTeacherAttachmentName('');
      setPublished(true);
      setIsGroupAssignment(false);
      setGroups([]);
    }
    setErrors({});
  }, [assignment, isOpen]);

  const handleAddGroup = () => {
    setGroups((prev) => [
      ...prev,
      {
        id: `grp-${Date.now()}-${prev.length + 1}`,
        groupName: `Group ${String.fromCharCode(65 + prev.length)}`,
        memberNames: [],
      },
    ]);
  };

  const handleRemoveGroup = (index: number) => {
    setGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateGroupName = (index: number, name: string) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, groupName: name } : g))
    );
  };

  const handleToggleMember = (groupIndex: number, studentName: string) => {
    setGroups((prev) =>
      prev.map((grp, i) => {
        if (i === groupIndex) {
          const exists = grp.memberNames.includes(studentName);
          const nextMembers = exists
            ? grp.memberNames.filter((m) => m !== studentName)
            : [...grp.memberNames, studentName];
          return { ...grp, memberNames: nextMembers };
        }
        return grp;
      })
    );
  };

  const handleAutoDivideRoster = () => {
    const roster = activeCohortRoster;
    if (roster.length === 0) return;
    const groupCount = Math.max(2, Math.ceil(roster.length / 3));
    const newGroups: AssignmentGroup[] = Array.from({ length: groupCount }, (_, i) => ({
      id: `grp-${Date.now()}-${i + 1}`,
      groupName: `Group ${String.fromCharCode(65 + i)}`,
      memberNames: [],
    }));

    roster.forEach((student, idx) => {
      const gIdx = idx % groupCount;
      newGroups[gIdx].memberNames.push(student);
    });

    setGroups(newGroups);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!dueDate) errs.dueDate = 'Due date is required';
    if (maxPoints <= 0) errs.maxPoints = 'Max points must be greater than 0';
    if (!description.trim()) errs.description = 'Guidelines / description are required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      id: assignment?.id,
      title: title.trim(),
      courseCode,
      moduleTrack,
      cohortId: cohortId || undefined,
      dueDate,
      maxPoints: Number(maxPoints),
      type,
      description: description.trim(),
      teacherAttachmentUrl: teacherAttachmentUrl || undefined,
      teacherAttachmentName: teacherAttachmentName || undefined,
      published,
      isDraft: !published,
      isGroupAssignment,
      groups: isGroupAssignment ? groups : undefined,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>{assignment ? 'Edit Assignment' : 'Create New Assignment'}</span>
        </div>
      }
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Assignment Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Module 1 Hermeneutics Exegesis Paper"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        {/* Course Code & Module Track */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Course / Module
            </label>
            <select
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {courses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'document' | 'quiz')}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="document">Written / Document Essay</option>
              <option value="quiz">Interactive Quiz</option>
            </select>
          </div>
        </div>

        {/* Due Date & Max Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Due Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Max Points Possible <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Award className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min="1"
                max="1000"
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            {errors.maxPoints && <p className="text-xs text-red-500 mt-1">{errors.maxPoints}</p>}
          </div>
        </div>

        {/* Guidelines / Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Instructions & Guidelines <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed submission guidelines, rubric requirements, formatting rules..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
        </div>

        {/* Teacher Resource Attachment */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase">
              Teacher Reference Material Attachment (Optional)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Attachment Display Title (e.g., Sample Essay Template.pdf)"
              value={teacherAttachmentName}
              onChange={(e) => setTeacherAttachmentName(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none"
            />
            <input
              type="url"
              placeholder="Document URL / Link"
              value={teacherAttachmentUrl}
              onChange={(e) => setTeacherAttachmentUrl(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none"
            />
          </div>
        </div>

        {/* Group Assignment Toggle & Builder */}
        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isGroupAssignment}
                onChange={(e) => {
                  setIsGroupAssignment(e.target.checked);
                  if (e.target.checked && groups.length === 0) {
                    handleAutoDivideRoster();
                  }
                }}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  Group Assignment
                </span>
              </div>
            </label>
            {isGroupAssignment && (
              <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                Marks awarded apply to all group members
              </span>
            )}
          </div>

          {isGroupAssignment && (
            <div className="space-y-3 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Groups & Student Members ({groups.length} Groups)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Selecting from <strong className="text-indigo-600 dark:text-indigo-400">{activeCohortRoster.length} active cohort students</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoDivideRoster}
                    className="px-2.5 py-1 text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-200 rounded-lg transition-colors cursor-pointer"
                  >
                    ⚡ Auto-Divide Roster
                  </button>
                  <button
                    type="button"
                    onClick={handleAddGroup}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Group</span>
                  </button>
                </div>
              </div>

              {/* Roster Search Input */}
              {activeCohortRoster.length > 5 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder="Search student names in cohort..."
                    className="w-full pl-8 pr-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-hidden focus:border-indigo-500"
                  />
                </div>
              )}

              {groups.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                  No groups configured yet. Click "Add Group" or "Auto-Divide Roster".
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {groups.map((grp, gIdx) => {
                    const filteredRoster = studentSearchQuery.trim()
                      ? activeCohortRoster.filter((s) =>
                          s.toLowerCase().includes(studentSearchQuery.toLowerCase().trim())
                        )
                      : activeCohortRoster;

                    return (
                      <div
                        key={grp.id || gIdx}
                        className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={grp.groupName}
                            onChange={(e) => handleUpdateGroupName(gIdx, e.target.value)}
                            placeholder="Group Name..."
                            className="px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-hidden focus:border-indigo-500 flex-1"
                          />
                          <span className="text-[11px] font-semibold text-slate-500">
                            {grp.memberNames.length} Members
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGroup(gIdx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove Group"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Student Member Selectors */}
                        <div className="flex flex-wrap gap-1.5">
                          {filteredRoster.map((stName) => {
                            const isMember = grp.memberNames.includes(stName);
                            return (
                              <button
                                type="button"
                                key={stName}
                                onClick={() => handleToggleMember(gIdx, stName)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                                  isMember
                                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                {isMember && <Check className="w-3 h-3" />}
                                <span>{stName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Published Toggle */}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Publish immediately (visible to students)
            </span>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{assignment ? 'Save Changes' : 'Create Assignment'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
