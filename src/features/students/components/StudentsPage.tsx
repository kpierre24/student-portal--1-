import React, { useState } from 'react';
import { Users, UserPlus, Grid, List, AlertTriangle, Trophy, Award, GraduationCap, UserX, UserCheck } from 'lucide-react';
import { Card, Button, Badge } from '../../../components/ui';
import { StudentSearch } from './StudentSearch';
import { StudentFilters } from './StudentFilters';
import { StudentTable } from './StudentTable';
import { StudentCard } from './StudentCard';
import { StudentForm } from './StudentForm';
import { StudentDetails } from './StudentDetails';
import { useStudents } from '../hooks/useStudents';
import { useStudentMutations } from '../hooks/useStudentMutations';
import { StudentSummary, ClassDay } from '../../../types';
import { StudentFormData } from '../types';

export interface StudentsPageProps {
  initialStudents?: StudentSummary[];
  students?: StudentSummary[];
  classDays?: ClassDay[];
  onSelectStudentForTranscript?: (student: StudentSummary) => void;
  onSelectStudentForCertificate?: (student: StudentSummary) => void;
  onSelectStudentForEmail?: (student: StudentSummary) => void;
  onDeleteStudent?: (name: string) => void;
  onStudentsChange?: (updatedStudents: StudentSummary[]) => void;
  className?: string;
  [key: string]: any;
}

export function StudentsPage({
  initialStudents,
  students: incomingStudents,
  classDays = [],
  onSelectStudentForTranscript,
  onSelectStudentForCertificate,
  onSelectStudentForEmail,
  onDeleteStudent,
  onStudentsChange,
  className = '',
}: StudentsPageProps) {
  const effectiveInitialStudents = incomingStudents ?? initialStudents ?? [];
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentSummary | null>(null);

  const {
    students,
    filteredStudents,
    stats,
    selectedStudent,
    setSelectedStudentId,
    filters,
    updateSearchQuery,
    setFilters,
    resetFilters,
  } = useStudents({ 
    initialStudents: effectiveInitialStudents,
    students: incomingStudents,
  });

  const { saveStudent, deleteStudent } = useStudentMutations({
    students,
    onStudentsChange,
  });

  const handleOpenCreateForm = () => {
    setEditingStudent(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (student: StudentSummary) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleSelectStudent = (student: StudentSummary) => {
    setSelectedStudentId(student.id || student.name);
    setIsDetailsOpen(true);
  };

  const handleFormSubmit = (formData: StudentFormData) => {
    saveStudent(formData);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Controls & Metrics Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--md-on-surface)] tracking-tight">Student Roster</h2>
          <p className="text-xs text-[var(--md-on-surface-variant)]">
            Manage student registrations, academic standings, and active vs dropped-out enrollment profiles.
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenCreateForm}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          Enroll Student
        </Button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="flex items-center gap-3 p-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 font-bold">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--md-on-surface-variant)] uppercase">Total Enrolled</div>
            <div className="text-lg font-extrabold text-[var(--md-on-surface)]">{stats.total}</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 font-bold">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--md-on-surface-variant)] uppercase">Active Students</div>
            <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{stats.activeCount}</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-bold">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--md-on-surface-variant)] uppercase">Satisfactory (≥75%)</div>
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{stats.satisfactoryCount}</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 font-bold">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--md-on-surface-variant)] uppercase">At-Risk (&lt;75%)</div>
            <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{stats.atRiskCount}</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 font-bold">
            <UserX className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--md-on-surface-variant)] uppercase">Dropped Out</div>
            <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400">{stats.droppedOutCount}</div>
          </div>
        </Card>
      </div>

      {/* Search, Filters & View Toggle Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StudentSearch searchQuery={filters.searchQuery} onSearchChange={updateSearchQuery} />

        <div className="flex items-center gap-2">
          <StudentFilters
            filters={filters}
            onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
            onResetFilters={resetFilters}
          />

          {/* Table / Grid Toggle */}
          <div className="flex items-center rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'table'
                  ? 'bg-[var(--md-surface)] text-[var(--md-primary)] shadow-xs'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition ${
                viewMode === 'grid'
                  ? 'bg-[var(--md-surface)] text-[var(--md-primary)] shadow-xs'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
              title="Card View"
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Student List View */}
      {viewMode === 'table' ? (
        <StudentTable
          students={filteredStudents}
          onSelectStudent={handleSelectStudent}
          onViewTranscript={onSelectStudentForTranscript}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.id || student.name}
              student={student}
              onSelect={handleSelectStudent}
              onViewTranscript={onSelectStudentForTranscript}
            />
          ))}
        </div>
      )}

      {/* Slide-out & Modal Components */}
      <StudentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingStudent ? {
          id: editingStudent.id,
          name: editingStudent.name,
          studentNumber: editingStudent.studentNumber,
          email: editingStudent.email,
          phone: editingStudent.phone,
          levelId: editingStudent.levelId || 'level_1',
          enrolledModule: editingStudent.enrolledModule,
          photoUrl: editingStudent.photoUrl,
          note: editingStudent.note,
          cohortId: editingStudent.cohortId,
          enrollmentStatus: editingStudent.enrollmentStatus,
          dropoutReason: editingStudent.dropoutReason,
          dropoutDate: editingStudent.dropoutDate,
        } : undefined}
      />

      <StudentDetails
        student={selectedStudent}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={(student) => {
          setIsDetailsOpen(false);
          handleOpenEditForm(student);
        }}
        onDelete={(id) => {
          setIsDetailsOpen(false);
          deleteStudent(id);
          if (onDeleteStudent && selectedStudent) {
            onDeleteStudent(selectedStudent.name);
          }
        }}
      />
    </div>
  );
}
