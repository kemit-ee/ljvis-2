// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompoundFormDetail } from './useCompoundFormDetail';
import { getCompoundForm } from '../../api';

vi.mock('../../api', () => ({ getCompoundForm: vi.fn() }));

describe('useCompoundFormDetail', () => {
  beforeEach(() => {
    vi.mocked(getCompoundForm).mockReset();
  });

  it('laeb vormi ja pakub kuupäeva abifunktsioone', async () => {
    vi.mocked(getCompoundForm).mockResolvedValue({ id: 1 } as never);
    const { result } = renderHook(() => useCompoundFormDetail('5', 3));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getCompoundForm).toHaveBeenCalledWith(5, 3);
    expect(result.current.form).toEqual({ id: 1 });
    expect(result.current.toDateValue()).toBeNull();
    expect(result.current.toDateValue('2026-01-02')?.year()).toBe(2026);
    expect(result.current.toTimeValue()).toBeNull();
    expect(result.current.toTimeValue('2026-01-02', '10:30')?.hour()).toBe(10);
    expect(result.current.toTimeValue(undefined, '10:30')?.minute()).toBe(30);
  });

  it('ilma id-ta ei lae; viga logitakse; refetch laeb uuesti', async () => {
    const { result: none } = renderHook(() => useCompoundFormDetail(undefined));
    expect(getCompoundForm).not.toHaveBeenCalled();
    expect(none.current.loading).toBe(true);

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getCompoundForm).mockRejectedValueOnce(new Error('x'));
    const { result } = renderHook(() => useCompoundFormDetail('5'));
    await waitFor(() => expect(err).toHaveBeenCalled());
    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.mocked(getCompoundForm).mockResolvedValueOnce({ id: 2 } as never);
    await act(() => result.current.refetch());
    expect(result.current.form).toEqual({ id: 2 });
    err.mockRestore();
  });

  it('samaaegne refetch ignoreeritakse', async () => {
    let resolve: (v: unknown) => void = () => {};
    vi.mocked(getCompoundForm).mockImplementation(() => new Promise((r) => { resolve = r; }) as never);
    const { result } = renderHook(() => useCompoundFormDetail('5'));
    await act(async () => {
      void result.current.refetch();
    });
    expect(getCompoundForm).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ id: 1 }));
  });
});
