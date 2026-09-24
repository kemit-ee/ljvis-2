export interface NotificationTemplateMapping {
  notificationType: string;
  originalTemplateId: string | null;
  channel: 'postkast' | 'desktop';
  defaultLanguage: string;
  active: boolean;
  defaultRecipientEmail: string | null;
  desktopRecipientPersonalCodes: string[] | null;
  createdAt?: string;
  createdBy?: string;
}

export interface DesktopRecipientUser {
  id: string;
  firstName: string;
  lastName: string;
  personalCode: string;
}
