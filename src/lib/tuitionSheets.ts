/**
 * ============================================================================
 * HTEIM SCHOOL OF MINISTRY — TUITION & FEES GOOGLE SHEETS CONNECTOR & PARSER
 * ============================================================================
 * Provides robust fetching, auto-detection, parsing, and reconciliation of
 * student tuition, fee schedules, payments, and balances from Google Spreadsheets.
 */

import Papa from 'papaparse';
import { PaymentRecord, Invoice, PaymentTransaction } from '../types';
import { 
  normalizeStudentName, 
  getCanonicalNamesMap, 
  isExcludedStudent, 
  MANUAL_ALIASES 
} from './studentNames';
import { MASTER_ENROLLED_STUDENTS } from '../data/curriculum';
import { extractSpreadsheetId, fetchSpreadsheetMetadata, fetchMultipleRanges } from './sheets';
import { logger } from './logger';
import { getInvoices, saveInvoices, getTransactions, saveTransactions, getReceipts, saveReceipts, bootstrapFromPaymentRecords } from './financialWorkflow';

export interface ParsedTuitionResult {
  sheetTitle: string;
  spreadsheetId: string;
  records: PaymentRecord[];
  totalStudents: number;
  totalTuitionBilled: number;
  totalAmountCollected: number;
  totalOutstandingBalance: number;
  collectionRatePercent: number;
  detectedTabs: string[];
  lastSyncedAt: string;
}

/**
 * Extracts Google Sheets GID parameter from URL if present
 */
