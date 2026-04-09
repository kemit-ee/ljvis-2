import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { SideNavProps, SideNavItem } from '@tedi-design-system/react/community';
import { useAuth } from '../features/auth/AuthContext';

export function useSideNavProps(): SideNavProps<typeof Link> {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { hasAnyPermission } = useAuth();

  const navItems: SideNavItem<typeof Link>[] = React.useMemo(() => {
    const items: SideNavItem<typeof Link>[] = [];

    if (hasAnyPermission(['perm_user_list_admin', 'perm_user_list_local'])) {
      items.push({
        children: t('nav.users'),
        to: '/users',
        icon: 'people',
        isActive: pathname.startsWith('/users'),
      });
    }

    if (hasAnyPermission(['perm_user_group_list_admin', 'perm_user_group_list_local'])) {
      items.push({
        children: t('nav.userGroups'),
        to: '/user-groups',
        icon: 'groups',
        isActive: pathname.startsWith('/user-groups'),
      });
    }

    return items;
  }, [pathname, t, hasAnyPermission]);

  return {
    linkAs: Link,
    navItems,
    ariaLabel: 'Main navigation',
    showDividers: true,
  };
}
