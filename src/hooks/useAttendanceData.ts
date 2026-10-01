import { useState, useEffect, useMemo } from 'react';
import { ClassDay, AttendanceRecord } from '../types';
import { CURRICULUM_CLASS_DAYS, RAW_CURRICULUM_RECORDS, isObsoleteLegacyClassDay } from '../data';
import { isExcludedStudent } from '../lib/studentNames';

export const useAttendanceData = () => {
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
      try {
        deletedList = JSON.parse(savedDeleted);
      } catch {}
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
          if (cleaned.length >= 50) {
            return cleaned;
          }
        }
      } catch (e) {}
    }

    // Default permanent attendance records for all 16 curriculum classes & quizzes
    return RAW_CURRICULUM_RECORDS.filter(r => !isExcludedStudent(r.name) && !isObsoleteLegacyClassDay(r.classDay));
  });

  // Active runtime migration: immediately purge any obsolete legacy duplicated class days & records from localStorage
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
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('deletedClassDayIds', JSON.stringify(deletedClassDayIds));
  }, [deletedClassDayIds]);

  // Custom Student Excused Absences
  const [excusedAbsences, setExcusedAbsences] = useState<Record<string, Record<string, boolean>>>(() => {
    const saved = localStorage.getItem('excusedAbsences');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('excusedAbsences', JSON.stringify(excusedAbsences));
  }, [excusedAbsences]);

  // Custom Thresholds (At Risk & Satisfactory)
  const [atRiskThreshold, setAtRiskThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('atRiskThreshold');
    return saved ? parseInt(saved, 10) : 50;
  });

  const [satisfactoryThreshold, setSatisfactoryThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('satisfactoryThreshold');
    return saved ? parseInt(saved, 10) : 80;
  });

  useEffect(() => {
    localStorage.setItem('atRiskThreshold', atRiskThreshold.toString());
  }, [atRiskThreshold]);

  useEffect(() => {
    localStorage.setItem('satisfactoryThreshold', satisfactoryThreshold.toString());
  }, [satisfactoryThreshold]);

  return {
    defaultPermanentClassDays,
    classDays,
    setClassDays,
    records,
    setRecords,
    deletedClassDayIds,
    setDeletedClassDayIds,
    excusedAbsences,
    setExcusedAbsences,
    atRiskThreshold,
    setAtRiskThreshold,
    satisfactoryThreshold,
    setSatisfactoryThreshold,
  };
};
