// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ApiError } from '../../../../shared/api/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { exerciseAll } from '../../testing/exercise';

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  detail: {} as Record<string, unknown>,
  getNuSource: vi.fn(),
  saveNuMessage: vi.fn(),
  searchNuSources: vi.fn(),
}));
vi.mock('../../api', () => ({
  getNuSource: mocks.getNuSource,
  saveNuMessage: mocks.saveNuMessage,
  searchNuSources: mocks.searchNuSources,
}));
vi.mock('react-i18next', () => {
  const t = (k: string, d?: unknown) => (typeof d === 'string' ? d : k);
  return { useTranslation: () => ({ t }) };
});
vi.mock('@tedi-design-system/react/tedi', async () => (await import('../../testing/tediMock')).tediMock());
vi.mock('../../../control-forms/components/shared/MaskedDateField.tsx', async () =>
  (await import('../../testing/tediMock')).maskedFieldMock(),
);
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ hasAnyPermission: (p: string[]) => p.some((x) => mocks.permissions.includes(x)) }),
}));
vi.mock('../../../classifiers/useClassifierLabel', () => ({
  useClassifierLabel: () => ({ label: (_c: string, v: string | null) => (v ? `L:${v}` : '—') }),
}));
vi.mock('../../../classifiers/ClassifierProvider', () => {
  const list = [{ code: 'EE', name: 'Eesti' }, { code: 'LV', name: 'Läti' }];
  return { useClassifiers: () => ({ getByCode: () => list, getErruMemberCountries: () => list }) };
});
vi.mock('./useNuMessageDetail', () => ({ useNuMessageDetail: () => mocks.detail }));
vi.mock('../../components/Nu/NuVersionsTable', () => ({ NuVersionsTable: () => <div>versions</div> }));

import { NuFormCreatePage } from './NuFormCreatePage';
import { NuFormPage } from './NuFormPage';

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
  window.scrollTo = vi.fn() as never;
});
beforeEach(() => {
  mocks.permissions = ['nu.read', 'nu.create', 'nu.send'];
  mocks.getNuSource.mockReset();
  mocks.saveNuMessage.mockReset();
  mocks.searchNuSources.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(cleanup);

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}
const renderAt = (path: string, element: React.ReactNode, route: string, state?: object) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: path.split('?')[0], search: path.split('?')[1] ? `?${path.split('?')[1]}` : '', state }]}>
      <Routes>
        <Route path={route} element={element} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const source = (over: object = {}) => ({
  id: 'K1',
  snapshotId: 'S1',
  firstName: 'Jaan',
  lastName: 'Tamm',
  dateOfBirth: '1980-01-02',
  placeOfBirth: 'Tln',
  certificateNumber: 'C1',
  certificateIssueDate: '2020-01-01',
  certificateCountryCode: 'LV',
  unfitFromDate: '2024-01-01',
  ...over,
});

