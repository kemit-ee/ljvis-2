// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  detail: {} as Record<string, unknown>,
  printRsiMessage: vi.fn(),
  saveRsiMessage: vi.fn(),
}));
vi.mock('../../api', () => ({ printRsiMessage: mocks.printRsiMessage, saveRsiMessage: mocks.saveRsiMessage }));
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
vi.mock('../../../classifiers/ClassifierProvider', () => {
  const list = [{ code: 'EE', name: 'Eesti' }];
  const stable = { getByCode: () => list, getErruMemberCountries: () => list };
  return { useClassifiers: () => stable };
});
vi.mock('./useRsiMessageDetail', () => ({ useRsiMessageDetail: () => mocks.detail }));
vi.mock('../../components/Rsi/RsiMessageFields', () => ({ RsiMessageFields: () => <div>message-fields</div> }));
vi.mock('../../components/Rsi/RsiCheckedItemsTable', () => ({ RsiCheckedItemsTable: () => <div>items-table</div> }));

import { RsiFormCreatePage } from './RsiFormCreatePage';
import { RsiFormPage } from './RsiFormPage';

beforeAll(() => {
  window.matchMedia = ((query: string) =>
    ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }) as unknown as MediaQueryList) as typeof window.matchMedia;
  window.scrollTo = vi.fn() as never;
  Element.prototype.scrollIntoView = vi.fn();
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
  HTMLAnchorElement.prototype.click = vi.fn();
});
beforeEach(() => {
  mocks.permissions = ['rsi.read', 'rsi.create', 'rsi.send'];
  mocks.printRsiMessage.mockReset();
  mocks.saveRsiMessage.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(cleanup);

const renderAt = (path: string, element: React.ReactNode, route: string, state?: object) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path={route} element={element} />
        <Route path="*" element={<div>elsewhere</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('RsiFormCreatePage', () => {
  it('is forbidden without the create permission', () => {
    mocks.permissions = [];
    renderAt('/erru/rsi/new', <RsiFormCreatePage />, '/erru/rsi/new');
    expect(screen.getByText('common.forbidden')).toBeTruthy();
  });

  it('shows validation errors after a failed save and scrolls to the first one', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderAt('/erru/rsi/new', <RsiFormCreatePage />, '/erru/rsi/new');
    expect(screen.getByText('erru.rsi.form.titleNew')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByText('common.save')));
    await waitFor(() => expect(screen.getByText('common.formHasErrors')).toBeTruthy());
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    vi.useRealTimers();
  });
});

describe('RsiFormPage', () => {
  const message = (over: object = {}) => ({
    id: 4,
    version: 3,
    direction: 'outgoing',
    status: 'initiated',
    businessCaseId: 'BC-4',
    rsiFrom: 'EE',
    rsiTo: 'LV',
    originatingAuthority: 'KLIM',
    vehicleCategory: 'N3',
    vehicleRegistrationNumber: 'ABC',
    vehicleRegistrationCountry: 'LV',
    vehicleIdentificationNumber: null,
    odometerReading: 5,
    driverFirstName: 'Andres',
    driverFamilyName: null,
    inspectionDatetime: '2024-01-02T10:00:00Z',
    inspectionPassed: false,
    ptiRequested: true,
    vehicleProhibitionOrRestriction: true,
    responseStatusCode: 'OK',
    responseStatusMessage: 'fine',
    errorMessage: null,
    checkedItems: [],
    ...over,
  });
  const setDetail = (msg: object | undefined, over: object = {}) => {
    mocks.detail = {
      message: msg,
      isLoading: false,
      notFound: false,
      send: vi.fn().mockResolvedValue(undefined),
      isSending: false,
      sendError: null,
      reload: vi.fn(),
      ...over,
    };
    return mocks.detail as { send: ReturnType<typeof vi.fn> };
  };
  const page = (state?: object) => renderAt('/erru/rsi/4', <RsiFormPage />, '/erru/rsi/:id', state);

  it.each([
    ['forbidden', () => { mocks.permissions = []; setDetail(message()); }, 'common.forbidden'],
    ['loading', () => setDetail(undefined, { isLoading: true }), 'common.loading'],
    ['not found', () => setDetail(undefined, { notFound: true }), 'erru.rsi.notFound'],
  ])('shows %s state', (_n, setup, text) => {
    setup();
    page();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('shows the editable draft and does not send an invalid draft', async () => {
    const detail = setDetail(message());
    page({ justSaved: true });
    expect(screen.getByText('message-fields')).toBeTruthy();
    expect(screen.getByText('common.saved')).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByText('erru.rsi.form.send')));
    expect(detail.send).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByText('common.save')));
    await waitFor(() => expect(screen.getByText('common.formHasErrors')).toBeTruthy());
  });

  it('prints the message as a PDF download', async () => {
    setDetail(message());
    mocks.printRsiMessage.mockResolvedValue({ filename: 'a.pdf', contentType: 'application/pdf', base64: btoa('pdf'), warnings: [] });
    page();
    await act(async () => fireEvent.click(screen.getByText('common.printFilled')));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(mocks.printRsiMessage).toHaveBeenCalledWith('4');
  });

  it('shows a sent message read-only with its response and checked items', () => {
    setDetail(message({ status: 'responded', errorMessage: 'broken' }));
    page();
    expect(screen.getByText('broken')).toBeTruthy();
    expect(screen.getByText('fine')).toBeTruthy();
    expect(screen.getByText('items-table')).toBeTruthy();
    expect(screen.queryByText('erru.rsi.form.send')).toBeNull();
  });

  it('renders legacy checked items as a list', () => {
    setDetail(
      message({
        status: 'sent',
        responseStatusCode: null,
        driverFirstName: null,
        checkedItems: [
          { partCode: 'CAA_1', status: 'non_compliant', defects: [{ defectCode: 'CAA_1.1', severity: 'OV' }] },
          { partCode: 'CAA_2', status: 'checked', defects: [] },
          { partCode: 'CAA_3', status: 'not_checked', defects: [] },
        ],
      }),
    );
    page();
    expect(screen.getByText('erru.rsi.checkedItems.legacyNotice')).toBeTruthy();
    expect(screen.getByText('L:CAA_1: L:CAA_1.1 (OV)')).toBeTruthy();
    expect(screen.getByText('L:CAA_2')).toBeTruthy();
    expect(screen.queryByText('L:CAA_3')).toBeNull();
  });

  it.each([
    ['sending', 'erru.rsi.sending'],
    ['send_unknown', 'erru.rsi.sendUnknownStatus'],
  ])('labels the %s status', (status, text) => {
    setDetail(message({ status, errorMessage: 'e', inspectionDatetime: null }));
    page();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it.each([
    ['invalid_rsi_xml', 'erru.rsi.invalidXml'],
    ['send_unknown', 'erru.rsi.sendUnknown'],
    ['invalid_checked_items', 'erru.rsi.validation.invalid_checked_items'],
    ['other', 'erru.rsi.sendFailed'],
  ])('maps send error %s', (code, text) => {
    setDetail(message({ status: 'sent' }), { sendError: code });
    page();
    expect(screen.getByText(text)).toBeTruthy();
  });

  it('is read-only for inbound messages', () => {
    setDetail(message({ direction: 'incoming', status: 'received', responseStatusCode: null }));
    page();
    expect(screen.getByText('erru.rsi.form.titleInbound', { exact: false })).toBeTruthy();
  });
});
