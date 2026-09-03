import { get, post } from '../../shared/api/client';
import type { ListParams, PagedResponse } from '../../hooks/usePaginatedList';
import type {
  InAppNotification,
  MarkAllReadResult,
  MarkReadResult,
  OutboundLogEntry,
  OutboundLogFilters,
  OutboundRecipient,
  ResendResult,
  UnreadCountResult,
} from './types';

export function fetchUnreadCount(): Promise<UnreadCountResult> {
  return get<UnreadCountResult>('/v1/notifications/unread-count');
}

export function fetchNotifications(
  page = 1,
  pageSize = 20,
): Promise<InAppNotification[]> {
  return get<InAppNotification[]>('/v1/notifications/list', {
    page: String(page),
    pageSize: String(pageSize),
  });
}

/**
 * Mark one in-app notification read. Id travels as `?q=` (rest-api-disainijuhend
 * §4.2) — Ruuter requires every allowlist.body field to be present, so it cannot
 * be an optional body field.
 */
export function markNotificationRead(id: string): Promise<MarkReadResult> {
  return post<MarkReadResult>(
    `/v1/notifications/mark-read?q=${encodeURIComponent(id)}`,
    {},
  );
}

export function markAllNotificationsRead(): Promise<MarkAllReadResult> {
  return post<MarkAllReadResult>('/v1/notifications/mark-all-read', {});
}

/** UC-02 outbound log — server-paginated, returns `{ content, total }`. */
export function fetchOutboundLog(
  params: ListParams,
  filters: OutboundLogFilters = {},
): Promise<PagedResponse<OutboundLogEntry>> {
  return get<PagedResponse<OutboundLogEntry>>(
    '/v1/notifications/outbound-log/list',
    {
      page: params.page,
      pageSize: params.pageSize,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.messageType ? { messageType: filters.messageType } : {}),
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    },
  );
}

/** UC-03 — recipients of one outbound log entry. Id as `?q=` per rest-api-disainijuhend §4.2. */
export function fetchOutboundRecipients(
  logId: string,
): Promise<OutboundRecipient[]> {
  return get<OutboundRecipient[]>('/v1/notifications/outbound-log/recipients', {
    q: logId,
  });
}

/**
 * UC-04 — resend a failed outbound message. Outbound-log id as `?q=`
 * (rest-api-disainijuhend §4.2), new address in the body.
 */
export function resendNotification(
  logId: string,
  recipientEmail: string,
): Promise<ResendResult> {
  return post<ResendResult>(
    `/v1/notifications/outbound-log/resend?q=${encodeURIComponent(logId)}`,
    { recipientEmail },
  );
}
