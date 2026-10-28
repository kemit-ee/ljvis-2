// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getForm = vi.hoisted(() => vi.fn());
vi.mock('../../api', () => ({ getTramForm: getForm }));

import { useTramControlCardDetail } from './useTramControlCardDetail';

beforeEach(() => {
  getForm.mockReset().mockResolvedValue({ id: 1 });
});
afterEach(cleanup);

describe('useTramControlCardDetail', () => {
  it('ilma id-ta ei päri', () => {
    renderHook(() => useTramControlCardDetail(undefined));
    expect(getForm).not.toHaveBeenCalled();
  });

  it('laeb vormi ja refetch töötab', async () => {
    const { result } = renderHook(() => useTramControlCardDetail('1'));
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
    const { result } = renderHook(() => useTramControlCardDetail('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.form).toBeNull();
    err.mockRestore();
  });
});
