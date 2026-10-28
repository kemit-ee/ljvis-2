// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTransportInterruptionFormDetail } from './useTransportInterruptionFormDetail';
import { getTransportInterruptionForm } from '../../api';

vi.mock('../../api', () => ({ getTransportInterruptionForm: vi.fn() }));

describe('useTransportInterruptionFormDetail', () => {
  beforeEach(() => {
    vi.mocked(getTransportInterruptionForm).mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not load without an id', async () => {
    const { result } = renderHook(() => useTransportInterruptionFormDetail(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getTransportInterruptionForm).not.toHaveBeenCalled();
    expect(result.current.form).toBeNull();
  });

  it('loads the form and supports refetch', async () => {
    vi.mocked(getTransportInterruptionForm).mockResolvedValue({ id: '3' } as never);
    const { result } = renderHook(() => useTransportInterruptionFormDetail('3'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.form).toEqual({ id: '3' }));
    expect(result.current.loading).toBe(false);
    await act(async () => {
      await result.current.refetch();
    });
    expect(getTransportInterruptionForm).toHaveBeenCalledTimes(2);
  });

  it('ignores a refetch while a request is already running', async () => {
    let resolve: (v: unknown) => void = () => {};
    vi.mocked(getTransportInterruptionForm).mockReturnValue(new Promise((r) => { resolve = r; }) as never);
    const { result } = renderHook(() => useTransportInterruptionFormDetail('3'));
    await act(async () => {
      await result.current.refetch();
    });
    expect(getTransportInterruptionForm).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({ id: '3' });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('logs a load failure and stops loading', async () => {
    vi.mocked(getTransportInterruptionForm).mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useTransportInterruptionFormDetail('3'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(console.error).toHaveBeenCalled();
    expect(result.current.form).toBeNull();
  });
});
