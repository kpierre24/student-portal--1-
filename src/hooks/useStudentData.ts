import { useState, useEffect } from 'react';
import { StudentSummary } from '../types';

export const useStudentData = () => {
  // Selected Student for Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);

  // Deleted / Excluded Students state
  const [deletedStudentNames, setDeletedStudentNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('deletedStudentNames');
    let list: string[] = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch {}
    }
    return list.filter(name => {
      const lower = (name || '').toLowerCase().trim();
      return !lower.includes('colette') && !lower.includes('blackburn') && !lower.includes('susan') && !lower.includes('sparks');
    });
  });

  // Custom Student Notes
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('studentNotes');
    return saved ? JSON.parse(saved) : {};
  });

  // Student Profile Photos State
  const [studentPhotos, setStudentPhotos] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('hteim_student_photos');
    return saved ? JSON.parse(saved) : {};
  });

  // Student Academic Levels State
  const [studentLevels, setStudentLevels] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('hteim_student_levels');
    return saved ? JSON.parse(saved) : {};
  });

  // Custom Evaluation Rubric Scores State (Participation, Scripture Memory, Assignments)
  const [rubricScores, setRubricScores] = useState<Record<string, { participation: number; scripture: number; assignment: number }>>(() => {
    const saved = localStorage.getItem('rubricScores');
    return saved ? JSON.parse(saved) : {};
  });

  // Synchronizers to local storage
  useEffect(() => {
    localStorage.setItem('deletedStudentNames', JSON.stringify(deletedStudentNames));
  }, [deletedStudentNames]);

  useEffect(() => {
    localStorage.setItem('studentNotes', JSON.stringify(studentNotes));
  }, [studentNotes]);

  useEffect(() => {
    localStorage.setItem('hteim_student_photos', JSON.stringify(studentPhotos));
  }, [studentPhotos]);

  useEffect(() => {
    localStorage.setItem('hteim_student_levels', JSON.stringify(studentLevels));
  }, [studentLevels]);

  useEffect(() => {
    localStorage.setItem('rubricScores', JSON.stringify(rubricScores));
  }, [rubricScores]);

  return {
    selectedStudent,
    setSelectedStudent,
    deletedStudentNames,
    setDeletedStudentNames,
    studentNotes,
    setStudentNotes,
    studentPhotos,
    setStudentPhotos,
    studentLevels,
    setStudentLevels,
    rubricScores,
    setRubricScores,
  };
};
