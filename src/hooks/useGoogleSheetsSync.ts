import React, { useState, useEffect, useRef } from 'react';
import { ClassDay, AttendanceRecord, MergeConflict, Cohort, RecentSheet, PaymentRecord } from '../types';
import { isExcludedStudent, getCanonicalNamesMap, normalizeStudentName, MANUAL_ALIASES } from '../lib/studentNames';
import { isObsoleteLegacyClassDay, isMatchingLesson } from '../data';
import { MASTER_ENROLLED_STUDENTS } from '../data/curriculum';
import {
  fetchSpreadsheetMetadata,
  fetchMultipleRanges,
  extractSpreadsheetId,
  fetchPublicSpreadsheetData,
} from '../lib/sheets';
import {
  isTuitionSheetTab,
  parseTuitionSheetRows,
  fetchTuitionSpreadsheet,
  mergeTuitionRecords,
  persistTuitionRecords,
  ParsedTuitionResult,
} from '../lib/tuitionSheets';
import { displayErrorToUser } from '../lib/errorHandler';
import { logActivity } from '../lib/auditLogger';

interface UseGoogleSheetsSyncProps {
  activeCohort: Cohort | null;
  cohorts: Cohort[];
  token: string | null;
  records: AttendanceRecord[];
  setRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  classDays: ClassDay[];
  setClassDays: React.Dispatch<React.SetStateAction<ClassDay[]>>;
  deletedClassDayIds: string[];
  payments?: PaymentRecord[];
  setPayments?: React.Dispatch<React.SetStateAction<PaymentRecord[]>>;
  setError: (err: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  isLoading: boolean;
  appUser: any;
}

export const useGoogleSheetsSync = ({
  activeCohort,
  cohorts,
  token,
  records,
  setRecords,
  classDays,
  setClassDays,
  deletedClassDayIds,
  payments = [],
  setPayments,
  setError,
  setIsLoading,
  isLoading,
  appUser,
}: UseGoogleSheetsSyncProps) => {
  // Sheet URL State
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    const saved = localStorage.getItem('sheetUrl');
    if (!saved || saved.includes('gid=283667804')) {
      return 'https://docs.google.com/spreadsheets/d/1k9Vn2-ZkHtePYeQO0mQstzesCW4-UJLAELoFCVuVfEI/edit?gid=614888378#gid=614888378';
    }
    return saved;
  });

  // Dedicated Tuition Sheet URL
  const [tuitionSheetUrl, setTuitionSheetUrl] = useState<string>(() => {
    return localStorage.getItem('hteim_tuition_sheet_url') || '';
  });

  const [lastTuitionSyncedTime, setLastTuitionSyncedTime] = useState<string | null>(() => {
    return localStorage.getItem('hteim_last_tuition_synced_time');
  });

  const [isTuitionLoading, setIsTuitionLoading] = useState<boolean>(false);
  const [tuitionSyncStats, setTuitionSyncStats] = useState<{
    totalStudents: number;
    totalBilled: number;
    totalPaid: number;
    totalBalance: number;
  } | null>(null);

  // Recent Sheets Shortcuts
  const [recentSheets, setRecentSheets] = useState<RecentSheet[]>(() => {
    const saved = localStorage.getItem('recentSheets');
    return saved ? JSON.parse(saved) : [];
  });

  // Auto-Sync Settings
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(() => {
    const saved = localStorage.getItem('autoSyncInterval');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [syncOnTabFocus, setSyncOnTabFocus] = useState<boolean>(() => {
    const saved = localStorage.getItem('syncOnTabFocus');
    return saved ? JSON.parse(saved) : true;
  });

  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Data Source Tracking
  const [dataSource, setDataSource] = useState<'demo' | 'sheets' | 'production' | null>(() => {
    const saved = localStorage.getItem('dataSource');
    if (saved === 'sheets') return 'sheets';
    return (saved as any) || 'production';
  });

  const [sheetMergePolicy, setSheetMergePolicy] = useState<'sheets' | 'manual' | 'prompt'>(() => {
    const saved = localStorage.getItem('sheetMergePolicy');
    return (saved as 'sheets' | 'manual' | 'prompt') || 'manual';
  });

  // Manual Tuition Mode (User Rule: "Do not pull tuition from google sheets I will manually update it")
  const [manualTuitionOnly, setManualTuitionOnly] = useState<boolean>(() => {
    const saved = localStorage.getItem('hteim_manual_tuition_only');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('hteim_manual_tuition_only', JSON.stringify(manualTuitionOnly));
  }, [manualTuitionOnly]);

  // Manual Attendance Mode (User Rule: "let attendance capture be a manual process from now on... attendance is no longer synced from the google sheet")
  const [manualAttendanceOnly, setManualAttendanceOnly] = useState<boolean>(() => {
    const saved = localStorage.getItem('hteim_manual_attendance_only');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('hteim_manual_attendance_only', JSON.stringify(manualAttendanceOnly));
  }, [manualAttendanceOnly]);

  const [pendingConflicts, setPendingConflicts] = useState<MergeConflict[]>([]);
  const [pendingSyncData, setPendingSyncData] = useState<{
    preservedRecords: AttendanceRecord[];
    newSyncedRecords: AttendanceRecord[];
    updatedClassDays: ClassDay[];
  } | null>(null);

  const lastFetchTimeRef = useRef<number>(0);

  // Local Storage Sync Effects
  useEffect(() => {
    localStorage.setItem('sheetUrl', sheetUrl);
  }, [sheetUrl]);

  useEffect(() => {
    if (tuitionSheetUrl) {
      localStorage.setItem('hteim_tuition_sheet_url', tuitionSheetUrl);
    }
  }, [tuitionSheetUrl]);

  useEffect(() => {
    localStorage.setItem('recentSheets', JSON.stringify(recentSheets));
  }, [recentSheets]);

  useEffect(() => {
    localStorage.setItem('autoSyncInterval', autoSyncInterval.toString());
  }, [autoSyncInterval]);

  useEffect(() => {
    localStorage.setItem('syncOnTabFocus', JSON.stringify(syncOnTabFocus));
  }, [syncOnTabFocus]);

  useEffect(() => {
    if (dataSource) {
      localStorage.setItem('dataSource', dataSource);
    }
  }, [dataSource]);

  useEffect(() => {
    localStorage.setItem('sheetMergePolicy', sheetMergePolicy);
  }, [sheetMergePolicy]);

  const addRecentSheet = (url: string, title: string) => {
    setRecentSheets(prev => {
      const sheetId = extractSpreadsheetId(url) || url;
      const filtered = prev.filter(s => extractSpreadsheetId(s.url) !== sheetId);
      const newEntry: RecentSheet = {
        id: sheetId,
        url,
        title: title || 'Google Sheet',
        lastLoaded: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      return [newEntry, ...filtered].slice(0, 8);
    });
  };

  const handleRemoveRecentSheet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSheets(prev => prev.filter(s => s.id !== id));
  };

  // Google Sheets Load Function
  const handleLoadSheets = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();

    if (manualAttendanceOnly) {
      // User rule: Attendance capture is a strictly manual process.
      // Attendance is no longer synced from Google Sheets, keeping all current records intact.
      return;
    }

    const targetUrl = customUrl || activeCohort?.sheetUrl || sheetUrl;
    if (customUrl) {
      setSheetUrl(customUrl);
    }

    const spreadsheetId = extractSpreadsheetId(targetUrl);
    if (!spreadsheetId) {
      setError('Invalid Google Sheets URL. Please paste a valid URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    lastFetchTimeRef.current = Date.now();
    try {
      let batchData: any = null;
      let docTitle = 'Google Sheet Attendance';

      if (token) {
        // 1. Authenticated Google API fetch attempt
        try {
          const metadata = await fetchSpreadsheetMetadata(spreadsheetId, token);
          docTitle = metadata.properties?.title || 'Google Sheet Attendance';
          addRecentSheet(targetUrl, docTitle);

          const allSheets = metadata.sheets.map((s: any) => s.properties.title);
          const sheets = allSheets;

          if (sheets.length > 0) {
            batchData = await fetchMultipleRanges(spreadsheetId, sheets, token);
          }
        } catch (authErr) {
          console.warn('Authenticated sheet fetch failed, falling back to public fetch...', authErr);
        }
      }

      // 2. Fallback or direct load for completely public Google Sheets
      if (!batchData) {
        const publicData = await fetchPublicSpreadsheetData(spreadsheetId);
        docTitle = publicData.properties?.title || 'Public Google Sheet';
        addRecentSheet(targetUrl, docTitle);
        batchData = publicData;
      }

      const syncedSheetTitles = new Set<string>();
      const incomingTuitionRecords: PaymentRecord[] = [];

      if (batchData.valueRanges) {
        batchData.valueRanges.forEach((rangeData: any, index: number) => {
          const rangeName = rangeData.range || '';
          const sheetTitle = rangeName
            ? rangeName.split('!')[0].replace(/^'|'$/g, '')
            : `Sheet${index + 1}`;
          
          if (!rangeData.values || rangeData.values.length === 0) return;
          const headers = rangeData.values[0] as string[];
          const rows = rangeData.values.slice(1) as string[][];

          // Check if this sheet is a tuition & fees tab
          if (isTuitionSheetTab(sheetTitle, headers)) {
            if (manualTuitionOnly) {
              // User instruction: "Do not pull tuition from google sheets I will manually update it"
              return; // Skip adding tuition tab as attendance, and skip pulling tuition data into payments
            }
            const parsedTuition = parseTuitionSheetRows(sheetTitle, headers, rows, payments);
            if (parsedTuition.length > 0) {
              incomingTuitionRecords.push(...parsedTuition);
            }
            return; // Skip adding tuition tab as an attendance class day
          }

          syncedSheetTitles.add(sheetTitle);
        });
      }

      // If tuition records were found in the connected sheet, update payments
      if (incomingTuitionRecords.length > 0 && setPayments) {
        const mergedTuition = mergeTuitionRecords(payments, incomingTuitionRecords, sheetMergePolicy === 'sheets' ? 'sheets' : 'manual');
        setPayments(mergedTuition);
        persistTuitionRecords(mergedTuition);
        const formattedTuitionTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        setLastTuitionSyncedTime(formattedTuitionTime);
        localStorage.setItem('hteim_last_tuition_synced_time', formattedTuitionTime);
        setTuitionSyncStats({
          totalStudents: mergedTuition.length,
          totalBilled: mergedTuition.reduce((s, p) => s + (p.totalTuition || 0), 0),
          totalPaid: mergedTuition.reduce((s, p) => s + (p.amountPaid || 0), 0),
          totalBalance: mergedTuition.reduce((s, p) => s + Math.max(0, (p.totalTuition || 0) - (p.amountPaid || 0)), 0),
        });
      }

      // Filter out existing records that correspond to these synced sheets and remove any obsolete legacy days
      const preservedRecords = records.filter(
        r => r && r.classDay && !syncedSheetTitles.has(r.classDay) && !isObsoleteLegacyClassDay(r.classDay)
      );

      const parsedSheetDataByClassDay = new Map<
        string,
        {
          displayDate: string;
          studentsCompleted: Map<string, { score: string; timestamp: string }>;
        }
      >();
      const allRawNames = new Set<string>();

      // Initialize all raw names with names from preserved records
      preservedRecords.forEach(r => {
        const name = (r.name || r.studentName || '').toString().trim();
        if (name && name !== 'Unknown' && !isExcludedStudent(name)) {
          allRawNames.add(name);
        }
      });

      // Add all officially enrolled students so their attendance records exist for all class days
      MASTER_ENROLLED_STUDENTS.forEach(n => {
        if (n && !isExcludedStudent(n)) {
          allRawNames.add(n.trim());
        }
      });

      if (batchData.valueRanges) {
        batchData.valueRanges.forEach((rangeData: any, index: number) => {
          const rangeName = rangeData.range || '';
          const sheetTitle = rangeName
            ? rangeName.split('!')[0].replace(/^'|'$/g, '')
            : `Sheet${index + 1}`;

          // Auto-categorization check for cohort matching sheet tab pattern or title
          const matchedCohortForTab = cohorts.find(c => {
            if (c.sheetTabPattern && c.sheetTabPattern.trim() !== '') {
              const pattern = c.sheetTabPattern.toLowerCase().trim();
              const titleLower = sheetTitle.toLowerCase().trim();
              return titleLower.includes(pattern) || pattern.includes(titleLower);
            }
            const yearStr = c.academicYear ? c.academicYear.toString() : '';
            return (
              (yearStr && sheetTitle.toLowerCase().includes(yearStr)) ||
              sheetTitle.toLowerCase().includes(c.name.toLowerCase())
            );
          });

          if (!rangeData.values || rangeData.values.length === 0) {
            parsedSheetDataByClassDay.set(sheetTitle, {
              displayDate: sheetTitle,
              studentsCompleted: new Map(),
            });
            return;
          }

          const headers = rangeData.values[0] as string[];
          const rows = rangeData.values.slice(1) as string[][];

          const normalizedHeaders = headers.map(h => (h || '').toString().toLowerCase().trim());

          let nameIndex = normalizedHeaders.findIndex(h => 
            h.includes('first and last name') || 
            h.includes('full name') || 
            h === 'name' || 
            h === 'student name' || 
            h.endsWith(' name')
          );
          if (nameIndex === -1) {
            nameIndex = normalizedHeaders.findIndex(h => h.includes('name') && !h.includes('user') && !h.includes('file'));
          }
          if (nameIndex === -1) nameIndex = 2; // fallback

          let timestampIndex = normalizedHeaders.findIndex(h => h.includes('timestamp') || h.includes('date') || h.includes('time'));
          if (timestampIndex === -1) timestampIndex = 0;

          let scoreIndex = normalizedHeaders.findIndex(h => 
            h === 'score' || 
            h === 'total score' ||
            h.includes('score') || 
            h.includes('grade') || 
            h.includes('points') || 
            h.includes('result') ||
            h.includes('mark') ||
            h.includes('quiz')
          );
          if (scoreIndex === -1 && normalizedHeaders.length > 1) {
            if (nameIndex !== 1 && timestampIndex !== 1) {
              scoreIndex = 1;
            }
          }

          let displayDate = sheetTitle;
          if (rows.length > 0) {
            const firstTimestamp = rows[0][timestampIndex];
            if (firstTimestamp) {
              const datePart = firstTimestamp.split(' ')[0];
              if (datePart && datePart.trim() !== '') {
                const trimmedDate = datePart.trim();
                if ((sheetTitle || '').toLowerCase().includes((trimmedDate || '').toLowerCase())) {
                  displayDate = sheetTitle;
                } else {
                  displayDate = `${sheetTitle} (${trimmedDate})`;
                }
              }
            }
          }

          const studentsCompleted = new Map<string, { score: string; timestamp: string }>();

          rows.forEach(row => {
            const rawName = row[nameIndex] || 'Unknown';
            const name = rawName.trim().replace(/[\r\n]+/g, ' ');
            if (!name || name === '' || name === 'Unknown') return;
            if (/^[\d\s\/]+$/.test(name)) return;
            if (isExcludedStudent(name)) return;

            allRawNames.add(name);

            // If a tab matched a cohort, auto-tag the student's cohort
            if (matchedCohortForTab) {
              const studentKey = name.toLowerCase().trim();
              if (!localStorage.getItem(`hteim_student_cohort_${studentKey}`)) {
                localStorage.setItem(`hteim_student_cohort_${studentKey}`, matchedCohortForTab.id);
              }
            }

            const rowScore = scoreIndex >= 0 ? (row[scoreIndex] || '') : '';
            const rowTimestamp = timestampIndex >= 0 ? (row[timestampIndex] || '') : '';

            studentsCompleted.set((name || '').toLowerCase().trim(), {
              score: rowScore,
              timestamp: rowTimestamp,
            });
          });

          parsedSheetDataByClassDay.set(sheetTitle, {
            displayDate,
            studentsCompleted,
          });
        });
      }

      const canonicalNamesMap = getCanonicalNamesMap(Array.from(allRawNames));
      const studentMap = new Map<string, string>();
      MASTER_ENROLLED_STUDENTS.forEach(n => {
        if (n && !isExcludedStudent(n)) {
          studentMap.set(normalizeStudentName(n), n);
        }
      });
      Array.from(allRawNames).forEach(n => {
        if (!n || isExcludedStudent(n)) return;
        const norm = normalizeStudentName(n);
        const canon = MANUAL_ALIASES[norm] || canonicalNamesMap.get(norm) || canonicalNamesMap.get(n.trim()) || n;
        if (!studentMap.has(norm) && !isExcludedStudent(canon)) {
          studentMap.set(norm, canon);
        }
      });
      const allCanonicalStudentNames = Array.from(studentMap.values());

      const newSyncedRecords: AttendanceRecord[] = [];
      const updatedClassDays = [
        ...classDays.filter(d => !syncedSheetTitles.has(d.id) && !isObsoleteLegacyClassDay(d.id)),
      ];
      const conflictsList: MergeConflict[] = [];

      parsedSheetDataByClassDay.forEach((data, sheetTitle) => {
        // Skip explicitly deleted class sessions
        if (
          deletedClassDayIds.some(
            del => del && del.toLowerCase().trim() === (sheetTitle || '').toLowerCase().trim()
          )
        ) {
          return;
        }

        const matchedExistingDay = updatedClassDays.find(d => 
          d.id === sheetTitle || 
          d.name === sheetTitle || 
          isMatchingLesson(d.id, sheetTitle) || 
          (d.name && isMatchingLesson(d.name, sheetTitle))
        );
        if (!matchedExistingDay) {
          const existingDay = classDays.find(d => 
            d.id === sheetTitle || 
            isMatchingLesson(d.id, sheetTitle) || 
            (d.name && isMatchingLesson(d.name, sheetTitle))
          );
          updatedClassDays.push({ id: sheetTitle, name: existingDay ? existingDay.name : data.displayDate });
        }

        const targetClassDayId = matchedExistingDay ? matchedExistingDay.id : sheetTitle;
        const { studentsCompleted } = data;

        allCanonicalStudentNames.forEach(studentName => {
          let completionRow: { score: string; timestamp: string } | null = null;
          const normStudentName = normalizeStudentName(studentName);

          for (const [rawLower, rowData] of Array.from(studentsCompleted.entries())) {
            const matchedRawName = Array.from(allRawNames).find(n => (n || '').toLowerCase().trim() === rawLower) || rawLower;
            const mappedCanonical = MANUAL_ALIASES[rawLower] || MANUAL_ALIASES[normalizeStudentName(matchedRawName)] || canonicalNamesMap.get(matchedRawName) || matchedRawName;
            
            const normMapped = normalizeStudentName(mappedCanonical);
            const normMatched = normalizeStudentName(matchedRawName);

            if (
              normMapped === normStudentName ||
              normMatched === normStudentName ||
              rawLower === normStudentName ||
              (normStudentName.length > 4 && (normMapped.includes(normStudentName) || normStudentName.includes(normMapped))) ||
              (normStudentName.length > 4 && (normMatched.includes(normStudentName) || normStudentName.includes(normMatched)))
            ) {
              completionRow = rowData;
              break;
            }
          }

          const existingRecord = records.find(
            r =>
              r &&
              normalizeStudentName(r.name || r.studentName || '') === normStudentName &&
              (r.classDay === targetClassDayId || 
               r.classDay === sheetTitle || 
               r.classDay === data.displayDate || 
               isMatchingLesson(r.classDay, targetClassDayId) ||
               isMatchingLesson(r.classDay, sheetTitle))
          );
          const hasManualOverride = existingRecord && existingRecord.manualOverride === true;
          const sheetsPresent = !!completionRow;
          const localPresent = existingRecord ? existingRecord.present : false;
          const sheetsScore = completionRow ? completionRow.score : '';
          const sheetsTimestamp = completionRow ? completionRow.timestamp : '';

          if (hasManualOverride && sheetsPresent !== localPresent) {
            conflictsList.push({
              studentName,
              classDay: sheetTitle,
              localStatus: localPresent ? 'present' : 'absent',
              sheetsStatus: sheetsPresent ? 'present' : 'absent',
              sheetsScore,
              sheetsTimestamp,
            });
          }

          if (sheetMergePolicy === 'manual' && hasManualOverride) {
            // Prefer local manual override
            newSyncedRecords.push({
              ...existingRecord,
              studentName,
              present: existingRecord.present ?? (existingRecord.status === 'present'),
              status: existingRecord.status || (existingRecord.present ? 'present' : 'absent'),
              score: completionRow ? completionRow.score : existingRecord.score || '',
              timestamp: completionRow ? completionRow.timestamp : existingRecord.timestamp || '',
            });
          } else {
            // Default: Sheets rules
            newSyncedRecords.push({
              name: studentName,
              studentName,
              timestamp: completionRow ? completionRow.timestamp : '',
              score: completionRow ? completionRow.score : '',
              classDay: sheetTitle,
              present: sheetsPresent,
              status: sheetsPresent ? 'present' : 'absent',
              manualOverride: existingRecord ? existingRecord.manualOverride : false,
            });
          }
        });
      });

      if (sheetMergePolicy === 'prompt' && conflictsList.length > 0) {
        setPendingConflicts(conflictsList);
        setPendingSyncData({
          preservedRecords,
          newSyncedRecords,
          updatedClassDays,
        });
      } else {
        // Apply the synced records and class days to local state
        const finalRecords = [...preservedRecords, ...newSyncedRecords];
        setClassDays(updatedClassDays);
        setRecords(finalRecords);
        setDataSource('sheets');
        const formattedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        setLastSyncedTime(formattedTime);
        localStorage.setItem('dataSource', 'sheets');
        localStorage.setItem('attendanceRecords', JSON.stringify(finalRecords));
        localStorage.setItem('classDays', JSON.stringify(updatedClassDays));
        localStorage.setItem('lastSyncedTime', formattedTime);
      }
    } catch (err: any) {
      const appErr = displayErrorToUser(err, 'handleSyncWithGoogleSheets - sync sequence failure', 'network');
      setError(appErr.userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveConflicts = (resolutions: Record<string, 'local' | 'sheets'>) => {
    if (!pendingSyncData) return;

    const { preservedRecords, newSyncedRecords, updatedClassDays } = pendingSyncData;

    const resolvedSyncedRecords = newSyncedRecords.map(r => {
      const key = `${r.name}||${r.classDay}`;
      if (resolutions[key] === 'local') {
        const localRecord = records.find(
          oldRec =>
            oldRec &&
            (oldRec.name || oldRec.studentName || '').toLowerCase().trim() === (r.name || r.studentName || '').toLowerCase().trim() &&
            oldRec.classDay === r.classDay
        );
        if (localRecord) {
          return {
            ...r,
            present: localRecord.present,
            score: localRecord.score || '',
            timestamp: localRecord.timestamp || '',
            manualOverride: true,
          };
        }
      }
      return r;
    });

    const finalRecords = [...preservedRecords, ...resolvedSyncedRecords];
    setClassDays(updatedClassDays);
    setRecords(finalRecords);
    setDataSource('sheets');
    setLastSyncedTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

    setPendingConflicts([]);
    setPendingSyncData(null);
  };

  // Auto-Sync Interval Timer
  useEffect(() => {
    if (autoSyncInterval <= 0 || dataSource !== 'sheets' || isLoading) return;

    const intervalId = setInterval(() => {
      handleLoadSheets();
    }, autoSyncInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoSyncInterval, dataSource, isLoading, sheetUrl]);

  // Tab Focus Auto-Sync
  useEffect(() => {
    if (!syncOnTabFocus || dataSource !== 'sheets') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoading) {
        const now = Date.now();
        // Cooldown of 45 seconds for tab focus auto-sync to prevent spamming Google Sheets API
        if (now - lastFetchTimeRef.current > 45000) {
          handleLoadSheets();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [syncOnTabFocus, dataSource, isLoading, sheetUrl]);

  // Initial load: automatically sync on mount if sheetUrl is configured
  const initialSyncTriggeredRef = useRef(false);
  useEffect(() => {
    if (!initialSyncTriggeredRef.current && sheetUrl) {
      initialSyncTriggeredRef.current = true;
      handleLoadSheets();
    }
  }, [sheetUrl]);

  const handleSyncTuitionSheet = async (customUrl?: string): Promise<ParsedTuitionResult | null> => {
    if (manualTuitionOnly) {
      setError('Tuition updates are in Manual Mode. Google Sheets tuition pull is disabled.');
      return null;
    }
    const targetUrl = customUrl || tuitionSheetUrl || sheetUrl;
    setIsTuitionLoading(true);
    try {
      const result = await fetchTuitionSpreadsheet(targetUrl, token, payments);
      if (setPayments) {
        const merged = mergeTuitionRecords(payments, result.records, sheetMergePolicy === 'sheets' ? 'sheets' : 'manual');
        setPayments(merged);
        persistTuitionRecords(merged);
      }
      const formattedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setLastTuitionSyncedTime(formattedTime);
      localStorage.setItem('hteim_last_tuition_synced_time', formattedTime);
      setTuitionSyncStats({
        totalStudents: result.totalStudents,
        totalBilled: result.totalTuitionBilled,
        totalPaid: result.totalAmountCollected,
        totalBalance: result.totalOutstandingBalance,
      });
      return result;
    } catch (err: any) {
      const appErr = displayErrorToUser(err, 'handleSyncTuitionSheet - sync failure', 'network');
      setError(appErr.userMessage);
      return null;
    } finally {
      setIsTuitionLoading(false);
    }
  };

  return {
    sheetUrl,
    setSheetUrl,
    tuitionSheetUrl,
    setTuitionSheetUrl,
    lastTuitionSyncedTime,
    setLastTuitionSyncedTime,
    isTuitionLoading,
    tuitionSyncStats,
    handleSyncTuitionSheet,
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
    manualTuitionOnly,
    setManualTuitionOnly,
    manualAttendanceOnly,
    setManualAttendanceOnly,
    pendingConflicts,
    setPendingConflicts,
    pendingSyncData,
    setPendingSyncData,
    handleLoadSheets,
    handleResolveConflicts,
    handleRemoveRecentSheet,
  };
};
