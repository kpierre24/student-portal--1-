import React from 'react';
import { TabType } from '../types';
import { Permission, ROLE_DEFINITIONS } from '../types/rbac';
import { 
  Sparkles, 
  UserCheck, 
  GraduationCap, 
  BookOpen, 
  Award, 
  BookOpenCheck, 
  Calendar, 
  Bookmark, 
  DollarSign, 
  MessageSquare, 
  FileText,
  Video,
  LucideIcon
} from 'lucide-react';

import { lazyWithRetry } from '../lib/lazyWithRetry';

export const DashboardPage = lazyWithRetry(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })), 'DashboardPage');
export const StudentsPage = lazyWithRetry(() => import('../pages/StudentsPage').then(m => ({ default: m.StudentsPage })), 'StudentsPage');
export const AttendancePage = lazyWithRetry(() => import('../pages/AttendancePage').then(m => ({ default: m.AttendancePage })), 'AttendancePage');
export const CoursesPage = lazyWithRetry(() => import('../pages/CoursesPage').then(m => ({ default: m.CoursesPage })), 'CoursesPage');
export const ExamsPage = lazyWithRetry(() => import('../pages/ExamsPage').then(m => ({ default: m.ExamsPage })), 'ExamsPage');
export const SchedulePage = lazyWithRetry(() => import('../pages/SchedulePage').then(m => ({ default: m.SchedulePage })), 'SchedulePage');
export const LibraryPage = lazyWithRetry(() => import('../pages/LibraryPage').then(m => ({ default: m.LibraryPage })), 'LibraryPage');
export const FinancePage = lazyWithRetry(() => import('../pages/FinancePage').then(m => ({ default: m.FinancePage })), 'FinancePage');
export const MessagesPage = lazyWithRetry(() => import('../pages/MessagesPage').then(m => ({ default: m.MessagesPage })), 'MessagesPage');
export const ReportsPage = lazyWithRetry(() => import('../pages/ReportsPage').then(m => ({ default: m.ReportsPage })), 'ReportsPage');
export const NotesPage = lazyWithRetry(() => import('../pages/NotesPage').then(m => ({ default: m.NotesPage })), 'NotesPage');
export const ClassroomPage = lazyWithRetry(() => import('../pages/ClassroomPage').then(m => ({ default: m.ClassroomPage })), 'ClassroomPage');

/**
 * Single Canonical Route Registry interface.
 * Authorization model: Role -> Permissions -> Route Access -> Navigation Access.
 */
export interface CanonicalRoute {
  id: TabType;
  label: string;
  shortLabel?: string;
  description: string;
  component: React.ComponentType<any>;
  icon: LucideIcon;
  iconName: string;
  permissions: Permission[];
  aliases?: string[];
  isQuickNav?: boolean;
  isDesktopNav?: boolean;
  isMobileNav?: boolean;
  badgeCount?: number;
  badgeAlert?: boolean;
  isPublic?: boolean;
}

// Backward-compatibility interfaces
export interface NavigationItem {
  id: string;
  label: string;
  component: React.ComponentType<any>;
  permissions: Permission[];
  icon?: LucideIcon;
  description?: string;
  aliases?: string[];
  badgeAlert?: boolean;
  badgeCount?: number;
}

export interface RouteConfig {
  tab: TabType;
  label: string;
  description: string;
  allowedRoles: string[];
  badge?: string;
  iconName: string;
  Icon?: LucideIcon;
  isQuickNav?: boolean;
}

export interface NavItem {
  tab: TabType;
  label: string;
  Icon: LucideIcon;
  badgeAlert?: boolean;
  badgeCount?: number;
}

export interface BreadcrumbItem {
  label: string;
  tab: TabType;
  icon?: LucideIcon;
}

export interface CommandPaletteRouteItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  tab: TabType;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
}

/**
 * CANONICAL ROUTE REGISTRY — The Single Source of Truth for all portal navigation,
 * route guards, permission scopes, command palette entries, breadcrumbs, and layout views.
 * 
 * Authorization is permission-driven (Role -> Permissions -> Route Access).
 */
