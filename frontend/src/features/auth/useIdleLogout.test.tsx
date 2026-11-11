// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIdleLogout } from './useIdleLogout';

describe('useIdleLogout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('logs out after the idle timeout', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleLogout(true, onIdle, 1000));
    vi.advanceTimersByTime(999);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('user activity restarts the timer', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleLogout(true, onIdle, 1000));
    vi.advanceTimersByTime(800);
    window.dispatchEvent(new Event('keydown'));
    vi.advanceTimersByTime(800);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('does nothing when inactive (logged out)', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleLogout(false, onIdle, 1000));
    vi.advanceTimersByTime(5000);
    expect(onIdle).not.toHaveBeenCalled();
  });
});
