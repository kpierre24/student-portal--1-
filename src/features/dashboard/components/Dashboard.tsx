import React, { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { StudentDashboard } from './StudentDashboard';
import { TeacherDashboard } from './TeacherDashboard';
import { AdminDashboard } from './AdminDashboard';
import { StudentSummary, ClassDay, CustomAssignment, TabType } from '../../../types';
import { AppUser } from '../../../lib/userAuth';
import { Eye, Shield, UserCheck, GraduationCap } from 'lucide-react';

export interface DashboardProps {
  appUser: AppUser | null;
  students?: StudentSummary[];
  classDays?: ClassDay[];
  assignments?: CustomAssignment[];
  payments?: any[];
  records?: any[];
  submissions?: any[];
  onNavigate?: (tab: TabType) => void;
  onSyncDatabase?: () => Promise<void> | void;
  isCloudSyncing?: boolean;
  lastSyncedTime?: Date | string | null;
  className?: string;
}

export function Dashboard({
  appUser,
  students = [],
  classDays = [],
  assignments = [],
  payments = [],
  records = [],
  submissions = [],
  onNavigate,
  onSyncDatabase,
  isCloudSyncing = false,
  lastSyncedTime = null,
  className = '',
}: DashboardProps) {
  // Allow switching view in preview mode if admin/teacher wants to inspect other dashboards
  const [roleOverride, setRoleOverride] = useState<'admin' | 'teacher' | 'student' | null>(null);

  const effectiveRole = roleOverride || appUser?.role || 'student';

  const {
    greetingTimeOfDay,
    studentData,
    teacherData,
    adminData,
  } = useDashboard({
    appUser,
    students,
    classDays,
    assignments,
    payments,
    records,
    submissions,
    isCloudSyncing,
    lastSyncedTime,
  });

  const canSwitchRoles = appUser?.role === 'admin' || appUser?.role === 'teacher' || !appUser;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Optional role-perspective preview toolbar for admins and faculty */}
      {canSwitchRoles && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs dark:bg-slate-900/60 dark:border-slate-800">
          <div className="flex items-center gap-2 text-[var(--color-text-muted)] font-medium">
            <Eye className="h-3.5 w-3.5" />
            <span>Dashboard View Perspective:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRoleOverride('admin')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                effectiveRole === 'admin'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Shield className="h-3 w-3" />
              <span>Admin</span>
            </button>

            <button
              onClick={() => setRoleOverride('teacher')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                effectiveRole === 'teacher'
                  ? 'bg-[var(--color-accent)] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <UserCheck className="h-3 w-3" />
              <span>Faculty</span>
            </button>

            <button
              onClick={() => setRoleOverride('student')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                effectiveRole === 'student'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <GraduationCap className="h-3 w-3" />
              <span>Student</span>
            </button>
          </div>
        </div>
      )}

      {/* Render Role-Specific Dashboard */}
      {effectiveRole === 'admin' && (
        <AdminDashboard
          data={adminData}
          greetingTimeOfDay={greetingTimeOfDay}
          onNavigate={onNavigate}
          onSyncDatabase={onSyncDatabase}
          isCloudSyncing={isCloudSyncing}
        />
      )}

      {effectiveRole === 'teacher' && (
        <TeacherDashboard
          data={teacherData}
          greetingTimeOfDay={greetingTimeOfDay}
          onNavigate={onNavigate}
        />
      )}

      {effectiveRole === 'student' && (
        <StudentDashboard
          data={studentData}
          greetingTimeOfDay={greetingTimeOfDay}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
