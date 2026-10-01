// HTEIM School of Ministry — Master Institutional Curriculum & Student Roster
// Official Academic Cohort 2025–2026 Definitions

export interface CurriculumRecord {
  name: string;
  classDay: string;
  timestamp: string;
  score: string;
  present: boolean;
  isDemo?: boolean;
  source?: string;
}

export interface ClassDayItem {
  id: string;
  name: string;
  date: string;
}

/**
 * Detects obsolete legacy class day IDs or duplicated placeholder names
 * (e.g. "School of the Pastors Pt 4", "School of the Pastors Pt 3", "Apostolic Pt 1", "Lesson 8 Assignment", etc.)
 * that were superseded by the canonical 16 Google Sheet tabs.
 */
export const isObsoleteLegacyClassDay = (idOrName: string | undefined | null): boolean => {
  if (!idOrName) return false;
  const normalized = idOrName.toLowerCase().trim();

  // Pattern matching for old naming conventions:
  // 1. School of the Pastors Pt 1..4 / Part 1..4
  if (/^school\s+of\s+the\s+pastors\s+(pt|part)\.?\s*\d+/i.test(normalized)) return true;
  // 2. Apostolic Pt 1..3 / Part 1..3
  if (/^apostolic\s+(pt|part)\.?\s*\d+/i.test(normalized)) return true;
  // 3. Lesson X Assignment / Lesson 1 Responses / Lesson 4 Assignment Part 2
  if (/^lesson\s+\d+\s+(assignment|responses)/i.test(normalized)) return true;

  const LEGACY_OBSOLETE_SET = new Set([
    'school of the pastors pt 4',
    'school of the pastors pt4',
    'school of the pastors pt 3',
    'school of the pastors pt3',
    'school of the pastors pt 2',
    'school of the pastors pt2',
    'school of the pastors pt 1',
    'school of the pastors pt1',
    'school of the pastors pt. 4',
    'school of the pastors pt. 3',
    'school of the pastors pt. 2',
    'school of the pastors pt. 1',
    'school of the pastors part 4',
    'school of the pastors part 3',
    'school of the pastors part 2',
    'school of the pastors part 1',
    'apostolic pt 3',
    'apostolic pt3',
    'apostolic pt 2',
    'apostolic pt2',
    'apostolic pt 1',
    'apostolic pt1',
    'apostolic pt. 3',
    'apostolic pt. 2',
    'apostolic pt. 1',
    'apostolic part 3',
    'apostolic part 2',
    'apostolic part 1',
    'lesson 8 assignment',
    'lesson 7 assignment',
    'lesson 6 assignment',
    'lesson 5 assignment',
    'lesson 4 assignment part 2',
    'lesson 4 assignment',
    'lesson 3 assignment',
    'lesson 2 assignment',
    'lesson 1 responses'
  ]);

  return LEGACY_OBSOLETE_SET.has(normalized);
};

/**
 * The 16 official curriculum class sessions & quiz lessons for the HTEIM School of Ministry course.
 */
export const CURRICULUM_CLASS_DAYS: ClassDayItem[] = [
  { id: "School of the Pastors Lesson 16", name: "School of the Pastors Lesson 16 (15/09/2026)", date: "2026-09-15" },
  { id: "School of the Pastors Lesson 15", name: "School of the Pastors Lesson 15 (08/09/2026)", date: "2026-09-08" },
  { id: "School of the Pastors Lesson 14", name: "School of the Pastors Lesson 14 (01/09/2026)", date: "2026-09-01" },
  { id: "School of the Pastors Lesson 13", name: "School of the Pastors Lesson 13 (18/08/2026)", date: "2026-08-18" },
  { id: "Apostolic Lesson 12", name: "Apostolic Lesson 12 (11/08/2026)", date: "2026-08-11" },
  { id: "Apostolic Lesson 11", name: "Apostolic Lesson 11 (04/08/2026)", date: "2026-08-04" },
  { id: "Apostolic Lesson 10", name: "Apostolic Lesson 10 (21/07/2026)", date: "2026-07-21" },
  { id: "Ministerial Ethics lesson 9", name: "Ministerial Ethics Lesson 9 (14/07/2026)", date: "2026-07-14" },
  { id: "Ministerial Ethics Lesson 8", name: "Ministerial Ethics Lesson 8 (30/06/2026)", date: "2026-06-30" },
  { id: "Evangelism Lesson 7", name: "Evangelism Lesson 7 (09/06/2026)", date: "2026-06-09" },
  { id: "Evangelism lesson 6", name: "Evangelism Lesson 6 (02/06/2026)", date: "2026-06-02" },
  { id: "Evangelism Lesson 5", name: "Evangelism Lesson 5 (26/05/2026)", date: "2026-05-26" },
  { id: "Evangelism Lesson 4", name: "Evangelism Lesson 4 (19/05/2026)", date: "2026-05-19" },
  { id: "Evangelism Lesson 3", name: "Evangelism Lesson 3 (12/05/2026)", date: "2026-05-12" },
  { id: "Evangelism Lesson 2", name: "Evangelism Lesson 2 (05/05/2026)", date: "2026-05-05" },
  { id: "Introduction", name: "Introduction (21/04/2026)", date: "2026-04-21" },
];

