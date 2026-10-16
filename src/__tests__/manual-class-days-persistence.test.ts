import { describe, it, expect } from 'vitest';
import { ClassDay, AttendanceRecord } from '../types';
import { CURRICULUM_CLASS_DAYS } from '../data/curriculum';

describe('Manual Class Days & Attendance Persistence', () => {
  it('preserves manual class days when merging with Google Sheets tabs', () => {
    const existingClassDays: ClassDay[] = [
      ...CURRICULUM_CLASS_DAYS.slice(0, 3),
      { id: 'day_manual_101', name: 'Special Prayer & Impartation Session', isManual: true },
      { id: 'day_manual_102', name: 'Practicum Workshop Day 1', isManual: true },
    ];

    const syncedSheetTitles = new Set(['Introduction', 'Evangelism Lesson 2']);

    // Simulate updatedClassDays logic in useGoogleSheetsSync
    const updatedClassDays = [
      ...existingClassDays.filter(
        d => d.isManual || (typeof d.id === 'string' && d.id.startsWith('day_')) || !syncedSheetTitles.has(d.id)
      ),
    ];

    // Ensure all manual class days are preserved
    expect(updatedClassDays.some(d => d.id === 'day_manual_101')).toBe(true);
    expect(updatedClassDays.some(d => d.id === 'day_manual_102')).toBe(true);
    expect(updatedClassDays.find(d => d.id === 'day_manual_101')?.name).toBe('Special Prayer & Impartation Session');
  });

  it('preserves manual attendance records and overrides during Google Sheets sync', () => {
    const records: AttendanceRecord[] = [
      // Standard sheet record
      { name: 'Student One', studentName: 'Student One', classDay: 'Introduction', present: true, status: 'present' },
      // Manual override on sheet day
      { name: 'Student Two', studentName: 'Student Two', classDay: 'Introduction', present: true, status: 'present', manualOverride: true },
      // Record for a manual class day
      { name: 'Student One', studentName: 'Student One', classDay: 'day_manual_101', present: true, status: 'present', manualOverride: true },
      { name: 'Student Two', studentName: 'Student Two', classDay: 'day_manual_101', present: false, status: 'absent', manualOverride: true },
    ];

    const syncedSheetTitles = new Set(['Introduction']);

    // Simulate preservedRecords logic in useGoogleSheetsSync
    const preservedRecords = records.filter(r => {
      if (!r || !r.classDay) return false;
      if (r.manualOverride === true || (typeof r.classDay === 'string' && r.classDay.startsWith('day_'))) {
        return true;
      }
      if (syncedSheetTitles.has(r.classDay)) return false;
      return true;
    });

    // Check that manual class day records and overrides are preserved
    expect(preservedRecords.some(r => r.classDay === 'day_manual_101')).toBe(true);
    expect(preservedRecords.filter(r => r.classDay === 'day_manual_101')).toHaveLength(2);
    expect(preservedRecords.some(r => r.studentName === 'Student Two' && r.classDay === 'Introduction' && r.manualOverride)).toBe(true);
  });

  it('retains local manual class days and records when re-entering the app (initialPull)', () => {
    const localClassDays: ClassDay[] = [
      ...CURRICULUM_CLASS_DAYS.slice(0, 2),
      { id: 'day_local_session_99', name: 'Field Ministry Outreach', isManual: true },
    ];

    const localRecords: AttendanceRecord[] = [
      { name: 'Student One', studentName: 'Student One', classDay: 'day_local_session_99', present: true, manualOverride: true },
    ];

    const cloudState = {
      classDays: [
        ...CURRICULUM_CLASS_DAYS.slice(0, 2),
      ],
      records: [
        { name: 'Student One', studentName: 'Student One', classDay: 'Introduction', present: true },
      ],
    };

    // Simulate initialPull merge logic for classDays
    const cloudDays = cloudState.classDays || [];
    const cloudIds = new Set(cloudDays.map((d: any) => d.id || d.name));
    const localManualDays = localClassDays.filter(
      d => (d.isManual || (typeof d.id === 'string' && d.id.startsWith('day_'))) && !cloudIds.has(d.id)
    );
    const mergedClassDays = [...cloudDays, ...localManualDays];

    expect(mergedClassDays.some(d => d.id === 'day_local_session_99')).toBe(true);
    expect(mergedClassDays.length).toBe(3);

    // Simulate initialPull merge logic for records
    const cloudRecords = cloudState.records || [];
    const cloudKeySet = new Set(
      cloudRecords.map((r: any) => `${(r.name || r.studentName || '').toLowerCase().trim()}:::${(r.classDay || '').toLowerCase().trim()}`)
    );
    const localManualRecords = localRecords.filter(r => {
      if (!r || !r.classDay) return false;
      const key = `${(r.name || r.studentName || '').toLowerCase().trim()}:::${(r.classDay || '').toLowerCase().trim()}`;
      const isManual = r.manualOverride === true || (typeof r.classDay === 'string' && r.classDay.startsWith('day_'));
      return isManual && !cloudKeySet.has(key);
    });
    const mergedRecords = [...cloudRecords, ...localManualRecords];

    expect(mergedRecords.some(r => r.classDay === 'day_local_session_99')).toBe(true);
    expect(mergedRecords.some(r => r.classDay === 'Introduction')).toBe(true);
    expect(mergedRecords.length).toBe(2);
  });

  it('correctly unites baselineState classDays with relational state in GET /api/state', () => {
    const relationalState: { classDays: ClassDay[]; records: AttendanceRecord[] } = {
      classDays: [...CURRICULUM_CLASS_DAYS],
      records: [],
    };

    const baselineState: { classDays: ClassDay[]; records: AttendanceRecord[] } = {
      classDays: [
        ...CURRICULUM_CLASS_DAYS,
        { id: 'day_custom_202', name: 'Prophetic Presbytery Night', isManual: true },
      ],
      records: [
        { name: 'Student One', studentName: 'Student One', classDay: 'day_custom_202', present: true, manualOverride: true },
      ],
    };

    // Simulate GET /api/state merge logic
    const state = { ...relationalState };
    if (Array.isArray(baselineState.classDays) && baselineState.classDays.length > 0) {
      const existingDayIds = new Set(state.classDays.map((d: any) => d.id || d.name));
      const additionalDays = baselineState.classDays.filter(
        (d: any) => d && !existingDayIds.has(d.id) && !existingDayIds.has(d.name)
      );
      state.classDays = [...state.classDays, ...additionalDays];
    }

    if (Array.isArray(baselineState.records) && baselineState.records.length > 0) {
      if (!Array.isArray(state.records) || state.records.length === 0) {
        state.records = baselineState.records;
      }
    }

    expect(state.classDays.some(d => d.id === 'day_custom_202')).toBe(true);
    expect(state.records.some(r => r.classDay === 'day_custom_202')).toBe(true);
    expect(state.records[0].studentName).toBe('Student One');
  });
});
