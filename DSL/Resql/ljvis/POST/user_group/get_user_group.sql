/*
description: "Get user group detail by ID"
namespace: user_group
params:
  id:
    type: string
    required: false
    description: "User group ID"
  organisation_id:
    type: number
    required: false
    description: "Optional organisation filter (0 = no filter)"
returns:
  - name: id
    type: string
    nullable: true
  - name: name
    type: string
    nullable: true
*/
WITH latest AS (
    SELECT DISTINCT ON (user_group_key)
        user_group_key,
        name,
        organisations,
        (CARDINALITY(organisations) = (SELECT COUNT(*)::INT FROM users.organisation)) AS covers_all_organisations
    FROM users.user_group
    ORDER BY user_group_key, created_at DESC
)
SELECT
    l.user_group_key AS id,
    l.name,
    l.covers_all_organisations
FROM latest l
WHERE l.user_group_key = :id::BIGINT
  AND (
      :organisation_id::BIGINT = 0
      OR :organisation_id::BIGINT = ANY(l.organisations)
  )
LIMIT 1;