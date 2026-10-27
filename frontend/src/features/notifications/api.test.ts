import { afterEach, describe, expect, it, vi } from 'vitest';
import * as client from '../../shared/api/client';
import {
  checkNotificationStatus,
  fetchNotifications,
  fetchOutboundLog,
  fetchOutboundRecipients,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  resendNotification,
} from './api';

afterEach(() => vi.restoreAllMocks());

describe('notifications api', () => {
  it('fetchUnreadCount', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ count: 1 });
    await fetchUnreadCount();
    expect(get).toHaveBeenCalledWith('/v1/notifications/unread-count');
  });

  it('fetchNotifications vaikeväärtused ja antud väärtused', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue([]);
    await fetchNotifications();
    await fetchNotifications(3, 5);
    expect(get).toHaveBeenNthCalledWith(1, '/v1/notifications/list', { page: '1', pageSize: '20' });
    expect(get).toHaveBeenNthCalledWith(2, '/v1/notifications/list', { page: '3', pageSize: '5' });
  });

  it('markNotificationRead kodeerib id', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({});
    await markNotificationRead('a b');
    expect(post).toHaveBeenCalledWith('/v1/notifications/mark-read?q=a%20b', {});
  });

  it('markAllNotificationsRead', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({});
    await markAllNotificationsRead();
    expect(post).toHaveBeenCalledWith('/v1/notifications/mark-all-read', {});
  });

  it('fetchOutboundLog tükeldab sortimise ja jätab tühjad filtrid välja', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ content: [], total: 0 });
    await fetchOutboundLog({ page: '1', pageSize: '10', search: '', sorting: 'created_at desc' });
    expect(get).toHaveBeenCalledWith('/v1/notifications/outbound-log/list', {
      page: '1',
      pageSize: '10',
      sortBy: 'created_at',
      sortDir: 'desc',
    });
  });

  it('fetchOutboundLog kõigi filtritega', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue({ content: [], total: 0 });
    await fetchOutboundLog(
      { page: '1', pageSize: '10', search: '', sorting: 'created_at asc' },
      {
        status: 'failed',
        notificationType: 'T',
        dateFrom: 'a',
        dateTo: 'b',
        recipient: 'r',
        notificationKey: 'k',
      },
    );
    expect(get).toHaveBeenCalledWith('/v1/notifications/outbound-log/list', {
      page: '1',
      pageSize: '10',
      sortBy: 'created_at',
      sortDir: 'asc',
      status: 'failed',
      notificationType: 'T',
      dateFrom: 'a',
      dateTo: 'b',
      recipient: 'r',
      notificationKey: 'k',
    });
  });

  it('recipients / resend / check-status', async () => {
    const get = vi.spyOn(client, 'get').mockResolvedValue([]);
    const post = vi.spyOn(client, 'post').mockResolvedValue({});
    await fetchOutboundRecipients('9');
    await resendNotification('9');
    await checkNotificationStatus('9');
    expect(get).toHaveBeenCalledWith('/v1/notifications/outbound-log/recipients', { q: '9' });
    expect(post).toHaveBeenCalledWith('/v1/notifications/outbound-log/resend/send?q=9', {});
    expect(post).toHaveBeenCalledWith('/v1/notifications/outbound-log/check-status/send?q=9', {});
  });
});
