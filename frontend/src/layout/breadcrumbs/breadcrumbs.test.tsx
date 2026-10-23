// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }),
});

import { AppBreadcrumbs } from './AppBreadcrumbs';
import { useBreadcrumbs } from './useBreadcrumbs';
import { BREADCRUMB_ROUTES } from './routes';

afterEach(cleanup);

const wrapperAt = (path: string) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
  };

describe('useBreadcrumbs', () => {
  it('returns undefined on the dashboard and for unknown routes', () => {
    expect(renderHook(() => useBreadcrumbs(), { wrapper: wrapperAt('/') }).result.current).toBeUndefined();
    expect(renderHook(() => useBreadcrumbs(), { wrapper: wrapperAt('/nope/never') }).result.current).toBeUndefined();
  });

  it('builds the ancestor chain with the dashboard first', () => {
    const { result } = renderHook(() => useBreadcrumbs(), { wrapper: wrapperAt('/user-groups/7/add-user') });
    expect(result.current).toEqual([
      { to: '/', label: 'nav.desktop' },
      { to: '/user-groups', label: 'nav.userGroups' },
      { to: '/user-groups/7', label: 'breadcrumbs.userGroupDetail' },
      { to: '/user-groups/7/add-user', label: 'breadcrumbs.userGroupAddUser' },
    ]);
  });

  it.each(BREADCRUMB_ROUTES.map((r) => r.pattern))('resolves %s', (pattern) => {
    const path = pattern.replace(/:[a-zA-Z0-9]+/g, '1');
    const { result } = renderHook(() => useBreadcrumbs(), { wrapper: wrapperAt(path) });
    // some patterns are shadowed by an earlier, more specific one — they must still resolve
    expect(result.current).toBeDefined();
    expect(result.current![0]).toEqual({ to: '/', label: 'nav.desktop' });
    expect(result.current!.at(-1)!.to).toBe(path);
  });
});

describe('AppBreadcrumbs', () => {
  it('renders links for ancestors and the current page as text', () => {
    render(
      <MemoryRouter>
        <AppBreadcrumbs
          crumbs={[
            { to: '/', label: 'Töölaud' },
            { to: '/users', label: 'Kasutajad' },
            { to: '/users/1', label: 'Kasutaja' },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Töölaud').closest('a')?.getAttribute('href')).toBe('/');
    expect(screen.getByText('Kasutajad').closest('a')?.getAttribute('href')).toBe('/users');
    expect(screen.getByText('Kasutaja').getAttribute('aria-current')).toBe('page');
  });
});
