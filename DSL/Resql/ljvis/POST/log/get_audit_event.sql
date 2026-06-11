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
      - field: id
        type: string
      - field: event_type
        type: string
      - field: event_category
        type: string
      - field: actor_name
        type: string
      - field: actor_personal_code
        type: string
      - field: description
        type: string
      - field: log_content
        type: json
      - field: created_at
        type: string
      - field: created_by
        type: string
*/
SELECT
    e.id,
    e.event_type,
    e.event_category,
    e.actor_name,
    e.actor_personal_code,
    e.description,
    e.log_content::VARCHAR,
    e.created_at,
    e.created_by
FROM ljvis2.audit_event e
WHERE e.id = :id::BIGINT;
