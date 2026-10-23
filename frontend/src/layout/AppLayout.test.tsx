// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

const side = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));
vi.mock('./useSideNavProps', () => ({ useSideNavProps: () => side.value }));
vi.mock('./useHeaderProps', () => ({ useHeaderProps: () => ({}) }));
vi.mock('./useFooterProps', () => ({ useFooterProps: () => ({}) }));
vi.mock('./useScrollToFirstError', () => ({ useScrollToFirstError: () => {} }));
const crumbs = vi.hoisted(() => ({ value: undefined as unknown }));
vi.mock('./breadcrumbs/useBreadcrumbs', () => ({ useBreadcrumbs: () => crumbs.value }));
vi.mock('./breadcrumbs/AppBreadcrumbs', () => ({ AppBreadcrumbs: () => <div>crumbs</div> }));
vi.mock('../components/EnvironmentRibbon/EnvironmentRibbon', () => ({
  EnvironmentRibbon: () => <div>ribbon</div>,
}));
vi.mock('@tedi-design-system/react/community', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { AppLayout } from './AppLayout';

const observers: { observed: Element[]; disconnect: () => void }[] = [];

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observed: Element[] = [];
      constructor() {
        observers.push(this);
      }
      observe(el: Element) {
        this.observed.push(el);
      }
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty('--app-footer-height');
});

const renderLayout = () =>
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<div>page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('AppLayout', () => {
  it('desktop: renders outlet, breadcrumbs and observes footer/main', () => {
    side.value = { sideNav: <nav>side</nav>, toggleButton: <i>toggle</i>, isMobileOpen: false, isDesktop: true, closeSideNav: vi.fn() };
    crumbs.value = [{ to: '/', label: 'x' }];
    const footer = document.createElement('footer');
    document.body.appendChild(footer);
    renderLayout();
    expect(screen.getByText('page')).toBeTruthy();
    expect(screen.getByText('crumbs')).toBeTruthy();
    expect(screen.getByText('ribbon')).toBeTruthy();
    expect(screen.getAllByText('side')).toHaveLength(1);
    expect(document.documentElement.style.getPropertyValue('--app-footer-height')).toBe('0px');
    expect(observers.at(-1)!.observed.length).toBeGreaterThan(0);
    footer.remove();
  });

  it('mobile: renders overlay when menu is open and closes it', () => {
    const closeSideNav = vi.fn();
    side.value = { sideNav: <nav>side</nav>, toggleButton: null, isMobileOpen: true, isDesktop: false, closeSideNav };
    crumbs.value = undefined;
    const { container } = renderLayout();
    expect(screen.queryByText('crumbs')).toBeNull();
    expect(screen.getAllByText('side')).toHaveLength(2);
    const overlay = container.querySelector('[class*="overlay"]') as HTMLElement;
    fireEvent.click(overlay);
    expect(closeSideNav).toHaveBeenCalled();
  });
});
