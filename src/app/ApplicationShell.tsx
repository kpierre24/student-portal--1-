import React from 'react';
import { 
  WifiOff, 
  CloudOff, 
  AlertCircle, 
  Database, 
  CheckCircle2, 
  X, 
  Smartphone, 
  Sparkles,
  LucideIcon,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';
import { TabType, AppNotification, Cohort } from '../types';
import { AppUser } from '../lib/userAuth';
import { AppHeader } from '../components/AppHeader';
import { PortalFooter, MobileBottomNav, MobileMoreMenuDrawer, BackToTopButton, AppSidebar } from '../components/layout';
import { FloatingQuizBanner } from '../features/assignments';
import { OfflineSyncDrawer } from '../components/OfflineSyncDrawer';
import { PWAUpdateNotification } from '../components/PWAUpdateNotification';
import { A11yLiveRegion } from '../components/shared/A11yLiveRegion';

export interface ApplicationShellProps {
  children: React.ReactNode;
  activeErpTab: TabType;
  handleNavigate: (tab: TabType) => void;
  appUser: AppUser | null;
  unreadMessagesCount: number;

  // Banners & Cloud/Offline status
  isOffline?: boolean;
  cloudSyncError?: string | null;
  pendingConflicts?: any[];
  supabaseTableMissing?: boolean;
  syncedBannerMessage?: string | null;
  setSyncedBannerMessage?: (msg: string | null) => void;
  pwaInstallable?: boolean;
  onTriggerPwaInstall?: () => void;
  onOpenMobileDownload?: () => void;
  onPushToCloud?: () => Promise<void>;
  isCloudSyncing?: boolean;
  onOpenOfflineDrawer?: () => void;
  onVerifySupabase?: () => void;

  // Header props
  activeCohort?: Cohort | null;
  onOpenCohortModal?: () => void;
  onGoHome?: () => void;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  filteredNotifications?: AppNotification[];
  onMarkNotifAsRead?: (id: string) => void;
  onMarkAllNotifsAsRead?: () => void;
  onClearNotifs?: () => void;
  onSelectNotif?: (notif: AppNotification) => void;
  onTriggerNotifScan?: () => void;
  onAddTestNotif?: (notif: AppNotification) => void;
  onOpenIntro?: () => void;
  onOpenPresentation?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenRoleSwitch?: () => void;
  dataSource?: string;
  isLoading?: boolean;
  onLoadSheets?: (e?: React.FormEvent, customUrl?: string) => void;
  onOpenBroadcast?: () => void;
  onOpenAuditLog?: () => void;
  onOpenUserManagement?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  onOpenPINCheckin?: () => void;

  // Footer & Drawer state
  classDays?: any[];
  records?: any[];
  studentsCount?: number;
  payments?: any[];
  lastSyncedTime?: string | Date | null;
  autoSyncInterval?: number;
  syncOnTabFocus?: boolean;
  sheetMergePolicy?: string;
  onOpenSyncConflictModal?: () => void;
  onOpenCloudDiagnosticModal?: () => void;
  onOpenExportModal?: () => void;
  onOpenClassDaysModal?: () => void;
  onOpenRoleModal?: () => void;
  onOpenGuideModal?: () => void;
  onOpenNotificationCenter?: () => void;

  // Mobile nav & Quiz banner
  showMobileMoreMenu: boolean;
  setShowMobileMoreMenu: React.Dispatch<React.SetStateAction<boolean>>;
  activeQuizzesList?: any[];
  showFloatingQuizBanner?: boolean;
  setShowFloatingQuizBanner?: (show: boolean) => void;
  showOfflineDrawer?: boolean;
  setShowOfflineDrawer?: (show: boolean) => void;
}

export function ApplicationShell({
  children,
  activeErpTab,
  handleNavigate,
  appUser,
  unreadMessagesCount,
  isOffline = false,
  cloudSyncError = null,
  pendingConflicts = [],
  supabaseTableMissing = false,
  syncedBannerMessage = null,
  setSyncedBannerMessage,
  pwaInstallable = false,
  onTriggerPwaInstall,
  onOpenMobileDownload,
  onPushToCloud,
  isCloudSyncing = false,
  onOpenOfflineDrawer,
  onVerifySupabase,
  activeCohort = null,
  onOpenCohortModal = () => {},
  onGoHome = () => {},
  onOpenLogin = () => {},
  onLogout = () => {},
  filteredNotifications = [],
  onMarkNotifAsRead = () => {},
  onMarkAllNotifsAsRead = () => {},
  onClearNotifs = () => {},
  onSelectNotif = () => {},
  onTriggerNotifScan = () => {},
  onAddTestNotif = () => {},
  onOpenIntro = () => {},
  onOpenPresentation = () => {},
  onOpenCommandPalette = () => {},
  onOpenRoleSwitch = () => {},
  dataSource = 'Local Storage',
  isLoading = false,
  onLoadSheets = () => {},
  onOpenBroadcast = () => {},
  onOpenAuditLog = () => {},
  onOpenUserManagement = () => {},
  onOpenSettings = () => {},
  onOpenHelp = () => {},
  onOpenPINCheckin = () => {},
  classDays = [],
  records = [],
  studentsCount = 0,
  payments = [],
  lastSyncedTime = null,
  autoSyncInterval = 30,
  syncOnTabFocus = true,
  sheetMergePolicy = 'manual',
  onOpenSyncConflictModal = () => {},
  onOpenCloudDiagnosticModal = () => {},
  onOpenExportModal = () => {},
  onOpenClassDaysModal = () => {},
  onOpenRoleModal = () => {},
  onOpenGuideModal = () => {},
  onOpenNotificationCenter = () => {},
  showMobileMoreMenu,
  setShowMobileMoreMenu,
  activeQuizzesList = [],
  showFloatingQuizBanner = false,
  setShowFloatingQuizBanner = () => {},
  showOfflineDrawer = false,
  setShowOfflineDrawer = () => {},
}: ApplicationShellProps) {
  const [pendingOfflineCount, setPendingOfflineCount] = React.useState<number>(0);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('hteim_sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const [showSqlSetup, setShowSqlSetup] = React.useState(false);
  const [copiedSql, setCopiedSql] = React.useState(false);
  const [pwaBannerDismissed, setPwaBannerDismissed] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('hteim_pwa_banner_dismissed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleCopySql = React.useCallback(() => {
    const sql = `create table if not exists app_states (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by text
);
alter table app_states enable row level security;
create policy "Allow public read access" on app_states for select using (true);
create policy "Allow public insert" on app_states for insert with check (true);
create policy "Allow public update" on app_states for update using (true) with check (true);`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  }, []);

  const handleToggleSidebar = React.useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('hteim_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  React.useEffect(() => {
    const updateCount = () => {
      try {
        const raw = localStorage.getItem('hteim_offline_queue');
        const q = raw ? JSON.parse(raw) : [];
        setPendingOfflineCount(q.filter((i: any) => i.status === 'pending').length);
      } catch {
        setPendingOfflineCount(0);
      }
    };
    updateCount();
    window.addEventListener('storage', updateCount);
    return () => window.removeEventListener('storage', updateCount);
  }, [isOffline]);

  return (
    <>
      <A11yLiveRegion />
      <a href="#main-workspace" className="md-skip-link">Skip to main content</a>
      <div className="min-h-screen w-full app-ambient-shell text-slate-900 dark:text-slate-100 font-sans select-text">
        {/* Fixed Desktop Sidebar Navigation with Grouped Tabs */}
        <AppSidebar
          activeErpTab={activeErpTab}
          handleNavigate={handleNavigate}
          appUser={appUser}
          unreadMessagesCount={unreadMessagesCount}
          activeCohort={activeCohort}
          onOpenCohortModal={onOpenCohortModal}
          onGoHome={onGoHome}
          onOpenLogin={onOpenLogin}
          onLogout={onLogout}
          onOpenCommandPalette={onOpenCommandPalette}
          onOpenRoleSwitch={onOpenRoleSwitch}
          onOpenSettings={onOpenSettings}
          onOpenHelp={onOpenHelp}
          onOpenBroadcast={onOpenBroadcast}
          onOpenAuditLog={onOpenAuditLog}
          onOpenPINCheckin={onOpenPINCheckin}
          onPushToCloud={onPushToCloud}
          isCloudSyncing={isCloudSyncing}
          isOffline={isOffline}
          pendingOfflineCount={pendingOfflineCount}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        {/* Main Content Area with offset for fixed sidebar */}
        <div
          className={`flex flex-col min-w-0 p-2.5 sm:p-5 md:p-6 pb-mobile-nav md:pb-6 transition-all duration-300 ${
            sidebarCollapsed ? 'md:ml-20' : 'md:ml-64 lg:ml-72'
          }`}
        >
          {/* App Header (anchors the top of workspace) */}
          <AppHeader
            activeCohort={activeCohort}
            onOpenCohortModal={onOpenCohortModal}
            onGoHome={onGoHome}
            appUser={appUser}
            onOpenLogin={onOpenLogin}
            onLogout={onLogout}
            onNavigate={handleNavigate}
            unreadMessagesCount={unreadMessagesCount}
            filteredNotifications={filteredNotifications}
            onMarkNotifAsRead={onMarkNotifAsRead}
            onMarkAllNotifsAsRead={onMarkAllNotifsAsRead}
            onClearNotifs={onClearNotifs}
            onSelectNotif={onSelectNotif}
            onTriggerNotifScan={onTriggerNotifScan}
            onAddTestNotif={onAddTestNotif}
            onOpenIntro={onOpenIntro}
            onOpenPresentation={onOpenPresentation}
            onOpenCommandPalette={onOpenCommandPalette}
            onOpenRoleSwitch={onOpenRoleSwitch}
            isCloudSyncing={isCloudSyncing}
            onPushToCloud={onPushToCloud}
            dataSource={dataSource}
            isLoading={isLoading}
            onLoadSheets={onLoadSheets}
            onOpenBroadcast={onOpenBroadcast}
            onOpenAuditLog={onOpenAuditLog}
            onOpenUserManagement={onOpenUserManagement}
            onOpenSettings={onOpenSettings}
            onOpenHelp={onOpenHelp}
            onToggleMobileDrawer={() => setShowMobileMoreMenu(true)}
            onOpenOfflineDrawer={onOpenOfflineDrawer ? onOpenOfflineDrawer : () => setShowOfflineDrawer(true)}
            onOpenPINCheckin={onOpenPINCheckin}
            isOffline={isOffline}
            pendingOfflineCount={pendingOfflineCount}
          />

          {/* Status & Diagnostic Banners (docked directly under header) */}
          {(isOffline || cloudSyncError || pendingConflicts.length > 0 || supabaseTableMissing || syncedBannerMessage || (pwaInstallable && !pwaBannerDismissed)) && (
            <div className="flex flex-col gap-2 mb-3">
              {/* Compact Offline Status Pill */}
              {isOffline && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => (onOpenOfflineDrawer ? onOpenOfflineDrawer() : setShowOfflineDrawer(true))}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-xs hover:bg-amber-200 dark:hover:bg-amber-900 transition-all cursor-pointer animate-fade-slide-up"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>
                      Offline {pendingOfflineCount > 0 ? `· ${pendingOfflineCount} change${pendingOfflineCount === 1 ? '' : 's'} waiting` : ''}
                    </span>
                  </button>
                </div>
              )}

              {/* Cloud Sync Error Banner */}
              {cloudSyncError && !isOffline && (
                <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs" role="alert">
                  <div className="flex items-center gap-2 min-w-0">
                    <CloudOff className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                    <span className="font-medium">{cloudSyncError}</span>
                  </div>
                  {onPushToCloud && (
                    <button
                      type="button"
                      onClick={onPushToCloud}
                      disabled={isCloudSyncing}
                      className="md-btn-tonal text-xs px-3 py-1.5 shrink-0"
                    >
                      {isCloudSyncing ? 'Retrying…' : 'Retry sync'}
                    </button>
                  )}
                </div>
              )}

              {/* Pending Conflicts Banner */}
              {pendingConflicts.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900 text-orange-900 dark:text-orange-200 text-xs px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs" role="alert">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0 text-orange-600 dark:text-orange-400" aria-hidden="true" />
                    <span className="font-medium">{pendingConflicts.length} attendance sync conflict{pendingConflicts.length === 1 ? '' : 's'} need review.</span>
                  </div>
                  <button type="button" onClick={() => handleNavigate('attendance')} className="md-btn-tonal text-xs px-3 py-1.5 shrink-0">Review conflicts</button>
                </div>
              )}

              {/* Supabase Table Missing Banner - Collapsible & Non-Intrusive */}
              {supabaseTableMissing && (
                <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl p-3.5 text-slate-800 dark:text-slate-200 animate-fade-slide-up shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg shrink-0">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-red-900 dark:text-red-200">Supabase Setup: Missing Table</h4>
                        <p className="text-[11px] text-red-700 dark:text-red-300">
                          The <code className="bg-red-100 dark:bg-red-900/60 px-1 py-0.5 rounded font-mono text-[10px]">app_states</code> table doesn't exist yet.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                      >
                        {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                        <span>{copiedSql ? 'Copied SQL' : 'Copy SQL'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSqlSetup(prev => !prev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/60 dark:hover:bg-red-900 text-red-800 dark:text-red-200 transition-colors cursor-pointer"
                      >
                        <span>{showSqlSetup ? 'Hide SQL' : 'View SQL'}</span>
                        {showSqlSetup ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {onVerifySupabase && (
                        <button
                          type="button"
                          onClick={onVerifySupabase}
                          className="px-3 py-1 text-xs font-bold rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-2xs"
                        >
                          Verify Setup
                        </button>
                      )}
                    </div>
                  </div>

                  {showSqlSetup && (
                    <div className="mt-2.5 pt-2 border-t border-red-200/60 dark:border-red-900/60 animate-fade-slide-up">
                      <p className="text-[11px] text-red-700 dark:text-red-300 mb-1.5 font-medium">
                        Copy and run this in your Supabase SQL Editor:
                      </p>
                      <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg text-[11px] font-mono select-all max-h-36 overflow-y-auto custom-scrollbar">
                        {`create table if not exists app_states (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_by text
);
alter table app_states enable row level security;
create policy "Allow public read access" on app_states for select using (true);
create policy "Allow public insert" on app_states for insert with check (true);
create policy "Allow public update" on app_states for update using (true) with check (true);`}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Synced Success Banner */}
              {syncedBannerMessage && (
                <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between shadow-xs animate-fade-slide-up">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-medium">{syncedBannerMessage}</span>
                  </div>
                  {setSyncedBannerMessage && (
                    <button onClick={() => setSyncedBannerMessage(null)} className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer" aria-label="Dismiss synced message">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* PWA Install Banner with Dismiss */}
              {pwaInstallable && !pwaBannerDismissed && (
                <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 shadow-xs animate-fade-slide-up">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate font-medium">Install HTEIM as a standalone app for fast access and offline study.</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {onTriggerPwaInstall && (
                      <button
                        type="button"
                        onClick={onTriggerPwaInstall}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--color-primary)] text-white hover:opacity-90 dark:bg-sky-600 cursor-pointer"
                      >
                        Install App
                      </button>
                    )}
                    {onOpenMobileDownload && (
                      <button
                        type="button"
                        onClick={onOpenMobileDownload}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        Instructions
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPwaBannerDismissed(true);
                        try { localStorage.setItem('hteim_pwa_banner_dismissed', 'true'); } catch {}
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                      title="Dismiss install banner"
                      aria-label="Dismiss install banner"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sacred Scripture Motto Ribbon */}
          <div className="scripture-ribbon relative overflow-hidden px-3 py-1.5 text-center text-[10px] sm:text-[11px] text-slate-700 dark:text-[#dfc18b] font-medium tracking-wide flex items-center justify-center gap-2 rounded-xl mb-3 shadow-2xs border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5 backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-shimmer pointer-events-none" />
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-gentle-float" />
            <span className="truncate min-w-0 font-semibold relative z-10">"Study to shew thyself approved unto God, a workman that needeth not to be ashamed" — 2 Timothy 2:15</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 hidden md:inline animate-gentle-float" />
          </div>

          {/* Main Workspace Area */}
          <main id="main-workspace" tabIndex={-1} className="flex flex-col flex-1 gap-6 relative min-h-[calc(100vh-220px)] sm:min-h-[calc(100vh-240px)] pb-24 md:pb-8">
            {children}
          </main>

          {/* Portal Footer */}
          <PortalFooter
            appUser={appUser}
            onOpenGuide={onOpenGuideModal}
            onOpenSettings={onOpenSettings}
          />
        </div>

        {/* Floating Quiz Banner */}
        <FloatingQuizBanner
          appUser={appUser}
          activeQuizzesList={activeQuizzesList}
          showFloatingQuizBanner={showFloatingQuizBanner}
          onDismiss={() => setShowFloatingQuizBanner(false)}
          onTakeQuiz={() => handleNavigate('exams')}
        />

        {/* Offline Sync Queue Drawer */}
        <OfflineSyncDrawer
          isOpen={showOfflineDrawer}
          onClose={() => setShowOfflineDrawer(false)}
          isOnline={!isOffline}
          onTriggerFullSync={async () => {
            if (onPushToCloud) await onPushToCloud();
          }}
        />

        {/* Mobile Navigation Drawer */}
        <MobileMoreMenuDrawer
          isOpen={showMobileMoreMenu}
          onClose={() => setShowMobileMoreMenu(false)}
          activeErpTab={activeErpTab}
          setActiveErpTab={handleNavigate}
          appUser={appUser}
          uniqueStudentsCount={studentsCount}
          unreadMessagesCount={unreadMessagesCount}
          setShowLoginModal={onOpenLogin}
          setShowLiveCheckinModal={onOpenPINCheckin}
          liveCheckinDayId={null}
          setLiveCheckinDayId={() => {}}
          classDays={classDays}
          setShowIntro={onOpenIntro}
          setShowCommandPalette={onOpenCommandPalette}
          setShowSettingsModal={onOpenSettings}
          setShowRoleMenu={onOpenRoleSwitch}
        />

        {/* Mobile Bottom Navigation Dock */}
        <MobileBottomNav
          appUser={appUser}
          activeErpTab={activeErpTab}
          handleNavigate={handleNavigate}
          showMobileMoreMenu={showMobileMoreMenu}
          setShowMobileMoreMenu={setShowMobileMoreMenu}
          unreadMessagesCount={unreadMessagesCount}
        />

        {/* PWA New Version Update Notification (Step 7.3) */}
        <PWAUpdateNotification />

        {/* Floating Back-To-Top Button */}
        <BackToTopButton />
      </div>
    </>
  );
}

export default ApplicationShell;
