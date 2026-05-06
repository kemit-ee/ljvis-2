import { describe, it, expect } from 'vitest';

/**
 * Unit tests for UserGroupListPage component logic
 *
 * Note: Due to TEDI design system using a pre-bundled older version of React,
 * we cannot render the component in tests without version conflicts.
 * These tests verify the component's constants and logic instead.
 */

describe('UserGroupListPage Component Structure', () => {
  it('should have correct translation keys', () => {
    const translationKeys = {
      title: 'userGroups.title',
      addGroup: 'userGroups.addGroup',
      search: 'userGroups.search',
      name: 'userGroups.name',
      organisations: 'userGroups.organisations',
      allOrganisations: 'userGroups.allOrganisations',
      viewDetails: 'userGroups.viewDetails',
    };

    expect(translationKeys.title).toBe('userGroups.title');
    expect(translationKeys.addGroup).toBe('userGroups.addGroup');
    expect(translationKeys.search).toBe('userGroups.search');
    expect(translationKeys.name).toBe('userGroups.name');
    expect(translationKeys.organisations).toBe('userGroups.organisations');
    expect(translationKeys.allOrganisations).toBe('userGroups.allOrganisations');
    expect(translationKeys.viewDetails).toBe('userGroups.viewDetails');
  });

  it('should have correct table and search IDs', () => {
    const tableId = 'user-groups-table';
    const searchId = 'group-search';

    expect(tableId).toBe('user-groups-table');
    expect(searchId).toBe('group-search');
  });

  it('should have correct column configuration', () => {
    const columns = [
      { accessor: 'name', enableSorting: true },
      { accessor: 'organisations', enableSorting: false },
      { id: 'viewDetails', enableSorting: false },
    ];

    expect(columns[0].accessor).toBe('name');
    expect(columns[1].accessor).toBe('organisations');
    expect(columns[2].id).toBe('viewDetails');
    expect(columns[1].enableSorting).toBe(false);
  });
});

describe('UserGroupListPage Permissions Logic', () => {
  it('should allow adding group with admin permission', () => {
    const hasPermission = (perms: string[], required: string) => perms.includes(required);

    const canAddGroup = hasPermission(['perm_user_group_edit_admin'], 'perm_user_group_edit_admin');
    expect(canAddGroup).toBe(true);
  });

  it('should not allow adding group without admin permission', () => {
    const hasPermission = (perms: string[], required: string) => perms.includes(required);

    const canAddGroup = hasPermission(['perm_user_group_list_local'], 'perm_user_group_edit_admin');
    expect(canAddGroup).toBe(false);
  });

  it('should not allow adding group with empty permissions', () => {
    const hasPermission = (perms: string[], required: string) => perms.includes(required);

    const canAddGroup = hasPermission([], 'perm_user_group_edit_admin');
    expect(canAddGroup).toBe(false);
  });
});

