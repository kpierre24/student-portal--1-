import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  RefreshCw, 
  Trophy, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  FileSpreadsheet, 
  Users 
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StudentSummary, CustomAssignment, AssignmentSubmission } from '../../../types';
import { ExamQuizScoreMatrix } from '../gradebook/ExamQuizScoreMatrix';

export interface GradebookProps {
  students: StudentSummary[];
  assignments?: CustomAssignment[];
  submissions?: AssignmentSubmission[];
  allQuizSheets?: string[];
  records?: any[];
  effectiveClassDays?: any[];
  rubricScores?: Record<string, { participation: number; scripture: number; assignment: number }>;
  onUpdateRubric?: (studentName: string, key: 'participation' | 'scripture' | 'assignment', val: number) => void;
  onSelectStudent?: (student: StudentSummary) => void;
  onSyncGoogleSheets?: () => void;
  isLoadingSheets?: boolean;
  initialViewMode?: 'roster' | 'matrix';
  className?: string;
  onGradeSubmission?: (submissionId: string, score: number, feedback: string) => void;
}

export const Gradebook: React.FC<GradebookProps> = ({
  students = [],
  assignments = [],
  submissions = [],
  allQuizSheets = [],
  records = [],
  effectiveClassDays = [],
  rubricScores = {},
  onUpdateRubric,
  onSelectStudent,
  onSyncGoogleSheets,
  isLoadingSheets = false,
  initialViewMode = 'roster',
  className = '',
  onGradeSubmission,
}) => {
  const [viewMode, setViewMode] = useState<'roster' | 'matrix'>(initialViewMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [standingFilter, setStandingFilter] = useState<'all' | 'active' | 'dropped_out' | 'distinction' | 'satisfactory' | 'at-risk'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase().trim());
      if (!matchSearch) return false;

      const isDropped = s.isDroppedOut || s.enrollmentStatus === 'dropped_out' || s.enrollmentStatus === 'withdrawn';
      if (standingFilter === 'active') return !isDropped;
      if (standingFilter === 'dropped_out') return isDropped;

      const score = s.avgScore !== null && s.avgScore !== undefined ? s.avgScore : 0;
      if (standingFilter === 'distinction') return !isDropped && score >= 85;
      if (standingFilter === 'satisfactory') return !isDropped && score >= 75 && score < 85;
      if (standingFilter === 'at-risk') return !isDropped && (score < 75 || s.rate < 75);
      return true;
    });
  }, [students, searchTerm, standingFilter]);

  const handleExportCsv = () => {
    const headers = ['Student Name', 'Attendance Rate (%)', 'Average Score (%)', 'Academic Standing'];
    const rows = filteredStudents.map((s) => {
      const score = s.avgScore !== null && s.avgScore !== undefined ? Math.round(s.avgScore) : 'N/A';
      const standing = typeof score === 'number' && score >= 85 ? 'High Distinction' : typeof score === 'number' && score >= 75 ? 'Satisfactory' : 'At-Risk';
      return [
        `"${s.name}"`,
        `"${s.rate}%"`,
        `"${score}"`,
        `"${standing}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HTEIM_Gradebook_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSync = () => {
    if (!onSyncGoogleSheets) return;
    setIsSyncing(true);
    onSyncGoogleSheets();
    setTimeout(() => setIsSyncing(false), 1200);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Front Tab View Switcher: Summary Roster vs Exam, Quiz & Written Assignment Score Matrix */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Toggle between Summary Roster and Score Matrix */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setViewMode('roster')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'roster'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>Summary Roster</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'matrix'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Score Matrix</span>
          </button>
        </div>

        {/* Quick Sync & Export */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {onSyncGoogleSheets && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={isSyncing || isLoadingSheets}
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isSyncing || isLoadingSheets ? 'animate-spin' : ''}`} />}
              className="text-xs"
            >
              Sync Sheets
            </Button>
          )}

          {viewMode === 'roster' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              leftIcon={<Download className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Render Score Matrix View */}
      {viewMode === 'matrix' ? (
        <ExamQuizScoreMatrix
          students={students}
          assignments={assignments}
          submissions={submissions}
          allQuizSheets={allQuizSheets}
          records={records}
          effectiveClassDays={effectiveClassDays}
          rubricScores={rubricScores}
          onUpdateRubric={onUpdateRubric}
          onGradeSubmission={onGradeSubmission}
          onSyncGoogleSheets={onSyncGoogleSheets}
          isLoadingSheets={isLoadingSheets || isSyncing}
        />
      ) : (
        /* Render Standard Summary Roster Table */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search student grade records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            {/* Filter Segmented Buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setStandingFilter('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  standingFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setStandingFilter('active')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  standingFilter === 'active'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Active ({students.filter(s => !s.isDroppedOut && s.enrollmentStatus !== 'dropped_out' && s.enrollmentStatus !== 'withdrawn').length})
              </button>
              <button
                type="button"
                onClick={() => setStandingFilter('dropped_out')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  standingFilter === 'dropped_out'
                    ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Dropped Out ({students.filter(s => s.isDroppedOut || s.enrollmentStatus === 'dropped_out' || s.enrollmentStatus === 'withdrawn').length})
              </button>
              <button
                type="button"
                onClick={() => setStandingFilter('distinction')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  standingFilter === 'distinction'
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Honor (≥85%)
              </button>
              <button
                type="button"
                onClick={() => setStandingFilter('satisfactory')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  standingFilter === 'satisfactory'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Satisfactory
              </button>
              <button
                type="button"
                onClick={() => setStandingFilter('at-risk')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  standingFilter === 'at-risk'
                    ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                At-Risk (&lt;75%)
              </button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3 text-center">Attendance</th>
                  <th className="px-4 py-3 text-center">Average Score</th>
                  <th className="px-4 py-3">Standing</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                      No matching student records found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const isDropped = student.isDroppedOut || student.enrollmentStatus === 'dropped_out' || student.enrollmentStatus === 'withdrawn';
                    const avgScore = student.avgScore !== null && student.avgScore !== undefined ? Math.round(student.avgScore) : null;
                    const isHonor = !isDropped && avgScore !== null && avgScore >= 85;
                    const isPassing = !isDropped && avgScore !== null && avgScore >= 75;
                    const isAttendanceLow = !isDropped && student.rate < 75;

                    return (
                      <tr
                        key={student.id ? `std-${student.id}-${idx}` : `std-${idx}`}
                        className={`hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40 ${isDropped ? 'opacity-80 bg-slate-50/40 dark:bg-slate-900/40' : ''}`}
                      >
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <span className={isDropped ? 'text-slate-500 line-through' : ''}>{student.name}</span>
                            {isDropped && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                Dropped Out
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center font-medium">
                          {isDropped ? (
                            <span className="text-slate-400 font-mono text-[11px]">{student.rate}% (Inactive)</span>
                          ) : (
                            <span className={isAttendanceLow ? 'font-bold text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}>
                              {student.rate}%
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center font-bold">
                          {isDropped ? (
                            <span className="text-slate-400 font-mono text-[11px]">{avgScore !== null ? `${avgScore}% (Archived)` : '—'}</span>
                          ) : avgScore !== null ? (
                            <span className={isHonor ? 'text-amber-600 dark:text-amber-400' : isPassing ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                              {avgScore}%
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {isDropped ? (
                            <span className="text-rose-700 dark:text-rose-400 font-bold inline-flex items-center gap-1 text-[11px] bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                              <AlertTriangle className="w-3.5 h-3.5" /> Dropped Out
                            </span>
                          ) : isHonor ? (
                            <span className="text-amber-700 dark:text-amber-400 font-bold inline-flex items-center gap-1 text-[11px]">
                              <Trophy className="w-3.5 h-3.5" /> High Distinction
                            </span>
                          ) : isPassing ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold inline-flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Satisfactory
                            </span>
                          ) : (
                            <span className="text-rose-700 dark:text-rose-400 font-bold inline-flex items-center gap-1 text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5" /> At-Risk (&lt;75%)
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {onSelectStudent && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onSelectStudent(student)}
                              className="text-xs py-1 h-7"
                            >
                              View Record
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
