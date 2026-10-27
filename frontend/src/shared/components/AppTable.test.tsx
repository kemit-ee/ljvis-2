// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

import { AppTable } from './AppTable';
import { VersionsTable } from './VersionsTable';
import type { ColumnDef } from '@tanstack/react-table';

interface Row {
  id: number;
  name: string;
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Nimi', enableSorting: true },
  { accessorKey: 'id', header: 'ID' },
];
const data: Row[] = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
];

describe('AppTable', () => {
  it('renders rows and handles row click', () => {
    const onRowClick = vi.fn();
    render(<AppTable id="t" data={data} columns={columns} onRowClick={onRowClick} hidePagination />);
    fireEvent.click(screen.getByText('Alpha'));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('shows empty state, and loading text', () => {
    const { rerender } = render(<AppTable id="t" data={[]} columns={columns} />);
    expect(screen.getByText('common.tableIsEmpty')).toBeTruthy();
    rerender(<AppTable id="t" data={[]} columns={columns} placeholder="Tühi!" />);
    expect(screen.getByText('Tühi!')).toBeTruthy();
    rerender(<AppTable id="t" data={data} columns={columns} isLoading />);
    expect(screen.getAllByText('common.tableLoading').length).toBeGreaterThan(0);
  });

  it('forwards sorting changes from a sortable header', () => {
    const onSortingChange = vi.fn();
    render(
      <AppTable
        id="t"
        data={data}
        columns={columns}
        sorting={[]}
        onSortingChange={onSortingChange}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        totalRows={2}
        manualSorting
        manualPagination
      />,
    );
    fireEvent.click(screen.getByText('Nimi'));
    expect(onSortingChange).toHaveBeenCalledWith([{ id: 'name', desc: false }]);
  });

  it('supports expandable rows, row classes and the column menu', () => {
    render(
      <AppTable
        id="t2"
        data={data}
        columns={columns}
        getRowCanExpand={() => true}
        renderSubComponent={(row) => <div>sub-{row.name}</div>}
        defaultExpanded
        rowClassName={(r) => (r.id === 1 ? 'hot' : undefined)}
        customizable
        persistKey="k"
        size="small"
        getRowId={(r) => String(r.id)}
        borderless
      />,
    );
    expect(screen.getByText('sub-Alpha')).toBeTruthy();
    fireEvent.click(screen.getByText('common.customizeColumns'));
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
  });
});

describe('VersionsTable', () => {
  const snapshots = [
    { snapshotId: 1, version: 1, createdAt: '2026-03-31T09:05:00', createdBy: 'Mari', orgName: null, status: 'saved' },
  ];

  it('renders nothing without snapshots', () => {
    const { container } = render(
      <VersionsTable id="v" snapshots={[]} getSnapshotLink={() => '/x'} getStatusLabel={(s) => s} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders snapshot rows with link and status label', () => {
    render(
      <MemoryRouter>
        <VersionsTable id="v" snapshots={snapshots} getSnapshotLink={(s) => '/s/' + s.snapshotId} getStatusLabel={(s) => 'L:' + s} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Mari')).toBeTruthy();
    expect(screen.getByText('L:saved')).toBeTruthy();
    expect(screen.getByText('31.03.2026 09:05')).toBeTruthy();
    expect(screen.getByText('forms.versions.open').closest('a')?.getAttribute('href')).toBe('/s/1');
  });
});
