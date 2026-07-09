/*
declaration:
  version: 0.1
  description: "List all audit events"
  method: post
  namespace: log
  returns: json
  allowlist:
    body:
      - field: search
        type: string
        description: "Search by event type, description or actor name"
      - field: sorting
        type: string
        description: "Sort column and direction (createdAt, eventType, eventCategory, actorName)"
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
      - field: actor_personal_code_hash
        type: string
      - field: description
        type: string
      - field: log_content
        type: string
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
    encode(e.actor_personal_code_hash, 'hex') AS actor_personal_code_hash,
    e.description,
    e.log_content::VARCHAR,
    e.created_at,
    e.created_by
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
