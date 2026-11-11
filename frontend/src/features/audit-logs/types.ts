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
  traceId?: string;
  spanId?: string;
}

export interface LogChainVerification {
  ok: boolean;
  checked: number;
  firstBreachEventId?: string | null;
  reason?: string | null;
  fromEventId?: string | null;
  toEventId?: string | null;
}
