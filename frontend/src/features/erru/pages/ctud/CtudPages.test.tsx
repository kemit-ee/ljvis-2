// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  detail: {} as Record<string, unknown>,
  form: {} as Record<string, unknown>,
  onSaved: (() => {}) as (id?: string, sendError?: string) => void,
}));
vi.mock('react-i18next', () => {
  const t = (k: string) => k;
  return { useTranslation: () => ({ t }) };
});
vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testing/tediMock')).tediMock());
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasAnyPermission: (p: string[]) => p.some((x) => mocks.permissions.includes(x)) }),
}));
vi.mock('../../../classifiers/useClassifierLabel', () => ({
  useClassifierLabel: () => ({ label: (_c: string, v: string | null) => (v ? `L:${v}` : '—') }),
}));
vi.mock('./useCtudRequestDetail', () => ({ useCtudRequestDetail: () => mocks.detail }));
vi.mock('./useCtudForm', () => ({
  useCtudForm: (_request: unknown, onSaved: (id?: string, sendError?: string) => void) => {
    mocks.onSaved = onSaved;
    return mocks.form;
  },
}));
vi.mock('../../components/Ctud/CtudRequestFields', () => ({ CtudRequestFields: () => <div>request-fields</div> }));
vi.mock('../../components/Ctud/CtudResponseBlock', () => ({ CtudResponseBlock: () => <div>response-block</div> }));

import { CtudFormCreatePage } from './CtudFormCreatePage';
import { CtudFormPage } from './CtudFormPage';

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
  window.scrollTo = vi.fn() as never;
});