export function extractGid(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&#]gid=([0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Formats heterogeneous date strings into standard YYYY-MM-DD
 * e.g. "8th June 2026", "20/05/2026", "April 13th 2026", "24.06.2026"
 */
export function formatSheetPaymentDate(rawDate?: string): string {
  if (!rawDate) return '';
  const str = rawDate.trim();
  if (!str) return '';

  // Already standard ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD.MM.YYYY
  const slashDotMatch = str.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{2,4})$/);
  if (slashDotMatch) {
    const day = slashDotMatch[1].padStart(2, '0');
    const month = slashDotMatch[2].padStart(2, '0');
    let year = slashDotMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Month Name formats: "8th June 2026", "April 13th 2026", "8th april 2026", "September 12th 2026"
  const cleanOrdinals = str.replace(/(\d+)(st|nd|rd|th)/gi, '$1');
  const parsedTimestamp = Date.parse(cleanOrdinals);
  if (!isNaN(parsedTimestamp)) {
    const d = new Date(parsedTimestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return str;
}

/**
 * Parses numeric currency values from various string formats
 * e.g. "$1,500.00", "TT$ 1,200", "1500", "USD 750", "-100", "(50)"
 */
export function parseCurrencyAmount(val: any, defaultVal = 0): number {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  
  const str = String(val).trim();
  if (!str) return defaultVal;
  if (str === '-' || str === '--' || str === '—' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'nil' || str.toLowerCase() === 'none') {
    return 0;
  }

  // Handle accounting negative format: (100) -> -100
  const isParenNegative = /^\(.*\)$/.test(str);

  // Strip currency symbols, letters, spaces, commas except digits and decimals
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) return defaultVal;
  return isParenNegative ? -Math.abs(parsed) : parsed;
}

/**
 * Checks if a tab title or its headers represent Tuition & Fees data
 */
export function isTuitionSheetTab(tabName: string, headers?: string[]): boolean {
  const nameLower = (tabName || '').toLowerCase().trim();

  // 1. Direct tab name pattern matching
  const TUITION_TAB_PATTERNS = [
    /tuition/i,
    /fee/i,
    /payment/i,
    /financ/i,
    /ledger/i,
    /bursar/i,
    /statement/i,
    /account/i,
    /billing/i,
    /installment/i,
    /scholarship/i,
  ];

  if (TUITION_TAB_PATTERNS.some(pat => pat.test(nameLower))) {
    return true;
  }

  // 2. Header analysis if headers are provided
  if (headers && headers.length > 0) {
    const headerStr = headers.map(h => (h || '').toString().toLowerCase()).join(' ');
    const hasStudentName = /name|student|candidate|member/i.test(headerStr);
    const hasFinancials = /tuition|fee|paid|amount|balance|due|payment|cost|price|receipt/i.test(headerStr);

    if (hasStudentName && hasFinancials) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes payment method string to valid application enum
 */
export function normalizePaymentMethod(methodStr?: string): PaymentRecord['paymentMethod'] {
  if (!methodStr) return 'Bank Transfer';
  const lower = methodStr.toLowerCase().trim();

  if (lower.includes('card') || lower.includes('visa') || lower.includes('mastercard') || lower.includes('debit')) {
    return 'Credit Card';
  }
  if (lower.includes('zelle')) return 'Zelle';
  if (lower.includes('paypal')) return 'PayPal';
  if (lower.includes('stripe')) return 'Stripe';
  if (lower.includes('cash')) return 'Cash';
  if (lower.includes('check') || lower.includes('cheque')) return 'Check';
  if (lower.includes('scholarship') || lower.includes('grant') || lower.includes('sponsor')) return 'Scholarship';
  
  return 'Bank Transfer';
}

/**
 * Normalizes payment standing status
 */
export function normalizePaymentStatus(
  statusStr: string | undefined, 
  amountPaid: number, 
  totalTuition: number
): PaymentRecord['status'] {
  if (statusStr) {
    const lower = statusStr.toLowerCase().trim();
    if (lower.includes('full') || lower.includes('paid in full') || lower === 'paid' || lower.includes('cleared') || lower.includes('complete')) {
      return 'Paid In Full';
    }
    if (lower.includes('partial') || lower.includes('installment') || lower.includes('deposit') || lower.includes('in progress')) {
      return 'Partial';
    }
    if (lower.includes('past due') || lower.includes('overdue') || lower.includes('late') || lower.includes('default')) {
      return 'Past Due';
    }
    if (lower.includes('pending') || lower.includes('review') || lower.includes('unpaid') || lower.includes('awaiting')) {
      return 'Pending Review';
    }
  }

  // Calculate based on numbers if not explicit
  if (totalTuition > 0 && amountPaid >= totalTuition) {
    return 'Paid In Full';
  }
  if (amountPaid > 0) {
    return 'Partial';
  }
  return 'Pending Review';
}

/**
 * Parses 2D tabular data from a Google Sheet tab into clean PaymentRecord items
 */
export function parseTuitionSheetRows(
  sheetTitle: string, 
  headers: string[], 
  rows: string[][],
  existingRecords: PaymentRecord[] = []
): PaymentRecord[] {
  if (!rows || rows.length === 0) return [];

  const cleanHeader = (h: any): string => 
    (h || '')
      .toString()
      .replace(/[\u00A0\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const normalizedHeaders = headers.map(cleanHeader);

  // 1. Column index detectors with robust fuzzy variations
  let idIndex = normalizedHeaders.findIndex(h => 
    h === 'nos.' ||
    h === 'nos' ||
    h === 'no.' ||
    h === 'no' ||
    h === '#' ||
    h === 'student id' || 
    h === 'id' || 
    h === 'id#' || 
    h === 'id number' || 
    h === 'reg no' || 
    h === 'registration #' ||
    h === 'matric no' ||
    h.includes('student id')
  );

  let nameIndex = normalizedHeaders.findIndex(h => 
    h === 'name' || 
    h === 'student name' || 
    h === 'full name' || 
    h.includes('first and last name') ||
    h === 'student' || 
    h.endsWith(' name')
  );
  if (nameIndex === -1) {
    nameIndex = normalizedHeaders.findIndex(h => h.includes('name') && !h.includes('bank') && !h.includes('file') && !h.includes('certificate'));
  }
  if (nameIndex === -1) nameIndex = 1;

  let emailIndex = normalizedHeaders.findIndex(h => 
    h === 'email' || 
    h === 'email address' || 
    h === 'contact email' || 
    h.includes('email')
  );

  let phoneIndex = normalizedHeaders.findIndex(h => 
    h === 'phone' || 
    h === 'phone number' || 
    h === 'contact' || 
    h === 'mobile' || 
    h.includes('phone')
  );

  let trackIndex = normalizedHeaders.findIndex(h => 
    h === 'ministry track' || 
    h === 'track' || 
    h === 'module track' || 
    h === 'module' || 
    h === 'program' || 
    h === 'course' || 
    h.includes('track') || 
    h.includes('program')
  );

  let totalTuitionIndex = normalizedHeaders.findIndex(h => 
    (h === 'total tuition' || 
    h === 'tuition fee' || 
    h === 'tuition fees' || 
    h === 'tuition' || 
    h === 'total fee' || 
    h === 'fee amount' || 
    h === 'gross tuition' || 
    h === 'target tuition' || 
    h === 'total billed' || 
    h === 'tuition cost' || 
    h === 'cost' || 
    h.includes('tuition fee') ||
    h.includes('total tuition')) &&
    !h.includes('owed') && !h.includes('owing') && !h.includes('balance') && !h.includes('paid') && !h.includes('due')
  );

  let amountPaidIndex = normalizedHeaders.findIndex(h => 
    (h === 'total paid' || 
    h === 'amount paid' || 
    h === 'paid' || 
    h === 'paid amount' || 
    h === 'payment received' || 
    h === 'amount received' || 
    h === 'total received' || 
    h === 'deposit' || 
    h === 'collected' || 
    h === 'received' || 
    h === 'payment' || 
    h === 'payments' || 
    h === 'paid to date' || 
    h === 'amt paid' || 
    h === 'amt. paid' || 
    h === 'tuition paid' || 
    h.includes('amount paid') ||
    h.includes('total paid')) &&
    !h.includes('owed') && !h.includes('owing') && !h.includes('balance') && !h.includes('unpaid') && !h.includes('due')
  );

  let balanceIndex = normalizedHeaders.findIndex(h => 
    h === 'balance owed' ||
    h === 'balance owing' ||
    h === 'balance due' || 
    h === 'balance' || 
    h === 'bal owed' ||
    h === 'bal owing' ||
    h === 'amount owed' ||
    h === 'amount owing' ||
    h === 'total owed' ||
    h === 'total owing' ||
    h === 'tuition owed' ||
    h.includes('balance owed') ||
    h.includes('balance owing')
  );
  if (balanceIndex === -1) {
    balanceIndex = normalizedHeaders.findIndex(h => 
      h === 'amount due' ||
      h === 'total due' ||
      h === 'total payment due' ||
      h === 'still owed' ||
      h === 'bal due' ||
      h === 'bal.' ||
      h === 'bal' ||
      h === 'owed' ||
      h === 'owing' ||
      h === 'outstanding' || 
      h === 'remaining' || 
      h === 'net balance' || 
      h === 'fees owed' ||
      h.includes('balance') ||
      h.includes('owed') ||
      h.includes('owing') ||
      h.includes('outstanding') ||
      (h.includes('due') && !h.includes('due date')) ||
      h.includes('remaining')
    );
  }

  let paymentStandingIndex = normalizedHeaders.findIndex(h => 
    h === 'paid in full' || 
    h === 'paid in full?' || 
    h === 'payment status' || 
    h === 'payment standing' || 
    h === 'standing' || 
    h.includes('paid in full')
  );

  let statusIndex = normalizedHeaders.findIndex(h => 
    h === 'status' || 
    h === 'enrollment status' || 
    h === 'state' || 
    h.includes('status')
  );

  let dateIndex = normalizedHeaders.findIndex(h => 
    h === 'last payment date' || 
    h === 'payment date' || 
    h === 'date paid' || 
    h === 'transaction date' || 
    h === 'date' || 
    h === 'timestamp' || 
    h.includes('date')
  );

  let methodIndex = normalizedHeaders.findIndex(h => 
    h === 'payment method' || 
    h === 'method' || 
    h === 'payment mode' || 
    h === 'channel' || 
    h === 'type' || 
    h.includes('method')
  );

  let notesIndex = normalizedHeaders.findIndex(h => 
    h === 'notes' || 
    h === 'remarks' || 
    h === 'comments' || 
    h === 'reference' || 
    h === 'receipt #' || 
    h === 'memo' || 
    h.includes('notes') || 
    h.includes('reference')
  );

  // 2. Gather student names for canonical map
  const rawNames = rows.map(r => r[nameIndex] || '').filter(Boolean);
  const canonicalNamesMap = getCanonicalNamesMap(rawNames);

  const parsedRecords: PaymentRecord[] = [];
  const seenStudentKeys = new Set<string>();
  let pendingTransactions: Array<{ amount: number; date: string; rawStatus?: string }> = [];

  rows.forEach((row, rowIdx) => {
    const rawName = (row[nameIndex] || '').toString().trim().replace(/[\r\n]+/g, ' ');

    // Summary row detection: e.g. ",,,,20300,51700,,,,,,,,,,,"
    const isSummaryRow = 
      /^(total|grand total|sum|summary)\b/i.test(rawName) ||
      (!rawName && (
        (amountPaidIndex >= 0 && parseCurrencyAmount(row[amountPaidIndex], 0) > 10000 && balanceIndex >= 0 && parseCurrencyAmount(row[balanceIndex], 0) > 10000) ||
        /^(total|grand total|sum|summary)\b/i.test(row.join(' ').trim())
      ));

    if (isSummaryRow) {
      pendingTransactions = [];
      return;
    }

    // Installment transaction row without a student name: e.g. ",,,,400,,,8th June 2026,,,,,,,,,"
    if (!rawName || rawName === 'Unknown') {
      const rawPaid = amountPaidIndex >= 0 ? row[amountPaidIndex] : null;
      const rawDate = dateIndex >= 0 && row[dateIndex] ? row[dateIndex] : '';
      const rawStanding = paymentStandingIndex >= 0 && row[paymentStandingIndex] ? row[paymentStandingIndex] : '';
      const txAmount = rawPaid ? parseCurrencyAmount(rawPaid, 0) : 0;
      if (txAmount > 0) {
        pendingTransactions.push({
          amount: txAmount,
          date: rawDate ? String(rawDate).trim() : '',
          rawStatus: String(rawStanding).trim()
        });
      }
      return;
    }

    if (isExcludedStudent(rawName)) {
      pendingTransactions = [];
      return;
    }

    // Ignore headers repeated in data rows
    if (/name/i.test(rawName) && (/tuition/i.test(row.join(' ')) || /paid/i.test(row.join(' ')) || /balance/i.test(row.join(' ')))) {
      pendingTransactions = [];
      return;
    }

    const norm = normalizeStudentName(rawName);
    const canonicalName = MANUAL_ALIASES[norm] || canonicalNamesMap.get(norm) || canonicalNamesMap.get(rawName) || rawName;

    // Extract student ID from NOS. or ID column
    let studentId = '';
    if (idIndex >= 0 && row[idIndex]) {
      const idStr = String(row[idIndex]).trim();
      const idNum = parseInt(idStr, 10);
      if (!isNaN(idNum) && idNum > 0 && String(idNum) === idStr) {
        studentId = `HTEIM-2025-${String(idNum).padStart(3, '0')}`;
      } else if (idStr) {
        studentId = idStr;
      }
    }

    const existing = existingRecords.find(e => 
      (studentId && e.studentId && e.studentId.toLowerCase() === studentId.toLowerCase()) ||
      (e.studentName && canonicalName && e.studentName.toLowerCase().trim() === canonicalName.toLowerCase().trim())
    );

    if (!studentId) {
      studentId = existing?.studentId || `HTEIM-2025-${String(rowIdx + 1).padStart(3, '0')}`;
    }

    const studentKey = studentId ? studentId.toLowerCase() : canonicalName.toLowerCase().trim();
    if (seenStudentKeys.has(studentKey)) {
      pendingTransactions = [];
      return;
    }
    seenStudentKeys.add(studentKey);

    // Extract raw cell values
    const rawTotal = totalTuitionIndex >= 0 ? row[totalTuitionIndex] : null;
    const rawPaid = amountPaidIndex >= 0 ? row[amountPaidIndex] : null;
    const rawBalance = balanceIndex >= 0 ? row[balanceIndex] : null;
    const rawStanding = paymentStandingIndex >= 0 && row[paymentStandingIndex] ? String(row[paymentStandingIndex]).trim() : '';
    const rawStatus = statusIndex >= 0 && row[statusIndex] ? String(row[statusIndex]).trim() : '';

    // Clean Email
    const rawEmail = emailIndex >= 0 && row[emailIndex] ? String(row[emailIndex]).trim().replace(/\s+/g, '') : (existing?.email || '');
    const email = rawEmail || '';

    // Phone & Module Track
    const phone = phoneIndex >= 0 && row[phoneIndex] ? String(row[phoneIndex]).trim() : (existing?.phone || '');
    const moduleTrack = trackIndex >= 0 && row[trackIndex] ? String(row[trackIndex]).trim() : (existing?.moduleTrack || 'School of Ministry 2025-2026');

    // Transactions from preceding sub-rows
    const pendingTxSum = pendingTransactions.reduce((acc, t) => acc + t.amount, 0);
    const standingIndicatesFull = 
      /paid in full/i.test(rawStanding) || 
      /paid in full/i.test(rawStatus) ||
      (pendingTransactions.length > 0 && pendingTransactions.every(t => /paid in full/i.test(t.rawStatus || '')) && pendingTxSum >= 1200);

    // Explicit Balance Owed from sheet column
    const hasRawBalance = rawBalance !== null && rawBalance !== undefined && String(rawBalance).trim() !== '';
    const parsedRawBalance = hasRawBalance ? parseCurrencyAmount(rawBalance, 0) : null;

    // Direct Amount Paid from sheet column
    const hasRawPaid = rawPaid !== null && rawPaid !== undefined && String(rawPaid).trim() !== '';
    const parsedRawPaid = hasRawPaid ? parseCurrencyAmount(rawPaid, 0) : 0;
    const candidatePaid = parsedRawPaid + pendingTxSum;

    // Tuition billed evaluation
    const hasRawTotal = totalTuitionIndex >= 0 && rawTotal !== null && rawTotal !== undefined && String(rawTotal).trim() !== '';
    let totalTuition = 1200;
    if (hasRawTotal) {
      totalTuition = parseCurrencyAmount(rawTotal, 1200);
    } else if (existing?.totalTuition) {
      totalTuition = existing.totalTuition;
    } else if (candidatePaid > 0 || parsedRawBalance !== null) {
      totalTuition = candidatePaid + (parsedRawBalance ?? 0);
    }

    // Evaluate balance owed and amount paid
    let balanceOwed = 0;
    let amountPaid = candidatePaid;

    if (parsedRawBalance !== null) {
      // User rule: each student balance owing comes from the balance owed column in the sheet
      balanceOwed = parsedRawBalance;

      // If no explicit transactions recorded in sub-rows or paid column, evaluate amount paid from totalTuition - balanceOwed
      if (amountPaid === 0 && totalTuition > balanceOwed) {
        amountPaid = Math.max(0, totalTuition - balanceOwed);
      }
    } else {
      // Balance column was blank, derive from payments or existing record
      if (candidatePaid > 0) {
        amountPaid = candidatePaid;
        balanceOwed = Math.max(0, totalTuition - amountPaid);
      } else if (existing?.balanceOwed !== undefined) {
        balanceOwed = existing.balanceOwed;
        amountPaid = existing.amountPaid || 0;
      } else {
        balanceOwed = totalTuition;
        amountPaid = 0;
      }
    }

    // Invert/adjust total tuition if not provided in sheet and sum of parts is different
    if (!hasRawTotal && !existing?.totalTuition && (amountPaid > 0 || balanceOwed > 0)) {
      totalTuition = amountPaid + balanceOwed;
    }

    // Status: Paid in full if balance is 0, Partial if > 0 paid, or Pending Review / Past Due
    let status: PaymentRecord['status'];
    if (balanceOwed <= 0 || (amountPaid >= totalTuition && balanceOwed <= 0) || (standingIndicatesFull && balanceOwed <= 0)) {
      status = 'Paid In Full';
    } else if (amountPaid > 0) {
      status = 'Partial';
    } else if (/inactive/i.test(rawStatus) || /past due/i.test(rawStatus) || /overdue/i.test(rawStatus)) {
      status = 'Past Due';
    } else {
      status = 'Pending Review';
    }

    // Last payment date: take most recent transaction date if available
    let lastPaymentDate = '';
    const studentRowDate = dateIndex >= 0 && row[dateIndex] ? String(row[dateIndex]).trim() : '';
    if (pendingTransactions.length > 0) {
      const txDates = pendingTransactions.map(t => t.date).filter(Boolean);
      if (txDates.length > 0) {
        lastPaymentDate = formatSheetPaymentDate(txDates[txDates.length - 1]);
      }
    }
    if (!lastPaymentDate && studentRowDate) {
      lastPaymentDate = formatSheetPaymentDate(studentRowDate);
    }
    if (!lastPaymentDate) {
      lastPaymentDate = existing?.lastPaymentDate || (amountPaid > 0 ? new Date().toISOString().split('T')[0] : 'N/A');
    }

    const rawMethod = methodIndex >= 0 ? String(row[methodIndex]).trim() : undefined;
    const paymentMethod = normalizePaymentMethod(rawMethod || existing?.paymentMethod);

    let txNotes = '';
    if (pendingTransactions.length > 0) {
      txNotes = pendingTransactions.map((t, i) => `[Payment ${i + 1}: $${t.amount}${t.date ? ' on ' + t.date : ''}]`).join(' ');
    }

    const notes = notesIndex >= 0 && row[notesIndex] 
      ? String(row[notesIndex]).trim() 
      : (existing?.notes || (txNotes ? `Google Sheets Ingested • ${txNotes}` : `Synced from Google Sheet (${sheetTitle})`));

    parsedRecords.push({
      id: existing?.id || `pay_sheet_${studentId.replace(/[^a-zA-Z0-9]/g, '_')}`,
      studentId,
      studentName: canonicalName,
      email,
      phone,
      moduleTrack,
      totalTuition,
      amountPaid,
      balanceOwed,
      balanceDue: balanceOwed,
      status,
      lastPaymentDate,
      paymentMethod,
      notes,
      receiptUrl: existing?.receiptUrl,
      receiptName: existing?.receiptName,
      receiptNumber: existing?.receiptNumber,
      paymentPlan: existing?.paymentPlan,
    });

    pendingTransactions = [];
  });

  return parsedRecords;
}

/**
 * Parses raw CSV text (e.g. from file upload or copy-paste) into PaymentRecord items
 */
export function parseTuitionCSV(
  csvText: string, 
  existingRecords: PaymentRecord[] = []
): PaymentRecord[] {
  if (!csvText || !csvText.trim()) return [];
  const parsed = Papa.parse<string[]>(csvText.trim(), {
    skipEmptyLines: false,
  });
  if (!parsed.data || parsed.data.length < 2) return [];

  const headers = parsed.data[0];
  const rows = parsed.data.slice(1);
  return parseTuitionSheetRows('CSV Import', headers, rows, existingRecords);
}

/**
 * Fetches and processes tuition & fees data from a Google Spreadsheet
 */
export async function fetchTuitionSpreadsheet(
  spreadsheetUrlOrId: string, 
  token?: string | null,
  existingPayments: PaymentRecord[] = []
): Promise<ParsedTuitionResult> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetUrlOrId) || spreadsheetUrlOrId;
  if (!spreadsheetId) {
    throw new Error('Invalid Google Sheets URL or Spreadsheet ID.');
  }

  let sheets: Array<{ name: string; gid?: string }> = [];
  let docTitle = 'HTEIM Tuition & Fees Sheet';

  // 1. Try Authenticated Google Sheets API if token is provided
  if (token) {
    try {
      const metadata = await fetchSpreadsheetMetadata(spreadsheetId, token);
      docTitle = metadata.properties?.title || docTitle;
      if (metadata.sheets && Array.isArray(metadata.sheets)) {
        sheets = metadata.sheets.map((s: any) => ({
          name: s.properties.title,
          gid: s.properties.sheetId?.toString()
        }));
      }
    } catch (authErr) {
      logger.warn('Authenticated metadata fetch failed for tuition sheet:', authErr);
    }
  }

  // 2. Try Server Proxy to extract sheets from htmlview
  if (sheets.length === 0) {
    try {
      const proxyResp = await fetch(`/api/drive-proxy/spreadsheet/${spreadsheetId}/sheets`);
      if (proxyResp.ok) {
        const data = await proxyResp.json();
        if (data && Array.isArray(data.sheets) && data.sheets.length > 0) {
          sheets = data.sheets;
        }
      }
    } catch (proxyErr) {
      logger.warn('Server proxy sheet list fetch failed for tuition sheet:', proxyErr);
    }
  }

  // 3. Fallback: if no sheet tabs could be detected, query default Sheet1
  if (sheets.length === 0) {
    sheets = [
      { name: 'Tuition & Fees' },
      { name: 'Tuition' },
      { name: 'Payments' },
      { name: 'Sheet1' }
    ];
  }

  // Identify candidate tuition tabs
  const urlGid = extractGid(spreadsheetUrlOrId);
  let candidateSheets = sheets.filter(s => isTuitionSheetTab(s.name));
  if (urlGid) {
    candidateSheets = [{ name: 'Linked Sheet', gid: urlGid }, ...candidateSheets.filter(s => s.gid !== urlGid)];
  } else if (candidateSheets.length === 0) {
    // If no explicit tuition tab name matched, query all sheets to inspect headers
    candidateSheets = sheets;
  }

  // Fetch data for candidate tabs
  const fetchSheetData = async (sheetItem: { name: string; gid?: string }) => {
    try {
      let data: any = null;

      // 1. Try Server Proxy first
      try {
        const proxyParam = sheetItem.gid ? `?gid=${sheetItem.gid}` : `?sheet=${encodeURIComponent(sheetItem.name)}`;
        const proxyRes = await fetch(`/api/drive-proxy/spreadsheet/${spreadsheetId}/data${proxyParam}`);
        if (proxyRes.ok) {
          data = await proxyRes.json();
        }
      } catch {}

      // 2. Direct GViz fallback
      if (!data) {
        let gvizUrl = "";
        if (sheetItem.gid) {
          gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&gid=${sheetItem.gid}`;
        } else if (sheetItem.name) {
          gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetItem.name)}`;
        } else {
          gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
        }

        const gvizResp = await fetch(gvizUrl);
        if (gvizResp.ok) {
          const gvizText = await gvizResp.text();
          const startIdx = gvizText.indexOf('{');
          const endIdx = gvizText.lastIndexOf('}');
          if (startIdx !== -1 && endIdx !== -1) {
            data = JSON.parse(gvizText.substring(startIdx, endIdx + 1));
          }
        }
      }

      if (data && data.table) {
        const cols = data.table.cols || [];
        const rows = data.table.rows || [];

        let headers = cols.map((c: any) => c ? (c.label || c.id || '') : '');
        const parsedRows = rows.map((r: any) => {
          if (!r || !r.c) return [];
          return r.c.map((cell: any) => {
            if (!cell) return '';
            if (cell.f !== undefined) return String(cell.f);
            if (cell.v !== undefined) return String(cell.v);
            return '';
          });
        });

        const isDefaultLetters = headers.every((h: string) => !h || /^[A-Z]+$/.test(h.trim()));
        if (isDefaultLetters && parsedRows.length > 0) {
          headers = parsedRows[0];
          return {
            sheetTitle: sheetItem.name,
            headers,
            rows: parsedRows.slice(1),
          };
        }

        return {
          sheetTitle: sheetItem.name,
          headers,
          rows: parsedRows,
        };
      }
    } catch (err) {
      logger.warn(`Failed to fetch tuition sheet data for ${sheetItem.name}:`, err);
    }
    return null;
  };

  const results = await Promise.all(candidateSheets.map(s => fetchSheetData(s)));
  const validSheets = results.filter(Boolean) as Array<{ sheetTitle: string; headers: string[]; rows: string[][] }>;

  if (validSheets.length === 0) {
    throw new Error('Unable to retrieve tabular data from the specified Google Sheet. Please confirm the sheet is accessible.');
  }

  // Find the best matching sheet tab that contains tuition records
  let allParsedRecords: PaymentRecord[] = [];
  const detectedTabs: string[] = [];
  let bestSheetScore = -1;

  for (const sheet of validSheets) {
    detectedTabs.push(sheet.sheetTitle);
    const records = parseTuitionSheetRows(sheet.sheetTitle, sheet.headers, sheet.rows, existingPayments);
    if (records.length > 0) {
      const studentsWithPayments = records.filter(r => r.amountPaid > 0).length;
      const totalCollected = records.reduce((s, r) => s + (r.amountPaid || 0), 0);
      const isTuitionTitle = isTuitionSheetTab(sheet.sheetTitle);
      const score = (studentsWithPayments * 100) + (isTuitionTitle ? 500 : 0) + (records.length * 10) + (totalCollected > 0 ? 200 : 0);

      if (score > bestSheetScore) {
        bestSheetScore = score;
        allParsedRecords = records;
        docTitle = sheet.sheetTitle || docTitle;
      }
    }
  }

  // If no tuition records were parsed directly, build baseline roster for all enrolled students
  if (allParsedRecords.length === 0) {
    MASTER_ENROLLED_STUDENTS.forEach((studentName, idx) => {
      if (!isExcludedStudent(studentName)) {
        const studentId = `HTEIM-2025-${String(idx + 1).padStart(3, '0')}`;
        allParsedRecords.push({
          id: `pay_roster_${studentId}`,
          studentId,
          studentName,
          moduleTrack: 'School of Ministry 2025-2026',
          totalTuition: 1200,
          amountPaid: 0,
          balanceOwed: 1200,
          balanceDue: 1200,
          status: 'Pending Review',
          lastPaymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'Bank Transfer',
          notes: 'Auto-provisioned student tuition ledger',
        });
      }
    });
  }

  // Compute aggregated statistics
  const totalStudents = allParsedRecords.length;
  const totalTuitionBilled = allParsedRecords.reduce((sum, p) => sum + (p.totalTuition || 0), 0);
  const totalAmountCollected = allParsedRecords.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalOutstandingBalance = Math.max(0, totalTuitionBilled - totalAmountCollected);
  const collectionRatePercent = totalTuitionBilled > 0 
    ? Math.round((totalAmountCollected / totalTuitionBilled) * 100) 
    : 0;

  return {
    sheetTitle: docTitle,
    spreadsheetId,
    records: allParsedRecords,
    totalStudents,
    totalTuitionBilled,
    totalAmountCollected,
    totalOutstandingBalance,
    collectionRatePercent,
    detectedTabs,
    lastSyncedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Merges incoming parsed Google Sheets tuition records with local state
 */
export function mergeTuitionRecords(
  existingRecords: PaymentRecord[], 
  incomingRecords: PaymentRecord[], 
  policy: 'sheets' | 'manual' = 'manual'
): PaymentRecord[] {
  const merged: PaymentRecord[] = [];
  const incomingMap = new Map<string, PaymentRecord>();

  incomingRecords.forEach(rec => {
    const key = (rec.studentName || '').toLowerCase().trim();
    if (key) incomingMap.set(key, rec);
  });

  // 1. Process existing records
  existingRecords.forEach(existing => {
    const key = (existing.studentName || '').toLowerCase().trim();
    const incoming = incomingMap.get(key);

    if (incoming) {
      incomingMap.delete(key);
      if (policy === 'manual') {
        // Preserve manual payment receipts and user overrides if present
        merged.push({
          ...incoming,
          id: existing.id || incoming.id,
          receiptUrl: existing.receiptUrl || incoming.receiptUrl,
          receiptName: existing.receiptName || incoming.receiptName,
          receiptNumber: existing.receiptNumber || incoming.receiptNumber,
          notes: existing.notes || incoming.notes,
          paymentPlan: existing.paymentPlan || incoming.paymentPlan,
        });
      } else {
        // Sheets take complete precedence
        merged.push({
          ...incoming,
          id: existing.id || incoming.id,
        });
      }
    } else {
      // Keep student records not in the incoming sheet
      merged.push(existing);
    }
  });

  // 2. Add remaining incoming records not present in local state
  incomingMap.forEach(newRecord => {
    merged.push(newRecord);
  });

  return merged;
}

/**
 * Saves tuition records to localStorage and keeps invoices/transactions synchronized
 */
export function persistTuitionRecords(records: PaymentRecord[]): void {
  localStorage.setItem('hteim_student_payments', JSON.stringify(records));
  
  // Re-bootstrap and synchronize authoritative financial invoices and ledger
  const bootstrapped = bootstrapFromPaymentRecords(records);
  saveInvoices(bootstrapped.invoices);
  if (bootstrapped.transactions.length > 0) {
    saveTransactions(bootstrapped.transactions);
  }
  if (bootstrapped.receipts.length > 0) {
    saveReceipts(bootstrapped.receipts);
  }
}
