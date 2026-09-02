import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SideNav, StatusBadge } from '@tedi-design-system/react/tedi';
import { useAuth } from '../features/auth/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  BREAKPOINTS,
  PERMISSIONS,
  FORM_READ_PERMISSIONS,
} from '../constants/constants';
import { useNotificationCount } from '../features/notifications/useNotifications';
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
  const { hasPermission, hasAnyPermission, user } = useAuth();
  const { unreadCount } = useNotificationCount();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const isDesktop = useMediaQuery(BREAKPOINTS.DESKTOP);
  const isCitizen = user?.activeRole !== 'officer';

  React.useEffect(() => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [pathname]);

  const navItems = React.useMemo(() => {
    const items: Parameters<typeof SideNav>[0]['navItems'] = [];

    // Citizen sessions (citizen-self / company) have no
    // permissions and get no side menu at all — the dashboard
    // (CitizenDashboardPage) is the only citizen page, reached directly at
    // "/"; there's nothing to navigate to.
    if (isCitizen) {
      return items;
    }

    const adminSubItems = [];

    items.push({
      children: t('nav.desktop'),
      icon: 'dashboard',
      to: '/',
      isActive: pathname === '/',
    });

    items.push({
      children: (
        <>
          {t('nav.notifications')}
          {unreadCount > 0 && (
            <span style={{ marginLeft: 8 }}>
              <StatusBadge color="danger">
                {unreadCount > 99 ? '99+' : String(unreadCount)}
              </StatusBadge>
            </span>
          )}
        </>
      ),
      icon: 'notifications',
      to: '/notifications',
      isActive: pathname.startsWith('/notifications'),
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

    if (
      hasPermission(PERMISSIONS.AUDIT_READ) ||
      hasPermission(PERMISSIONS.AUDIT_READ_LOCAL)
    ) {
      adminSubItems.push({
        children: t('nav.logs'),
        to: '/logs',
        isActive: pathname.startsWith('/logs'),
      });
    }

    if (hasPermission(PERMISSIONS.RISK_REPORT_LIST)) {
      adminSubItems.push({
        children: t('nav.riskLevels'),
        to: '/admin/risk-scores',
        isActive: pathname.startsWith('/admin/risk-scores'),
      });
    }

    const adminIsActive = adminSubItems.some((item) => item.isActive);

    if (adminSubItems.length > 0) {
      items.push({
        children: t('nav.administration'),
        icon: 'account_circle',
        isActive: adminIsActive,
        isDefaultOpen: adminIsActive,
        subItems: adminSubItems,
      });
    }

    return items;
  }, [pathname, t, hasPermission, hasAnyPermission, isCitizen, unreadCount]);

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

  // No items means no side menu at all for a citizen session — not
  // even an empty SideNav shell — so the main content area gets the full
  // width instead of leaving a chrome-only column/toggle button.
  if (isCitizen) {
    return {
      sideNav: null,
      toggleButton: null,
      isMobileOpen: false,
      isDesktop,
      closeSideNav: () => {},
    };
  }

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
