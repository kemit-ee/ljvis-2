import { useCallback, useEffect, useState } from 'react';
import type { User, UserGroupAssignment } from '../../types';
import { getUser, getUserGroups } from '../../api';

export function useUserDetail(id: string | undefined) {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<UserGroupAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [users, userGroups] = await Promise.all([
        getUser(id),
        getUserGroups(id),
      ]);
      setUser(users[0] ?? null);
      setGroups(userGroups);
    } catch (e) {
      console.error('Failed to load user', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isAccessExpired = user?.accessEnd
    ? new Date(user.accessEnd) < new Date()
    : false;

  return { user, groups, loading, isAccessExpired, refetch: fetchData };
}
