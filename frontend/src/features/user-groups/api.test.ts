import { afterEach, describe, expect, it, vi } from 'vitest';
import * as client from '../../shared/api/client';
import {
  addUserToGroup,
  deleteUserGroupUser,
  getUserGroup,
  getUserGroupAvailableUsers,
  getUserGroupOrganisations,
  getUserGroupPermissions,
  getUserGroupUsers,
  insertUserGroup,
  listUserGroups,
  setUserGroupOrganisations,
  setUserGroupPermissions,
  updateUserGroupName,
} from './api';

afterEach(() => vi.restoreAllMocks());

describe('user-groups api', () => {
  it('listUserGroups nimetab search q-ks ja teisendab id-d stringideks', async () => {
    const get = vi
      .spyOn(client, 'get')
      .mockResolvedValue({ content: [{ id: 5, name: 'G' }], total: 1 });
    const res = await listUserGroups('admin', { page: '1', search: 'x' });
    expect(get).toHaveBeenCalledWith('/v1/user-groups/admin/search', { page: '1', q: 'x' });
    expect(res.content[0].id).toBe('5');
    expect(res.total).toBe(1);
  });

  it('listUserGroups ilma parameetriteta', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ content: [], total: 0 });
    await listUserGroups('local');
    expect(get).toHaveBeenCalledWith('/v1/user-groups/local/search', {});
  });

  it('getUserGroup', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue([{ id: 3 }]);
    expect(await getUserGroup('local', '3')).toEqual([{ id: '3' }]);
    expect(get).toHaveBeenCalledWith('/v1/user-groups/local', { q: '3' });
  });

  it('getUserGroupOrganisations / Permissions', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue([]);
    await getUserGroupOrganisations('admin', '1');
    await getUserGroupPermissions('admin', '1');
    expect(get).toHaveBeenCalledWith('/v1/user-groups/admin/organisations', { q: '1' });
    expect(get).toHaveBeenCalledWith('/v1/user-groups/admin/permissions', { q: '1' });
  });

  it('getUserGroupUsers koostab parameetrid ja tühja vastuse korral tagastab []', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue(undefined as never);
    const res = await getUserGroupUsers('admin', {
      userGroupId: 4,
      page: '1',
      pageSize: '5',
      sorting: 'a asc',
      search: 's',
    });
    expect(res).toEqual([]);
    expect(get).toHaveBeenCalledWith('/v1/user-groups/admin/users', {
      q: '4',
      page: '1',
      pageSize: '5',
      sorting: 'a asc',
      search: 's',
    });
  });

  it('getUserGroupUsers ilma parameetriteta', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue([{ id: 1 }]);
    expect(await getUserGroupUsers('local')).toEqual([{ id: '1' }]);
    expect(get).toHaveBeenCalledWith('/v1/user-groups/local/users', {});
  });

  it('getUserGroupAvailableUsers', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue([{ id: 2 }]);
    const res = await getUserGroupAvailableUsers({ userGroupId: '1', organisationIds: '2' });
    expect(res).toEqual([{ id: '2' }]);
    expect(post).toHaveBeenCalledWith('/v1/user-groups/available-users', {
      userGroupId: '1',
      organisationIds: '2',
    });
  });

  it('kirjutavad päringud', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue([]);
    const put = vi.spyOn(client, 'put').mockResolvedValue('');
    await insertUserGroup({ name: 'n' });
    await updateUserGroupName('1', 'n');
    await setUserGroupOrganisations('1', [1], [2]);
    await setUserGroupPermissions('1', [3], [4]);
    await deleteUserGroupUser('1', '9');
    await addUserToGroup('1', ['9']);
    expect(post).toHaveBeenCalledWith('/v1/user-groups', { name: 'n' });
    expect(put).toHaveBeenCalledWith('/v1/user-groups', { id: '1', name: 'n' });
    expect(put).toHaveBeenCalledWith('/v1/user-groups/organisations', {
      id: '1',
      addedOrganisationIds: [1],
      removedOrganisationIds: [2],
    });
    expect(put).toHaveBeenCalledWith('/v1/user-groups/permissions', {
      id: '1',
      addedPermissionIds: [3],
      removedPermissionIds: [4],
    });
    expect(post).toHaveBeenCalledWith('/v1/user-groups/users/user', { q: '1', userId: '9' });
    expect(put).toHaveBeenCalledWith('/v1/user-groups/users', { id: '1', userIds: ['9'] });
  });
});
