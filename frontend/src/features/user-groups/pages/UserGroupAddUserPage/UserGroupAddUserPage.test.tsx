// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserGroupAddUserPage } from './UserGroupAddUserPage';
import {
  addUserToGroup,
  getUserGroup,
  getUserGroupAvailableUsers,
  getUserGroupOrganisations,
} from '../../api';

let perms: string[] = [];
const refetchUser = vi.fn().mockResolvedValue(undefined);

vi.mock('react-i18next', () => {
  const value = { t: (key: string) => key };
  return { useTranslation: () => value };
});
vi.mock('../../../auth/AuthContext', () => {
  const ctx = {
    hasPermission: (c: string) => perms.includes(c),
    refetchUser: (...a: unknown[]) => refetchUser(...a),
  };
  return { useAuth: () => ctx };
});
vi.mock('../../api', () => ({
  getUserGroup: vi.fn(),
  getUserGroupOrganisations: vi.fn(),
  getUserGroupAvailableUsers: vi.fn(),
  addUserToGroup: vi.fn(),
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

const users = [
  { id: 'u1', firstName: 'Mari', lastName: 'Maasikas', personalCode: '111', organisationName: 'Org', status: 'active' },
  { id: 'u2', firstName: 'Jüri', lastName: 'Tamm', personalCode: '222', organisationName: 'Org', status: 'inactive' },
  { id: 'u3', firstName: 'Lisa', lastName: 'Rida', personalCode: '333', organisationName: 'Org', status: 'active', isAdditionalGroupRow: true },
];

beforeEach(() => {
  perms = ['user_group.add_user', 'user_group.read.admin'];
  vi.mocked(getUserGroup).mockResolvedValue([{ id: '5', name: 'Grupp' }]);
  vi.mocked(getUserGroupOrganisations).mockResolvedValue([
    { organisationId: 1, name: 'A' },
    { organisationId: 2, name: 'B' },
  ]);
  vi.mocked(getUserGroupAvailableUsers).mockResolvedValue(users);
  vi.mocked(addUserToGroup).mockResolvedValue('');
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
    <MemoryRouter initialEntries={['/user-groups/5/add']}>
      <Routes>
        <Route path="/user-groups/:id/add" element={<UserGroupAddUserPage />} />
        <Route path="/user-groups/:id" element={<Detail />} />
      </Routes>
    </MemoryRouter>,
  );

describe('UserGroupAddUserPage', () => {
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

  it('kuvab saadaolevad kasutajad ja küsib organisatsioonide ID-dega', async () => {
    renderPage();
    expect(await screen.findByText('Mari')).toBeTruthy();
    expect(screen.getByText('Grupp')).toBeTruthy();
    expect(getUserGroupAvailableUsers).toHaveBeenCalledWith(
      expect.objectContaining({ userGroupId: '5', organisationIds: '1,2' }),
    );
  });

  it('valib kasutajad, salvestab ja navigeerib', async () => {
    renderPage();
    await screen.findByText('Mari');
    const boxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    fireEvent.click(boxes[1]);
    fireEvent.click(screen.getByText('userGroups.save'));
    expect(await screen.findByText(/detail:/)).toBeTruthy();
    expect(addUserToGroup).toHaveBeenCalledWith('5', ['u1']);
    expect(refetchUser).toHaveBeenCalled();
    expect(screen.getByText(/justCreatedUser/)).toBeTruthy();
  });

  it('valikuta salvestamine ei kutsu API-t, tühistamine navigeerib', async () => {
    renderPage();
    await screen.findByText('Mari');
    fireEvent.click(screen.getByText('userGroups.save'));
    await screen.findByText(/detail:/);
    expect(addUserToGroup).not.toHaveBeenCalled();
    cleanup();
    renderPage();
    await screen.findByText('Mari');
    fireEvent.click(screen.getByText('userGroups.cancel'));
    expect(await screen.findByText(/detail:/)).toBeTruthy();
  });

  it('otsing', async () => {
    renderPage();
    await screen.findByText('Mari');
    const input = screen.getByPlaceholderText('common.search');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(vi.mocked(getUserGroupAvailableUsers).mock.calls.some(([p]) => p?.search === 'abc')).toBe(true),
    );
  });
});