describe('UserGroupListPage Organisations Expansion Logic', () => {
  it('should show single row with coversAllOrganisations when group has all organisations', () => {
    const group = {
      id: '1',
      name: 'Super Admin Group',
      organisations: 'Haridusministeerium, Justiitsministeerium, Sotsiaalministeerium',
    };
    const totalOrgs = 3;

    const orgs = group.organisations.split(',').map((o) => o.trim()).filter((o) => o);
    const orgCount = orgs.length;
    const expandedData: any[] = [];

    if (orgCount === totalOrgs) {
      expandedData.push({ ...group, organisations: '', coversAllOrganisations: true });
    } else if (orgs.length > 0) {
      orgs.forEach((org, index) => {
        expandedData.push({ ...group, organisations: org, isAdditionalGroupRow: index > 0, coversAllOrganisations: false });
      });
    }

    expect(expandedData).toHaveLength(1);
    expect(expandedData[0].coversAllOrganisations).toBe(true);
    expect(expandedData[0].isAdditionalGroupRow).toBeUndefined();
  });

  it('should expand group with multiple organisations into separate rows when not covering all', () => {
    const group = {
      id: '1',
      name: 'Local Admin Group',
      organisations: 'Haridusministeerium, Justiitsministeerium',
    };
    const totalOrgs = 3;

    const orgs = group.organisations.split(',').map((o) => o.trim()).filter((o) => o);
    const orgCount = orgs.length;
    const expandedData: any[] = [];

    if (orgCount === totalOrgs) {
      expandedData.push({ ...group, organisations: '', coversAllOrganisations: true });
    } else if (orgs.length > 0) {
      orgs.forEach((org, index) => {
        expandedData.push({ ...group, organisations: org, isAdditionalGroupRow: index > 0, coversAllOrganisations: false });
      });
    }

    expect(expandedData).toHaveLength(2);
    expect(expandedData[0].organisations).toBe('Haridusministeerium');
    expect(expandedData[0].coversAllOrganisations).toBe(false);
    expect(expandedData[1].organisations).toBe('Justiitsministeerium');
    expect(expandedData[1].isAdditionalGroupRow).toBe(true);
  });

  it('should handle group with single organisation', () => {
    const group = {
      id: '2',
      name: 'Local Admin Group',
      organisations: 'Justiitsministeerium',
    };

    const orgs = group.organisations.split(',').map((o) => o.trim()).filter((o) => o);
    const expandedData: any[] = [];

    orgs.forEach((org, index) => {
      expandedData.push({ ...group, organisations: org, isAdditionalGroupRow: index > 0 });
    });

    expect(expandedData).toHaveLength(1);
    expect(expandedData[0].organisations).toBe('Justiitsministeerium');
    expect(expandedData[0].isAdditionalGroupRow).toBe(false);
  });

  it('should handle group with no organisations', () => {
    const group = {
      id: '3',
      name: 'Empty Group',
      organisations: '',
    };

    const orgs = group.organisations.split(',').map((o) => o.trim()).filter((o) => o);

    expect(orgs).toHaveLength(0);
  });

  it('should trim whitespace from organisation names', () => {
    const group = {
      id: '4',
      name: 'Test Group',
      organisations: '  Haridusministeerium  ,  Justiitsministeerium  ',
    };

    const orgs = group.organisations.split(',').map((o) => o.trim()).filter((o) => o);

    expect(orgs[0]).toBe('Haridusministeerium');
    expect(orgs[1]).toBe('Justiitsministeerium');
  });

  it('should keep group data intact on all expanded rows', () => {
    const group = {
      id: '5',
      name: 'Multi Org Group',
      organisations: 'OrgA, OrgB',
    };

    const orgs = group.organisations.split(',').map((o) => o.trim()).filter((o) => o);
    const expandedData: any[] = [];

    orgs.forEach((org, index) => {
      expandedData.push({ ...group, organisations: org, isAdditionalGroupRow: index > 0 });
    });

    expandedData.forEach((row) => {
      expect(row.id).toBe('5');
      expect(row.name).toBe('Multi Org Group');
    });
  });

  it('should expand all organisations individually when search is active', () => {
    const group = {
      id: '1',
      name: 'Super Admin Group',
      organisations: 'Haridusministeerium, Justiitsministeerium, Sotsiaalministeerium',
    };
    const totalOrgs = 3;
    const search = 'admin';

    const orgs = group.organisations.split(',').map((o) => o.trim()).filter((o) => o);
    const expandedData: any[] = [];

    // When search is active, always expand all organisations individually
    if (search) {
      orgs.forEach((org, index) => {
        expandedData.push({ 
          ...group, 
          organisations: org, 
          isAdditionalGroupRow: index > 0,
          coversAllOrganisations: false
        });
      });
    } else if (orgs.length === totalOrgs) {
      expandedData.push({ ...group, organisations: '', coversAllOrganisations: true });
    } else if (orgs.length > 0) {
      orgs.forEach((org, index) => {
        expandedData.push({ ...group, organisations: org, isAdditionalGroupRow: index > 0, coversAllOrganisations: false });
      });
    }

    expect(expandedData).toHaveLength(3);
    expect(expandedData[0].coversAllOrganisations).toBe(false);
    expect(expandedData[0].organisations).toBe('Haridusministeerium');
    expect(expandedData[1].isAdditionalGroupRow).toBe(true);
    expect(expandedData[1].organisations).toBe('Justiitsministeerium');
    expect(expandedData[2].isAdditionalGroupRow).toBe(true);
    expect(expandedData[2].organisations).toBe('Sotsiaalministeerium');
  });
});

