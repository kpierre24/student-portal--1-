import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  TabType, 
  AppNotification, 
  CustomAssignment, 
  AssignmentSubmission, 
  Course, 
  ScheduleItem, 
  LibraryResource, 
  MediaResource, 
  PaymentRecord, 
  ClassDay, 
  StudentSummary, 
  AppMessage, 
  MessageReply, 
  MessageAttachment, 
  AttendanceRecord, 
  Cohort, 
  DEFAULT_COHORTS, 
  UserRole,
  getDefaultLevelForStudent
} from '../types';
import { AppUser, generateStudentUsername, UserCredential, isMatchingCredential, mergeUserCredentials } from '../lib/userAuth';
import { INITIAL_COURSES, INITIAL_ASSIGNMENTS, INITIAL_SUBMISSIONS, INITIAL_SCHEDULE, INITIAL_RESOURCES, INITIAL_PAYMENTS, INITIAL_MESSAGES } from '../data/initialPortalData';
import { DEFAULT_FACULTY_TEACHERS } from '../components/HomeTab';
import { DEFAULT_PRESET_MEDIA } from '../components/ClassroomMediaPlayer';
import { CURRICULUM_CLASS_DAYS, MASTER_ENROLLED_STUDENTS, RAW_CURRICULUM_RECORDS, isObsoleteLegacyClassDay, getLessonMaxPoints, isMatchingLesson, GradingWeights, DEFAULT_GRADING_WEIGHTS } from '../data';
import { DEFAULT_QUIZ_TEMPLATES } from '../data/quizTemplates';
import { MANUAL_ALIASES, EXCLUDED_STUDENTS, isExcludedStudent, getCanonicalNamesMap, normalizeStudentName } from '../features/students/studentCanonicalization';
import { loadAuthoritativeState as loadFromSupabase, saveAuthoritativeState as saveToSupabase } from '../services/dataSyncService';
import { portalApi } from '../services/api/portalApiClient';
import { supabase, ensureSupabaseStorageUrl, syncLibraryFromSupabaseBucket, syncFacultyImagesToSupabase, syncStudentPhotosToSupabase } from '../lib/supabaseClient';
import { updatePasswordInSupabase } from '../lib/supabaseAuth';
import { subscribeToOAuthState as initAuth, loginWithGoogleOAuth as googleSignIn, logoutUserSession as logout, logoutUserSession as supabaseLogout } from '../services/authService';
import { fetchSpreadsheetMetadata, fetchMultipleRanges, extractSpreadsheetId, fetchPublicSpreadsheetData } from '../lib/sheets';
import { CentralNotificationService } from '../services/notification/CentralNotificationService';
import { generateAutomatedNotifications } from '../lib/notifications';
import { getStudentPaymentDetails, StudentPaymentSummary } from '../lib/paymentUtils';
import { logActivity } from '../lib/auditLogger';
import { trackUxEvent } from '../lib/uxTelemetry';
import { usePWAInstall } from '../lib/pwa';
import { getTabFromLocation } from './navigation';
import { exportElementToPDF } from '../lib/pdfExporter';
import { ThemeMode } from '../components/SettingsModal';
import { parseAndApplyQuizCsv } from '../lib/quizCsvImporter';
import { useGoogleSheetsSync } from '../hooks/useGoogleSheetsSync';
import { QuizAssignment, QuizSubmission } from '../types';

export type MergeConflict = {
  studentName: string;
  classDay: string;
  localStatus: 'present' | 'absent';
  sheetsStatus: 'present' | 'absent';
  sheetsScore: string;
  sheetsTimestamp: string;
};

export type RecentSheet = {
  id: string;
  url: string;
  title: string;
  lastLoaded: string;
};

