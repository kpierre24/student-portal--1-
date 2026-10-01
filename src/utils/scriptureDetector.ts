/**
 * Scripture Reference Detector & Linker
 * Extracts and canonicalizes Bible references from text, documents, and transcripts.
 */

export interface DetectedScripture {
  raw: string;
  book: string;
  bookId: string;
  chapter: number;
  verse?: number;
  endVerse?: number;
  cleanReference: string;
}

// Canonical Book Mapping for OT and NT
const BIBLE_BOOKS_MAP: Record<string, { id: string; name: string }> = {
  // Old Testament
  genesis: { id: 'gen', name: 'Genesis' },
  gen: { id: 'gen', name: 'Genesis' },
  exodus: { id: 'exo', name: 'Exodus' },
  exo: { id: 'exo', name: 'Exodus' },
  exod: { id: 'exo', name: 'Exodus' },
  leviticus: { id: 'lev', name: 'Leviticus' },
  lev: { id: 'lev', name: 'Leviticus' },
  numbers: { id: 'num', name: 'Numbers' },
  num: { id: 'num', name: 'Numbers' },
  deuteronomy: { id: 'deu', name: 'Deuteronomy' },
  deut: { id: 'deu', name: 'Deuteronomy' },
  joshua: { id: 'jos', name: 'Joshua' },
  josh: { id: 'jos', name: 'Joshua' },
  judges: { id: 'jdg', name: 'Judges' },
  judg: { id: 'jdg', name: 'Judges' },
  ruth: { id: 'rut', name: 'Ruth' },
  '1 samuel': { id: '1sa', name: '1 Samuel' },
  '1samuel': { id: '1sa', name: '1 Samuel' },
  '1 sam': { id: '1sa', name: '1 Samuel' },
  '1sam': { id: '1sa', name: '1 Samuel' },
  '2 samuel': { id: '2sa', name: '2 Samuel' },
  '2samuel': { id: '2sa', name: '2 Samuel' },
  '2 sam': { id: '2sa', name: '2 Samuel' },
  '2sam': { id: '2sa', name: '2 Samuel' },
  '1 kings': { id: '1ki', name: '1 Kings' },
  '1kings': { id: '1ki', name: '1 Kings' },
  '1 kgs': { id: '1ki', name: '1 Kings' },
  '2 kings': { id: '2ki', name: '2 Kings' },
  '2kings': { id: '2ki', name: '2 Kings' },
  '2 kgs': { id: '2ki', name: '2 Kings' },
  '1 chronicles': { id: '1ch', name: '1 Chronicles' },
  '1chronicles': { id: '1ch', name: '1 Chronicles' },
  '1 chron': { id: '1ch', name: '1 Chronicles' },
  '2 chronicles': { id: '2ch', name: '2 Chronicles' },
  '2chronicles': { id: '2ch', name: '2 Chronicles' },
  '2 chron': { id: '2ch', name: '2 Chronicles' },
  ezra: { id: 'ezr', name: 'Ezra' },
  nehemiah: { id: 'neh', name: 'Nehemiah' },
  neh: { id: 'neh', name: 'Nehemiah' },
  esther: { id: 'est', name: 'Esther' },
  job: { id: 'job', name: 'Job' },
  psalms: { id: 'psa', name: 'Psalms' },
  psalm: { id: 'psa', name: 'Psalms' },
  psa: { id: 'psa', name: 'Psalms' },
  ps: { id: 'psa', name: 'Psalms' },
  proverbs: { id: 'pro', name: 'Proverbs' },
  prov: { id: 'pro', name: 'Proverbs' },
  pro: { id: 'pro', name: 'Proverbs' },
  ecclesiastes: { id: 'ecc', name: 'Ecclesiastes' },
  eccl: { id: 'ecc', name: 'Ecclesiastes' },
  'song of solomon': { id: 'sng', name: 'Song of Solomon' },
  'song of songs': { id: 'sng', name: 'Song of Solomon' },
  isaiah: { id: 'isa', name: 'Isaiah' },
  isa: { id: 'isa', name: 'Isaiah' },
  jeremiah: { id: 'jer', name: 'Jeremiah' },
  jer: { id: 'jer', name: 'Jeremiah' },
  lamentations: { id: 'lam', name: 'Lamentations' },
  ezekiel: { id: 'ezk', name: 'Ezekiel' },
  ezek: { id: 'ezk', name: 'Ezekiel' },
  daniel: { id: 'dan', name: 'Daniel' },
  dan: { id: 'dan', name: 'Daniel' },
  hosea: { id: 'hos', name: 'Hosea' },
  joel: { id: 'jol', name: 'Joel' },
  amos: { id: 'amo', name: 'Amos' },
  obadiah: { id: 'oba', name: 'Obadiah' },
  jonah: { id: 'jon', name: 'Jonah' },
  micah: { id: 'mic', name: 'Micah' },
  nahum: { id: 'nam', name: 'Nahum' },
  habakkuk: { id: 'hab', name: 'Habakkuk' },
  zephaniah: { id: 'zep', name: 'Zephaniah' },
  haggai: { id: 'hag', name: 'Haggai' },
  zechariah: { id: 'zec', name: 'Zechariah' },
  zech: { id: 'zec', name: 'Zechariah' },
  malachi: { id: 'mal', name: 'Malachi' },

  // New Testament
  matthew: { id: 'mat', name: 'Matthew' },
  matt: { id: 'mat', name: 'Matthew' },
  mat: { id: 'mat', name: 'Matthew' },
  mark: { id: 'mrk', name: 'Mark' },
  mrk: { id: 'mrk', name: 'Mark' },
  luke: { id: 'luk', name: 'Luke' },
  luk: { id: 'luk', name: 'Luke' },
  john: { id: 'jhn', name: 'John' },
  jhn: { id: 'jhn', name: 'John' },
  acts: { id: 'act', name: 'Acts' },
  act: { id: 'act', name: 'Acts' },
  romans: { id: 'rom', name: 'Romans' },
  rom: { id: 'rom', name: 'Romans' },
  '1 corinthians': { id: '1co', name: '1 Corinthians' },
  '1corinthians': { id: '1co', name: '1 Corinthians' },
  '1 cor': { id: '1co', name: '1 Corinthians' },
  '2 corinthians': { id: '2co', name: '2 Corinthians' },
  '2corinthians': { id: '2co', name: '2 Corinthians' },
  '2 cor': { id: '2co', name: '2 Corinthians' },
  galatians: { id: 'gal', name: 'Galatians' },
  gal: { id: 'gal', name: 'Galatians' },
  ephesians: { id: 'eph', name: 'Ephesians' },
  eph: { id: 'eph', name: 'Ephesians' },
  philippians: { id: 'php', name: 'Philippians' },
  phil: { id: 'php', name: 'Philippians' },
  colossians: { id: 'col', name: 'Colossians' },
  col: { id: 'col', name: 'Colossians' },
  '1 thessalonians': { id: '1th', name: '1 Thessalonians' },
  '1thessalonians': { id: '1th', name: '1 Thessalonians' },
  '1 thess': { id: '1th', name: '1 Thessalonians' },
  '2 thessalonians': { id: '2th', name: '2 Thessalonians' },
  '2thessalonians': { id: '2th', name: '2 Thessalonians' },
  '2 thess': { id: '2th', name: '2 Thessalonians' },
  '1 timothy': { id: '1ti', name: '1 Timothy' },
  '1timothy': { id: '1ti', name: '1 Timothy' },
  '1 tim': { id: '1ti', name: '1 Timothy' },
  '2 timothy': { id: '2ti', name: '2 Timothy' },
  '2timothy': { id: '2ti', name: '2 Timothy' },
  '2 tim': { id: '2ti', name: '2 Timothy' },
  titus: { id: 'tit', name: 'Titus' },
  philemon: { id: 'phm', name: 'Philemon' },
  hebrews: { id: 'heb', name: 'Hebrews' },
  heb: { id: 'heb', name: 'Hebrews' },
  james: { id: 'jas', name: 'James' },
  jas: { id: 'jas', name: 'James' },
  '1 peter': { id: '1pe', name: '1 Peter' },
  '1peter': { id: '1pe', name: '1 Peter' },
  '1 pet': { id: '1pe', name: '1 Peter' },
  '2 peter': { id: '2pe', name: '2 Peter' },
  '2peter': { id: '2pe', name: '2 Peter' },
  '2 pet': { id: '2pe', name: '2 Peter' },
  '1 john': { id: '1jn', name: '1 John' },
  '1john': { id: '1jn', name: '1 John' },
  '2 john': { id: '2jn', name: '2 John' },
  '2john': { id: '2jn', name: '2 John' },
  '3 john': { id: '3jn', name: '3 John' },
  '3john': { id: '3jn', name: '3 John' },
  jude: { id: 'jud', name: 'Jude' },
  revelation: { id: 'rev', name: 'Revelation' },
  rev: { id: 'rev', name: 'Revelation' }
};

