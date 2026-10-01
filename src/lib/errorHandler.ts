/**
 * ============================================================================
 * CONSOLIDATED ERROR HANDLING UTILITY
 * HTEIM School of Ministry
 * ============================================================================
 * Provides central classification, sanitization, and logging of application errors.
 * Ensures that users see friendly, supportive, actionable messages while
 * developers receive rich debugging logs without leaking system internals.
 */

import { logger } from './logger';

export type ErrorType =
  | 'network'
  | 'database'
  | 'authentication'
  | 'unauthorized'
  | 'ai'
  | 'validation'
  | 'missing'
  | 'timeout'
  | 'unknown';

export interface AppErrorOptions {
  type: ErrorType;
  userMessage: string;
  developerMessage?: string;
  originalError?: any;
  details?: any;
}

export class AppError extends Error {
  public type: ErrorType;
  public userMessage: string;
  public developerMessage: string;
  public originalError: any;
  public details: any;

  constructor(options: AppErrorOptions) {
    super(options.userMessage);
    this.name = 'AppError';
    this.type = options.type;
    this.userMessage = options.userMessage;
    this.developerMessage = options.developerMessage || options.userMessage;
    this.originalError = options.originalError;
    this.details = options.details;

    // Maintain correct stack trace in V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Classifies any thrown error or response failure into an AppError.
 */
export function classifyError(error: any, fallbackType: ErrorType = 'unknown'): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const message = error?.message || String(error || '');
  const code = error?.code || '';
  const status = error?.status || null;

  let type: ErrorType = fallbackType;
  let userMessage = "An unexpected error occurred. Please try again.";
  let developerMessage = message;

  // 1. Timeout Errors
  if (
    message.toLowerCase().includes('timeout') ||
    message.toLowerCase().includes('deadline exceeded') ||
    status === 408 ||
    code === 'ETIMEDOUT'
  ) {
    type = 'timeout';
    userMessage = 'The operation took too long to complete. Please check your connection and try again.';
  }
  // 2. Network Errors
  else if (
    message.toLowerCase().includes('failed to fetch') ||
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('cors') ||
    message.toLowerCase().includes('load failed') ||
    message.toLowerCase().includes('offline') ||
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED'
  ) {
    type = 'network';
    userMessage = 'A network connection issue was detected. Please verify your internet connection.';
  }
  // 3. Database Errors (Supabase / Postgres / Firestore)
  else if (
    code.startsWith('23') || // Integrity Constraint Violation
    code.startsWith('42') || // Syntax / Access Rule Violation
    code.startsWith('P0') || // Postgres-specific codes
    message.toLowerCase().includes('supabase') ||
    message.toLowerCase().includes('postgres') ||
    message.toLowerCase().includes('database') ||
    message.toLowerCase().includes('query') ||
    message.toLowerCase().includes('relation') ||
    message.toLowerCase().includes('permission denied')
  ) {
    // Distinguish unauthorized database actions (RLS / access violations)
    if (
      message.toLowerCase().includes('row-level security') ||
      message.toLowerCase().includes('rls') ||
      message.toLowerCase().includes('insufficient privilege') ||
      code === '42501' || // Insufficient Privilege code
      message.toLowerCase().includes('insufficient permissions')
    ) {
      type = 'unauthorized';
      userMessage = 'You do not have permission to access or modify this resource.';
    } else {
      type = 'database';
      userMessage = 'Unable to synchronize records with the cloud database. Your changes are buffered locally.';
    }
  }
  // 4. Unauthorized Actions (Application or API)
  else if (
    status === 403 ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('forbidden') ||
    message.toLowerCase().includes('access denied') ||
    message.toLowerCase().includes('not allowed')
  ) {
    type = 'unauthorized';
    userMessage = 'Access denied. You do not have sufficient permissions to perform this action.';
  }
  // 5. Authentication Failures
  else if (
    status === 401 ||
    message.toLowerCase().includes('incorrect password') ||
    message.toLowerCase().includes('invalid credentials') ||
    message.toLowerCase().includes('suspended') ||
    message.toLowerCase().includes('no user') ||
    message.toLowerCase().includes('auth')
  ) {
    type = 'authentication';
    if (message.toLowerCase().includes('suspended')) {
      userMessage = 'This account has been suspended by the administrator. Please contact Academic Affairs.';
    } else if (message.toLowerCase().includes('incorrect password') || message.toLowerCase().includes('invalid credentials')) {
      userMessage = 'The email, username, or password you entered is incorrect.';
    } else {
      userMessage = 'Authentication failed. Please verify your credentials and sign in again.';
    }
  }
  // 6. AI Failures (Gemini API, rate limits, quota)
  else if (
    message.toLowerCase().includes('gemini') ||
    message.toLowerCase().includes('ai evaluation') ||
    message.toLowerCase().includes('quota exceeded') ||
    message.toLowerCase().includes('rate limit') ||
    status === 429
  ) {
    type = 'ai';
    if (message.toLowerCase().includes('quota') || status === 429) {
      userMessage = 'The AI Evaluation engine is currently experiencing high volume. Using standard fallback evaluation.';
    } else {
      userMessage = 'The AI Lesson Evaluator encountered an processing issue. Using local smart-matching heuristic.';
    }
  }
  // 7. Missing Records
  else if (
    status === 404 ||
    message.toLowerCase().includes('not found') ||
    message.toLowerCase().includes('no record') ||
    message.toLowerCase().includes('missing') ||
    code === 'PGRST116' // Postgrest single record missing error
  ) {
    type = 'missing';
    userMessage = 'The requested academic record or library resource could not be found.';
  }
  // 8. Validation Errors
  else if (
    message.toLowerCase().includes('invalid') ||
    message.toLowerCase().includes('required') ||
    message.toLowerCase().includes('validation') ||
    message.toLowerCase().includes('format') ||
    message.toLowerCase().includes('must enter')
  ) {
    type = 'validation';
    userMessage = message; // Validation errors are already user-facing and specific
  }

  return new AppError({
    type,
    userMessage,
    developerMessage,
    originalError: error,
    details: error?.details || null,
  });
}

/**
 * Triggers a global toast notification on the active user session.
 */
export function triggerGlobalToast(type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) {
  if (typeof window !== 'undefined' && (window as any).triggerPortalToast) {
    (window as any).triggerPortalToast(type, title, message);
  } else {
    logger.info(`[Fallback Toast] ${type.toUpperCase()}: ${title} - ${message}`);
  }
}

/**
 * Centrally processes an error: classifies, logs detailed technical traces for developers,
 * and triggers a unified visual toast to inform the end user in a graceful, secure manner.
 */
export function displayErrorToUser(error: any, contextDescription: string, fallbackType: ErrorType = 'unknown'): AppError {
  const appError = handleError(error, contextDescription, fallbackType);
  
  let toastType: 'error' | 'warning' = 'error';
  if (appError.type === 'validation') {
    toastType = 'warning';
  }

  const titleMap: Record<ErrorType, string> = {
    network: 'Connection Offline',
    database: 'Database Sync Issue',
    authentication: 'Sign-in Failed',
    unauthorized: 'Permission Denied',
    ai: 'AI Evaluator Occupied',
    validation: 'Input Correction Required',
    missing: 'Record Not Found',
    timeout: 'Request Timed Out',
    unknown: 'Unexpected Issue'
  };

  const title = titleMap[appError.type] || 'System Alert';
  
  triggerGlobalToast(toastType, title, appError.userMessage);
  return appError;
}

/**
 * Handles error tracking: logs the full trace for developers and returns a sanitized AppError.
 */
export function handleError(error: any, contextDescription: string, fallbackType: ErrorType = 'unknown'): AppError {
  const appError = classifyError(error, fallbackType);

  // LOG SUBSTANTIAL DETAILS TO THE DEVELOPER CONSOLE
  // Never expose sensitive internals to end users via state, but log them fully here.
  logger.error(`[DEVELOPER LOG - ERROR] Context: "${contextDescription}"`);
  logger.error(`  - Type: ${appError.type.toUpperCase()}`);
  logger.error(`  - User Message: ${appError.userMessage}`);
  logger.error(`  - Technical Message: ${appError.developerMessage}`);
  if (appError.originalError) {
    logger.error('  - Original Error Object:', appError.originalError);
    if (appError.originalError.stack) {
      logger.error('  - Stack Trace:\n', appError.originalError.stack);
    }
  }
  if (appError.details) {
    logger.error('  - Error Details:', appError.details);
  }

  return appError;
}
