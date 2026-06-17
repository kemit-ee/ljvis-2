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
        type: number
        description: "Optional organisation filter (0 = no filter)"
  response:
    fields:
      - field: id
        type: string
      - field: name
        type: string
*/
WITH latest AS (
    SELECT DISTINCT ON (user_group_key)
        user_group_key,
        name,
        organisations,
        (CARDINALITY(organisations) = (SELECT COUNT(*)::INT FROM ljvis2.organisation)) AS covers_all_organisations
    FROM ljvis2.user_group
    ORDER BY user_group_key, created_at DESC
)
SELECT
    l.user_group_key AS id,
    l.name,
    l.covers_all_organisations
FROM latest l
WHERE l.user_group_key = :id::BIGINT
  AND (
      :organisation_id = 0
      OR :organisation_id = ANY(l.organisations)
  )
LIMIT 1;