export const CANONICAL_ROUTES: CanonicalRoute[] = [
  {
    id: 'home',
    label: 'Dashboard',
    shortLabel: 'Home',
    description: 'School overview, dean message, announcements, and quick access',
    component: DashboardPage,
    icon: Sparkles,
    iconName: 'Sparkles',
    permissions: [],
    aliases: ['dashboard'],
    isQuickNav: true,
    isDesktopNav: true,
    isMobileNav: true,
    isPublic: true,
  },
  {
    id: 'attendance',
    label: 'Attendance',
    description: 'Class session logs, 75% policy compliance, and check-in records',
    component: AttendancePage,
    icon: UserCheck,
    iconName: 'UserCheck',
    permissions: ['attendance:read'],
    isQuickNav: true,
    isDesktopNav: true,
    isMobileNav: true,
  },
  {
    id: 'students',
    label: 'Students',
    description: 'Student directory, individual academic profiles, transcripts, and notes',
    component: StudentsPage,
    icon: GraduationCap,
    iconName: 'GraduationCap',
    permissions: ['students:write'],
    isQuickNav: true,
    isDesktopNav: true,
    isMobileNav: true,
  },
  {
    id: 'courses',
    label: '6 Modules',
    shortLabel: 'Courses',
    description: 'Curriculum syllabus, foundational modules, objectives, and teachers',
    component: CoursesPage,
    icon: BookOpen,
    iconName: 'BookOpen',
    permissions: [],
    isQuickNav: true,
    isDesktopNav: true,
    isMobileNav: true,
    isPublic: true,
  },
  {
    id: 'exams',
    label: 'Exams & Grades',
    shortLabel: 'Exams',
    description: 'Classroom quizzes, scripture tests, timed evaluations, and gradebook',
    component: ExamsPage,
    icon: Award,
    iconName: 'Award',
    permissions: ['grades:read'],
    aliases: ['grades'],
    isQuickNav: true,
    isDesktopNav: true,
    isMobileNav: true,
  },
  {
    id: 'schedule',
    label: 'Schedule',
    description: 'Term calendar, live session times, lecture dates, and holidays',
    component: SchedulePage,
    icon: Calendar,
    iconName: 'Calendar',
    permissions: [],
    isQuickNav: true,
    isDesktopNav: true,
    isMobileNav: true,
    isPublic: true,
  },
  {
    id: 'library',
    label: 'Library & Media',
    shortLabel: 'Library',
    description: 'Study handouts, sermon recordings, PDF lesson guides, and resources',
    component: LibraryPage,
    icon: Bookmark,
    iconName: 'Bookmark',
    permissions: [],
    isQuickNav: true,
    isDesktopNav: true,
    isMobileNav: true,
    isPublic: true,
  },
  {
    id: 'payments',
    label: 'Tuition & Fees',
    shortLabel: 'Payments',
    description: 'Tuition statements, installment plans, receipts, and sponsorship funds',
    component: FinancePage,
    icon: DollarSign,
    iconName: 'DollarSign',
    permissions: ['finance:read'],
    aliases: ['finance'],
    isQuickNav: true,
    isDesktopNav: true,
    isMobileNav: true,
  },
  {
    id: 'messages',
    label: 'Faculty Messages',
    shortLabel: 'Messages',
    description: 'Direct inquiries, academic announcements, and student guidance threads',
    component: MessagesPage,
    icon: MessageSquare,
    iconName: 'MessageSquare',
    permissions: ['students:read'],
    isQuickNav: false,
    isDesktopNav: true,
    isMobileNav: true,
  },
  {
    id: 'reports',
    label: 'Analytics & Reports',
    shortLabel: 'Reports',
    description: 'Cohort summary trends, at-risk flags, retention rates, and charts',
    component: ReportsPage,
    icon: FileText,
    iconName: 'BarChart3',
    permissions: ['audit:read'],
    isQuickNav: false,
    isDesktopNav: true,
    isMobileNav: true,
  },
  {
    id: 'notes',
    label: 'Study Notes & Bible',
    shortLabel: 'Notes & Bible',
    description: 'Personal ministerial notes, King James scripture references, and journal',
    component: NotesPage,
    icon: BookOpenCheck,
    iconName: 'FileText',
    permissions: [],
    isQuickNav: false,
    isDesktopNav: true,
    isMobileNav: true,
    isPublic: true,
  },
  {
    id: 'classroom',
    label: 'Live Classroom',
    shortLabel: 'Live Class',
    description: 'Interactive 2-way WebRTC video feed, live attendance check-in, and labs',
    component: ClassroomPage,
    icon: Video,
    iconName: 'Video',
    permissions: [],
    aliases: ['live'],
    isQuickNav: true,
    isDesktopNav: true,
    isMobileNav: true,
    isPublic: true,
  },
];

