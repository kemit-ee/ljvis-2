import * as React from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BREADCRUMB_ROUTES, type BreadcrumbRouteEntry } from './routes';

export interface BreadcrumbEntry {
  to: string;
  label: string;
}

function findRoute(pathname: string): BreadcrumbRouteEntry | undefined {
  return BREADCRUMB_ROUTES.find((route) =>
    matchPath({ path: route.pattern, end: true }, pathname),
  );
}

function fillParams(pattern: string, params: Record<string, string | undefined>): string {
  return pattern.replace(/:([a-zA-Z0-9]+)/g, (_, key: string) => params[key] ?? '');
}

/**
 * Builds the breadcrumb trail for the current route from the static registry
 * in `./routes`. The last entry is the current page, every entry before it
 * is an ancestor. The root "Dashboard" crumb is prepended automatically
 * (unless we're already on the dashboard, in which case `undefined` is
 * returned and no breadcrumb bar is shown at all).
 */
export function useBreadcrumbs(): BreadcrumbEntry[] | undefined {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  return React.useMemo(() => {
    if (pathname === '/') return undefined;

    let route = findRoute(pathname);
    if (!route) return undefined;

    let match = matchPath({ path: route.pattern, end: true }, pathname);
    const chain: BreadcrumbEntry[] = [{ to: pathname, label: t(route.labelKey) }];

    // Walk up the parent chain, guarding against accidental cycles in the
    // registry.
    let guard = 0;
    while (route.parent && route.parent !== pathname && guard++ < 10) {
      const parentPath = fillParams(route.parent, (match?.params ?? {}) as Record<
        string,
        string | undefined
      >);
      if (parentPath === '/') break;
      const parentRoute = findRoute(parentPath);
      if (!parentRoute) break;
      chain.unshift({ to: parentPath, label: t(parentRoute.labelKey) });
      route = parentRoute;
      match = matchPath({ path: route.pattern, end: true }, parentPath);
    }

    chain.unshift({ to: '/', label: t('nav.desktop') });

    return chain;
  }, [pathname, t]);
}
