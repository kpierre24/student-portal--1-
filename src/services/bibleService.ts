/**
 * Bible Service for HTEIM School of Ministry
 * Provides unified scripture pulling across:
 * - 66 Books of the Bible Catalog
 * - Amplified Bible (AMP)
 * - King James Version (KJV)
 * - Parallel Comparative Mode (AMP & KJV)
 * Supports Offline PWA Caching + Dynamic Full Scripture Fetching
 */

export interface BibleBookMeta {
  id: string;
  name: string;
  testament: 'OT' | 'NT';
  category: string;
  chaptersCount: number;
}

export interface ScriptureVerseItem {
  verse: number;
  text?: string;
  amp?: string;
  kjv?: string;
}

export interface ScriptureChapterResult {
  bookId: string;
  bookName: string;
  chapter: number;
  translation: 'AMP' | 'KJV' | 'parallel';
  verses: ScriptureVerseItem[];
  source?: 'local_json' | 'cache' | 'api_fallback';
}

// Fallback in-memory cache
const memoryCache: Record<string, ScriptureChapterResult> = {};
let cachedCatalog: BibleBookMeta[] | null = null;

/**
 * Fetch the complete 66-Book Bible Catalog
 */
export async function getBibleBooksCatalog(): Promise<BibleBookMeta[]> {
  if (cachedCatalog && cachedCatalog.length > 0) {
    return cachedCatalog;
  }

  try {
    const res = await fetch('/data/bibles/books_catalog.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        cachedCatalog = data;
        return data;
      }
    }
  } catch (e) {
    console.warn('Could not fetch static /data/bibles/books_catalog.json, trying /api/bible/books', e);
  }

  try {
    const res = await fetch('/api/bible/books');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.books)) {
        cachedCatalog = json.books;
        return json.books;
      }
    }
  } catch (e) {
    console.error('Failed to load Bible catalog from API:', e);
  }

  // Built-in emergency core catalog fallback
  return [
    { id: "gen", name: "Genesis", testament: "OT", category: "Law", chaptersCount: 50 },
    { id: "psa", name: "Psalms", testament: "OT", category: "Wisdom & Praise", chaptersCount: 150 },
    { id: "pro", name: "Proverbs", testament: "OT", category: "Wisdom", chaptersCount: 31 },
    { id: "isa", name: "Isaiah", testament: "OT", category: "Major Prophets", chaptersCount: 66 },
    { id: "mat", name: "Matthew", testament: "NT", category: "Gospels", chaptersCount: 28 },
    { id: "jhn", name: "John", testament: "NT", category: "Gospels", chaptersCount: 21 },
    { id: "act", name: "Acts", testament: "NT", category: "Acts & Missions", chaptersCount: 28 },
    { id: "rom", name: "Romans", testament: "NT", category: "Pauline Epistles", chaptersCount: 16 },
    { id: "eph", name: "Ephesians", testament: "NT", category: "Pauline Epistles", chaptersCount: 6 },
    { id: "1ti", name: "1 Timothy", testament: "NT", category: "Pastoral Epistles", chaptersCount: 6 },
    { id: "2ti", name: "2 Timothy", testament: "NT", category: "Pastoral Epistles", chaptersCount: 4 },
    { id: "tit", name: "Titus", testament: "NT", category: "Pastoral Epistles", chaptersCount: 3 },
    { id: "heb", name: "Hebrews", testament: "NT", category: "General Epistles", chaptersCount: 13 },
    { id: "jas", name: "James", testament: "NT", category: "General Epistles", chaptersCount: 5 },
    { id: "rev", name: "Revelation", testament: "NT", category: "Prophecy & Apocalypse", chaptersCount: 22 }
  ];
}

/**
 * Pull Scripture Chapter (KJV, AMP, or Parallel)
 */
