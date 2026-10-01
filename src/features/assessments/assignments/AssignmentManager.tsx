import React, { useState } from 'react';
import { FileText, Plus, Search, Calendar, Award, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import { CustomAssignment, AssignmentSubmission } from '../../../types';

export interface AssignmentManagerProps {
  assignments: CustomAssignment[];
  submissions: AssignmentSubmission[];
  onSaveAssignment: (asg: CustomAssignment) => void;
  onDeleteAssignment: (id: string) => void;
  onGradeSubmission?: (submission: AssignmentSubmission) => void;
}

export const AssignmentManager: React.FC<AssignmentManagerProps> = ({
  assignments,
  submissions,
  onSaveAssignment,
  onDeleteAssignment,
  onGradeSubmission
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');

  const filtered = assignments.filter(a => {
    const matchesSearch = (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.courseCode || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = filterCourse === 'all' || a.courseCode === filterCourse;
    return matchesSearch && matchesCourse;
  });

  const courseCodes = Array.from(new Set(assignments.map(a => a.courseCode || 'MIN-101')));

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assignments by title or course..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
        >
          <option value="all">All Courses</option>
          {courseCodes.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Grid of Assignments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(asg => {
          const subCount = submissions.filter(s => s.assignmentId === asg.id).length;
          return (
            <div
              key={asg.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full">
                  {asg.courseCode || 'MIN'}
                </span>
                <span className="text-xs font-mono font-bold text-amber-600">{asg.maxPoints} pts</span>
              </div>

              <h3 className="text-sm font-black text-slate-900 dark:text-white">{asg.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{asg.description}</p>

              <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-500 border-t border-slate-100 dark:border-slate-700">
                <span>Due: {asg.dueDate}</span>
                <span className="text-purple-600 font-sans font-bold">{subCount} Submissions</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
