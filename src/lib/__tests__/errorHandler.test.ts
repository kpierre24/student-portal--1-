import { describe, it, expect } from 'vitest';
import { classifyError, AppError } from '../errorHandler';

describe('errorHandler - classifyError', () => {
  it('returns AppError directly if input is already an AppError', () => {
    const original = new AppError({
      type: 'network',
      userMessage: 'Custom network error',
    });
    const result = classifyError(original);
    expect(result).toBe(original);
  });

  it('safely handles numeric error code without crashing on startsWith', () => {
    const errorWithNumericCode = {
      code: 23505,
      message: 'duplicate key value violates unique constraint',
    };
    const result = classifyError(errorWithNumericCode);
    expect(result.type).toBe('database');
    expect(result.userMessage).toContain('database');
  });

  it('safely handles non-string and non-numeric codes', () => {
    const errorWithObjCode = {
      code: { id: 1 },
      message: 'some generic failure',
    };
    const result = classifyError(errorWithObjCode);
    expect(result.type).toBe('unknown');
    expect(result).toBeInstanceOf(AppError);

    const errorWithNullCode = {
      code: null,
      message: 'null code failure',
    };
    expect(classifyError(errorWithNullCode).type).toBe('unknown');
  });

  it('correctly classifies timeout errors', () => {
    const timeoutError = {
      message: 'Connection timeout exceeded',
    };
    const result = classifyError(timeoutError);
    expect(result.type).toBe('timeout');
  });

  it('correctly classifies network errors', () => {
    const networkError = new Error('Failed to fetch resource');
    const result = classifyError(networkError);
    expect(result.type).toBe('network');
  });

  it('correctly classifies postgres/supabase database errors with code string', () => {
    const pgError = {
      code: '42P01',
      message: 'relation "students" does not exist',
    };
    const result = classifyError(pgError);
    expect(result.type).toBe('database');
  });

  it('correctly classifies unauthorized errors', () => {
    const rlsError = {
      code: '42501',
      message: 'insufficient privilege for table students',
    };
    const result = classifyError(rlsError);
    expect(result.type).toBe('unauthorized');
  });

  it('handles primitive values like string or null safely', () => {
    expect(classifyError('Random string error').type).toBe('unknown');
    expect(classifyError(null).type).toBe('unknown');
    expect(classifyError(undefined).type).toBe('unknown');
    expect(classifyError(404).type).toBe('unknown');
  });
});
