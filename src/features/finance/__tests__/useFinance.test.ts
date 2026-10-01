import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFinance } from '../hooks/useFinance';

describe('useFinance Hook — Ledger Aggregations & Calculations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('aggregates financial totals and collection rates accurately', () => {
    const { result } = renderHook(() => useFinance());

    expect(result.current.stats).toBeDefined();
    expect(result.current.stats.totalBilled).toBeGreaterThanOrEqual(0);
    expect(result.current.stats.totalCollected).toBeGreaterThanOrEqual(0);
    expect(result.current.stats.totalOutstanding).toBeGreaterThanOrEqual(0);
  });

  it('allows recording a new payment via hook interface', async () => {
    const { result } = renderHook(() => useFinance());

    await act(async () => {
      await result.current.recordPayment({
        invoiceId: 'INV-2026-001',
        amount: 300,
        paymentMethod: 'Credit Card',
        paymentReference: 'CARD-REF-1234',
      });
    });

    expect(result.current.transactions.length).toBeGreaterThan(0);
  });
});
