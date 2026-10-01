import React, { useState } from 'react';
import { Calendar, Plus, CheckCircle2, Clock, Sparkles, BookOpen, ChevronRight, Layers } from 'lucide-react';
import { AcademicYear, Term, CourseOffering } from '../../types/academicEngine';
import { UserRole } from '../../lib/userAuth';

interface AcademicCalendarViewProps {
  academicYears: AcademicYear[];
  terms: Term[];
  courseOfferings: CourseOffering[];
  activeTermId: string;
  onSelectTerm: (termId: string) => void;
  onAddYear?: () => void;
  onAddTerm?: () => void;
  userRole?: UserRole;
}

export const AcademicCalendarView: React.FC<AcademicCalendarViewProps> = ({
  academicYears,
  terms,
  courseOfferings,
  activeTermId,
  onSelectTerm,
  onAddYear,
  onAddTerm,
  userRole = 'admin'
}) => {
  const isTeacherOrAdmin = userRole === 'admin' || userRole === 'teacher';

  return (
    <div className="space-y-6">
      
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Academic Calendar & Term Structure
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organizes curriculum delivery across institutional Academic Years and Semesters.
          </p>
        </div>

        {isTeacherOrAdmin && (
          <div className="flex items-center gap-2">
            {onAddYear && (
              <button
                onClick={onAddYear}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
              >
                <Plus className="w-3.5 h-3.5" />
                New Academic Year
              </button>
            )}
            {onAddTerm && (
              <button
                onClick={onAddTerm}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                New Semester / Term
              </button>
            )}
          </div>
        )}
      </div>

      {/* Academic Years List */}
      <div className="space-y-6">
        {academicYears.map(year => {
          const yearTerms = terms.filter(t => t.academicYearId === year.id);

          return (
            <div
              key={year.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5"
            >
              {/* Year Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      {year.code}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      year.status === 'active'
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {year.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {year.name}
                  </h3>
                  {year.theme && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 italic">
                      "{year.theme}"
                    </p>
                  )}
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  {year.startDate} &mdash; {year.endDate}
                </div>
              </div>

              {/* Semesters / Terms Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Semesters & Terms within this Academic Year
                </h4>

                {yearTerms.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    No terms configured for this academic year yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {yearTerms.map(term => {
                      const termOfferings = courseOfferings.filter(o => o.termId === term.id);
                      const isCurrent = term.id === activeTermId;

                      return (
                        <div
                          key={term.id}
                          onClick={() => onSelectTerm(term.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            isCurrent
                              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                  {term.code}
                                </span>
                                {isCurrent && (
                                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                                    Current View
                                  </span>
                                )}
                              </div>
                              <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-1">
                                {term.name}
                              </h5>
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {term.weeksCount} Weeks
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{term.startDate} to {term.endDate}</span>
                          </div>

                          {/* Dynamic Active Term iCal Export options */}
                          {termOfferings.length > 0 && (
                            <div className="mt-3 space-y-2 border-t border-slate-150 dark:border-slate-800/80 pt-2.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Direct Calendar Sync
                              </span>
                              <div className="flex flex-col gap-1.5">
                                {termOfferings.map(offering => {
                                  const handleDownloadICS = (e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    const cleanTitle = offering.courseTitle.replace(/[^a-zA-Z0-9 ]/g, '');
                                    const cleanDesc = `Class lecture for ${cleanTitle} led by ${offering.lecturer.name}. Zoom: ${offering.zoomLink}`;
                                    const icsString = [
                                      'BEGIN:VCALENDAR',
                                      'VERSION:2.0',
                                      'PRODID:-//HTEIM School of Ministry//NONSGML v1.0//EN',
                                      'BEGIN:VEVENT',
                                      `UID:${offering.id}`,
                                      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                                      'DTSTART:20260113T190000',
                                      'DTEND:20260113T210000',
                                      'RRULE:FREQ=WEEKLY;COUNT=14',
                                      `SUMMARY:${cleanTitle}`,
                                      `DESCRIPTION:${cleanDesc}`,
                                      `LOCATION:${offering.location || 'Online & Sanctuary'}`,
                                      'END:VEVENT',
                                      'END:VCALENDAR'
                                    ].join('\r\n');

                                    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `${offering.courseCode}_Calendar_Sync.ics`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  };

                                  return (
                                    <button
                                      key={offering.id}
                                      type="button"
                                      onClick={handleDownloadICS}
                                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                                      title={`Export iCal file for ${offering.courseTitle}`}
                                    >
                                      <span className="truncate max-w-[150px]">{offering.courseCode} ({offering.lecturer.name.split(' ').pop()})</span>
                                      <span className="text-indigo-600 dark:text-indigo-400 hover:underline">Sync Device</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {termOfferings.length} Course Offerings
                            </span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                              View Offerings <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
