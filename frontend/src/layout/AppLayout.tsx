import { Outlet } from 'react-router-dom';
import { Layout } from '@tedi-design-system/react/community';
import { useHeaderProps } from './useHeaderProps';
import { useFooterProps } from './useFooterProps';
import { useSideNavProps } from './useSideNavProps';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const { sideNav, toggleButton, isMobileOpen, isDesktop, closeSideNav } =
    useSideNavProps();
  const headerProps = useHeaderProps();
  const footerProps = useFooterProps();

  return (
    <>
      {!isDesktop && sideNav}
      {!isDesktop && isMobileOpen && (
        <div className={styles['overlay']} onClick={closeSideNav} />
      )}
      <Layout header={headerProps} footer={footerProps}>
        <>
          {toggleButton}
          <div
            className={styles[isDesktop ? 'content-desktop' : 'content-mobile']}
          >
            {sideNav}
            <main
              className={styles[isDesktop ? 'main-desktop' : 'main-mobile']}
            >
              <Outlet />
            </main>
          </div>
        </>
      </Layout>
    </>
  );
}
