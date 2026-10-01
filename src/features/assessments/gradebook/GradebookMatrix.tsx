import React, { useState } from 'react';
import { Award, Search, Download, Filter, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AssignmentSubmission, StudentRecord, CustomAssignment } from '../../../types';

export interface GradebookMatrixProps {
  students: StudentRecord[];
  assignments: CustomAssignment[];
  submissions: AssignmentSubmission[];
}

export const GradebookMatrix: React.FC<GradebookMatrixProps> = ({
  students,
  assignments,
  submissions
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs space-y-3 p-4">
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gradebook by student name..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <span className="text-xs font-mono font-bold text-slate-500">
          Showing {filteredStudents.length} Students across {assignments.length} Tasks
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-extrabold uppercase">
            <tr>
              <th className="p-3 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-700">Student Name</th>
              {assignments.map(asg => (
                <th key={asg.id} className="p-3 font-mono font-bold whitespace-nowrap min-w-[120px]">
                  {asg.courseCode}: {asg.title.slice(0, 15)}... ({asg.maxPoints}p)
                </th>
              ))}
              <th className="p-3 font-mono text-purple-600">Avg %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium text-slate-800 dark:text-slate-200">
            {filteredStudents.slice(0, 25).map((student, sIdx) => {
              let totalEarned = 0;
              let totalPossible = 0;

              return (
                <tr key={student.id ? `${student.id}-${sIdx}` : `std-gb-${sIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="p-3 font-bold sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700">
                    {student.name}
                  </td>
                  {assignments.map(asg => {
                    const sub = submissions.find(s => 
                      s.assignmentId === asg.id && 
                      (s.studentName || '').toLowerCase().trim() === student.name.toLowerCase().trim()
                    );
                    if (sub && sub.score !== undefined) {
                      totalEarned += sub.score;
                      totalPossible += asg.maxPoints || 100;
                    }

                    return (
                      <td key={asg.id} className="p-3 font-mono">
                        {sub && sub.score !== undefined ? (
                          <span className={`px-2 py-0.5 rounded-md font-bold ${
                            (sub.score / (asg.maxPoints || 100)) >= 0.75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {sub.score}/{asg.maxPoints}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="p-3 font-mono font-black text-purple-600">
                    {totalPossible > 0 ? `${Math.round((totalEarned / totalPossible) * 100)}%` : 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
