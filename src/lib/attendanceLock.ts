import { AttendanceRecord, ClassDay } from '../types';

export const ATTENDANCE_LOCK_WINDOW_HOURS = 24;
export const ATTENDANCE_LOCK_WINDOW_MS = ATTENDANCE_LOCK_WINDOW_HOURS * 60 * 60 * 1000;

export interface AttendanceLockInfo {
  isLocked: boolean;
  isCaptured: boolean;
  capturedDate: Date | null;
  hoursRemaining: number;
  minutesRemaining: number;
  message: string;
}

/**
 * Extracts a valid Date from record fields or class day identifiers.
 * Filters out parsed dates with year < 2024 to prevent loose browser date parsing bugs
 * (e.g. parsing "School of the Pastors Pt 3 (Timestamp)" as March 1, 2001).
 */
export function getCapturedDate(
  record?: Partial<AttendanceRecord> | null,
  classDay?: ClassDay | string | null
): Date | null {
  if (!record) return null;

  // 1. Explicit capturedAt ISO string or epoch
  if (record.capturedAt) {
    const d = new Date(record.capturedAt);
    if (!isNaN(d.getTime()) && d.getFullYear() >= 2024) return d;
  }

  // 2. record.timestamp
  if (record.timestamp) {
    // Try explicit regex patterns first to avoid loose parsing side effects
    const dateMatch = record.timestamp.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      const year = parseInt(dateMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2024) return d;
    }

    const isoMatch = record.timestamp.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2024) return d;
    }

    const d = new Date(record.timestamp);
    if (!isNaN(d.getTime()) && d.getFullYear() >= 2024) return d;
  }

  // 3. If classDay is a timestamp ID like day-1723500000000
  const dayId = typeof classDay === 'string' ? classDay : classDay?.id;
  if (dayId && dayId.startsWith('day-')) {
    const num = parseInt(dayId.replace('day-', ''), 10);
    if (!isNaN(num) && num > 1600000000000) {
      const d = new Date(num);
      if (d.getFullYear() >= 2024) return d;
    }
  }

  // 4. If classDay name contains a recognizable date
  const dayName = typeof classDay === 'string' ? '' : classDay?.name;
  if (dayName) {
    // Only parse if the name contains an explicit recognizable date pattern
    const dateMatch = dayName.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      const year = parseInt(dateMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2024) return d;
    }

    const isoMatch = dayName.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2024) return d;
    }
  }

  return null;
}

/**
 * Determines if an attendance record is locked (> 24 hours after capture).
 */
export function getAttendanceLockInfo(
  record?: Partial<AttendanceRecord> | null,
  classDay?: ClassDay | string | null
): AttendanceLockInfo {
  // If record is not captured yet (no presence state or unmarked)
  if (!record || record.present === undefined) {
    return {
      isLocked: false,
      isCaptured: false,
      capturedDate: null,
      hoursRemaining: ATTENDANCE_LOCK_WINDOW_HOURS,
      minutesRemaining: ATTENDANCE_LOCK_WINDOW_HOURS * 60,
      message: 'Uncaptured: Can be marked and edited freely.'
    };
  }

  // If explicitly flagged as locked
  if (record.locked === true) {
    return {
      isLocked: true,
      isCaptured: true,
      capturedDate: getCapturedDate(record, classDay),
      hoursRemaining: 0,
      minutesRemaining: 0,
      message: 'Locked: Record was permanently finalized.'
    };
  }

  const capturedDate = getCapturedDate(record, classDay);
  if (!capturedDate) {
    // If it has a record but no timestamp could be parsed, default to current/unlocked
    return {
      isLocked: false,
      isCaptured: true,
      capturedDate: null,
      hoursRemaining: ATTENDANCE_LOCK_WINDOW_HOURS,
      minutesRemaining: ATTENDANCE_LOCK_WINDOW_HOURS * 60,
      message: 'Captured recently: Editable within 24hr window.'
    };
  }

  const elapsedMs = Date.now() - capturedDate.getTime();
  const remainingMs = ATTENDANCE_LOCK_WINDOW_MS - elapsedMs;

  if (remainingMs <= 0) {
    return {
      isLocked: true,
      isCaptured: true,
      capturedDate,
      hoursRemaining: 0,
      minutesRemaining: 0,
      message: `Locked: Attendance was captured on ${capturedDate.toLocaleDateString()} at ${capturedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (>24 hours ago). Modifications are locked to prevent fraud.`
    };
  }

  const hoursRemaining = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutesRemaining = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

  return {
    isLocked: false,
    isCaptured: true,
    capturedDate,
    hoursRemaining,
    minutesRemaining,
    message: `Captured: Editable for another ${hoursRemaining}h ${minutesRemaining}m (24hr fraud-prevention window).`
  };
}

/**
 * Fast boolean check for lock status.
 */
export function isAttendanceLocked(
  record?: Partial<AttendanceRecord> | null,
  classDay?: ClassDay | string | null
): boolean {
  return getAttendanceLockInfo(record, classDay).isLocked;
}
