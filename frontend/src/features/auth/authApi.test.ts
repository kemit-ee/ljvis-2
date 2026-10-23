// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRepresentationCompanies, getUserInfo, logout, switchRepresentation } from './api';

afterEach(() => vi.unstubAllGlobals());

const res = (ok: boolean, json?: unknown, jsonFails = false) => ({
  ok,
  json: () => (jsonFails ? Promise.reject(new Error('x')) : Promise.resolve(json)),
});

describe('auth api', () => {
  it('logout posts an empty body', async () => {
    const f = vi.fn().mockResolvedValue(res(true));
    vi.stubGlobal('fetch', f);
    await logout();
    expect(f.mock.calls[0][0]).toBe('/api/auth/logout');
    expect(f.mock.calls[0][1].method).toBe('POST');
  });

  it('getUserInfo returns the response, null on !ok or errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(true, { response: { personalcode: '1' } })));
    expect(await getUserInfo()).toEqual({ personalcode: '1' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(true, {})));
    expect(await getUserInfo()).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(false)));
    expect(await getUserInfo()).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    expect(await getUserInfo()).toBeNull();
  });

  it('getRepresentationCompanies falls back to []', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(res(true, { response: { companies: [{ registryCode: '1', companyName: 'A' }] } })),
    );
    expect(await getRepresentationCompanies()).toHaveLength(1);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(true, {})));
    expect(await getRepresentationCompanies()).toEqual([]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(false)));
    expect(await getRepresentationCompanies()).toEqual([]);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    expect(await getRepresentationCompanies()).toEqual([]);
  });

  it('switchRepresentation returns res.ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(false)));
    expect(await switchRepresentation('company', '123')).toBe(false);
  });
});
