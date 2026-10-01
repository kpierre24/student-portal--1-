import React, { useRef, useEffect, useState } from 'react';
import { LogoImage } from './LogoImage';
import { NotificationCenter } from './NotificationCenter';
import { SyncIndicator } from './SyncIndicator';
import {
  GraduationCap,
  ChevronDown,
  MessageSquare,
  Sparkles,
  Play,
  Search,
  Radio,
  ShieldCheck,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  Lock,
  Menu,
} from 'lucide-react';
import { AppUser } from '../lib/userAuth';
import { TabType, AppNotification, Cohort } from '../types';

export interface AppHeaderProps {
  activeCohort: Cohort | null;
  onOpenCohortModal: () => void;
  onGoHome: () => void;
  appUser: AppUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onNavigate: (tab: TabType) => void;
  unreadMessagesCount: number;
  filteredNotifications: AppNotification[];
  onMarkNotifAsRead: (id: string) => void;
  onMarkAllNotifsAsRead: () => void;
  onClearNotifs: () => void;
  onSelectNotif: (notif: AppNotification) => void;
  onTriggerNotifScan: () => void;
  onAddTestNotif: (notif: AppNotification) => void;
  onOpenIntro: () => void;
  onOpenPresentation: () => void;
  onOpenCommandPalette: () => void;
  onOpenRoleSwitch: () => void;
  /** @deprecated Cloud sync actions moved to the sidebar. Kept for prop compatibility. */
  isCloudSyncing?: boolean;
  /** @deprecated Cloud sync actions moved to the sidebar. Kept for prop compatibility. */
  onPushToCloud?: () => void;
  /** @deprecated Sheet sync controls moved to the sidebar. Kept for prop compatibility. */
  dataSource?: string;
  /** @deprecated Sheet sync controls moved to the sidebar. Kept for prop compatibility. */
  isLoading?: boolean;
  /** @deprecated Sheet sync controls moved to the sidebar. Kept for prop compatibility. */
  onLoadSheets?: (e?: React.FormEvent, customUrl?: string) => void;
  onOpenBroadcast: () => void;
  onOpenAuditLog: () => void;
  onOpenUserManagement: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onToggleMobileDrawer: () => void;
  onOpenOfflineDrawer?: () => void;
  onOpenPINCheckin?: () => void;
  isOffline?: boolean;
  pendingOfflineCount?: number;
}

const ROLE_COLORS: Record<string, { avatar: string; label: string }> = {
  super_admin: {
    avatar: 'bg-purple-700 text-white dark:bg-purple-950 dark:text-purple-200',
    label: 'text-purple-700 dark:text-purple-300',
  },
  admin: {
    avatar: 'bg-[#023264] text-white dark:bg-[#dceaf8] dark:text-[#023264]',
    label: 'text-[#025798] dark:text-[#7dd3fc]',
  },
  registrar: {
    avatar: 'bg-blue-600 text-white dark:bg-blue-950 dark:text-blue-200',
    label: 'text-blue-600 dark:text-blue-400',
  },
  lecturer: {
    avatar: 'bg-[#01883c] text-white dark:bg-[#d1fae5] dark:text-[#01883c]',
    label: 'text-[#01883c] dark:text-[#4ade80]',
  },
  teacher: {
    avatar: 'bg-[#01883c] text-white dark:bg-[#d1fae5] dark:text-[#01883c]',
    label: 'text-[#01883c] dark:text-[#4ade80]',
  },
  student: {
    avatar: 'bg-[#b38f53] text-white dark:bg-[#fef3c7] dark:text-[#8c6a32]',
    label: 'text-[#b38f53] dark:text-[#dfc18b]',
  },
  finance_officer: {
    avatar: 'bg-emerald-700 text-white dark:bg-emerald-950 dark:text-emerald-200',
    label: 'text-emerald-700 dark:text-emerald-400',
  },
  librarian: {
    avatar: 'bg-amber-600 text-white dark:bg-amber-950 dark:text-amber-200',
    label: 'text-amber-600 dark:text-amber-400',
  },
  viewer: {
    avatar: 'bg-slate-600 text-white dark:bg-slate-800 dark:text-slate-300',
    label: 'text-slate-600 dark:text-slate-400',
  },
};

