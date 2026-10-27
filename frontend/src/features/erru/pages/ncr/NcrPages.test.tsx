// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../../shared/api/client';

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  ncrCase: {} as Record<string, unknown>,
  requestForm: {} as Record<string, unknown>,
  responseForm: {} as Record<string, unknown>,
  sendNcrRequest: vi.fn(),
  sendNcrResponse: vi.fn(),
  createVrFormFromNcr: vi.fn(),
}));
vi.mock('../../api', () => ({ sendNcrRequest: mocks.sendNcrRequest, sendNcrResponse: mocks.sendNcrResponse }));
vi.mock('../../../control-forms/api', () => ({ createVrFormFromNcr: mocks.createVrFormFromNcr }));
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
vi.mock('../../../organisations/hooks', () => {
  const organisations = [{ code: 'KLIM', name: 'Kliimaministeerium' }];
  return { useOrganisations: () => ({ organisations, loading: false }) };
});
vi.mock('./useNcrCase', () => ({ useNcrCase: () => mocks.ncrCase }));
vi.mock('./useNcrRequestForm', () => ({ useNcrRequestForm: () => mocks.requestForm }));
vi.mock('./useNcrResponseForm', () => ({ useNcrResponseForm: () => mocks.responseForm }));
vi.mock('../../components/Ncr/NcrRequestFields', () => ({ NcrRequestFields: () => <div>request-fields</div> }));
vi.mock('../../components/Ncr/NcrResponseFields', () => ({ NcrResponseFields: () => <div>response-fields</div> }));

import { NcrFormCreatePage } from './NcrFormCreatePage';
import { NcrFormPage } from './NcrFormPage';

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
  mocks.permissions = ['ncr.read', 'ncr.create', 'ncr.respond', 'ncr.send', 'foreign_violation_form.write'];
  mocks.requestForm = formStub();
  mocks.responseForm = formStub();
  Object.values(mocks).forEach((m) => typeof m === 'function' && 'mockReset' in m && (m as ReturnType<typeof vi.fn>).mockReset());
  vi.spyOn(console, 'error').mockImplementation(() => {});
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

