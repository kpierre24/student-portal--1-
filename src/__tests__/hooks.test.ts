import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../lib/hooks/useDebounce';
import { useLocalStorage } from '../lib/hooks/useLocalStorage';
import { useOnlineStatus } from '../lib/hooks/useOnlineStatus';

describe('useDebounce', () => {
  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 500));
    expect(result.current).toBe('hello');
  });

  it('should debounce value changes', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      (props: { val: string; delay: number } = { val: 'hello', delay: 500 }) => useDebounce(props.val, props.delay),
      { initialProps: { val: 'hello', delay: 500 } }
    );

    rerender({ val: 'world', delay: 500 });
    expect(result.current).toBe('hello');

    await act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('world');

    vi.useRealTimers();
  });
});

describe('useLocalStorage', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key-2', 0));
    act(() => result.current[1](42));
    expect(result.current[0]).toBe(42);
    expect(window.localStorage.getItem('test-key-2')).toBe('42');
  });
});

describe('useOnlineStatus', () => {
  it('should return navigator.onLine by default', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(typeof result.current).toBe('boolean');
  });
});
