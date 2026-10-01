import { Router } from "express";
import { Readable } from "stream";
import { requireAuth } from "../middleware/rbac";

export const driveProxyRouter = Router();

/**
 * Proxy to fetch public spreadsheet sheet/tab names and GIDs server-side,
 * completely bypassing browser CORS restrictions on /htmlview.
 */
driveProxyRouter.get("/spreadsheet/:spreadsheetId/sheets", async (req, res) => {
  const { spreadsheetId } = req.params;
  if (!spreadsheetId || !/^[a-zA-Z0-9_-]{15,80}$/.test(spreadsheetId)) {
    return res.status(400).json({ error: "Invalid Google Spreadsheet ID" });
  }

  try {
    const htmlUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlview`;
    const response = await fetch(htmlUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Google Sheets returned status ${response.status}` });
    }

    const html = await response.text();
    const sheets: Array<{ name: string; gid: string }> = [];

    // Match items.push({name: "...", pageUrl: "...", gid: "..."})
    const regexItems = /items\.push\(\s*\{\s*name:\s*"([^"\\]*(?:\\.[^"\\]*)*)"[^}]*?gid:\s*"([0-9]+)"/g;
    let match;
    while ((match = regexItems.exec(html)) !== null) {
      const rawName = match[1];
      const gid = match[2];
      try {
        const decoded = JSON.parse(`"${rawName}"`);
        sheets.push({ name: decoded.trim(), gid });
      } catch {
        sheets.push({ name: rawName.trim(), gid });
      }
    }

    // Fallback: match any "name": "...", "sheetId": ...
    if (sheets.length === 0) {
      const regexConfig = /"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*"sheetId"\s*:\s*([0-9]+)/g;
      while ((match = regexConfig.exec(html)) !== null) {
        sheets.push({ name: match[1].trim(), gid: match[2] });
      }
    }

    return res.json({ spreadsheetId, sheets });
  } catch (err: any) {
    console.error(`Error fetching spreadsheet sheets for ${spreadsheetId}:`, err);
    return res.status(500).json({ error: "Failed to extract spreadsheet sheets", details: err?.message });
  }
});

/**
 * Proxy to fetch GViz JSON data for a specific sheet or GID server-side.
 */
driveProxyRouter.get("/spreadsheet/:spreadsheetId/data", async (req, res) => {
  const { spreadsheetId } = req.params;
  const gid = req.query.gid as string | undefined;
  const sheet = req.query.sheet as string | undefined;

  if (!spreadsheetId || !/^[a-zA-Z0-9_-]{15,80}$/.test(spreadsheetId)) {
    return res.status(400).json({ error: "Invalid Google Spreadsheet ID" });
  }

  let param = "";
  if (gid) {
    param = `&gid=${encodeURIComponent(gid)}`;
  } else if (sheet) {
    param = `&sheet=${encodeURIComponent(sheet)}`;
  }

  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json${param}`;
    const response = await fetch(gvizUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: `GViz returned status ${response.status}` });
    }

    const gvizText = await response.text();
    const startIdx = gvizText.indexOf("{");
    const endIdx = gvizText.lastIndexOf("}");
    if (startIdx === -1 || endIdx === -1) {
      return res.status(502).json({ error: "Malformed GViz response" });
    }

    const jsonStr = gvizText.substring(startIdx, endIdx + 1);
    const data = JSON.parse(jsonStr);
    return res.json(data);
  } catch (err: any) {
    console.error(`Error fetching spreadsheet data for ${spreadsheetId}:`, err);
    return res.status(500).json({ error: "Failed to fetch spreadsheet data", details: err?.message });
  }
});

driveProxyRouter.get("/stream/:fileId", requireAuth, async (req, res) => {
  const { fileId } = req.params;
  if (!fileId || !/^[a-zA-Z0-9_-]{15,80}$/.test(fileId)) {
    return res.status(400).json({ error: "Invalid Google Drive File ID" });
  }

  // Google Drive usercontent download endpoints
  const candidateUrls = [
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
    `https://docs.google.com/uc?export=download&id=${fileId}&confirm=t`,
  ];

  const clientHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "*/*",
  };

  if (req.headers.range) {
    clientHeaders["Range"] = req.headers.range as string;
  }

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        headers: clientHeaders,
        redirect: "follow",
      });

      const contentType = response.headers.get("content-type") || "";

      // If Google Drive returns HTML (e.g. warning or login or confirmation page)
      if (contentType.includes("text/html")) {
        const htmlText = await response.text();
        const confirmMatch = htmlText.match(/confirm=([a-zA-Z0-9_-]+)/);
        if (confirmMatch && confirmMatch[1]) {
          const confirmUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirmMatch[1]}`;
          const retryRes = await fetch(confirmUrl, {
            headers: clientHeaders,
            redirect: "follow",
          });
          const retryType = retryRes.headers.get("content-type") || "";
          if (retryRes.ok && !retryType.includes("text/html") && retryRes.body) {
            return streamResponse(retryRes, res);
          }
        }
        continue; // Try next candidate URL
      }

      if (response.ok && response.body) {
        return streamResponse(response, res);
      }
    } catch (err) {
      console.error(`Error fetching drive stream from ${url}:`, err);
    }
  }

  // Fallback redirect to Google Drive preview or view
  return res.redirect(`https://drive.google.com/file/d/${fileId}/preview`);
});

function streamResponse(upstreamRes: Response, res: any) {
  const status = upstreamRes.status === 206 ? 206 : 200;
  res.status(status);

  const contentType = upstreamRes.headers.get("content-type") || "video/mp4";
  res.setHeader("Content-Type", contentType);

  if (upstreamRes.headers.get("content-length")) {
    res.setHeader("Content-Length", upstreamRes.headers.get("content-length")!);
  }
  if (upstreamRes.headers.get("content-range")) {
    res.setHeader("Content-Range", upstreamRes.headers.get("content-range")!);
  }
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=3600");

  if (upstreamRes.body) {
    const nodeStream = Readable.fromWeb(upstreamRes.body as any);
    nodeStream.pipe(res);
  } else {
    res.end();
  }
}