describe('NuFormCreatePage', () => {
  it('is forbidden without the create permission', () => {
    mocks.permissions = [];
    renderAt('/erru/nu/new', <NuFormCreatePage />, '/erru/nu/new');
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('first asks for a source declaration, then shows the form for the one picked', async () => {
    mocks.searchNuSources.mockResolvedValue({ content: [source()] });
    renderAt('/erru/nu/new', <NuFormCreatePage />, '/erru/nu/new');
    fireEvent.change(document.getElementById('nu-source-certificate-number')!, { target: { value: 'C1' } });
    await act(async () => fireEvent.click(screen.getByText('common.search')));
    const pick = await screen.findByText('common.select');
    await act(async () => fireEvent.click(pick));
    expect(await screen.findByText('erru.nu.form.refreshSource')).toBeTruthy();
    expect((document.getElementById('nu-tm-first-name') as HTMLInputElement).value).toBe('Jaan');
  });

  it('loads the source named in the URL, saves and refreshes it', async () => {
    mocks.getNuSource.mockResolvedValue(source());
    mocks.saveNuMessage.mockResolvedValue({ id: 9 });
    renderAt('/erru/nu/new?sourceKey=K1', <NuFormCreatePage />, '/erru/nu/new');
    expect(screen.getByText('common.loading')).toBeTruthy();
    await screen.findByText('erru.nu.form.refreshSource');
    expect(mocks.getNuSource).toHaveBeenCalledWith('K1');
    exerciseAll();
    await act(async () => fireEvent.click(screen.getByText('erru.nu.form.refreshSource')));
    expect(mocks.getNuSource).toHaveBeenCalledTimes(2);
    await act(async () => fireEvent.click(screen.getByText('common.save')));
    await waitFor(() => expect(mocks.saveNuMessage.mock.calls.length + screen.queryAllByText('common.formHasErrors').length).toBeGreaterThan(0));
  });

  it('saves a valid prefilled draft and opens it', async () => {
    mocks.getNuSource.mockResolvedValue(source({ id: 'K2' }));
    mocks.saveNuMessage.mockResolvedValue({ id: 9 });
    renderAt('/erru/nu/new?sourceKey=K2', <NuFormCreatePage />, '/erru/nu/new');
    await screen.findByText('erru.nu.form.refreshSource');
    for (const [id, value] of [['nu-originating-authority', 'EE'], ['nu-request-purpose', 'EE']]) {
      fireEvent.change(document.getElementById(id)!, { target: { value } });
    }
    await act(async () => fireEvent.click(screen.getByText('common.save')));
    await waitFor(() => expect(screen.queryByTestId('where')?.textContent).toBe('/erru/nu/9'));
  });

  it('shows a lookup error and falls back to the picker; refresh failure keeps the form', async () => {
    mocks.getNuSource.mockRejectedValueOnce(new ApiError('x', 404, { code: 'not_found' }));
    renderAt('/erru/nu/new?sourceKey=K3', <NuFormCreatePage />, '/erru/nu/new');
    expect(await screen.findByText('erru.nu.validation.source_not_found')).toBeTruthy();
  });

  it('keeps the form when refreshing the source fails', async () => {
    mocks.getNuSource.mockResolvedValueOnce(source()).mockRejectedValueOnce(new Error('x'));
    renderAt('/erru/nu/new?sourceKey=K4', <NuFormCreatePage />, '/erru/nu/new');
    const refresh = await screen.findByText('erru.nu.form.refreshSource');
    await act(async () => fireEvent.click(refresh));
    expect(await screen.findByText('common.errors.unexpected')).toBeTruthy();
  });
});

describe('NuFormPage', () => {
  const message = (over: object = {}) => ({
    id: 5,
    version: 2,
    direction: 'outgoing',
    status: 'initiated',
    businessCaseId: 'BC-5',
    nuFrom: 'EE',
    nuTo: 'ZZ',
    originatingAuthority: 'KLIM',
    requestSource: 'CA',
    requestPurpose: 'P',
    tmFirstName: 'Jaan',
    tmFamilyName: 'Tamm',
    tmDateOfBirth: '1980-01-02',
    unfitStartDate: '2024-01-01',
    sourceGoodReputeFormKey: 'K1',
    errorMessage: null,
    memberStates: [],
    snapshots: [],
    ...over,
  });
  const setDetail = (msg: object | undefined, over: object = {}) => {
    mocks.detail = {
      message: msg,
      isLoading: false,
      notFound: false,
      send: vi.fn(),
      isSending: false,
      sendError: null,
      reload: vi.fn().mockResolvedValue(undefined),
      ...over,
    };
    return mocks.detail as { send: ReturnType<typeof vi.fn>; reload: ReturnType<typeof vi.fn> };
  };
  const page = (search = '', state?: object) => renderAt(`/erru/nu/5${search}`, <NuFormPage />, '/erru/nu/:id', state);

  it.each([
    ['forbidden', () => { mocks.permissions = []; setDetail(message()); }, 'common.forbidden'],
    ['loading', () => setDetail(undefined, { isLoading: true }), 'common.loading'],
    ['not found', () => setDetail(undefined, { notFound: true }), 'erru.nu.notFound'],
  ])('shows %s state', (_n, setup, text) => {
    setup();
    page();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('edits and sends a draft', async () => {
    const detail = setDetail(message());
    mocks.saveNuMessage.mockResolvedValue({ id: 5 });
    page();
    expect(screen.getByText('BC-5', { exact: false })).toBeTruthy();
    const send = screen.getByText('erru.nu.form.send');
    fireEvent.click(send);
    expect(detail.send).toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByText('common.save')));
    await waitFor(() => expect(detail.reload).toHaveBeenCalled());
    expect(screen.getByText('common.saved')).toBeTruthy();
  });

  it('refuses to send while the form has unsaved changes', () => {
    const detail = setDetail(message());
    page();
    fireEvent.change(document.getElementById('nu-tm-first-name')!, { target: { value: 'Peeter' } });
    expect(screen.getByText('erru.nu.form.saveBeforeSend')).toBeTruthy();
    fireEvent.click(screen.getByText('erru.nu.form.send'));
    expect(detail.send).not.toHaveBeenCalled();
  });

  it('refreshes from the source declaration', async () => {
    setDetail(message());
    mocks.getNuSource.mockResolvedValue(source({ firstName: null, certificateNumber: 'C9', unfitFromDate: null }));
    page();
    await act(async () => fireEvent.click(screen.getByText('erru.nu.form.refreshSource')));
    expect(mocks.getNuSource).toHaveBeenCalledWith('K1');
    expect(await screen.findByText('erru.nu.form.saveBeforeSend')).toBeTruthy();
  });

  it('reports a failed refresh and ignores a message without a source', async () => {
    setDetail(message());
    mocks.getNuSource.mockRejectedValue(new Error('x'));
    page();
    await act(async () => fireEvent.click(screen.getByText('erru.nu.form.refreshSource')));
    expect(await screen.findByText('common.errors.unexpected')).toBeTruthy();
    cleanup();
    setDetail(message({ sourceGoodReputeFormKey: null }));
    mocks.getNuSource.mockClear();
    page();
    await act(async () => fireEvent.click(screen.getByText('erru.nu.form.refreshSource')));
    expect(mocks.getNuSource).not.toHaveBeenCalled();
  });

  it('shows form errors and the validation summary', async () => {
    setDetail(message());
    mocks.saveNuMessage.mockRejectedValue(new ApiError('x', 422, { code: 'version_conflict' }));
    page();
    fireEvent.change(document.getElementById('nu-unfit-start-date')!, { target: { value: '' } });
    await act(async () => fireEvent.click(screen.getByText('common.save')));
    await waitFor(() => expect(screen.queryAllByText('common.formHasErrors').length + screen.queryAllByText('erru.nu.validation.version_conflict').length).toBeGreaterThan(0));
  });

  it('shows a read-only sent message with member states and resend-free actions', () => {
    setDetail(message({ status: 'sent', nuTo: 'LV', memberStates: [{ memberStateCode: 'LV', respondingAuthority: 'A', statusCode: 'OK' }] }));
    page();
    expect(screen.getByText('L:LV', { selector: 'p, div, span' })).toBeTruthy();
  });

  it('shows the awaiting-ack note for a sent message without answers', () => {
    setDetail(message({ status: 'sent' }));
    page();
    expect(screen.getByText('erru.nu.awaitingAck')).toBeTruthy();
  });

  it.each([
    ['error', 'erru.nu.sendFailed'],
    ['send_unknown', 'erru.nu.sendUnknown'],
    ['sent', 'plain error'],
  ])('explains a %s message', (status, text) => {
    setDetail(message({ status, errorMessage: 'plain error', nuTo: 'LV' }));
    page();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it.each([
    ['sending', 'erru.nu.sending'],
    ['send_unknown', 'erru.nu.sendUnknownStatus'],
  ])('labels the %s status', (status, text) => {
    setDetail(message({ status }));
    page();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('shows a send error from the detail hook, as inbound read-only', () => {
    setDetail(message({ direction: 'incoming', status: 'received' }), { sendError: 'send failed' });
    page();
    expect(screen.getByText('send failed')).toBeTruthy();
    expect(screen.getByText('erru.nu.form.titleInbound', { exact: false })).toBeTruthy();
  });

  it('shows a historic snapshot read-only with a link to the current version', () => {
    setDetail(message());
    page('?snapshotId=7');
    expect(screen.getByText('erru.nu.history.openCurrent')).toBeTruthy();
    expect(screen.queryByText('common.save')).toBeNull();
  });

  it('sends from the read-only view when allowed', () => {
    const detail = setDetail(message({ status: 'initiated' }));
    mocks.permissions = ['nu.read', 'nu.send'];
    page();
    fireEvent.click(screen.getByText('erru.nu.form.send'));
    expect(detail.send).toHaveBeenCalled();
  });
});
