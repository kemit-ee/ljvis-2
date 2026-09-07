// Väljanimed on camelCase — Rust Resql tagastab kõik veerud camelCase kujul
// (ka selgelt snake_case aliasitud veerud), sama nagu mujal rakenduses.

export interface InAppNotification {
  id: string;
  type: string;
  requiredPermission: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  titleEt: string;
  bodyEt?: string | null;
  createdAt: string;
  isUnread: boolean;
  total?: number;
}

export interface OutboundLogEntry {
  id: string;
  notificationKey: string | null;
  notificationType: string;
  sendDate: string | null;
  status: 'queued' | 'in_progress' | 'sent' | 'error';
  recipientAddress: string | null;
  failureReason: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  originalLogId?: string | null;
  pkTemplateId?: string | null;
  pkSendingOperationId?: string | null;
  pkOperationRestartAllowed?: boolean | null;
  pkCompletedAt?: string | null;
  total?: number;
}

export interface OutboundLogFilters {
  status?: string;
  notificationType?: string;
  dateFrom?: string;
  dateTo?: string;
  recipient?: string;
  notificationKey?: string;
}

export interface OutboundRecipient {
  id: string;
  logId: string;
  personEmail?: string | null;
  personName?: string | null;
  personCode?: string | null;
  sendingReport: string;
}

export interface UnreadCountResult {
  unreadCount: number;
}

export interface MarkReadResult {
  notificationId: string;
  userCode: string;
}

export interface MarkAllReadResult {
  markedCount: number;
}

export interface ResendResult {
  logId: string;
  notificationKey: string;
  status: string;
}
