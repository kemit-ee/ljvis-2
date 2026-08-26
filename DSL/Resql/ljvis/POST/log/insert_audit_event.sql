/*
description: "Insert generic audit event"
namespace: audit
params:
  event_id:
    type: string
    required: false
    description: "ULID (26-char base32 Crockford). If omitted or empty, the DB generates one via audit.generate_ulid()."
  event_type:
    type: string
    required: false
    description: "Type of the event"
  event_category:
    type: string
    required: false
    description: "Category of the event"
  actor_name:
    type: string
    required: false
    description: "Display name of the actor"
  actor_personal_code:
    type: string
    required: false
    description: "Cleartext personal code of the actor — hashed to SHA-256 before storage"
  description:
    type: string
    required: false
    description: "Human-readable description of the event"
  log_content:
    type: string
    required: false
    description: "JSON object with additional event data"
  created_by:
    type: string
    required: false
    description: "Identifier of the user or process that wrote the record"
  trace_id:
    type: string
    required: false
    description: "W3C tracecontext trace id (32-hex) from the originating request traceparent header. NULL if absent."
  span_id:
    type: string
    required: false
    description: "W3C tracecontext span id (16-hex) from the originating request traceparent header. NULL if absent."
returns:
  - name: event_id
    type: string
    nullable: true
*/
INSERT INTO audit.audit_event (
    event_id,
    event_type,
    event_category,
    actor_name,
    actor_personal_code_hash,
    description,
    log_content,
    created_by,
    trace_id,
    span_id
) VALUES (
    COALESCE(NULLIF(:event_id, ''), audit.generate_ulid()),
    :event_type,
    :event_category,
    :actor_name,
    audit.hash_personal_code(:actor_personal_code),
    :description,
    :log_content::json,
    :created_by,
    NULLIF(:trace_id, ''),
    NULLIF(:span_id, '')
) RETURNING event_id;
