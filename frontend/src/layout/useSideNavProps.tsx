import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { SideNavProps, SideNavItem } from '@tedi-design-system/react/community';

export function useSideNavProps(): SideNavProps<typeof Link> {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const navItems: SideNavItem<typeof Link>[] = React.useMemo(
    () => [
      {
        children: t('nav.users'),
        to: '/users',
        icon: 'people',
        isActive: pathname.startsWith('/users'),
      },
      {
        children: t('nav.userGroups'),
        to: '/user-groups',
        icon: 'groups',
        isActive: pathname.startsWith('/user-groups'),
      },
    ],
    [pathname, t],
  );

  return {
    linkAs: Link,
    navItems,
    ariaLabel: 'Main navigation',
    showDividers: true,
  };
}
