import React from 'react';
import {
  Search,
  Filter,
  FileText,
  Paperclip,
  CheckCircle2,
  Clock,
  Award,
  Download,
  Trash2,
  Edit3,
  MessageSquare,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { AssignmentSubmission, CustomAssignment } from '../../../types';
import { SubmissionStatusFilter } from '../types';

interface SubmissionListProps {
  submissions: AssignmentSubmission[];
  assignments?: CustomAssignment[];
  selectedAssignment?: CustomAssignment | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: SubmissionStatusFilter;
  onStatusFilterChange: (s: SubmissionStatusFilter) => void;
  onSelectSubmission: (submission: AssignmentSubmission) => void;
  onDeleteSubmission?: (id: string) => void;
  onCloseAssignmentFilter?: () => void;
}

export const SubmissionList: React.FC<SubmissionListProps> = ({
  submissions,
  assignments = [],
  selectedAssignment,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onSelectSubmission,
  onDeleteSubmission,
  onCloseAssignmentFilter,
}) => {
  return (
    <div className="space-y-4">
      {/* Filter Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search submissions by student name or notes..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {selectedAssignment && onCloseAssignmentFilter && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300 shrink-0">
              <span>Assignment: {selectedAssignment.title}</span>
              <button
                onClick={onCloseAssignmentFilter}
                className="text-indigo-500 hover:text-indigo-800 dark:hover:text-indigo-200 font-bold"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as SubmissionStatusFilter)}
              className="text-xs bg-transparent border-none text-slate-700 dark:text-slate-300 font-medium focus:ring-0 outline-none pr-2 cursor-pointer"
            >
              <option value="all">All Submission Statuses</option>
              <option value="submitted">Submitted (Pending Grade)</option>
              <option value="graded">Graded</option>
              <option value="correction_returned">Correction Returned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions List Table */}
      {submissions.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
            No submissions found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQuery
              ? 'No student submissions matched your search parameters.'
              : 'There are no student submissions recorded for this selection.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Assignment</th>
                <th className="px-4 py-3">Submitted At</th>
                <th className="px-4 py-3">Attachments / Response</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {submissions.map((sub) => {
                const matchedAsg = assignments.find((a) => a.id === sub.assignmentId) || selectedAssignment;
                const studentNameStr = sub.studentName || sub.student?.name || 'Unknown Student';
                const statusLower = (sub.status || '').toLowerCase();
                const isGraded = statusLower.includes('grad') || statusLower.includes('correct');

                return (
                  <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Student Name */}
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {studentNameStr}
                    </td>

                    {/* Assignment Title */}
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                      {matchedAsg?.title || `ID: ${sub.assignmentId}`}
                    </td>

                    {/* Submitted At */}
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '—'}
                    </td>

                    {/* Attachments / Files */}
                    <td className="px-4 py-3">
                      {sub.studentFileUrl || sub.studentFileName ? (
                        <a
                          href={sub.studentFileUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                        >
                          <Paperclip className="w-3 h-3 text-indigo-500" />
                          <span className="truncate max-w-[120px]">{sub.studentFileName || 'File'}</span>
                        </a>
                      ) : sub.studentTypedResponse ? (
                        <span className="text-slate-500 italic">Typed Response</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {isGraded ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{sub.status || 'Graded'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                          <Clock className="w-3 h-3" />
                          <span>Pending Review</span>
                        </span>
                      )}
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3 font-semibold">
                      {typeof sub.score === 'number' ? (
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {sub.score} / {matchedAsg?.maxPoints || 100}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => onSelectSubmission(sub)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{isGraded ? 'Review Grade' : 'Grade Work'}</span>
                      </button>

                      {onDeleteSubmission && (
                        <button
                          onClick={() => onDeleteSubmission(sub.id)}
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete Submission"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
