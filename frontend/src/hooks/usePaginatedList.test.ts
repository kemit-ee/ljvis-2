// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePaginatedList } from './usePaginatedList';
import { useFilteredList } from './useFilteredList';

describe('usePaginatedList', () => {
  it('fetches with default params and exposes data', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ content: [{ a: 1 }], total: 1 });
    const { result } = renderHook(() => usePaginatedList(fetchFn));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchFn).toHaveBeenCalledWith({
      page: '1',
      pageSize: '20',
      search: '',
      sorting: 'name asc',
    });
    expect(result.current.data).toEqual([{ a: 1 }]);
    expect(result.current.totalRows).toBe(1);
  });

  it('applies transform and clears data on failure', async () => {
    const transform = (items: { a: number }[]) => items.map((i) => i.a);
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ content: [{ a: 2 }], total: 1 })
      .mockRejectedValueOnce(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePaginatedList(fetchFn, { transform }));
    await waitFor(() => expect(result.current.data).toEqual([2]));

    await act(() => result.current.refetch());
    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('handles search and clearSearch', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ content: [], total: 0 });
    const { result } = renderHook(() => usePaginatedList(fetchFn));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.handleSearch('abc'));
    await waitFor(() =>
      expect(fetchFn).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'abc' })),
    );

    act(() => {
      result.current.setSearchInput('abc');
      result.current.clearSearch();
    });
    await waitFor(() =>
      expect(fetchFn).toHaveBeenLastCalledWith(expect.objectContaining({ search: '' })),
    );
    expect(result.current.searchInput).toBe('');
  });
});

describe('useFilteredList', () => {
  it('applies filters only on applyFilters and resets them', async () => {
    const listFn = vi.fn().mockResolvedValue({ content: [], total: 0 });
    const { result } = renderHook(() =>
      useFilteredList<unknown, { q?: string }>(listFn, { defaultFilters: { q: '' } }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setFilter('q', 'x'));
    expect(result.current.draftFilters.q).toBe('x');
    expect(listFn).toHaveBeenLastCalledWith(expect.anything(), { q: '' });

    act(() => result.current.applyFilters());
    await waitFor(() => expect(listFn).toHaveBeenLastCalledWith(expect.anything(), { q: 'x' }));

    act(() => result.current.applyFiltersWith({ q: 'y' }));
    await waitFor(() => expect(listFn).toHaveBeenLastCalledWith(expect.anything(), { q: 'y' }));

    const before = result.current.resetKey;
    act(() => result.current.resetFilters());
    await waitFor(() => expect(listFn).toHaveBeenLastCalledWith(expect.anything(), { q: '' }));
    expect(result.current.resetKey).toBe(before + 1);
  });

  it('works without options', async () => {
    const listFn = vi.fn().mockResolvedValue({ content: [], total: 0 });
    const { result } = renderHook(() => useFilteredList(listFn));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.draftFilters).toEqual({});
  });
});
