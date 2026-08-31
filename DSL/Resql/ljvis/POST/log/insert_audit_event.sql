/*
declaration:
  version: 0.1
  description: "Insert generic audit event"
  method: post
  namespace: audit
  returns: json
  allowlist:
    body:
      - field: event_id
        type: string
        description: "ULID (26-char base32 Crockford). If omitted or empty, the DB generates one via audit.generate_ulid()."
      - field: event_type
        type: string
        description: "Type of the event"
      - field: event_category
        type: string
        description: "Category of the event"
      - field: actor_name
        type: string
        description: "Display name of the actor"
      - field: actor_personal_code
        type: string
        description: "Cleartext personal code of the actor — hashed to SHA-256 before storage"
      - field: description
        type: string
        description: "Human-readable description of the event"
      - field: log_content
        type: string
        description: "JSON object with additional event data"
      - field: organisation_id
        type: string
        description: "Actor's organisation id at write time (derived from actor_personal_code). Empty for system processes."
      - field: created_by
        type: string
        description: "Identifier of the user or process that wrote the record"
      - field: trace_id
        type: string
        description: "W3C tracecontext trace id (32-hex) from the originating request traceparent header. NULL if absent."
      - field: span_id
        type: string
        description: "W3C tracecontext span id (16-hex) from the originating request traceparent header. NULL if absent."
  response:
    fields:
      - field: event_id
        type: string
*/
INSERT INTO audit.audit_event (
    event_id,
    event_type,
    event_category,
    actor_name,
    actor_personal_code_hash,
    description,
    log_content,
    organisation_id,
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
    NULLIF(:organisation_id, '')::BIGINT,
    :created_by,
    NULLIF(:trace_id, ''),
    NULLIF(:span_id, '')
) RETURNING event_id;
