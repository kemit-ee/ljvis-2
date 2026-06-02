import { useCallback } from 'react';
import { usePaginatedList } from '../../../../hooks/usePaginatedList';
import type { ListParams, PagedResponse } from '../../../../hooks/usePaginatedList';
import type { UserGroup } from '../../types';
import { listUserGroups, getUserGroupOrganisations } from '../../api';

function expandGroupRows(result: UserGroup[]): UserGroup[] {
  const expanded: UserGroup[] = [];
  result.forEach((group) => {
    if (group.coversAllOrganisations) {
      expanded.push({ ...group, organisations: [] });
    } else {
      const orgs = group.organisations ?? [];
      if (orgs.length > 0) {
        orgs.forEach((org, index) => {
          expanded.push({
            ...group,
            organisations: [org],
            isAdditionalGroupRow: index > 0,
          });
        });
      } else {
        expanded.push({ ...group });
      }
    }
  });
  return expanded;
}

export function useUserGroupList() {
  const fetchFn = useCallback(async (params: ListParams): Promise<PagedResponse<UserGroup>> => {
    const paged = await listUserGroups(params);
    const content = await Promise.all(
      paged.content.map(async (group) => {
        if (params.search) {
          const groupOrgs = await getUserGroupOrganisations(group.id);
          return { ...group, organisations: groupOrgs.map((o) => o.name) };
        }
        return group;
      }),
    );
    return { content, total: paged.total };
  }, []);

  return usePaginatedList(fetchFn, {
    defaultSort: 'name asc',
    transform: expandGroupRows,
  });
}
