import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { SideNavProps, SideNavItem } from '@tedi-design-system/react/tedi';
import { SideNav } from '@tedi-design-system/react/tedi';
import { useAuth } from '../features/auth/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BREAKPOINTS, PERMISSIONS } from '../constants/constants';
import styles from './SideNavWrapper.module.css';

export function useSideNavProps(): SideNavProps<typeof Link> {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { hasAnyPermission } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  React.useEffect(() => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [pathname]);

  const navItems: SideNavItem<typeof Link>[] = React.useMemo(() => {
    const items: SideNavItem<typeof Link>[] = [];

    const adminSubItems = [];

    items.push({
      children: t('nav.desktop'),
      icon: 'dashboard',
      to: '/',
      isActive: pathname === '/'
    });

    if (hasAnyPermission([PERMISSIONS.USER_LIST_ADMIN, PERMISSIONS.USER_LIST_LOCAL])) {
      adminSubItems.push({
        children: t('nav.users'),
        to: '/users',
        isActive: pathname.startsWith('/users')
      });
    }

    if (hasAnyPermission([PERMISSIONS.USER_GROUP_LIST_ADMIN, PERMISSIONS.USER_GROUP_LIST_LOCAL])) {
      adminSubItems.push({
        children: t('nav.userGroups'),
        to: '/user-groups',
        isActive: pathname.startsWith('/user-groups')
      });
    }

    items.push({
      children: t('nav.administration'),
      icon: 'account_circle',
      subItems: adminSubItems
    });

    return items;
  }, [pathname, t, hasAnyPermission]);

  const getWrapperClassName = () => {
    const classes = [styles.wrapper];
    
    if (isDesktop) {
      classes.push(styles.wrapperDesktop);
      classes.push(isCollapsed ? styles.wrapperDesktopCollapsed : styles.wrapperDesktopExpanded);
    } else {
      classes.push(styles.wrapperMobile);
      classes.push(isMobileOpen ? styles.wrapperMobileVisible : styles.wrapperMobileHidden);
    }
    
    return classes.join(' ');
  };

  return {
    sideNav: (
      <div className={getWrapperClassName()}>
        <SideNav
          linkAs={Link}
          navItems={navItems}
          ariaLabel="Main navigation"
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
          onCollapseToggle={setIsCollapsed}
        />
      </div>
    ),
    toggleButton: !isDesktop ? (
      <SideNav.Toggle 
        menuOpen={isMobileOpen} 
        toggleMenu={() => setIsMobileOpen(!isMobileOpen)}
        variant="mobile"
      />
    ) : null,
    isMobileOpen,
    isDesktop,
    closeSideNav: () => setIsMobileOpen(false),
  };
}
