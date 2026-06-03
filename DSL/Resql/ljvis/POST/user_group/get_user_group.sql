/*
declaration:
  version: 0.1
  description: "Get user group detail by ID"
  method: post
  namespace: user_group
  returns: json
  allowlist:
    body:
      - field: id
        type: string
        description: "User group ID"
      - field: organisation_id
        type: string
        description: "Optional organisation filter"
  response:
    fields:
      - field: id
        type: string
      - field: name
        type: string
*/
WITH latest AS (
    SELECT DISTINCT ON (user_group_id)
        user_group_id,
        name,
        organisations,
        covers_all_organisations
    FROM ljvis2.user_group_latest
    ORDER BY user_group_id, created_at DESC
)
SELECT
    l.user_group_id AS id,
    l.name
FROM latest l
WHERE l.user_group_id = :id::BIGINT
  AND (
      COALESCE(:organisation_id, '') = ''
      OR EXISTS (
          SELECT 1 FROM JSONB_ARRAY_ELEMENTS(l.organisations) AS org
          WHERE org->>'id' = :organisation_id
      )
  )
LIMIT 1;