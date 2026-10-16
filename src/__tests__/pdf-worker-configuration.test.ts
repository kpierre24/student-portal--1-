import { describe, it, expect } from 'vitest';
import * as pdfjsLib from 'pdfjs-dist';
import { dataUrlToUint8Array, extractTextFromPdfData } from '../lib/pdfUtils';

describe('PDF.js Worker & Local Configuration', () => {
  it('does not reference external unpkg CDN for workerSrc to prevent CSP and dynamic import errors', () => {
    const workerSrc = pdfjsLib.GlobalWorkerOptions.workerSrc;
    expect(workerSrc).toBeDefined();
    expect(workerSrc).not.toContain('unpkg.com');
    expect(workerSrc).not.toContain('cdnjs.cloudflare.com');
    expect(workerSrc).toMatch(/\/pdf\.worker\.min\.mjs$/);
  });

  it('correctly converts base64 data URLs to Uint8Array', () => {
    const testString = 'Hello PDF';
    const base64 = btoa(testString);
    const dataUrl = `data:application/pdf;base64,${base64}`;

    const uint8 = dataUrlToUint8Array(dataUrl);
    expect(uint8).not.toBeNull();
    expect(uint8?.length).toBe(testString.length);

    // Invalid data URL returns null
    expect(dataUrlToUint8Array('invalid-string')).toBeNull();
  });

  it('handles invalid PDF data safely without throwing unhandled exceptions', async () => {
    const emptyBytes = new Uint8Array([0, 1, 2, 3]);
    const res = await extractTextFromPdfData(emptyBytes);

    expect(res).toBeDefined();
    expect(res.numPages).toBe(0);
    expect(res.extractedText).toBe('');
    expect(res.pageTexts).toEqual([]);
  });
});
