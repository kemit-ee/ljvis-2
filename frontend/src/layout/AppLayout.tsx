import { Outlet } from 'react-router-dom';
import { Layout } from '@tedi-design-system/react/community';
import { useHeaderProps } from './useHeaderProps';
import { useFooterProps } from './useFooterProps';
import { useSideNavProps } from './useSideNavProps';

export function AppLayout() {
  const headerProps = useHeaderProps();
  const footerProps = useFooterProps();
  const sideNavProps = useSideNavProps();

  return (
    <Layout header={headerProps} footer={footerProps} sideNav={sideNavProps}>
      <Outlet />
    </Layout>
  );
}
