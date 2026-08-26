/*
description: "Get audit event by id"
namespace: log
params:
  id:
    type: string
    required: false
    description: "Audit event id"
returns:
  - name: event_id
    type: string
    nullable: true
  - name: event_type
    type: string
    nullable: true
  - name: event_category
    type: string
    nullable: true
  - name: actor_name
    type: string
    nullable: true
  - name: actor_personal_code_hash
    type: string
    nullable: true
  - name: description
    type: string
    nullable: true
  - name: log_content
    type: object
    nullable: true
  - name: created_at
    type: string
    nullable: true
  - name: created_by
    type: string
    nullable: true
  - name: trace_id
    type: string
    nullable: true
  - name: span_id
    type: string
    nullable: true
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
