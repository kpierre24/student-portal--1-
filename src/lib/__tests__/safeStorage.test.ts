import { describe, it, expect, beforeEach, vi } from 'vitest';
import { safeStorage, isQuotaExceededError, purgeDispensableStorage } from '../safeStorage';

describe('safeStorage & Quota Defense', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sets and gets plain string values safely', () => {
    safeStorage.setItem('test_key', 'hello_world');
    expect(safeStorage.getItem('test_key')).toBe('hello_world');
    expect(localStorage.getItem('test_key')).toBe('hello_world');
  });

  it('sets and gets JSON objects safely', () => {
    const data = { id: 1, name: 'Grace' };
    safeStorage.setJSON('test_json_key', data);
    expect(safeStorage.getJSON('test_json_key', null)).toEqual(data);
  });

  it('removes items properly from storage and fallback', () => {
    safeStorage.setItem('remove_test', '123');
    expect(safeStorage.getItem('remove_test')).toBe('123');
    safeStorage.removeItem('remove_test');
    expect(safeStorage.getItem('remove_test')).toBeNull();
  });

  it('identifies QuotaExceededError accurately', () => {
    const errorByName = new Error('Quota exceeded');
    errorByName.name = 'QuotaExceededError';
    expect(isQuotaExceededError(errorByName)).toBe(true);

    const errorByCode = { code: 22, message: 'Storage full' };
    expect(isQuotaExceededError(errorByCode)).toBe(true);

    const regularError = new Error('Random error');
    expect(isQuotaExceededError(regularError)).toBe(false);
  });

  it('purges dispensable keys when requested', () => {
    localStorage.setItem('hteim_cache_query_1', 'cached_data');
    localStorage.setItem('hteim_bible_ch_genesis_1', 'verse_data');
    localStorage.setItem('keep_user_token', 'jwt_token');

    const purged = purgeDispensableStorage();
    expect(purged).toBe(2);
    expect(localStorage.getItem('hteim_cache_query_1')).toBeNull();
    expect(localStorage.getItem('hteim_bible_ch_genesis_1')).toBeNull();
    expect(localStorage.getItem('keep_user_token')).toBe('jwt_token');
  });

  it('handles simulated QuotaExceededError without throwing', () => {
    const quotaError = new DOMException('Setting the value of attendanceRecords exceeded the quota.', 'QuotaExceededError');
    const originalSet = Storage.prototype.setItem;

    // Simulate quota error on underlying native setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw quotaError;
    });

    // Should not throw!
    expect(() => {
      safeStorage.setItem('attendanceRecords', JSON.stringify([{ id: 'att-1' }]));
    }).not.toThrow();

    // Value should still be retrievable via safeStorage / fallback
    const val = safeStorage.getItem('attendanceRecords');
    expect(val).toContain('att-1');
  });
});
