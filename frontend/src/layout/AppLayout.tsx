import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from '@tedi-design-system/react/community';
import { useHeaderProps } from './useHeaderProps';
import { useFooterProps } from './useFooterProps';
import { useSideNavProps } from './useSideNavProps';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const { sideNav, toggleButton, isMobileOpen, isDesktop, closeSideNav } =
    useSideNavProps();

  useEffect(() => {
    const footer = document.querySelector('footer');
    const main = document.querySelector('main');
    const update = () => {
      if (footer) {
        document.documentElement.style.setProperty(
          '--app-footer-height',
          `${footer.getBoundingClientRect().height}px`,
        );
      }
    };
    const observer = new ResizeObserver(update);
    if (footer) observer.observe(footer);
    if (main) observer.observe(main);
    update();
    return () => observer.disconnect();
  }, []);

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
