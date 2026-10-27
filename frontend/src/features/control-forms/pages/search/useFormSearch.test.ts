// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { searchFormsMock } = vi.hoisted(() => ({ searchFormsMock: vi.fn() }));
vi.mock('../../api', () => ({ searchForms: searchFormsMock }));

import { useFormSearch } from './useFormSearch';

beforeEach(() => {
  searchFormsMock.mockReset().mockResolvedValue({ content: [{ formKey: 1 }], total: 1 });
});

describe('useFormSearch', () => {
  it('laeb algselt andmed vaikejärjestusega', async () => {
    const { result } = renderHook(() => useFormSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([{ formKey: 1 }]);
    expect(result.current.totalRows).toBe(1);
    expect(searchFormsMock.mock.calls[0][0]).toMatchObject({
      page: '1',
      pageSize: '20',
      sorting: 'main_date desc',
    });
  });

  it('filtri muutmine ei päri enne rakendamist, rakendamine päri uuesti', async () => {
    const { result } = renderHook(() => useFormSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const calls = searchFormsMock.mock.calls.length;
    act(() => result.current.setField('formNumber', 'ABC'));
    expect(result.current.draft.formNumber).toBe('ABC');
    expect(result.current.applied.formNumber).toBe('');
    expect(searchFormsMock.mock.calls.length).toBe(calls);
    act(() => result.current.applyFilters());
    await waitFor(() => expect(searchFormsMock.mock.calls.length).toBeGreaterThan(calls));
    expect(searchFormsMock.mock.calls.at(-1)![0]).toMatchObject({ formNumber: 'ABC', page: '1' });
  });

  it('clearFilters nullib filtrid ja suurendab resetKey-d', async () => {
    const { result } = renderHook(() => useFormSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setField('driver', 'X'));
    act(() => result.current.applyFilters());
    await waitFor(() => expect(result.current.applied.driver).toBe('X'));
    act(() => result.current.clearFilters());
    expect(result.current.draft.driver).toBe('');
    expect(result.current.applied.driver).toBe('');
    expect(result.current.resetKey).toBe(1);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('sorteerimine ja lehekülg lähevad päringusse', async () => {
    const { result } = renderHook(() => useFormSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setPagination({ pageIndex: 2, pageSize: 10 }));
    await waitFor(() =>
      expect(searchFormsMock.mock.calls.at(-1)![0]).toMatchObject({ page: '3', pageSize: '10' }),
    );
    act(() => result.current.setSorting([{ id: 'formNumber', desc: false }]));
    await waitFor(() =>
      expect(searchFormsMock.mock.calls.at(-1)![0].sorting).toContain('asc'),
    );
  });

  it('päringu viga tühjendab andmed', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    searchFormsMock.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useFormSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(result.current.totalRows).toBe(0);
    err.mockRestore();
  });
});
