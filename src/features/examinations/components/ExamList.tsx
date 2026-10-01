import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Eye, 
  Edit3, 
  Trash2, 
  UploadCloud,
  FileCheck,
  BrainCircuit,
  LayoutGrid,
  List
} from 'lucide-react';
import { CustomAssignment, AssignmentSubmission } from '../../../types';
import { UserRole } from '../../../lib/userAuth';
import { EmptyState } from '../../../components/UXPrimitives';

interface ExamListProps {
  assignments: CustomAssignment[];
  submissions: AssignmentSubmission[];
  userRole?: UserRole;
  currentStudentName?: string;
  onNewAssignment?: () => void;
  onEditAssignment?: (asg: CustomAssignment) => void;
  onDeleteAssignment?: (id: string) => void;
  onSelectAssignment?: (asg: CustomAssignment) => void;
  onSubmitWork?: (asg: CustomAssignment) => void;
  onStartQuiz?: (asg: CustomAssignment) => void;
  onViewSubmissions?: (asg: CustomAssignment) => void;
}

export const ExamList: React.FC<ExamListProps> = ({
  assignments,
  submissions,
  userRole = 'admin',
  currentStudentName,
  onNewAssignment,
  onEditAssignment,
  onDeleteAssignment,
  onSelectAssignment,
  onSubmitWork,
  onStartQuiz,
  onViewSubmissions
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [trackFilter, setTrackFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const isStudent = userRole === 'student';
  const isTeacherOrAdmin = userRole === 'admin' || userRole === 'teacher';

  const filteredAssignments = assignments.filter((asg) => {
    const matchesSearch = 
      asg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asg.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asg.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTrack = trackFilter === 'ALL' || asg.moduleTrack === trackFilter;
    return matchesSearch && matchesTrack;
  });

  const getStudentSubmission = (assignmentId: string) => {
    if (!currentStudentName) return null;
    return submissions.find(
      (s) => s.assignmentId === assignmentId && 
      (s.studentName || '').toLowerCase().trim() === currentStudentName.toLowerCase().trim()
    );
  };

  const tracks = Array.from(new Set(assignments.map((a) => a.moduleTrack).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search assignments, curriculum modules..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              aria-label="Filter assignments by module track"
              className="px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Modules</option>
              {tracks.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {isTeacherOrAdmin && onNewAssignment && (
            <button
              onClick={onNewAssignment}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              New Assignment
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <EmptyState
            title="No Assignments Found"
            description={searchTerm || trackFilter !== 'ALL' ? "No coursework matches the active filters." : "Assignments and exam questions will appear here once published."}
            icon={<BookOpen className="w-6 h-6" />}
          />
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssignments.map((asg) => {
            const studentSub = isStudent ? getStudentSubmission(asg.id) : null;
            const subCount = submissions.filter((s) => s.assignmentId === asg.id).length;
            const isQuiz = asg.type === 'quiz';

            return (
              <div
                key={asg.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-600 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {asg.courseCode}
                    </span>
                    {isQuiz && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <BrainCircuit className="w-3 h-3" />
                        Quiz
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 transition-colors line-clamp-1">
                      {asg.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {asg.description || 'No additional instructions provided.'}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Due: <strong className="text-slate-700 dark:text-slate-200">{asg.dueDate}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Max Points: <strong className="text-slate-700 dark:text-slate-200">{asg.maxPoints} pts</strong></span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {isStudent ? (
                    studentSub ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          {studentSub.status === 'Graded' ? `Graded (${studentSub.score}/${asg.maxPoints})` : 'Submitted'}
                        </span>
                        <button
                          onClick={() => onSelectAssignment?.(asg)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          View Feedback
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => isQuiz ? onStartQuiz?.(asg) : onSubmitWork?.(asg)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        {isQuiz ? 'Take Quiz' : 'Submit Assignment'}
                      </button>
                    )
                  ) : (
                    <>
                      <button
                        onClick={() => onViewSubmissions?.(asg)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                        {subCount} Submissions
                      </button>

                      <div className="flex items-center gap-1">
                        {onEditAssignment && (
                          <button
                            onClick={() => onEditAssignment(asg)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit Assignment"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteAssignment && (
                          <button
                            onClick={() => onDeleteAssignment(asg.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Delete Assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Course / Title</th>
                <th className="px-4 py-3">Module Track</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-center">Points</th>
                <th className="px-4 py-3 text-center">{isStudent ? 'Status' : 'Submissions'}</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAssignments.map((asg) => {
                const studentSub = isStudent ? getStudentSubmission(asg.id) : null;
                const subCount = submissions.filter((s) => s.assignmentId === asg.id).length;

                return (
                  <tr key={asg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {asg.courseCode}
                        </span>
                        <span>{asg.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{asg.moduleTrack}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{asg.dueDate}</td>
                    <td className="px-4 py-3 text-xs text-center font-bold text-slate-700 dark:text-slate-300">{asg.maxPoints} pts</td>
                    <td className="px-4 py-3 text-center text-xs">
                      {isStudent ? (
                        studentSub ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {studentSub.status === 'Graded' ? `${studentSub.score}/${asg.maxPoints}` : 'Submitted'}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">Pending</span>
                        )
                      ) : (
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{subCount}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {isStudent ? (
                        <button
                          onClick={() => asg.type === 'quiz' ? onStartQuiz?.(asg) : onSubmitWork?.(asg)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                        >
                          {studentSub ? 'Review' : 'Open'}
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          {onViewSubmissions && (
                            <button
                              onClick={() => onViewSubmissions(asg)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="View Submissions"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {onEditAssignment && (
                            <button
                              onClick={() => onEditAssignment(asg)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                              title="Edit Assignment"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
