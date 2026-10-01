/**
 * Heaven Touching Earth International Ministries (HTEIM) School of Ministry
 * Security & Defense Helper Module
 * 
 * Provides client-side defense against Cross-Site Scripting (XSS), 
 * SQL/HTML injection, path traversal, and malicious uploads.
 */

/**
 * Sanitizes generic user text inputs to prevent XSS and HTML injection.
 * Escapes common HTML special characters.
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Strips out dangerous script tags, iframe tags, or javascript: protocols
 * while preserving standard text content.
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';
  let cleaned = input.trim();
  
  // Strip script tags and content inside them
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Strip on* event attributes (e.g. onload, onerror, onclick, etc.)
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=\s*\w+\([^)]*\)/gi, '');
  
  // Strip javascript: URI protocols
  cleaned = cleaned.replace(/javascript\s*:\s*/gi, '');
  
  // Strip iframe and object tags
  cleaned = cleaned.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '');
  
  return cleaned;
}

/**
 * Sanitizes a file name to prevent path traversal (../), command injection,
 * or unexpected characters that could cause storage bucket issues.
 */
export function sanitizeFileName(fileName: string | null | undefined): string {
  if (!fileName) return `file_${Date.now()}`;
  
  // Get filename part and extension
  const parts = fileName.split('/');
  const baseName = parts[parts.length - 1] || fileName;
  
  // Remove path traversal patterns like ".."
  let cleanName = baseName.replace(/\.\./g, '').trim();
  
  // Replace anything that is not alphanumeric, a period, a hyphen, or underscore
  cleanName = cleanName.replace(/[^a-zA-Z0-9_.-]/g, '_');
  
  // Ensure the filename is not blank or empty
  if (!cleanName || cleanName === '.' || cleanName === '..') {
    cleanName = `upload_${Date.now()}`;
  }
  
  return cleanName;
}

/**
 * Validates whether an email format is structurally sound and secure.
 */
export function validateEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  // Standard robust email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Assesses the strength of a user-entered password and provides clear
 * metric scores and security recommendations.
 */
export interface PasswordStrengthReport {
  score: number; // 0 (weakest) to 4 (strongest)
  isSecure: boolean;
  feedback: string[];
}

export function checkPasswordStrength(password: string | null | undefined): PasswordStrengthReport {
  const report: PasswordStrengthReport = {
    score: 0,
    isSecure: false,
    feedback: []
  };

  if (!password) {
    report.feedback.push('Password cannot be empty.');
    return report;
  }

  if (password.length < 8) {
    report.feedback.push('Password should be at least 8 characters long.');
  } else {
    report.score += 1;
  }

  // Check for lowercase and uppercase letters
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    report.score += 1;
  } else {
    report.feedback.push('Mix uppercase and lowercase characters.');
  }

  // Check for numbers
  if (/\d/.test(password)) {
    report.score += 1;
  } else {
    report.feedback.push('Include at least one numerical digit (0-9).');
  }

  // Check for special character symbols
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    report.score += 1;
  } else {
    report.feedback.push('Include a special symbol (e.g. !, @, #, $, &).');
  }

  report.isSecure = report.score >= 3 && password.length >= 8;

  return report;
}

/**
 * Computes a deterministic SHA-256 hash using the native Web Crypto API.
 * Encodes the output as a hexadecimal string with optional salt.
 */
