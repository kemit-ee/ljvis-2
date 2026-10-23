// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdrFormDetail } from './useAdrFormDetail';
import { getAdrForm } from '../../api';

vi.mock('../../api', () => ({ getAdrForm: vi.fn() }));

describe('useAdrFormDetail', () => {
  beforeEach(() => {
    vi.mocked(getAdrForm).mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not load without an id', async () => {
    const { result } = renderHook(() => useAdrFormDetail(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getAdrForm).not.toHaveBeenCalled();
  });

  it('loads and refetches', async () => {
    vi.mocked(getAdrForm).mockResolvedValue({ id: '3' } as never);
    const { result } = renderHook(() => useAdrFormDetail('3'));
    await waitFor(() => expect(result.current.form).toEqual({ id: '3' }));
    await act(async () => {
      await result.current.refetch();
    });
    expect(getAdrForm).toHaveBeenCalledTimes(2);
  });

  it('ignores a refetch while a request is in flight', async () => {
    let resolve: (v: unknown) => void = () => {};
    vi.mocked(getAdrForm).mockReturnValue(new Promise((r) => { resolve = r; }) as never);
    const { result } = renderHook(() => useAdrFormDetail('3'));
    await act(async () => {
      await result.current.refetch();
    });
    expect(getAdrForm).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({ id: '3' });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('logs a load failure', async () => {
    vi.mocked(getAdrForm).mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useAdrFormDetail('3'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(console.error).toHaveBeenCalled();
  });
});
