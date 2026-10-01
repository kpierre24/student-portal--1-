import { Router } from "express";
import fs from "fs";
import path from "path";

export const bibleRouter = Router();

const biblesDir = path.join(process.cwd(), "public", "data", "bibles");

// Read helper
function loadJsonFile<T>(filename: string): T | null {
  try {
    const filePath = path.join(biblesDir, filename);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as T;
    }
  } catch (e) {
    console.error(`Error loading Bible JSON file ${filename}:`, e);
  }
  return null;
}

// 1. Get 66 Books Catalog
bibleRouter.get("/books", (_req, res) => {
  const catalog = loadJsonFile<any[]>("books_catalog.json");
  if (catalog) {
    return res.json({ success: true, count: catalog.length, books: catalog });
  }
  return res.status(500).json({ success: false, error: "Failed to load Bible books catalog." });
});

// 2. Get Chapter — tries local JSON first, then bible-api.com fallback
bibleRouter.get("/chapter", async (req, res) => {
  const bookId = String(req.query.book || "2ti").toLowerCase().trim();
  const chapter = String(req.query.chapter || "1").trim();
  const translation = String(req.query.translation || "parallel").toLowerCase().trim();

  try {
    // Determine which local file to check
    if (translation === "parallel") {
      const parallelData = loadJsonFile<any>("parallel_index.json");
      const book = parallelData?.books?.[bookId];
      if (book?.chapters?.[chapter]) {
        return res.json({
          success: true,
          bookId,
          bookName: book.name,
          chapter: parseInt(chapter, 10),
          translation: "parallel",
          verses: book.chapters[chapter],
          source: "local_json"
        });
      }
    } else if (translation === "kjv") {
      const kjvData = loadJsonFile<any>("kjv.json");
      const book = kjvData?.books?.[bookId];
      if (book?.chapters?.[chapter]) {
        return res.json({
          success: true,
          bookId,
          bookName: book.name,
          chapter: parseInt(chapter, 10),
          translation: "kjv",
          verses: book.chapters[chapter],
          source: "local_json"
        });
      }
    } else if (translation === "amp") {
      const ampData = loadJsonFile<any>("amp.json");
      const book = ampData?.books?.[bookId];
      if (book?.chapters?.[chapter]) {
        return res.json({
          success: true,
          bookId,
          bookName: book.name,
          chapter: parseInt(chapter, 10),
          translation: "amp",
          verses: book.chapters[chapter],
          source: "local_json"
        });
      }
    }

    // Check parallel JSON for whichever translation was requested — extract single translation
    const parallelData = loadJsonFile<any>("parallel_index.json");
    const parallelBook = parallelData?.books?.[bookId];
    if (parallelBook?.chapters?.[chapter]) {
      const rawVerses = parallelBook.chapters[chapter];
      let verses: any[];
      if (translation === "kjv") {
        verses = rawVerses.map((v: any) => ({ verse: v.verse, text: v.kjv || v.text }));
      } else if (translation === "amp") {
        verses = rawVerses.map((v: any) => ({ verse: v.verse, text: v.amp || v.text }));
      } else {
        verses = rawVerses;
      }
      return res.json({
        success: true,
        bookId,
        bookName: parallelBook.name,
        chapter: parseInt(chapter, 10),
        translation,
        verses,
        source: "local_json"
      });
    }

    // If chapter not found in local preloaded dataset, fetch dynamically from open Bible API
    const catalog = loadJsonFile<any[]>("books_catalog.json") || [];
    const bookMeta = catalog.find(b => b.id.toLowerCase() === bookId || b.name.toLowerCase() === bookId);
    const searchBookName = bookMeta ? bookMeta.name : bookId;

    // bible-api.com supports: kjv, web, oeb-us, clementine, almeida, rccv
    // For AMP we still use KJV as the fallback (only public-domain option)
    const apiTranslation = translation === "kjv" ? "kjv" : "kjv"; // Both fallback to KJV from public API
    const response = await fetch(
      `https://bible-api.com/${encodeURIComponent(`${searchBookName} ${chapter}`)}?translation=${apiTranslation}`
    );
    if (response.ok) {
      const apiResult = await response.json();
      if (apiResult?.verses && Array.isArray(apiResult.verses)) {
        let mappedVerses: any[];

        if (translation === "parallel") {
          mappedVerses = apiResult.verses.map((v: any) => ({
            verse: v.verse,
            kjv: v.text.trim(),
            amp: v.text.trim(),   // KJV used as stand-in for AMP when fetching dynamically
            text: v.text.trim()
          }));
        } else if (translation === "amp") {
          // AMP dynamic fallback returns KJV with an indicator
          mappedVerses = apiResult.verses.map((v: any) => ({
            verse: v.verse,
            text: v.text.trim()
          }));
        } else {
          mappedVerses = apiResult.verses.map((v: any) => ({
            verse: v.verse,
            text: v.text.trim()
          }));
        }

        return res.json({
          success: true,
          bookId,
          bookName: searchBookName,
          chapter: parseInt(chapter, 10),
          translation,
          verses: mappedVerses,
          source: "dynamic_fallback",
          note: translation === "amp" ? "AMP not available online — showing KJV for this chapter." : undefined
        });
      }
    }

    return res.status(404).json({
      success: false,
      error: `Scripture chapter ${searchBookName} ${chapter} could not be retrieved.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Passage / Reference Lookup (e.g. ?ref=John+3:16)
bibleRouter.get("/passage", async (req, res) => {
  const reference = String(req.query.ref || "2 Timothy 2:15").trim();
  const translation = String(req.query.translation || "kjv").toLowerCase().trim();

  try {
    // First check local parallel_index.json for an exact verse match
    // This supports references like "2 Timothy 2:15" or "John 3:16"
    const parallelData = loadJsonFile<any>("parallel_index.json");

    // Attempt to look up from local data by parsing reference
    const refMatch = reference.match(/^(.+?)\s+(\d+):(\d+)$/i);
    if (refMatch && parallelData?.books) {
      const [, bookNamePart, chapterStr, verseStr] = refMatch;
      const targetBookName = bookNamePart.trim().toLowerCase();
      const targetChapter = chapterStr;
      const targetVerse = parseInt(verseStr, 10);

      // Find by name in catalog
      const catalog = loadJsonFile<any[]>("books_catalog.json") || [];
      const matchedBook = catalog.find(
        b =>
          b.name.toLowerCase() === targetBookName ||
          b.id.toLowerCase() === targetBookName ||
          b.name.toLowerCase().startsWith(targetBookName) ||
          targetBookName.startsWith(b.id.toLowerCase())
      );

      if (matchedBook) {
        const localBook = parallelData.books[matchedBook.id];
        if (localBook?.chapters?.[targetChapter]) {
          const verses = localBook.chapters[targetChapter] as any[];
          const matchedVerse = verses.find(v => v.verse === targetVerse);
          if (matchedVerse) {
            const responseVerse = translation === "kjv"
              ? { verse: matchedVerse.verse, text: matchedVerse.kjv || matchedVerse.text, book_name: matchedBook.name, chapter: parseInt(targetChapter, 10) }
              : translation === "amp"
              ? { verse: matchedVerse.verse, text: matchedVerse.amp || matchedVerse.text, book_name: matchedBook.name, chapter: parseInt(targetChapter, 10) }
              : { verse: matchedVerse.verse, amp: matchedVerse.amp, kjv: matchedVerse.kjv, text: matchedVerse.kjv || matchedVerse.text, book_name: matchedBook.name, chapter: parseInt(targetChapter, 10) };

            return res.json({
              success: true,
              reference: `${matchedBook.name} ${targetChapter}:${targetVerse}`,
              translation,
              verses: [responseVerse],
              text: responseVerse.text,
              source: "local_json"
            });
          }
        }
      }
    }

    // If not found locally, forward to bible-api.com
    const apiTranslation = "kjv"; // Only public domain translation available
    const response = await fetch(
      `https://bible-api.com/${encodeURIComponent(reference)}?translation=${apiTranslation}`
    );
    if (response.ok) {
      const apiResult = await response.json();
      if (apiResult?.verses) {
        const mappedVerses = apiResult.verses.map((v: any) => ({
          verse: v.verse,
          chapter: v.chapter,
          book_name: v.book_name,
          text: v.text.trim(),
          kjv: v.text.trim(),
          amp: v.text.trim()  // Stand-in, AMP not available via free API
        }));

        return res.json({
          success: true,
          reference: apiResult.reference,
          translation,
          verses: mappedVerses,
          text: apiResult.text,
          source: "api_fallback"
        });
      }
    }

    return res.status(404).json({ success: false, error: `Passage "${reference}" not found.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Search endpoint — word/phrase based lookup across preloaded local data
bibleRouter.get("/search", async (req, res) => {
  const query = String(req.query.q || "").trim().toLowerCase();
  const translation = String(req.query.translation || "parallel").toLowerCase().trim();
  const limit = Math.min(parseInt(String(req.query.limit || "20"), 10), 50);

  if (!query || query.length < 2) {
    return res.status(400).json({ success: false, error: "Query must be at least 2 characters." });
  }

  try {
    const filename =
      translation === "kjv" ? "kjv.json"
      : translation === "amp" ? "amp.json"
      : "parallel_index.json";

    const dataset = loadJsonFile<any>(filename);
    if (!dataset?.books) {
      return res.status(500).json({ success: false, error: "Bible dataset not loaded." });
    }

    const results: any[] = [];

    for (const [bookId, bookData] of Object.entries(dataset.books as Record<string, any>)) {
      if (results.length >= limit) break;
      const bookName = bookData.name || bookId;

      for (const [chapterNum, verses] of Object.entries(bookData.chapters as Record<string, any[]>)) {
        if (results.length >= limit) break;

        for (const v of verses) {
          if (results.length >= limit) break;

          const textToSearch = [v.text, v.amp, v.kjv]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          if (textToSearch.includes(query)) {
            results.push({
              reference: `${bookName} ${chapterNum}:${v.verse}`,
              bookId,
              chapter: parseInt(chapterNum, 10),
              verse: v.verse,
              text: v.text || v.kjv || "",
              amp: v.amp,
              kjv: v.kjv
            });
          }
        }
      }
    }

    return res.json({ success: true, query, count: results.length, results });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
