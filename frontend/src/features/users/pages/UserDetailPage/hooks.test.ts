// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGroupSave } from './useGroupSave';
import { useUserDetail } from './useUserDetail';
import { getUser, getUserGroups, setUserGroups } from '../../api';

let perms: string[] = [];

vi.mock('../../../auth/useAuth', () => {
  const ctx = { hasPermission: (c: string) => perms.includes(c) };
  return { useAuth: () => ctx };
});
vi.mock('../../api', () => ({
  getUser: vi.fn(),
  getUserGroups: vi.fn(),
  setUserGroups: vi.fn(),
}));

beforeEach(() => {
  perms = ['user.read.admin', 'user.edit.admin'];
});
afterEach(() => vi.clearAllMocks());

describe('useUserDetail', () => {
  it('laeb kasutaja ja grupid admin-ulatusega', async () => {
    vi.mocked(getUser).mockResolvedValue([{ id: '1', accessEnd: '2000-01-01' } as never]);
    vi.mocked(getUserGroups).mockResolvedValue([{ userGroupId: 'a', name: 'A' }]);
    const { result } = renderHook(() => useUserDetail('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getUser).toHaveBeenCalledWith('admin', '1');
    expect(result.current.user?.id).toBe('1');
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.isAccessExpired).toBe(true);
  });

  it('kohalik ulatus, kehtiv ligipääs ja puuduv kasutaja', async () => {
    perms = [];
    vi.mocked(getUser).mockResolvedValue([]);
    vi.mocked(getUserGroups).mockResolvedValue([]);
    const { result } = renderHook(() => useUserDetail('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getUser).toHaveBeenCalledWith('local', '1');
    expect(result.current.user).toBeNull();
    expect(result.current.isAccessExpired).toBe(false);
  });

  it('ilma id-ta ei lae; viga logitakse', async () => {
    const { result } = renderHook(() => useUserDetail(undefined));
    expect(getUser).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getUser).mockRejectedValue(new Error('x'));
    vi.mocked(getUserGroups).mockResolvedValue([]);
    const r2 = renderHook(() => useUserDetail('1'));
    await waitFor(() => expect(r2.result.current.loading).toBe(false));
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('refetch laeb uuesti', async () => {
    vi.mocked(getUser).mockResolvedValue([{ id: '1', accessEnd: null } as never]);
    vi.mocked(getUserGroups).mockResolvedValue([]);
    const { result } = renderHook(() => useUserDetail('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.refetch());
    expect(getUser).toHaveBeenCalledTimes(2);
  });
});

describe('useGroupSave', () => {
  const groups = [{ userGroupId: 'a', name: 'A' }, { userGroupId: 'b', name: 'B' }];
  const all = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
  // Stabiilne viide: hook sünkroniseerib valiku effektiga, mis sõltub groups-massiivi identiteedist.
  const noGroups: { userGroupId: string; name: string }[] = [];

  it('tuletab valitud ja saadaolevad grupid, muudatused ja lähtestamise', () => {
    const { result } = renderHook(() => useGroupSave('1', groups, all, vi.fn()));
    expect(result.current.allSelectedGroups.map((g) => g.id)).toEqual(['a', 'b']);
    expect(result.current.availableGroups.map((g) => g.id)).toEqual(['c']);
    expect(result.current.hasGroupChanges).toBe(false);

    act(() => result.current.setAllSelectedGroups((p) => [...p, all[2]]));
    expect(result.current.hasGroupChanges).toBe(true);
    act(() => result.current.setSelectedGroupId('c'));
    act(() => result.current.resetGroups());
    expect(result.current.hasGroupChanges).toBe(false);
    expect(result.current.selectedGroupId).toBe('');
  });

  it('salvestab lisatud ja eemaldatud grupid', async () => {
    vi.mocked(setUserGroups).mockResolvedValue('');
    const onSaved = vi.fn();
    const { result } = renderHook(() => useGroupSave('1', groups, all, onSaved));
    act(() =>
      result.current.setAllSelectedGroups([
        { id: 'a', name: 'A' },
        { id: 'c', name: 'C' },
      ]),
    );
    await act(() => result.current.handleGroupSave());
    expect(setUserGroups).toHaveBeenCalledWith('admin', '1', ['c'], ['b']);
    expect(onSaved).toHaveBeenCalled();
  });

  it('esimene grupi lisamine (algselt grupid puuduvad) ei eemalda midagi', async () => {
    vi.mocked(setUserGroups).mockResolvedValue('');
    perms = [];
    const { result } = renderHook(() => useGroupSave('1', noGroups, all, vi.fn()));
    act(() => result.current.setAllSelectedGroups([all[0]]));
    await act(() => result.current.handleGroupSave());
    expect(setUserGroups).toHaveBeenCalledWith('local', '1', ['a'], []);
  });

  it('ilma kasutaja id-ta ei salvesta; viga logitakse', async () => {
    const { result } = renderHook(() => useGroupSave(undefined, groups, all, vi.fn()));
    await act(() => result.current.handleGroupSave());
    expect(setUserGroups).not.toHaveBeenCalled();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(setUserGroups).mockRejectedValue(new Error('x'));
    const r2 = renderHook(() => useGroupSave('1', groups, all, vi.fn()));
    await act(() => r2.result.current.handleGroupSave());
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