const formStub = (over: object = {}) => ({
  formik: { submitCount: 0, errors: {}, isSubmitting: false, handleSubmit: (e: Event) => e?.preventDefault?.() },
  formError: null,
  clearFormError: vi.fn(),
  ...over,
});
beforeEach(() => {
  mocks.permissions = ['ctud.read', 'ctud.create', 'ctud.send'];
  mocks.form = formStub();
});
afterEach(cleanup);

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}
const renderAt = (path: string, element: React.ReactNode, route: string, state?: object) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path={route} element={element} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe('CtudFormCreatePage', () => {
  it('is forbidden without the create permission', () => {
    mocks.permissions = [];
    renderAt('/erru/ctud/new', <CtudFormCreatePage />, '/erru/ctud/new');
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('renders the form with errors and returns to the list', () => {
    mocks.form = formStub({ formError: 'bad', formik: { submitCount: 1, errors: { a: 'x' }, isSubmitting: false, handleSubmit: vi.fn() } });
    renderAt('/erru/ctud/new', <CtudFormCreatePage />, '/erru/ctud/new');
    expect(screen.getByText('bad')).toBeTruthy();
    expect(screen.getByText('common.formHasErrors')).toBeTruthy();
    fireEvent.click(screen.getByText('erru.ctud.form.backToList'));
    expect(screen.getByTestId('where').textContent).toBe('/erru/ctud');
  });
});

describe('CtudFormCreatePage navigation after save', () => {
  it('opens the new request, passing a send error along', async () => {
    renderAt('/erru/ctud/new', <CtudFormCreatePage />, '/erru/ctud/new');
    await act(async () => mocks.onSaved('5', 'send_unknown'));
    expect(screen.getByTestId('where').textContent).toBe('/erru/ctud/5');
  });

  it('falls back to the list when no id is returned', async () => {
    renderAt('/erru/ctud/new', <CtudFormCreatePage />, '/erru/ctud/new');
    await act(async () => mocks.onSaved(undefined));
    expect(screen.getByTestId('where').textContent).toBe('/erru/ctud');
  });
});

describe('CtudFormPage', () => {
  const request = (over: object = {}) => ({
    id: 3,
    version: 2,
    direction: 'outgoing',
    status: 'initiated',
    businessCaseId: 'BC-3',
    ctudFrom: 'EE',
    ctudTo: 'LV',
    originatingAuthority: 'KLIM',
    requestSource: 'CA',
    requestPurpose: 'P',
    sentAt: '2024-01-02T10:00:00Z',
    transportUndertakingName: 'AS',
    communityLicenceNumber: 'L',
    vehicleRegistrationNumber: 'V',
    vehicleRegistrationCountry: 'LV',
    requestAllVehicles: true,
    errorMessage: null,
    ...over,
  });
  const setDetail = (req: object | undefined, over: object = {}) => {
    mocks.detail = {
      request: req,
      isLoading: false,
      notFound: false,
      send: vi.fn(),
      isSending: false,
      sendError: null,
      reload: vi.fn(),
      ...over,
    };
    return mocks.detail as { send: ReturnType<typeof vi.fn>; reload: ReturnType<typeof vi.fn> };
  };
  const page = (state?: object) => renderAt('/erru/ctud/3', <CtudFormPage />, '/erru/ctud/:id', state);

  it.each([
    ['forbidden', () => { mocks.permissions = []; setDetail(request()); }, 'common.forbidden'],
    ['loading', () => setDetail(undefined, { isLoading: true }), 'common.loading'],
    ['not found', () => setDetail(undefined, { notFound: true }), 'erru.ctud.notFound'],
  ])('shows %s state', (_n, setup, text) => {
    setup();
    page();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('edits and sends a draft', () => {
    const detail = setDetail(request());
    mocks.form = formStub({ formError: 'bad', formik: { submitCount: 1, errors: { a: 'x' }, isSubmitting: false, handleSubmit: vi.fn() } });
    page({ justSaved: true });
    expect(screen.getByText('request-fields')).toBeTruthy();
    expect(screen.getByText('common.saved')).toBeTruthy();
    expect(screen.getByText('common.formHasErrors')).toBeTruthy();
    fireEvent.click(screen.getByText('erru.ctud.form.send'));
    expect(detail.send).toHaveBeenCalled();
  });

  it('shows read-only details with the response', () => {
    mocks.permissions = ['ctud.read'];
    setDetail(request({ status: 'sent', sentAt: null, requestAllVehicles: false }));
    page();
    expect(screen.getByText('response-block')).toBeTruthy();
    expect(screen.getByText('erru.ctud.awaitingResponse')).toBeTruthy();
  });

  it('allows a resend of a failed request', () => {
    const detail = setDetail(request({ status: 'error', errorMessage: 'kaputt' }));
    mocks.permissions = ['ctud.read', 'ctud.send'];
    page();
    expect(screen.getByText('kaputt')).toBeTruthy();
    fireEvent.click(screen.getByText('erru.ctud.form.resend'));
    expect(detail.send).toHaveBeenCalled();
  });

  it.each([
    ['sending', 'erru.ctud.sending'],
    ['send_unknown', 'erru.ctud.sendUnknownStatus'],
  ])('labels the %s status', (status, text) => {
    setDetail(request({ status, errorMessage: 'e' }));
    page();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it.each([
    ['send_unknown', 'erru.ctud.sendUnknown'],
    ['invalid_ctud_xml', 'erru.ctud.invalidXml'],
    ['validation_unavailable', 'erru.ctud.validationUnavailable'],
    ['other', 'erru.ctud.sendFailed'],
  ])('maps send error %s', (code, text) => {
    setDetail(request({ status: 'sent' }), { sendError: code });
    page();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('reports a send failure carried over from creation until a new send', () => {
    const detail = setDetail(request({ status: 'error' }));
    renderAt('/erru/ctud/3', <CtudFormPage />, '/erru/ctud/:id', { sendError: 'send_unknown' });
    expect(screen.getAllByText('erru.ctud.sendUnknown').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('erru.ctud.form.resend'));
    expect(detail.send).toHaveBeenCalled();
    expect(screen.queryByText('erru.ctud.sendUnknown')).toBeNull();
  });

  it('is read-only for inbound requests', () => {
    setDetail(request({ direction: 'incoming', status: 'received' }));
    page();
    expect(screen.getByText('erru.ctud.form.titleInbound', { exact: false })).toBeTruthy();
    expect(screen.queryByText('request-fields')).toBeNull();
  });

  it('shows the saved banner and reloads after a save', async () => {
    const detail = setDetail(request());
    page();
    await act(async () => mocks.onSaved());
    expect(detail.reload).toHaveBeenCalled();
    expect(screen.getByText('common.saved')).toBeTruthy();
  });
});
