// Student Notes storage utility with localStorage persistence

export interface StudentClassNote {
  id: string;
  studentName: string;
  title: string;
  classDayId: string;
  classDayName: string;
  classDate: string;
  moduleCode: string;
  instructor?: string;
  content: string;
  keyScriptures: string[];
  spiritualTakeaways?: string;
  actionPoints?: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = 'hteim_student_class_notes_v1_';

export const STARTER_STUDENT_NOTES: StudentClassNote[] = [
  {
    id: 'note-sample-pastors-pt2',
    studentName: 'General Student',
    title: 'School of the Pastors: Flock Governance & Spiritual Oversight',
    classDayId: 'School of the Pastors Pt2',
    classDayName: 'School of the Pastors Pt 2 (08/09/2026)',
    classDate: '2026-09-08',
    moduleCode: 'SOM-MOD-6',
    instructor: 'Pastor Samuel Selkridge',
    content: `### Overview & Theological Foundation
A shepherd does not drive the sheep from behind with harshness; a true under-shepherd leads with tenderness, integrity, and divine order. In today's session, we examined the posture of pastoral care versus authoritarian abuse.

### Key Class Principles
1. **Voluntary Oversight**: Oversight must be exercised voluntarily according to God's will, never out of compulsion or greed (1 Peter 5:2).
2. **The Anointed Rod & Staff**: The rod protects the sheep from ravenous wolves; the staff tenderly redirects lambs when they stray into dangerous terrain.
3. **Sound Doctrine**: Guarding the pulpit against false doctrine begins in private prayer and study of the Word.

### Class Discussion & Reflection
- What is the difference between organizational management and spiritual parenting?
- When dealing with wounded believers, restorative grace must always precede administrative discipline.`,
    keyScriptures: [
      '2 Timothy 2:15 (AMP) - Study and do your utmost to present yourself approved unto God, a workman that needeth not to be ashamed, accurately handling and skillfully teaching the word of truth.',
      '1 Peter 5:2-3 (AMP) - Shepherd and guide and protect the flock of God among you, exercising oversight not under compulsion, but voluntarily, according to the will of God; not domineering over those in your charge, but being examples of Christian living to the flock.'
    ],
    spiritualTakeaways: 'God evaluates a shepherd not by the size of the crowd, but by the spiritual maturity and safety of the flock entrusted to them.',
    actionPoints: [
      'Review my personal prayer list for assigned ministry peers.',
      'Memorize 2 Timothy 2:15 in the Amplified Bible for the upcoming exam.',
      'Complete the pastoral ethics questionnaire for Module 6.'
    ],
    tags: ['Pastoral Care', 'Shepherding', 'Leadership', 'Module 6'],
    createdAt: '2026-09-08T19:30:00.000Z',
    updatedAt: '2026-09-08T20:45:00.000Z'
  },
  {
    id: 'note-sample-apostolic-pt1',
    studentName: 'General Student',
    title: 'Apostolic Foundations: Blueprint of the Fivefold Ministry',
    classDayId: 'Apostolic Pt 1',
    classDayName: 'Apostolic Pt 1 (11/08/2026)',
    classDate: '2026-08-11',
    moduleCode: 'SOM-MOD-4',
    instructor: 'Apostle Gillian Selkridge',
    content: `### The Divine Order of the Fivefold
Ephesians 4:11 reveals the governmental structure established by Christ for the maturation of the Church. The fivefold ministry gifts are not hierarchy badges for human pride, but functional servant mantles for equipping the saints.

### The Hand Analogy
- **Apostle (Thumb)**: Reaches and strengthens all four other fingers; establishes foundation and doctrine.
- **Prophet (Index Finger)**: Points the direction; reveals God's divine heart and warns.
- **Evangelist (Middle Finger)**: Extends furthest outward into the harvest field; heart for the lost.
- **Pastor (Ring Finger)**: Wedded to the flock; covenants to nurture, protect, and feed.
- **Teacher (Pinky Finger)**: Balances and provides precise balance in scripture interpretation.

### Apostolic Sending & Authority
Authority is maintained only while under spiritual submission. The church is built on the foundation of the apostles and prophets, Christ Jesus Himself being the chief cornerstone.`,
    keyScriptures: [
      'Ephesians 4:11-12 (AMP) - And He Himself appointed some to be apostles, some prophets, some evangelists, and some pastors and teachers, for the equipping of the saints for the work of ministry, for the building up of the body of Christ.',
      '1 Corinthians 12:28 (AMP) - And God has appointed in the church, first apostles, second prophets, third teachers, then wonder-workers, then those with gifts of healings, helps, administration, and kinds of languages.'
    ],
    spiritualTakeaways: 'Alignment brings empowerment. When believers understand their divine placement within the body, friction diminishes and supernatural fruitfulness manifests.',
    actionPoints: [
      'Study Acts chapter 2 and chapter 19 regarding apostolic impartation.',
      'Draft my personal ministry gifting self-assessment.'
    ],
    tags: ['Apostolic', 'Fivefold Ministry', 'Spiritual Order', 'Module 4'],
    createdAt: '2026-08-11T18:45:00.000Z',
    updatedAt: '2026-08-11T21:10:00.000Z'
  }
];

export function getStudentNotes(studentName: string): StudentClassNote[] {
  try {
    const key = `${STORAGE_KEY_PREFIX}${studentName ? studentName.toLowerCase().trim() : 'general'}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load notes from localStorage', e);
  }
  return STARTER_STUDENT_NOTES;
}

export function saveStudentNotes(studentName: string, notes: StudentClassNote[]): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${studentName ? studentName.toLowerCase().trim() : 'general'}`;
    localStorage.setItem(key, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save notes to localStorage', e);
  }
}

/**
 * Append a note or update existing note for a student
 */
export function appendStudentNote(studentName: string, newNote: StudentClassNote): void {
  const current = getStudentNotes(studentName);
  const updated = [newNote, ...current.filter(n => n.id !== newNote.id)];
  saveStudentNotes(studentName, updated);
}

/**
 * Format and add a student note directly from a library resource excerpt
 */
export function createNoteFromLibraryExcerpt(
  studentName: string,
  params: {
    resourceTitle: string;
    courseCode?: string;
    instructor?: string;
    excerpt: string;
    scriptures?: string[];
    tags?: string[];
    isAudioTimestamp?: boolean;
    timestampLabel?: string;
  }
): StudentClassNote {
  const noteId = `note_lib_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();
  const dateFormatted = nowIso.split('T')[0];

  const prefix = params.isAudioTimestamp ? `🎙️ Lecture Timestamp ${params.timestampLabel || ''}` : '📖 Library Excerpt';

  const note: StudentClassNote = {
    id: noteId,
    studentName: studentName || 'General Student',
    title: `${prefix}: ${params.resourceTitle}`,
    classDayId: params.courseCode || 'SOM-LIBRARY',
    classDayName: `${params.courseCode || 'SOM Resource'}: ${params.resourceTitle}`,
    classDate: dateFormatted,
    moduleCode: params.courseCode || 'SOM-CORE',
    instructor: params.instructor || 'HTEIM Faculty',
    content: `### Source: ${params.resourceTitle}\n${params.instructor ? `**Instructor / Author**: ${params.instructor}\n` : ''}${params.isAudioTimestamp ? `**Audio Timestamp**: \`${params.timestampLabel}\`\n\n` : ''}**Study Excerpt / Notes**:\n> ${params.excerpt.split('\n').join('\n> ')}\n\n### Personal Reflection:\n- `,
    keyScriptures: params.scriptures || [],
    spiritualTakeaways: `Captured during self-study from library material: "${params.resourceTitle}".`,
    actionPoints: ['Review this excerpt for module preparation.'],
    tags: params.tags && params.tags.length > 0 ? params.tags : ['Digital Library', params.courseCode || 'Curriculum'],
    createdAt: nowIso,
    updatedAt: nowIso
  };

  appendStudentNote(studentName, note);
  return note;
}