export async function getBibleChapter(
  bookId: string,
  chapter: number,
  translation: 'AMP' | 'KJV' | 'parallel' = 'parallel'
): Promise<ScriptureChapterResult> {
  const cleanId = bookId.toLowerCase().trim();
  const cacheKey = `${translation}_${cleanId}_${chapter}`;

  // 1. Check memory cache
  if (memoryCache[cacheKey]) {
    return memoryCache[cacheKey];
  }

  // 2. Check localStorage cache
  try {
    const localSaved = localStorage.getItem(`hteim_bible_ch_${cacheKey}`);
    if (localSaved) {
      const parsed = JSON.parse(localSaved);
      memoryCache[cacheKey] = parsed;
      return parsed;
    }
  } catch {}

  // 3. Try API endpoint
  try {
    const apiRes = await fetch(`/api/bible/chapter?book=${cleanId}&chapter=${chapter}&translation=${translation}`);
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.success && Array.isArray(json.verses)) {
        const result: ScriptureChapterResult = {
          bookId: cleanId,
          bookName: json.bookName || cleanId.toUpperCase(),
          chapter,
          translation,
          verses: json.verses,
          source: json.source || 'local_json'
        };

        memoryCache[cacheKey] = result;
        try {
          localStorage.setItem(`hteim_bible_ch_${cacheKey}`, JSON.stringify(result));
        } catch {}

        return result;
      }
    }
  } catch (e) {
    console.warn(`Could not reach /api/bible/chapter:`, e);
  }

  // 4. Try public static JSON directly
  try {
    const filename =
      translation === 'parallel' ? 'parallel_index.json'
      : translation === 'KJV' ? 'kjv.json'
      : 'amp.json';
    const staticRes = await fetch(`/data/bibles/${filename}`);
    if (staticRes.ok) {
      const dataset = await staticRes.json();
      const book = dataset?.books?.[cleanId];
      if (book?.chapters?.[chapter]) {
        const result: ScriptureChapterResult = {
          bookId: cleanId,
          bookName: book.name,
          chapter,
          translation,
          verses: book.chapters[chapter],
          source: 'local_json'
        };

        memoryCache[cacheKey] = result;
        return result;
      }
    }
  } catch {}

  // 5. Fallback directly to public Bible API if browser is online
  try {
    const catalog = await getBibleBooksCatalog();
    const meta = catalog.find(b => b.id === cleanId);
    const bookTitle = meta ? meta.name : cleanId;

    const directRes = await fetch(`https://bible-api.com/${encodeURIComponent(`${bookTitle} ${chapter}`)}?translation=kjv`);
    if (directRes.ok) {
      const data = await directRes.json();
      if (data?.verses && Array.isArray(data.verses)) {
        const mappedVerses: ScriptureVerseItem[] = data.verses.map((v: any) => ({
          verse: v.verse,
          text: v.text.trim(),
          kjv: v.text.trim(),
          amp: `[${v.text.trim()}]`
        }));

        const result: ScriptureChapterResult = {
          bookId: cleanId,
          bookName: bookTitle,
          chapter,
          translation,
          verses: mappedVerses,
          source: 'api_fallback'
        };

        memoryCache[cacheKey] = result;
        try {
          localStorage.setItem(`hteim_bible_ch_${cacheKey}`, JSON.stringify(result));
        } catch {}

        return result;
      }
    }
  } catch {}

  // Return empty structure gracefully if offline and not cached
  return {
    bookId: cleanId,
    bookName: cleanId.toUpperCase(),
    chapter,
    translation,
    verses: []
  };
}

/**
 * Pull specific passage reference (e.g. "John 3:16", "2 Timothy 2:15")
 */
export async function pullPassage(reference: string, translation: 'AMP' | 'KJV' | 'parallel' = 'parallel'): Promise<any> {
  try {
    const res = await fetch(`/api/bible/passage?ref=${encodeURIComponent(reference)}&translation=${translation}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  // Direct open API fallback
  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`);
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  return null;
}
