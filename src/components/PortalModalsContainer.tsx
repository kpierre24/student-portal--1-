import React, { Suspense } from 'react';
import { TabType, PaymentRecord, Cohort, Course } from '../types';
import { AppUser, UserCredential } from '../lib/userAuth';
import { StudentPaymentSummary } from '../lib/paymentUtils';
import { lazyWithRetry } from '../lib/lazyWithRetry';

// Modals lazy-loaded with resilient retry and fallback
const SupabaseDiagnosticModal = lazyWithRetry(() => import('./SupabaseDiagnosticModal').then(m => ({ default: m.SupabaseDiagnosticModal })), 'SupabaseDiagnosticModal');
const BatchAnnouncementModal = lazyWithRetry(() => import('./BatchAnnouncementModal').then(m => ({ default: m.BatchAnnouncementModal })), 'BatchAnnouncementModal');
const MobileDownloadCenterModal = lazyWithRetry(() => import('./MobileDownloadCenterModal').then(m => ({ default: m.MobileDownloadCenterModal })), 'MobileDownloadCenterModal');
const ManageClassDaysModal = lazyWithRetry(() => import('./ManageClassDaysModal').then(m => ({ default: m.ManageClassDaysModal })), 'ManageClassDaysModal');
const SheetMergeConflictModal = lazyWithRetry(() => import('./SheetMergeConflictModal').then(m => ({ default: m.SheetMergeConflictModal })), 'SheetMergeConflictModal');
const CohortManagementModal = lazyWithRetry(() => import('./CohortManagementModal').then(m => ({ default: m.CohortManagementModal })), 'CohortManagementModal');
const AdminAuditAndBackupModal = lazyWithRetry(() => import('./AdminAuditAndBackupModal').then(m => ({ default: m.AdminAuditAndBackupModal })), 'AdminAuditAndBackupModal');
const StudentTranscriptModal = lazyWithRetry(() => import('../features/students/StudentTranscriptModal').then(m => ({ default: m.StudentTranscriptModal })), 'StudentTranscriptModal');
const CertificateModal = lazyWithRetry(() => import('../features/students/CertificateModal').then(m => ({ default: m.CertificateModal })), 'CertificateModal');
const BatchEmailModal = lazyWithRetry(() => import('../features/attendance/BatchEmailModal').then(m => ({ default: m.BatchEmailModal })), 'BatchEmailModal');
const GuideModal = lazyWithRetry(() => import('./shared/GuideModal').then(m => ({ default: m.GuideModal })), 'GuideModal');
const LoginModal = lazyWithRetry(() => import('./LoginModal').then(m => ({ default: m.LoginModal })), 'LoginModal');
const ResetPasswordModal = lazyWithRetry(() => import('./ResetPasswordModal').then(m => ({ default: m.ResetPasswordModal })), 'ResetPasswordModal');
const RoleManagementModal = lazyWithRetry(() => import('./RoleManagementModal').then(m => ({ default: m.RoleManagementModal })), 'RoleManagementModal');
const UserManagementModal = lazyWithRetry(() => import('./UserManagementModal').then(m => ({ default: m.UserManagementModal })), 'UserManagementModal');
const AppPresentationModal = lazyWithRetry(() => import('./AppPresentationModal').then(m => ({ default: m.AppPresentationModal })), 'AppPresentationModal');
const CommandPaletteModal = lazyWithRetry(() => import('./CommandPaletteModal').then(m => ({ default: m.CommandPaletteModal })), 'CommandPaletteModal');

// Normally imported/fast overlay UI elements
import { StudentDetailModal } from '../features/students/StudentDetailModal';
import { PrintableReportModal } from '../features/attendance/PrintableReportModal';
import { SettingsModal, ThemeMode } from './SettingsModal';
import { OutstandingPaymentBanner } from './OutstandingPaymentBanner';
import { MobileMoreMenuDrawer } from './layout/MobileMoreMenuDrawer';

