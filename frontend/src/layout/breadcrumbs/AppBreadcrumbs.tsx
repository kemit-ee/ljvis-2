import { Link } from 'react-router-dom';
import { Breadcrumbs } from '@tedi-design-system/react/tedi';
import type { BreadcrumbEntry } from './useBreadcrumbs';

interface AppBreadcrumbsProps {
  crumbs: BreadcrumbEntry[];
}

/**
 * Renders a breadcrumb trail using the (non-deprecated) `tedi` Breadcrumbs
 * component, which takes crumb elements as children rather than a `crumbs`
 * array — the last child is the current page (plain text, `aria-current`),
 * every other child is a react-router `Link`.
 */
export function AppBreadcrumbs({ crumbs }: AppBreadcrumbsProps) {
  return (
    <Breadcrumbs>
      {crumbs.map((crumb, index) =>
        index === crumbs.length - 1 ? (
          <span key={crumb.to} aria-current="page">
            {crumb.label}
          </span>
        ) : (
          <Link key={crumb.to} to={crumb.to}>
            {crumb.label}
          </Link>
        ),
      )}
    </Breadcrumbs>
  );
}
