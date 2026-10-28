// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useFormik } from 'formik';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PhoneField } from './PhoneField/PhoneField';
import { UserBasicInfoCard } from './UserBasicInfo/UserBasicInfoCard';
import { UserBasicInfoEditCard } from './UserBasicInfo/UserBasicInfoEditCard';
import { UserGroupsCard } from './UserGroups/UserGroupsCard';
import type { User } from '../types';
import type { UserGroup } from '../../user-groups/types';

vi.mock('react-i18next', () => {
  const value = { t: (key: string) => key };
  return { useTranslation: () => value };
});
vi.mock('../../control-forms/components/shared/MaskedDateField.tsx', () => ({
  MaskedDateField: ({
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

afterEach(cleanup);

describe('PhoneField', () => {
  it('eemaldab mittenumbrilised märgid ja kuvab vea', () => {
    const onChange = vi.fn();
    render(<PhoneField value="" onChange={onChange} helper={{ text: 'Telefon viga', type: 'error' }} />);
    fireEvent.change(document.getElementById('phone')!, { target: { value: '5a5  5-5' } });
    expect(onChange).toHaveBeenCalledWith('55 55');
    expect(screen.getByText('Telefon viga')).toBeTruthy();
  });

  it('ilma veata', () => {
    render(<PhoneField value="123" onChange={vi.fn()} />);
    expect((document.getElementById('phone') as HTMLInputElement).value).toBe('123');
  });
});

const user: User = {
  id: '1',
  firstName: 'Mari',
  lastName: 'Maasikas',
  personalCode: '49001010000',
  organisationId: '1',
  organisationName: 'Org',
  structuralUnitId: null,
  jobTitleName: 'Ametnik',
  email: 'm@x.ee',
  phone: '5555',
  accessStart: '2026-01-01',
  accessEnd: null,
  status: 'active',
  lastLoginAt: null,
};

describe('UserBasicInfoCard', () => {
  it('kuvab andmed', () => {
    const onEdit = vi.fn();
    render(<UserBasicInfoCard user={user} canEditUser isDesktop onEdit={onEdit} structuralUnitName="Üksus" />);
    expect(screen.getByText('Mari')).toBeTruthy();
    expect(screen.getByText('Üksus')).toBeTruthy();
    fireEvent.click(screen.getByText('users.edit'));
    expect(onEdit).toHaveBeenCalled();
  });

  it('puuduvad väärtused asendatakse kriipsuga; muutmisnupp puudub', () => {
    render(
      <UserBasicInfoCard
        user={{ ...user, organisationName: undefined, jobTitleName: undefined, phone: '' }}
        canEditUser={false}
        isDesktop={false}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText('users.edit')).toBeNull();
  });
});

const values = {
  firstName: 'A',
  lastName: 'B',
  personalCode: '49001010000',
  organisationId: '1',
  structuralUnitName: 'u1',
  jobTitleName: 'J',
  email: 'e@x.ee',
  phone: '5',
  accessStart: '2026-01-01',
  accessEnd: '2026-12-01',
};

function EditHarness({
  isLocalAdmin = false,
  isDesktop = true,
  withErrors = false,
  showConfirmModal = false,
}: {
  isLocalAdmin?: boolean;
  isDesktop?: boolean;
  withErrors?: boolean;
  showConfirmModal?: boolean;
}) {
  const formik = useFormik({
    initialValues: values,
    initialErrors: withErrors
      ? {
          firstName: 'e1',
          lastName: 'e2',
          personalCode: 'e3',
          jobTitleName: 'e4',
          email: 'e5',
          phone: 'e6',
          accessStart: 'e7',
          accessEnd: 'e8',
        }
      : {},
    initialTouched: withErrors
      ? Object.fromEntries(Object.keys(values).map((k) => [k, true]))
      : {},
    onSubmit: () => document.body.setAttribute('data-submitted', '1'),
  });
  const [open, setOpen] = useState(showConfirmModal);
  return (
    <>
      <UserBasicInfoEditCard
        formik={formik}
        isDesktop={isDesktop}
        orgOptions={[{ label: 'Org 1', value: '1' }, { label: 'Org 2', value: '2' }]}
        structuralUnitOptions={[{ label: 'Üksus 1', value: 'u1' }]}
        isLocalAdmin={isLocalAdmin}
        handleOrgChange={(v) => document.body.setAttribute('data-org', JSON.stringify(v))}
        handleStructuralUnitChange={vi.fn()}
        handleSaveClick={() => document.body.setAttribute('data-saved', '1')}
        onCancel={() => document.body.setAttribute('data-cancelled', '1')}
        showConfirmModal={open}
        setShowConfirmModal={setOpen}
      />
      <span data-testid="values">{JSON.stringify(formik.values)}</span>
    </>
  );
}

describe('UserBasicInfoEditCard', () => {
  it('muudab välju ja kuupäevi, nupud töötavad', () => {
    render(<EditHarness />);
    fireEvent.change(document.getElementById('firstName')!, { target: { value: 'Uus' } });
    fireEvent.change(document.getElementById('lastName')!, { target: { value: 'Perenimi' } });
    fireEvent.change(document.getElementById('personalCode')!, { target: { value: '1' } });
    fireEvent.change(document.getElementById('jobTitleName')!, { target: { value: 'Töö' } });
    fireEvent.change(document.getElementById('email')!, { target: { value: 'x@y.ee' } });
    fireEvent.change(document.getElementById('phone')!, { target: { value: '99' } });
    fireEvent.change(screen.getByTestId('accessStart'), { target: { value: '2026-02-02' } });
    fireEvent.change(screen.getByTestId('accessEnd'), { target: { value: '2026-03-03' } });
    const v = JSON.parse(screen.getByTestId('values').textContent!);
    expect(v).toMatchObject({
      firstName: 'Uus',
      lastName: 'Perenimi',
      jobTitleName: 'Töö',
      email: 'x@y.ee',
      phone: '99',
      accessStart: '2026-02-02',
      accessEnd: '2026-03-03',
    });
    fireEvent.click(screen.getByText('users.save'));
    fireEvent.click(screen.getByText('users.cancel'));
    expect(document.body.getAttribute('data-saved')).toBe('1');
    expect(document.body.getAttribute('data-cancelled')).toBe('1');
  });

  it('kuvab vead mobiilivaates', () => {
    render(<EditHarness withErrors isDesktop={false} />);
    for (const e of ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8']) {
      expect(screen.getByText(e)).toBeTruthy();
    }
  });

  it('kohaliku adminina on organisatsiooni valik lukus', () => {
    render(<EditHarness isLocalAdmin />);
    expect(screen.getByText('Org 1')).toBeTruthy();
  });

  it('kinnitusmodaal: kinnita esitab vormi, loobu sulgeb', async () => {
    render(<EditHarness showConfirmModal />);
    fireEvent.click(await screen.findByText('common.confirmChange'));
    await vi.waitFor(() => expect(document.body.getAttribute('data-submitted')).toBe('1'));
    cleanup();
    render(<EditHarness showConfirmModal />);
    fireEvent.click(await screen.findByText('common.discard'));
    await vi.waitFor(() => expect(screen.queryByText('users.confirmOrganisationChange')).toBeNull());
  });
});

const groupA: UserGroup = { id: 'a', name: 'Grupp A' };
const groupB: UserGroup = { id: 'b', name: 'Grupp B' };

function GroupsHarness(props: Partial<React.ComponentProps<typeof UserGroupsCard>>) {
  const [selected, setSelected] = useState<UserGroup[]>(props.allSelectedGroups ?? []);
  const [active, setActive] = useState(props.isGroupEditActive ?? false);
  return (
    <>
      <UserGroupsCard
        canEditUser
        canViewGroupDetail
        isGroupEditActive={active}
        setIsGroupEditActive={setActive}
        statusColor="success"
        isDesktop
        showGroupsNotCreatedAlert={false}
        groups={[]}
        allSelectedGroups={selected}
        setAllSelectedGroups={setSelected}
        selectedGroupId=""
        setSelectedGroupId={vi.fn()}
        availableGroups={[groupA, groupB]}
        hasGroupChanges
        handleGroupSave={vi.fn()}
        resetGroups={vi.fn()}
        {...props}
      />
      <span data-testid="selected">{selected.map((g) => g.id).join(',')}</span>
    </>
  );
}

describe('UserGroupsCard', () => {
  it('tühi olek: ühenda grupp avab muutmise', () => {
    render(<GroupsHarness />);
    expect(screen.getByText('users.noGroups')).toBeTruthy();
    fireEvent.click(screen.getAllByText('users.connectGroup')[1]);
    expect(screen.getByText('users.groupNote')).toBeTruthy();
  });

  it('tühi olek: päise nupp avab muutmise', () => {
    render(<GroupsHarness />);
    fireEvent.click(screen.getAllByText('users.connectGroup')[0]);
    expect(screen.getByText('users.groupNote')).toBeTruthy();
  });

  it('passiivne staatus keelab ühendamise', () => {
    render(<GroupsHarness statusColor="neutral" />);
    for (const b of screen.getAllByText('users.connectGroup')) {
      expect((b.closest('button') as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('muutmisrežiim: lisab valitud grupi, eemaldab, salvestab ja tühistab', () => {
    const handleGroupSave = vi.fn();
    const resetGroups = vi.fn();
    render(
      <GroupsHarness
        isGroupEditActive
        allSelectedGroups={[groupB]}
        availableGroups={[groupA]}
        handleGroupSave={handleGroupSave}
        resetGroups={resetGroups}
      />,
    );
    fireEvent.click(screen.getByText('users.addConnection'));
    expect(screen.getByTestId('selected').textContent).toBe('b,a');
    fireEvent.click(screen.getAllByText('users.cancel')[0]);
    expect(screen.getByTestId('selected').textContent).toBe('a');
    fireEvent.click(screen.getByText('users.save'));
    expect(handleGroupSave).toHaveBeenCalled();
  });

  it('tühistamine lähtestab', () => {
    const resetGroups = vi.fn();
    render(<GroupsHarness isGroupEditActive allSelectedGroups={[]} resetGroups={resetGroups} />);
    const cancels = screen.getAllByText('users.cancel');
    fireEvent.click(cancels[cancels.length - 1]);
    expect(resetGroups).toHaveBeenCalled();
  });

  it('valikus saab valida grupi', () => {
    const setSelectedGroupId = vi.fn();
    render(<GroupsHarness isGroupEditActive setSelectedGroupId={setSelectedGroupId} />);
    const input = document.getElementById('chooseGroup') as HTMLInputElement;
    input.focus();
    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(setSelectedGroupId).toHaveBeenCalled();
  });

  it('vaatamisõiguseta kuvatakse grupi nimi lihttekstina; "grupid pole loodud" teade', () => {
    render(
      <GroupsHarness
        canViewGroupDetail={false}
        allSelectedGroups={[groupA]}
        groups={[{ userGroupId: 'a', name: 'Grupp A' }]}
      />,
    );
    expect(screen.getAllByText('Grupp A').length).toBeGreaterThan(0);
    cleanup();
    render(<GroupsHarness showGroupsNotCreatedAlert groups={[{ userGroupId: 'a', name: 'Grupp A' }]} allSelectedGroups={[groupA]} />);
    expect(screen.getByText('users.groupsNotCreated')).toBeTruthy();
    expect(screen.queryByText('users.save')).toBeNull();
  });

  it('ilma muutmisõiguseta pole salvestusnuppe; ilma saadaolevate gruppideta on valik lukus', () => {
    render(<GroupsHarness canEditUser={false} groups={[{ userGroupId: 'a', name: 'A' }]} allSelectedGroups={[groupA]} availableGroups={[]} />);
    expect(screen.queryByText('users.save')).toBeNull();
  });
});
