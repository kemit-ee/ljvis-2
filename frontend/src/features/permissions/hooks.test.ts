// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePermissions } from './hooks';
import { listPermissions } from './api';
import * as client from '../../shared/api/client';

vi.mock('./api', () => ({ listPermissions: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe('usePermissions', () => {
  it('laeb õigused ja lõpetab laadimise', async () => {
    vi.mocked(listPermissions).mockResolvedValue([{ id: 1, code: "P1", description: "d" }]);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.permissions).toEqual([{ id: 1, code: "P1", description: "d" }]);
  });

  it('vea korral jääb nimekiri tühjaks ja laadimine lõpeb', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(listPermissions).mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => usePermissions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.permissions).toEqual([]);
    expect(err).toHaveBeenCalled();
  });
});

describe('listPermissions', () => {
  it('kutsub õiget otspunkti', async () => {
    const actual = await vi.importActual<typeof import('./api')>('./api');
    const get = vi.spyOn(client, 'get').mockResolvedValue([]);
    await actual.listPermissions();
    expect(get).toHaveBeenCalledWith('/v1/permissions');
  });
});
