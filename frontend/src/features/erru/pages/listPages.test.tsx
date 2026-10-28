// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { exerciseAll } from '../testing/exercise';

const mocks = vi.hoisted(() => ({ permissions: [] as string[], list: {} as Record<string, unknown> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@tedi-design-system/react/tedi', async () => (await import('../testing/tediMock')).tediMock());
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ hasAnyPermission: (p: string[]) => p.some((x) => mocks.permissions.includes(x)) }),
}));
vi.mock('../../classifiers/useClassifierLabel', () => ({
  useClassifierLabel: () => ({
    label: (_c: string, v: string | null) => (v ? `L:${v}` : '—'),
    options: () => [{ value: 'x', label: 'X' }],
  }),
}));
vi.mock('../../classifiers/ClassifierProvider', () => {
  const list = [{ code: 'EE', name: 'Eesti' }, { code: 'LV', name: 'Läti' }];
  return { useClassifiers: () => ({ getByCode: () => list, getErruMemberCountries: () => list }) };
});
vi.mock('./ctud/useCtudList', () => ({ useCtudList: () => mocks.list }));
vi.mock('./ncr/useNcrList', () => ({ useNcrList: () => mocks.list }));
vi.mock('./nu/useNuList', () => ({ useNuList: () => mocks.list }));
vi.mock('./rsi/useRsiList', () => ({ useRsiList: () => mocks.list }));

import { CtudListPage } from './ctud/CtudListPage';
import { NcrListPage } from './ncr/NcrListPage';
import { NuListPage } from './nu/NuListPage';
import { RsiListPage } from './rsi/RsiListPage';

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
});
beforeEach(() => {
  mocks.permissions = [];
});
afterEach(cleanup);

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}

const row = (n: number, full: boolean) => ({
  id: n,
  version: 1,
  direction: full ? 'outgoing' : 'incoming',
  status: full ? 'sent' : 'received',
  responseStatusCode: full ? 'Found' : null,
  businessCaseId: `BC-${n}`,
  sentAt: full ? '2024-01-02T10:00:00Z' : null,
  messageDate: full ? '2024-01-02' : null,
  ctudFrom: full ? 'EE' : null,
  ctudTo: full ? 'LV' : null,
  ncrFrom: full ? 'EE' : null,
  ncrTo: full ? 'LV' : null,
  rsiFrom: full ? 'EE' : null,
  rsiTo: full ? 'LV' : null,
  countryCode: full ? 'LV' : null,
  transportUndertakingName: full ? 'AS Test' : null,
  communityLicenceNumber: full ? 'L1' : null,
  vehicleRegistrationNumber: full ? 'ABC' : null,
  vehicleRegistrationCountry: full ? 'LV' : null,
  tmFirstName: full ? 'Jaan' : null,
  tmFamilyName: full ? 'Tamm' : null,
  handlerName: full ? 'H' : null,
  hasInfringement: full,
  eventAt: full ? '2024-01-02T10:00:00Z' : null,
  needsAttention: !full,
  automatic: full,
  inspectionPassed: full,
  failedItemsCount: full ? 3 : null,
});

const baseList = () => ({
  data: [row(1, true), row(2, false)],
  totalRows: 2,
  isLoading: false,
  pagination: { pageIndex: 0, pageSize: 10 },
  setPagination: vi.fn(),
  sorting: [],
  setSorting: vi.fn(),
  draftFilters: {},
  setFilter: vi.fn(),
  applyFilters: vi.fn(),
  applyFiltersWith: vi.fn(),
  resetFilters: vi.fn(),
  resetKey: 0,
});

describe.each([
  ['CTUD', CtudListPage, 'ctud.read', 'ctud.create', '/erru/ctud', 'BC-1', '/erru/ctud/1', 'erru.ctud.list.newRequest'],
  ['NCR', NcrListPage, 'ncr.list', 'ncr.create', '/erru/ncr', 'BC-1', '/erru/ncr/BC-1', 'erru.ncr.list.newMessage'],
  ['NU', NuListPage, 'nu.list', 'nu.create', '/erru/nu', 'BC-1', '/erru/nu/1', 'erru.nu.list.newMessage'],
  ['RSI', RsiListPage, 'rsi.read', 'rsi.create', '/erru/rsi', 'BC-1', '/erru/rsi/1', 'erru.rsi.list.newMessage'],
] as const)('%s list page', (_name, Page, read, create, base, caseId, detailPath, newKey) => {
  const open = () =>
    render(
      <MemoryRouter initialEntries={[base]}>
        <Routes>
          <Route path={base} element={<Page />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );

  it('is forbidden without the read permission', () => {
    mocks.list = baseList();
    open();
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('shows rows, applies filters and opens a record', () => {
    mocks.permissions = [read, create];
    const list = baseList();
    list.draftFilters = { sentFrom: '2024-01-01', sentUntil: '2024-02-01', dateFrom: '2024-01-01', dateUntil: '2024-02-01', status: 'x' } as never;
    mocks.list = list;
    open();
    expect(screen.getByText(caseId)).toBeTruthy();
    exerciseAll();
    expect(list.setFilter.mock.calls.length + list.applyFiltersWith.mock.calls.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('common.search'));
    expect(list.applyFilters).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.clear'));
    expect(list.resetFilters).toHaveBeenCalled();
    fireEvent.click(screen.getByText(caseId));
    expect(screen.getByTestId('where').textContent).toBe(detailPath);
  });

  it('starts a new record from the create button', () => {
    mocks.permissions = [read, create];
    mocks.list = baseList();
    open();
    fireEvent.click(screen.getByText(newKey));
    expect(screen.getByTestId('where').textContent).toBe(`${base}/new`);
  });

  it('hides the create button for read-only users', () => {
    mocks.permissions = [read];
    mocks.list = baseList();
    open();
    expect(screen.queryByText(newKey)).toBeNull();
  });
});

describe('NCR list row highlighting', () => {
  it('marks infringement rows pink, unresolved incoming ones with the attention border and shows the badge', () => {
    mocks.permissions = ['ncr.list'];
    const list = baseList();
    list.data = [
      { ...row(1, true), hasInfringement: true, needsAttention: false },
      { ...row(2, false), hasInfringement: true, needsAttention: true },
      { ...row(3, true), hasInfringement: false, needsAttention: false },
    ];
    mocks.list = list;
    render(
      <MemoryRouter initialEntries={['/erru/ncr']}>
        <Routes>
          <Route path="/erru/ncr" element={<NcrListPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const tr = (id: string) => screen.getByText(id).closest('tr') as HTMLElement;
    expect(tr('BC-1').className).toContain('ncr-row-infringement');
    expect(tr('BC-1').className).not.toContain('ncr-row-attention');
    expect(tr('BC-2').className).toContain('ncr-row-infringement');
    expect(tr('BC-2').className).toContain('ncr-row-attention');
    expect(tr('BC-3').className).not.toContain('ncr-row');
    expect(screen.getAllByText('erru.ncr.list.withInfringement')).toHaveLength(2);
    expect(screen.getAllByText('erru.ncr.list.compliant')).toHaveLength(1);
  });
});