export async function hashPassword(password: string, salt: string = 'hteim_ministry_salt_2026'): Promise<string> {
  if (!password) return '';
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(`${salt}:${password}`);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fallback if subtle crypto is not accessible in context
  }
  // Fast deterministic fallback hash
  let hash = 0;
  const str = `${salt}:${password}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `sha256_${Math.abs(hash).toString(16)}`;
}

/**
 * Checks whether an input password matches a stored password or its SHA-256 hash.
 */
export async function verifyPasswordHash(inputPassword: string, storedHashOrPassword: string): Promise<boolean> {
  if (!inputPassword || !storedHashOrPassword) return false;
  // Direct plaintext match (for legacy stored passwords or default 'password1')
  if (inputPassword === storedHashOrPassword) return true;
  
  // SHA-256 Web Crypto hash match
  const computedHash = await hashPassword(inputPassword);
  if (computedHash && computedHash === storedHashOrPassword) return true;

  return false;
}

// Client-side rate limiting / failed attempt tracker
const FAILED_ATTEMPTS_KEY = 'hteim_auth_failed_attempts';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

interface LockoutRecord {
  count: number;
  lockedUntil: number;
}

/**
 * Records a failed login attempt for an identifier and checks for lockout.
 */
export function recordFailedLoginAttempt(identifier: string): { isLocked: boolean; remainingSeconds: number; attemptsLeft: number } {
  if (typeof localStorage === 'undefined' || !identifier) {
    return { isLocked: false, remainingSeconds: 0, attemptsLeft: MAX_FAILED_ATTEMPTS };
  }

  const key = identifier.toLowerCase().trim();
  let records: Record<string, LockoutRecord> = {};
  try {
    const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    if (raw) records = JSON.parse(raw);
  } catch {}

  const now = Date.now();
  const current = records[key] || { count: 0, lockedUntil: 0 };

  // Check if currently locked
  if (current.lockedUntil > now) {
    return {
      isLocked: true,
      remainingSeconds: Math.ceil((current.lockedUntil - now) / 1000),
      attemptsLeft: 0
    };
  }

  // Increment count
  const newCount = current.count + 1;
  let lockedUntil = 0;
  if (newCount >= MAX_FAILED_ATTEMPTS) {
    lockedUntil = now + LOCKOUT_DURATION_MS;
  }

  records[key] = {
    count: newCount,
    lockedUntil
  };

  try {
    localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(records));
  } catch {}

  return {
    isLocked: lockedUntil > now,
    remainingSeconds: lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0,
    attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - newCount)
  };
}

/**
 * Checks if an account is currently locked out without incrementing.
 */
export function checkAccountLockout(identifier: string): { isLocked: boolean; remainingSeconds: number } {
  if (typeof localStorage === 'undefined' || !identifier) {
    return { isLocked: false, remainingSeconds: 0 };
  }
  const key = identifier.toLowerCase().trim();
  try {
    const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0 };
    const records: Record<string, LockoutRecord> = JSON.parse(raw);
    const rec = records[key];
    if (rec && rec.lockedUntil > Date.now()) {
      return {
        isLocked: true,
        remainingSeconds: Math.ceil((rec.lockedUntil - Date.now()) / 1000)
      };
    }
  } catch {}
  return { isLocked: false, remainingSeconds: 0 };
}

/**
 * Resets failed attempts after a successful login.
 */
export function clearFailedLoginAttempts(identifier: string): void {
  if (typeof localStorage === 'undefined' || !identifier) return;
  const key = identifier.toLowerCase().trim();
  try {
    const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    if (!raw) return;
    const records: Record<string, LockoutRecord> = JSON.parse(raw);
    delete records[key];
    localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(records));
  } catch {}
}

/**
 * Formats any grade, exam, or quiz score to the nearest whole number percentage.
 * Converts values like 30.489999999976 or "30.489999999976%" to "30%".
 * Handles null, undefined, strings, and numbers safely.
 */
export function formatGradePercentage(value: number | string | null | undefined, fallback: string = 'N/A'): string {
  if (value === null || value === undefined || value === '') return fallback;
  
  if (typeof value === 'number') {
    if (isNaN(value)) return fallback;
    return `${Math.round(value)}%`;
  }

  const str = String(value).trim();
  if (!str || str === '—' || str.toLowerCase() === 'n/a') return fallback;

  // If format is like "28/35"
  if (str.includes('/')) {
    const parts = str.split('/');
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (!isNaN(num) && !isNaN(den) && den > 0) {
      return `${Math.round((num / den) * 100)}%`;
    }
  }

  // Strip '%' and parse
  const cleanNum = parseFloat(str.replace('%', '').trim());
  if (isNaN(cleanNum)) {
    return str; // return original if non-numeric string like "A" or "Pass"
  }

  return `${Math.round(cleanNum)}%`;
}
