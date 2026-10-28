// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getForm = vi.hoisted(() => vi.fn());
vi.mock('../../api', () => ({ getForm }));

import { useFormDetail } from './useFormDetail';

beforeEach(() => {
  getForm.mockReset().mockResolvedValue({ id: 1 });
});

describe('useFormDetail (välisriigi rikkumine)', () => {
  it('ilma id-ta ei päri', () => {
    renderHook(() => useFormDetail(undefined));
    expect(getForm).not.toHaveBeenCalled();
  });

  it('laeb vormi ja refetch töötab', async () => {
    const { result } = renderHook(() => useFormDetail('1'));
    await waitFor(() => expect(result.current.form).toEqual({ id: 1 }));
    expect(getForm).toHaveBeenCalledWith(1);
    await act(async () => {
      await result.current.refetch();
    });
    expect(getForm).toHaveBeenCalledTimes(2);
  });

  it('viga lõpetab laadimise', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    getForm.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useFormDetail('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    err.mockRestore();
  });

  it('toDateValue ja toTimeValue', () => {
    const { result } = renderHook(() => useFormDetail(undefined));
    expect(result.current.toDateValue(undefined)).toBeNull();
    expect(result.current.toDateValue('2026-01-02')?.format('YYYY-MM-DD')).toBe('2026-01-02');
    expect(result.current.toTimeValue('2026-01-02', undefined)).toBeNull();
    expect(result.current.toTimeValue('2026-01-02', '10:11:12')?.format('HH:mm')).toBe('10:11');
    expect(result.current.toTimeValue(undefined, '10:11:12')?.format('HH:mm')).toBe('10:11');
  });
});