export interface PortalModalsContainerExplicitProps {
  state?: any;
  selectedStudent?: any | null;
  setSelectedStudent?: (student: any | null) => void;
  setShowEmailDraftModal: (val: boolean) => void;
  studentNotes: any;
  excusedAbsences: any;
  effectiveClassDays: any[];
  classDays: any[];
  studentPhotos: any;
  satisfactoryThreshold: number;
  setSatisfactoryThreshold: (val: number) => void;
  atRiskThreshold: number;
  setAtRiskThreshold: (val: number) => void;
  getStudentBadges: (student: any) => any[];
  rubricScores: any;
  setRubricScores: (scores: any) => void;
  showStudentTranscriptModal: boolean;
  setShowStudentTranscriptModal: (val: boolean) => void;
  showCertificateModal: boolean;
  setShowCertificateModal: (val: boolean) => void;
  certificateData: any | null;
  setCertificateData: (data: any | null) => void;
  handleToggleStudentAttendance: any;
  handleToggleExcusedAbsence: any;
  handleSaveStudentNote: any;
  handleDeleteStudent: any;
  handleClearStudentAttendanceRecords: any;
  appUser: AppUser | null;
  setAppUser: (user: AppUser | null) => void;

  showReportModal: boolean;
  setShowReportModal: (val: boolean) => void;
  uniqueStudents: any[];
  isGeneratingPDF: boolean;
  handleExportPDF: (elementId: string, defaultFileName: string) => Promise<void>;
  selectedReportAttendanceFilter: 'at_risk' | 'all' | 'satisfactory' | 'fifty_percent';
  setSelectedReportAttendanceFilter: (val: 'at_risk' | 'all' | 'satisfactory' | 'fifty_percent') => void;

  showSettingsModal: boolean;
  setShowSettingsModal: (val: boolean) => void;
  autoSyncInterval: number;
  setAutoSyncInterval: (val: number) => void;
  syncOnTabFocus: boolean;
  setSyncOnTabFocus: (val: boolean) => void;
  sheetMergePolicy: 'manual' | 'sheets' | 'prompt';
  setSheetMergePolicy: (val: 'manual' | 'sheets' | 'prompt') => void;
  themeMode: ThemeMode;
  setThemeMode: (val: ThemeMode) => void;
  handleExportBackup: () => void;
  handleImportBackup: (jsonData: string) => boolean;
  handleResetAllData: () => void;
  showGuideModal: boolean;
  setShowGuideModal: (val: boolean) => void;
  showMobileDownloadModal: boolean;
  setShowMobileDownloadModal: (val: boolean) => void;
  showAdminAuditModal: boolean;
  setShowAdminAuditModal: (val: boolean) => void;

  cohorts: Cohort[];
  activeCohortId: string;
  setActiveCohortId: (val: string) => void;
  handleSaveCohort: (cohort: Cohort) => void;
  handleDeleteCohort: (cohortId: string) => void;
  handleArchiveToggleCohort: (cohortId: string) => void;
  handleAssignStudentCohort: (studentName: string, cohortId: string) => void;

  userCredentials: UserCredential[];
  handleChangeUserPassword: (usernameOrEmail: string | AppUser | undefined | null, newPin: string) => Promise<void>;

  showBatchEmailModal: boolean;
  setShowBatchEmailModal: (val: boolean) => void;
  selectedStudentNames: string[];
  setSelectedStudentNames: (names: string[]) => void;

  showBatchBroadcastModal: boolean;
  setShowBatchBroadcastModal: (val: boolean) => void;
  handleSendBatchBroadcast: (broadcast: any) => void;

  pendingConflicts: any[];
  setPendingConflicts: (val: any[]) => void;
  setPendingSyncData: (val: any) => void;
  handleResolveConflicts: (resolutions: Record<string, 'local' | 'sheets'>) => void;

