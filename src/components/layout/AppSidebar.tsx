import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap, 
  Search, 
  Sparkles, 
  Cloud, 
  RefreshCw, 
  Radio, 
  ShieldCheck, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Lock, 
  WifiOff,
  UserCheck,
  BookOpen,
  Award,
  Calendar,
  Bookmark,
  DollarSign,
  MessageSquare,
  FileText,
  BookOpenCheck,
  ClipboardList,
  Video,
} from 'lucide-react';
import { TabType, Cohort } from '../../types';
import { AppUser } from '../../lib/userAuth';
import { LogoImage } from '../LogoImage';
import { getDesktopNavigation, isNavigationAccessible } from '../../app/navigation';

export interface AppSidebarProps {
  activeErpTab: TabType;
  handleNavigate: (tab: TabType) => void;
  appUser: AppUser | null;
  unreadMessagesCount: number;
  activeCohort?: Cohort | null;
  onOpenCohortModal?: () => void;
  onGoHome?: () => void;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenRoleSwitch?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  onOpenBroadcast?: () => void;
  onOpenAuditLog?: () => void;
  onOpenPINCheckin?: () => void;
  onPushToCloud?: () => void;
  isCloudSyncing?: boolean;
  isOffline?: boolean;
  pendingOfflineCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ROLE_COLORS: Record<string, { avatar: string; label: string; badge: string }> = {
  super_admin: {
    avatar: 'bg-purple-700 text-white dark:bg-purple-950 dark:text-purple-200',
    label: 'text-purple-700 dark:text-purple-300',
    badge: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  admin: {
    avatar: 'bg-[#023264] text-white dark:bg-[#dceaf8] dark:text-[#023264]',
    label: 'text-[#025798] dark:text-[#7dd3fc]',
    badge: 'bg-blue-50 dark:bg-blue-950/70 text-[#025798] dark:text-[#7dd3fc] border-blue-200 dark:border-blue-800',
  },
  registrar: {
    avatar: 'bg-blue-600 text-white dark:bg-blue-950 dark:text-blue-200',
    label: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  teacher: {
    avatar: 'bg-[#01883c] text-white dark:bg-[#d1fae5] dark:text-[#01883c]',
    label: 'text-[#01883c] dark:text-[#4ade80]',
    badge: 'bg-emerald-50 dark:bg-emerald-950/70 text-[#01883c] dark:text-[#4ade80] border-emerald-200 dark:border-emerald-800',
  },
  lecturer: {
    avatar: 'bg-[#01883c] text-white dark:bg-[#d1fae5] dark:text-[#01883c]',
    label: 'text-[#01883c] dark:text-[#4ade80]',
    badge: 'bg-emerald-50 dark:bg-emerald-950/70 text-[#01883c] dark:text-[#4ade80] border-emerald-200 dark:border-emerald-800',
  },
  student: {
    avatar: 'bg-[#b38f53] text-white dark:bg-[#fef3c7] dark:text-[#8c6a32]',
    label: 'text-[#b38f53] dark:text-[#dfc18b]',
    badge: 'bg-amber-50 dark:bg-amber-950/70 text-[#b38f53] dark:text-[#dfc18b] border-amber-200 dark:border-amber-800',
  },
  finance_officer: {
    avatar: 'bg-emerald-700 text-white dark:bg-emerald-950 dark:text-emerald-200',
    label: 'text-emerald-700 dark:text-emerald-400',
    badge: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  librarian: {
    avatar: 'bg-amber-600 text-white dark:bg-amber-950 dark:text-amber-200',
    label: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  viewer: {
    avatar: 'bg-slate-600 text-white dark:bg-slate-800 dark:text-slate-300',
    label: 'text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
};

/** Roles that are allowed to interact with the cohort switcher */
const COHORT_ADMIN_ROLES = new Set(['admin', 'super_admin', 'registrar']);

/** Roles that have access to broadcast feature */
const BROADCAST_ROLES = new Set(['admin', 'super_admin', 'teacher', 'lecturer']);

/** Roles that have access to audit log */
const AUDIT_ROLES = new Set(['admin', 'super_admin']);

/** Detect platform for keyboard shortcut display */
const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
const searchShortcut = isMac ? '⌘K' : 'Ctrl+K';

interface NavGroup {
  id: string;
  title: string;
  items: {
    id: TabType;
    label: string;
    shortLabel?: string;
    description?: string;
    icon: React.ComponentType<any>;
    badge?: number | string;
    isAlert?: boolean;
  }[];
}

/** Reusable labeled utility row button for the bottom actions zone */
function UtilityButton({
  icon: Icon,
  label,
  isCollapsed,
  onClick,
  title,
  iconClassName = 'text-slate-400',
  labelClassName = '',
  className = '',
}: {
  icon: React.ComponentType<any>;
  label: string;
  isCollapsed: boolean;
  onClick: () => void;
  title?: string;
  iconClassName?: string;
  labelClassName?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
        isCollapsed ? 'justify-center px-2' : ''
      } ${className}`}
      title={title ?? label}
      aria-label={label}
    >
      <Icon className={`w-4 h-4 shrink-0 ${iconClassName}`} />
      {!isCollapsed && <span className={`truncate ${labelClassName}`}>{label}</span>}
    </button>
  );
}

export function AppSidebar({
  activeErpTab,
  handleNavigate,
  appUser,
  unreadMessagesCount,
  activeCohort,
  onOpenCohortModal = () => {},
  onGoHome = () => {},
  onOpenLogin = () => {},
  onLogout = () => {},
  onOpenCommandPalette = () => {},
  onOpenRoleSwitch = () => {},
  onOpenSettings = () => {},
  onOpenHelp = () => {},
  onOpenBroadcast = () => {},
  onOpenAuditLog = () => {},
  onOpenPINCheckin,
  onPushToCloud = () => {},
  isCloudSyncing = false,
  isOffline = false,
  pendingOfflineCount = 0,
  collapsed: controlledCollapsed,
  onToggleCollapse,
}: AppSidebarProps) {
  // Local collapsed state fallback if not controlled
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('hteim_sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      const next = !internalCollapsed;
      setInternalCollapsed(next);
      try {
        localStorage.setItem('hteim_sidebar_collapsed', String(next));
      } catch {}
    }
  };

  const userRole = appUser?.role;
  const userPermissions = (appUser as any)?.permissions;

  // Derive grouped navigation items based on active role permissions
  const navGroups: NavGroup[] = useMemo(() => {
    const accessible = getDesktopNavigation(userRole, userPermissions);
    const accessibleIds = new Set(accessible.map(r => r.id));

    const coreItems: NavGroup['items'] = [
      { id: 'home' as TabType, label: 'Dashboard', shortLabel: 'Dashboard', icon: Sparkles, description: 'Overview & Analytics' },
      { id: 'attendance' as TabType, label: 'Attendance', shortLabel: 'Attendance', icon: UserCheck, description: '75% Compliance & Logs' },
      { id: 'students' as TabType, label: 'Students Directory', shortLabel: 'Students', icon: GraduationCap, description: 'Roster & Records' },
      { id: 'courses' as TabType, label: '6 Modules', shortLabel: 'Modules', icon: BookOpen, description: 'Curriculum & Syllabi' },
      { id: 'exams' as TabType, label: 'Exams & Grades', shortLabel: 'Exams', icon: Award, description: 'Quizzes & Grading' },
      { id: 'schedule' as TabType, label: 'Academic Schedule', shortLabel: 'Schedule', icon: Calendar, description: 'Lectures & Calendar' },
    ].filter(item => accessibleIds.has(item.id));

    const academicItems: NavGroup['items'] = [
      { id: 'classroom' as TabType, label: 'Live Classroom', shortLabel: 'Live Class', icon: Video, description: 'Interactive WebRTC Studio' },
      { id: 'library' as TabType, label: 'Library & Media', shortLabel: 'Library', icon: Bookmark, description: 'Handouts & Audio' },
      { id: 'notes' as TabType, label: 'Study Notes & Bible', shortLabel: 'Notes & Bible', icon: BookOpenCheck, description: 'Journal & Scripture' },
    ].filter(item => accessibleIds.has(item.id));

    const operationsItems: NavGroup['items'] = [
      { id: 'payments' as TabType, label: 'Tuition & Fees', shortLabel: 'Tuition', icon: DollarSign, description: 'Statements & Ledgers' },
      { 
        id: 'messages' as TabType, 
        label: 'Faculty Messages', 
        shortLabel: 'Messages', 
        icon: MessageSquare, 
        description: 'Direct Inquiries',
        badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
        isAlert: unreadMessagesCount > 0
      },
      { id: 'reports' as TabType, label: 'Analytics & Reports', shortLabel: 'Reports', icon: FileText, description: 'Cohort Retention Trends' },
    ].filter(item => accessibleIds.has(item.id));

    const groups: NavGroup[] = [];
    if (coreItems.length > 0) {
      groups.push({ id: 'core', title: 'Main Menu', items: coreItems });
    }
    if (academicItems.length > 0) {
      groups.push({ id: 'academic', title: 'Learning & Media', items: academicItems });
    }
    if (operationsItems.length > 0) {
      groups.push({ id: 'operations', title: 'Management & Services', items: operationsItems });
    }

    return groups;
  }, [userRole, userPermissions, unreadMessagesCount]);

  const rc = appUser ? (ROLE_COLORS[appUser.role] ?? ROLE_COLORS.student) : null;

  // Role-based feature visibility
  const canSeeCohort = appUser && COHORT_ADMIN_ROLES.has(appUser.role);
  const canSeeBroadcast = appUser && BROADCAST_ROLES.has(appUser.role) && onOpenBroadcast;
  const canSeeAuditLog = appUser && AUDIT_ROLES.has(appUser.role) && onOpenAuditLog;
  const canSeePINCheckin = onOpenPINCheckin && appUser && (appUser.role === 'admin' || appUser.role === 'teacher' || appUser.role === 'super_admin');
  const canSeeCloudBackup = appUser && (appUser.role === 'admin' || appUser.role === 'super_admin');

  return (
    <aside
      aria-label="Sidebar navigation"
      className={`hidden md:flex flex-col shrink-0 bg-white/95 dark:bg-[#07172b]/95 backdrop-blur-xl border-r border-slate-200/90 dark:border-[#1a385c] fixed top-0 left-0 bottom-0 h-screen max-h-screen z-40 transition-all duration-300 select-none overflow-hidden ${
        isCollapsed ? 'w-20' : 'w-64 lg:w-72'
      }`}
    >
      {/* 1. Header / Logo Zone */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-200/80 dark:border-[#1a385c]/80 min-h-[64px]">
        <button
          type="button"
          onClick={onGoHome}
          className={`flex items-center gap-3 cursor-pointer min-w-0 text-left transition-opacity hover:opacity-85 ${
            isCollapsed ? 'justify-center w-full' : ''
          }`}
          title="Go to HTEIM Home Dashboard"
        >
          <LogoImage
            alt="HTEIM Logo"
            className="w-9 h-9 shrink-0 rounded-xl object-contain bg-transparent p-0 shadow-2xs"
          />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                  HTEIM
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-[#b38f53] dark:text-[#dfc18b] border border-amber-500/30">
                  Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate leading-tight">
                School of Ministry
              </p>
            </div>
          )}
        </button>

        {!isCollapsed && (
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. User Profile Card / Login Banner */}
      <div className="p-3 border-b border-slate-200/70 dark:border-[#1a385c]/70">
        {appUser ? (
          <div
            className={`flex items-center gap-2.5 p-2 rounded-xl transition-all ${
              isCollapsed
                ? 'justify-center'
                : 'bg-slate-50/80 dark:bg-[#0c223c]/80 border border-slate-200/60 dark:border-[#1e3a5f]/60'
            }`}
          >
            <button
              type="button"
              onClick={onOpenLogin}
              className={`relative rounded-full flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 cursor-pointer ${
                isCollapsed ? 'w-10 h-10' : 'w-8 h-8'
              } ${rc?.avatar ?? 'bg-[#023264] text-white'}`}
              title={`Logged in as ${appUser.name} (${appUser.role}) — click to view profile`}
            >
              {appUser.name.charAt(0).toUpperCase()}
              {unreadMessagesCount > 0 && isCollapsed && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-600 border-2 border-white dark:border-slate-900 rounded-full" />
              )}
            </button>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {appUser.name}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${rc?.badge ?? 'bg-slate-100 text-slate-700'}`}>
                    {appUser.role}
                  </span>
                  {/* #7: Only show cohort switcher for admin-tier roles */}
                  {activeCohort && canSeeCohort && (
                    <button
                      type="button"
                      onClick={onOpenCohortModal}
                      className="text-[9px] text-slate-500 dark:text-slate-400 font-medium truncate hover:underline cursor-pointer"
                      title="Click to switch cohort"
                    >
                      · {activeCohort.name.replace('Class of ', "'")}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#023264] hover:bg-[#025798] text-white font-bold text-xs shadow-xs transition-all cursor-pointer border border-[#b38f53]/30 ${
              isCollapsed ? 'p-2' : ''
            }`}
            title="Sign In to Student or Faculty Portal"
          >
            <Lock className="w-3.5 h-3.5 text-[#dfc18b] shrink-0" />
            {!isCollapsed && <span>Sign In to Portal</span>}
          </button>
        )}
      </div>

      {/* 3. Global Quick Search Action */}
      <div className="px-3 pt-3 pb-1">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className={`w-full flex items-center gap-2 py-2 px-2.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer ${
            isCollapsed ? 'justify-center p-2' : ''
          }`}
          title={`Global Search & Quick Actions (${searchShortcut})`}
          aria-label="Search"
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left text-slate-500 dark:text-slate-400 font-medium">Quick Search...</span>
              {/* #9: Platform-aware keyboard shortcut */}
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-400 font-semibold shadow-2xs">
                {searchShortcut}
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* 4. Main Scrollable Navigation Links */}
      {/* #8: nav element is the landmark; each group gets role=navigation + aria-label for proper screen reader grouping */}
      <div
        className="flex-1 min-h-0 overflow-y-auto sidebar-scrollbar px-3 py-2 space-y-4"
        aria-label="Portal navigation"
      >
        {navGroups.map(group => (
          <nav
            key={group.id}
            aria-label={group.title}
            className="space-y-1"
          >
            {!isCollapsed && (
              <p
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2.5 py-1"
                aria-hidden="true"
              >
                {group.title}
              </p>
            )}

            <ul className="space-y-1 list-none p-0 m-0">
              {group.items.map(item => {
                const isActive = activeErpTab === item.id || (item.id === 'home' && activeErpTab === 'home');
                const Icon = item.icon;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      title={isCollapsed ? `${item.label} — ${item.description}` : item.description}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-left relative group ${
                        isActive
                          ? 'bg-gradient-to-r from-[#025798]/15 to-[#025798]/5 dark:from-[#025798]/30 dark:to-[#0277b8]/10 text-[#023264] dark:text-white font-bold border border-[#025798]/30 dark:border-[#0277b8]/40 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#0c223c]/80 border border-transparent'
                      } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    >
                      {/* #10: Animated sliding active accent bar using motion/react layoutId */}
                      <AnimatePresence>
                        {isActive && !isCollapsed && (
                          <motion.span
                            layoutId="sidebar-active-bar"
                            className="absolute left-0 top-2 bottom-2 w-1 bg-[#025798] dark:bg-[#7dd3fc] rounded-r-full"
                            initial={{ opacity: 0, scaleY: 0.6 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            exit={{ opacity: 0, scaleY: 0.6 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                      </AnimatePresence>

                      {/* #10: Icon scales up with spring when active */}
                      <motion.span
                        animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="shrink-0 flex items-center"
                      >
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive
                              ? 'text-[#025798] dark:text-[#7dd3fc]'
                              : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                          }`}
                        />
                      </motion.span>

                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{item.label}</span>
                            {item.badge !== undefined && (
                              <span
                                className={`text-[10px] min-w-4 h-4 px-1.5 rounded-full font-bold flex items-center justify-center shrink-0 ${
                                  item.isAlert
                                    ? 'bg-[#b38f53] text-white animate-pulse'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Collapsed Badge Pill Overlay */}
                      {isCollapsed && item.badge !== undefined && (
                        <span className="absolute top-1 right-1 min-w-3.5 h-3.5 px-1 rounded-full bg-[#b38f53] text-white text-[9px] font-bold flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
      </div>

      {/* 5. Bottom Utilities & Actions Zone */}
      <div className="p-3 border-t border-slate-200/80 dark:border-[#1a385c]/80 space-y-1">
        {/* Offline Status indicator */}
        {isOffline && (
          <div
            className={`flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-[11px] font-bold ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Application is currently in Offline Mode"
          >
            <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            {!isCollapsed && (
              <span className="truncate">
                Offline {pendingOfflineCount > 0 ? `· ${pendingOfflineCount} queued` : ''}
              </span>
            )}
          </div>
        )}

        {/* #5: Live Broadcast — surfaced for teacher/admin roles */}
        {canSeeBroadcast && (
          <UtilityButton
            icon={Radio}
            label="Live Broadcast"
            isCollapsed={isCollapsed}
            onClick={onOpenBroadcast}
            iconClassName="text-red-500"
            title="Start or join a live broadcast session"
          />
        )}

        {/* #5: Admin Audit Log — surfaced for admin/super_admin roles */}
        {canSeeAuditLog && (
          <UtilityButton
            icon={ClipboardList}
            label="Audit Log"
            isCollapsed={isCollapsed}
            onClick={onOpenAuditLog}
            iconClassName="text-indigo-500"
            title="View admin audit trail and system logs"
          />
        )}

        {/* Live PIN Check-in Quick Access for Faculty/Admin */}
        {canSeePINCheckin && (
          <UtilityButton
            icon={ShieldCheck}
            label="Live PIN Check-in"
            isCollapsed={isCollapsed}
            onClick={onOpenPINCheckin!}
            iconClassName="text-indigo-500"
            title="Open Live QR & PIN Check-in"
          />
        )}

        {/* Cloud Sync Backup for admins */}
        {canSeeCloudBackup && (
          <button
            type="button"
            onClick={onPushToCloud}
            disabled={isCloudSyncing}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 ${
              isCollapsed ? 'justify-center px-2' : ''
            }`}
            title="Push local changes to Supabase Cloud Backup"
            aria-label="Cloud Backup"
          >
            {isCloudSyncing ? (
              <RefreshCw className="w-4 h-4 text-[#025798] animate-spin shrink-0" />
            ) : (
              <Cloud className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            {!isCollapsed && <span className="truncate">{isCloudSyncing ? 'Syncing...' : 'Cloud Backup'}</span>}
          </button>
        )}

        {/* Divider before account actions */}
        <div className="border-t border-slate-200/60 dark:border-slate-700/60 my-1" />

        {/* #1: Labeled utility buttons — Settings, Help, Role Switch */}
        <UtilityButton
          icon={Sparkles}
          label="Switch Role"
          isCollapsed={isCollapsed}
          onClick={onOpenRoleSwitch}
          iconClassName="text-amber-500"
          title="Switch Role Preview (Student / Faculty / Admin)"
        />

        <UtilityButton
          icon={Settings}
          label="Settings"
          isCollapsed={isCollapsed}
          onClick={onOpenSettings}
          title="Portal Settings"
        />

        <UtilityButton
          icon={HelpCircle}
          label="Help & Guide"
          isCollapsed={isCollapsed}
          onClick={onOpenHelp}
          title="User Guide & System Help"
        />

        {/* #2: Logout button — only shown when user is logged in */}
        {appUser && (
          <UtilityButton
            icon={LogOut}
            label="Sign Out"
            isCollapsed={isCollapsed}
            onClick={onLogout}
            iconClassName="text-red-400"
            labelClassName="text-red-600 dark:text-red-400"
            className="hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300"
            title="Sign out of the portal"
          />
        )}

        {/* #4: Persistent expand toggle at the bottom when collapsed */}
        {isCollapsed && (
          <button
            type="button"
            onClick={handleToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="w-full flex items-center justify-center p-2 mt-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* #4: Persistent collapse tab handle on the right edge — always visible regardless of scroll */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full flex items-center justify-center w-4 h-10 rounded-r-lg bg-slate-200/80 dark:bg-[#1a385c]/80 hover:bg-slate-300 dark:hover:bg-[#22488a] text-slate-500 dark:text-slate-300 transition-colors cursor-pointer z-50 shadow-sm"
      >
        {isCollapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />
        }
      </button>
    </aside>
  );
}

export default AppSidebar;
