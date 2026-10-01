import { describe, it, expect } from 'vitest';
import { 
  getLessonNumber, 
  isMatchingLesson, 
  deduplicateQuizLessons,
  CHRONOLOGICAL_CURRICULUM_LESSONS,
  CURRICULUM_CLASS_DAYS
} from '../data/curriculum';
import { getQuizScoreForStudent } from '../components/ExamsTab';

describe('Quiz Score Matrix Deduplication & Result Isolation', () => {
  describe('getLessonNumber', () => {
    it('accurately parses standard lesson titles', () => {
      expect(getLessonNumber('Introduction')).toBe(1);
      expect(getLessonNumber('Introduction (21/04/2026)')).toBe(1);
      expect(getLessonNumber('Evangelism Lesson 2')).toBe(2);
      expect(getLessonNumber('Evangelism Lesson 2 (05/05/2026)')).toBe(2);
      expect(getLessonNumber('School of the Pastors Lesson 16')).toBe(16);
      expect(getLessonNumber('Pastors 16')).toBe(16);
    });

    it('recognizes quiz formats with prefixes or subjects', () => {
      expect(getLessonNumber('Quiz 2 - Evangelism')).toBe(2);
      expect(getLessonNumber('Quiz 10')).toBe(10);
      expect(getLessonNumber('Exam 12')).toBe(12);
      expect(getLessonNumber('Class 5')).toBe(5);
      expect(getLessonNumber('Day 14')).toBe(14);
    });

    it('maps curriculum dates to the correct lesson number', () => {
      expect(getLessonNumber('School of the Pastors (18/08/2026)')).toBe(13);
      expect(getLessonNumber('Evangelism (05/05/2026)')).toBe(2);
      expect(getLessonNumber('Session (15/09/2026)')).toBe(16);
    });

    it('does not treat 4-digit years as lesson numbers', () => {
      expect(getLessonNumber('Graduation 2026')).toBeNull();
      expect(getLessonNumber('Annual Conference 2025')).toBeNull();
    });
  });

  describe('isMatchingLesson — strict non-duplication', () => {
    it('CRITICAL: NEVER matches Lesson 1 with Lessons 10 through 16', () => {
      expect(isMatchingLesson('Lesson 1', 'Lesson 10')).toBe(false);
      expect(isMatchingLesson('Lesson 1', 'School of the Pastors Lesson 10')).toBe(false);
      expect(isMatchingLesson('Lesson 1', 'School of the Pastors Lesson 11')).toBe(false);
      expect(isMatchingLesson('Lesson 1', 'School of the Pastors Lesson 12')).toBe(false);
      expect(isMatchingLesson('Lesson 1', 'School of the Pastors Lesson 13')).toBe(false);
      expect(isMatchingLesson('Lesson 1', 'School of the Pastors Lesson 14')).toBe(false);
      expect(isMatchingLesson('Lesson 1', 'School of the Pastors Lesson 15')).toBe(false);
      expect(isMatchingLesson('Lesson 1', 'School of the Pastors Lesson 16')).toBe(false);
    });

    it('matches variations of the same lesson accurately', () => {
      expect(isMatchingLesson('Introduction', 'Introduction (21/04/2026)')).toBe(true);
      expect(isMatchingLesson('Evangelism Lesson 2', 'Quiz 2 - Evangelism')).toBe(true);
      expect(isMatchingLesson('School of the Pastors Lesson 16', 'Pastors 16')).toBe(true);
      expect(isMatchingLesson('School of the Pastors (18/08/2026)', 'School of the Pastors Lesson 13')).toBe(true);
    });

    it('does not match different curriculum lessons', () => {
      expect(isMatchingLesson('Evangelism Lesson 2', 'Evangelism Lesson 3')).toBe(false);
      expect(isMatchingLesson('Ministerial Ethics Lesson 8', 'Ministerial Ethics lesson 9')).toBe(false);
      expect(isMatchingLesson('Apostolic Lesson 10', 'Apostolic Lesson 11')).toBe(false);
    });
  });

  describe('deduplicateQuizLessons', () => {
    it('produces exactly 16 curriculum lessons when given mixed dated and undated sheet titles', () => {
      const mixedSheets = [
        ...CURRICULUM_CLASS_DAYS.map(d => d.name), // with dates
        ...CHRONOLOGICAL_CURRICULUM_LESSONS,       // without dates
        'Quiz 2 - Evangelism',
        'School of the Pastors (18/08/2026)',
        'Introduction (21/04/2026)',
      ];

      const deduped = deduplicateQuizLessons(mixedSheets);
      expect(deduped).toHaveLength(16);
      expect(deduped[0]).toBe('Introduction');
      expect(deduped[1]).toBe('Evangelism Lesson 2');
      expect(deduped[15]).toBe('School of the Pastors Lesson 16');
    });

    it('preserves genuine non-curriculum sessions at the end without duplicating them', () => {
      const sheetsWithWorkshop = [
        'Introduction',
        'Evangelism Lesson 2',
        'Prophetic Ministry Special Session',
        'Prophetic Ministry Special Session (20/10/2026)', // duplicate of above
      ];

      const deduped = deduplicateQuizLessons(sheetsWithWorkshop);
      expect(deduped).toHaveLength(17);
      expect(deduped[16]).toBe('Prophetic Ministry Special Session');
    });
  });

  describe('getQuizScoreForStudent — result isolation', () => {
    it('prevents Lesson 1 quiz score from leaking into Lesson 10..16 columns', () => {
      const mockStudent = {
        name: 'Student Candidate',
        attendanceByDay: {
          'Introduction': { present: true, score: '5/5' },
          'Introduction (21/04/2026)': { present: true, score: '5/5' },
        },
      };

      const records = [
        { name: 'Student Candidate', classDay: 'Introduction', score: '5/5' }
      ];

      // Lesson 1 should have score
      const l1 = getQuizScoreForStudent(mockStudent as any, 'Introduction', records);
      expect(l1.hasScore).toBe(true);
      expect(l1.numericPct).toBe(100);

      // Lesson 10, 11, 16 must NOT have Lesson 1 score
      const l10 = getQuizScoreForStudent(mockStudent as any, 'Apostolic Lesson 10', records);
      expect(l10.hasScore).toBe(false);
      expect(l10.displayScore).toBe('—');

      const l16 = getQuizScoreForStudent(mockStudent as any, 'School of the Pastors Lesson 16', records);
      expect(l16.hasScore).toBe(false);
      expect(l16.displayScore).toBe('—');
    });

    it('correctly maps scores to each distinct lesson without bleed-through', () => {
      const mockStudent = {
        name: 'Jane Doe',
        attendanceByDay: {
          'Evangelism Lesson 2': { present: true, score: '11/12' },
          'School of the Pastors Lesson 16': { present: true, score: '9/10' }
        },
      };

      const l2 = getQuizScoreForStudent(mockStudent as any, 'Evangelism Lesson 2');
      expect(l2.hasScore).toBe(true);
      expect(l2.numericPct).toBe(92);

      const l3 = getQuizScoreForStudent(mockStudent as any, 'Evangelism Lesson 3');
      expect(l3.hasScore).toBe(false);
      expect(l3.displayScore).toBe('—');

      const l16 = getQuizScoreForStudent(mockStudent as any, 'School of the Pastors Lesson 16');
      expect(l16.hasScore).toBe(true);
      expect(l16.numericPct).toBe(90);
    });
  });
});
