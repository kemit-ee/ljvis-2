// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getForm = vi.hoisted(() => vi.fn());
vi.mock('../../api', () => ({ getLabourInspectionForm: getForm }));

import { useLabourInspectionFormDetail } from './useLabourInspectionFormDetail';

beforeEach(() => {
  getForm.mockReset().mockResolvedValue({ id: 1 });
});

describe('useLabourInspectionFormDetail', () => {
  it('ilma id-ta ei päri', () => {
    renderHook(() => useLabourInspectionFormDetail(undefined));
    expect(getForm).not.toHaveBeenCalled();
  });

  it('laeb vormi numbrilise id-ga ja refetch töötab', async () => {
    const { result } = renderHook(() => useLabourInspectionFormDetail('1'));
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
    const { result } = renderHook(() => useLabourInspectionFormDetail('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.form).toBeNull();
    err.mockRestore();
  });
});
