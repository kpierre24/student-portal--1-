import React from 'react';
import {
  Search,
  Filter,
  Eye,
  Edit3,
  Award,
  BookOpen,
  ArrowUpDown,
  Download,
  CheckCircle,
} from 'lucide-react';
import { GradeRecord, CanonicalGradeStage } from '../types';
import { GradeStatusBadge } from './GradeStatusBadge';
import { calculateGradeCategory, normalizeGradeStage } from '../services/gradesService';

interface GradebookProps {
  grades: GradeRecord[];
  onSelectGrade: (grade: GradeRecord) => void;
  onEditGrade?: (grade: GradeRecord) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCourse: string;
  onCourseChange: (c: string) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
  isLoading?: boolean;
}

export const Gradebook: React.FC<GradebookProps> = ({
  grades,
  onSelectGrade,
  onEditGrade,
  searchQuery,
  onSearchChange,
  selectedCourse,
  onCourseChange,
  selectedStatus,
  onStatusChange,
  isLoading = false,
}) => {
  const coursesList = Array.from(new Set(grades.map((g) => g.courseCode))).sort();

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search student, course code, or assignment title..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Course dropdown */}
          <div className="shrink-0">
            <select
              value={selectedCourse}
              onChange={(e) => onCourseChange(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Master Courses</option>
              {coursesList.map((c) => (
                <option key={c} value={c}>
                  Course: {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status dropdown */}
          <div className="shrink-0">
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Lifecycle Stages</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="GRADED">GRADED</option>
              <option value="MODERATION">MODERATION</option>
              <option value="RELEASED">RELEASED</option>
              <option value="LOCKED">LOCKED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Gradebook Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3">Student Name</th>
                <th className="p-3">Course</th>
                <th className="p-3">Assignment Title</th>
                <th className="p-3">Score</th>
                <th className="p-3">% Score</th>
                <th className="p-3">Standing</th>
                <th className="p-3">Lifecycle Stage</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {grades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    No grade records matching the selected filters.
                  </td>
                </tr>
              ) : (
                grades.map((grade) => {
                  const id = grade.submissionId || grade.id;
                  const pct =
                    grade.percentage ??
                    (grade.maxPoints > 0 ? Math.round((grade.score / grade.maxPoints) * 100) : 0);
                  const cat = calculateGradeCategory(pct);

                  return (
                    <tr
                      key={id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                        {grade.studentName}
                        {grade.studentNumber && (
                          <span className="ml-1.5 text-[10px] text-slate-400 font-mono font-normal">
                            ({grade.studentNumber})
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {grade.courseCode}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 font-medium max-w-[200px] truncate">
                        {grade.assignmentTitle}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {grade.score}{' '}
                        <span className="text-slate-400 font-normal">/ {grade.maxPoints}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {pct}%
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-xs ${
                            cat === 'Honor Roll'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : cat === 'Satisfactory'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                          }`}
                        >
                          {cat}
                        </span>
                      </td>
                      <td className="p-3">
                        <GradeStatusBadge status={grade.status} size="sm" />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectGrade(grade)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            title="View Grade Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {onEditGrade && (
                            <button
                              onClick={() => onEditGrade(grade)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                              title="Grade or Edit Score"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
