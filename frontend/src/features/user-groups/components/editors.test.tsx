// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserGroupNameEditor } from './UserGroupNameEditor';
import { UserGroupOrgsEditor } from './UserGroupOrgsEditor';
import { UserGroupPermsEditor } from './UserGroupPermsEditor';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

describe('UserGroupNameEditor', () => {
  const base = {
    editingName: false,
    editName: 'Uus',
    setEditName: vi.fn(),
    nameError: '',
    currentName: 'Praegune',
    canEdit: true,
    onStartEdit: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  it('vaatamisrežiim näitab nime ja muutmisnuppu', () => {
    render(<UserGroupNameEditor {...base} />);
    expect(screen.getByText('Praegune')).toBeTruthy();
    fireEvent.click(screen.getByText('userGroups.edit'));
    expect(base.onStartEdit).toHaveBeenCalled();
  });

  it('muutmisõiguseta nuppu pole', () => {
    render(<UserGroupNameEditor {...base} canEdit={false} />);
    expect(screen.queryByText('userGroups.edit')).toBeNull();
  });

  it('muutmisrežiim: sisestus, salvestus, tühistus, viga', () => {
    render(<UserGroupNameEditor {...base} editingName nameError="Viga" />);
    expect(screen.getByText('Viga')).toBeTruthy();
    fireEvent.change(document.getElementById('groupName')!, { target: { value: 'X' } });
    expect(base.setEditName).toHaveBeenCalledWith('X');
    fireEvent.click(screen.getByText('userGroups.save'));
    expect(base.onSave).toHaveBeenCalled();
    fireEvent.click(screen.getByText('userGroups.cancel'));
    expect(base.onCancel).toHaveBeenCalled();
  });

  it('muutmisrežiim ilma veata', () => {
    render(<UserGroupNameEditor {...base} editingName />);
    expect(screen.queryByText('Viga')).toBeNull();
  });
});

describe('UserGroupOrgsEditor', () => {
  const base = {
    editingOrgs: false,
    allOrgs: [{ id: 1, name: 'Org A', code: 'A' }],
    orgColumns: [{ accessorKey: 'name', header: 'Nimi' }] as never,
    organisationsError: false,
    orgs: [] as { organisationId: number; name: string }[],
    canEdit: true,
    onStartEdit: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  it('tühi nimekiri', () => {
    render(<UserGroupOrgsEditor {...base} />);
    expect(screen.getByText('userGroups.noOrganisations')).toBeTruthy();
    fireEvent.click(screen.getByText('userGroups.edit'));
    expect(base.onStartEdit).toHaveBeenCalled();
  });

  it('nimekiri ilma õiguseta', () => {
    render(<UserGroupOrgsEditor {...base} canEdit={false} orgs={[{ organisationId: 1, name: 'Org A' }]} />);
    expect(screen.getByText('Org A')).toBeTruthy();
    expect(screen.queryByText('userGroups.edit')).toBeNull();
  });

  it('muutmisrežiim tabeli, vea ja nuppudega', () => {
    render(<UserGroupOrgsEditor {...base} editingOrgs organisationsError />);
    expect(screen.getByText('userGroups.organisationsNotSelected')).toBeTruthy();
    expect(screen.getByText('Org A')).toBeTruthy();
    fireEvent.click(screen.getByText('userGroups.save'));
    fireEvent.click(screen.getByText('userGroups.cancel'));
    expect(base.onSave).toHaveBeenCalled();
    expect(base.onCancel).toHaveBeenCalled();
  });

  it('muutmisrežiim ilma veata', () => {
    render(<UserGroupOrgsEditor {...base} editingOrgs />);
    expect(screen.queryByText('userGroups.organisationsNotSelected')).toBeNull();
  });
});

describe('UserGroupPermsEditor', () => {
  const base = {
    editingPerms: false,
    allPerms: [{ id: 1, code: 'p.a', description: 'Õigus A' }],
    permColumns: [{ accessorKey: 'description', header: 'Kirjeldus' }] as never,
    perms: [] as { permissionId: string; code: string; description: string }[],
    canEdit: true,
    onStartEdit: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  it('tühi nimekiri ja muutmise algus', () => {
    render(<UserGroupPermsEditor {...base} />);
    expect(screen.getByText('userGroups.noPermissions')).toBeTruthy();
    fireEvent.click(screen.getByText('userGroups.edit'));
    expect(base.onStartEdit).toHaveBeenCalled();
  });

  it('nimekiri ilma õiguseta', () => {
    render(<UserGroupPermsEditor {...base} canEdit={false} perms={[{ permissionId: '1', code: 'p', description: 'Kirj' }]} />);
    expect(screen.getByText('Kirj')).toBeTruthy();
    expect(screen.queryByText('userGroups.edit')).toBeNull();
  });

  it('muutmisrežiim', () => {
    render(<UserGroupPermsEditor {...base} editingPerms />);
    expect(screen.getByText('Õigus A')).toBeTruthy();
    fireEvent.click(screen.getByText('userGroups.save'));
    fireEvent.click(screen.getByText('userGroups.cancel'));
    expect(base.onSave).toHaveBeenCalled();
    expect(base.onCancel).toHaveBeenCalled();
  });
});
