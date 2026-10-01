import { describe, it, expect } from 'vitest';
import { apiClient } from '../lib/api/client';

describe('apiClient', () => {
  it('should return failure response on network error', async () => {
    const result = await apiClient('http://localhost:9999/nonexistent');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
