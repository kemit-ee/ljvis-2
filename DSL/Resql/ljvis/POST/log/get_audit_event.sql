/*
declaration:
  version: 0.1
  description: "Get audit event by id"
  method: post
  namespace: log
  returns: json
  allowlist:
    body:
      - field: id
        type: string
        description: "Audit event id"
  response:
    fields:
      - field: event_id
        type: string
      - field: event_type
        type: string
      - field: event_category
        type: string
      - field: actor_name
        type: string
      - field: actor_personal_code_hash
        type: string
      - field: description
        type: string
      - field: log_content
        type: json
      - field: created_at
        type: string
      - field: created_by
        type: string
      - field: trace_id
        type: string
      - field: span_id
        type: string
*/
SELECT
    e.event_id,
    e.event_type,
    e.event_category,
    e.actor_name,
    encode(e.actor_personal_code_hash, 'hex') AS actor_personal_code_hash,
    e.description,
    e.log_content::VARCHAR,
    e.created_at,
    e.created_by,
    e.trace_id,
    e.span_id
FROM audit.audit_event e
WHERE e.event_id = :id;
