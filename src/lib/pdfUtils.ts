import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using unpkg CDN matching the installed version
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker setup note:', e);
  }
}

export interface PdfDocumentInfo {
  numPages: number;
  extractedText: string;
  pageTexts: string[];
}

/**
 * Converts a Base64 Data URL to Uint8Array bytes
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const base64Str = parts[1];
    const binaryStr = atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    console.warn('Failed to decode dataUrl to Uint8Array:', err);
    return null;
  }
}

/**
 * Loads a PDF and extracts text from all pages
 */
export async function extractTextFromPdfData(data: Uint8Array | ArrayBuffer): Promise<PdfDocumentInfo> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: data as any,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (item && typeof item.str === 'string' ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      pageTexts.push(pageText);
    }

    const extractedText = pageTexts.join('\n\n');
    return {
      numPages,
      extractedText,
      pageTexts,
    };
  } catch (err) {
    console.warn('PDF text extraction error:', err);
    return {
      numPages: 0,
      extractedText: '',
      pageTexts: [],
    };
  }
}

/**
 * Renders a specific PDF page onto an HTML5 Canvas element
 */
export async function renderPdfPageToCanvas(
  pdfData: Uint8Array | ArrayBuffer,
  pageNum: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<{ width: number; height: number } | null> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData as any,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    if (pageNum < 1 || pageNum > pdfDoc.numPages) return null;

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext: any = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };

    await page.render(renderContext).promise;
    return {
      width: viewport.width,
      height: viewport.height,
    };
  } catch (err) {
    console.warn(`Error rendering PDF page ${pageNum}:`, err);
    return null;
  }
}

export { exportElementToPDF } from './pdfExporter';
