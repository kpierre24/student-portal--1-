import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CohortManagementModal } from '../components/CohortManagementModal';
import { AppHeader } from '../components/AppHeader';
import { DEFAULT_COHORTS, Cohort } from '../types';

describe('Cohort Permissions — Multi-Cohort Access Control', () => {
  const mockCohorts: Cohort[] = [
    {
      id: 'cohort_2026',
      name: 'Class of 2026',
      academicYear: 2026,
      startDate: '2026-01-10',
      endDate: '2026-12-15',
      isArchived: false,
      isCurrent: true,
      description: 'Current live cohort',
    },
    {
      id: 'cohort_2027',
      name: 'Class of 2027',
      academicYear: 2027,
      startDate: '2027-01-09',
      endDate: '2027-12-14',
      isArchived: false,
      isCurrent: false,
      description: 'New upcoming cohort',
    },
  ];

  describe('CohortManagementModal', () => {
    it('shows both current and new cohort to admin users', () => {
      render(
        <CohortManagementModal
          isOpen={true}
          onClose={vi.fn()}
          cohorts={mockCohorts}
          activeCohortId="cohort_2026"
          onSelectActiveCohort={vi.fn()}
          onSaveCohort={vi.fn()}
          onDeleteCohort={vi.fn()}
          onArchiveToggle={vi.fn()}
          userRole="admin"
        />
      );

      expect(screen.getAllByText('Class of 2026').length).toBeGreaterThan(0);
      expect(screen.getByText('Class of 2027')).toBeDefined();
      expect(screen.getByText('Admin Only')).toBeDefined();
    });

    it('hides the new cohort from non-admin users (teacher, student, visitor)', () => {
      render(
        <CohortManagementModal
          isOpen={true}
          onClose={vi.fn()}
          cohorts={mockCohorts}
          activeCohortId="cohort_2026"
          onSelectActiveCohort={vi.fn()}
          onSaveCohort={vi.fn()}
          onDeleteCohort={vi.fn()}
          onArchiveToggle={vi.fn()}
          userRole="teacher"
        />
      );

      // Class of 2026 should be visible
      expect(screen.getAllByText('Class of 2026').length).toBeGreaterThan(0);
      // Class of 2027 (the new cohort) must NOT be visible to non-admins
      expect(screen.queryByText('Class of 2027')).toBeNull();
      expect(screen.queryByText('Admin Only')).toBeNull();
    });
  });

  describe('AppHeader Cohort Switcher Permissions', () => {
    const defaultHeaderProps: any = {
      onGoHome: vi.fn(),
      onOpenLogin: vi.fn(),
      onLogout: vi.fn(),
      onNavigate: vi.fn(),
      unreadMessagesCount: 0,
      filteredNotifications: [],
      onMarkNotifAsRead: vi.fn(),
      onMarkAllNotifsAsRead: vi.fn(),
      onClearNotifs: vi.fn(),
      onSelectNotif: vi.fn(),
      onTriggerNotifScan: vi.fn(),
      onAddTestNotif: vi.fn(),
      onOpenIntro: vi.fn(),
      onOpenPresentation: vi.fn(),
      onOpenCommandPalette: vi.fn(),
      onOpenRoleSwitch: vi.fn(),
      isCloudSyncing: false,
      onPushToCloud: vi.fn(),
      dataSource: 'local',
      isLoading: false,
      onLoadSheets: vi.fn(),
      onOpenBroadcast: vi.fn(),
      onOpenAuditLog: vi.fn(),
      onOpenUserManagement: vi.fn(),
      onOpenSettings: vi.fn(),
      onOpenHelp: vi.fn(),
      onToggleMobileDrawer: vi.fn(),
    };

    it('renders a clickable button for admin users to manage cohorts', () => {
      const onOpenCohortModal = vi.fn();
      render(
        <AppHeader
          {...defaultHeaderProps}
          activeCohort={mockCohorts[0]}
          onOpenCohortModal={onOpenCohortModal}
          appUser={{ id: 'u-admin-test', email: 'admin@som.hteim.org', role: 'admin', name: 'Super Admin' }}
        />
      );

      const cohortButton = screen.getByTitle('Click to manage academic cohorts');
      expect(cohortButton).toBeDefined();
      fireEvent.click(cohortButton);
      expect(onOpenCohortModal).toHaveBeenCalledTimes(1);
    });

    it('renders a static non-clickable badge for teachers and students', () => {
      const onOpenCohortModal = vi.fn();
      render(
        <AppHeader
          {...defaultHeaderProps}
          activeCohort={mockCohorts[0]}
          onOpenCohortModal={onOpenCohortModal}
          appUser={{ id: 'u-teacher-test', email: 'teacher@som.hteim.org', role: 'teacher', name: 'Instructor' }}
        />
      );

      // Should not find the interactive cohort management button
      expect(screen.queryByTitle('Click to manage academic cohorts')).toBeNull();
      expect(screen.queryByTitle('Click to switch academic cohort view')).toBeNull();
      // Should find the read-only static badge
      const staticBadge = screen.getByTitle('Academic cohort: Class of 2026');
      expect(staticBadge).toBeDefined();
      expect(staticBadge.tagName.toLowerCase()).toBe('span');
    });
  });
});
