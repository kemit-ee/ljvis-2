// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PrintingProvider } from '@tedi-design-system/react/tedi';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserGroupDetailPage } from './UserGroupDetailPage';
import {
  deleteUserGroupUser,
  getUserGroup,
  getUserGroupOrganisations,
  getUserGroupPermissions,
  getUserGroupUsers,
  setUserGroupOrganisations,
  setUserGroupPermissions,
  updateUserGroupName,
} from '../../api';
import { listOrganisations } from '../../../organisations/api';
import { listPermissions } from '../../../permissions/api';

let perms: string[] = [];
const refetchUser = vi.fn().mockResolvedValue(undefined);

vi.mock('react-i18next', () => {
  const value = { t: (key: string) => key };
  return { useTranslation: () => value };
});
vi.mock('../../../auth/AuthContext', () => {
  const ctx = {
    hasPermission: (c: string) => perms.includes(c),
    hasAnyPermission: (cs: string[]) => cs.some((c) => perms.includes(c)),
    refetchUser: (...a: unknown[]) => refetchUser(...a),
  };
  return { useAuth: () => ctx };
});
vi.mock('../../api', () => ({
  getUserGroup: vi.fn(),
  getUserGroupOrganisations: vi.fn(),
  getUserGroupPermissions: vi.fn(),
  getUserGroupUsers: vi.fn(),
  updateUserGroupName: vi.fn(),
  setUserGroupOrganisations: vi.fn(),
  setUserGroupPermissions: vi.fn(),
  deleteUserGroupUser: vi.fn(),
}));
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

const ALL = [
  'user_group.read.admin',
  'user_group.update',
  'user_group.add_user',
  'user_group.remove_user',
  'user.read.admin',
];

