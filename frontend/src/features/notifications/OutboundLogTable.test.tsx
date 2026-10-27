// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutboundLogTable } from './OutboundLogTable';
import { NotificationsPage } from './NotificationsPage';
import { checkNotificationStatus, fetchOutboundLog, fetchOutboundRecipients, resendNotification } from './api';
import type { OutboundLogEntry } from './types';

let perms: string[] = [];
const notifState = {
  notifications: [] as unknown[],
  loading: false,
  markRead: vi.fn(),
  markAllRead: vi.fn(),
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, o?: { defaultValue?: string }) => o?.defaultValue ?? key,
  }),
}));
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (c: string) => perms.includes(c) }),
}));
vi.mock('./api', () => ({
  fetchOutboundLog: vi.fn(),
  fetchOutboundRecipients: vi.fn(),
  resendNotification: vi.fn(),
  checkNotificationStatus: vi.fn(),
}));
vi.mock('./useNotifications', () => ({ useNotifications: () => notifState }));
vi.mock('./NotificationRow', () => ({
  NotificationRow: ({ notif, onMarkRead }: { notif: { id: string; titleEt: string }; onMarkRead: (id: string) => void }) => (
    <button onClick={() => onMarkRead(notif.id)}>{notif.titleEt}</button>
  ),
}));

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

window.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

window.HTMLElement.prototype.scrollIntoView ??= () => {};

const entry = (over: Partial<OutboundLogEntry>): OutboundLogEntry => ({
  id: 'L1',
  notificationKey: 'K1',
  notificationType: 'ncr_violation',
  sendDate: '2026-01-02T03:04:05',
  status: 'sent',
  recipientAddress: 'a@b.ee',
  failureReason: null,
  ...over,
});

beforeEach(() => {
  perms = ['notification.resend'];
  vi.mocked(fetchOutboundLog).mockResolvedValue({
    content: [
      entry({}),
      entry({ id: 'L2', status: 'error', failureReason: 'Põhjus', recipientAddress: null, notificationKey: null }),
      entry({ id: 'L3', status: 'error', failureReason: null }),
      entry({ id: 'L4', status: 'queued' }),
      entry({ id: 'L5', status: 'in_progress' }),
    ],
    total: 5,
  });
  vi.mocked(fetchOutboundRecipients).mockResolvedValue([]);
  vi.mocked(resendNotification).mockResolvedValue({} as never);
  vi.mocked(checkNotificationStatus).mockResolvedValue({} as never);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('OutboundLogTable', () => {
  it('kuvab staatused ja tõrke põhjuse tooltipi', async () => {
    render(<OutboundLogTable />);
    expect((await screen.findAllByText('notifications.log.sent')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('notifications.log.statusError').length).toBe(2);
    expect(screen.getAllByText('notifications.log.statusSending').length).toBe(2);
  });

  it('"raport" avab saajate modaali', async () => {
    render(<OutboundLogTable />);
    const btns = await screen.findAllByText('notifications.log.report');
    fireEvent.click(btns[0]);
    await waitFor(() => expect(fetchOutboundRecipients).toHaveBeenCalledWith('L1'));
  });

  it('saadab uuesti kinnituse järel ja värskendab', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    render(<OutboundLogTable />);
    const btns = await screen.findAllByText('notifications.log.resend');
    fireEvent.click(btns[0]);
    expect(resendNotification).not.toHaveBeenCalled();
    fireEvent.click(btns[0]);
    await waitFor(() => expect(resendNotification).toHaveBeenCalledWith('L2'));
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('kontrollib staatust', async () => {
    render(<OutboundLogTable />);
    const btns = await screen.findAllByText('notifications.log.checkStatus');
    fireEvent.click(btns[0]);
    await waitFor(() => expect(checkNotificationStatus).toHaveBeenCalledWith('L2'));
  });

  it('ilma resend-õiguseta nuppe pole', async () => {
    perms = [];
    render(<OutboundLogTable />);
    await screen.findAllByText('notifications.log.report');
    expect(screen.queryByText('notifications.log.resend')).toBeNull();
    expect(screen.queryByText('notifications.log.checkStatus')).toBeNull();
  });

  it('filtrid: otsi ja tühjenda', async () => {
    render(<OutboundLogTable />);
    await screen.findAllByText('notifications.log.report');
    fireEvent.change(screen.getByLabelText('notifications.log.filterRecipient'), { target: { value: 'x@y' } });
    fireEvent.change(screen.getByLabelText('notifications.log.filterNotificationKey'), { target: { value: 'KK' } });
    fireEvent.click(screen.getByText('common.search'));
    await waitFor(() =>
      expect(vi.mocked(fetchOutboundLog).mock.calls.at(-1)![1]).toMatchObject({ recipient: 'x@y', notificationKey: 'KK' }),
    );
    fireEvent.click(screen.getByText('common.clear'));
    await waitFor(() => expect(vi.mocked(fetchOutboundLog).mock.calls.at(-1)![1]).toEqual({}));
  });

  it('tühi tulemus', async () => {
    vi.mocked(fetchOutboundLog).mockResolvedValue({ content: [], total: 0 });
    render(<OutboundLogTable />);
    expect(await screen.findByText('notifications.log.emptyResult')).toBeTruthy();
  });
});

describe('NotificationsPage', () => {
  beforeEach(() => {
    notifState.loading = false;
    notifState.notifications = [];
    notifState.markRead.mockClear();
    notifState.markAllRead.mockClear();
  });

  it('laadimine', () => {
    notifState.loading = true;
    render(<NotificationsPage />);
    expect(screen.getByText('common.loading')).toBeTruthy();
  });

  it('tühi nimekiri', () => {
    render(<NotificationsPage />);
    expect(screen.getByText('notifications.empty')).toBeTruthy();
    expect(screen.queryByText('notifications.markAllRead')).toBeNull();
    expect(screen.queryByText('notifications.tabLog')).toBeNull();
  });

  it('lugemata teavitused: märgi loetuks ja märgi kõik', () => {
    notifState.notifications = [
      { id: 'a', titleEt: 'Esimene', isUnread: true },
      { id: 'b', titleEt: 'Teine', isUnread: false },
    ];
    render(<NotificationsPage />);
    fireEvent.click(screen.getByText('Esimene'));
    expect(notifState.markRead).toHaveBeenCalledWith('a');
    fireEvent.click(screen.getByText('notifications.markAllRead'));
    expect(notifState.markAllRead).toHaveBeenCalled();
  });

  it('logi vaheleht nähtav õigusega ja avaneb', async () => {
    perms = ['notification.list'];
    render(<NotificationsPage />);
    fireEvent.click(screen.getByText('notifications.tabLog'));
    expect(await screen.findByText('notifications.log.sendDate')).toBeTruthy();
  });
});
