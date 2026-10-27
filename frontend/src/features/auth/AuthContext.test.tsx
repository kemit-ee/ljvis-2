// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => ({
  getUserInfo: vi.fn(),
  getRepresentationCompanies: vi.fn(),
  switchRepresentation: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('./api', () => api);

import { AuthProvider, useAuth } from './AuthContext';
import { useAuth as useAuthReexport } from './useAuth';
import { get } from '../../shared/api/client';

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AuthProvider', () => {
  it('re-exports useAuth', () => {
    expect(useAuthReexport).toBe(useAuth);
  });

  it('has safe defaults outside a provider', async () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
    expect(result.current.hasPermission('x')).toBe(false);
    expect(result.current.hasAnyPermission(['x'])).toBe(false);
    await result.current.refetchUser();
    await result.current.logout();
    expect(await result.current.fetchRepresentationCompanies()).toEqual([]);
    expect(await result.current.switchRepresentation('officer')).toBe(false);
  });

  it('loads user with array permissions', async () => {
    api.getUserInfo.mockResolvedValue({ personalcode: '1', permissions: ['a', '', 'b'] });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.permissions).toEqual(['a', 'b']);
    expect(result.current.hasPermission('a')).toBe(true);
    expect(result.current.hasAnyPermission(['z', 'b'])).toBe(true);
    expect(result.current.hasAnyPermission(['z'])).toBe(false);
  });

  it('parses comma separated permissions', async () => {
    api.getUserInfo.mockResolvedValue({ personalcode: '1', permissions: 'a,b,' });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.permissions).toEqual(['a', 'b']));
  });

  it('handles missing user / missing permissions / failure', async () => {
    api.getUserInfo.mockResolvedValue({ personalcode: '1' });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.permissions).toEqual([]);

    api.getUserInfo.mockRejectedValue(new Error('x'));
    await act(() => result.current.refetchUser());
    expect(result.current.user).toBeNull();
  });

  it('logout clears the user', async () => {
    api.getUserInfo.mockResolvedValue({ personalcode: '1', permissions: ['a'] });
    api.logout.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());
    await act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(result.current.permissions).toEqual([]);
  });

  it('switchRepresentation refetches only on success', async () => {
    api.getUserInfo.mockResolvedValue({ personalcode: '1', permissions: [] });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    api.getUserInfo.mockClear();

    api.switchRepresentation.mockResolvedValueOnce(false);
    await act(async () => {
      expect(await result.current.switchRepresentation('officer')).toBe(false);
    });
    expect(api.getUserInfo).not.toHaveBeenCalled();

    api.switchRepresentation.mockResolvedValueOnce(true);
    await act(async () => {
      expect(await result.current.switchRepresentation('company', '1')).toBe(true);
    });
    expect(api.getUserInfo).toHaveBeenCalledOnce();
  });

  it('delegates fetchRepresentationCompanies', async () => {
    api.getUserInfo.mockResolvedValue(null);
    api.getRepresentationCompanies.mockResolvedValue([{ registryCode: '1', companyName: 'A' }]);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(await result.current.fetchRepresentationCompanies()).toHaveLength(1);
  });

  it('clears the user when an API call returns 401', async () => {
    api.getUserInfo.mockResolvedValue({ personalcode: '1', permissions: ['a'] });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve(null) }));
    await act(async () => {
      await get('/x').catch(() => {});
    });
    expect(result.current.user).toBeNull();
  });
});