  showOutstandingPaymentBanner: boolean;
  setShowOutstandingPaymentBanner: (val: boolean) => void;
  studentPaymentSummary: StudentPaymentSummary | null;
  setActiveErpTab: (tab: TabType) => void;

  showCommandPalette: boolean;
  setShowCommandPalette: (val: boolean) => void;
  getStudentIdForName: (name: string) => string;
  payments: PaymentRecord[];

  showClassDaysModal: boolean;
  setShowClassDaysModal: (val: boolean) => void;
  handleAddClassDay: (customTitle?: string) => void;
  handleEditClassDayTitle: (id: string, title: string) => void;
  handleDeleteClassDay: (id: string) => void;
  handleClearClassDayRecords: (id: string) => void;
  classDayStats: any;

  showLoginModal: boolean;
  setShowLoginModal: (val: boolean) => void;
  handleAppLoginSuccess: (user: AppUser) => void;
  handleAppLogout: () => Promise<void>;
  resetTargetEmail: string;
  setResetTargetEmail: (email: string) => void;
  showResetPasswordModal: boolean;
  setShowResetPasswordModal: (val: boolean) => void;
  isResetFromEmailLink: boolean;
  setIsResetFromEmailLink: (val: boolean) => void;
  setSyncedBannerMessage: (val: string | null) => void;

  showMobileMoreMenu: boolean;
  setShowMobileMoreMenu: (val: boolean) => void;
  showRoleMenu: boolean;
  setShowRoleMenu: (val: boolean) => void;
  handleQuickRoleSwitch: (role: string, customName?: string, studentIdChoice?: string) => void;

  showDiagnosticModal: boolean;
  setShowDiagnosticModal: (val: boolean) => void;
  user: any;
  handlePushToCloud: () => Promise<void>;

  showUserManagementModal: boolean;
  setShowUserManagementModal: (val: boolean) => void;
  handleUpdateUserCredentials: (creds: UserCredential[]) => Promise<void>;
  facultyTeachers: any[];

  showPresentationModal: boolean;
  setShowPresentationModal: (val: boolean) => void;

  activeErpTab: TabType;
  unreadMessagesCount: number;
  courses: Course[];
  activeQuizzesList: any;
  showFloatingQuizBanner: boolean;
  setShowFloatingQuizBanner: (val: boolean) => void;
  showOfflineDrawer: boolean;
  setShowOfflineDrawer: (val: boolean) => void;

  // Rehydration setters
  setRecords: (val: any) => void;
  setPayments: (val: any) => void;
  setCustomAssignments: (val: any) => void;
  setSubmissions: (val: any) => void;
  setUserCredentials: (val: any) => void;
  setFacultyTeachers: (val: any) => void;
  setShowIntro: (val: boolean) => void;

  // Live check-in mode support
  setShowLiveCheckinModal: (val: boolean) => void;
  liveCheckinDayId: string;
  setLiveCheckinDayId: (val: string) => void;
}

export type PortalModalsContainerProps = {
  state?: any;
  [key: string]: any;
} & Partial<PortalModalsContainerExplicitProps>;

