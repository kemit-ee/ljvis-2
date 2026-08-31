import { get, post } from '../../shared/api/client';
import type {
  InAppNotification,
  MarkAllReadResult,
  MarkReadResult,
  OutboundLogEntry,
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

export function markNotificationRead(id: string): Promise<MarkReadResult> {
  return post<MarkReadResult>(`/v1/notifications/${id}/mark-read`, {});
}

export function markAllNotificationsRead(): Promise<MarkAllReadResult> {
  return post<MarkAllReadResult>('/v1/notifications/mark-all-read', {});
}

export interface OutboundLogFilters {
  status?: string;
  messageType?: string;
  dateFrom?: string;
  page?: number;
  pageSize?: number;
}

export function fetchOutboundLog(
  filters: OutboundLogFilters = {},
): Promise<OutboundLogEntry[]> {
  return get<OutboundLogEntry[]>('/v1/notifications/outbound-log/list', {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.messageType ? { messageType: filters.messageType } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    page: String(filters.page ?? 1),
    pageSize: String(filters.pageSize ?? 20),
  });
}

export function fetchOutboundRecipients(
  logId: string,
): Promise<OutboundRecipient[]> {
  return get<OutboundRecipient[]>(
    '/v1/notifications/outbound-log/recipients',
    { logId },
  );
}

export function resendNotification(
  logId: string,
  recipientEmail: string,
): Promise<ResendResult> {
  return post<ResendResult>(
    `/v1/notifications/outbound-log/${logId}/resend`,
    { recipientEmail },
  );
}