/**
 * Computes allowed roles for a route dynamically from ROLE_DEFINITIONS.
 * Ensures Role -> Permission -> Route mapping remains 100% single-source.
 */
export function getAllowedRolesForRoute(route: CanonicalRoute): string[] {
  if (route.isPublic || !route.permissions || route.permissions.length === 0) {
    return ['student', 'teacher', 'admin', 'guest'];
  }
  const matchingRoles: string[] = ['guest'];
  Object.entries(ROLE_DEFINITIONS).forEach(([roleKey, roleDef]) => {
    if (
      roleDef.permissions.includes('all:access') ||
      route.permissions.some(p => roleDef.permissions.includes(p))
    ) {
      matchingRoles.push(roleKey);
    }
  });
  return matchingRoles;
}

// 1. DERIVED: All valid tab identifiers including primary IDs and aliases
export const VALID_TABS: TabType[] = CANONICAL_ROUTES.reduce<TabType[]>((acc, route) => {
  acc.push(route.id);
  if (route.aliases) {
    route.aliases.forEach(alias => {
      if (!acc.includes(alias as TabType)) acc.push(alias as TabType);
    });
  }
  return acc;
}, []);

// 2. DERIVED: Legacy `navigation` structure derived from CANONICAL_ROUTES
export const navigation: NavigationItem[] = CANONICAL_ROUTES.map(route => ({
  id: route.id,
  label: route.label,
  component: route.component,
  permissions: route.permissions,
  icon: route.icon,
  description: route.description,
  aliases: route.aliases,
  badgeAlert: route.badgeAlert,
  badgeCount: route.badgeCount,
}));

// 3. DERIVED: Legacy `PORTAL_ROUTES` structure derived from CANONICAL_ROUTES
export const PORTAL_ROUTES: RouteConfig[] = CANONICAL_ROUTES.map(route => ({
  tab: route.id,
  label: route.label,
  description: route.description,
  get allowedRoles() {
    return getAllowedRolesForRoute(route);
  },
  iconName: route.iconName,
  Icon: route.icon,
  isQuickNav: route.isQuickNav,
}));

// 4. DERIVED: Legacy `DESKTOP_NAV_ITEMS` derived from CANONICAL_ROUTES
export const DESKTOP_NAV_ITEMS: NavItem[] = CANONICAL_ROUTES
  .filter(route => route.isDesktopNav !== false)
  .map(route => ({
    tab: route.id,
    label: route.shortLabel || route.label,
    Icon: route.icon,
    badgeAlert: route.badgeAlert,
    badgeCount: route.badgeCount,
  }));

/**
 * Finds a canonical route definition by ID or alias.
 */
export function getCanonicalRoute(idOrTab: string): CanonicalRoute | undefined {
  return CANONICAL_ROUTES.find(
    item => item.id === idOrTab || item.aliases?.includes(idOrTab)
  );
}

/**
 * Finds a navigation entry by ID or alias (backward compatible helper).
 */
export function getNavigationItem(idOrTab: string): NavigationItem | undefined {
  const canonical = getCanonicalRoute(idOrTab);
  if (!canonical) return undefined;
  return {
    id: canonical.id,
    label: canonical.label,
    component: canonical.component,
    permissions: canonical.permissions,
    icon: canonical.icon,
    description: canonical.description,
    aliases: canonical.aliases,
    badgeAlert: canonical.badgeAlert,
    badgeCount: canonical.badgeCount,
  };
}

/**
 * Centralized Permission Guard checking whether a user/role has access to a route item.
 * Evaluates authorization according to: Role -> Permissions -> Route Access -> Navigation.
 */