describe('NcrFormCreatePage', () => {
  it('is forbidden without the create permission', () => {
    mocks.permissions = [];
    renderAt('/erru/ncr/new', <NcrFormCreatePage />, '/erru/ncr/new');
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('renders the blank form with errors', () => {
    mocks.requestForm = formStub({ formError: 'bad', formik: { submitCount: 1, errors: { a: 'x' }, isSubmitting: false, handleSubmit: vi.fn() } });
    renderAt('/erru/ncr/new', <NcrFormCreatePage />, '/erru/ncr/new');
    expect(screen.getByText('request-fields')).toBeTruthy();
    expect(screen.getByText('bad')).toBeTruthy();
    expect(screen.getByText('common.formHasErrors')).toBeTruthy();
  });
});

describe('NcrFormPage', () => {
  const snap = (over: object = {}) => ({
    id: 1,
    version: 2,
    direction: 'outgoing',
    status: 'initiated',
    businessCaseId: 'BC-1',
    ncrFrom: 'EE',
    ncrTo: 'LV',
    originatingAuthority: 'KLIM',
    requestSource: 'CA',
    requestPurpose: 'P',
    transportUndertakingName: 'AS',
    communityLicenceNumber: 'L',
    vehicleRegistrationNumber: 'V',
    vehicleRegistrationCountry: 'LV',
    checkResult: 'Fail',
    checkDate: '2024-01-01',
    minorInfringement: { dateOfInfringement: '2024-01-02', numberOfInfringements: 3 },
    seriousInfringements: [
      {
        category: 'MSI',
        infringementType: 'MSI101',
        dateOfInfringement: '2024-01-01',
        appealPossible: true,
        penaltiesImposed: [
          { penaltyImposedIdentifier: 'p1', penaltyTypeImposed: 'T', isExecuted: 'No', notExecutedReason: 'r', finalDecisionDate: '2024-01-01', startDate: '2024-01-02', endDate: '2024-01-03' },
          { penaltyImposedIdentifier: 'p2', isExecuted: 'Yes' },
          { penaltyImposedIdentifier: 'p3', isExecuted: 'Unknown' },
        ],
        penaltiesRequested: [{ penaltyRequestedIdentifier: 'q', penaltyTypeRequested: 'T', duration: 5 }],
      },
      { category: 'VSI', infringementType: '', appealPossible: false, penaltiesImposed: [], penaltiesRequested: [] },
    ],
    errorMessage: null,
    ackStatusCode: null,
    responseStatusCode: null,
    linkedForeignViolationFormKey: null,
    sentAt: '2024-01-02T10:00:00Z',
    createdAt: '2024-01-02T10:00:00Z',
    ...over,
  });
  const setCase = (current: object | undefined, over: object = {}) => {
    const reload = vi.fn().mockResolvedValue(undefined);
    mocks.ncrCase = {
      current,
      snapshots: current ? [current, { ...current, direction: 'incoming', responseStatusCode: 'OK', sentAt: null }] : [],
      isLoading: false,
      notFound: false,
      reload,
      ...over,
    };
    return reload;
  };
  const page = (state?: object) => renderAt('/erru/ncr/BC-1', <NcrFormPage />, '/erru/ncr/:businessCaseId', state);

  it.each([
    ['forbidden', () => { mocks.permissions = []; setCase(snap()); }, 'common.forbidden'],
    ['loading', () => setCase(undefined, { isLoading: true }), 'common.loading'],
    ['not found', () => setCase(undefined, { notFound: true }), 'erru.ncr.notFound'],
  ])('shows %s state', (_n, setup, text) => {
    setup();
    page();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('edits an outgoing draft and sends it', async () => {
    const reload = setCase(snap());
    mocks.sendNcrRequest.mockResolvedValue({});
    mocks.requestForm = formStub({ formError: 'oops', formik: { submitCount: 1, errors: { a: 'x' }, isSubmitting: false, handleSubmit: vi.fn() } });
    page({ justSaved: true });
    expect(screen.getByText('request-fields')).toBeTruthy();
    expect(screen.getByText('common.saved')).toBeTruthy();
    expect(screen.getByText('common.formHasErrors')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByText('erru.ncr.form.send')));
    expect(mocks.sendNcrRequest).toHaveBeenCalledWith('BC-1');
    expect(reload).toHaveBeenCalled();
  });

  it('shows the arrival date (first received snapshot) for incoming and the sent date for outgoing', () => {
    const received = snap({ direction: 'incoming', status: 'received', sentAt: '2024-01-01T08:00:00Z', createdAt: '2024-03-05T09:00:00Z' });
    const viewed = { ...received, status: 'viewed', createdAt: '2024-03-09T09:00:00Z' };
    setCase(viewed, { snapshots: [received, viewed] });
    const { unmount } = page();
    expect(screen.getByText(new Date('2024-03-05T09:00:00Z').toLocaleString('et-EE'))).toBeTruthy();
    unmount();
    setCase(snap({ sentAt: '2024-02-02T10:00:00Z' }));
    page();
    expect(screen.getByText(new Date('2024-02-02T10:00:00Z').toLocaleString('et-EE'))).toBeTruthy();
  });

  it('shows creation dates for every history row when sent dates are missing', () => {
    const received = snap({ direction: 'incoming', status: 'received', sentAt: null, createdAt: '2024-03-05T09:00:00Z' });
    const viewed = { ...received, status: 'viewed', createdAt: '2024-03-09T09:00:00Z' };
    setCase(viewed, { snapshots: [received, viewed] });
    page();
    expect(screen.getAllByText(new Date(received.createdAt).toLocaleString('et-EE')).length).toBeGreaterThan(0);
    expect(screen.getByText(new Date(viewed.createdAt).toLocaleString('et-EE'))).toBeTruthy();
  });

  it('shows a translated error when sending fails', async () => {
    setCase(snap({ status: 'error', errorMessage: 'bad send' }));
    mocks.sendNcrRequest.mockRejectedValue(new ApiError('x', 502, { code: 'send_unknown' }));
    page();
    expect(screen.getByText('bad send')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByText('erru.ncr.form.send')));
    expect(await screen.findByText('erru.ncr.form.sendUnknown')).toBeTruthy();
  });

  it('answers an incoming message and sends the response', async () => {
    setCase(snap({ direction: 'incoming', status: 'answer_drafted' }));
    mocks.responseForm = formStub({ formError: 'oops', formik: { submitCount: 1, errors: { a: 'x' }, isSubmitting: false, handleSubmit: vi.fn() } });
    mocks.sendNcrResponse.mockResolvedValue({});
    page();
    expect(screen.getByText('response-fields')).toBeTruthy();
    expect(screen.getByText('common.formHasErrors')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByText('erru.ncr.form.sendResponse')));
    expect(mocks.sendNcrResponse).toHaveBeenCalledWith('BC-1');
  });

  it('creates a foreign violation form from an answered case and opens it', async () => {
    setCase(snap({ direction: 'incoming', status: 'answer_drafted' }));
    mocks.createVrFormFromNcr.mockResolvedValue([{ id: 77 }]);
    page();
    await act(async () => fireEvent.click(screen.getByText('erru.ncr.form.createVr')));
    expect(mocks.createVrFormFromNcr).toHaveBeenCalledWith('BC-1');
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/control-forms/foreign-violation/77'));
  });

  it('shows an error when creating the violation form fails', async () => {
    setCase(snap({ direction: 'incoming', status: 'answer_drafted' }));
    mocks.createVrFormFromNcr.mockRejectedValue(new Error('x'));
    page();
    await act(async () => fireEvent.click(screen.getByText('erru.ncr.form.createVr')));
    expect(await screen.findByText('erru.ncr.form.createVrFailed')).toBeTruthy();
  });

  it('opens the linked violation form', () => {
    setCase(snap({ direction: 'incoming', status: 'answer_drafted', linkedForeignViolationFormKey: 5 }));
    page();
    fireEvent.click(screen.getByText('erru.ncr.form.openVr'));
    expect(screen.getByTestId('where').textContent).toBe('/control-forms/foreign-violation/5');
  });

  it('offers the same violation form actions on a read-only answered case', async () => {
    mocks.permissions = ['ncr.read', 'foreign_violation_form.write'];
    setCase(snap({ direction: 'incoming', status: 'responded' }));
    mocks.createVrFormFromNcr.mockResolvedValue([]);
    page();
    await act(async () => fireEvent.click(screen.getByText('erru.ncr.form.createVr')));
    expect(mocks.createVrFormFromNcr).toHaveBeenCalled();
    cleanup();
    setCase(snap({ direction: 'incoming', status: 'responded', linkedForeignViolationFormKey: 9 }));
    page();
    fireEvent.click(screen.getByText('erru.ncr.form.openVr'));
    expect(screen.getByTestId('where').textContent).toBe('/control-forms/foreign-violation/9');
  });

  it('shows a read-only sent request with acknowledgement and the case history', () => {
    mocks.permissions = ['ncr.read'];
    setCase(snap({ status: 'sent', ackStatusCode: 'OK' }));
    page();
    expect(screen.getByText('erru.ncr.form.awaitingAck')).toBeTruthy();
    expect(screen.getByText('L:OK')).toBeTruthy();
    expect(screen.getByText('erru.ncr.form.historyBlock')).toBeTruthy();
    expect(screen.getByText('erru.ncr.form.historyTypeResponse')).toBeTruthy();
  });

  it('shows the full response of an answered case', () => {
    mocks.permissions = ['ncr.read'];
    setCase(
      snap({
        direction: 'incoming',
        status: 'responded',
        seriousInfringements: [],
        minorInfringement: null,
        responseStatusCode: 'OK',
        responseStatusMessage: 'fine',
        responseNumberOfVehicles: 4,
        responseCommunityLicenceStatus: 'Valid',
        respondingAuthority: 'KLIM',
        responseAddress: { address: 'Tn 1', postCode: '1', city: 'Tln', country: 'EE' },
        responsePenaltiesImposed: [
          { penaltyRequestedIdentifier: 'a', isImposed: true, penaltyTypeImposed: 'T', startDate: '2024-01-01', endDate: '2024-02-02' },
          { penaltyRequestedIdentifier: 'b', isImposed: false, reason: 'because' },
          { penaltyRequestedIdentifier: 'c', isImposed: true },
        ],
      }),
    );
    page();
    expect(screen.getByText('fine')).toBeTruthy();
    expect(screen.getByText('because')).toBeTruthy();
  });

  it('shows an answered case without optional response details', () => {
    mocks.permissions = ['ncr.read'];
    setCase(snap({ direction: 'incoming', status: 'responded', responseStatusCode: 'OK', responseAddress: { address: '', postCode: '', city: '', country: '' }, responsePenaltiesImposed: [] }));
    page();
    expect(screen.getByText('erru.ncr.form.responseBlock')).toBeTruthy();
  });

  it.each([
    ['sending', 'erru.ncr.form.sending'],
    ['send_unknown', 'erru.ncr.form.sendUnknownStatus'],
  ])('labels the %s status', (status, text) => {
    mocks.permissions = ['ncr.read'];
    setCase(snap({ status, errorMessage: 'e' }));
    page();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('retries a failed response send', async () => {
    mocks.permissions = ['ncr.read', 'ncr.send'];
    setCase(snap({ direction: 'incoming', status: 'error' }));
    mocks.sendNcrResponse.mockRejectedValue(new Error('x'));
    page();
    await act(async () => fireEvent.click(screen.getByText('erru.ncr.form.sendResponse')));
    expect(await screen.findByText('erru.ncr.form.sendFailed')).toBeTruthy();
  });

  it('sends a failed request from the read-only view', async () => {
    mocks.permissions = ['ncr.read', 'ncr.send'];
    setCase(snap({ status: 'error' }));
    mocks.sendNcrRequest.mockResolvedValue({});
    page();
    await act(async () => fireEvent.click(screen.getByText('erru.ncr.form.send')));
    expect(mocks.sendNcrRequest).toHaveBeenCalled();
  });
});
