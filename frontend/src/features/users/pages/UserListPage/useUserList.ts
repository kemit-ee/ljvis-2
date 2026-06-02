import { usePaginatedList } from '../../../../hooks/usePaginatedList';
import { listUsers } from '../../api';
import type { UserListItem } from '../../types';

function expandUserRows(result: UserListItem[]): UserListItem[] {
  const expanded: UserListItem[] = [];
  result.forEach((user) => {
    const groups = user.userGroups ?? [];
    if (groups.length > 0) {
      groups.forEach((group, index) => {
        expanded.push({ ...user, userGroups: [group], isAdditionalGroupRow: index > 0 });
      });
    } else {
      expanded.push(user);
    }
  });
  return expanded;
}

export function useUserList() {
  return usePaginatedList(listUsers, {
    defaultSort: 'status asc',
    transform: expandUserRows,
  });
}