export function usePortalState() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const lastFetchTimeRef = useRef<number>(0);
  const handleLoadSheetsRef = useRef<((e?: React.FormEvent, customUrl?: string) => Promise<void>) | null>(null);

  // App User & Role State
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  // Dynamic User Credentials State
  const [userCredentials, setUserCredentials] = useState<UserCredential[]>([]);

  // Clear legacy auth session remnants
  useEffect(() => {
    try {
      localStorage.removeItem('hteim_app_user');
      localStorage.removeItem('hteim_user_credentials');
      sessionStorage.removeItem('hteim_app_user');
      sessionStorage.removeItem('hteim_user_credentials');
    } catch (e) {}
  }, []);

  const [showIntro, setShowIntro] = useState<boolean>(() => {
    try {
      const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
      const search = typeof window !== 'undefined' ? window.location.search || '' : '';
      const isRecoveryLink = hash.includes('type=recovery') || search.includes('type=recovery') || search.includes('reset=true');
      if (isRecoveryLink) return false;
      return !sessionStorage.getItem('hteim_intro_shown');
    } catch {
      return true;
    }
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<boolean>(false);
  const [resetTargetEmail, setResetTargetEmail] = useState<string>('');
  const [isResetFromEmailLink, setIsResetFromEmailLink] = useState<boolean>(false);
  const [showRoleMenu, setShowRoleMenu] = useState<boolean>(false);
  const [showToolsMenu, setShowToolsMenu] = useState<boolean>(false);
  const [showAdminAuditModal, setShowAdminAuditModal] = useState<boolean>(false);
  const [showUserManagementModal, setShowUserManagementModal] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState<boolean>(false);
  const [isNavOpen, setIsNavOpen] = useState<boolean>(false);

  // Listen for recovery email link
  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('type=recovery') || search.includes('type=recovery') || search.includes('reset=true')) {
      setIsResetFromEmailLink(true);
      setShowResetPasswordModal(true);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetFromEmailLink(true);
        setShowResetPasswordModal(true);
        if (session?.user?.email) {
          setResetTargetEmail(session.user.email);
        }
      }
    });

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Inactivity lock (30 min)
  useEffect(() => {
    if (!appUser) return;
    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
    let timeoutId: NodeJS.Timeout;

    let lastResetTime = 0;
    const resetInactivityTimer = (force = false) => {
      const now = Date.now();
      if (!force && now - lastResetTime < 30000) {
        return;
      }
      lastResetTime = now;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSyncedBannerMessage('🔒 Session automatically locked due to 30 minutes of inactivity for your security.');
        setAppUser(null);
        setShowLoginModal(true);
        setTimeout(() => setSyncedBannerMessage(null), 6000);
      }, INACTIVITY_TIMEOUT_MS);
    };

    const handleActivity = () => resetInactivityTimer(false);

    const activityEvents = ['mousedown', 'keydown', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));
    resetInactivityTimer(true);

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
    };
  }, [appUser]);

  const [showOutstandingPaymentBanner, setShowOutstandingPaymentBanner] = useState<boolean>(false);
  const [studentPaymentSummary, setStudentPaymentSummary] = useState<StudentPaymentSummary | null>(null);

  useEffect(() => {
    if (appUser) {
      if (appUser.role === 'student') {
        const sName = appUser.studentName || appUser.name;
        const summary = getStudentPaymentDetails(sName);
        setStudentPaymentSummary(summary);
        if (summary.hasOutstanding) {
          setShowOutstandingPaymentBanner(true);
        } else {
          setShowOutstandingPaymentBanner(false);
        }
      } else {
        setShowOutstandingPaymentBanner(false);
        setStudentPaymentSummary(null);
      }
    } else {
      setShowOutstandingPaymentBanner(false);
      setStudentPaymentSummary(null);
    }
  }, [appUser]);

  const handleAppLoginSuccess = (user: AppUser) => {
    setAppUser(user);
    setShowLoginModal(false);
    if (user.role === 'student') {
      if (activeErpTab === 'students') {
        setActiveErpTab('attendance');
      }
      const sName = user.studentName || user.name;
      const summary = getStudentPaymentDetails(sName);
      setStudentPaymentSummary(summary);
      if (summary.hasOutstanding) {
        setShowOutstandingPaymentBanner(true);
      }
    }

    // Automatically sync all quizzes on successful login (Google Sheets + Database)
    setTimeout(async () => {
      try {
        if (handleLoadSheetsRef.current) {
          await handleLoadSheetsRef.current();
        }
      } catch (e) {
        console.warn('Auto quiz sync on login notice:', e);
      }

      // Also retrieve latest custom assignments/quizzes from database
      try {
        const res = await portalApi.getAssignments();
        if (res && Array.isArray(res.assignments) && res.assignments.length > 0) {
          setCustomAssignments((prev) => {
            const serverIds = new Set(res.assignments.map((a: any) => a.id));
            const localOnly = prev.filter((a) => !serverIds.has(a.id));
            return [...res.assignments, ...localOnly];
          });
        }
      } catch (e) {
        console.warn('Auto assignment sync on login notice:', e);
      }
    }, 150);
  };

  const handleAppLogout = async () => {
    const prevUser = appUser;
    try {
      await supabaseLogout();
    } catch (e) {
      console.warn("Supabase sign out notice:", e);
    }
    try {
      await logout();
    } catch (e) {}
    setAppUser(null);
    setActiveErpTab('home');
    setShowLoginModal(false);
    if (prevUser) {
      logActivity({
        actor: prevUser.name || 'User',
        role: prevUser.role || 'student',
        actionCategory: 'System Settings',
        actionTitle: 'User Logged Out',
        details: `Signed out of portal: ${prevUser.name}`
      });
    }
    setSyncedBannerMessage('🔒 Logged out of HTEIM Portal.');
    setTimeout(() => setSyncedBannerMessage(null), 3500);
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'info' | 'warning' | 'error'; title: string; message: string }>>([]);

  useEffect(() => {
    (window as any).triggerPortalToast = (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts(prev => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5500);
    };
    return () => {
      delete (window as any).triggerPortalToast;
    };
  }, []);

  const showToast = (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5500);
  };

  // Synchronized States
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('hteim_courses');
    return saved ? JSON.parse(saved) : INITIAL_COURSES;
  });

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem('hteim_scheduled_classes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.filter((s: any) => !String(s.id).startsWith('sch_p'));
      } catch {}
    }
    return [];
  });

  const [libraryResources, setLibraryResources] = useState<LibraryResource[]>(() => {
    const saved = localStorage.getItem('hteim_library_resources');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_RESOURCES;
  });

  const [classroomMedia, setClassroomMedia] = useState<MediaResource[]>(() => {
    const saved = localStorage.getItem('hteim_classroom_media');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return DEFAULT_PRESET_MEDIA;
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem('hteim_student_payments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((p: any) => {
            if (!p || !p.studentName) return p;
            const pLower = p.studentName.toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
            const alias = MANUAL_ALIASES[pLower];
            if (alias && alias !== p.studentName) {
              return { ...p, studentName: alias };
            }
            return p;
          });
          const seenNames = new Set<string>();
          const seenIds = new Set<string>();
          const deduped: PaymentRecord[] = [];
          normalized.forEach((p: any) => {
            if (!p) return;
            const rawName = (p?.studentName || '').toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
            const alias = MANUAL_ALIASES[rawName];
            const nameKey = (alias || p?.studentName || '').toLowerCase().trim();
            const idKey = p?.id;

            if (nameKey) {
              if (seenNames.has(nameKey)) {
                const existing = deduped.find(d => {
                  const dRaw = (d?.studentName || '').toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
                  const dAlias = MANUAL_ALIASES[dRaw];
                  return (dAlias || d?.studentName || '').toLowerCase().trim() === nameKey;
                });
                if (existing) {
                  existing.amountPaid = (Number(existing.amountPaid) || 0) + (Number(p.amountPaid) || 0);
                  if (existing.amountPaid >= (existing.totalTuition || 1200)) existing.status = 'Paid In Full';
                  else if (existing.amountPaid > 0) existing.status = 'Partial';
                }
                return;
              }
              seenNames.add(nameKey);
            }
            if (idKey) seenIds.add(idKey);
            deduped.push(p);
          });
          const existingNames = new Set(deduped.map((p: any) => {
            const raw = (p?.studentName || '').toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
            const alias = MANUAL_ALIASES[raw];
            return (alias || p?.studentName || '').toLowerCase().trim();
          }));
          const existingIds = new Set(deduped.map((p: any) => p?.id).filter(Boolean));

          const missing = INITIAL_PAYMENTS.filter(p => {
            if (existingIds.has(p.id)) return false;
            const pRaw = (p.studentName || '').toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
            const alias = MANUAL_ALIASES[pRaw];
            const canon = (alias || p.studentName || '').toLowerCase().trim();
            return !existingNames.has(canon);
          });

          const finalSeenIds = new Set<string>();
          const result: PaymentRecord[] = [];
          [...deduped, ...missing].forEach((rec) => {
            if (!rec || !rec.id) return;
            if (finalSeenIds.has(rec.id)) return;
            finalSeenIds.add(rec.id);
            result.push(rec);
          });
          return result;
        }
      } catch (e) {}
    }
    return INITIAL_PAYMENTS;
  });

  const [facultyTeachers, setFacultyTeachers] = useState<any[]>(() => {
    const saved = localStorage.getItem('hteim_faculty_teachers_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_FACULTY_TEACHERS;
  });

  const [zoomExceptionNote, setZoomExceptionNote] = useState<string>(() => {
    return localStorage.getItem('hteim_zoom_exception_note') || '';
  });

  const [hasZoomException, setHasZoomException] = useState<boolean>(() => {
    return localStorage.getItem('hteim_has_zoom_exception') === 'true';
  });

  const defaultPermanentClassDays: ClassDay[] = useMemo(() => CURRICULUM_CLASS_DAYS, []);

  const [classDays, setClassDays] = useState<ClassDay[]>(() => {
    const saved = localStorage.getItem('classDays');
    if (saved) {
      try {
        const parsed: ClassDay[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter(d => d && d.id && !isObsoleteLegacyClassDay(d.id) && !isObsoleteLegacyClassDay(d.name));
          if (cleaned.length >= 14) return cleaned;
        }
      } catch (e) {}
    }
    return CURRICULUM_CLASS_DAYS;
  });

  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('attendanceRecords');
    const savedDeleted = localStorage.getItem('deletedStudentNames');
    let deletedList: string[] = [];
    if (savedDeleted) {
      try { deletedList = JSON.parse(savedDeleted); } catch {}
    }
    if (saved) {
      try {
        const loaded: AttendanceRecord[] = JSON.parse(saved);
        if (Array.isArray(loaded) && loaded.length >= 50) {
          const cleaned = loaded.filter(r => {
            if (!r || !r.name) return false;
            if (r.classDay && isObsoleteLegacyClassDay(r.classDay)) return false;
            const nameLower = (r?.name || '').toLowerCase().trim();
            if (isExcludedStudent(r.name)) return false;
            if (deletedList.some(d => (d || '').toLowerCase().trim() === nameLower)) return false;
            return true;
          });
          if (cleaned.length >= 50) return cleaned;
        }
      } catch (e) {}
    }
    return RAW_CURRICULUM_RECORDS.filter(r => !isExcludedStudent(r.name) && !isObsoleteLegacyClassDay(r.classDay));
  });

  useEffect(() => {
    let currentClassDays = classDays;
    let currentRecords = records;

    if (currentClassDays.some(d => isObsoleteLegacyClassDay(d.id) || isObsoleteLegacyClassDay(d.name))) {
      currentClassDays = currentClassDays.filter(d => !isObsoleteLegacyClassDay(d.id) && !isObsoleteLegacyClassDay(d.name));
      setClassDays(currentClassDays);
      localStorage.setItem('classDays', JSON.stringify(currentClassDays));
    }

    if (currentRecords.some(r => isObsoleteLegacyClassDay(r.classDay))) {
      currentRecords = currentRecords.filter(r => !isObsoleteLegacyClassDay(r.classDay));
      setRecords(currentRecords);
      localStorage.setItem('attendanceRecords', JSON.stringify(currentRecords));
    }
  }, []);

  const [deletedClassDayIds, setDeletedClassDayIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('deletedClassDayIds');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('deletedClassDayIds', JSON.stringify(deletedClassDayIds));
  }, [deletedClassDayIds]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'at_risk' | 'moderate' | 'perfect' | 'fifty_percent' | 'unpaid' | 'honor_roll'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'last_name_asc' | 'last_name_desc' | 'rate_desc' | 'rate_asc' | 'score_desc' | 'score_asc'>('name_asc');
  
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  
  const [deletedStudentNames, setDeletedStudentNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('deletedStudentNames');
    let list: string[] = [];
    if (saved) {
      try { list = JSON.parse(saved); } catch {}
    }
    return list.filter(name => {
      const lower = (name || '').toLowerCase().trim();
      return !lower.includes('colette') && !lower.includes('blackburn') && !lower.includes('susan') && !lower.includes('sparks');
    });
  });

  const [studentNotes, setStudentNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('studentNotes');
    return saved ? JSON.parse(saved) : {};
  });

  const [excusedAbsences, setExcusedAbsences] = useState<Record<string, Record<string, boolean>>>(() => {
    const saved = localStorage.getItem('excusedAbsences');
    return saved ? JSON.parse(saved) : {};
  });

  const [studentPhotos, setStudentPhotos] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('hteim_student_photos');
    return saved ? JSON.parse(saved) : {};
  });

  const [studentLevels, setStudentLevels] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('hteim_student_levels');
    return saved ? JSON.parse(saved) : {};
  });

  const [studentEnrollmentStatuses, setStudentEnrollmentStatuses] = useState<Record<string, 'active' | 'dropped_out' | 'withdrawn' | 'graduated' | 'leave_of_absence'>>(() => {
    const saved = localStorage.getItem('hteim_student_enrollment_statuses');
    return saved ? JSON.parse(saved) : {};
  });

  const [studentDropoutNotes, setStudentDropoutNotes] = useState<Record<string, { reason?: string; date?: string }>>(() => {
    const saved = localStorage.getItem('hteim_student_dropout_notes');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('hteim_student_enrollment_statuses', JSON.stringify(studentEnrollmentStatuses));
  }, [studentEnrollmentStatuses]);

  useEffect(() => {
    localStorage.setItem('hteim_student_dropout_notes', JSON.stringify(studentDropoutNotes));
  }, [studentDropoutNotes]);

  const [selectedReportLevel, setSelectedReportLevel] = useState<string>('all');
  const [selectedReportAttendanceFilter, setSelectedReportAttendanceFilter] = useState<'all' | 'fifty_percent' | 'at_risk' | 'satisfactory'>('all');

  // Modals visibility state
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showMobileDownloadModal, setShowMobileDownloadModal] = useState(false);
  const [showClassDaysModal, setShowClassDaysModal] = useState(false);

  // Cohort state
  const [cohorts, setCohorts] = useState<Cohort[]>(() => {
    try {
      const saved = localStorage.getItem('hteim_cohorts');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_COHORTS;
  });

  const [activeCohortId, setActiveCohortId] = useState<string>(() => {
    return localStorage.getItem('hteim_active_cohort_id') || 'cohort_2026';
  });

  useEffect(() => {
    localStorage.setItem('hteim_cohorts', JSON.stringify(cohorts));
  }, [cohorts]);

  useEffect(() => {
    localStorage.setItem('hteim_active_cohort_id', activeCohortId);
  }, [activeCohortId]);

  const activeCohort = useMemo(() => {
    const currentPrimary = cohorts.find(c => c.isCurrent) || cohorts[0] || DEFAULT_COHORTS[0];
    if (appUser?.role !== 'admin') {
      const selected = cohorts.find(c => c.id === activeCohortId);
      if (selected && !selected.isCurrent) {
        return currentPrimary;
      }
    }
    return cohorts.find(c => c.id === activeCohortId) || currentPrimary;
  }, [cohorts, activeCohortId, appUser?.role]);

  const sheetsSync = useGoogleSheetsSync({
    activeCohort,
    cohorts,
    token,
    records,
    setRecords,
    classDays,
    setClassDays,
    deletedClassDayIds,
    setError: (err) => {
      setError(err);
      if (err) showToast('error', 'Sheets Sync', err);
    },
    setIsLoading,
    isLoading,
    appUser,
  });

  const {
    sheetUrl,
    setSheetUrl,
    recentSheets,
    setRecentSheets,
    autoSyncInterval,
    setAutoSyncInterval,
    syncOnTabFocus,
    setSyncOnTabFocus,
    lastSyncedTime,
    setLastSyncedTime,
    dataSource,
    setDataSource,
    sheetMergePolicy,
    setSheetMergePolicy,
    pendingConflicts,
    setPendingConflicts,
    pendingSyncData,
    setPendingSyncData,
    handleLoadSheets,
    handleResolveConflicts,
    handleRemoveRecentSheet,
  } = sheetsSync;

  handleLoadSheetsRef.current = handleLoadSheets;

  const pwaHook = usePWAInstall();

  // Theme Mode
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('hteim_theme_mode');
    return (saved as ThemeMode) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('hteim_theme_mode', themeMode);
    document.documentElement.classList.remove('dark', 'high-contrast');
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (themeMode === 'high-contrast') {
      document.documentElement.classList.add('high-contrast');
    } else if (themeMode === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    }
  }, [themeMode]);

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    return CentralNotificationService.getNotifications() as AppNotification[];
  });

  // Custom Assignments & Submissions
  const [customAssignments, setCustomAssignments] = useState<CustomAssignment[]>(() => {
    const saved = localStorage.getItem('hteim_custom_assignments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.filter((a: any) => !['ASG-Q100', 'ASG-100', 'ASG-101', 'ASG-102', 'ASG-103', 'quiz_hermeneutics_exam_final', 'quiz_theology_midterm_2026', 'quiz_ot_survey_01', 'quiz_homiletics_project'].includes(a.id));
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>(() => {
    const saved = localStorage.getItem('hteim_assignment_submissions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.filter((s: any) => !['SUB-101-ABurke', 'SUB-101-CDavis', 'SUB-102-EEvans'].includes(s.id));
      } catch (e) { console.error(e); }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('hteim_custom_assignments', JSON.stringify(customAssignments));
    const activeEmail = appUser?.email || user?.email;
    const timer = setTimeout(() => {
      saveToSupabase(activeEmail, {
        records,
        classDays,
        customAssignments,
        submissions,
        payments,
      } as any, 'Auto-persist custom assignments to database').catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [customAssignments]);

  useEffect(() => {
    localStorage.setItem('hteim_assignment_submissions', JSON.stringify(submissions));
    const activeEmail = appUser?.email || user?.email;
    const timer = setTimeout(() => {
      saveToSupabase(activeEmail, {
        records,
        classDays,
        customAssignments,
        submissions,
        payments,
      } as any, 'Auto-persist submissions to database').catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem('hteim_student_payments', JSON.stringify(payments));
    const activeEmail = appUser?.email || user?.email;
    const timer = setTimeout(() => {
      saveToSupabase(activeEmail, {
        records,
        classDays,
        customAssignments,
        submissions,
        payments,
      } as any, 'Auto-persist payments to database').catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('attendanceRecords', JSON.stringify(records));
    const activeEmail = appUser?.email || user?.email;
    const timer = setTimeout(() => {
      saveToSupabase(activeEmail, {
        records,
        classDays,
        customAssignments,
        submissions,
        payments,
      } as any, 'Auto-persist attendance records to database').catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [records]);

  useEffect(() => {
    localStorage.setItem('classDays', JSON.stringify(classDays));
    const activeEmail = appUser?.email || user?.email;
    const timer = setTimeout(() => {
      saveToSupabase(activeEmail, {
        records,
        classDays,
        customAssignments,
        submissions,
        payments,
      } as any, 'Auto-persist class days to database').catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [classDays]);

  // Messages State
  const [messages, setMessages] = useState<AppMessage[]>(() => {
    const saved = localStorage.getItem('hteim_app_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.filter((m: any) => !['msg_welcome_101', 'msg_tuition_inquiry_1', 'msg_zoom_class_1'].includes(m.id));
      } catch (e) { console.error(e); }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('hteim_app_messages', JSON.stringify(messages));
  }, [messages]);

  const handleSendMessage = (msgData: Omit<AppMessage, 'id' | 'createdAt' | 'updatedAt' | 'replies' | 'isReadByRecipient' | 'isReadBySender' | 'status'>) => {
    const senderName = msgData.senderName || appUser?.studentName || appUser?.name || 'Student';
    const senderRole = msgData.senderRole || appUser?.role || 'student';
    const newMessage: AppMessage = {
      ...msgData,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderName,
      senderRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'open',
      isReadBySender: true,
      isReadByRecipient: false,
      replies: [],
      attachments: msgData.attachments || []
    };

    setMessages(prev => [newMessage, ...prev]);

    logActivity({
      actor: senderName,
      role: senderRole,
      actionCategory: 'System Settings',
      actionTitle: msgData.isGroupMessage ? 'Group Broadcast Sent' : 'New Message Sent',
      details: `Sent ${msgData.isGroupMessage ? 'group broadcast' : 'message'} '${msgData.subject}' to ${msgData.recipientName}`
    });
  };

  const handleReplyMessage = (messageId: string, replyText: string, attachments?: MessageAttachment[]) => {
    const replierName = appUser?.name || 'User';
    const replierRole = appUser?.role || 'student';

    const newReply: MessageReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderName: replierName,
      senderRole: replierRole === 'admin' ? 'admin' : replierRole === 'teacher' ? 'teacher' : 'student',
      senderEmail: appUser?.email,
      message: replyText,
      createdAt: new Date().toISOString(),
      attachments
    };

    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        return {
          ...m,
          replies: [...m.replies, newReply],
          updatedAt: new Date().toISOString(),
          status: 'in_progress',
          isReadByRecipient: false
        };
      }
      return m;
    }));
  };

  const handleUpdateMessageStatus = (messageId: string, status: AppMessage['status']) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status, updatedAt: new Date().toISOString() } : m));
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const unreadMessagesCount = useMemo(() => {
    const userRole = appUser?.role || 'student';
    const userName = (appUser?.studentName || appUser?.name || '').toLowerCase();

    return messages.filter(m => {
      if (m.status === 'archived') return false;
      if (userRole === 'admin') {
        return (m.recipientType === 'admin' || m.recipientType === 'all_staff') && !m.isReadByRecipient;
      } else if (userRole === 'teacher') {
        return (m.recipientType === 'teacher' || m.recipientType === 'all_staff') && !m.isReadByRecipient;
      } else {
        const isFromStudent = (m.senderName || '').toLowerCase().includes(userName) || m.senderEmail === appUser?.email;
        if (isFromStudent) {
          return m.status === 'in_progress' || m.status === 'open';
        }
        if (
          (m.recipientType === 'all_students' || m.recipientType === 'group' || m.recipientType === 'whatsapp_group' || m.isGroupMessage) &&
          !m.isReadByRecipient
        ) {
          return true;
        }
        return false;
      }
    }).length;
  }, [messages, appUser]);

  useEffect(() => {
    setNotifications(CentralNotificationService.getNotifications() as AppNotification[]);
    const unsubscribe = CentralNotificationService.subscribe(() => {
      setNotifications(CentralNotificationService.getNotifications() as AppNotification[]);
    });
    return () => unsubscribe();
  }, []);

  const handleRunNotificationScan = () => {
    const updated = generateAutomatedNotifications(
      customAssignments,
      submissions,
      CentralNotificationService.getNotifications() as AppNotification[],
      appUser?.role,
      appUser?.studentName || appUser?.name
    );
    CentralNotificationService.setNotifications(updated as any);
  };

  useEffect(() => {
    handleRunNotificationScan();
  }, [appUser, customAssignments, submissions]);

  const handleMarkNotifAsRead = (id: string) => {
    CentralNotificationService.markAsRead(id);
  };

  const handleMarkAllNotifsAsRead = () => {
    CentralNotificationService.markAllAsRead(appUser?.role, appUser?.studentName || appUser?.name);
  };

  const handleClearNotifs = () => {
    CentralNotificationService.clearAll();
  };

  const handleAddTestNotif = (notif: AppNotification) => {
    const current = CentralNotificationService.getNotifications();
    CentralNotificationService.setNotifications([notif as any, ...current]);
  };

  const handleSelectNotif = (notif: AppNotification) => {
    if (notif.actionTab) {
      setActiveErpTab(notif.actionTab);
    }
  };

  const [showBatchBroadcastModal, setShowBatchBroadcastModal] = useState(false);
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncedBannerMessage, setSyncedBannerMessage] = useState<string | null>(null);
  const [showOfflineDrawer, setShowOfflineDrawer] = useState(false);
  const [showPINCheckinModal, setShowPINCheckinModal] = useState(false);

  const [activeErpTab, setActiveErpTab] = useState<TabType>(getTabFromLocation);

  const handleNavigate = (tab: TabType) => {
    if (!appUser && tab !== 'home') {
      setShowLoginModal(true);
      return;
    }
    setActiveErpTab(tab);
    setIsNavOpen(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({ tab }, '', url);
    }
    trackUxEvent('navigation_changed', { tab, role: appUser?.role || 'guest' });
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      trackUxEvent('online_restored');
      setSyncedBannerMessage('🟢 Internet Reconnected! Mobile PWA auto-synced local attendance & student records.');
      setTimeout(() => setSyncedBannerMessage(null), 6000);
    };
    const handleOffline = () => {
      setIsOffline(true);
      trackUxEvent('offline_detected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleExportBackup = () => {
    if (appUser?.role === 'student') return;
    const data = {
      exportDate: new Date().toISOString(),
      atRiskThreshold,
      satisfactoryThreshold,
      autoSyncInterval,
      syncOnTabFocus,
      notifications,
      rubricScores,
      studentNotes,
      excusedAbsences,
      assignments: JSON.parse(localStorage.getItem('hteim_custom_assignments') || '[]'),
      submissions: JSON.parse(localStorage.getItem('hteim_assignment_submissions') || '[]')
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HTEIM_Portal_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (jsonContent: string): boolean => {
    if (appUser?.role === 'student') return false;
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed.atRiskThreshold !== undefined) setAtRiskThreshold(parsed.atRiskThreshold);
      if (parsed.satisfactoryThreshold !== undefined) setSatisfactoryThreshold(parsed.satisfactoryThreshold);
      if (parsed.autoSyncInterval !== undefined) setAutoSyncInterval(parsed.autoSyncInterval);
      if (parsed.syncOnTabFocus !== undefined) setSyncOnTabFocus(parsed.syncOnTabFocus);
      if (parsed.notifications) CentralNotificationService.setNotifications(parsed.notifications);
      if (parsed.rubricScores) setRubricScores(parsed.rubricScores);
      if (parsed.studentNotes) setStudentNotes(parsed.studentNotes);
      if (parsed.excusedAbsences) setExcusedAbsences(parsed.excusedAbsences);
      if (parsed.assignments) {
        localStorage.setItem('hteim_custom_assignments', JSON.stringify(parsed.assignments));
        setCustomAssignments(parsed.assignments);
      }
      if (parsed.submissions) {
        localStorage.setItem('hteim_assignment_submissions', JSON.stringify(parsed.submissions));
        setSubmissions(parsed.submissions);
      }
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  };

  const handleResetAllData = () => {
    if (appUser?.role === 'student') return;
    localStorage.removeItem('hteim_custom_assignments');
    localStorage.removeItem('hteim_assignment_submissions');
    localStorage.removeItem('hteim_app_notifications');
    localStorage.removeItem('studentNotes');
    localStorage.removeItem('excusedAbsences');
    CentralNotificationService.clearAll();
    setStudentNotes({});
    setExcusedAbsences({});
    setAtRiskThreshold(70);
    setSatisfactoryThreshold(80);
    window.location.reload();
  };

  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');
  const [mobileRollCallMode, setMobileRollCallMode] = useState<'cards' | 'rapid'>('rapid');
  const [densityMode, setDensityMode] = useState<'comfortable' | 'dense'>(() => {
    const saved = localStorage.getItem('densityMode');
    return (saved as 'comfortable' | 'dense') || 'comfortable';
  });

  const [showTrendChart, setShowTrendChart] = useState<boolean>(true);
  const [showEmailDraftModal, setShowEmailDraftModal] = useState<boolean>(false);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [certificateData, setCertificateData] = useState<{
    studentName: string;
    awardTitle: string;
    criteria: string;
    rate: number;
    avgScore: number | null;
  } | null>(null);

  const [selectedModule, setSelectedModule] = useState<'all' | 'm1' | 'm2' | 'm3'>('all');
  const [selectedStudentNames, setSelectedStudentNames] = useState<string[]>([]);
  const [showBatchEmailModal, setShowBatchEmailModal] = useState<boolean>(false);
  const [showStudentTranscriptModal, setShowStudentTranscriptModal] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  const [showLiveCheckinModal, setShowLiveCheckinModal] = useState<boolean>(false);
  const [liveCheckinDayId, setLiveCheckinDayId] = useState<string>('');

  const [rubricScores, setRubricScores] = useState<Record<string, { participation: number; scripture: number; assignment: number }>>(() => {
    const saved = localStorage.getItem('rubricScores');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('rubricScores', JSON.stringify(rubricScores));
  }, [rubricScores]);

  const [gradingWeights, setGradingWeights] = useState<GradingWeights>(() => {
    try {
      const saved = localStorage.getItem('hteim_grading_weights');
      return saved ? JSON.parse(saved) : DEFAULT_GRADING_WEIGHTS;
    } catch {
      return DEFAULT_GRADING_WEIGHTS;
    }
  });

  useEffect(() => {
    localStorage.setItem('hteim_grading_weights', JSON.stringify(gradingWeights));
  }, [gradingWeights]);

  useEffect(() => {
    localStorage.setItem('densityMode', densityMode);
  }, [densityMode]);

  const [showFloatingQuizBanner, setShowFloatingQuizBanner] = useState<boolean>(true);

  const activeQuizzesList = useMemo(() => {
    return customAssignments.filter(a => (a.type === 'quiz' || a.quizData) && a.quizData?.isPublished !== false);
  }, [customAssignments]);

  const [atRiskThreshold, setAtRiskThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('atRiskThreshold');
    return saved ? parseInt(saved, 10) : 50;
  });

  const [satisfactoryThreshold, setSatisfactoryThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('satisfactoryThreshold');
    return saved ? parseInt(saved, 10) : 80;
  });

  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [supabaseTableMissing, setSupabaseTableMissing] = useState<boolean>(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState<boolean>(false);

  // Cloud pull on startup
  useEffect(() => {
    let active = true;
    const initialPull = async () => {
      setIsCloudSyncing(true);
      setCloudSyncError(null);
      setSupabaseTableMissing(false);
      const activeEmail = appUser?.email || user?.email;
      try {
        const cloudState = await loadFromSupabase(activeEmail);
        if (cloudState && active) {
          if (cloudState.records !== undefined) setRecords(cloudState.records);
          if (cloudState.classDays !== undefined) setClassDays(cloudState.classDays);
          if (cloudState.studentNotes !== undefined) setStudentNotes(cloudState.studentNotes);
          if (cloudState.excusedAbsences !== undefined) setExcusedAbsences(cloudState.excusedAbsences);
          if (cloudState.rubricScores !== undefined) setRubricScores(cloudState.rubricScores);
          if (cloudState.deletedStudentNames !== undefined) {
            setDeletedStudentNames(cloudState.deletedStudentNames.filter((name: string) => {
              const lower = (name || '').toLowerCase().trim();
              return !lower.includes('colette') && !lower.includes('blackburn') && !lower.includes('susan') && !lower.includes('sparks');
            }));
          }
          if (cloudState.studentPhotos !== undefined) setStudentPhotos(cloudState.studentPhotos);
          if (cloudState.studentLevels !== undefined) setStudentLevels(cloudState.studentLevels);

          if (cloudState.customAssignments !== undefined) {
            setCustomAssignments(prev => {
              const cloudIds = new Set(cloudState.customAssignments.map((a: any) => a.id));
              const localOnly = prev.filter(a => !cloudIds.has(a.id));
              return [...cloudState.customAssignments, ...localOnly];
            });
          }
          if (cloudState.submissions !== undefined) {
            setSubmissions(prev => {
              const cloudIds = new Set(cloudState.submissions.map((s: any) => s.id));
              const localOnly = prev.filter(s => !cloudIds.has(s.id));
              return [...cloudState.submissions, ...localOnly];
            });
          }
          if (cloudState.libraryResources !== undefined) {
            setLibraryResources(prev => {
              const cloudIds = new Set(cloudState.libraryResources.map((r: any) => r.id));
              const localOnly = prev.filter(r => !cloudIds.has(r.id));
              const merged = [...cloudState.libraryResources, ...localOnly];
              
              syncLibraryFromSupabaseBucket(merged).then(({ updatedResources, addedCount }) => {
                if (addedCount > 0) {
                  setLibraryResources(updatedResources);
                }
              }).catch(() => {});

              return merged;
            });
          } else {
            syncLibraryFromSupabaseBucket(libraryResources).then(({ updatedResources, addedCount }) => {
              if (addedCount > 0) {
                setLibraryResources(updatedResources);
              }
            }).catch(() => {});
          }
          if (cloudState.classroomMedia !== undefined) {
            setClassroomMedia(prev => {
              const cloudIds = new Set(cloudState.classroomMedia.map((m: any) => m.id));
              const localOnly = prev.filter(m => !cloudIds.has(m.id));
              return [...cloudState.classroomMedia, ...localOnly];
            });
          }

          // Also pull from relational assignments table
          try {
            const apiRes = await portalApi.getAssignments();
            if (apiRes && Array.isArray(apiRes.assignments) && apiRes.assignments.length > 0) {
              setCustomAssignments(prev => {
                const existingIds = new Set(prev.map((a: any) => a.id));
                const newItems = apiRes.assignments.filter((a: any) => !existingIds.has(a.id));
                return [...prev, ...newItems];
              });
            }
          } catch {
            // Non-blocking relational fetch
          }

          // Automatically sync quizzes on load if user is logged in
          if (appUser && handleLoadSheetsRef.current) {
            handleLoadSheetsRef.current().catch(() => {});
          }

          if (cloudState.notifications !== undefined) CentralNotificationService.setNotifications(cloudState.notifications);
          if (cloudState.sheetUrl !== undefined) setSheetUrl(cloudState.sheetUrl);
          if (cloudState.courses !== undefined) setCourses(cloudState.courses);
          if (cloudState.schedules !== undefined) setSchedules(cloudState.schedules);
          if (cloudState.payments !== undefined) setPayments(cloudState.payments);
          if (cloudState.messages !== undefined) setMessages(cloudState.messages);
          if (cloudState.zoomExceptionNote !== undefined) setZoomExceptionNote(cloudState.zoomExceptionNote);
          if (cloudState.hasZoomException !== undefined) setHasZoomException(cloudState.hasZoomException);
          if (cloudState.userCredentials !== undefined && Array.isArray(cloudState.userCredentials) && cloudState.userCredentials.length > 0) {
            setUserCredentials(prev => mergeUserCredentials(prev, cloudState.userCredentials));
          }
          if (Array.isArray(cloudState.facultyTeachers) && cloudState.facultyTeachers.length > 0) {
            setFacultyTeachers(cloudState.facultyTeachers);
            try {
              localStorage.setItem('hteim_faculty_teachers_v1', JSON.stringify(cloudState.facultyTeachers));
            } catch (e) {}
          }
          
          if (cloudState.updatedAt) {
            const timeStr = new Date(cloudState.updatedAt).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            });
            setLastSyncedTime(timeStr);
          }
          setSyncedBannerMessage("⚡ Supabase Sync: Successfully pulled latest school database from Supabase.");
          setTimeout(() => setSyncedBannerMessage(null), 4500);
        } else if (cloudState === null && active) {
          let facultyList: any[] = [];
          try {
            facultyList = JSON.parse(localStorage.getItem('hteim_faculty_teachers_v1') || '[]');
          } catch (e) {}

          const stateToSave = {
            records,
            classDays,
            studentNotes,
            excusedAbsences,
            rubricScores,
            deletedStudentNames,
            studentPhotos,
            studentLevels,
            customAssignments,
            submissions,
            notifications,
            sheetUrl,
            courses,
            schedules,
            libraryResources,
            classroomMedia,
            facultyTeachers: facultyList,
            payments,
            messages,
            zoomExceptionNote,
            hasZoomException,
            userCredentials
          };
          const success = await saveToSupabase(activeEmail, stateToSave);
          if (success) {
            const timeStr = new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            });
            setLastSyncedTime(timeStr);
            setSyncedBannerMessage("⚡ Supabase Cloud Connected: Successfully uploaded existing database.");
            setTimeout(() => setSyncedBannerMessage(null), 5000);
          }
        }
      } catch (err: any) {
        console.error("Cloud pull error:", err);
        if (err.message === 'TABLE_NOT_FOUND') {
          setSupabaseTableMissing(true);
          setCloudSyncError("Supabase setup required: 'app_states' table not found.");
        } else {
          setCloudSyncError("Could not retrieve cloud sync data.");
        }
      } finally {
        if (active) setIsCloudSyncing(false);
      }
    };

    initialPull();
    return () => {
      active = false;
    };
  }, [user, appUser]);

  const handlePushToCloud = async () => {
    setIsCloudSyncing(true);
    setCloudSyncError(null);
    setSupabaseTableMissing(false);
    const activeEmail = appUser?.email || user?.email;
    try {
      let syncedStudentPhotos = studentPhotos;
      let syncedFaculty = facultyTeachers;

      try {
        syncedStudentPhotos = await syncStudentPhotosToSupabase(studentPhotos);
        setStudentPhotos(syncedStudentPhotos);
        try {
          localStorage.setItem('hteim_student_photos', JSON.stringify(syncedStudentPhotos));
        } catch (e) {}
      } catch (err) {}

      try {
        syncedFaculty = await syncFacultyImagesToSupabase(facultyTeachers);
        setFacultyTeachers(syncedFaculty);
        try {
          localStorage.setItem('hteim_faculty_teachers_v1', JSON.stringify(syncedFaculty));
        } catch (e) {}
      } catch (err) {}

      const stateToSave = {
        records,
        classDays,
        studentNotes,
        excusedAbsences,
        rubricScores,
        deletedStudentNames,
        studentPhotos: syncedStudentPhotos,
        studentLevels,
        customAssignments,
        submissions,
        notifications,
        sheetUrl,
        courses,
        schedules,
        libraryResources,
        classroomMedia,
        facultyTeachers: syncedFaculty,
        payments,
        messages,
        zoomExceptionNote,
        hasZoomException,
        userCredentials
      };
      const success = await saveToSupabase(activeEmail, stateToSave);
      if (success) {
        setLastSyncedTime(new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }));
        setSyncedBannerMessage("⚡ Cloud Backup Saved: Your workspace is fully synchronized in Supabase.");
        setTimeout(() => setSyncedBannerMessage(null), 4000);
      } else {
        setCloudSyncError("Cloud save failed.");
      }
    } catch (err: any) {
      console.error("Cloud push error:", err);
      if (err.message === 'TABLE_NOT_FOUND') {
        setSupabaseTableMissing(true);
        setCloudSyncError("Supabase setup required: 'app_states' table not found.");
      } else {
        setCloudSyncError("Failed to save backup to Supabase.");
      }
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleExportPDF = async (elementId: string, defaultFileName: string) => {
    setIsGeneratingPDF(true);
    try {
      await exportElementToPDF(elementId, defaultFileName, (msg) => {
        setSyncedBannerMessage(msg);
        setTimeout(() => setSyncedBannerMessage(null), 4000);
      });
    } catch (err) {
      console.error('PDF Generation error:', err);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Shared Public Quiz detection & response handler
  const [activePublicQuiz, setActivePublicQuiz] = useState<QuizAssignment | null>(null);
  const [isLoadingPublicQuiz, setIsLoadingPublicQuiz] = useState<boolean>(false);
  const [isPublicQuizNotFound, setIsPublicQuizNotFound] = useState<boolean>(false);
  const [publicQuizError, setPublicQuizError] = useState<string | null>(null);

  useEffect(() => {
    const getQuizShareCodeFromUrl = (): string | null => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const qParam = searchParams.get('quiz') || searchParams.get('shareCode') || searchParams.get('quizId') || searchParams.get('q');
        if (qParam) return qParam.trim();

        const pathname = window.location.pathname || '';
        if (pathname.startsWith('/quiz/')) {
          const pVal = pathname.replace('/quiz/', '').trim();
          if (pVal) return pVal;
        }

        const hash = window.location.hash || '';
        if (hash.startsWith('#quiz/')) return hash.replace('#quiz/', '').trim();
        if (hash.startsWith('#/quiz/')) return hash.replace('#/quiz/', '').trim();
        if (hash.includes('quiz=')) {
          const parts = hash.split('?');
          if (parts.length > 1) {
            const hashParams = new URLSearchParams(parts[1]);
            const hVal = hashParams.get('quiz') || hashParams.get('shareCode');
            if (hVal) return hVal.trim();
          }
        }
      } catch {}
      return null;
    };

    const code = getQuizShareCodeFromUrl();
    if (!code) {
      return;
    }

    const cleanCode = code.toLowerCase().trim();
    
    // Gather all local quizzes from state AND all possible localStorage keys
    let localSavedCustom: any[] = [];
    try {
      const raw1 = localStorage.getItem('hteim_custom_assignments');
      if (raw1) {
        const parsed = JSON.parse(raw1);
        if (Array.isArray(parsed)) localSavedCustom.push(...parsed);
      }
    } catch {}

    try {
      const raw2 = localStorage.getItem('hteim_offline_state_snapshot');
      if (raw2) {
        const parsed = JSON.parse(raw2);
        if (Array.isArray(parsed?.customAssignments)) localSavedCustom.push(...parsed.customAssignments);
        if (Array.isArray(parsed?.assignments)) localSavedCustom.push(...parsed.assignments);
      }
    } catch {}

    try {
      const raw3 = localStorage.getItem('hteim_portal_state');
      if (raw3) {
        const parsed = JSON.parse(raw3);
        if (Array.isArray(parsed?.customAssignments)) localSavedCustom.push(...parsed.customAssignments);
      }
    } catch {}

    const combinedAssignments = [
      ...(customAssignments || []),
      ...localSavedCustom
    ];

    const allQuizzes: QuizAssignment[] = [
      ...combinedAssignments
        .map(a => {
          if (a?.quizData && Array.isArray(a.quizData.questions) && a.quizData.questions.length > 0) {
            return a.quizData;
          }
          if (Array.isArray(a?.questions) && a.questions.length > 0) {
            return a;
          }
          return null;
        })
        .filter(Boolean),
      ...DEFAULT_QUIZ_TEMPLATES
    ];

    const matched = allQuizzes.find(
      q => (q.shareCode && q.shareCode.toLowerCase().trim() === cleanCode) ||
           (q.id && q.id.toLowerCase().trim() === cleanCode) ||
           ((q as any).share_code && (q as any).share_code.toLowerCase().trim() === cleanCode) ||
           (`qz_${(q.id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}` === cleanCode)
    );

    if (matched) {
      if (matched.isPublished === false) {
        setActivePublicQuiz(null);
        setIsPublicQuizNotFound(true);
        setPublicQuizError('This quiz is currently unpublished or revoked by the instructor.');
      } else {
        setActivePublicQuiz(matched);
        setIsPublicQuizNotFound(false);
        setPublicQuizError(null);
      }
    } else {
      setIsLoadingPublicQuiz(true);
      setIsPublicQuizNotFound(false);
      setPublicQuizError(null);
      portalApi.getPublicQuiz(code)
        .then(res => {
          if (res?.quiz) {
            if (res.quiz.isPublished === false) {
              setActivePublicQuiz(null);
              setIsPublicQuizNotFound(true);
              setPublicQuizError('This quiz is currently unpublished or revoked by the instructor.');
            } else {
              setActivePublicQuiz(res.quiz);
              setIsPublicQuizNotFound(false);
              setPublicQuizError(null);
            }
          } else {
            setActivePublicQuiz(null);
            setIsPublicQuizNotFound(true);
            setPublicQuizError('Quiz unavailable or link is invalid.');
          }
        })
        .catch((err: any) => {
          setActivePublicQuiz(null);
          setIsPublicQuizNotFound(true);
          setPublicQuizError(err?.message || 'Quiz unavailable or link is invalid.');
        })
        .finally(() => setIsLoadingPublicQuiz(false));
    }
  }, [customAssignments]);

  const handleClosePublicQuiz = () => {
    setActivePublicQuiz(null);
    setIsPublicQuizNotFound(false);
    setPublicQuizError(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('quiz');
      url.searchParams.delete('shareCode');
      url.searchParams.delete('quizId');
      url.searchParams.delete('q');
      if (url.hash.startsWith('#quiz')) url.hash = '';
      window.history.replaceState({}, document.title, url.toString());
    } catch {}
  };

  const handlePublicQuizSubmit = async (submission: QuizSubmission) => {
    // 1. Immediately persist to localStorage 'hteim_quiz_submissions' for Quiz Management & Submissions Log
    try {
      const savedSubsStr = localStorage.getItem('hteim_quiz_submissions');
      const savedSubs: QuizSubmission[] = savedSubsStr ? JSON.parse(savedSubsStr) : [];
      const filtered = savedSubs.filter(s => s.id !== submission.id);
      localStorage.setItem('hteim_quiz_submissions', JSON.stringify([submission, ...filtered]));
    } catch (e) {
      console.warn('Could not save quiz submission to local storage:', e);
    }

    // 2. Broadcast event to instantly notify mounted components (e.g. ExamsTab, QuizDashboard)
    try {
      window.dispatchEvent(new CustomEvent('hteim_quiz_submitted', { detail: submission }));
    } catch {}

    // 3. Adapt for general assignment submissions state
    const adaptedSub: AssignmentSubmission = {
      id: submission.id,
      assignmentId: submission.quizId,
      assignmentTitle: submission.quizTitle || 'Assessment',
      studentName: submission.studentName,
      submittedAt: submission.submittedAt,
      score: submission.score,
      maxScore: submission.totalPossible,
      percentage: submission.percentage,
      status: submission.percentage >= 75 ? 'Graded' : 'Submitted',
      updatedAt: submission.submittedAt,
      timeSpentSeconds: submission.timeSpentSeconds,
      quizAnswers: submission.responses,
    } as any;

    setSubmissions(prev => {
      const filtered = prev.filter(s => s.id !== submission.id);
      return [adaptedSub, ...filtered];
    });

    try {
      const publicQuizShareCode = activePublicQuiz?.shareCode || submission.shareCode || submission.quizId;

      const rawRes = (submission as any).rawResponses;
      let responsesPayload: Record<string, any> = {};
      if (rawRes && typeof rawRes === 'object' && !Array.isArray(rawRes)) {
        responsesPayload = rawRes;
      } else if (Array.isArray(submission.responses)) {
        submission.responses.forEach(r => {
          if (r && r.questionId) {
            const val = r.selectedOptionId ?? r.selectedOptionIds ?? r.textAnswer;
            if (val !== undefined) {
              responsesPayload[r.questionId] = val;
            }
          }
        });
      }

      await portalApi.submitPublicQuizResponse(
        publicQuizShareCode,
        {
          studentName: submission.studentName,
          studentEmail: submission.studentEmail,
          responses: submission.responses, // Pass full QuizSubmissionResponse[] with version IDs
          rawResponses: responsesPayload,  // Keep flattened for backward compatibility if needed
          timeSpentSeconds: submission.timeSpentSeconds,
          quizId: submission.quizId,
          quizVersionId: submission.quizVersionId, // Pass the specific version ID
          score: submission.score,
          totalPossible: submission.totalPossible,
          percentage: submission.percentage,
          attemptId: (submission as any).attemptId
        }
      );
      showToast('success', 'Quiz Response Recorded', 'Your submission has been captured in HTEIM School of Ministry.');

      // Sync latest cloud state in background
      loadFromSupabase(appUser?.email || user?.email).then(cloudState => {
        if (cloudState?.submissions && Array.isArray(cloudState.submissions)) {
          setSubmissions(prev => {
            const cloudIds = new Set(cloudState.submissions.map((s: any) => s.id));
            const localOnly = prev.filter(s => !cloudIds.has(s.id));
            return [...cloudState.submissions, ...localOnly];
          });
        }
      }).catch(() => {});
    } catch (err: any) {
      console.warn('Public quiz response submission server notice:', err);
    }
  };

  // Helper values for students & effective class days
  const effectiveClassDays = useMemo(() => {
    return classDays.filter(d => !deletedClassDayIds.includes(d.id));
  }, [classDays, deletedClassDayIds]);

  const uniqueStudents = useMemo(() => {
    const allRawNames = [
      ...MASTER_ENROLLED_STUDENTS,
      ...records.map(r => r.name || r.studentName || '').filter(Boolean)
    ];
    const canonicalMap = getCanonicalNamesMap(allRawNames);

    const resolveCanonical = (rawName: string): string => {
      if (!rawName) return '';
      const norm = normalizeStudentName(rawName);
      if (MANUAL_ALIASES[norm]) return MANUAL_ALIASES[norm];
      if (canonicalMap.has(norm)) return canonicalMap.get(norm)!;
      if (canonicalMap.has(rawName.trim())) return canonicalMap.get(rawName.trim())!;
      const masterMatch = MASTER_ENROLLED_STUDENTS.find(m => normalizeStudentName(m) === norm);
      if (masterMatch) return masterMatch;
      return rawName.trim();
    };

    // Use a Map keyed by normalized name to guarantee exactly one entry per student
    const studentNameMap = new Map<string, string>();

    // 1. Authoritative enrolled students
    MASTER_ENROLLED_STUDENTS.forEach(name => {
      if (!name || isExcludedStudent(name)) return;
      const canonical = resolveCanonical(name);
      if (!isExcludedStudent(canonical)) {
        const key = normalizeStudentName(canonical);
        studentNameMap.set(key, canonical);
      }
    });

    // 2. Extra valid students from records
    records.forEach(r => {
      const raw = r.name || r.studentName;
      if (!raw || isExcludedStudent(raw)) return;
      const canonical = resolveCanonical(raw);
      if (!isExcludedStudent(canonical)) {
        const key = normalizeStudentName(canonical);
        if (!studentNameMap.has(key)) {
          studentNameMap.set(key, canonical);
        }
      }
    });

    const seenIds = new Set<string>();

    const studentList: StudentSummary[] = Array.from(studentNameMap.values())
      .filter(name => !deletedStudentNames.some(d => normalizeStudentName(d) === normalizeStudentName(name)))
      .map((name, idx) => {
        const studentNorm = normalizeStudentName(name);
        const studentRecords = records.filter(r => {
          const rRaw = r.name || r.studentName || '';
          const rCanon = resolveCanonical(rRaw);
          return normalizeStudentName(rCanon) === studentNorm || normalizeStudentName(rRaw) === studentNorm;
        });

        const studentSubmissions = submissions.filter(sub => {
          const subName = (sub.studentName || '').toLowerCase().trim();
          const subCanon = resolveCanonical(subName);
          return normalizeStudentName(subCanon) === studentNorm || normalizeStudentName(subName) === studentNorm;
        });

        let attended = 0;
        let total = 0;
        let totalScorePct = 0;
        let scoredLessons = 0;
        const attendanceByDay: Record<string, { present: boolean; timestamp?: string; score?: string }> = {};

        // 1. Process attendance records (including Google Sheets quizzes)
        const scoredCurriculumLessons = new Set<string>();
        effectiveClassDays.forEach(day => {
          const normDayId = (day.id || '').toLowerCase().trim();
          const normDayName = (day.name || '').toLowerCase().trim();
          const strippedDayId = normDayId.split('(')[0].trim();
          const strippedDayName = normDayName.split('(')[0].trim();

          const rec = studentRecords.find(r => {
            if (!r || !r.classDay) return false;
            return isMatchingLesson(r.classDay, day.id) || (day.name && isMatchingLesson(r.classDay, day.name));
          });

          if (rec) {
            const isPresent = rec.present === true || (rec.status || '').toLowerCase() === 'present';
            const dayEntry = { present: isPresent, score: rec.score, timestamp: rec.timestamp };
            
            attendanceByDay[day.id] = dayEntry;
            if (day.name) attendanceByDay[day.name] = dayEntry;
            if (normDayId) attendanceByDay[normDayId] = dayEntry;
            if (normDayName) attendanceByDay[normDayName] = dayEntry;
            if (strippedDayId) attendanceByDay[strippedDayId] = dayEntry;
            if (strippedDayName) attendanceByDay[strippedDayName] = dayEntry;

            if (isPresent) attended++;

            if (rec.score && String(rec.score).trim() !== '' && String(rec.score).trim() !== '—') {
              const str = String(rec.score).trim();
              let pct: number | null = null;
              const maxPoints = getLessonMaxPoints(day.id || day.name || rec.classDay);
              if (str.includes('/')) {
                const parts = str.split('/');
                const num = parseFloat(parts[0]);
                const den = parseFloat(parts[1]);
                if (!isNaN(num) && !isNaN(den) && den > 0) pct = Math.min(100, Math.round((num / den) * 100));
              } else if (str.includes('%')) {
                const num = parseFloat(str.replace('%', ''));
                if (!isNaN(num)) pct = Math.min(100, Math.round(num));
              } else {
                const num = parseFloat(str);
                if (!isNaN(num)) {
                  pct = Math.min(100, Math.round((num / maxPoints) * 100));
                }
              }
              if (pct !== null) {
                totalScorePct += pct;
                scoredLessons++;
                scoredCurriculumLessons.add(day.id);
                if (day.name) scoredCurriculumLessons.add(day.name);
              }
            }
          } else {
            const absentEntry = { present: false };
            attendanceByDay[day.id] = absentEntry;
            if (day.name) attendanceByDay[day.name] = absentEntry;
            if (normDayId) attendanceByDay[normDayId] = absentEntry;
            if (normDayName) attendanceByDay[normDayName] = absentEntry;
          }
          total++;
        });

        // 2. Process assignments & quizzes from submissions list (prevent duplicate scoring of curriculum quizzes)
        studentSubmissions.forEach(sub => {
          if (!sub) return;
          const matchingAsg = customAssignments.find(a => a.id === sub.assignmentId);
          if (matchingAsg) {
            const isAlreadyScored = Array.from(scoredCurriculumLessons).some(lessonKey =>
              isMatchingLesson(matchingAsg.title, lessonKey) || (matchingAsg.classDay && isMatchingLesson(matchingAsg.classDay, lessonKey))
            );
            if (isAlreadyScored) return;
          }

          if (sub.score !== undefined) {
            const maxPoints = matchingAsg ? matchingAsg.maxPoints : (sub.maxScore || sub.maxPoints || 100);
            const pct = Math.min(100, Math.round((sub.score / maxPoints) * 100));
            totalScorePct += pct;
            scoredLessons++;
          } else if (sub.percentage !== undefined) {
            totalScorePct += sub.percentage;
            scoredLessons++;
          }
        });

        const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
        const levelId = studentLevels[name] || getDefaultLevelForStudent(name);
        const avgScore = scoredLessons > 0 ? Math.round(totalScorePct / scoredLessons) : null;
        const percentage = avgScore;
        const scoreStr = avgScore !== null ? `${avgScore}%` : '—';
        const key = (name || '').toLowerCase().trim();
        const enrollmentStatus = studentEnrollmentStatuses[name] || studentEnrollmentStatuses[studentNorm] || studentEnrollmentStatuses[key] || 'active';
        const isDroppedOut = enrollmentStatus === 'dropped_out' || enrollmentStatus === 'withdrawn';
        const dropoutInfo = studentDropoutNotes[name] || studentDropoutNotes[studentNorm] || studentDropoutNotes[key] || {};

        let id = `std-${studentNorm.replace(/[^a-z0-9]+/g, '-')}`;
        if (seenIds.has(id)) {
          id = `${id}-${idx}`;
        }
        seenIds.add(id);

        return {
          id,
          name,
          attended,
          totalDays: total,
          rate,
          attendanceRate: rate,
          attendedSessions: attended,
          totalSessions: total,
          attendanceByDay,
          avgScore,
          percentage,
          scoreStr,
          levelId,
          enrollmentStatus,
          isDroppedOut,
          dropoutReason: dropoutInfo.reason,
          dropoutDate: dropoutInfo.date,
        };
      });

    return studentList;
  }, [records, effectiveClassDays, deletedStudentNames, studentLevels, studentEnrollmentStatuses, studentDropoutNotes, submissions, customAssignments]);

  const classDayStats = useMemo(() => {
    const stats: Record<string, { count: number; percentage: number }> = {};
    effectiveClassDays.forEach(day => {
      const dayRecs = records.filter(r => 
        (r.classDay === day.id || r.classDay === day.name || isMatchingLesson(r.classDay, day.id) || (day.name && isMatchingLesson(r.classDay, day.name))) && 
        (r.present === true || (r.status || '').toLowerCase() === 'present')
      );
      const totalStds = uniqueStudents.length || 1;
      stats[day.id] = { count: dayRecs.length, percentage: Math.round((dayRecs.length / totalStds) * 100) };
    });
    return stats;
  }, [effectiveClassDays, records, uniqueStudents.length]);

  const trendChartData = useMemo(() => {
    return effectiveClassDays.map(day => {
      const stats = classDayStats[day.id] || { count: 0, percentage: 0 };
      const safeName = day?.name || `Day ${day?.id || '?'}`;
      return {
        name: safeName.length > 16 ? safeName.substring(0, 14) + '...' : safeName,
        fullName: safeName,
        rate: Math.round(stats.percentage),
        present: stats.count,
        total: uniqueStudents.length,
      };
    });
  }, [effectiveClassDays, classDayStats, uniqueStudents.length]);

  const filteredAndSortedStudents = useMemo(() => {
    return uniqueStudents
      .filter(student => {
        if (searchQuery.trim() !== '') {
          if (!(student?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())) {
            return false;
          }
        }
        if (statusFilter === 'at_risk' && student.rate >= atRiskThreshold) return false;
        if (statusFilter === 'moderate' && (student.rate < atRiskThreshold || student.rate >= satisfactoryThreshold)) return false;
        if (statusFilter === 'perfect' && student.rate < satisfactoryThreshold) return false;
        if (statusFilter === 'fifty_percent' && student.rate > 50) return false;
        if (statusFilter === 'honor_roll') {
          const isHonor = student.rate >= 100 || (student.avgScore !== null && student.avgScore >= 85);
          if (!isHonor) return false;
        }
        if (statusFilter === 'unpaid') {
          const pDetails = getStudentPaymentDetails(student.name);
          if (!pDetails.hasOutstanding) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const nameA = (a?.name || '').trim();
        const nameB = (b?.name || '').trim();

        const getLastName = (fullName: string) => {
          const parts = fullName.trim().split(/\s+/);
          return parts.length > 1 ? parts[parts.length - 1] : fullName;
        };

        if (sortBy === 'name_asc') {
          return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
        }
        if (sortBy === 'name_desc') {
          return nameB.localeCompare(nameA, undefined, { sensitivity: 'base', numeric: true });
        }
        if (sortBy === 'last_name_asc') {
          const lastCmp = getLastName(nameA).localeCompare(getLastName(nameB), undefined, { sensitivity: 'base', numeric: true });
          return lastCmp !== 0 ? lastCmp : nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
        }
        if (sortBy === 'last_name_desc') {
          const lastCmp = getLastName(nameB).localeCompare(getLastName(nameA), undefined, { sensitivity: 'base', numeric: true });
          return lastCmp !== 0 ? lastCmp : nameB.localeCompare(nameA, undefined, { sensitivity: 'base', numeric: true });
        }
        if (sortBy === 'rate_desc') {
          return b.rate - a.rate || nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
        }
        if (sortBy === 'rate_asc') {
          return a.rate - b.rate || nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
        }
        if (sortBy === 'score_desc') {
          return ((b.avgScore ?? 0) - (a.avgScore ?? 0)) || nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
        }
        if (sortBy === 'score_asc') {
          return ((a.avgScore ?? 0) - (b.avgScore ?? 0)) || nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
        }
        return 0;
      });
  }, [uniqueStudents, searchQuery, statusFilter, sortBy, atRiskThreshold, satisfactoryThreshold]);

  const loggedInStudentData = useMemo(() => {
    if (appUser && appUser.role === 'student') {
      const rawName = appUser.studentName || appUser.name || '';
      const studentNameLower = (rawName || '').toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
      const mappedCanonical = (MANUAL_ALIASES[studentNameLower] || rawName).toLowerCase().trim();

      return uniqueStudents.find(st => {
        if (!st || !st.name) return false;
        const stLower = st.name.toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');
        const stCanonical = (MANUAL_ALIASES[stLower] || st.name).toLowerCase().trim();
        return stLower === studentNameLower || stLower === mappedCanonical || stCanonical === mappedCanonical || stCanonical === studentNameLower;
      });
    }
    return null;
  }, [appUser, uniqueStudents]);

  const currentStudentPortalData = useMemo(() => {
    const sName = appUser?.studentName || appUser?.name || 'Student';
    if (loggedInStudentData) {
      return {
        name: loggedInStudentData.name,
        rate: loggedInStudentData.rate,
        attended: loggedInStudentData.attended,
        totalDays: loggedInStudentData.totalDays,
        avgScore: loggedInStudentData.avgScore,
        attendanceByDay: loggedInStudentData.attendanceByDay,
        note: loggedInStudentData.note,
        photoUrl: studentPhotos[(sName || '').toLowerCase().trim()] || loggedInStudentData.photoUrl
      };
    }
    return {
      name: sName,
      rate: 100,
      attended: effectiveClassDays.length,
      totalDays: effectiveClassDays.length || 1,
      avgScore: null,
      attendanceByDay: {},
      photoUrl: studentPhotos[(sName || '').toLowerCase().trim()] || ''
    };
  }, [appUser, loggedInStudentData, studentPhotos, effectiveClassDays.length]);

  const avgAttendance = useMemo(() => {
    if (uniqueStudents.length === 0) return 0;
    const totalRate = uniqueStudents.reduce((sum, s) => sum + s.rate, 0);
    return Math.round(totalRate / uniqueStudents.length);
  }, [uniqueStudents]);

  const uncollectedTuitionAmount = useMemo(() => {
    return payments.reduce((sum, p) => sum + Math.max(0, (p.totalTuition || 0) - (p.amountPaid || 0)), 0);
  }, [payments]);

  const pendingAssignmentsCount = useMemo(() => {
    if (appUser?.role === 'student') {
      const studentNameLower = (appUser.studentName || appUser.name || '').toLowerCase().trim();
      const submittedIds = new Set(
        submissions
          .filter(s => s.studentName && (s?.studentName || '').toLowerCase().trim() === studentNameLower)
          .map(s => s.assignmentId)
      );
      return customAssignments.filter(a => !submittedIds.has(a.id)).length;
    }
    const unGraded = submissions.filter(s => s.status === 'Submitted' || s.status === 'Pending Review').length;
    return unGraded > 0 ? unGraded : customAssignments.length;
  }, [appUser, submissions, customAssignments]);

  const toggleSelectStudent = (name: string) => {
    setSelectedStudentNames(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleSelectAllDisplayed = () => {
    if (selectedStudentNames.length >= filteredAndSortedStudents.length && filteredAndSortedStudents.length > 0) {
      setSelectedStudentNames([]);
    } else {
      setSelectedStudentNames(filteredAndSortedStudents.map(s => s.name));
    }
  };

  const handleSelectAllAtRisk = () => {
    const atRiskNames = uniqueStudents.filter(s => s.rate < atRiskThreshold).map(s => s.name);
    setSelectedStudentNames(atRiskNames);
  };

  const clearBatchSelection = () => {
    setSelectedStudentNames([]);
  };

  const handleExportCSV = () => {
    if (uniqueStudents.length === 0) return;

    const headers = ['Student Name', ...classDays.map(d => `"${(d?.name || 'Class Day').replace(/"/g, '""')}"`), 'Total Attended', 'Attendance Rate %'];
    const csvRows: string[] = [headers.join(',')];

    uniqueStudents.forEach(student => {
      const row = [
        `"${student.name.replace(/"/g, '""')}"`,
        ...classDays.map(d => student.attendanceByDay[d.id]?.present ? 'Present' : 'Absent'),
        student.attended,
        `${student.rate.toFixed(1)}%`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HTEIM_Attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreStudent = (studentName: string) => {
    const lower = (studentName || '').toLowerCase().trim();
    setDeletedStudentNames(prev => prev.filter(n => (n || '').toLowerCase().trim() !== lower));
  };

  const handleRestoreAllStudents = () => {
    setDeletedStudentNames([]);
  };

  const handleUpdateStudentPhoto = (studentName: string, photoUrl: string) => {
    setStudentPhotos(prev => ({
      ...prev,
      [(studentName || '').toLowerCase().trim()]: photoUrl
    }));
  };

  const handleUpdateStudentEnrollmentStatus = (
    studentName: string, 
    status: 'active' | 'dropped_out' | 'withdrawn' | 'graduated' | 'leave_of_absence',
    dropoutDetails?: { reason?: string; date?: string }
  ) => {
    if (!studentName) return;
    const norm = normalizeStudentName(studentName);
    const key = (studentName || '').toLowerCase().trim();

    setStudentEnrollmentStatuses(prev => {
      const next = {
        ...prev,
        [studentName]: status,
        [key]: status,
        [norm]: status,
      };
      localStorage.setItem('hteim_student_enrollment_statuses', JSON.stringify(next));
      return next;
    });

    if (dropoutDetails) {
      setStudentDropoutNotes(prev => {
        const next = {
          ...prev,
          [studentName]: dropoutDetails,
          [key]: dropoutDetails,
          [norm]: dropoutDetails,
        };
        localStorage.setItem('hteim_student_dropout_notes', JSON.stringify(next));
        return next;
      });
    }

    const activeEmail = user?.email || 'admin@hteim.edu';
    saveToSupabase(activeEmail, {
      studentEnrollmentStatuses: {
        ...studentEnrollmentStatuses,
        [studentName]: status,
        [key]: status,
        [norm]: status,
      }
    } as any).catch(err => console.warn('Supabase state update for enrollment status:', err));
  };

  return {
    user,
    setUser,
    token,
    setToken,
    isLoggingIn,
    appUser,
    setAppUser,
    userCredentials,
    setUserCredentials,
    showIntro,
    setShowIntro,
    showLoginModal,
    setShowLoginModal,
    showResetPasswordModal,
    setShowResetPasswordModal,
    resetTargetEmail,
    setResetTargetEmail,
    isResetFromEmailLink,
    showRoleMenu,
    setShowRoleMenu,
    showToolsMenu,
    setShowToolsMenu,
    showAdminAuditModal,
    setShowAdminAuditModal,
    showUserManagementModal,
    setShowUserManagementModal,
    showCommandPalette,
    setShowCommandPalette,
    showMobileMoreMenu,
    setShowMobileMoreMenu,
    isNavOpen,
    setIsNavOpen,
    handleAppLoginSuccess,
    handleAppLogout,
    showOutstandingPaymentBanner,
    setShowOutstandingPaymentBanner,
    pendingSyncData,
    setPendingSyncData,
    studentPaymentSummary,
    sheetUrl,
    setSheetUrl,
    isLoading,
    setIsLoading,
    error,
    setError,
    toasts,
    showToast,
    courses,
    setCourses,
    schedules,
    setSchedules,
    libraryResources,
    setLibraryResources,
    classroomMedia,
    setClassroomMedia,
    payments,
    setPayments,
    facultyTeachers,
    setFacultyTeachers,
    zoomExceptionNote,
    setZoomExceptionNote,
    hasZoomException,
    setHasZoomException,
    classDays,
    setClassDays,
    records,
    setRecords,
    deletedClassDayIds,
    setDeletedClassDayIds,
    dataSource,
    setDataSource,
    sheetMergePolicy,
    setSheetMergePolicy,
    pendingConflicts,
    setPendingConflicts,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    selectedStudent,
    setSelectedStudent,
    deletedStudentNames,
    setDeletedStudentNames,
    studentNotes,
    setStudentNotes,
    excusedAbsences,
    setExcusedAbsences,
    studentPhotos,
    setStudentPhotos,
    studentLevels,
    setStudentLevels,
    selectedReportLevel,
    setSelectedReportLevel,
    selectedReportAttendanceFilter,
    setSelectedReportAttendanceFilter,
    showReportModal,
    setShowReportModal,
    showSettingsModal,
    setShowSettingsModal,
    showCohortModal,
    setShowCohortModal,
    showGuideModal,
    setShowGuideModal,
    showMobileDownloadModal,
    setShowMobileDownloadModal,
    showClassDaysModal,
    setShowClassDaysModal,
    cohorts,
    setCohorts,
    activeCohortId,
    setActiveCohortId,
    activeCohort,
    pwaHook,
    themeMode,
    setThemeMode,
    notifications,
    setNotifications,
    customAssignments,
    setCustomAssignments,
    submissions,
    setSubmissions,
    messages,
    setMessages,
    handleSendMessage,
    handleReplyMessage,
    handleUpdateMessageStatus,
    handleDeleteMessage,
    unreadMessagesCount,
    handleRunNotificationScan,
    handleMarkNotifAsRead,
    handleMarkAllNotifsAsRead,
    handleClearNotifs,
    handleAddTestNotif,
    handleSelectNotif,
    showBatchBroadcastModal,
    setShowBatchBroadcastModal,
    showPresentationModal,
    setShowPresentationModal,
    isOffline,
    syncedBannerMessage,
    setSyncedBannerMessage,
    showOfflineDrawer,
    setShowOfflineDrawer,
    showPINCheckinModal,
    setShowPINCheckinModal,
    activeErpTab,
    setActiveErpTab,
    handleNavigate,
    handleExportBackup,
    handleImportBackup,
    handleResetAllData,
    viewMode,
    setViewMode,
    densityMode,
    setDensityMode,
    showTrendChart,
    setShowTrendChart,
    showEmailDraftModal,
    setShowEmailDraftModal,
    showCertificateModal,
    setShowCertificateModal,
    certificateData,
    setCertificateData,
    selectedModule,
    setSelectedModule,
    selectedStudentNames,
    setSelectedStudentNames,
    showBatchEmailModal,
    setShowBatchEmailModal,
    showStudentTranscriptModal,
    setShowStudentTranscriptModal,
    isGeneratingPDF,
    handleExportPDF,
    showLiveCheckinModal,
    setShowLiveCheckinModal,
    liveCheckinDayId,
    setLiveCheckinDayId,
    rubricScores,
    setRubricScores,
    gradingWeights,
    setGradingWeights,
    showFloatingQuizBanner,
    setShowFloatingQuizBanner,
    activeQuizzesList,
    atRiskThreshold,
    setAtRiskThreshold,
    satisfactoryThreshold,
    setSatisfactoryThreshold,
    recentSheets,
    setRecentSheets,
    autoSyncInterval,
    setAutoSyncInterval,
    syncOnTabFocus,
    setSyncOnTabFocus,
    lastSyncedTime,
    setLastSyncedTime,
    isCloudSyncing,
    cloudSyncError,
    supabaseTableMissing,
    showDiagnosticModal,
    setShowDiagnosticModal,
    handlePushToCloud,
    effectiveClassDays,
    uniqueStudents,
    setIsResetFromEmailLink,
    handleSaveCohort: (cohort: Cohort) => {
      setCohorts(prev => {
        const idx = prev.findIndex(c => c.id === cohort.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = cohort;
          return copy;
        }
        return [...prev, cohort];
      });
    },
    handleDeleteCohort: (cohortId: string) => {
      setCohorts(prev => prev.filter(c => c.id !== cohortId));
    },
    handleArchiveToggleCohort: (cohortId: string) => {
      setCohorts(prev => prev.map(c => c.id === cohortId ? { ...c, isArchived: !c.isArchived } : c));
    },
    handleAssignStudentCohort: (studentName: string, cohortId: string) => {
      showToast('success', 'Cohort Assigned', `${studentName} assigned to cohort ${cohortId}`);
    },
    handleQuickRoleSwitch: (role: UserRole | string, customName?: string, studentIdChoice?: string) => {
      let newUser: AppUser;
      const cleanRole = (role || 'student') as UserRole;

      if (cleanRole === 'super_admin') {
        newUser = {
          id: 'u-super-admin',
          username: 'superadmin',
          name: customName || 'Apostle Kendell Pierre',
          role: 'super_admin',
          email: 'kpierre24@gmail.com'
        };
      } else if (cleanRole === 'admin') {
        newUser = {
          id: 'u-admin-kpierre',
          username: 'admin',
          name: customName || 'Kendell Pierre',
          role: 'admin',
          email: 'kpierre24@gmail.com'
        };
      } else if (cleanRole === 'registrar') {
        newUser = {
          id: 'u-registrar',
          username: 'registrar',
          name: customName || 'Dr. Evelyn Registrar',
          role: 'registrar',
          email: 'registrar@hteim.edu'
        };
      } else if (cleanRole === 'lecturer' || cleanRole === 'teacher') {
        newUser = {
          id: 'u-lecturer',
          username: 'lecturer',
          name: customName || 'Rev. Dr. Matthew Faculty',
          role: 'lecturer',
          email: 'lecturer@hteim.edu',
          assignedCourses: ['SOM-101', 'SOM-102']
        };
      } else if (cleanRole === 'finance_officer') {
        newUser = {
          id: 'u-finance',
          username: 'finance',
          name: customName || 'Minister David Bursar',
          role: 'finance_officer',
          email: 'finance@hteim.edu'
        };
      } else if (cleanRole === 'librarian') {
        newUser = {
          id: 'u-librarian',
          username: 'librarian',
          name: customName || 'Sister Grace Librarian',
          role: 'librarian',
          email: 'librarian@hteim.edu'
        };
      } else if (cleanRole === 'viewer') {
        newUser = {
          id: 'u-viewer',
          username: 'viewer',
          name: customName || 'Guest Observer',
          role: 'viewer',
          email: 'guest@hteim.edu'
        };
      } else {
        let chosenName = customName || 'Aaron Miller';
        if (!customName) {
          if (uniqueStudents && uniqueStudents.length > 0) {
            const firstStudent = uniqueStudents[0];
            if (typeof firstStudent === 'string') {
              chosenName = firstStudent;
            } else if (firstStudent && typeof (firstStudent as any).name === 'string') {
              chosenName = (firstStudent as any).name;
            }
          }
        }

        newUser = {
          id: `u-student-${(chosenName || '').toLowerCase().replace(/\s+/g, '-')}`,
          username: generateStudentUsername(chosenName),
          name: chosenName,
          role: 'student',
          studentName: chosenName,
          studentId: studentIdChoice || 'HTEIM-2026-0001',
          email: `${(generateStudentUsername(chosenName) || '').toLowerCase()}@student.hteim.edu`
        };
      }
      setAppUser(newUser);
      setShowRoleMenu(false);
      setSyncedBannerMessage(`Role Switch: Previewing portal as ${cleanRole.toUpperCase().replace('_', ' ')} (${newUser.name})`);
      setTimeout(() => {
        setSyncedBannerMessage('');
      }, 4500);
    },
    handleUpdateUserCredentials: async (updatedCreds: UserCredential[]) => {
      setUserCredentials(updatedCreds);
      
      try {
        const activeEmail = appUser?.email || user?.email;
        const stateToSave = {
          records,
          classDays,
          studentNotes,
          excusedAbsences,
          rubricScores,
          deletedStudentNames,
          studentPhotos,
          studentLevels,
          customAssignments,
          submissions,
          notifications,
          sheetUrl,
          courses,
          schedules,
          libraryResources,
          classroomMedia,
          facultyTeachers,
          payments,
          messages,
          zoomExceptionNote,
          hasZoomException,
          userCredentials: updatedCreds
        };
        await saveToSupabase(activeEmail, stateToSave);
      } catch (err) {
        console.error("Failed syncing manual credentials update to Supabase:", err);
      }
    },
    handleChangeUserPassword: async (emailOrUsername: string | AppUser, newPass: string) => {
      const targetEmail = typeof emailOrUsername === 'string' ? emailOrUsername : emailOrUsername.email;
      setUserCredentials(prev => prev.map(c => c.email.toLowerCase() === targetEmail.toLowerCase() ? { ...c, passwordHash: newPass } : c));
      showToast('success', 'Password Updated', `Password updated for ${targetEmail}`);
    },
    handleSendBatchBroadcast: (broadcast: any) => {
      showToast('success', 'Broadcast Sent', `Broadcast "${broadcast.title}" dispatched to ${broadcast.recipientCount} recipients.`);
      setShowBatchBroadcastModal(false);
    },
    handleToggleStudentAttendance: (name: string, classDayId: string, status: string) => {
      setRecords(prev => {
        const idx = prev.findIndex(r => r.name === name && r.classDay === classDayId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], status };
          return copy;
        }
        return [...prev, { name, classDay: classDayId, status, score: 'P' }];
      });
    },
    handleToggleExcusedAbsence: (name: string, classDayId: string) => {
      setExcusedAbsences(prev => {
        const studentMap = prev[name] || {};
        return {
          ...prev,
          [name]: {
            ...studentMap,
            [classDayId]: !studentMap[classDayId]
          }
        };
      });
    },
    handleSaveStudentNote: (name: string, noteText: string) => {
      setStudentNotes(prev => ({ ...prev, [name]: noteText }));
      showToast('success', 'Note Saved', `Academic note saved for ${name}`);
    },
    handleDeleteStudent: (name: string) => {
      setDeletedStudentNames(prev => [...prev, name]);
      showToast('info', 'Student Deleted', `${name} removed from active view.`);
    },
    handleClearStudentAttendanceRecords: (name: string) => {
      setRecords(prev => prev.filter(r => r.name !== name));
      showToast('info', 'Records Cleared', `Attendance records cleared for ${name}.`);
    },
    handleResolveConflicts,
    handleLoadSheets,
    handleRemoveRecentSheet,
    handleImportQuizScores: (targetClassDay: string, csvText: string) => {
      const result = parseAndApplyQuizCsv(csvText, targetClassDay, records);
      if (result.count > 0) {
        setRecords(result.updatedRecords);
        localStorage.setItem('attendanceRecords', JSON.stringify(result.updatedRecords));
        showToast('success', 'Quiz Scores Evaluated', `Successfully evaluated and synced ${result.count} student quiz scores for ${result.targetClassDay}!`);
      } else {
        showToast('info', 'Import Empty', 'No valid student quiz records found in the provided CSV.');
      }
      return result;
    },
    handleUpdateRubric: (studentName: string, key: 'participation' | 'scripture' | 'assignment', val: number) => {
      setRubricScores(prev => ({
        ...prev,
        [studentName]: {
          ...(prev[studentName] || { participation: 0, scripture: 0, assignment: 0 }),
          [key]: val,
        },
      }));
    },
    handleAddClassDay: (title?: string) => {
      const newId = `day_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setClassDays(prev => {
        const nextNum = prev.length + 1;
        const validTitle = (typeof title === 'string' && title.trim().length > 0)
          ? title.trim()
          : `Class Day ${nextNum}`;
        return [...prev, { id: newId, name: validTitle }];
      });
    },
    handleEditClassDayTitle: (id: string, newTitle: string) => {
      setClassDays(prev => prev.map(d => d.id === id ? { ...d, name: newTitle } : d));
    },
    handleDeleteClassDay: (id: string) => {
      setDeletedClassDayIds(prev => [...prev, id]);
    },
    handleClearClassDayRecords: (id: string) => {
      setRecords(prev => prev.filter(r => r.classDay !== id));
    },
    classDayStats,
    trendChartData,
    filteredAndSortedStudents,
    loggedInStudentData,
    currentStudentPortalData,
    avgAttendance,
    uncollectedTuitionAmount,
    pendingAssignmentsCount,
    toggleSelectStudent,
    handleSelectAllDisplayed,
    handleSelectAllAtRisk,
    clearBatchSelection,
    handleExportCSV,
    handleRestoreStudent,
    handleRestoreAllStudents,
    handleUpdateStudentPhoto,
    handleUpdateStudentEnrollmentStatus,
    studentEnrollmentStatuses,
    studentDropoutNotes,
    getStudentIdForName: (name: string) => {
      return `std-${normalizeStudentName(name).replace(/[^a-z0-9]+/g, '-')}`;
    },
    getStudentBadges: (student: any) => {
      const badges = [];
      if (student?.rate >= 85) badges.push({ id: 'honor-roll', label: 'Honor Roll', color: 'emerald', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' });
      if (student?.rate < 75) badges.push({ id: 'at-risk', label: 'At-Risk', color: 'rose', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300' });
      return badges;
    },
    activePublicQuiz,
    isLoadingPublicQuiz,
    isPublicQuizNotFound,
    publicQuizError,
    handleClosePublicQuiz,
    handlePublicQuizSubmit,
  };
}
