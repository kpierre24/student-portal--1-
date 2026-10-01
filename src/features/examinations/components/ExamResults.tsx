import React, { useState } from 'react';
import { 
  Award, 
  Search, 
  Filter, 
  Download, 
  Sliders, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ArrowUpDown,
  GraduationCap
} from 'lucide-react';
import { StudentScoreRecord } from '../types';
import { UserRole } from '../../../lib/userAuth';
import { formatGradePercentage } from '../../../lib/securityHelper';

interface ExamResultsProps {
  students: StudentScoreRecord[];
  rubricScores: Record<string, { participation: number; scripture: number; assignment: number }>;
  onUpdateRubric?: (studentName: string, key: 'participation' | 'scripture' | 'assignment', val: number) => void;
  userRole?: UserRole;
  currentStudentName?: string;
  onExportCSV?: () => void;
}

export const ExamResults: React.FC<ExamResultsProps> = ({
  students,
  rubricScores,
  onUpdateRubric,
  userRole = 'admin',
  currentStudentName,
  onExportCSV
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<'ALL' | 'HONOR' | 'SATISFACTORY' | 'AT_RISK'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'attendance'>('score');
  const [sortAsc, setSortAsc] = useState(false);

  const isStudent = userRole === 'student';

  const visibleStudents = students.filter((s) => {
    if (isStudent && currentStudentName) {
      return (s.name || '').toLowerCase().trim() === currentStudentName.toLowerCase().trim();
    }
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const pct = s.percentage ?? 0;
    let matchesTier = true;
    if (filterTier === 'HONOR') matchesTier = pct >= 85;
    if (filterTier === 'SATISFACTORY') matchesTier = pct >= 75 && pct < 85;
    if (filterTier === 'AT_RISK') matchesTier = pct < 75;
    return matchesSearch && matchesTier;
  }).sort((a, b) => {
    let diff = 0;
    if (sortBy === 'name') {
      diff = a.name.localeCompare(b.name);
    } else if (sortBy === 'score') {
      diff = (b.percentage ?? -1) - (a.percentage ?? -1);
    } else if (sortBy === 'attendance') {
      diff = b.attendanceRate - a.attendanceRate;
    }
    return sortAsc ? -diff : diff;
  });

  const honorRollCount = students.filter((s) => (s.percentage ?? 0) >= 85).length;
  const averageScore = students.reduce((acc, s) => acc + (s.percentage ?? 0), 0) / (students.length || 1);

  return (
    <div className="space-y-6">
      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Honor Roll Distinction</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{honorRollCount} Students (≥85%)</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Class Average Score</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{Math.round(averageScore)}%</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Evaluated Roster</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{students.length} Enrolled</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {!isStudent && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student grades..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value as any)}
              aria-label="Filter students by academic tier"
              className="px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Academic Tiers</option>
              <option value="HONOR">Honor Roll (≥85%)</option>
              <option value="SATISFACTORY">Satisfactory (75-84%)</option>
              <option value="AT_RISK">At-Risk (&lt;75%)</option>
            </select>

            {onExportCSV && (
              <button
                onClick={onExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
                title="Export Academic CSV"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th 
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white"
                  onClick={() => {
                    if (sortBy === 'name') setSortAsc(!sortAsc);
                    else { setSortBy('name'); setSortAsc(true); }
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>Student Name</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center cursor-pointer select-none hover:text-slate-900 dark:hover:text-white"
                  onClick={() => {
                    if (sortBy === 'score') setSortAsc(!sortAsc);
                    else { setSortBy('score'); setSortAsc(false); }
                  }}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Exam & Quiz Score</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-center cursor-pointer select-none hover:text-slate-900 dark:hover:text-white"
                  onClick={() => {
                    if (sortBy === 'attendance') setSortAsc(!sortAsc);
                    else { setSortBy('attendance'); setSortAsc(false); }
                  }}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Attendance Rate</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                {!isStudent && <th className="px-4 py-3 text-center">Rubrics (Part. / Scrip. / Asg.)</th>}
                <th className="px-4 py-3 text-right">Academic Standing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleStudents.map((s, sIdx) => {
                const pct = s.percentage ?? 0;
                const isHonor = pct >= 85;
                const isSatisfactory = pct >= 75 && pct < 85;
                const studentRubric = rubricScores[s.name] || { participation: 10, scripture: 10, assignment: 10 };

                return (
                  <tr key={`exam-res-${s.name}-${sIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${isHonor ? 'text-amber-600 dark:text-amber-400' : isSatisfactory ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {s.percentage !== null ? `${Math.round(s.percentage)}%` : formatGradePercentage(s.scoreStr, 'N/A')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      <span className={s.attendanceRate >= 75 ? 'text-slate-700 dark:text-slate-300' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                        {s.attendanceRate}% ({s.attendedSessions}/{s.totalSessions})
                      </span>
                    </td>
                    {!isStudent && (
                      <td className="px-4 py-3 text-center">
                        {onUpdateRubric ? (
                          <div className="inline-flex items-center gap-1 text-xs">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={studentRubric.participation}
                              onChange={(e) => onUpdateRubric(s.name, 'participation', Number(e.target.value))}
                              aria-label={`Participation score for ${s.name}`}
                              className="w-10 text-center py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                              title="Participation (0-10)"
                            />
                            <span className="text-slate-400">/</span>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={studentRubric.scripture}
                              onChange={(e) => onUpdateRubric(s.name, 'scripture', Number(e.target.value))}
                              aria-label={`Scripture recitation score for ${s.name}`}
                              className="w-10 text-center py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                              title="Scripture (0-10)"
                            />
                            <span className="text-slate-400">/</span>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={studentRubric.assignment}
                              onChange={(e) => onUpdateRubric(s.name, 'assignment', Number(e.target.value))}
                              aria-label={`Assignment score for ${s.name}`}
                              className="w-10 text-center py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                              title="Assignment (0-10)"
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-mono">{studentRubric.participation} / {studentRubric.scripture} / {studentRubric.assignment}</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      {isHonor ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                          <Award className="w-3.5 h-3.5" />
                          High Distinction
                        </span>
                      ) : isSatisfactory ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Satisfactory
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Academic Review
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