/**
 * Exact maximum quiz points for each lesson across the curriculum from start to finish.
 * Introduction (5), Evangelism 2 (12), Evangelism 3 (10), Evangelism 4 (7),
 * Evangelism 5 (10), Evangelism 6 (10), Evangelism 7 (10), Ministerial Ethics 8 (5),
 * Ministerial Ethics 9 (10), Apostolic 10 (6), Apostolic 11 (5), Apostolic 12 (8),
 * Pastors 13 (10), Pastors 14 (16), Pastors 15 (13), Pastors 16 (10).
 * Total points from start to finish: 147 points.
 */
export const CURRICULUM_QUIZ_MAX_POINTS: Record<string, number> = {
  "Introduction": 5,
  "Evangelism Lesson 2": 12,
  "Evangelism Lesson 3": 10,
  "Evangelism Lesson 4": 7,
  "Evangelism Lesson 5": 10,
  "Evangelism lesson 6": 10,
  "Evangelism Lesson 7": 10,
  "Ministerial Ethics Lesson 8": 5,
  "Ministerial Ethics lesson 9": 10,
  "Apostolic Lesson 10": 6,
  "Apostolic Lesson 11": 5,
  "Apostolic Lesson 12": 8,
  "School of the Pastors Lesson 13": 10,
  "School of the Pastors Lesson 14": 16,
  "School of the Pastors Lesson 15": 13,
  "School of the Pastors Lesson 16": 10,
};

export const TOTAL_CURRICULUM_MAX_POINTS = Object.values(CURRICULUM_QUIZ_MAX_POINTS).reduce((a, b) => a + b, 0); // 147

export const getLessonMaxPoints = (lessonName?: string): number => {
  if (!lessonName) return 10;
  const clean = lessonName.toLowerCase().trim().split('(')[0].trim();
  for (const [k, max] of Object.entries(CURRICULUM_QUIZ_MAX_POINTS)) {
    const kClean = k.toLowerCase().trim();
    if (clean === kClean || clean.includes(kClean) || kClean.includes(clean)) {
      return max;
    }
  }
  // Pattern based matching
  if (clean.includes('introduction')) return 5;
  if (clean.includes('lesson 2')) return 12;
  if (clean.includes('lesson 4')) return 7;
  if (clean.includes('lesson 8')) return 5;
  if (clean.includes('lesson 10')) return 6;
  if (clean.includes('lesson 11')) return 5;
  if (clean.includes('lesson 12')) return 8;
  if (clean.includes('lesson 14')) return 16;
  if (clean.includes('lesson 15')) return 13;
  return 10;
};

/**
 * Chronological order of curriculum quiz lessons from start to finish.
 */
export const CHRONOLOGICAL_CURRICULUM_LESSONS = [
  'Introduction',
  'Evangelism Lesson 2',
  'Evangelism Lesson 3',
  'Evangelism Lesson 4',
  'Evangelism Lesson 5',
  'Evangelism lesson 6',
  'Evangelism Lesson 7',
  'Ministerial Ethics Lesson 8',
  'Ministerial Ethics lesson 9',
  'Apostolic Lesson 10',
  'Apostolic Lesson 11',
  'Apostolic Lesson 12',
  'School of the Pastors Lesson 13',
  'School of the Pastors Lesson 14',
  'School of the Pastors Lesson 15',
  'School of the Pastors Lesson 16',
];

/**
 * Date to curriculum lesson number mapping for robust canonical matching.
 */