// Regex to capture Bible references like "2 Timothy 2:15", "Ephesians 4:11-12", "John 3:16", "1 Cor 12:28"
export const SCRIPTURE_REGEX = /\b((?:[123]\s+)?[A-Z][a-z]+(?:\s+of\s+[A-Z][a-z]+)?)\s+(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?\b/g;

/**
 * Extract all valid scripture references from a string
 */
export function extractScriptureReferences(text: string): DetectedScripture[] {
  if (!text) return [];
  const results: DetectedScripture[] = [];
  const seen = new Set<string>();

  const matches = text.matchAll(SCRIPTURE_REGEX);
  for (const match of matches) {
    const raw = match[0];
    const rawBook = match[1].toLowerCase().trim().replace(/\s+/g, ' ');
    const chapter = parseInt(match[2], 10);
    const verse = parseInt(match[3], 10);
    const endVerse = match[4] ? parseInt(match[4], 10) : undefined;

    const bookMeta = BIBLE_BOOKS_MAP[rawBook];
    if (bookMeta && !isNaN(chapter) && chapter > 0 && !isNaN(verse) && verse > 0) {
      const cleanReference = `${bookMeta.name} ${chapter}:${verse}${endVerse ? `-${endVerse}` : ''}`;
      if (!seen.has(cleanReference)) {
        seen.add(cleanReference);
        results.push({
          raw,
          book: bookMeta.name,
          bookId: bookMeta.id,
          chapter,
          verse,
          endVerse,
          cleanReference
        });
      }
    }
  }

  return results;
}

/**
 * Split a text block into plain text pieces and scripture reference tokens
 */
export interface TextSegment {
  type: 'text' | 'scripture';
  content: string;
  scripture?: DetectedScripture;
}

export function parseTextWithScriptures(text: string): TextSegment[] {
  if (!text) return [];

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  const matches = [...text.matchAll(SCRIPTURE_REGEX)];

  for (const match of matches) {
    const matchIndex = match.index ?? 0;
    const raw = match[0];
    const rawBook = match[1].toLowerCase().trim().replace(/\s+/g, ' ');
    const chapter = parseInt(match[2], 10);
    const verse = parseInt(match[3], 10);
    const endVerse = match[4] ? parseInt(match[4], 10) : undefined;

    const bookMeta = BIBLE_BOOKS_MAP[rawBook];

    if (bookMeta && !isNaN(chapter) && chapter > 0 && !isNaN(verse) && verse > 0) {
      // Add preceding plain text
      if (matchIndex > lastIndex) {
        segments.push({
          type: 'text',
          content: text.substring(lastIndex, matchIndex)
        });
      }

      const cleanReference = `${bookMeta.name} ${chapter}:${verse}${endVerse ? `-${endVerse}` : ''}`;
      segments.push({
        type: 'scripture',
        content: raw,
        scripture: {
          raw,
          book: bookMeta.name,
          bookId: bookMeta.id,
          chapter,
          verse,
          endVerse,
          cleanReference
        }
      });

      lastIndex = matchIndex + raw.length;
    }
  }

  // Add any trailing text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return segments;
}
