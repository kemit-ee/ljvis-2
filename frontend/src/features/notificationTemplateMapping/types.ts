export interface NotificationTemplateMapping {
  notificationType: string;
  originalTemplateId: string | null;
  channel: 'postkast' | 'desktop';
  defaultLanguage: string;
  active: boolean;
  defaultRecipientEmail: string | null;
  createdAt?: string;
  createdBy?: string;
}
