// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserListPage } from './UserListPage';
import { listUsers } from '../../api';

let perms: string[] = [];

vi.mock('react-i18next', () => {
  const value = { t: (key: string) => key };
  return { useTranslation: () => value };
});
vi.mock('../../../auth/AuthContext', () => {
  const ctx = {
    hasPermission: (c: string) => perms.includes(c),
    hasAnyPermission: (cs: string[]) => cs.some((c) => perms.includes(c)),
  };
  return { useAuth: () => ctx };
});
vi.mock('../../api', () => ({ listUsers: vi.fn() }));

// TEDI vajab matchMedia'd, mida jsdom ei paku.
window.matchMedia ??= ((query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }) as unknown as MediaQueryList) as typeof window.matchMedia;

const base = {
  organisationName: 'Org',
  structuralUnitId: null,
  email: 'e',
  accessStart: '2026-01-01',
  accessEnd: null,
  organisationId: 1,
};

beforeEach(() => {
  perms = ['user.list.admin', 'user.edit.admin', 'user.read.admin'];
  vi.mocked(listUsers).mockResolvedValue({
    content: [
      { ...base, id: 1, firstName: 'Mari', lastName: 'Maasikas', personalCode: '111', status: 'active', lastLoginAt: '2026-02-03T10:00:00', userGroups: ['G1', 'G2'] },
      { ...base, id: 2, firstName: 'Jüri', lastName: 'Tamm', personalCode: '222', status: 'pending_deactivation', lastLoginAt: null },
      { ...base, id: 3, firstName: 'Kati', lastName: 'Kask', personalCode: '333', status: 'inactive', lastLoginAt: null, userGroups: [] },
    ],
    total: 3,
  } as never);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/users']}>
      <Routes>
        <Route path="/users" element={<UserListPage />} />
        <Route path="/users/new" element={<div>new-page</div>} />
        <Route path="/users/:id" element={<div>detail-page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('UserListPage', () => {
  it('ilma õiguseta keelatud', () => {
    perms = [];
    renderPage();
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('kuvab kasutajad staatuste ja gruppidega; mitme grupiga kasutaja saab lisarea', async () => {
    renderPage();
    expect(await screen.findByText('Mari')).toBeTruthy();
    expect(screen.getByText('users.statusActive')).toBeTruthy();
    expect(screen.getByText('users.statusDeactivating')).toBeTruthy();
    expect(screen.getByText('users.statusInactive')).toBeTruthy();
    expect(screen.getByText('G1')).toBeTruthy();
    expect(screen.getByText('G2')).toBeTruthy();
    expect(screen.getAllByText('common.missing').length).toBeGreaterThan(0);
  });

  it('link viib detailvaatesse; lisamisnupp uue kasutaja lehele', async () => {
    renderPage();
    const links = await screen.findAllByText('users.viewDetails');
    fireEvent.click(links[0]);
    expect(await screen.findByText('detail-page')).toBeTruthy();
    cleanup();
    renderPage();
    fireEvent.click(await screen.findByText('users.addUser'));
    expect(await screen.findByText('new-page')).toBeTruthy();
  });

  it('kohalik ulatus, ilma lisamis- ja lugemisõiguseta', async () => {
    perms = ['user.list.local'];
    renderPage();
    await screen.findByText('Mari');
    expect(listUsers).toHaveBeenCalledWith('local', expect.anything());
    expect(screen.queryByText('users.addUser')).toBeNull();
    expect(screen.queryByText('users.viewDetails')).toBeNull();
  });

  it('otsing', async () => {
    renderPage();
    await screen.findByText('Mari');
    const input = screen.getByPlaceholderText('common.search');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(vi.mocked(listUsers).mock.calls.some(([, p]) => p?.search === 'abc')).toBe(true),
    );
  });
});
