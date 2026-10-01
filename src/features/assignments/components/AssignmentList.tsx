import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Award,
  BookOpen,
  FileText,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  Eye,
  Upload,
  LayoutGrid,
  List as ListIcon,
  Paperclip,
  Users,
} from 'lucide-react';
import { CustomAssignment, AssignmentSubmission } from '../../../types';
import { AssignmentStatusFilter } from '../types';
import { isAssignmentOverdue, getStudentSubmission } from '../services/assignmentsService';

interface AssignmentListProps {
  assignments: CustomAssignment[];
  submissions?: AssignmentSubmission[];
  userRole?: 'admin' | 'teacher' | 'student' | string;
  studentName?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: AssignmentStatusFilter;
  onStatusFilterChange: (s: AssignmentStatusFilter) => void;
  onSelectAssignment: (asg: CustomAssignment) => void;
  onCreateNew?: () => void;
  onEditAssignment?: (asg: CustomAssignment) => void;
  onDeleteAssignment?: (id: string) => void;
  onOpenSubmissions?: (asg: CustomAssignment) => void;
  onOpenStudentSubmit?: (asg: CustomAssignment) => void;
}

export const AssignmentList: React.FC<AssignmentListProps> = ({
  assignments,
  submissions = [],
  userRole = 'admin',
  studentName = '',
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onSelectAssignment,
  onCreateNew,
  onEditAssignment,
  onDeleteAssignment,
  onOpenSubmissions,
  onOpenStudentSubmit,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const isTeacherOrAdmin = userRole === 'admin' || userRole === 'teacher' || userRole === 'lecturer';

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search assignments by title, code, or topic..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as AssignmentStatusFilter)}
              className="text-xs bg-transparent border-none text-slate-700 dark:text-slate-300 font-medium focus:ring-0 outline-none pr-2 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
              <option value="active">Active</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1 rounded ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Create Assignment Button (Teachers / Admins) */}
          {isTeacherOrAdmin && onCreateNew && (
            <button
              onClick={onCreateNew}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assignment</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {assignments.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
            No assignments found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
            {searchQuery
              ? 'No assignments match your search query. Try clearing filters.'
              : 'There are no active coursework assignments matching the current view.'}
          </p>
          {isTeacherOrAdmin && onCreateNew && (
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Assignment</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((asg) => {
            const isOverdue = isAssignmentOverdue(asg.dueDate);
            const studentSub = studentName ? getStudentSubmission(asg.id, studentName, submissions) : null;
            const isSubmitted = !!studentSub;
            const isGraded = studentSub && (studentSub.status?.toLowerCase().includes('grad') || studentSub.status?.toLowerCase().includes('correct'));

            return (
              <div
                key={asg.id}
                className="flex flex-col justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all p-4 shadow-2xs group"
              >
                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                        {asg.courseCode || 'GENERAL'}
                      </span>
                      {asg.type === 'quiz' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                          Quiz
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                          Essay / Written
                        </span>
                      )}
                      {asg.isGroupAssignment && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Group ({asg.groups?.length || 0})
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    {isTeacherOrAdmin ? (
                      asg.published === false || asg.isDraft ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                          Draft
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                          Published
                        </span>
                      )
                    ) : isGraded ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                        Graded: {studentSub?.score}/{asg.maxPoints}
                      </span>
                    ) : isSubmitted ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                        Submitted
                      </span>
                    ) : isOverdue ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-800/50">
                        Overdue
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Pending
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4
                    onClick={() => onSelectAssignment(asg)}
                    className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 cursor-pointer transition-colors line-clamp-2 mb-2"
                  >
                    {asg.title}
                  </h4>

                  {/* Guidelines excerpt */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {asg.description}
                  </p>
                </div>

                {/* Footer Info & Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Due: {asg.dueDate}</span>
                    </div>
                    <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{asg.maxPoints} pts</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => onSelectAssignment(asg)}
                      className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {!isTeacherOrAdmin && onOpenStudentSubmit && (
                        <button
                          onClick={() => onOpenStudentSubmit(asg)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isSubmitted ? 'Resubmit' : 'Submit Work'}</span>
                        </button>
                      )}

                      {isTeacherOrAdmin && onOpenSubmissions && (
                        <button
                          onClick={() => onOpenSubmissions(asg)}
                          className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          Submissions
                        </button>
                      )}

                      {isTeacherOrAdmin && onEditAssignment && (
                        <button
                          onClick={() => onEditAssignment(asg)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isTeacherOrAdmin && onDeleteAssignment && (
                        <button
                          onClick={() => onDeleteAssignment(asg.id)}
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Layout */
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Assignment Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Max Pts</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {assignments.map((asg) => {
                const isOverdue = isAssignmentOverdue(asg.dueDate);
                const studentSub = studentName ? getStudentSubmission(asg.id, studentName, submissions) : null;
                const isSubmitted = !!studentSub;

                return (
                  <tr key={asg.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{asg.courseCode || 'GEN'}</td>
                    <td
                      onClick={() => onSelectAssignment(asg)}
                      className="px-4 py-3 font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {asg.title}
                    </td>
                    <td className="px-4 py-3 capitalize">{asg.type || 'document'}</td>
                    <td className="px-4 py-3">{asg.dueDate}</td>
                    <td className="px-4 py-3 font-semibold">{asg.maxPoints}</td>
                    <td className="px-4 py-3">
                      {isTeacherOrAdmin ? (
                        asg.published === false ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">Draft</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Published</span>
                        )
                      ) : isSubmitted ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Submitted</span>
                      ) : isOverdue ? (
                        <span className="text-red-600 dark:text-red-400 font-semibold">Overdue</span>
                      ) : (
                        <span className="text-slate-500 font-medium">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => onSelectAssignment(asg)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                      >
                        View
                      </button>
                      {isTeacherOrAdmin && onOpenSubmissions && (
                        <button
                          onClick={() => onOpenSubmissions(asg)}
                          className="text-slate-600 dark:text-slate-300 hover:underline"
                        >
                          Submissions
                        </button>
                      )}
                      {isTeacherOrAdmin && onEditAssignment && (
                        <button
                          onClick={() => onEditAssignment(asg)}
                          className="text-purple-600 hover:underline font-semibold"
                        >
                          Edit
                        </button>
                      )}
                      {isTeacherOrAdmin && onDeleteAssignment && (
                        <button
                          onClick={() => onDeleteAssignment(asg.id)}
                          className="text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
