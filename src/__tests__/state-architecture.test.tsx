import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import {
  ThemeProvider,
  useTheme,
  AuthProvider,
  useAuth,
  NavigationProvider,
  useNavigation,
  GlobalModalProvider,
  useGlobalModal,
  NotificationProvider,
  useNotifications,
  ApplicationStateProvider,
} from '../state/application';
import {
  useModalState,
  useSearchFilter,
  useActiveFilter,
  useFormStep,
  useSelectionState,
} from '../state/local';
import {
  filterStudents,
  computeStudentStats,
} from '../state/server';

describe('Phase 17 — Three-Level State Architecture', () => {
  describe('Level 1: Server State (Domain & API Layer)', () => {
    it('provides deterministic filtering and stats computation close to feature layer', () => {
      const mockStudents = [
        {
          id: 'stu-1',
          name: 'Faith Walker',
          studentNumber: 'SOM-2026-001',
          rate: 90,
          attended: 9,
          total: 10,
          totalDays: 10,
          attendanceByDay: {},
          levelId: 'level_1',
          avgScore: 88,
          status: 'satisfactory' as const,
        },
        {
          id: 'stu-2',
          name: 'John Grace',
          studentNumber: 'SOM-2026-002',
          rate: 60,
          attended: 6,
          total: 10,
          totalDays: 10,
          attendanceByDay: {},
          levelId: 'level_1',
          avgScore: 70,
          status: 'at_risk' as const,
        },
      ];

      const stats = computeStudentStats(mockStudents);
      expect(stats.total).toBe(2);
      expect(stats.atRiskCount).toBe(1);

      const filtered = filterStudents(mockStudents, {
        searchQuery: 'faith',
        levelId: 'all',
        attendanceFilter: 'all',
        gradeFilter: 'all',
        cohortId: 'all',
        sortBy: 'name',
        sortDirection: 'asc',
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Faith Walker');
    });
  });

  describe('Level 2: Application State (Contexts & App Providers)', () => {
    it('ThemeContext manages theme and dark mode toggling', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });
      expect(result.current.theme).toBeDefined();

      act(() => {
        result.current.setTheme('dark');
      });
      expect(result.current.theme).toBe('dark');
      expect(result.current.isDark).toBe(true);

      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe('light');
    });

    it('AuthContext manages user session, role, and permissions', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.login({
          id: 'user-admin',
          email: 'admin@hteim.org',
          name: 'Pastor Samuel',
          role: 'admin',
        });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.role).toBe('admin');
      expect(result.current.hasPermission('students:read')).toBe(true);
      expect(result.current.hasPermission('users:manage')).toBe(true);

      act(() => {
        result.current.logout();
      });
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.currentUser).toBeNull();
    });

    it('NavigationContext manages routing, tab switches, and badge counts', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <NavigationProvider initialTab="home">{children}</NavigationProvider>
      );

      const { result } = renderHook(() => useNavigation(), { wrapper });
      expect(result.current.activeTab).toBe('home');

      act(() => {
        result.current.navigate('attendance');
      });
      expect(result.current.activeTab).toBe('attendance');
      expect(result.current.canGoBack).toBe(true);

      act(() => {
        result.current.setUnreadMessagesCount(5);
      });
      expect(result.current.unreadMessagesCount).toBe(5);

      act(() => {
        result.current.goBack();
      });
      expect(result.current.activeTab).toBe('home');
    });

    it('GlobalModalContext opens and closes centralized dialogs with payloads', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <GlobalModalProvider>{children}</GlobalModalProvider>
      );

      const { result } = renderHook(() => useGlobalModal(), { wrapper });
      expect(result.current.activeModal).toBeNull();

      act(() => {
        result.current.openModal('report', { studentId: 'stu-1' });
      });
      expect(result.current.isModalOpen('report')).toBe(true);
      expect(result.current.modalPayload).toEqual({ studentId: 'stu-1' });

      act(() => {
        result.current.closeModal('report');
      });
      expect(result.current.isModalOpen('report')).toBe(false);
      expect(result.current.modalPayload).toBeNull();
    });

    it('NotificationContext adds and dismisses toast notifications', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <NotificationProvider>{children}</NotificationProvider>
      );

      const { result } = renderHook(() => useNotifications(), { wrapper });

      let toastId = '';
      act(() => {
        toastId = result.current.addToast({
          type: 'success',
          message: 'Attendance saved successfully',
          duration: 10000,
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('Attendance saved successfully');

      act(() => {
        result.current.removeToast(toastId);
      });
      expect(result.current.toasts).toHaveLength(0);
    });

    it('ApplicationStateProvider orchestrates all application contexts cohesively', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ApplicationStateProvider>{children}</ApplicationStateProvider>
      );

      const { result } = renderHook(() => ({
        theme: useTheme(),
        auth: useAuth(),
        nav: useNavigation(),
        modal: useGlobalModal(),
        notif: useNotifications(),
      }), { wrapper });

      expect(result.current.theme).toBeDefined();
      expect(result.current.auth).toBeDefined();
      expect(result.current.nav).toBeDefined();
      expect(result.current.modal).toBeDefined();
      expect(result.current.notif).toBeDefined();
    });
  });

  describe('Level 3: Local UI State (Encapsulated in Component)', () => {
    it('useModalState keeps modal state inside component without polluting global stores', () => {
      const { result } = renderHook(() => useModalState<string>());
      expect(result.current.isOpen).toBe(false);
      expect(result.current.payload).toBeNull();

      act(() => {
        result.current.open('item-123');
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.payload).toBe('item-123');

      act(() => {
        result.current.close();
      });
      expect(result.current.isOpen).toBe(false);
      expect(result.current.payload).toBeNull();
    });

    it('useSearchFilter filters items strictly in component scope', () => {
      const items = [
        { name: 'Grace Fellowship', city: 'Atlanta' },
        { name: 'Faith Temple', city: 'Dallas' },
        { name: 'Hope Center', city: 'Atlanta' },
      ];

      const { result } = renderHook(() =>
        useSearchFilter({
          items,
          searchFields: (i) => [i.name, i.city],
        })
      );

      expect(result.current.filteredItems).toHaveLength(3);

      act(() => {
        result.current.setSearchTerm('atlanta');
      });
      expect(result.current.filteredItems).toHaveLength(2);

      act(() => {
        result.current.resetSearch();
      });
      expect(result.current.filteredItems).toHaveLength(3);
    });

    it('useActiveFilter manages local segment controls and pills', () => {
      const { result } = renderHook(() => useActiveFilter<'all' | 'active' | 'archived'>('all'));
      expect(result.current.activeFilter).toBe('all');
      expect(result.current.isFilterActive('all')).toBe(true);

      act(() => {
        result.current.setActiveFilter('active');
      });
      expect(result.current.activeFilter).toBe('active');
      expect(result.current.isFilterActive('active')).toBe(true);
    });

    it('useFormStep manages multi-step forms encapsulated in modals', () => {
      const { result } = renderHook(() => useFormStep(3, 1));
      expect(result.current.currentStep).toBe(1);
      expect(result.current.isFirstStep).toBe(true);

      act(() => {
        result.current.nextStep();
      });
      expect(result.current.currentStep).toBe(2);

      act(() => {
        result.current.nextStep();
      });
      expect(result.current.currentStep).toBe(3);
      expect(result.current.isLastStep).toBe(true);

      // Should not exceed totalSteps
      act(() => {
        result.current.nextStep();
      });
      expect(result.current.currentStep).toBe(3);
    });

    it('useSelectionState encapsulates row and batch selection', () => {
      const { result } = renderHook(() => useSelectionState<string>());
      expect(result.current.selectedCount).toBe(0);

      act(() => {
        result.current.select('row-1');
        result.current.select('row-2');
      });
      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('row-1')).toBe(true);

      act(() => {
        result.current.toggle('row-2');
      });
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected('row-2')).toBe(false);

      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedCount).toBe(0);
    });
  });
});
