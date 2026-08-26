/*
description: "List all audit events"
namespace: log
params:
  search:
    type: string
    required: false
    description: "Search by event type, description or actor name"
  sorting:
    type: string
    required: false
    description: "Sort column and direction (createdAt, eventType, eventCategory, actorName)"
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
    type: string
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
WHERE
    COALESCE(:search, '') = ''
    OR e.event_type ILIKE '%' || COALESCE(:search, '') || '%'
    OR e.event_category ILIKE '%' || COALESCE(:search, '') || '%'
    OR e.description ILIKE '%' || COALESCE(:search, '') || '%'
    OR e.actor_name ILIKE '%' || COALESCE(:search, '') || '%'
ORDER BY
    CASE WHEN COALESCE(:sorting, 'createdAt desc') = 'createdAt desc' THEN e.created_at END DESC,
    CASE WHEN COALESCE(:sorting, 'createdAt desc') = 'createdAt asc'  THEN e.created_at END ASC,
    CASE WHEN COALESCE(:sorting, 'createdAt desc') = 'eventType asc'  THEN e.event_type COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'createdAt desc') = 'eventType desc' THEN e.event_type COLLATE "et-EE-x-icu" END DESC,
    CASE WHEN COALESCE(:sorting, 'createdAt desc') = 'eventCategory asc'  THEN e.event_category COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'createdAt desc') = 'eventCategory desc' THEN e.event_category COLLATE "et-EE-x-icu" END DESC,
    CASE WHEN COALESCE(:sorting, 'createdAt desc') = 'actorName asc'  THEN e.actor_name COLLATE "et-EE-x-icu" END ASC,
    CASE WHEN COALESCE(:sorting, 'createdAt desc') = 'actorName desc' THEN e.actor_name COLLATE "et-EE-x-icu" END DESC,
    e.created_at DESC
LIMIT 10000;
