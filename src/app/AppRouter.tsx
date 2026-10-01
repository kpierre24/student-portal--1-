import React, { useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { ApplicationShell } from './ApplicationShell';
import { PortalModalsContainer } from '../components/PortalModalsContainer';
import { usePortalState } from './usePortalState';
import { navigation, getNavigationItem, isNavigationAccessible } from './navigation';
import { TabType } from '../types';
import { PageLoader } from '../components/PageLoader';
import { OutstandingPaymentBanner } from '../components/OutstandingPaymentBanner';
import { PublicQuizPage } from '../components/PublicQuizPage';
import { filterNotificationsForUser } from '../lib/notifications';
import { testSupabaseConnection } from '../lib/supabaseSync';
import { trackUxEvent } from '../lib/uxTelemetry';

const pageFadeVariants = {
  initial: { opacity: 0, y: 8, filter: 'blur(3px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -6, filter: 'blur(2px)' },
};

const pageFadeTransition = {
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1] as const,
};

export function AppRouter() {
  const state = usePortalState();

  // Handle global keybindings (Ctrl+K for command palette, Esc to close modals)
  const setShowCommandPalette = state.setShowCommandPalette;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setShowCommandPalette]);

  // Map state to props for active page tab
  const getPropsForTab = (tabId: string) => {
    switch (tabId) {
      case 'home':
        return {
          onNavigate: (tab: TabType) => state.handleNavigate(tab),
          appUser: state.appUser,
          onOpenLogin: () => state.setShowLoginModal(true),
          onLogout: () => state.setAppUser(null),
          onOpenPresentationDemo: () => state.setShowPresentationModal(true),
          studentsCount: state.uniqueStudents.length,
          students: state.uniqueStudents,
          payments: state.payments,
          classDays: state.classDays,
          records: state.records,
          coursesCount: state.courses.length || 6,
          classDaysCount: state.effectiveClassDays.length,
          avgAttendanceRate: state.avgAttendance,
          onPlayIntro: () => state.setShowIntro(true),
          pendingAssignmentsCount: state.pendingAssignmentsCount,
          uncollectedTuitionAmount: state.uncollectedTuitionAmount,
          libraryResourcesCount: state.libraryResources.length,
          nextClassTitle: state.classDays.length > 0 ? state.classDays[state.classDays.length - 1].name : 'Session 1',
          isCloudSyncing: state.isCloudSyncing,
          cloudSyncError: state.cloudSyncError,
          lastSyncedTime: state.lastSyncedTime,
          onPushToCloud: state.handlePushToCloud,
          userEmail: state.user?.email,
          supabaseTableMissing: state.supabaseTableMissing,
          atRiskThreshold: state.atRiskThreshold,
          customAssignments: state.customAssignments,
          submissions: state.submissions,
          facultyTeachers: state.facultyTeachers,
          onSaveFacultyTeachers: async (newList: any[]) => {
            state.setFacultyTeachers(newList);
            try {
              localStorage.setItem('hteim_faculty_teachers_v1', JSON.stringify(newList));
            } catch (e) {}
          },
          onTakeQuiz: () => state.setActiveErpTab('exams'),
          onOpenAdminAuditModal: () => state.setShowAdminAuditModal(true),
          onOpenSystemHealth: () => state.setShowDiagnosticModal(true),
        };

      case 'attendance':
        return {
          appUser: state.appUser,
          currentStudentPortalData: state.currentStudentPortalData,
          classDays: state.classDays,
          rubricScores: state.rubricScores,
          onUpdateStudentPhoto: state.handleUpdateStudentPhoto,
          onRequestTranscript: (s: any) => {
            const found = state.uniqueStudents.find(u => u.name === s.name);
            if (found) {
              state.setSelectedStudent(found);
              state.setShowStudentTranscriptModal(true);
            }
          },
          onRequestCertificate: (s: any) => {
            state.setCertificateData({
              studentName: s.name,
              awardTitle: s.rate >= 100 ? 'Perfect Attendance Honor Distinction' : 'Ministry Academic Completion Award',
              criteria: `Demonstrated commitment with ${s.rate.toFixed(1)}% class attendance.`,
              rate: s.rate,
              avgScore: s.avgScore ?? undefined,
            });
            state.setShowCertificateModal(true);
          },
          atRiskThreshold: state.atRiskThreshold,
          satisfactoryThreshold: state.satisfactoryThreshold,
          records: state.records,
          uniqueStudents: state.uniqueStudents,
          excusedAbsences: state.excusedAbsences,
          studentPhotos: state.studentPhotos,
          studentNotes: state.studentNotes,
          searchQuery: state.searchQuery,
          setSearchQuery: state.setSearchQuery,
          dateRangeFilter: 'all',
          setDateRangeFilter: () => {},
          studentLevels: state.studentLevels,
          selectedModule: state.selectedModule,
          setSelectedModule: state.setSelectedModule,
          sortBy: state.sortBy,
          setSortBy: state.setSortBy,
          viewMode: state.viewMode,
          setViewMode: state.setViewMode,
          densityMode: state.densityMode,
          setDensityMode: state.setDensityMode,
          statusFilter: state.statusFilter,
          setStatusFilter: state.setStatusFilter,
          selectedStudent: state.selectedStudent,
          setSelectedStudent: state.setSelectedStudent,
          selectedStudentNames: state.selectedStudentNames,
          setSelectedStudentNames: state.setSelectedStudentNames,
          filteredAndSortedStudents: state.filteredAndSortedStudents,
          effectiveClassDays: state.effectiveClassDays,
          classDayStats: state.classDayStats,
          trendChartData: state.trendChartData,
          getStudentBadges: state.getStudentBadges,
          handleToggleStudentAttendance: state.handleToggleStudentAttendance,
          handleAddClassDay: state.handleAddClassDay,
          handleEditClassDayTitle: state.handleEditClassDayTitle,
          handleDeleteClassDay: state.handleDeleteClassDay,
          handleClearClassDayRecords: state.handleClearClassDayRecords,
          handleSaveStudentNote: state.handleSaveStudentNote,
          handleToggleExcusedAbsence: state.handleToggleExcusedAbsence,
          handleSelectAllDisplayed: state.handleSelectAllDisplayed,
          handleSelectAllAtRisk: state.handleSelectAllAtRisk,
          clearBatchSelection: state.clearBatchSelection,
          handleExportCSV: state.handleExportCSV,
          handleLoadDemo: () => {},
          isLoading: false,
          dataSource: state.dataSource || 'local',
          error: null,
          showReportModal: state.showReportModal,
          setShowReportModal: state.setShowReportModal,
          showEmailDraftModal: state.showEmailDraftModal,
          setShowEmailDraftModal: state.setShowEmailDraftModal,
          copiedEmail: false,
          setCopiedEmail: () => {},
          showStudentTranscriptModal: state.showStudentTranscriptModal,
          setShowStudentTranscriptModal: state.setShowStudentTranscriptModal,
          showCertificateModal: state.showCertificateModal,
          setShowCertificateModal: state.setShowCertificateModal,
          showBatchEmailModal: state.showBatchEmailModal,
          setShowBatchEmailModal: state.setShowBatchEmailModal,
          certificateData: state.certificateData,
          setCertificateData: state.setCertificateData,
          isGeneratingPDF: state.isGeneratingPDF,
          showClassDaysModal: state.showClassDaysModal,
          setShowClassDaysModal: state.setShowClassDaysModal,
          liveCheckinDayId: state.liveCheckinDayId,
          setLiveCheckinDayId: state.setLiveCheckinDayId,
          handleClearStudentAttendanceRecords: state.handleClearStudentAttendanceRecords,
          selectedReportLevel: state.selectedReportLevel,
          setSelectedReportLevel: state.setSelectedReportLevel,
          selectedReportAttendanceFilter: state.selectedReportAttendanceFilter,
          setSelectedReportAttendanceFilter: state.setSelectedReportAttendanceFilter,
          toggleSelectStudent: state.toggleSelectStudent,
          setRecords: state.setRecords,
          setExcusedAbsences: state.setExcusedAbsences,
          onOpenClassDaysModal: () => state.setShowClassDaysModal(true),
          onOpenLiveCheckin: (dayId?: string) => {
            state.setLiveCheckinDayId(dayId || '');
            state.setShowLiveCheckinModal(true);
          },
          onOpenReportModal: (filter?: string) => {
            if (filter) state.setSelectedReportAttendanceFilter(filter as any);
            state.setShowReportModal(true);
          },
          onOpenMobileDownloadModal: () => state.setShowMobileDownloadModal(true),
          onOpenPresentation: () => state.setShowPresentationModal(true),
          onResetStudentPassword: () => {},
        };

      case 'students': {
        const mappedStudentsList = state.uniqueStudents.map(s => ({
          id: s.id || `stu_${(s.name || '').toLowerCase().replace(/\s+/g, '_')}`,
          name: s.name,
          studentNumber: s.studentNumber,
          email: s.email,
          phone: s.phone,
          rate: s.rate,
          attended: s.attended,
          totalDays: s.totalDays,
          avgScore: s.avgScore,
          note: s.note,
          photoUrl: state.studentPhotos[(s.name || '').toLowerCase().trim()] || s.photoUrl,
          levelId: s.levelId,
          cohortId: s.cohortId || state.activeCohortId,
          attendanceByDay: s.attendanceByDay,
          enrollmentStatus: s.enrollmentStatus,
          isDroppedOut: s.isDroppedOut,
          dropoutReason: s.dropoutReason,
          dropoutDate: s.dropoutDate,
        }));
        return {
          classDays: state.classDays,
          students: mappedStudentsList,
          initialStudents: mappedStudentsList,
          onDeleteStudent: state.handleDeleteStudent,
          onStudentsChange: (updatedStudents: any[]) => {
            updatedStudents.forEach(st => {
              if (st?.name) {
                if (st.enrollmentStatus) {
                  state.handleUpdateStudentEnrollmentStatus(
                    st.name,
                    st.enrollmentStatus,
                    { reason: st.dropoutReason, date: st.dropoutDate }
                  );
                }
                if (st.note !== undefined) {
                  state.handleSaveStudentNote(st.name, st.note);
                }
                if (st.photoUrl) {
                  state.handleUpdateStudentPhoto(st.name, st.photoUrl);
                }
              }
            });
          },
          onSelectStudentForTranscript: (s: any) => {
            const found = state.uniqueStudents.find(u => u.name === s.name);
            if (found) {
              state.setSelectedStudent(found);
              state.setShowStudentTranscriptModal(true);
            }
          },
          onSelectStudentForCertificate: (s: any) => {
            state.setCertificateData({
              studentName: s.name,
              awardTitle: s.rate >= 100 ? 'Perfect Attendance Honor Distinction' : 'Ministry Academic Completion Award',
              criteria: `Demonstrated exceptional commitment with ${s.rate.toFixed(1)}% class attendance across all required School of Ministry sessions.`,
              rate: s.rate,
              avgScore: s.avgScore,
            });
            state.setShowCertificateModal(true);
          },
          onSelectStudentForEmail: (s: any) => {
            const found = state.uniqueStudents.find(u => u.name === s.name);
            if (found) {
              state.setSelectedStudent(found);
              state.setShowEmailDraftModal(true);
            }
          },
          atRiskThreshold: state.atRiskThreshold,
          satisfactoryThreshold: state.satisfactoryThreshold,
          appRole: state.appUser?.role,
        };
      }

      case 'courses':
        return {
          courses: state.courses,
          setCourses: state.setCourses,
          userRole: state.appUser?.role,
          appUser: state.appUser,
          uniqueStudents: state.uniqueStudents,
          students: state.uniqueStudents,
          records: state.records,
          setRecords: state.setRecords,
          classDays: state.classDays,
          effectiveClassDays: state.effectiveClassDays,
          customAssignments: state.customAssignments,
          setCustomAssignments: state.setCustomAssignments,
          submissions: state.submissions,
          setSubmissions: state.setSubmissions,
          libraryResources: state.libraryResources,
          rubricScores: state.rubricScores,
          facultyTeachers: state.facultyTeachers,
          onNavigate: (tab: TabType) => state.handleNavigate(tab),
          onOpenPresentationDemo: () => state.setShowPresentationModal(true),
        };

      case 'exams':
      case 'grades':
        return {
          customAssignments: state.customAssignments,
          setCustomAssignments: state.setCustomAssignments,
          submissions: state.submissions,
          setSubmissions: state.setSubmissions,
          students: state.uniqueStudents,
          appUser: state.appUser,
          userRole: state.appUser?.role,
          courses: state.courses,
          onLoadSheets: state.handleLoadSheets,
          isLoadingSheets: state.isLoading,
          sheetUrl: state.sheetUrl,
          setSheetUrl: state.setSheetUrl,
          lastSyncedTime: state.lastSyncedTime,
          recentSheets: state.recentSheets,
          allQuizSheets: state.effectiveClassDays.map(d => d.name || d.id),
          rubricScores: state.rubricScores,
          onUpdateRubric: state.handleUpdateRubric,
          records: state.records,
          setRecords: state.setRecords,
          onImportQuizScores: state.handleImportQuizScores,
          classDays: state.classDays,
          effectiveClassDays: state.effectiveClassDays,
        };

      case 'schedule':
        return {
          schedules: state.schedules,
          setSchedules: state.setSchedules,
          courses: state.courses,
          userRole: state.appUser?.role,
        };

      case 'library':
        return {
          resources: state.libraryResources,
          setResources: state.setLibraryResources,
          libraryResources: state.libraryResources,
          setLibraryResources: state.setLibraryResources,
          classroomMedia: state.classroomMedia,
          setClassroomMedia: state.setClassroomMedia,
          userRole: state.appUser?.role,
          studentName: state.appUser?.name || state.selectedStudent?.name || 'General Student',
          onOpenNotes: () => state.handleNavigate('notes'),
          onOpenInBible: () => state.handleNavigate('notes'),
          onOpenDiagnostics: state.appUser?.role === 'admin' ? () => state.setShowDiagnosticModal(true) : undefined,
          courses: state.courses,
          customAssignments: state.customAssignments,
          onNavigateTab: (tab: string) => state.handleNavigate(tab as TabType),
        };

      case 'notes':
        return {
          currentStudentName: state.appUser?.studentName || state.appUser?.name || 'Student',
          userRole: state.appUser?.role,
          availableClassDays: state.effectiveClassDays,
          onNavigateTab: (tab: string) => state.handleNavigate(tab as TabType),
        };

      case 'classroom':
      case 'live':
        return {
          appUser: state.appUser,
          classDays: state.effectiveClassDays,
          students: state.uniqueStudents,
          onNavigateTab: (tab: TabType) => state.handleNavigate(tab),
          onRecordLiveAttendance: (studentName: string, classDayTitle: string) => {
            state.handleToggleStudentAttendance(studentName, classDayTitle, 'present');
          },
        };

      case 'payments':
      case 'finance':
        return {
          appUser: state.appUser,
          userRole: state.appUser?.role,
          availableStudents: state.uniqueStudents.map(s => ({ name: s.name || '', email: `${(s.name || '').toLowerCase().replace(/\s+/g, '.')}@hteim.edu` })),
          currentStudentName: state.appUser?.studentName || state.appUser?.name,
          payments: state.payments,
          setPayments: state.setPayments,
          onDeleteStudent: state.handleDeleteStudent,
          onRestoreStudent: state.handleRestoreStudent,
        };

      case 'messages':
        return {
          appUser: state.appUser,
          messages: state.messages,
          onSendMessage: state.handleSendMessage,
          onReplyMessage: state.handleReplyMessage,
          onUpdateStatus: state.handleUpdateMessageStatus,
          onDeleteMessage: state.handleDeleteMessage,
          availableStudents: state.uniqueStudents.map(s => {
            const name = (typeof s === 'string' ? s : s?.name) || '';
            return { name, email: `${(name || '').toLowerCase().replace(/\s+/g, '.')}@hteim.edu` };
          }),
        };

      case 'reports':
        return {
          students: state.uniqueStudents,
          attendanceRecords: state.records,
          payments: state.payments,
          courses: state.courses,
          assignments: state.customAssignments,
          submissions: state.submissions,
          currentUserRole: state.appUser?.role,
          onRefreshData: state.handlePushToCloud,
        };

      default:
        return {};
    }
  };

  const navItem = getNavigationItem(state.activeErpTab) || navigation[0];
  const PageComponent = navItem.component;
  const isAccessible = isNavigationAccessible(navItem, state.appUser?.role, (state.appUser as any)?.permissions);
  const pageProps = getPropsForTab(navItem.id);

  if (state.activePublicQuiz || state.isLoadingPublicQuiz || state.isPublicQuizNotFound) {
    return (
      <PublicQuizPage
        quiz={state.activePublicQuiz}
        isLoading={state.isLoadingPublicQuiz}
        isNotFound={state.isPublicQuizNotFound}
        errorMessage={state.publicQuizError || undefined}
        studentRoster={state.uniqueStudents.map(s => typeof s === 'string' ? { name: s } : { name: s.name })}
        currentStudentName={state.appUser?.studentName || state.appUser?.name}
        onSubmitResponse={state.handlePublicQuizSubmit}
        onClose={state.handleClosePublicQuiz}
      />
    );
  }

  return (
    <>
      <ApplicationShell
        activeErpTab={state.activeErpTab}
        handleNavigate={state.handleNavigate}
        appUser={state.appUser}
        unreadMessagesCount={state.unreadMessagesCount}
        isOffline={state.isOffline}
        cloudSyncError={state.cloudSyncError}
        pendingConflicts={state.pendingConflicts}
        supabaseTableMissing={state.supabaseTableMissing}
        syncedBannerMessage={state.syncedBannerMessage}
        setSyncedBannerMessage={state.setSyncedBannerMessage}
        pwaInstallable={state.pwaHook.isInstallable}
        onTriggerPwaInstall={() => state.pwaHook.triggerInstall()}
        onOpenMobileDownload={() => state.setShowMobileDownloadModal(true)}
        onPushToCloud={async () => {
          trackUxEvent('sync_retry_requested', { role: state.appUser?.role || 'guest' });
          await state.handlePushToCloud();
        }}
        isCloudSyncing={state.isCloudSyncing}
        onOpenOfflineDrawer={() => state.setShowOfflineDrawer(true)}
        onVerifySupabase={async () => {
          const ok = await testSupabaseConnection();
          if (ok) {
            state.showToast('success', 'Supabase Connected', 'Database table is online and ready.');
          } else {
            state.showToast('error', 'Table Not Found', 'Please make sure you ran the SQL query in Supabase.');
          }
        }}
        activeCohort={state.activeCohort}
        onOpenCohortModal={() => {
          if (state.appUser?.role === 'admin') {
            state.setShowCohortModal(true);
          }
        }}
        onGoHome={() => state.setActiveErpTab('home')}
        onOpenLogin={() => state.setShowLoginModal(true)}
        onLogout={state.handleAppLogout}
        filteredNotifications={filterNotificationsForUser(state.notifications, state.appUser?.role, state.appUser?.studentName || state.appUser?.name)}
        onMarkNotifAsRead={state.handleMarkNotifAsRead}
        onMarkAllNotifsAsRead={state.handleMarkAllNotifsAsRead}
        onClearNotifs={state.handleClearNotifs}
        onSelectNotif={state.handleSelectNotif}
        onTriggerNotifScan={state.handleRunNotificationScan}
        onAddTestNotif={state.handleAddTestNotif}
        onOpenIntro={() => state.setShowIntro(true)}
        onOpenPresentation={() => state.setShowPresentationModal(true)}
        onOpenCommandPalette={() => state.setShowCommandPalette(true)}
        onOpenRoleSwitch={() => state.setShowRoleMenu(true)}
        dataSource={state.dataSource}
        isLoading={state.isLoading}
        onLoadSheets={state.handleLoadSheets}
        onOpenBroadcast={() => state.setShowBatchBroadcastModal(true)}
        onOpenAuditLog={() => state.setShowAdminAuditModal(true)}
        onOpenUserManagement={() => state.setShowUserManagementModal(true)}
        onOpenSettings={() => state.setShowSettingsModal(true)}
        onOpenHelp={() => state.setShowGuideModal(true)}
        onOpenPINCheckin={() => state.setShowPINCheckinModal(true)}
        classDays={state.classDays}
        records={state.records}
        studentsCount={state.uniqueStudents.length}
        payments={state.payments}
        lastSyncedTime={state.lastSyncedTime}
        autoSyncInterval={state.autoSyncInterval}
        syncOnTabFocus={state.syncOnTabFocus}
        sheetMergePolicy={state.sheetMergePolicy}
        onOpenSyncConflictModal={() => {}}
        onOpenCloudDiagnosticModal={() => state.setShowDiagnosticModal(true)}
        onOpenExportModal={() => state.setShowAdminAuditModal(true)}
        onOpenClassDaysModal={() => state.setShowClassDaysModal(true)}
        onOpenRoleModal={() => state.setShowRoleMenu(true)}
        onOpenGuideModal={() => state.setShowGuideModal(true)}
        onOpenNotificationCenter={() => state.setShowBatchBroadcastModal(true)}
        showMobileMoreMenu={state.showMobileMoreMenu}
        setShowMobileMoreMenu={state.setShowMobileMoreMenu}
        activeQuizzesList={state.activeQuizzesList}
        showFloatingQuizBanner={state.showFloatingQuizBanner}
        setShowFloatingQuizBanner={state.setShowFloatingQuizBanner}
        showOfflineDrawer={state.showOfflineDrawer}
        setShowOfflineDrawer={state.setShowOfflineDrawer}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={navItem.id}
            variants={pageFadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageFadeTransition}
            className="flex-1 w-full"
          >
            {isAccessible ? (
              <Suspense fallback={<PageLoader />}>
                <PageComponent {...pageProps} />
              </Suspense>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Access Restricted</h3>
                <p className="text-sm text-slate-500 max-w-md">
                  This portal section requires faculty or administrative authorization.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Outstanding Payment Notice Banner for Students */}
        {state.showOutstandingPaymentBanner && state.studentPaymentSummary && state.studentPaymentSummary.hasOutstanding && (
          <OutstandingPaymentBanner
            summary={state.studentPaymentSummary}
            onClose={() => state.setShowOutstandingPaymentBanner?.(false)}
            onViewStatement={() => {
              state.setActiveErpTab('payments');
            }}
          />
        )}

        {/* Centralized Global Toasts Stack */}
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
          <AnimatePresence>
            {state.toasts.map((toast) => {
              const themeClasses = {
                success: 'bg-emerald-50/95 border-emerald-200 text-emerald-800 dark:bg-emerald-950/95 dark:border-emerald-800 dark:text-emerald-100',
                info: 'bg-indigo-50/95 border-indigo-200 text-indigo-800 dark:bg-slate-900/95 dark:border-slate-800 dark:text-slate-100',
                warning: 'bg-amber-50/95 border-amber-200 text-amber-800 dark:bg-amber-950/95 dark:border-amber-800 dark:text-amber-100',
                error: 'bg-rose-50/95 border-rose-200 text-rose-800 dark:bg-rose-950/95 dark:border-rose-900 dark:text-rose-100',
              };

              const Icon = {
                success: CheckCircle2,
                info: Info,
                warning: AlertCircle,
                error: XCircle,
              }[toast.type] || AlertCircle;

              return (
                <motion.div
                  key={toast.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                  className={`pointer-events-auto p-3.5 rounded-xl border flex items-start gap-3 shadow-lg backdrop-blur-md ${themeClasses[toast.type] || themeClasses.info}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold leading-tight">{toast.title}</p>
                    <p className="text-[11px] font-medium opacity-90 mt-1.5 break-words">{toast.message}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ApplicationShell>

      <PortalModalsContainer state={state} />
    </>
  );
}

export default AppRouter;
