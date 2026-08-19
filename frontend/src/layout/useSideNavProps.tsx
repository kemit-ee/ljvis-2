import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SideNav } from '@tedi-design-system/react/tedi';
import { useAuth } from '../features/auth/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  BREAKPOINTS,
  PERMISSIONS,
  FORM_READ_PERMISSIONS,
} from '../constants/constants';
import styles from './SideNavWrapper.module.css';

interface UseSideNavPropsResult {
  sideNav: React.ReactNode;
  toggleButton: React.ReactNode;
  isMobileOpen: boolean;
  isDesktop: boolean;
  closeSideNav: () => void;
}

export function useSideNavProps(): UseSideNavPropsResult {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { hasPermission, hasAnyPermission } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);

  React.useEffect(() => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [pathname]);

  const navItems = React.useMemo(() => {
    const items: Parameters<typeof SideNav>[0]['navItems'] = [];

    const adminSubItems = [];

    items.push({
      children: t('nav.desktop'),
      icon: 'dashboard',
      to: '/',
      isActive: pathname === '/',
    });


    if (hasAnyPermission(FORM_READ_PERMISSIONS)) {
      items.push({
        children: t('nav.search'),
        icon: 'search',
        to: '/search',
        isActive: pathname.startsWith('/search'),
      });
    }

    if (
      hasAnyPermission([
        PERMISSIONS.USER_LIST_ADMIN,
        PERMISSIONS.USER_LIST_LOCAL,
      ])
    ) {
      adminSubItems.push({
        children: t('nav.users'),
        to: '/users',
        isActive: pathname.startsWith('/users'),
      });
    }

    if (
      hasAnyPermission([
        PERMISSIONS.USER_GROUP_LIST_ADMIN,
        PERMISSIONS.USER_GROUP_LIST_LOCAL,
      ])
    ) {
      adminSubItems.push({
        children: t('nav.userGroups'),
        to: '/user-groups',
        isActive: pathname.startsWith('/user-groups'),
      });
    }

    if (hasPermission(PERMISSIONS.CLASSIFIER_LIST)) {
      adminSubItems.push({
        children: t('nav.classifiers'),
        to: '/classifiers',
        isActive: pathname.startsWith('/classifiers'),
      });
    }

    if (hasPermission(PERMISSIONS.CTUD_READ)) {
      items.push({
        children: t('nav.ctud'),
        icon: 'sync_alt',
        to: '/erru/ctud',
        isActive: pathname.startsWith('/erru/ctud'),
      });
    }

    if (hasPermission(PERMISSIONS.CGR_READ)) {
      items.push({
        children: t('nav.cgr'),
        icon: 'fact_check',
        to: '/erru/cgr',
        isActive: pathname.startsWith('/erru/cgr'),
      });
    }

    if (hasPermission(PERMISSIONS.RSI_READ)) {
      items.push({
        children: t('nav.rsi'),
        icon: 'directions_car',
        to: '/erru/rsi',
        isActive: pathname.startsWith('/erru/rsi'),
      });
    }

    if (hasPermission(PERMISSIONS.NCR_LIST)) {
      items.push({
        children: t('nav.ncr'),
        icon: 'gpp_bad',
        to: '/erru/ncr',
        isActive: pathname.startsWith('/erru/ncr'),
      });
    }

    if (hasPermission(PERMISSIONS.AUDIT_READ)) {
      adminSubItems.push({
        children: t('nav.logs'),
        to: '/logs',
        isActive: pathname.startsWith('/logs'),
      });
    }

    const adminIsActive = adminSubItems.some((item) => item.isActive);

    items.push({
      children: t('nav.administration'),
      icon: 'account_circle',
      isActive: adminIsActive,
      isDefaultOpen: adminIsActive,
      subItems: adminSubItems,
    });

    return items;
  }, [pathname, t, hasPermission, hasAnyPermission]);

  const getWrapperClassName = () => {
    const classes = [styles.wrapper];

    if (isDesktop) {
      classes.push(styles['wrapper-desktop']);
      classes.push(
        isCollapsed
          ? styles['wrapper-desktop-collapsed']
          : styles['wrapper-desktop-expanded'],
      );
    } else {
      classes.push(styles['wrapper-mobile']);
      classes.push(
        isMobileOpen
          ? styles['wrapper-mobile-visible']
          : styles['wrapper-mobile-hidden'],
      );
    }

    return classes.join(' ');
  };

  const adminIsActive = navItems
    .flatMap((item) => item.subItems ?? [])
    .some((sub) => sub.isActive);

  return {
    sideNav: (
      <div className={getWrapperClassName()}>
        <SideNav
          key={adminIsActive ? 'sidenav-admin-open' : 'sidenav'}
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
