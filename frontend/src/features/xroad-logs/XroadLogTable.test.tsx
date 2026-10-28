// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { XroadLogTable } from './XroadLogTable';
import { XroadLogListPage } from './pages/XroadLogListPage/XroadLogListPage';
import { fetchXroadLogList } from './api';
import type { XroadLogEntry } from './types';

let perms: string[] = ['xroad.log.read'];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}));
vi.mock('../../shared/errors/ErrorContext', () => ({
  useErrorContext: () => ({ showMessage: vi.fn() }),
}));
vi.mock('./api', () => ({ fetchXroadLogList: vi.fn(), runManualJob: vi.fn() }));

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

const entry = (over: Partial<XroadLogEntry>): XroadLogEntry => ({
  id: '1',
  serviceCode: 'svc',
  requestXml: '{"q":1}',
  responseXml: null,
  durationMs: 1,
  success: true,
  errorMessage: null,
  resultStatus: 'found',
  personIdentifier: null,
  sourceType: 'compound_form',
  sourceRecordId: '9',
  formNumber: 'sp-1/1',
  createdAt: '2026-01-02T03:04:05',
  ...over,
});

beforeEach(() => {
  perms = ['xroad.log.read'];
  vi.mocked(fetchXroadLogList).mockResolvedValue({
    content: [
      entry({}),
      entry({ id: '2', resultStatus: 'error', sourceType: null, sourceRecordId: null, formNumber: null }),
      entry({ id: '3', resultStatus: 'not_found', sourceType: 'unknown_src' }),
      entry({ id: '4', resultStatus: null, success: false, serviceCode: null }),
      entry({ id: '5', resultStatus: null, success: true }),
      entry({ id: '6', resultStatus: 'unmapped', responseXml: '{"AsjaNR":"123"}' }),
    ],
    total: 6,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderTable = () =>
  render(
    <MemoryRouter>
      <XroadLogTable />
    </MemoryRouter>,
  );

describe('XroadLogTable', () => {
  it('kuvab erinevate staatustega ridu ja vormilinki', async () => {
    renderTable();
    const link = await screen.findAllByText('compound_form');
    expect(link[0].closest('a')?.getAttribute('href')).toContain('/9');
    expect(screen.getAllByText('xroadLogs.status.found').length).toBeTruthy();
    expect(screen.getAllByText('xroadLogs.status.notFound').length).toBeTruthy();
    expect(screen.getAllByText('xroadLogs.status.error').length).toBeGreaterThan(0);
    expect(screen.getByText('xroadLogs.status.success')).toBeTruthy();
    expect(screen.getAllByText('xroadLogs.status.unmapped').length).toBe(2);
  });

  it('päringu ja vastuse nupud avavad modaali', async () => {
    renderTable();
    const reqs = await screen.findAllByText('xroadLogs.viewRequest');
    fireEvent.click(reqs[0]);
    expect(await screen.findByText(/"q": 1/)).toBeTruthy();
    cleanup();
    renderTable();
    const resps = await screen.findAllByText('xroadLogs.viewResponse');
    fireEvent.click(resps[0]);
    expect(await screen.findByText('xroadLogs.empty')).toBeTruthy();
  });

  it('teenuste ulatuse lüliti lisab teenusekoodi veeru ja rakendab filtri', async () => {
    renderTable();
    await screen.findAllByText('compound_form');
    expect(screen.queryByText('xroadLogs.column.serviceCode')).toBeNull();
    fireEvent.click(screen.getByText('xroadLogs.scope.etoimik'));
    expect(await screen.findByText('xroadLogs.column.serviceCode')).toBeTruthy();
    await waitFor(() =>
      expect(vi.mocked(fetchXroadLogList).mock.calls.at(-1)![1]).toMatchObject({ allServices: 'true' }),
    );
  });

  it('staatusefilter ja "Otsi" rakendavad filtri', async () => {
    renderTable();
    await screen.findAllByText('compound_form');
    fireEvent.click(screen.getByLabelText('xroadLogs.status.found'));
    fireEvent.click(screen.getByText('common.search'));
    await waitFor(() =>
      expect(vi.mocked(fetchXroadLogList).mock.calls.at(-1)![1]).toMatchObject({ includeFound: 'false' }),
    );
  });

  it('tühi tulemus näitab tühja teadet', async () => {
    vi.mocked(fetchXroadLogList).mockResolvedValue({ content: [], total: 0 });
    renderTable();
    expect(await screen.findByText('xroadLogs.emptyResult')).toBeTruthy();
  });
});

describe('XroadLogListPage', () => {
  it('ilma õiguseta keelatud', () => {
    perms = [];
    render(<XroadLogListPage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('õigusega näitab tabelit ja käsitsi käivitamise kaarti', async () => {
    render(
      <MemoryRouter>
        <XroadLogListPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('xroadLogs.title')).toBeTruthy();
    expect(screen.getByText('xroadLogs.manualJobs.title')).toBeTruthy();
    await screen.findAllByText('compound_form');
  });
});
