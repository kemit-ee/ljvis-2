// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTechnicalCheckFormDetail } from './useTechnicalCheckFormDetail';
import { getTechnicalCheckForm } from '../../api';

vi.mock('../../api', () => ({ getTechnicalCheckForm: vi.fn() }));

describe('useTechnicalCheckFormDetail', () => {
  beforeEach(() => {
    vi.mocked(getTechnicalCheckForm).mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not load without an id', async () => {
    const { result } = renderHook(() => useTechnicalCheckFormDetail('vehicle', undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getTechnicalCheckForm).not.toHaveBeenCalled();
  });

  it('loads the variant form and refetches', async () => {
    vi.mocked(getTechnicalCheckForm).mockResolvedValue({ id: '3' } as never);
    const { result } = renderHook(() => useTechnicalCheckFormDetail('trailer', '3'));
    await waitFor(() => expect(result.current.form).toEqual({ id: '3' }));
    expect(getTechnicalCheckForm).toHaveBeenCalledWith('trailer', '3');
    await act(async () => {
      await result.current.refetch();
    });
    expect(getTechnicalCheckForm).toHaveBeenCalledTimes(2);
  });

  it('ignores a refetch while a request is in flight', async () => {
    let resolve: (v: unknown) => void = () => {};
    vi.mocked(getTechnicalCheckForm).mockReturnValue(new Promise((r) => { resolve = r; }) as never);
    const { result } = renderHook(() => useTechnicalCheckFormDetail('vehicle', '3'));
    await act(async () => {
      await result.current.refetch();
    });
    expect(getTechnicalCheckForm).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({ id: '3' });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('logs a load failure', async () => {
    vi.mocked(getTechnicalCheckForm).mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useTechnicalCheckFormDetail('vehicle', '3'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(console.error).toHaveBeenCalled();
  });
});
