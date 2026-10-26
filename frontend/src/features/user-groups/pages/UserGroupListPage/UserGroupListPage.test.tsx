// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserGroupListPage } from './UserGroupListPage';
import { getUserGroupOrganisations, listUserGroups } from '../../api';

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
vi.mock('../../api', () => ({
  listUserGroups: vi.fn(),
  getUserGroupOrganisations: vi.fn(),
}));

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

beforeEach(() => {
  perms = ['user_group.list.admin', 'user_group.create', 'user_group.read.admin'];
  vi.mocked(listUserGroups).mockResolvedValue({
    content: [
      { id: '1', name: 'Kõik', coversAllOrganisations: true },
      { id: '2', name: 'Mitu', organisations: ['Org1', 'Org2'] },
      { id: '3', name: 'Tühi' },
    ],
    total: 3,
  });
  vi.mocked(getUserGroupOrganisations).mockResolvedValue([
    { organisationId: 1, name: 'Leitud Org' },
  ]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/user-groups']}>
      <Routes>
        <Route path="/user-groups" element={<UserGroupListPage />} />
        <Route path="/user-groups/new" element={<div>new-page</div>} />
        <Route path="/user-groups/:id" element={<div>detail-page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('UserGroupListPage', () => {
  it('ilma õiguseta keelatud', () => {
    perms = [];
    renderPage();
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('laiendab organisatsioonide read ja märgib "kõik organisatsioonid"', async () => {
    renderPage();
    expect(await screen.findByText('Kõik')).toBeTruthy();
    expect(screen.getByText('userGroups.allOrganisations')).toBeTruthy();
    expect(screen.getByText('Org1')).toBeTruthy();
    expect(screen.getByText('Org2')).toBeTruthy();
    expect(screen.getByText('Tühi')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(getUserGroupOrganisations).not.toHaveBeenCalled();
  });

  it('"lisa grupp" ja detailivaade', async () => {
    renderPage();
    const links = await screen.findAllByText('userGroups.viewDetails');
    fireEvent.click(links[0]);
    expect(await screen.findByText('detail-page')).toBeTruthy();
    cleanup();
    renderPage();
    fireEvent.click(await screen.findByText('userGroups.addGroup'));
    expect(await screen.findByText('new-page')).toBeTruthy();
  });

  it('otsing laeb grupi organisatsioonid kohaliku ulatusega', async () => {
    perms = ['user_group.list.local', 'user_group.read.local'];
    renderPage();
    await screen.findByText('Kõik');
    const input = screen.getByPlaceholderText('common.search');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(getUserGroupOrganisations).toHaveBeenCalledWith('local', '1'));
    expect(listUserGroups).toHaveBeenCalledWith('local', expect.objectContaining({ search: 'abc' }));
    expect((await screen.findAllByText('Leitud Org')).length).toBeGreaterThan(0);
  });

  it('ilma lisamis- ja lugemisõiguseta pole nuppe ega linke', async () => {
    perms = ['user_group.list.admin'];
    renderPage();
    await screen.findByText('Kõik');
    expect(screen.queryByText('userGroups.addGroup')).toBeNull();
    expect(screen.queryByText('userGroups.viewDetails')).toBeNull();
  });
});
