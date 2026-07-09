export interface AuditLog {
  eventId: string;
  eventType: string;
  eventCategory: string;
  actorName?: string;
  actorPersonalCode?: string;
  description: string;
  logContent?: string;
  createdAt?: string;
  createdBy?: string;
}
