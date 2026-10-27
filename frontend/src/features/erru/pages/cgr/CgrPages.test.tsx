// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { exerciseAll } from '../../testing/exercise';

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  list: {} as Record<string, unknown>,
  detail: {} as Record<string, unknown>,
  getCgrRequest: vi.fn(),
  formError: null as string | null,
}));
vi.mock('../../api', () => ({ getCgrRequest: mocks.getCgrRequest }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testing/tediMock')).tediMock());
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasAnyPermission: (p: string[]) => p.some((x) => mocks.permissions.includes(x)) }),
}));
vi.mock('../../../classifiers/useClassifierLabel', () => ({
  useClassifierLabel: () => ({
    label: (_c: string, v: string | null) => (v ? `L:${v}` : '—'),
    options: () => [{ value: 'sent', label: 'Saadetud' }],
  }),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => {
  const list = [{ code: 'EE', name: 'Eesti' }, { code: 'LV', name: 'Läti' }];
  const stable = { getByCode: () => list, getErruMemberCountries: () => list };
  return { useClassifiers: () => stable };
});
vi.mock('./useCgrList', () => ({ useCgrList: () => mocks.list }));
vi.mock('./useCgrRequestDetail', () => ({ useCgrRequestDetail: () => mocks.detail }));
vi.mock('./useCgrForm', async () => {
  const actual = await vi.importActual<typeof import('./useCgrForm')>('./useCgrForm');
  return { useCgrForm: (...args: Parameters<typeof actual.useCgrForm>) => ({ ...actual.useCgrForm(...args), formError: mocks.formError }) };
});

import { CgrFormCreatePage } from './CgrFormCreatePage';
import { CgrFormPage } from './CgrFormPage';
import { CgrListPage } from './CgrListPage';

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
  window.scrollTo = vi.fn() as never;
});
beforeEach(() => {
  mocks.permissions = ['cgr.read', 'cgr.create', 'cgr.send'];
  mocks.formError = null;
  mocks.getCgrRequest.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(cleanup);

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}
const renderAt = (path: string, element: React.ReactNode, route = path.split('?')[0]) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={element} />
        {route !== '/erru/cgr/new' && <Route path="/erru/cgr/new" element={<Where />} />}
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe('CgrListPage', () => {
  const baseList = () => ({
    data: [
      { id: 1, status: 'sent', responseStatusCode: 'Found', sentAt: '2024-01-02T10:00:00Z', businessCaseId: 'BC-1', tmFirstName: 'Jaan', tmFamilyName: 'Tamm', certificateNumber: 'C1', handlerName: 'H' },
      { id: 2, status: 'initiated', responseStatusCode: null, sentAt: null, businessCaseId: 'BC-2', tmFirstName: null, tmFamilyName: null, certificateNumber: null, handlerName: null },
    ],
    totalRows: 2,
    isLoading: false,
    pagination: { pageIndex: 0, pageSize: 10 },
    setPagination: vi.fn(),
    sorting: [],
    setSorting: vi.fn(),
    draftFilters: { sentFrom: '2024-01-01', sentUntil: '2024-02-01', cgrTo: 'LV', status: 'sent' },
    setFilter: vi.fn(),
    applyFilters: vi.fn(),
    resetFilters: vi.fn(),
    resetKey: 0,
  });

  it('is forbidden without the read permission', () => {
    mocks.permissions = [];
    mocks.list = baseList();
    renderAt('/erru/cgr', <CgrListPage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('lists requests, edits filters and navigates', () => {
    const list = baseList();
    mocks.list = list;
    renderAt('/erru/cgr', <CgrListPage />);
    expect(screen.getByText('BC-1')).toBeTruthy();
    exerciseAll();
    expect(list.setFilter).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.search'));
    expect(list.applyFilters).toHaveBeenCalled();
    fireEvent.click(screen.getByText('common.clear'));
    expect(list.resetFilters).toHaveBeenCalled();
    fireEvent.click(screen.getByText('BC-1'));
    expect(screen.getByTestId('where').textContent).toBe('/erru/cgr/1');
  });

  it('opens the creation form for users who may create', () => {
    mocks.list = baseList();
    renderAt('/erru/cgr', <CgrListPage />);
    fireEvent.click(screen.getByText('erru.cgr.list.newRequest'));
    expect(screen.getByTestId('where').textContent).toBe('/erru/cgr/new');
  });

  it('hides the create button without permission and tolerates empty filters', () => {
    mocks.permissions = ['cgr.read'];
    mocks.list = { ...baseList(), draftFilters: {} };
    renderAt('/erru/cgr', <CgrListPage />);
    expect(screen.queryByText('erru.cgr.list.newRequest')).toBeNull();
  });
});

describe('CgrFormCreatePage', () => {
  it('is forbidden without the create permission', () => {
    mocks.permissions = ['cgr.read'];
    renderAt('/erru/cgr/new', <CgrFormCreatePage />);
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('renders the blank form and surfaces errors after a failed submit', async () => {
    mocks.formError = 'boom';
    renderAt('/erru/cgr/new', <CgrFormCreatePage />);
    expect(screen.getByText('erru.cgr.form.titleNew')).toBeTruthy();
    expect(screen.getByText('boom')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByText('common.save')));
    await waitFor(() => expect(screen.getByText('common.formHasErrors')).toBeTruthy());
  });

  it('pre-fills the form from the request being copied', async () => {
    mocks.getCgrRequest.mockResolvedValue({ id: 3, cgrTo: 'LV', tmFirstName: 'Jaan' });
    renderAt('/erru/cgr/new?copyFrom=3', <CgrFormCreatePage />);
    expect(screen.getByText('common.loading')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('erru.cgr.form.titleNew')).toBeTruthy());
    expect(mocks.getCgrRequest).toHaveBeenCalledWith('3');
    expect((document.getElementById('cgr-tm-first-name') as HTMLInputElement).value).toBe('Jaan');
    expect((document.getElementById('cgr-to') as HTMLSelectElement).value).toBe('');
  });

  it('carries on when the copy source cannot be loaded', async () => {
    mocks.getCgrRequest.mockRejectedValue(new Error('x'));
    renderAt('/erru/cgr/new?copyFrom=3', <CgrFormCreatePage />);
    await waitFor(() => expect(screen.getByText('erru.cgr.form.titleNew')).toBeTruthy());
  });
});

describe('CgrFormPage', () => {
  const request = (over: object = {}) => ({
    id: 7,
    version: 2,
    direction: 'outgoing',
    status: 'initiated',
    businessCaseId: 'BC-7',
    cgrFrom: 'EE',
    cgrTo: 'ZZ',
    originatingAuthority: 'KLIM',
    requestSource: 'CA',
    requestPurpose: 'P',
    tmFirstName: 'Jaan',
    errorMessage: null,
    memberStates: [],
    ...over,
  });
  const setDetail = (req: object | undefined, over: object = {}) => {
    mocks.detail = {
      request: req,
      isLoading: false,
      notFound: false,
      send: vi.fn(),
      isSending: false,
      resend: vi.fn(),
      resendingCountry: null,
      sendError: null,
      reload: vi.fn(),
      ...over,
    };
    return mocks.detail as { send: ReturnType<typeof vi.fn>; reload: ReturnType<typeof vi.fn> };
  };
  const page = () => renderAt('/erru/cgr/7', <CgrFormPage />, '/erru/cgr/:id');

  it.each([
    ['forbidden', () => { mocks.permissions = []; setDetail(request()); }, 'common.forbidden'],
    ['loading', () => setDetail(undefined, { isLoading: true }), 'common.loading'],
    ['not found', () => setDetail(undefined, { notFound: true }), 'erru.cgr.notFound'],
  ])('shows %s state', (_n, setup, text) => {
    setup();
    page();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('edits a draft: save, send and copy', async () => {
    const detail = setDetail(request());
    page();
    expect(screen.getByText('BC-7')).toBeTruthy();
    exerciseAll();
    fireEvent.click(screen.getByText('erru.cgr.form.send'));
    expect(detail.send).toHaveBeenCalled();
    fireEvent.click(screen.getByText('erru.cgr.form.copyRequest'));
    expect(screen.getByTestId('where').textContent).toBe('/erru/cgr/new?copyFrom=7');
  });

  it('shows the form error and validation summary', async () => {
    mocks.formError = 'bad';
    setDetail(request());
    page();
    expect(screen.getByText('bad')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByText('common.save')));
    await waitFor(() => expect(screen.getByText('common.formHasErrors')).toBeTruthy());
  });

  it('shows a read-only sent request with the awaiting-response note and send errors', () => {
    setDetail(request({ status: 'sent', cgrTo: 'LV', certificateNumber: 'C1' }), { sendError: 'invalid_cgr_xml' });
    page();
    expect(screen.getByText('erru.cgr.awaitingResponse')).toBeTruthy();
    expect(screen.getByText('erru.cgr.invalidXml')).toBeTruthy();
    expect(screen.getByText('L:LV')).toBeTruthy();
    fireEvent.click(screen.getByText('erru.cgr.form.copyRequest'));
    expect(screen.getByTestId('where').textContent).toContain('copyFrom=7');
  });

  it.each([
    ['send_unknown', 'erru.cgr.sendUnknown'],
    ['validation_unavailable', 'erru.cgr.validationUnavailable'],
    ['nysiis_unavailable', 'erru.cgr.nysiisUnavailable'],
    ['other', 'erru.cgr.sendFailed'],
  ])('maps send error %s', (code, text) => {
    setDetail(request({ status: 'sent' }), { sendError: code });
    page();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('allows a resend of a failed request and reports status messages', () => {
    const detail = setDetail(request({ status: 'error', errorMessage: 'kaputt' }));
    page();
    expect(screen.getByText('kaputt')).toBeTruthy();
    fireEvent.click(screen.getByText('erru.cgr.form.resend'));
    expect(detail.send).toHaveBeenCalled();
  });

  it.each([
    ['sending', 'erru.cgr.sending'],
    ['send_unknown', 'erru.cgr.sendUnknownStatus'],
  ])('labels the %s status', (status, text) => {
    setDetail(request({ status, errorMessage: 'e' }));
    page();
    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
  });

  it('is read-only for inbound requests and without create permission', () => {
    mocks.permissions = ['cgr.read'];
    setDetail(request({ direction: 'incoming', status: 'received' }));
    page();
    expect(screen.getByText('erru.cgr.form.titleInbound', { exact: false })).toBeTruthy();
    expect(screen.queryByText('erru.cgr.form.copyRequest')).toBeNull();
  });

  it('closes the saved banner when coming from creation', () => {
    setDetail(request({ status: 'sent' }));
    render(
      <MemoryRouter initialEntries={[{ pathname: '/erru/cgr/7', state: { justSaved: true } }]}>
        <Routes>
          <Route path="/erru/cgr/:id" element={<CgrFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('common.saved')).toBeTruthy();
  });
});
