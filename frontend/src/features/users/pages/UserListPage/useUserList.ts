import { useCallback } from 'react';
import { usePaginatedList } from '../../../../hooks/usePaginatedList';
import type { ListParams } from '../../../../hooks/usePaginatedList';
import { listUsers } from '../../api';
import type { UserListItem } from '../../types';
import { useAuth } from '../../../auth/useAuth';

function expandUserRows(result: UserListItem[]): UserListItem[] {
  const expanded: UserListItem[] = [];
  result.forEach((user) => {
    const groups = user.userGroups ?? [];
    if (groups.length > 0) {
      groups.forEach((group, index) => {
        expanded.push({
          ...user,
          userGroups: [group],
          isAdditionalGroupRow: index > 0,
        });
      });
    } else {
      expanded.push(user);
    }
  });
  return expanded;
}

export function useUserList() {
  const { hasPermission } = useAuth();
  const scope = hasPermission('user.list.admin') ? 'admin' : 'local';
  const fetchFn = useCallback(
    (params: ListParams) => listUsers(scope, params),
    [scope],
  );
  return usePaginatedList(fetchFn, {
    defaultSort: 'status asc',
    transform: expandUserRows,
  });
}