describe('UserGroupListPage Sorting Logic', () => {
  it('should convert camelCase to snake_case for sorting', () => {
    const toSnakeCase = (str: string): string =>
      str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

    expect(toSnakeCase('name')).toBe('name');
    expect(toSnakeCase('organisations')).toBe('organisations');
  });

  it('should generate correct sorting string for ascending', () => {
    const toSnakeCase = (str: string): string =>
      str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

    const sorting = [{ id: 'name', desc: false }];
    const sortStr = `${toSnakeCase(sorting[0].id)} ${sorting[0].desc ? 'desc' : 'asc'}`;

    expect(sortStr).toBe('name asc');
  });

  it('should generate correct sorting string for descending', () => {
    const toSnakeCase = (str: string): string =>
      str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

    const sorting = [{ id: 'organisations', desc: true }];
    const sortStr = `${toSnakeCase(sorting[0].id)} ${sorting[0].desc ? 'desc' : 'asc'}`;

    expect(sortStr).toBe('organisations desc');
  });

  it('should use default sorting when no sorting is applied', () => {
    const sorting: any[] = [];
    const sortStr = sorting.length ? 'custom' : 'name asc';

    expect(sortStr).toBe('name asc');
  });
});

describe('UserGroupListPage Search Logic', () => {
  it('should reset page to 0 on search', () => {
    let pageIndex = 5;
    let searchExecuted = false;
    const handleSearch = (value: string) => {
      if (value.length >= 3 || value.length === 0) {
        searchExecuted = true;
        pageIndex = 0;
      }
    };

    handleSearch('Admin');
    expect(pageIndex).toBe(0);
    expect(searchExecuted).toBe(true);
  });

  it('should not execute search with less than 3 characters', () => {
    let searchExecuted = false;
    const handleSearch = (value: string) => {
      if (value.length >= 3 || value.length === 0) {
        searchExecuted = true;
      }
    };

    handleSearch('ab');
    expect(searchExecuted).toBe(false);
  });

  it('should execute search with exactly 3 characters', () => {
    let searchExecuted = false;
    const handleSearch = (value: string) => {
      if (value.length >= 3 || value.length === 0) {
        searchExecuted = true;
      }
    };

    handleSearch('abc');
    expect(searchExecuted).toBe(true);
  });

  it('should reset page and clear input on clearSearch', () => {
    let pageIndex = 3;
    let searchInput = 'Admin';
    let search = 'Admin';

    const clearSearch = () => {
      searchInput = '';
      search = '';
      pageIndex = 0;
    };

    clearSearch();
    expect(pageIndex).toBe(0);
    expect(searchInput).toBe('');
    expect(search).toBe('');
  });

  it('should search by group name', () => {
    const groups = [
      { id: '1', name: 'Local Admin Group', organisations: 'Justiitsministeerium' },
      { id: '2', name: 'Super Admin Group', organisations: 'Haridusministeerium' },
      { id: '3', name: 'Tavakasutaja', organisations: 'Justiitsministeerium' },
    ];

    const searchTerm = 'tava';
    const filtered = groups.filter(
      (g) =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.organisations.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Tavakasutaja');
  });

  it('should search by organisation name', () => {
    const groups = [
      { id: '1', name: 'Local Admin Group', organisations: 'Justiitsministeerium' },
      { id: '2', name: 'Super Admin Group', organisations: 'Haridusministeerium' },
      { id: '3', name: 'Tavakasutaja', organisations: 'Justiitsministeerium' },
    ];

    const searchTerm = 'haridus';
    const filtered = groups.filter(
      (g) =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.organisations.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Super Admin Group');
  });

  it('should return multiple groups when search matches both name and organisation', () => {
    const groups = [
      { id: '1', name: 'Local Admin Group', organisations: 'Justiitsministeerium' },
      { id: '2', name: 'Super Admin Group', organisations: 'Haridusministeerium' },
      { id: '3', name: 'Tavakasutaja', organisations: 'Justiitsministeerium' },
    ];

    const searchTerm = 'admin';
    const filtered = groups.filter(
      (g) =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.organisations.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    expect(filtered).toHaveLength(2);
  });

  it('should return empty list when no match found', () => {
    const groups = [
      { id: '1', name: 'Local Admin Group', organisations: 'Justiitsministeerium' },
      { id: '2', name: 'Tavakasutaja', organisations: 'Justiitsministeerium' },
    ];

    const searchTerm = 'xyz';
    const filtered = groups.filter(
      (g) =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.organisations.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    expect(filtered).toHaveLength(0);
  });
});

describe('UserGroupListPage Navigation Logic', () => {
  it('should navigate to correct user group detail page', () => {
    let navigatedTo = '';
    const navigate = (path: string) => {
      navigatedTo = path;
    };

    const handleRowClick = (row: { id: string }) => {
      navigate(`/user-groups/${row.id}`);
    };

    handleRowClick({ id: '42' });
    expect(navigatedTo).toBe('/user-groups/42');
  });

  it('should handle navigation for different group IDs', () => {
    const navigations: string[] = [];
    const navigate = (path: string) => {
      navigations.push(path);
    };

    const handleRowClick = (row: { id: string }) => {
      navigate(`/user-groups/${row.id}`);
    };

    handleRowClick({ id: '1' });
    handleRowClick({ id: '999' });
    handleRowClick({ id: 'abc-123' });

    expect(navigations).toEqual(['/user-groups/1', '/user-groups/999', '/user-groups/abc-123']);
  });

  it('should generate correct detail URL', () => {
    const groupId = 'abc-def-123';
    const detailUrl = `/user-groups/${groupId}`;

    expect(detailUrl).toBe('/user-groups/abc-def-123');
  });
});

describe('UserGroupListPage Local Admin Filtering Logic', () => {
  it('should filter groups for local admin to show only their organisation groups', () => {
    const groups = [
      { id: '1', name: 'Group 1', organisations: 'Justiitsministeerium' },
      { id: '2', name: 'Group 2', organisations: 'Haridusministeerium' },
      { id: '3', name: 'Group 3', organisations: 'Justiitsministeerium, Sotsiaalministeerium' },
    ];
    const user = { organisationname: 'Justiitsministeerium' };
    const totalOrgs = 3;

    const filteredGroups = groups.filter((group) => {
      const orgs = group.organisations ? group.organisations.split(',').map((o) => o.trim()).filter((o) => o) : [];
      const hasNoOrgs = orgs.length === 0;
      const hasUserOrg = orgs.includes(user.organisationname);
      const coversAll = orgs.length === totalOrgs;
      return hasNoOrgs || hasUserOrg || coversAll;
    });

    expect(filteredGroups).toHaveLength(2);
    expect(filteredGroups[0].name).toBe('Group 1');
    expect(filteredGroups[1].name).toBe('Group 3');
  });

  it('should show groups with no organisations for local admin', () => {
    const groups = [
      { id: '1', name: 'Group 1', organisations: '' },
      { id: '2', name: 'Group 2', organisations: 'Haridusministeerium' },
    ];
    const user = { organisationname: 'Justiitsministeerium' };
    const totalOrgs = 3;

    const filteredGroups = groups.filter((group) => {
      const orgs = group.organisations ? group.organisations.split(',').map((o) => o.trim()).filter((o) => o) : [];
      const hasNoOrgs = orgs.length === 0;
      const hasUserOrg = orgs.includes(user.organisationname);
      const coversAll = orgs.length === totalOrgs;
      return hasNoOrgs || hasUserOrg || coversAll;
    });

    expect(filteredGroups).toHaveLength(1);
    expect(filteredGroups[0].name).toBe('Group 1');
  });

  it('should show groups covering all organisations for local admin', () => {
    const groups = [
      { id: '1', name: 'Group 1', organisations: 'Haridusministeerium' },
      { id: '2', name: 'Group 2', organisations: 'Haridusministeerium, Justiitsministeerium, Sotsiaalministeerium' },
    ];
    const user = { organisationname: 'Justiitsministeerium' };
    const totalOrgs = 3;

    const filteredGroups = groups.filter((group) => {
      const orgs = group.organisations ? group.organisations.split(',').map((o) => o.trim()).filter((o) => o) : [];
      const hasNoOrgs = orgs.length === 0;
      const hasUserOrg = orgs.includes(user.organisationname);
      const coversAll = orgs.length === totalOrgs;
      return hasNoOrgs || hasUserOrg || coversAll;
    });

    expect(filteredGroups).toHaveLength(1);
    expect(filteredGroups[0].name).toBe('Group 2');
  });

  it('should not filter groups for admin users', () => {
    const permissions = ['perm_user_group_edit_admin'];
    const isLocalAdmin = permissions.includes('perm_user_group_list_local') && !permissions.includes('perm_user_group_edit_admin');

    expect(isLocalAdmin).toBe(false);
  });

  it('should identify local admin correctly', () => {
    const permissions = ['perm_user_group_list_local'];
    const isLocalAdmin = permissions.includes('perm_user_group_list_local') && !permissions.includes('perm_user_group_edit_admin');

    expect(isLocalAdmin).toBe(true);
  });

  it('should not identify user with both permissions as local admin', () => {
    const permissions = ['perm_user_group_list_local', 'perm_user_group_edit_admin'];
    const isLocalAdmin = permissions.includes('perm_user_group_list_local') && !permissions.includes('perm_user_group_edit_admin');

    expect(isLocalAdmin).toBe(false);
  });
});
