// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserCreatePage } from './UserCreatePage';
import { checkPersonalCodeConflict, getUserGroups, insertUser } from '../../api';
import { listOrganisations } from '../../../organisations/api';
import { searchPersonByCode } from '../../../xroad/api';
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
      { classifierValueKey: 2, classifierCode: 'STRUCTURE_UNIT', code: 'U2', name: 'Üksus 2', description: 'B', parentKey: null },
    ],
  };
  return { useClassifiers: () => ctx };
});
vi.mock('../../api', () => ({
  getUserGroups: vi.fn(),
  insertUser: vi.fn(),
  updateUser: vi.fn(),
  checkPersonalCodeConflict: vi.fn(),
}));
vi.mock('../../../organisations/api', () => ({ listOrganisations: vi.fn() }));
vi.mock('../../../user-groups/api', () => ({ listUserGroups: vi.fn() }));
vi.mock('../../../xroad/api', () => ({ searchPersonByCode: vi.fn() }));
vi.mock('@tedi-design-system/react/tedi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tedi-design-system/react/tedi')>();
  return {
    ...actual,
    DateField: ({
      id,
      onSelect,
      inputProps,
    }: {
      id: string;
      onSelect: (d: Date) => void;
      inputProps?: { helper?: { text: string } };
    }) => (
      <div>
        <input data-testid={id} onChange={(e) => onSelect(new Date(e.target.value))} />
        {inputProps?.helper && <span>{inputProps.helper.text}</span>}
      </div>
    ),
  };
});

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
  perms = ['user.edit.admin'];
  authUser = { id: 'me', organisationid: '1' };
  vi.mocked(listOrganisations).mockResolvedValue([
    { id: 1, name: 'Org A', code: 'A' },
    { id: 2, name: 'Org B', code: 'B' },
  ]);
  vi.mocked(getUserGroups).mockResolvedValue([]);
  vi.mocked(checkPersonalCodeConflict).mockResolvedValue([]);
  vi.mocked(insertUser).mockResolvedValue([{ id: '77' }] as never);
  vi.mocked(searchPersonByCode).mockResolvedValue({ firstName: 'Mari', lastName: 'Maasikas' } as never);
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
    <MemoryRouter initialEntries={['/users/new']}>
      <Routes>
        <Route path="/users/new" element={<UserCreatePage />} />
        <Route path="/users/:id" element={<Detail />} />
        <Route path="/users" element={<div>list-page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// Kohustuslikud väljad blokeerivad jsdom-is natiivse esituse; sündmus esitatakse otse.
const submit = () => fireEvent.submit(document.querySelector('form')!);

const type = (id: string, value: string) =>
  fireEvent.change(document.getElementById(id)!, { target: { value } });

function pickOrg() {
  const input = document.getElementById('organisationId') as HTMLInputElement;
  input.focus();
  fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
}

describe('UserCreatePage', () => {
  it('ilma õiguseta keelatud', () => {
    perms = [];
    renderPage();
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('esitamine tühjalt näitab valideerimisvigu', async () => {
    renderPage();
    submit();
    expect((await screen.findAllByText('users.validation.required')).length).toBeGreaterThan(3);
    expect(insertUser).not.toHaveBeenCalled();
  });

  it('isikukoodi sisestamine otsib isiku nime registrist (ainult numbrid)', async () => {
    renderPage();
    type('personalCode', '3a9001010000');
    await waitFor(() => expect(searchPersonByCode).toHaveBeenCalledWith('39001010000'));
    await waitFor(() => expect((document.getElementById('firstName') as HTMLInputElement).value).toBe('Mari'));
    expect((document.getElementById('lastName') as HTMLInputElement).value).toBe('Maasikas');
  });

  it('isikut ei leitud annab hoiatuse, vigane kood veateate; teated suletavad', async () => {
    vi.mocked(searchPersonByCode).mockResolvedValue(null);
    renderPage();
    type('personalCode', '39001010000');
    expect(await screen.findByText('users.searchNotFound')).toBeTruthy();
    cleanup();
    renderPage();
    type('personalCode', '123');
    fireEvent.click(screen.getByText('common.search'));
    expect(await screen.findByText('users.searchInvalid')).toBeTruthy();
  });

  it('otsingunupp otsib käsitsi', async () => {
    renderPage();
    type('personalCode', '49001010000');
    await waitFor(() => expect(searchPersonByCode).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('common.search'));
    await waitFor(() => expect(searchPersonByCode).toHaveBeenCalledTimes(2));
  });

  it('loob kasutaja ja navigeerib detailvaatesse', async () => {
    renderPage();
    type('firstName', 'Mari');
    type('lastName', 'Maasikas');
    type('personalCode', '49001010000');
    await waitFor(() => expect(searchPersonByCode).toHaveBeenCalled());
    await act(async () => {});
    pickOrg();
    type('jobTitleName', 'Ametnik');
    type('email', 'mari@x.ee');
    type('phone', '5555');
    fireEvent.change(screen.getByTestId('accessStart'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByTestId('accessEnd'), { target: { value: '2999-01-01' } });
    submit();
    expect(await screen.findByText(/detail:/)).toBeTruthy();
    expect(insertUser).toHaveBeenCalledWith(
      'admin',
      expect.objectContaining({
        firstName: 'Mari',
        lastName: 'Maasikas',
        personalCode: '49001010000',
        jobTitleName: 'Ametnik',
        email: 'mari@x.ee',
        phone: '5555',
        accessStart: '2026-01-01',
        accessEnd: '2999-01-01',
        organisationId: '1',
      }),
    );
    expect(screen.getByText(/justCreated/)).toBeTruthy();
  });

  it('isikukoodi konflikt blokeerib salvestamise', async () => {
    vi.mocked(checkPersonalCodeConflict).mockResolvedValue([{ id: '5' }]);
    renderPage();
    type('firstName', 'A');
    type('lastName', 'B');
    type('personalCode', '49001010000');
    submit();
    expect(await screen.findByText('users.validation.personalCodeConflict')).toBeTruthy();
    expect(insertUser).not.toHaveBeenCalled();
  });

  it('serveri valideerimisviga kuvatakse väljal, muu viga logitakse', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(insertUser).mockRejectedValueOnce(
      new ApiError('x', 422, { type: 'VALIDATION_ERROR', field: 'email', code: 'dup' }),
    );
    renderPage();
    type('firstName', 'A');
    type('lastName', 'B');
    type('personalCode', '49001010000');
    await act(async () => {});
    pickOrg();
    type('jobTitleName', 'J');
    type('email', 'a@b.ee');
    fireEvent.change(screen.getByTestId('accessStart'), { target: { value: '2026-01-01' } });
    await waitFor(() => expect(searchPersonByCode).toHaveBeenCalled());
    submit();
    await waitFor(() => expect(insertUser).toHaveBeenCalled());
    expect(await screen.findByText('users.validation.api.dup')).toBeTruthy();
    vi.mocked(insertUser).mockRejectedValueOnce(new Error('boom'));
    submit();
    await waitFor(() => expect(err).toHaveBeenCalled());
    err.mockRestore();
  });

  it('lõpp enne algust ja vigane e-post/telefon annavad vead', async () => {
    renderPage();
    type('email', 'vigane');
    type('phone', '12');
    fireEvent.change(screen.getByTestId('accessStart'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByTestId('accessEnd'), { target: { value: '2026-04-01' } });
    submit();
    expect(await screen.findByText('users.validation.endBeforeStart')).toBeTruthy();
    expect(screen.getByText('users.validation.email')).toBeTruthy();
  });

  it('tühistamine viib nimekirja', async () => {
    renderPage();
    fireEvent.click(screen.getByText('users.cancel'));
    expect(await screen.findByText('list-page')).toBeTruthy();
  });

  it('kohalik admin: organisatsioon on lukus ja võetakse kasutajalt', async () => {
    vi.mocked(getUserGroups).mockResolvedValue([{ userGroupId: '1', name: 'Local Admin Group' }]);
    perms = ['user.edit.local'];
    renderPage();
    await waitFor(() => expect(getUserGroups).toHaveBeenCalledWith('local', 'me'));
    await waitFor(() => expect(screen.getAllByText('Org A').length).toBeGreaterThan(0));
  });

  it('superadmini grupp ei tee kasutajast kohalikku administraatorit', async () => {
    vi.mocked(getUserGroups).mockResolvedValue([
      { userGroupId: '1', name: 'Super Admin Group' },
      { userGroupId: '2', name: 'Local Admin Group' },
    ]);
    renderPage();
    await waitFor(() => expect(getUserGroups).toHaveBeenCalled());
  });
});
