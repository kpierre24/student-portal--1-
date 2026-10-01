import Papa from 'papaparse';
import { AttendanceRecord } from '../types';
import { CURRICULUM_CLASS_DAYS, MASTER_ENROLLED_STUDENTS, isMatchingLesson } from '../data/curriculum';
import { MANUAL_ALIASES, normalizeStudentName, isExcludedStudent, getCanonicalNamesMap } from './studentNames';

export interface QuizImportResult {
  count: number;
  updatedRecords: AttendanceRecord[];
  targetClassDay: string;
  matchedStudents: string[];
  unmappedNames: string[];
}

/**
 * Robustly parses a CSV from Google Forms or Google Sheets containing Quiz responses
 * and updates attendance and quiz scores for students for the specified class day.
 */
export function parseAndApplyQuizCsv(
  csvText: string,
  targetClassDayId: string,
  currentRecords: AttendanceRecord[]
): QuizImportResult {
  if (!csvText || !csvText.trim()) {
    return {
      count: 0,
      updatedRecords: currentRecords,
      targetClassDay: targetClassDayId,
      matchedStudents: [],
      unmappedNames: [],
    };
  }

  const parsed = Papa.parse<string[]>(csvText.trim(), {
    skipEmptyLines: 'greedy',
  });

  if (!parsed.data || parsed.data.length < 2) {
    return {
      count: 0,
      updatedRecords: currentRecords,
      targetClassDay: targetClassDayId,
      matchedStudents: [],
      unmappedNames: [],
    };
  }

  const headers = parsed.data[0].map(h => (h || '').toString().toLowerCase().trim());
  const rows = parsed.data.slice(1);

  // Auto-detect column indexes
  let nameIndex = headers.findIndex(h =>
    h.includes('first and last name') ||
    h.includes('full name') ||
    h === 'name' ||
    h === 'student name' ||
    h.includes('student') ||
    h.endsWith(' name')
  );
  if (nameIndex === -1) {
    nameIndex = headers.findIndex(h => h.includes('name') && !h.includes('user') && !h.includes('file'));
  }
  if (nameIndex === -1) nameIndex = 2; // Default for Google Forms

  let scoreIndex = headers.findIndex(h =>
    h === 'score' ||
    h.includes('score') ||
    h.includes('grade') ||
    h.includes('points') ||
    h.includes('result')
  );
  if (scoreIndex === -1) scoreIndex = 1; // Default for Google Forms

  let timestampIndex = headers.findIndex(h =>
    h.includes('timestamp') ||
    h.includes('date') ||
    h.includes('time')
  );
  if (timestampIndex === -1) timestampIndex = 0; // Default for Google Forms

  // Resolve target class day if generic or empty
  let effectiveClassDay = targetClassDayId;
  if (!effectiveClassDay || effectiveClassDay === 'all') {
    // Attempt detection from rows / timestamps
    const sampleText = rows.slice(0, 10).map(r => r.join(' ')).join(' ');
    if (sampleText.includes('15/09/2026') || sampleText.includes('2026-09-15')) {
      const day16 = CURRICULUM_CLASS_DAYS.find(d => d.id.includes('16') || d.name.includes('16'));
      effectiveClassDay = day16 ? day16.id : CURRICULUM_CLASS_DAYS[CURRICULUM_CLASS_DAYS.length - 1].id;
    } else {
      effectiveClassDay = CURRICULUM_CLASS_DAYS[0].id;
    }
  }

  // Build canonical reference map
  const enrolledStudentMap = new Map<string, string>();
  MASTER_ENROLLED_STUDENTS.forEach(name => {
    if (name && !isExcludedStudent(name)) {
      enrolledStudentMap.set(normalizeStudentName(name), name);
    }
  });

  const rawNames = rows.map(r => (r[nameIndex] || '').trim()).filter(Boolean);
  const canonicalMap = getCanonicalNamesMap(rawNames);

  // Extract completed students
  const completedEntries = new Map<string, { rawName: string; score: string; timestamp: string }>();

  rows.forEach(row => {
    const rawName = (row[nameIndex] || '').trim().replace(/[\r\n]+/g, ' ');
    if (!rawName || rawName === 'Unknown' || /^[\d\s\/]+$/.test(rawName)) return;
    if (isExcludedStudent(rawName)) return;

    const normalized = normalizeStudentName(rawName);
    const score = (row[scoreIndex] || '').trim();
    const timestamp = (row[timestampIndex] || '').trim();

    // Map to canonical name
    let canonical = MANUAL_ALIASES[normalized] || canonicalMap.get(normalized) || canonicalMap.get(rawName) || enrolledStudentMap.get(normalized) || rawName;

    // Direct case-insensitive match against MASTER_ENROLLED_STUDENTS
    const enrolledMatch = MASTER_ENROLLED_STUDENTS.find(
      s => normalizeStudentName(s) === normalizeStudentName(canonical) || normalizeStudentName(s) === normalized
    );
    if (enrolledMatch) {
      canonical = enrolledMatch;
    }

    if (!isExcludedStudent(canonical)) {
      completedEntries.set(normalizeStudentName(canonical), {
        rawName,
        score,
        timestamp,
      });
    }
  });

  // Apply to attendance records
  const updatedRecords = [...currentRecords];
  const matchedStudents: string[] = [];
  const unmappedNames: string[] = [];

  // Update existing or insert new records
  completedEntries.forEach((entry, normKey) => {
    const canonicalName = enrolledStudentMap.get(normKey) || MANUAL_ALIASES[normKey] || entry.rawName;
    matchedStudents.push(canonicalName);

    const existingIdx = updatedRecords.findIndex(r => {
      const rNormName = normalizeStudentName(r.name || r.studentName || '');
      const nameMatch = rNormName === normKey || rNormName === normalizeStudentName(canonicalName);
      if (!nameMatch) return false;

      return isMatchingLesson(r.classDay, effectiveClassDay);
    });

    if (existingIdx >= 0) {
      updatedRecords[existingIdx] = {
        ...updatedRecords[existingIdx],
        name: canonicalName,
        studentName: canonicalName,
        present: true,
        status: 'present',
        score: entry.score || updatedRecords[existingIdx].score,
        timestamp: entry.timestamp || updatedRecords[existingIdx].timestamp,
      };
    } else {
      updatedRecords.push({
        name: canonicalName,
        studentName: canonicalName,
        classDay: effectiveClassDay,
        present: true,
        status: 'present',
        score: entry.score,
        timestamp: entry.timestamp,
        manualOverride: false,
      });
    }
  });

  return {
    count: completedEntries.size,
    updatedRecords,
    targetClassDay: effectiveClassDay,
    matchedStudents,
    unmappedNames,
  };
}
