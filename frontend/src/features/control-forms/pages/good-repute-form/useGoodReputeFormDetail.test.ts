// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getForm = vi.hoisted(() => vi.fn());
vi.mock('../../api', () => ({ getGoodReputeForm: getForm }));

import { useGoodReputeFormDetail } from './useGoodReputeFormDetail';

beforeEach(() => {
  getForm.mockReset().mockResolvedValue({ id: '1', formNumber: 'GR' });
});

describe('useGoodReputeFormDetail', () => {
  it('ilma id-ta ei lae midagi', async () => {
    const { result } = renderHook(() => useGoodReputeFormDetail(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getForm).not.toHaveBeenCalled();
    expect(result.current.form).toBeNull();
  });

  it('laeb vormi ja refetch laeb uuesti', async () => {
    const { result } = renderHook(() => useGoodReputeFormDetail('1'));
    await waitFor(() => expect(result.current.form).toEqual({ id: '1', formNumber: 'GR' }));
    await act(async () => {
      await result.current.refetch();
    });
    expect(getForm).toHaveBeenCalledTimes(2);
  });

  it('laadimise viga lõpetab laadimise', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    getForm.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useGoodReputeFormDetail('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.form).toBeNull();
    err.mockRestore();
  });
});
