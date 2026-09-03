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
  messageType: string;
  sendDate: string;
  status: 'sent' | 'sent_error';
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  originalLogId?: string | null;
  pkTemplateId?: string | null;
  pkSendingOperationId?: string | null;
  firstRecipientEmail?: string | null;
  firstRecipientName?: string | null;
  firstRecipientCode?: string | null;
  total?: number;
}

export interface OutboundLogFilters {
  status?: string;
  messageType?: string;
  dateFrom?: string;
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
  pkSendingOperationId: string;
  status: string;
}
