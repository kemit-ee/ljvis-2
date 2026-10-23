// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  perms: [] as string[],
  search: {} as Record<string, unknown>,
  exportRows: vi.fn(),
  downloadXlsx: vi.fn(),
  downloadCsv: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => h.navigate }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: { max?: number }) => (o?.max ? `${k}:${o.max}` : k) }),
}));
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({
    hasAnyPermission: () => !h.perms.includes('none'),
    hasPermission: (p: string) => h.perms.includes(p),
  }),
}));
vi.mock('../../../classifiers/ClassifierProvider.tsx', () => ({
  useClassifiers: () => ({
    getByCode: () => [{ classifierValueKey: 5, name: 'Harju maakond' }],
  }),
}));
vi.mock('./useFormSearch', () => ({ useFormSearch: () => h.search }));
vi.mock('./FormSearchFilters', () => ({
  FormSearchFilters: (p: { onSearch: () => void; onClear: () => void }) => (
    <div>
      <button onClick={p.onSearch}>do-search</button>
      <button onClick={p.onClear}>do-clear</button>
    </div>
  ),
}));
vi.mock('../../api', () => ({ exportSearchForms: h.exportRows }));
vi.mock('./formExport', () => ({
  buildExportTable: vi.fn(() => ({ headers: [], rows: [] })),
  downloadCsv: h.downloadCsv,
  downloadXlsx: h.downloadXlsx,
  exportFilename: (t: string, e: string) => `${t}.${e}`,
}));
vi.mock('../../../../shared/components/AppTable', async () => ({
  AppTable: (props: {
    data: unknown[];
    columns: never[];
    placeholder: string;
  }) => {
    const Table = () => {
      const table = useReactTable({ data: props.data, columns: props.columns, getCoreRowModel: getCoreRowModel() });
      return (
        <table>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id}>
                {r.getVisibleCells().map((c) => (
                  <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    };
    return props.data.length ? <Table /> : <p>{props.placeholder}</p>;
  },
}));

import { FormSearchPage } from './FormSearchPage';

const row = (o: object = {}) => ({
  formType: 'adr',
  formKey: 12,
  formNumber: 'ADR-1',
  status: 'published',
  mainDate: '2026-03-04',
  county: '5',
  vehicleRegNr: '123ABC',
  companyName: 'Firma',
  inspectorName: 'Ins',
  hasViolation: true,
  ...o,
});

const setSearch = (o: Record<string, unknown> = {}) => {
  h.search = {
    applied: { formType: 'adr' },
    draft: {},
    setField: vi.fn(),
    applyFilters: vi.fn(),
    clearFilters: vi.fn(),
    resetKey: 0,
    data: [row()],
    totalRows: 1,
    isLoading: false,
    pagination: { pageIndex: 0, pageSize: 20 },
    setPagination: vi.fn(),
    sorting: [],
    setSorting: vi.fn(),
    ...o,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  h.perms = ['form.export'];
  setSearch();
  h.exportRows.mockResolvedValue([{ data: '{}' }]);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('FormSearchPage', () => {
  it('ilma lugemisõiguseta näitab keelatud teadet', () => {
    h.perms = ['none'];
    render(<FormSearchPage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('renderdab rea: tüüp, staatus, kuupäev, maakond ja lahtrid', () => {
    render(<FormSearchPage />);
    expect(screen.getByText('search.formType.adr')).toBeTruthy();
    expect(screen.getByText('ADR-1')).toBeTruthy();
    expect(screen.getByText('forms.foreign_violation.statusPublished')).toBeTruthy();
    expect(screen.getByText('Harju maakond')).toBeTruthy();
    expect(screen.getByText('123ABC')).toBeTruthy();
    expect(screen.getByText('Firma')).toBeTruthy();
  });

  it('puuduvad väärtused näitavad kriipsu ja tundmatu tüüp/staatus jääb toorena', () => {
    setSearch({
      data: [row({ formType: 'zzz', status: 'weird', county: null, vehicleRegNr: null, companyName: null, inspectorName: null, hasViolation: false })],
    });
    render(<FormSearchPage />);
    expect(screen.getByText('zzz')).toBeTruthy();
    expect(screen.getByText('weird')).toBeTruthy();
    expect(screen.getAllByText('—').length).toBe(4);
  });

  it('kinnitatud ja salvestatud staatus renderdub', () => {
    setSearch({ data: [row({ status: 'confirmed' }), row({ status: 'saved', formKey: 13 })] });
    render(<FormSearchPage />);
    expect(screen.getByText('forms.foreign_violation.statusConfirmed')).toBeTruthy();
    expect(screen.getByText('forms.foreign_violation.statusSaved')).toBeTruthy();
  });

  it('"Vaata" link navigeerib vormi lehele', () => {
    render(<FormSearchPage />);
    fireEvent.click(screen.getByText('common.look'));
    expect(h.navigate).toHaveBeenCalledWith('/control-forms/adr/12');
  });

  it('tühi tabel näitab kohahoidjat', () => {
    setSearch({ data: [], totalRows: 0 });
    render(<FormSearchPage />);
    expect(screen.getByText('common.tableIsEmpty')).toBeTruthy();
  });

  it('filtri nupud kutsuvad hooki', () => {
    render(<FormSearchPage />);
    fireEvent.click(screen.getByText('do-search'));
    fireEvent.click(screen.getByText('do-clear'));
    expect((h.search.applyFilters as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect((h.search.clearFilters as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('ekspordinupud puuduvad ilma õiguseta', () => {
    h.perms = [];
    render(<FormSearchPage />);
    expect(screen.queryByText('search.export.xlsx')).toBeNull();
  });

  it('ilma vormitüübita on eksport keelatud ja näitab vihjet', () => {
    setSearch({ applied: { formType: '' } });
    render(<FormSearchPage />);
    expect(screen.getByText('search.export.pickType')).toBeTruthy();
    expect((screen.getByText('search.export.csv') as HTMLButtonElement).closest('button')!.disabled).toBe(true);
  });

  it('CSV eksport laeb andmed ja käivitab allalaadimise', async () => {
    render(<FormSearchPage />);
    fireEvent.click(screen.getByText('search.export.csv'));
    await waitFor(() => expect(h.downloadCsv).toHaveBeenCalled());
    expect(h.downloadCsv.mock.calls[0][1]).toBe('adr.csv');
  });

  it('XLSX eksport kasutab xlsx allalaadimist', async () => {
    render(<FormSearchPage />);
    fireEvent.click(screen.getByText('search.export.xlsx'));
    await waitFor(() => expect(h.downloadXlsx).toHaveBeenCalled());
    expect(h.downloadXlsx.mock.calls[0][1]).toBe('adr.xlsx');
  });

  it('liiga paljude ridade korral näitab viga ja ei lae alla', async () => {
    h.exportRows.mockResolvedValue(new Array(5001).fill({ data: '{}' }));
    render(<FormSearchPage />);
    fireEvent.click(screen.getByText('search.export.csv'));
    expect(await screen.findByText('search.export.tooMany:5000')).toBeTruthy();
    expect(h.downloadCsv).not.toHaveBeenCalled();
  });

  it('ekspordi viga näitab veateadet', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.exportRows.mockRejectedValue(new Error('x'));
    render(<FormSearchPage />);
    fireEvent.click(screen.getByText('search.export.csv'));
    expect(await screen.findByText('search.export.failed')).toBeTruthy();
    err.mockRestore();
  });
});
