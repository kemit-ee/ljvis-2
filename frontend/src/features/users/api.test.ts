import { afterEach, describe, expect, it, vi } from 'vitest';
import * as client from '../../shared/api/client';
import {
  checkPersonalCodeConflict,
  getUser,
  getUserGroups,
  insertUser,
  listUsers,
  setUserGroups,
  updateUser,
} from './api';

afterEach(() => vi.restoreAllMocks());

const userData = {
  firstName: 'A',
  lastName: 'B',
  personalCode: '1',
  organisationId: '2',
  structuralUnitName: 's',
  jobTitleName: 'j',
  email: 'e',
  phone: 'p',
  accessStart: '2026-01-01',
  accessEnd: '2026-02-01',
};

describe('users api', () => {
  it('listUsers nimetab search q-ks', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ content: [], total: 0 });
    await listUsers('admin', { page: '1', search: 'x' });
    expect(get).toHaveBeenCalledWith('/v1/users/admin/search', { page: '1', q: 'x' });
  });

  it('listUsers ilma otsinguta', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ content: [], total: 0 });
    await listUsers('local', { page: '2' });
    expect(get).toHaveBeenCalledWith('/v1/users/local/search', { page: '2' });
  });

  it('getUser', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue([]);
    await getUser('local', '7');
    expect(get).toHaveBeenCalledWith('/v1/users/local', { q: '7' });
  });

  it('insertUser / updateUser', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue([]);
    const put = vi.spyOn(client, 'put').mockResolvedValue([]);
    await insertUser('admin', userData);
    await updateUser('admin', { ...userData, id: '1', status: 'ACTIVE' });
    expect(post).toHaveBeenCalledWith('/v1/users/admin', userData);
    expect(put).toHaveBeenCalledWith('/v1/users/admin', { ...userData, id: '1', status: 'ACTIVE' });
  });

  it('getUserGroups teisendab grupi id stringiks', async () => {
    vi.spyOn(client, 'get').mockResolvedValue([{ userGroupId: 4, name: 'g' }]);
    expect(await getUserGroups('admin', '1')).toEqual([{ userGroupId: '4', name: 'g' }]);
  });

  it('getUserGroups tühja vastuse korral tagastab []', async () => {
    vi.spyOn(client, 'get').mockResolvedValue(undefined as never);
    expect(await getUserGroups('admin', '1')).toEqual([]);
  });

  it('setUserGroups', async () => {
    const put = vi.spyOn(client, 'put').mockResolvedValue('');
    await setUserGroups('local', '1', ['2'], ['3']);
    expect(put).toHaveBeenCalledWith('/v1/users/local/groups', {
      userId: '1',
      addedGroupIds: ['2'],
      removedGroupIds: ['3'],
    });
  });

  it('checkPersonalCodeConflict vaikimisi id-ga', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue([]);
    await checkPersonalCodeConflict('admin', '39001010000');
    await checkPersonalCodeConflict('admin', '39001010000', '5');
    expect(post).toHaveBeenNthCalledWith(1, '/v1/users/admin/check-personal-code', {
      personalCode: '39001010000',
      id: '',
    });
    expect(post).toHaveBeenNthCalledWith(2, '/v1/users/admin/check-personal-code', {
      personalCode: '39001010000',
      id: '5',
    });
  });
});
