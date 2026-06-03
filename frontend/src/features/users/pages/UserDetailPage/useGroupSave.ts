import { useEffect, useState } from 'react';
import type { UserGroupAssignment } from '../../types';
import type { UserGroup } from '../../../user-groups/types';
import { setUserGroups } from '../../api';
import { useAuth } from '../../../auth/useAuth';

export function useGroupSave(
  userId: string | undefined,
  groups: UserGroupAssignment[],
  allGroups: UserGroup[],
  onSaved: () => void,
) {
  const { hasPermission } = useAuth();
  const scope = hasPermission('user.edit.admin') ? 'admin' : 'local';
  const [allSelectedGroups, setAllSelectedGroups] = useState<UserGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  useEffect(() => {
    setAllSelectedGroups(
      groups.map((g) => ({ id: g.userGroupId, name: g.name })),
    );
  }, [groups]);

  const availableGroups = allGroups.filter(
    (g) => !allSelectedGroups.some((s) => s.id === g.id),
  );

  const hasGroupChanges = (() => {
    const originalIds = new Set(groups.map((g) => g.userGroupId));
    const currentIds = new Set(allSelectedGroups.map((g) => g.id));
    return (
      originalIds.size !== currentIds.size ||
      [...originalIds].some((id) => !currentIds.has(id))
    );
  })();

  const getRemovedGroups = (): UserGroup[] => {
    if (groups.length === 0) return [];
    const currentIds = new Set(allSelectedGroups.map((g) => g.id));
    return groups
      .filter((g) => !currentIds.has(g.userGroupId))
      .map((g) => ({ id: g.userGroupId, name: g.name }));
  };

  const handleGroupSave = async () => {
    if (!userId) return;
    try {
      const originalIds = new Set(groups.map((g) => g.userGroupId));
      const addedGroupIds = allSelectedGroups
        .filter((g) => !originalIds.has(g.id))
        .map((g) => g.id);
      await setUserGroups(
        scope,
        userId,
        addedGroupIds,
        getRemovedGroups().map((g) => g.id),
      );
      onSaved();
    } catch (e) {
      console.error('Failed to save groups', e);
    }
  };

  const resetGroups = () => {
    setAllSelectedGroups(
      groups.map((g) => ({ id: g.userGroupId, name: g.name })),
    );
    setSelectedGroupId('');
  };

  return {
    allSelectedGroups,
    setAllSelectedGroups,
    selectedGroupId,
    setSelectedGroupId,
    availableGroups,
    hasGroupChanges,
    handleGroupSave,
    resetGroups,
  };
}
