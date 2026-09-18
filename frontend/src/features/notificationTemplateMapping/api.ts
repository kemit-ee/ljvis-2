import { get, post } from '../../shared/api/client';
import type { NotificationTemplateMapping } from './types';

export const listNotificationTemplateMappings = () =>
  get<NotificationTemplateMapping[]>('/v1/notification-template-mapping/list');

export const saveNotificationTemplateMapping = (data: {
  notificationType: string;
  originalTemplateId: string;
  channel: string;
  defaultLanguage: string;
  active: boolean;
  defaultRecipientEmail: string;
}) =>
  post<{ id: number; notificationType: string }>(
    '/v1/notification-template-mapping/save',
    {
      notification_type: data.notificationType,
      original_template_id: data.originalTemplateId,
      channel: data.channel,
      default_language: data.defaultLanguage,
      active: data.active,
      default_recipient_email: data.defaultRecipientEmail,
    },
  );
