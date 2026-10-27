// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEntityDetail } from './useEntityDetail';

describe('useEntityDetail', () => {
  it('loads the entity by id', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ id: '1' });
    const { result } = renderHook(() => useEntityDetail('1', fetchFn));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entity).toEqual({ id: '1' });
    expect(result.current.notFound).toBe(false);
    expect(fetchFn).toHaveBeenCalledWith('1');

    await act(() => result.current.reload());
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('marks notFound when fetching fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = vi.fn().mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useEntityDetail('1', fetchFn));
    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current.entity).toBeUndefined();
  });

  it('does nothing without id', async () => {
    const fetchFn = vi.fn();
    renderHook(() => useEntityDetail(undefined, fetchFn));
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
