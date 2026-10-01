import mammoth from 'mammoth';

/**
 * Extracts clean plain text from an uploaded file (supporting DOCX, TXT, MD, JSON, CSV).
 */
export async function extractCleanTextFromFile(file: File): Promise<string> {
  const fileNameLower = (file.name || '').toLowerCase();
  const isDocx =
    fileNameLower.endsWith('.docx') ||
    fileNameLower.endsWith('.doc') ||
    file.type.includes('wordprocessingml') ||
    file.type.includes('msword');

  if (isDocx) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (result.value && result.value.trim().length > 0) {
        return result.value.trim();
      }
    } catch (err) {
      console.warn('Mammoth DOCX parsing notice:', err);
    }
  }

  // Plain text formats
  if (
    file.type.startsWith('text/') ||
    fileNameLower.endsWith('.txt') ||
    fileNameLower.endsWith('.md') ||
    fileNameLower.endsWith('.json') ||
    fileNameLower.endsWith('.csv')
  ) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  }

  return '';
}

/**
 * Reads a File into a base64 Data URL for persistent local storage & in-browser viewing.
 */
export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(new Error('Failed to read file into Data URL'));
    reader.readAsDataURL(file);
  });
}

/**
 * Formats bytes into human-readable size string.
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}
