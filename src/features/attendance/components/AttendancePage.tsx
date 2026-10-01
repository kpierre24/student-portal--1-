import React, { useState } from 'react';
import { Search, Filter, CalendarCheck, RotateCcw, Zap } from 'lucide-react';
import { AttendanceSummary } from './AttendanceSummary';
import { AttendanceSession } from './AttendanceSession';
import { AttendanceTable } from './AttendanceTable';
import { AttendanceForm } from './AttendanceForm';
import { SpeedCheckInModal } from '../../../components/SpeedCheckInModal';
import { useAttendance } from '../hooks/useAttendance';
import { useAttendanceMutations } from '../hooks/useAttendanceMutations';
import { StudentSummary, ClassDay } from '../../../types';
import { AttendanceStatusFilter, AttendanceFormData } from '../types';

export interface AttendancePageProps {
  initialStudents?: StudentSummary[];
  initialClassDays?: ClassDay[];
  excusedAbsences?: Record<string, Record<string, boolean>>;
  onStudentsChange?: (updatedStudents: StudentSummary[]) => void;
  onClassDaysChange?: (updatedClassDays: ClassDay[]) => void;
  onToggleAttendance?: (
    studentName: string,
    classDayId: string,
    newStatus: 'present' | 'absent' | 'excused'
  ) => void;
  className?: string;
}

export function AttendancePage({
  initialStudents = [],
  initialClassDays = [],
  excusedAbsences = {},
  onStudentsChange,
  onClassDaysChange,
  onToggleAttendance,
  className = '',
}: AttendancePageProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSpeedCheckInOpen, setIsSpeedCheckInOpen] = useState(false);

  const {
    students,
    classDays,
    selectedClassDayId,
    setSelectedClassDayId,
    selectedClassDay,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    currentSessionStats,
    overallStats,
    filteredStudents,
    resetFilters,
  } = useAttendance({
    initialStudents,
    initialClassDays,
    excusedAbsences,
  });

  const { markAttendance, markBulkAttendance, createClassDaySession } = useAttendanceMutations({
    students,
    classDays,
    onStudentsChange,
    onClassDaysChange,
    onToggleAttendance,
  });

  const handleCreateSessionSubmit = (data: AttendanceFormData) => {
    const newSession = createClassDaySession({
      name: data.classDayName,
      date: data.date,
    });
    setSelectedClassDayId(newSession.id);
  };

  const handleMarkAllPresent = () => {
    if (!selectedClassDayId) return;
    markBulkAttendance(selectedClassDayId, 'present', filteredStudents);
  };

  const handleMarkAllAbsent = () => {
    if (!selectedClassDayId) return;
    markBulkAttendance(selectedClassDayId, 'absent', filteredStudents);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--md-on-surface)] tracking-tight">Attendance Workspace</h2>
          <p className="text-xs text-[var(--md-on-surface-variant)]">
            Track student check-ins, class day sessions, excused absences, and 75% threshold compliance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsSpeedCheckInOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
        >
          <Zap className="h-4 w-4 fill-current animate-pulse" />
          <span>Speed Check-In</span>
        </button>
      </div>

      {/* KPI Stats Summary */}
      <AttendanceSummary stats={overallStats} />

      {/* Active Session Card */}
      <AttendanceSession
        classDays={classDays}
        selectedClassDayId={selectedClassDayId}
        onSelectClassDay={setSelectedClassDayId}
        sessionStats={currentSessionStats}
        onMarkAllPresent={handleMarkAllPresent}
        onMarkAllAbsent={handleMarkAllAbsent}
        onCreateSessionClick={() => setIsFormOpen(true)}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--md-on-surface-variant)] opacity-70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students in this session..."
            className="w-full rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] py-2.5 pl-10 pr-3 text-xs font-medium text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
          />
        </div>

        {/* Status Filter Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AttendanceStatusFilter)}
            className="rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] px-3 py-2.5 text-xs font-semibold text-[var(--md-on-surface)] transition focus:border-[var(--md-primary)] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present Only</option>
            <option value="absent">Absent Only</option>
            <option value="excused">Excused Only</option>
            <option value="at_risk">At Risk (&lt;75%)</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-high)] px-3 py-2.5 text-xs font-semibold text-[var(--md-on-surface-variant)] transition hover:bg-[var(--md-surface-container-highest)]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Attendance Roster Table */}
      <AttendanceTable
        students={filteredStudents}
        classDayId={selectedClassDayId}
        onToggleAttendance={markAttendance}
        excusedAbsences={excusedAbsences}
        isLocked={selectedClassDay?.isLocked ?? false}
      />

      {/* Create Session Modal */}
      <AttendanceForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateSessionSubmit}
      />

      {/* Rapid-Fire Speed Check-In Modal */}
      <SpeedCheckInModal
        isOpen={isSpeedCheckInOpen}
        onClose={() => setIsSpeedCheckInOpen(false)}
        students={filteredStudents.length > 0 ? filteredStudents : students}
        classDays={classDays}
        activeDayId={selectedClassDayId}
        onChangeActiveDayId={setSelectedClassDayId}
        excusedAbsences={excusedAbsences}
        onToggleAttendance={(studentName, classDayId, status) => {
          markAttendance(studentName, classDayId, status as any);
        }}
      />
    </div>
  );
}