export function AppHeader({
  activeCohort, onOpenCohortModal, onGoHome,
  appUser, onOpenLogin, onLogout,
  onNavigate,
  unreadMessagesCount,
  filteredNotifications, onMarkNotifAsRead, onMarkAllNotifsAsRead,
  onClearNotifs, onSelectNotif, onTriggerNotifScan, onAddTestNotif,
  onOpenIntro, onOpenPresentation, onOpenCommandPalette, onOpenRoleSwitch,
  onOpenBroadcast, onOpenAuditLog, onOpenUserManagement, onOpenSettings, onOpenHelp,
  onToggleMobileDrawer, onOpenOfflineDrawer, onOpenPINCheckin,
  isOffline = false, pendingOfflineCount = 0,
}: AppHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);

  // Close on Escape
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowUserMenu(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showUserMenu]);

  const rc = appUser ? (ROLE_COLORS[appUser.role] ?? ROLE_COLORS.student) : null;

  return (
    <header className="relative bg-white/85 dark:bg-[#08182c]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-[#1a385c] px-3 sm:px-4 py-2 sm:py-2.5 shadow-xs mb-3 flex-shrink-0 sticky top-2 z-40 max-w-full overflow-visible transition-all rounded-xl">
      {/* Accent underline gradient */}
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-[#023264]/0 via-[#025798]/60 via-[#b38f53]/70 to-[#0277b8]/0 pointer-events-none" />

      <div className="flex items-center justify-between gap-2 sm:gap-3 flex-nowrap">

        {/* ── Left: Logo + Org Name + Cohort Badge ── */}
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0 shrink group" onClick={onGoHome}>
          <LogoImage
            alt="HTEIM Logo"
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl object-contain bg-transparent p-0 group-hover:opacity-80 transition-opacity"
          />
          <div className="min-w-0 shrink flex items-center gap-1.5 sm:gap-2">
            <h1 className="font-display text-xs sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
              <span className="hidden sm:inline">HTEIM School of Ministry</span>
              <span className="sm:hidden">HTEIM</span>
            </h1>

            {/* Cohort pill — interactive for admin, static badge for others */}
            {appUser && appUser.role === 'admin' ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenCohortModal(); }}
                className="hidden min-[380px]:inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/90 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all cursor-pointer shadow-2xs shrink-0"
                title="Click to manage academic cohorts"
              >
                <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="hidden xs:inline">{activeCohort?.name || 'Class of 2026'}</span>
                <span className="xs:hidden">{activeCohort?.name ? activeCohort.name.replace('Class of ', "'") : "'26"}</span>
                <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-70 shrink-0" />
              </button>
            ) : (
              <span
                className="hidden min-[380px]:inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs shrink-0 cursor-default"
                title={`Academic cohort: ${activeCohort?.name || 'Class of 2026'}`}
              >
                <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="hidden xs:inline">{activeCohort?.name || 'Class of 2026'}</span>
                <span className="xs:hidden">{activeCohort?.name ? activeCohort.name.replace('Class of ', "'") : "'26"}</span>
              </span>
            )}
          </div>
        </div>

        {/* ── Right: Action Controls ── */}
        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0 flex-nowrap justify-end">

          {/* Sync / Offline status indicator */}
          <SyncIndicator
            isOnline={!isOffline}
            isSyncing={false}
            pendingCount={pendingOfflineCount}
            onClick={onOpenOfflineDrawer}
          />

          {/* Global Search / Command Palette shortcut */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Global Search & Commands (⌘K)"
            aria-label="Open command palette"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Search</span>
            <kbd className="text-[9px] font-mono px-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-400 font-semibold shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Messages & Notifications (logged-in only) */}
          {appUser && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('messages')}
                aria-label="Open messages"
                className="relative p-2 rounded-lg transition-colors cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                title="Messages"
              >
                <MessageSquare className="w-4 h-4" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center px-1">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
              <NotificationCenter
                notifications={filteredNotifications}
                onMarkAsRead={onMarkNotifAsRead}
                onMarkAllAsRead={onMarkAllNotifsAsRead}
                onClearNotifications={onClearNotifs}
                onSelectNotification={onSelectNotif}
                onTriggerScan={onTriggerNotifScan}
                onAddTestNotification={onAddTestNotif}
                currentRole={appUser.role}
                currentStudentName={appUser.studentName || appUser.name}
              />
            </>
          )}

          {/* ── User Account Menu OR Sign-in ── */}
          <div className="relative shrink-0" ref={userMenuRef}>
            {appUser ? (
              <>
                {/* Logged-in: Avatar pill trigger */}
                <button
                  type="button"
                  id="user-menu-trigger"
                  onClick={() => setShowUserMenu(prev => !prev)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1 pr-2 sm:pr-2.5 rounded-full transition-all cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0e2540] border border-slate-200/80 dark:border-[#1a385c]"
                  aria-label={`User account: ${appUser.name}`}
                  aria-expanded={showUserMenu}
                  aria-haspopup="true"
                  title="Account, Workspace & Role Settings"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs ${rc?.avatar ?? ''}`}>
                    {appUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col text-left leading-none pr-0.5">
                    <span className="text-xs font-bold truncate max-w-[100px]">{appUser.name.split(' ')[0]}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${rc?.label ?? 'text-slate-400'}`}>{appUser.role}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Panel */}
                {showUserMenu && (
                  <div
                    role="menu"
                    aria-labelledby="user-menu-trigger"
                    className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-fade-slide-up"
                    style={{ boxShadow: '0 20px 40px -8px rgba(0,0,0,0.15), 0 8px 16px -4px rgba(0,0,0,0.08)' }}
                  >
                    {/* Identity Card */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 mb-1">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs shrink-0 ${rc?.avatar ?? ''}`}>
                          {appUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{appUser.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {(appUser as any).email || appUser.studentName || 'HTEIM Portal'}
                          </p>
                          <span className={`inline-block text-[9px] font-extrabold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-700 border border-slate-200/80 dark:border-slate-600 ${rc?.label ?? 'text-slate-400'}`}>
                            {appUser.role}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setShowUserMenu(false); onOpenLogin(); }}
                        className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        <span>Account Settings</span>
                      </button>
                    </div>

                    {/* Switch Role */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setShowUserMenu(false); onOpenRoleSwitch(); }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span>Switch Role / View As</span>
                    </button>

                    {/* Admin-only section */}
                    {appUser.role === 'admin' && (
                      <div className="mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2.5 py-0.5">Admin Tools</p>
                        {[
                          { icon: <Radio className="w-3.5 h-3.5 text-slate-500" />, label: 'Broadcast Announcements', action: onOpenBroadcast },
                          { icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />, label: 'Audit Log', action: onOpenAuditLog },
                          { icon: <Users className="w-3.5 h-3.5 text-slate-500" />, label: 'User Management', action: onOpenUserManagement },
                          { icon: <Settings className="w-3.5 h-3.5 text-slate-500" />, label: 'Portal Settings', action: onOpenSettings },
                        ].map(({ icon, label, action }) => (
                          <button
                            key={label}
                            type="button"
                            role="menuitem"
                            onClick={() => { setShowUserMenu(false); action(); }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            {icon}
                            <span>{label}</span>
                          </button>
                        ))}
                        {onOpenPINCheckin && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { setShowUserMenu(false); onOpenPINCheckin(); }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Live QR & PIN Check-in</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Help & Resources */}
                    <div className="mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2.5 py-0.5">Resources</p>
                      {[
                        { icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />, label: 'Interactive Tour (6s)', action: onOpenIntro },
                        { icon: <Play className="w-3.5 h-3.5 text-slate-500" />, label: '30s Feature Demo', action: onOpenPresentation },
                        { icon: <HelpCircle className="w-3.5 h-3.5 text-slate-500" />, label: 'Help & Documentation', action: onOpenHelp },
                      ].map(({ icon, label, action }) => (
                        <button
                          key={label}
                          type="button"
                          role="menuitem"
                          onClick={() => { setShowUserMenu(false); action(); }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {icon}
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Sign Out */}
                    <div className="mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setShowUserMenu(false); onLogout(); }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Guest: Sign In + Help */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setShowUserMenu(false); onOpenHelp(); }}
                    className="hidden sm:inline-flex p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Help & Documentation"
                    aria-label="Help"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer bg-[#023264] hover:bg-[#025798] text-white font-bold text-xs shadow-xs whitespace-nowrap border border-[#b38f53]/30"
                    aria-label="Sign In to Portal"
                    title="Sign in to Student or Faculty Portal"
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0 text-[#dfc18b]" />
                    <span>Sign In</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile Drawer Toggle (md and below only) */}
          <button
            type="button"
            onClick={onToggleMobileDrawer}
            aria-label="Toggle navigation drawer"
            title="Open Navigation Menu"
            className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden shrink-0 cursor-pointer transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>
        </div>
      </div>
    </header>
  );
}
