// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/client';

const api = vi.hoisted(() => ({
  getCtudRequest: vi.fn(),
  sendCtudRequest: vi.fn(),
  getCgrRequest: vi.fn(),
  sendCgrRequest: vi.fn(),
  resendCgrRequest: vi.fn(),
  getRsiMessage: vi.fn(),
  sendRsiMessage: vi.fn(),
  getNuMessage: vi.fn(),
  sendNuMessage: vi.fn(),
  getNcrCase: vi.fn(),
}));
vi.mock('../api', () => api);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { useCgrRequestDetail } from './cgr/useCgrRequestDetail';
import { sendErrorCode, useCtudRequestDetail } from './ctud/useCtudRequestDetail';
import { useNcrCase } from './ncr/useNcrCase';
import { useNuMessageDetail } from './nu/useNuMessageDetail';
import { useRsiMessageDetail } from './rsi/useRsiMessageDetail';

const apiError = (code?: string) => new ApiError('x', 502, code ? { code } : null);

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('useCtudRequestDetail', () => {
  it('sendErrorCode keeps known codes only', () => {
    expect(sendErrorCode(apiError('send_unknown'))).toBe('send_unknown');
    expect(sendErrorCode(apiError('weird'))).toBe('send_failed');
    expect(sendErrorCode(new Error('x'))).toBe('send_failed');
  });

  it('loads, sends and reloads; records the failure code', async () => {
    api.getCtudRequest.mockResolvedValue({ id: 1 });
    api.sendCtudRequest.mockResolvedValueOnce({}).mockRejectedValueOnce(apiError('send_unknown'));
    const { result } = renderHook(() => useCtudRequestDetail('1'));
    await waitFor(() => expect(result.current.request).toEqual({ id: 1 }));
    await act(() => result.current.send());
    expect(result.current.sendError).toBeNull();
    await act(() => result.current.send());
    expect(result.current.sendError).toBe('send_unknown');
    expect(api.getCtudRequest).toHaveBeenCalledTimes(3);
  });

  it('does nothing without an id', async () => {
    const { result } = renderHook(() => useCtudRequestDetail(undefined));
    await act(() => result.current.send());
    expect(api.sendCtudRequest).not.toHaveBeenCalled();
  });

  it('reports not found when loading fails', async () => {
    api.getCtudRequest.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useCtudRequestDetail('1'));
    await waitFor(() => expect(result.current.notFound).toBe(true));
  });
});

describe('useCgrRequestDetail', () => {
  it('sends and resends, mapping error codes', async () => {
    api.getCgrRequest.mockResolvedValue({ id: 1 });
    api.sendCgrRequest.mockRejectedValueOnce(apiError('invalid_cgr_xml')).mockResolvedValueOnce({});
    api.resendCgrRequest.mockRejectedValueOnce(apiError()).mockResolvedValueOnce({});
    const { result } = renderHook(() => useCgrRequestDetail('1'));
    await waitFor(() => expect(result.current.request).toBeTruthy());
    await act(() => result.current.send());
    expect(result.current.sendError).toBe('invalid_cgr_xml');
    await act(() => result.current.send());
    expect(result.current.sendError).toBeNull();
    await act(() => result.current.resend('LV'));
    expect(result.current.sendError).toBe('send_failed');
    await act(() => result.current.resend('LV'));
    expect(result.current.sendError).toBeNull();
    expect(result.current.resendingCountry).toBeNull();
    expect(api.resendCgrRequest).toHaveBeenCalledWith('1', 'LV');
  });

  it('ignores actions without an id', async () => {
    const { result } = renderHook(() => useCgrRequestDetail(undefined));
    await act(async () => {
      await result.current.send();
      await result.current.resend('LV');
    });
    expect(api.sendCgrRequest).not.toHaveBeenCalled();
    expect(api.resendCgrRequest).not.toHaveBeenCalled();
  });
});

describe('useRsiMessageDetail', () => {
  it('maps send failures', async () => {
    api.getRsiMessage.mockResolvedValue({ id: 1 });
    api.sendRsiMessage
      .mockRejectedValueOnce(apiError('invalid_checked_items'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({});
    const { result } = renderHook(() => useRsiMessageDetail('1'));
    await waitFor(() => expect(result.current.message).toBeTruthy());
    await act(() => result.current.send());
    expect(result.current.sendError).toBe('invalid_checked_items');
    await act(() => result.current.send());
    expect(result.current.sendError).toBe('send_failed');
    await act(() => result.current.send());
    expect(result.current.sendError).toBeNull();
  });

  it('ignores send without an id', async () => {
    const { result } = renderHook(() => useRsiMessageDetail(undefined));
    await act(() => result.current.send());
    expect(api.sendRsiMessage).not.toHaveBeenCalled();
  });
});

describe('useNuMessageDetail', () => {
  it('sends the loaded version and surfaces translated errors', async () => {
    api.getNuMessage.mockResolvedValue({ id: 1, version: 4 });
    api.sendNuMessage.mockResolvedValueOnce({}).mockRejectedValueOnce(apiError('send_failed'));
    const { result } = renderHook(() => useNuMessageDetail('1'));
    await waitFor(() => expect(result.current.message).toBeTruthy());
    expect(api.getNuMessage).toHaveBeenCalledWith('1', undefined);
    await act(() => result.current.send());
    expect(api.sendNuMessage).toHaveBeenCalledWith('1', 4);
    await act(() => result.current.send());
    expect(result.current.sendError).toBe('erru.nu.validation.send_failed');
  });

  it('does not send when viewing a historic snapshot or without data', async () => {
    api.getNuMessage.mockResolvedValue({ id: 1, version: 4 });
    const { result } = renderHook(() => useNuMessageDetail('1', '7'));
    await waitFor(() => expect(result.current.message).toBeTruthy());
    expect(api.getNuMessage).toHaveBeenCalledWith('1', '7');
    await act(() => result.current.send());
    expect(api.sendNuMessage).not.toHaveBeenCalled();
  });
});

describe('useNcrCase', () => {
  it('exposes the last snapshot as current', async () => {
    api.getNcrCase.mockResolvedValue({ snapshots: [{ v: 1 }, { v: 2 }] });
    const { result } = renderHook(() => useNcrCase('B1'));
    await waitFor(() => expect(result.current.current).toEqual({ v: 2 }));
    expect(result.current.snapshots).toHaveLength(2);
  });

  it('is empty before data arrives', () => {
    api.getNcrCase.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useNcrCase('B1'));
    expect(result.current.current).toBeUndefined();
    expect(result.current.snapshots).toEqual([]);
  });
});