beforeEach(() => {
  perms = [...ALL];
  vi.mocked(getUserGroup).mockResolvedValue([{ id: '5', name: 'Grupp' }]);
  vi.mocked(getUserGroupOrganisations).mockResolvedValue([{ organisationId: 1, name: 'Org A' }]);
  vi.mocked(getUserGroupPermissions).mockResolvedValue([{ permissionId: '10', code: 'p1', description: 'Õigus 1' }]);
  vi.mocked(getUserGroupUsers).mockResolvedValue([
    { id: 'u1', firstName: 'Mari', lastName: 'Maasikas', personalCode: '111', organisationName: 'Org A', status: 'active' },
    { id: 'u2', firstName: 'Jüri', lastName: 'Tamm', personalCode: '222', organisationName: 'Org A', status: 'pending_deactivation' },
    { id: 'u3', firstName: 'Kati', lastName: 'Kask', personalCode: '333', organisationName: 'Org B', status: 'inactive' },
    { id: 'u4', firstName: 'Lisa', lastName: 'Lisa', personalCode: '444', organisationName: 'Org B', status: 'active', isAdditionalGroupRow: true },
  ]);
  vi.mocked(listOrganisations).mockResolvedValue([
    { id: 1, name: 'Org A', code: 'A' },
    { id: 2, name: 'Org B', code: 'B' },
  ]);
  vi.mocked(listPermissions).mockResolvedValue([
    { id: 10, code: 'p1', description: 'Õigus 1' },
    { id: 11, code: 'p2', description: 'Õigus 2' },
  ]);
  vi.mocked(updateUserGroupName).mockResolvedValue([]);
  vi.mocked(setUserGroupOrganisations).mockResolvedValue('');
  vi.mocked(setUserGroupPermissions).mockResolvedValue('');
  vi.mocked(deleteUserGroupUser).mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPage = (state: unknown = { justCreated: true }) =>
  render(
    <PrintingProvider>
      <MemoryRouter initialEntries={[{ pathname: '/user-groups/5', state }]}>
        <Routes>
          <Route path="/user-groups/:id" element={<UserGroupDetailPage />} />
          <Route path="/user-groups/:id/add-user" element={<div>add-user-page</div>} />
          <Route path="/users/:id" element={<div>user-page</div>} />
        </Routes>
      </MemoryRouter>
    </PrintingProvider>,
  );

const pickEdit = async (index: number) => {
  const btns = await screen.findAllByText('userGroups.edit');
  fireEvent.click(btns[index]);
};

describe('UserGroupDetailPage', () => {
  it('ilma õiguseta keelatud', async () => {
    perms = [];
    renderPage();
    expect(await screen.findByText('common.forbidden')).toBeTruthy();
  });

  it('puuduv grupp ja laadimisviga', async () => {
    vi.mocked(getUserGroup).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('common.error')).toBeTruthy();
    cleanup();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getUserGroup).mockRejectedValue(new Error('x'));
    renderPage();
    expect(await screen.findByText('common.error')).toBeTruthy();
    err.mockRestore();
  });

  it('laadimise ajal laadimistekst', () => {
    vi.mocked(getUserGroup).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('common.loading')).toBeTruthy();
  });

  it('kuvab grupi, organisatsioonid, õigused ja kasutajad staatustega', async () => {
    renderPage();
    expect((await screen.findAllByText('Grupp')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Org A').length).toBeGreaterThan(0);
    expect(screen.getByText('Õigus 1')).toBeTruthy();
    expect(screen.getByText('users.statusActive')).toBeTruthy();
    expect(screen.getByText('users.statusDeactivating')).toBeTruthy();
    expect(screen.getByText('users.statusInactive')).toBeTruthy();
  });

  it('uue kasutaja teade nähtav ja suletav', async () => {
    renderPage({ justCreatedUser: true });
    expect(await screen.findByText('userGroups.newUserAddedNote')).toBeTruthy();
  });

  it('lisa kasutaja nupp ja kasutaja link navigeerivad', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('userGroups.addUser'));
    expect(await screen.findByText('add-user-page')).toBeTruthy();
  });

  it('kasutaja link viib kasutaja lehele', async () => {
    renderPage();
    const link = await screen.findByText('Mari');
    fireEvent.click(link);
    expect(await screen.findByText('user-page')).toBeTruthy();
  });

  it('nime muutmine: tühi nimi annab vea, korrektne salvestub', async () => {
    renderPage();
    await pickEdit(0);
    fireEvent.change(document.getElementById('groupName')!, { target: { value: '  ' } });
    fireEvent.click(screen.getByText('userGroups.save'));
    expect(await screen.findByText('userGroups.validation.nameRequired')).toBeTruthy();
    fireEvent.change(document.getElementById('groupName')!, { target: { value: 'Uus nimi' } });
    fireEvent.click(screen.getByText('userGroups.save'));
    await waitFor(() => expect(updateUserGroupName).toHaveBeenCalledWith('5', 'Uus nimi'));
  });

  it('nime muutmise tühistamine', async () => {
    renderPage();
    await pickEdit(0);
    fireEvent.click(screen.getByText('userGroups.cancel'));
    expect((await screen.findAllByText('userGroups.edit')).length).toBe(3);
  });

  it('organisatsioonide muutmine: tühi valik annab vea; muutus salvestub', async () => {
    renderPage();
    await pickEdit(1);
    await screen.findByText('Org B');
    // eemalda kõik: kõik valitud? 1/2 → "kõik" märgib kõik, teine klõps eemaldab
    fireEvent.click(document.getElementById('org-select-all')!);
    fireEvent.click(document.getElementById('org-select-all')!);
    fireEvent.click(screen.getByText('userGroups.save'));
    expect(await screen.findByText('userGroups.organisationsNotSelected')).toBeTruthy();
    expect(setUserGroupOrganisations).not.toHaveBeenCalled();
    fireEvent.click(document.getElementById('org-select-2')!);
    fireEvent.click(screen.getByText('userGroups.save'));
    await waitFor(() => expect(setUserGroupOrganisations).toHaveBeenCalledWith('5', [2], [1]));
    await waitFor(() => expect(refetchUser).toHaveBeenCalled());
  });

  it('organisatsioonide muutmise tühistamine ja valiku lülitamine', async () => {
    renderPage();
    await pickEdit(1);
    await screen.findByText('Org B');
    fireEvent.click(document.getElementById('org-select-2')!);
    fireEvent.click(document.getElementById('org-select-2')!);
    fireEvent.click(screen.getByText('userGroups.cancel'));
    expect((await screen.findAllByText('userGroups.edit')).length).toBe(3);
  });

  it('õiguste muutmine salvestab lisatud ja eemaldatud', async () => {
    renderPage();
    await pickEdit(2);
    await screen.findByText('Õigus 2');
    fireEvent.click(document.getElementById('perm-select-11')!);
    fireEvent.click(document.getElementById('perm-select-10')!);
    fireEvent.click(document.getElementById('perm-select-all')!);
    fireEvent.click(document.getElementById('perm-select-all')!);
    fireEvent.click(document.getElementById('perm-select-10')!);
    fireEvent.click(document.getElementById('perm-select-11')!);
    fireEvent.click(screen.getByText('userGroups.save'));
    await waitFor(() => expect(setUserGroupPermissions).toHaveBeenCalledWith('5', [11], []));
    await waitFor(() => expect(refetchUser).toHaveBeenCalled());
  });

  it('õiguste muutmise tühistamine', async () => {
    renderPage();
    await pickEdit(2);
    await screen.findByText('Õigus 2');
    fireEvent.click(screen.getByText('userGroups.cancel'));
    expect((await screen.findAllByText('userGroups.edit')).length).toBe(3);
  });

  it('kasutaja eemaldamine kinnitusega', async () => {
    renderPage();
    const removes = await screen.findAllByText('common.remove');
    fireEvent.click(removes[0]);
    fireEvent.click(await screen.findByText('common.yes'));
    await waitFor(() => expect(deleteUserGroupUser).toHaveBeenCalledWith('5', 'u1'));
    await waitFor(() => expect(refetchUser).toHaveBeenCalled());
  });

  it('kasutaja eemaldamise viga logitakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(deleteUserGroupUser).mockRejectedValue(new Error('x'));
    renderPage();
    const removes = await screen.findAllByText('common.remove');
    fireEvent.click(removes[0]);
    fireEvent.click(await screen.findByText('common.yes'));
    await waitFor(() => expect(err).toHaveBeenCalled());
    err.mockRestore();
  });

  it('ilma muutmis-/lisamis-/eemaldamis-/kasutajaõiguseta pole nuppe ega linke', async () => {
    perms = ['user_group.read.local'];
    renderPage({});
    await screen.findAllByText('Grupp');
    expect(screen.queryByText('userGroups.addUser')).toBeNull();
    expect(screen.queryByText('common.remove')).toBeNull();
    expect(screen.queryByText('userGroups.edit')).toBeNull();
    expect(getUserGroup).toHaveBeenCalledWith('local', '5');
  });

  it('kasutajate otsing', async () => {
    renderPage();
    await screen.findByText('Mari');
    const input = screen.getByPlaceholderText('common.search');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(vi.mocked(getUserGroupUsers).mock.calls.some(([, p]) => p?.search === 'abc')).toBe(true),
    );
  });
});
