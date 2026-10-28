// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserGroupCreatePage } from './UserGroupCreatePage';
import { insertUserGroup } from '../../api';
import { listOrganisations } from '../../../organisations/api';
import { listPermissions } from '../../../permissions/api';

let perms: string[] = [];
const refetchUser = vi.fn().mockResolvedValue(undefined);

vi.mock('react-i18next', () => {
  const value = { t: (key: string) => key };
  return { useTranslation: () => value };
});
vi.mock('../../../auth/AuthContext.tsx', () => {
  const ctx = {
    hasPermission: (c: string) => perms.includes(c),
    refetchUser: (...a: unknown[]) => refetchUser(...a),
  };
  return { useAuth: () => ctx };
});
vi.mock('../../api', () => ({ insertUserGroup: vi.fn() }));
vi.mock('../../../organisations/api', () => ({ listOrganisations: vi.fn() }));
vi.mock('../../../permissions/api', () => ({ listPermissions: vi.fn() }));

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
  perms = ['user_group.create'];
  vi.mocked(listOrganisations).mockResolvedValue([
    { id: 1, name: 'Org A', code: 'A' },
    { id: 2, name: 'Org B', code: 'B' },
  ]);
  vi.mocked(listPermissions).mockResolvedValue([
    { id: 10, code: 'p1', description: 'Õigus 1' },
    { id: 11, code: 'p2', description: 'Õigus 2' },
  ]);
  vi.mocked(insertUserGroup).mockResolvedValue([{ id: 99, name: 'x' }] as never);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function Detail() {
  const { state } = useLocation();
  return <div>detail:{JSON.stringify(state)}</div>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/user-groups/new']}>
      <Routes>
        <Route path="/user-groups/new" element={<UserGroupCreatePage />} />
        <Route path="/user-groups/:id" element={<Detail />} />
        <Route path="/user-groups" element={<div>list-page</div>} />
      </Routes>
    </MemoryRouter>,
  );

const check = (id: string) => fireEvent.click(document.getElementById(id)!);

describe('UserGroupCreatePage', () => {
  it('ilma õiguseta keelatud', () => {
    perms = [];
    renderPage();
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('nõuab nime ja organisatsiooni', async () => {
    renderPage();
    await screen.findByText('Org A');
    fireEvent.click(screen.getByText('userGroups.save'));
    expect(await screen.findByText('userGroups.validation.nameRequired')).toBeTruthy();
    expect(screen.getByText('userGroups.organisationsNotSelected')).toBeTruthy();
    expect(insertUserGroup).not.toHaveBeenCalled();
    fireEvent.change(document.getElementById('groupName')!, { target: { value: 'Nimi' } });
    expect(screen.queryByText('userGroups.validation.nameRequired')).toBeNull();
    check('org-select-1');
    expect(screen.queryByText('userGroups.organisationsNotSelected')).toBeNull();
  });

  it('valib organisatsioonid ja õigused (ka kõik/ükski), salvestab ja navigeerib', async () => {
    renderPage();
    await screen.findByText('Org A');
    fireEvent.change(document.getElementById('groupName')!, { target: { value: '  Uus grupp ' } });
    check('org-select-all');
    check('org-select-all');
    check('org-select-1');
    check('org-select-2');
    check('org-select-2');
    check('perm-select-all');
    check('perm-select-all');
    check('perm-select-10');
    check('perm-select-11');
    check('perm-select-11');
    fireEvent.click(screen.getByText('userGroups.save'));
    expect(await screen.findByText(/detail:/)).toBeTruthy();
    expect(insertUserGroup).toHaveBeenCalledWith({
      name: 'Uus grupp',
      organisationIds: [1],
      permissionIds: [10],
    });
    expect(refetchUser).toHaveBeenCalled();
    expect(screen.getByText(/justCreated/)).toBeTruthy();
  });

  it('salvestamise viga logitakse ja nupp vabaneb', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(insertUserGroup).mockRejectedValue(new Error('x'));
    renderPage();
    await screen.findByText('Org A');
    fireEvent.change(document.getElementById('groupName')!, { target: { value: 'N' } });
    check('org-select-1');
    fireEvent.click(screen.getByText('userGroups.save'));
    await waitFor(() => expect(err).toHaveBeenCalled());
    err.mockRestore();
  });

  it('andmete laadimise viga logitakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(listOrganisations).mockRejectedValue(new Error('x'));
    renderPage();
    await waitFor(() => expect(err).toHaveBeenCalled());
    err.mockRestore();
  });

  it('tühistamine ilma andmeteta viib otse nimekirja', async () => {
    renderPage();
    await screen.findByText('Org A');
    fireEvent.click(screen.getByText('userGroups.cancel'));
    expect(await screen.findByText('list-page')).toBeTruthy();
  });

  it('tühistamine andmetega küsib kinnitust: "ei" jääb, "jah" lahkub', async () => {
    renderPage();
    await screen.findByText('Org A');
    fireEvent.change(document.getElementById('groupName')!, { target: { value: 'N' } });
    fireEvent.click(screen.getByText('userGroups.cancel'));
    fireEvent.click(await screen.findByText('common.no'));
    await waitFor(() => expect(screen.queryByText('userGroups.cancelAddGroup')).toBeNull());
    fireEvent.click(screen.getByText('userGroups.cancel'));
    fireEvent.click(await screen.findByText('common.yes'));
    expect(await screen.findByText('list-page')).toBeTruthy();
  });
});