const CURRICULUM_DATE_LESSON_MAP: Record<string, number> = {
  '21/04': 1, '21-04': 1, '2026-04-21': 1,
  '05/05': 2, '05-05': 2, '2026-05-05': 2,
  '12/05': 3, '12-05': 3, '2026-05-12': 3,
  '19/05': 4, '19-05': 4, '2026-05-19': 4,
  '26/05': 5, '26-05': 5, '2026-05-26': 5,
  '02/06': 6, '02-06': 6, '2026-06-02': 6,
  '09/06': 7, '09-06': 7, '2026-06-09': 7,
  '30/06': 8, '30-06': 8, '2026-06-30': 8,
  '14/07': 9, '14-07': 9, '2026-07-14': 9,
  '21/07': 10, '21-07': 10, '2026-07-21': 10,
  '04/08': 11, '04-08': 11, '2026-08-04': 11,
  '11/08': 12, '11-08': 12, '2026-08-11': 12,
  '18/08': 13, '18-08': 13, '2026-08-18': 13,
  '01/09': 14, '01-09': 14, '2026-09-01': 14,
  '08/09': 15, '08-09': 15, '2026-09-08': 15,
  '15/09': 16, '15-09': 16, '2026-09-15': 16,
};

/**
 * Extracts the curriculum lesson number (1..16) from any lesson title, ID, or quiz sheet name.
 * Handles "Introduction" -> 1, "Evangelism Lesson 2" -> 2, "Quiz 2 - Evangelism" -> 2, "Pastors 16" -> 16, etc.
 */
