import { Outlet } from 'react-router-dom';
import { Layout, Header, Footer } from '@tedi-design-system/react/community';
import { useHeaderProps } from './useHeaderProps';
import { useFooterProps } from './useFooterProps';
import { useSideNavProps } from './useSideNavProps';

export function AppLayout() {
  const { sideNav, toggleButton, isMobileOpen, isDesktop, closeSideNav } = useSideNavProps();
  const headerProps = useHeaderProps(toggleButton);
  const footerProps = useFooterProps();

  return (
    <>
      {!isDesktop && sideNav}
      {!isDesktop && isMobileOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 111,
          }}
          onClick={closeSideNav}
        />
      )}
      <Layout header={headerProps} footer={footerProps}>
          {toggleButton}
          <div style={{ display: isDesktop ? 'flex' : undefined, minHeight: '100%' }}>
          {sideNav}
          <main style={{ flex: isDesktop ? 1 : undefined, padding: '2rem' }}>
            <Outlet />
          </main>
        </div>
      </Layout>
    </>
  );
}