export const PortalModalsContainer: React.FC<PortalModalsContainerProps> = (rawProps) => {
  const props: any = (rawProps as any).state ? { ...(rawProps as any).state, ...rawProps } : rawProps;
  return (
    <Suspense fallback={null}>
      {/* Student Detail Modal */}
      {props.selectedStudent && (
        <StudentDetailModal
          selectedStudent={props.selectedStudent}
          onClose={() => {
            props.setSelectedStudent(null);
            props.setShowEmailDraftModal(false);
          }}
          studentNotes={props.studentNotes}
          excusedAbsences={props.excusedAbsences}
          effectiveClassDays={props.effectiveClassDays}
          classDays={props.classDays}
          studentPhotos={props.studentPhotos}
          satisfactoryThreshold={props.satisfactoryThreshold}
          atRiskThreshold={props.atRiskThreshold}
          getStudentBadges={props.getStudentBadges}
          rubricScores={props.rubricScores}
          setRubricScores={props.setRubricScores}
          onOpenTranscript={() => props.setShowStudentTranscriptModal(true)}
          onOpenCertificate={(certData) => {
            props.setCertificateData(certData);
            props.setShowCertificateModal(true);
          }}
          handleToggleStudentAttendance={props.handleToggleStudentAttendance}
          handleToggleExcusedAbsence={props.handleToggleExcusedAbsence}
          handleSaveStudentNote={props.handleSaveStudentNote}
          handleDeleteStudent={props.handleDeleteStudent}
          handleClearStudentAttendanceRecords={props.handleClearStudentAttendanceRecords}
          handleUpdateStudentEnrollmentStatus={props.handleUpdateStudentEnrollmentStatus}
          appUser={props.appUser}
        />
      )}

      {/* Printable Report Modal */}
      <PrintableReportModal
        isOpen={props.showReportModal}
        onClose={() => props.setShowReportModal(false)}
        uniqueStudents={props.uniqueStudents}
        effectiveClassDays={props.effectiveClassDays}
        atRiskThreshold={props.atRiskThreshold}
        satisfactoryThreshold={props.satisfactoryThreshold}
        isGeneratingPDF={props.isGeneratingPDF}
        handleExportPDF={props.handleExportPDF}
        selectedReportAttendanceFilter={props.selectedReportAttendanceFilter}
        setSelectedReportAttendanceFilter={props.setSelectedReportAttendanceFilter}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={props.showSettingsModal}
        onClose={() => props.setShowSettingsModal(false)}
        userRole={props.appUser?.role || 'user'}
        atRiskThreshold={props.atRiskThreshold}
        setAtRiskThreshold={props.setAtRiskThreshold}
        satisfactoryThreshold={props.satisfactoryThreshold}
        setSatisfactoryThreshold={props.setSatisfactoryThreshold}
        autoSyncInterval={props.autoSyncInterval}
        setAutoSyncInterval={props.setAutoSyncInterval}
        syncOnTabFocus={props.syncOnTabFocus}
        setSyncOnTabFocus={props.setSyncOnTabFocus}
        sheetMergePolicy={props.sheetMergePolicy}
        setSheetMergePolicy={props.setSheetMergePolicy}
        themeMode={props.themeMode}
        setThemeMode={props.setThemeMode}
        onExportBackup={props.handleExportBackup}
        onImportBackup={props.handleImportBackup}
        onResetAllData={props.handleResetAllData}
        onOpenGuide={() => props.setShowGuideModal(true)}
        onOpenMobileDownloadCenter={() => props.setShowMobileDownloadModal(true)}
        onOpenAdminTools={() => {
          props.setShowSettingsModal(false);
          props.setShowAdminAuditModal(true);
        }}
        onOpenCohortManager={props.appUser?.role === 'admin' ? () => props.setActiveCohortId(props.cohorts[0]?.id || '') : undefined}
        onPhotosMigrated={props.handlePushToCloud}
      />

      {/* Cohort Management Modal */}
      <CohortManagementModal
        isOpen={props.showSettingsModal && props.activeCohortId !== ''}
        onClose={() => props.setActiveCohortId('')}
        cohorts={props.cohorts}
        activeCohortId={props.activeCohortId}
        onSelectActiveCohort={(id) => {
          const target = props.cohorts.find(c => c.id === id);
          if (props.appUser?.role !== 'admin' && target && !target.isCurrent) {
            return;
          }
          props.setActiveCohortId(id);
        }}
        onSaveCohort={props.handleSaveCohort}
        onDeleteCohort={props.handleDeleteCohort}
        onArchiveToggle={props.handleArchiveToggleCohort}
        students={props.uniqueStudents}
        courses={props.courses}
        userRole={props.appUser?.role || 'user'}
        onAssignStudentCohort={props.handleAssignStudentCohort}
      />

      {/* Admin Audit Trail & Data Tools Modal */}
      <AdminAuditAndBackupModal
        isOpen={props.showAdminAuditModal}
        onClose={() => props.setShowAdminAuditModal(false)}
        currentUserRole={props.appUser?.role}
        currentActorName={props.appUser ? (props.appUser.role === 'admin' ? 'Administrator' : props.appUser.name) : 'Administrator'}
        onDataRestored={() => {
          try {
            const savedAtt = localStorage.getItem('attendanceRecords');
            if (savedAtt) props.setRecords(JSON.parse(savedAtt));
          } catch (e) {}

          try {
            const savedPay = localStorage.getItem('hteim_student_payments');
            if (savedPay) props.setPayments(JSON.parse(savedPay));
          } catch (e) {}

          try {
            const savedAssign = localStorage.getItem('hteim_custom_assignments');
            if (savedAssign) props.setCustomAssignments(JSON.parse(savedAssign));
          } catch (e) {}

          try {
            const savedSubs = localStorage.getItem('hteim_assignment_submissions');
            if (savedSubs) props.setSubmissions(JSON.parse(savedSubs));
          } catch (e) {}

          try {
            const savedCreds = localStorage.getItem('hteim_user_credentials');
            if (savedCreds) props.setUserCredentials(JSON.parse(savedCreds));
          } catch (e) {}

          try {
            const savedFaculty = localStorage.getItem('hteim_faculty_teachers_v1');
            if (savedFaculty) props.setFacultyTeachers(JSON.parse(savedFaculty));
          } catch (e) {}

          try {
            const savedAtRisk = localStorage.getItem('atRiskThreshold');
            if (savedAtRisk) props.setAtRiskThreshold(Number(savedAtRisk));
            const savedSat = localStorage.getItem('satisfactoryThreshold');
            if (savedSat) props.setSatisfactoryThreshold(Number(savedSat));
          } catch (e) {}
        }}
        userCredentials={props.userCredentials}
        onResetPassword={props.handleChangeUserPassword}
      />

      {/* Mobile App & APK Download Center Modal */}
      <MobileDownloadCenterModal
        isOpen={props.showMobileDownloadModal}
        onClose={() => props.setShowMobileDownloadModal(false)}
      />

      {/* Guide & Access Modal */}
      <GuideModal
        isOpen={props.showGuideModal}
        onClose={() => props.setShowGuideModal(false)}
      />

      {/* Individual Student Academic Transcript PDF Modal */}
      <StudentTranscriptModal
        isOpen={props.showStudentTranscriptModal}
        onClose={() => props.setShowStudentTranscriptModal(false)}
        selectedStudent={props.selectedStudent}
        effectiveClassDays={props.effectiveClassDays}
        rubricScores={props.rubricScores}
        excusedAbsences={props.excusedAbsences}
        satisfactoryThreshold={props.satisfactoryThreshold}
        atRiskThreshold={props.atRiskThreshold}
        isGeneratingPDF={props.isGeneratingPDF}
        handleExportPDF={props.handleExportPDF}
        handleToggleStudentAttendance={props.handleToggleStudentAttendance}
        appUser={props.appUser}
      />

      {/* Milestone / Achievement Certificate Modal */}
      <CertificateModal
        isOpen={props.showCertificateModal}
        onClose={() => {
          props.setShowCertificateModal(false);
          props.setCertificateData(null);
        }}
        certificateData={props.certificateData}
        isGeneratingPDF={props.isGeneratingPDF}
        handleExportPDF={props.handleExportPDF}
      />

      {/* Batch At-Risk Email Notice Modal */}
      <BatchEmailModal
        isOpen={props.showBatchEmailModal}
        onClose={() => props.setShowBatchEmailModal(false)}
        selectedStudentNames={props.selectedStudentNames}
        uniqueStudents={props.uniqueStudents}
        effectiveClassDays={props.effectiveClassDays}
        atRiskThreshold={props.atRiskThreshold}
        clearBatchSelection={() => props.setSelectedStudentNames([])}
      />

      {/* Batch Announcement Broadcast Modal */}
      {props.showBatchBroadcastModal && (
        <BatchAnnouncementModal
          isOpen={props.showBatchBroadcastModal}
          onClose={() => props.setShowBatchBroadcastModal(false)}
          availableStudents={props.uniqueStudents.map(s => ({
            name: s.name,
            email: `${(s.name || '').toLowerCase().replace(/\s+/g, '.')}@hteim.edu`,
            phone: '+1 (868) 555-0199',
            track: 'Active Ministry Module'
          }))}
          onSendBroadcast={props.handleSendBatchBroadcast}
        />
      )}

      {/* Sheet Merge Conflict Resolution Modal */}
      {props.pendingConflicts.length > 0 && (
        <SheetMergeConflictModal
          isOpen={props.pendingConflicts.length > 0}
          conflicts={props.pendingConflicts}
          onResolve={props.handleResolveConflicts}
          onCancel={() => {
            props.setPendingConflicts([]);
            props.setPendingSyncData(null);
          }}
        />
      )}

      {/* Outstanding Payment Notice Banner for Students */}
      {props.showOutstandingPaymentBanner && props.studentPaymentSummary && props.studentPaymentSummary.hasOutstanding && (
        <OutstandingPaymentBanner
          summary={props.studentPaymentSummary}
          onClose={() => props.setShowOutstandingPaymentBanner(false)}
          onViewStatement={() => {
            props.setActiveErpTab('payments');
            props.setShowOutstandingPaymentBanner(false);
          }}
        />
      )}

      {/* Global Command Palette Modal (Ctrl + K) */}
      {props.showCommandPalette && (
        <CommandPaletteModal
          isOpen={props.showCommandPalette}
          onClose={() => props.setShowCommandPalette(false)}
          onNavigate={(tab) => props.setActiveErpTab(tab)}
          appUser={props.appUser}
          studentList={props.uniqueStudents.map(s => ({
            name: s.name,
            rate: s.rate,
            levelId: s.levelId,
            studentId: props.getStudentIdForName(s.name)
          }))}
          paymentList={props.payments.map(p => ({
            name: p.studentName,
            status: p.status,
            track: p.moduleTrack
          }))}
          onOpenSettings={() => props.setShowSettingsModal(true)}
          onOpenAdminTools={() => props.setShowAdminAuditModal(true)}
          onOpenBatchBroadcast={() => props.setShowBatchBroadcastModal(true)}
          onOpenMobileDownload={() => props.setShowMobileDownloadModal(true)}
          onOpenLogin={() => props.setShowLoginModal(true)}
        />
      )}

      {/* Manage Class Days Modal */}
      <ManageClassDaysModal
        isOpen={props.showClassDaysModal}
        onClose={() => props.setShowClassDaysModal(false)}
        classDays={props.classDays || []}
        onAddClassDay={props.handleAddClassDay}
        onEditClassDayTitle={props.handleEditClassDayTitle}
        onDeleteClassDay={props.handleDeleteClassDay}
        onClearClassDayRecords={props.handleClearClassDayRecords}
        uniqueStudentsCount={props.uniqueStudents?.length || 0}
        classDayStats={props.classDayStats || {}}
      />

      {/* Login Portal Modal */}
      {props.showLoginModal && (
        <LoginModal
          isOpen={props.showLoginModal}
          currentUser={props.appUser}
          onLoginSuccess={props.handleAppLoginSuccess}
          onLogout={props.handleAppLogout}
          onClose={() => props.setShowLoginModal(false)}
          userCredentials={props.userCredentials}
          onChangePassword={props.handleChangeUserPassword}
          onSyncCredentials={(syncedCreds) => {
            props.setUserCredentials(syncedCreds);
          }}
          onOpenResetModal={(email) => {
            props.setResetTargetEmail(email);
            props.setShowLoginModal(false);
            props.setShowResetPasswordModal(true);
          }}
        />
      )}

      {/* Comprehensive Password Reset & Recovery Center Modal */}
      {props.showResetPasswordModal && (
        <ResetPasswordModal
          isOpen={props.showResetPasswordModal}
          onClose={() => {
            props.setShowResetPasswordModal(false);
            props.setIsResetFromEmailLink(false);
          }}
          targetUserEmail={props.resetTargetEmail}
          userCredentials={props.userCredentials}
          isFromEmailLink={props.isResetFromEmailLink}
          onBackToLogin={() => {
            props.setShowResetPasswordModal(false);
            props.setIsResetFromEmailLink(false);
            props.setShowLoginModal(true);
          }}
          onResetComplete={(authenticatedUser) => {
            props.handleAppLoginSuccess(authenticatedUser);
            props.setShowResetPasswordModal(false);
            props.setIsResetFromEmailLink(false);
            props.setShowLoginModal(false);
            props.setSyncedBannerMessage(`🔐 Password Updated! Welcome back, ${authenticatedUser.name}`);
            setTimeout(() => props.setSyncedBannerMessage(''), 5000);
          }}
        />
      )}

      {/* Mobile Slide-Up "More" Options Drawer */}
      <MobileMoreMenuDrawer
        isOpen={props.showMobileMoreMenu}
        onClose={() => props.setShowMobileMoreMenu(false)}
        activeErpTab={props.activeErpTab}
        setActiveErpTab={props.setActiveErpTab}
        appUser={props.appUser}
        uniqueStudentsCount={props.uniqueStudents.length}
        unreadMessagesCount={props.unreadMessagesCount}
        setShowLoginModal={props.setShowLoginModal}
        setShowLiveCheckinModal={props.setShowLiveCheckinModal}
        liveCheckinDayId={props.liveCheckinDayId}
        setLiveCheckinDayId={props.setLiveCheckinDayId}
        classDays={props.classDays}
        setShowIntro={props.setShowIntro}
        setShowCommandPalette={props.setShowCommandPalette}
        setShowSettingsModal={props.setShowSettingsModal}
        setShowRoleMenu={props.setShowRoleMenu}
      />

      {/* Role-Based Access Control (RBAC) & Persona Switcher Modal */}
      {props.showRoleMenu && (
        <RoleManagementModal
          isOpen={props.showRoleMenu}
          onClose={() => props.setShowRoleMenu(false)}
          currentUser={props.appUser}
          onSwitchRole={props.handleQuickRoleSwitch}
        />
      )}

      {/* Supabase Storage & Data Diagnostic Modal */}
      <SupabaseDiagnosticModal
        isOpen={props.showDiagnosticModal}
        onClose={() => props.setShowDiagnosticModal(false)}
        userEmail={props.appUser?.email || props.user?.email}
        userRole={props.appUser?.role}
        onRefreshData={props.handlePushToCloud}
      />

      {/* Dynamic User Credentials Management Modal */}
      {props.showUserManagementModal && (
        <UserManagementModal
          isOpen={props.showUserManagementModal}
          onClose={() => props.setShowUserManagementModal(false)}
          userCredentials={props.userCredentials}
          onUpdateCredentials={props.handleUpdateUserCredentials}
          uniqueStudents={props.uniqueStudents}
          facultyTeachers={props.facultyTeachers}
          currentAdminEmail="kpierre24@gmail.com"
          onTriggerCloudSync={props.handlePushToCloud}
          appUser={props.appUser}
        />
      )}

      {/* 30-Second Student Presentation Demo Video Modal */}
      <AppPresentationModal
        isOpen={props.showPresentationModal}
        onClose={() => props.setShowPresentationModal(false)}
        onNavigateTab={(tab) => props.setActiveErpTab(tab)}
      />
    </Suspense>
  );
};