export function isNavigationAccessible(
  item: NavigationItem | CanonicalRoute, 
  role?: string, 
  userPermissions?: Permission[]
): boolean {
  const route = getCanonicalRoute(item.id) || (item as CanonicalRoute);
  
  if (route.isPublic) {
    return true;
  }

  if (!role) {
    return false;
  }

  const effectivePermissions: Permission[] = (userPermissions && userPermissions.length > 0)
    ? userPermissions
    : (ROLE_DEFINITIONS[role]?.permissions || []);

  if (effectivePermissions.includes('all:access')) {
    return true;
  }

  if (!route.permissions || route.permissions.length === 0) {
    return true;
  }

  return route.permissions.some(perm => effectivePermissions.includes(perm));
}

/**
 * Unified Route Accessibility check by TabType and optional Role / Permissions.
 */
export function isRouteAccessible(tab: TabType, role?: string, userPermissions?: Permission[]): boolean {
  const route = getCanonicalRoute(tab);
  if (!route) return false;
  return isNavigationAccessible(route, role, userPermissions);
}

/**
 * Retrieves location tab parameter from current URL, defaulting to 'home'.
 */
export function getTabFromLocation(): TabType {
  if (typeof window === 'undefined') return 'home';
  const candidate = new URLSearchParams(window.location.search).get('tab') as TabType | null;
  return candidate && VALID_TABS.includes(candidate) ? candidate : 'home';
}

/**
 * Determines default initial route based on user role.
 */
export function getDefaultRouteForRole(role?: string): TabType {
  if (role === 'student') return 'home';
  if (role === 'teacher' || role === 'admin' || role === 'super_admin') return 'attendance';
  return 'home';
}

// ── DERIVED LAYOUT & ACCESS FILTERS ──────────────────────────────────────────────

/**
 * Derives desktop navigation items dynamically filtered by user role & permissions.
 */
export function getDesktopNavigation(userRole?: string, userPermissions?: Permission[]): CanonicalRoute[] {
  return CANONICAL_ROUTES.filter(r => r.isDesktopNav !== false && isNavigationAccessible(r, userRole, userPermissions));
}

/**
 * Derives mobile navigation items dynamically filtered by user role & permissions.
 */
export function getMobileNavigation(userRole?: string, userPermissions?: Permission[]): CanonicalRoute[] {
  return CANONICAL_ROUTES.filter(r => r.isMobileNav !== false && isNavigationAccessible(r, userRole, userPermissions));
}

/**
 * Derives quick navigation routes for dashboard quick action grids.
 */
export function getQuickNavigation(userRole?: string, userPermissions?: Permission[]): CanonicalRoute[] {
  return CANONICAL_ROUTES.filter(r => r.isQuickNav && isNavigationAccessible(r, userRole, userPermissions));
}

/**
 * Derives breadcrumb trail hierarchy for any route tab.
 */
export function getBreadcrumbs(tab: TabType): BreadcrumbItem[] {
  const route = getCanonicalRoute(tab);
  const rootItem: BreadcrumbItem = { label: 'HTEIM Portal', tab: 'home', icon: Sparkles };
  if (!route || route.id === 'home') {
    return [rootItem];
  }
  return [
    rootItem,
    { label: route.label, tab: route.id, icon: route.icon }
  ];
}

/**
 * Derives Command Palette search entries directly from the Canonical Route Registry.
 */
export function getCommandPaletteRoutes(userRole?: string, userPermissions?: Permission[]): CommandPaletteRouteItem[] {
  return CANONICAL_ROUTES
    .filter(r => isNavigationAccessible(r, userRole, userPermissions))
    .map(r => ({
      id: `route-${r.id}`,
      category: 'Actions & Views',
      title: `Go to ${r.label}`,
      subtitle: r.description,
      tab: r.id,
      icon: r.icon,
      badge: 'View',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
    }));
}

export function getNavRoutesForRole(role?: string): RouteConfig[] {
  return PORTAL_ROUTES.filter(r => isRouteAccessible(r.tab, role));
}

export function filterNavItemsForUser(items: NavItem[], userRole?: string, userPermissions?: Permission[]): NavItem[] {
  return items.filter(item => isRouteAccessible(item.tab, userRole, userPermissions));
}