export const getLessonNumber = (title?: string | null): number | null => {
  if (!title) return null;
  const lower = title.toLowerCase().trim();
  if (lower.includes('introduction') || lower.includes('intro')) return 1;

  // 1. Direct regex match on lesson/quiz/exam/module/day/class/session number
  const m = lower.match(/(?:lesson|quiz|exam|test|module|pt\.?|part|day|class|session|\bl)\s*[-_:#]?\s*(\d+)\b/i);
  if (m) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 50) return num;
  }

  // 2. Trailing or parenthetical lesson number (ignoring full years like 2026)
  const endMatch = lower.match(/\b(\d+)(?:\s*\(|$)/);
  if (endMatch) {
    const num = parseInt(endMatch[1], 10);
    if (num >= 1 && num <= 50) return num;
  }

  // 3. Fallback date pattern match to canonical curriculum dates
  for (const [dateKey, lessonNum] of Object.entries(CURRICULUM_DATE_LESSON_MAP)) {
    if (lower.includes(dateKey)) {
      return lessonNum;
    }
  }

  return null;
};

/**
 * Returns the canonical curriculum lesson title for a given lesson number or name.
 */
export const getCanonicalLessonTitle = (titleOrNumber?: string | number | null): string => {
  if (titleOrNumber === null || titleOrNumber === undefined) return '';
  const num = typeof titleOrNumber === 'number' ? titleOrNumber : getLessonNumber(titleOrNumber);
  if (num !== null && num >= 1 && num <= CHRONOLOGICAL_CURRICULUM_LESSONS.length) {
    return CHRONOLOGICAL_CURRICULUM_LESSONS[num - 1];
  }
  return typeof titleOrNumber === 'string' ? titleOrNumber.trim() : `Lesson ${titleOrNumber}`;
};

/**
 * Checks whether two lesson titles/IDs match the same curriculum lesson.
 * Prevents false-positive substring matches (e.g., Lesson 1 will NEVER match Lesson 10..16).
 */
export const isMatchingLesson = (titleA?: string | null, titleB?: string | null): boolean => {
  if (!titleA || !titleB) return false;
  const normA = titleA.toLowerCase().trim();
  const normB = titleB.toLowerCase().trim();
  if (normA === normB) return true;

  const strippedA = normA.split('(')[0].trim();
  const strippedB = normB.split('(')[0].trim();
  if (strippedA === strippedB) return true;

  const numA = getLessonNumber(titleA);
  const numB = getLessonNumber(titleB);

  // If both have extracted lesson numbers
  if (numA !== null && numB !== null) {
    return numA === numB; // Different numbers NEVER match! Same numbers match!
  }

  // If only one has an extracted lesson number, check if the other title matches the canonical title
  if (numA !== null && numA >= 1 && numA <= CHRONOLOGICAL_CURRICULUM_LESSONS.length) {
    const canonicalA = CHRONOLOGICAL_CURRICULUM_LESSONS[numA - 1].toLowerCase();
    if (canonicalA === normB || canonicalA === strippedB) return true;
  }
  if (numB !== null && numB >= 1 && numB <= CHRONOLOGICAL_CURRICULUM_LESSONS.length) {
    const canonicalB = CHRONOLOGICAL_CURRICULUM_LESSONS[numB - 1].toLowerCase();
    if (canonicalB === normA || canonicalB === strippedA) return true;
  }

  return strippedA === strippedB;
};

/**
 * Deduplicates a list of quiz lesson titles so that each curriculum lesson (1..16)
 * appears exactly once, arranged in chronological order from Lesson 1 to Lesson 16,
 * followed by any non-curriculum custom sessions.
 */
export const deduplicateQuizLessons = (lessons?: string[] | null): string[] => {
  const result: string[] = [];
  const extraLessons: string[] = [];

  // Initialize slots for the 16 core curriculum lessons
  const coreSlots: (string | null)[] = new Array(CHRONOLOGICAL_CURRICULUM_LESSONS.length).fill(null);

  (lessons || []).forEach(item => {
    if (!item || isObsoleteLegacyClassDay(item)) return;
    const lower = item.toLowerCase();
    if (lower.includes('duplicate') || lower.includes('copy')) return;

    const num = getLessonNumber(item);
    if (num !== null && num >= 1 && num <= CHRONOLOGICAL_CURRICULUM_LESSONS.length) {
      const idx = num - 1;
      coreSlots[idx] = CHRONOLOGICAL_CURRICULUM_LESSONS[idx];
      return;
    }

    // Check if it matches any core lesson by title
    const coreIdx = CHRONOLOGICAL_CURRICULUM_LESSONS.findIndex(c => isMatchingLesson(c, item));
    if (coreIdx >= 0) {
      coreSlots[coreIdx] = CHRONOLOGICAL_CURRICULUM_LESSONS[coreIdx];
      return;
    }

    // Genuine extra non-curriculum session — deduplicate against already-added extra lessons
    const alreadyInExtra = extraLessons.some(existing => isMatchingLesson(existing, item));
    if (!alreadyInExtra) {
      extraLessons.push(item);
    }
  });

  // Ensure all 16 canonical lessons are always populated in order 1..16
  for (let i = 0; i < CHRONOLOGICAL_CURRICULUM_LESSONS.length; i++) {
    result.push(coreSlots[i] || CHRONOLOGICAL_CURRICULUM_LESSONS[i]);
  }

  // Append any legitimate non-curriculum additional class days/quizzes
  extraLessons.forEach(extra => {
    result.push(extra);
  });

  return result;
};

/**
 * The 59 enrolled students in the HTEIM School of Ministry active cohort.
 */
export const MASTER_ENROLLED_STUDENTS: string[] = [
  "Afeshia Burke",
  "Afi Thompson",
  "Alicia Noray Bowles",
  "Anne-Marie Davis",
  "Atiya Williams",
  "Beverly Selkridge",
  "Candy Webb",
  "Catherine Vidale",
  "Claudia Cashe",
  "Colette Blackburne-Joseph",
  "Denise Edwards",
  "Dessel Williams",
  "Diana Selkridge",
  "Felicia Williams",
  "Francisca Swift",
  "Ingrid Bonval-Butcher",
  "Javier Marks",
  "Jenetta Pierre",
  "Jennylyn Dickson",
  "Jerzelle Whiteman",
  "Jessica Fiddler",
  "Josanne Pompey",
  "Jovanka Williams",
  "Julie-Ann Fernandes-Charles",
  "Kabrina Morris-Jack",
  "Kadijah Daniel",
  "Kathleen Joseph-Sandy",
  "Kemrolene Bowens-Opadeyi",
  "Keyshana Gomes",
  "Kristy Alexander",
  "Krystal Mohammed",
  "Leslie Inniss",
  "Lynton Pompey",
  "Marlene Walker-Castle",
  "Mishael Daniel",
  "Natalie Webb Lewis",
  "Natasha Williams",
  "Nevillean Dundas",
  "Niomi Loverne Joseph Marksman",
  "Paula Massiah Blount",
  "Quacy Marecheau",
  "Racine Roy",
  "Racquel Gumbs",
  "Regina Joseph-Gonzales",
  "Rennie Bowles",
  "Richard Roberts",
  "Roxanne Sealey",
  "Ruth Vernon",
  "Shellon Liddell",
  "Stacey Waithe",
  "Susan Sparks",
  "Sybris Walker-Castle",
  "Tessa Phipps",
  "Tricia Worrell",
  "Vanessa Mohammed",
  "Vikash Ramnarace",
  "Wendy Woodruffe",
  "Whitney Tracey Seelochan",
  "Zahra Andrews"
];
