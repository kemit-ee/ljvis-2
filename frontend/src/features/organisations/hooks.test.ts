// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOrganisations } from './hooks';
import { listOrganisations } from './api';
import * as client from '../../shared/api/client';

vi.mock('./api', () => ({ listOrganisations: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe('useOrganisations', () => {
  it('laeb organisatsioonid ja lõpetab laadimise', async () => {
    vi.mocked(listOrganisations).mockResolvedValue([{ id: 1, name: 'Org', code: 'O1' }]);
    const { result } = renderHook(() => useOrganisations());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.organisations).toEqual([{ id: 1, name: 'Org', code: 'O1' }]);
  });

  it('vea korral jääb nimekiri tühjaks ja laadimine lõpeb', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(listOrganisations).mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useOrganisations());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.organisations).toEqual([]);
    expect(err).toHaveBeenCalled();
  });
});

describe('listOrganisations', () => {
  it('kutsub õiget otspunkti', async () => {
    const actual = await vi.importActual<typeof import('./api')>('./api');
    const get = vi.spyOn(client, 'get').mockResolvedValue([]);
    await actual.listOrganisations();
    expect(get).toHaveBeenCalledWith('/v1/organisations');
  });
});
