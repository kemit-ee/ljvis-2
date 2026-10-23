// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserDetailPage } from './UserDetailPage';
import { getUser, getUserGroups, setUserGroups, updateUser, checkPersonalCodeConflict } from '../../api';
import { listOrganisations } from '../../../organisations/api';
import { listUserGroups } from '../../../user-groups/api';
import { ApiError } from '../../../../shared/api/client';

let perms: string[] = [];
let authUser: { id: string; organisationid?: string } | null = { id: 'me', organisationid: '1' };

vi.mock('react-i18next', () => {
  const value = { t: (key: string) => key };
  return { useTranslation: () => value };
});
vi.mock('../../../auth/AuthContext', () => {
  const ctx = () => ({
    user: authUser,
    hasPermission: (c: string) => perms.includes(c),
    hasAnyPermission: (cs: string[]) => cs.some((c) => perms.includes(c)),
  });
  return { useAuth: ctx };
});
vi.mock('../../../classifiers/ClassifierProvider', () => {
  const ctx = {
    getByCode: () => [
      { classifierValueKey: 1, classifierCode: 'STRUCTURE_UNIT', code: 'U1', name: 'Üksus 1', description: 'A', parentKey: null },
    ],
  };
  return { useClassifiers: () => ctx };
});
vi.mock('../../api', () => ({
  getUser: vi.fn(),
  getUserGroups: vi.fn(),
  setUserGroups: vi.fn(),
  updateUser: vi.fn(),
  insertUser: vi.fn(),
  checkPersonalCodeConflict: vi.fn(),
}));
vi.mock('../../../organisations/api', () => ({ listOrganisations: vi.fn() }));
vi.mock('../../../user-groups/api', () => ({ listUserGroups: vi.fn() }));
vi.mock('../../../control-forms/components/shared/MaskedDateField.tsx', () => ({
  MaskedDateField: ({ id, onSelect }: { id: string; onSelect: (d: Date) => void }) => (
    <input data-testid={id} onChange={(e) => onSelect(new Date(e.target.value))} />
  ),
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

const baseUser = {
  id: '1',
  firstName: 'Mari',
  lastName: 'Maasikas',
  personalCode: '49001010000',
  organisationId: '1',
  organisationName: 'Org A',
  structuralUnitId: null,
  structuralUnitName: 'U1',
  jobTitleName: 'Ametnik',
  email: 'mari@x.ee',
  phone: '5555',
  accessStart: '2026-01-01',
  accessEnd: null,
  status: 'active',
  lastLoginAt: null,
};

beforeEach(() => {
  perms = ['user.read.admin', 'user.edit.admin', 'user_group.read.admin', 'user_group.list.admin'];
  authUser = { id: 'me', organisationid: '1' };
  vi.mocked(getUser).mockResolvedValue([baseUser as never]);
  vi.mocked(getUserGroups).mockImplementation(async (_s, id) =>
    id === '1' ? [{ userGroupId: 'a', name: 'Grupp A' }] : [],
  );
  vi.mocked(listOrganisations).mockResolvedValue([
    { id: 1, name: 'Org A', code: 'A' },
    { id: 2, name: 'Org B', code: 'B' },
  ]);
  vi.mocked(listUserGroups).mockResolvedValue({
    content: [{ id: 'a', name: 'Grupp A' }, { id: 'b', name: 'Grupp B' }],
    total: 2,
  });
  vi.mocked(updateUser).mockResolvedValue([]);
  vi.mocked(setUserGroups).mockResolvedValue('');
  vi.mocked(checkPersonalCodeConflict).mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPage = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/users/1', state }]}>
      <Routes>
        <Route path="/users/:id" element={<UserDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

const type = (id: string, value: string) =>
  fireEvent.change(document.getElementById(id)!, { target: { value } });

const pick = (id: string, steps = 1) => {
  const input = document.getElementById(id) as HTMLInputElement;
  input.focus();
  fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
  for (let i = 1; i < steps; i++) fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
};

const startEdit = async () => {
  fireEvent.click(await screen.findByText('users.edit'));
  await act(async () => {});
};

describe('UserDetailPage', () => {
  it('ilma õiguseta keelatud', async () => {
    perms = [];
    renderPage();
    expect(await screen.findByText('common.forbidden')).toBeTruthy();
  });

  it('laadimine ja puuduv kasutaja', async () => {
    vi.mocked(getUser).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('common.loading')).toBeTruthy();
    cleanup();
    vi.mocked(getUser).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('common.error')).toBeTruthy();
  });

  it.each([
    ['active', 'users.statusActive'],
    ['pending_deactivation', 'users.statusDeactivating'],
    ['inactive', 'users.statusInactive'],
  ])('kuvab staatuse %s', async (status, label) => {
    vi.mocked(getUser).mockResolvedValue([{ ...baseUser, status } as never]);
    renderPage();
    expect((await screen.findAllByText(label)).length).toBeGreaterThan(0);
  });

  it('kuvab kasutaja ja grupid ning uue kasutaja teate', async () => {
    renderPage({ justCreated: true });
    expect(await screen.findByText('Mari Maasikas')).toBeTruthy();
    expect(screen.getByText('users.newUserAddedNote')).toBeTruthy();
    expect(await screen.findByText('Grupp A')).toBeTruthy();
    expect(screen.getByText('Üksus 1')).toBeTruthy();
  });

  it('muudab kasutaja andmeid ja salvestab', async () => {
    renderPage();
    await startEdit();
    type('firstName', 'Uus');
    type('jobTitleName', 'Juht');
    type('email', 'uus@x.ee');
    type('phone', '777');
    fireEvent.change(screen.getByTestId('accessStart'), { target: { value: '2026-02-01' } });
    fireEvent.change(screen.getByTestId('accessEnd'), { target: { value: '2999-01-01' } });
    fireEvent.click(screen.getAllByText('users.save')[0]);
    await waitFor(() => expect(updateUser).toHaveBeenCalled());
    expect(vi.mocked(updateUser).mock.calls[0][1]).toMatchObject({
      id: '1',
      firstName: 'Uus',
      jobTitleName: 'Juht',
      email: 'uus@x.ee',
      phone: '777',
      accessEnd: '2999-01-01',
      status: 'active',
    });
    expect(await screen.findByText('users.userEditedNote')).toBeTruthy();
  });

  it('aegunud lõppkuupäev märgib staatuseks pending_deactivation', async () => {
    renderPage();
    await startEdit();
    fireEvent.change(screen.getByTestId('accessEnd'), { target: { value: '2020-01-01' } });
    fireEvent.click(screen.getAllByText('users.save')[0]);
    await waitFor(() => expect(updateUser).toHaveBeenCalled());
    expect(vi.mocked(updateUser).mock.calls[0][1]).toMatchObject({ status: 'pending_deactivation' });
  });

  it('organisatsiooni vahetus grupiga kasutajal küsib kinnitust', async () => {
    renderPage();
    await startEdit();
    pick('organisationId', 2);
    fireEvent.click(screen.getAllByText('users.save')[0]);
    fireEvent.click(await screen.findByText('common.confirmChange'));
    await waitFor(() => expect(updateUser).toHaveBeenCalled());
    expect(vi.mocked(updateUser).mock.calls[0][1]).toMatchObject({ organisationId: '2' });
    await waitFor(() => expect(listUserGroups).toHaveBeenCalledWith('admin', { search: 'Org B' }));
  });

  it('struktuuriüksuse valik uuendab vormi; kehtetu vorm ei salvestu', async () => {
    renderPage();
    await startEdit();
    pick('structuralUnitId');
    type('email', 'vigane');
    fireEvent.click(screen.getAllByText('users.save')[0]);
    expect(await screen.findByText('users.validation.email')).toBeTruthy();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('tühistamine sulgeb muutmise; serveri vead', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage();
    await startEdit();
    vi.mocked(updateUser).mockRejectedValueOnce(
      new ApiError('x', 422, { type: 'VALIDATION_ERROR', field: 'email', code: 'dup' }),
    );
    fireEvent.click(screen.getAllByText('users.save')[0]);
    expect(await screen.findByText('users.validation.api.dup')).toBeTruthy();
    vi.mocked(updateUser).mockRejectedValueOnce(new Error('boom'));
    fireEvent.click(screen.getAllByText('users.save')[0]);
    await waitFor(() => expect(err).toHaveBeenCalled());
    fireEvent.click(screen.getAllByText('users.cancel')[0]);
    expect(await screen.findByText('users.edit')).toBeTruthy();
    err.mockRestore();
  });

  it('isikukoodi konflikt 409 vea korral vorm ei salvestu', async () => {
    vi.mocked(checkPersonalCodeConflict).mockRejectedValue(new ApiError('x', 409));
    renderPage();
    await startEdit();
    fireEvent.click(screen.getAllByText('users.save')[0]);
    await waitFor(() => expect(checkPersonalCodeConflict).toHaveBeenCalled());
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('grupi lisamine: kasutajal grupid puuduvad → ühenda grupp ja salvesta', async () => {
    vi.mocked(getUserGroups).mockImplementation(async () => []);
    renderPage();
    await screen.findByText('Mari Maasikas');
    fireEvent.click((await screen.findAllByText('users.connectGroup'))[1]);
    await waitFor(() => expect(screen.getByText('users.addConnection')).toBeTruthy());
    fireEvent.click(screen.getByText('users.addConnection'));
    fireEvent.click(screen.getAllByText('users.save')[0]);
    await waitFor(() => expect(setUserGroups).toHaveBeenCalled());
    expect(vi.mocked(setUserGroups).mock.calls[0][2]).toEqual(['a']);
    expect(await screen.findByText('users.userGroupEditedNote')).toBeTruthy();
  });

  it('olemasoleva grupi eemaldamine', async () => {
    renderPage();
    await screen.findByText('Grupp A');
    await startEdit();
    await screen.findByText('users.groupNote');
    fireEvent.click(screen.getAllByText('users.cancel')[1]);
    fireEvent.click(screen.getAllByText('users.save')[1]);
    await waitFor(() => expect(setUserGroups).toHaveBeenCalledWith('admin', '1', [], ['a']));
  });

  it('kohalik ulatus ilma muutmisõiguseta: pole muutmisnuppu', async () => {
    perms = ['user.read.local'];
    renderPage();
    await screen.findByText('Mari Maasikas');
    expect(screen.queryByText('users.edit')).toBeNull();
    expect(getUser).toHaveBeenCalledWith('local', '1');
  });
});
