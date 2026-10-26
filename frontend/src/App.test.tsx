// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

const auth = vi.hoisted(() => ({ value: { user: null, loading: false } as Record<string, unknown> }));
vi.mock('./features/auth/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => auth.value,
}));
vi.mock('./features/classifiers/ClassifierProvider', () => ({
  ClassifierProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  ClassifierScopeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('./features/auth/LoginPage/LoginPage', () => ({ LoginPage: () => <div>login-page</div> }));
vi.mock('./features/auth/AuthCallback', () => ({ AuthCallback: () => <div>auth-callback</div> }));
vi.mock('./layout/AppLayout', async () => {
  const { Outlet } = await import('react-router-dom');
  return { AppLayout: () => <Outlet /> };
});
vi.mock('./features/desktop/DesktopPage', () => ({ DesktopPage: () => <div>desktop-page</div> }));
vi.mock('./features/citizen/pages/CitizenDashboardPage/CitizenDashboardPage', () => ({
  CitizenDashboardPage: () => <div>citizen-dashboard</div>,
}));
vi.mock('./features/citizen/pages/CompanyFormsListPage/CompanyFormsListPage', () => ({
  CompanyFormsListPage: () => <div>company-forms</div>,
}));
vi.mock('./features/control-forms/pages/search/FormSearchPage', () => ({
  FormSearchPage: () => <div>search-page</div>,
}));

import App from './App';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

beforeEach(() => {
  window.history.pushState({}, '', '/');
});
afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('App routing', () => {
  it('shows a loading state while auth loads', () => {
    auth.value = { user: null, loading: true };
    renderAt('/');
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('handles the TARA callback before the auth check', () => {
    auth.value = { user: null, loading: false };
    window.history.pushState({}, '', '/auth/callback');
    renderAt('/');
    expect(screen.getByText('auth-callback')).toBeTruthy();
  });

  it('shows the login page when not authenticated', () => {
    auth.value = { user: null, loading: false };
    renderAt('/');
    expect(screen.getByText('login-page')).toBeTruthy();
  });

  it('routes citizens to the dashboard and redirects unknown paths', async () => {
    auth.value = { user: { activeRole: 'citizen-self' }, loading: false };
    renderAt('/');
    expect(await screen.findByText('citizen-dashboard')).toBeTruthy();
    cleanup();
    renderAt('/my-companies');
    expect(await screen.findByText('company-forms')).toBeTruthy();
    cleanup();
    renderAt('/users');
    expect(await screen.findByText('citizen-dashboard')).toBeTruthy();
  });

  it('routes officers to the desktop and search, redirecting unknown paths', async () => {
    auth.value = { user: { activeRole: 'officer' }, loading: false };
    renderAt('/');
    expect(await screen.findByText('desktop-page')).toBeTruthy();
    cleanup();
    renderAt('/search');
    expect(await screen.findByText('search-page')).toBeTruthy();
    cleanup();
    renderAt('/does/not/exist');
    await waitFor(() => expect(screen.getByText('desktop-page')).toBeTruthy());
    cleanup();
    renderAt('/control-forms/tram-driver/1');
    await waitFor(() => expect(screen.getByText('desktop-page')).toBeTruthy());
  });
});
