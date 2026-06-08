export interface AuditLog {
  id: string;
  eventType: string;
  eventCategory: string;
  actorName?: string;
  actorPersonalCode: string;
  description: string;
  createdAt?: string;
  createdBy?: string;
}
