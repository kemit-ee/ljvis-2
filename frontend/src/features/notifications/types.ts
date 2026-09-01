export interface InAppNotification {
  id: string;
  type: string;
  required_permission: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  title_et: string;
  body_et?: string | null;
  created_at: string;
  is_unread: boolean;
  total: number;
}

export interface OutboundLogEntry {
  id: string;
  message_type: string;
  send_date: string;
  status: 'sent' | 'sent_error';
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  original_log_id?: string | null;
  pk_template_id?: string | null;
  pk_sending_operation_id?: string | null;
  first_recipient_email?: string | null;
  first_recipient_name?: string | null;
  first_recipient_code?: string | null;
  total: number;
}

export interface OutboundRecipient {
  id: string;
  log_id: string;
  person_email?: string | null;
  person_name?: string | null;
  person_code?: string | null;
  sending_report: string;
}

export interface UnreadCountResult {
  unread_count: number;
}

export interface MarkReadResult {
  notification_id: string;
  user_code: string;
}

export interface MarkAllReadResult {
  markedCount: number;
}

export interface ResendResult {
  logId: string;
  pkSendingOperationId: string;
  status: string;
}
