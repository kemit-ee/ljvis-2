/*
description: "Update user group organisations — apply added and removed org IDs in a single insert"
namespace: user_group
params:
  user_group_id:
    type: string
    required: false
    description: "user_group_key of the target group"
  added_organisation_ids:
    type: string
    required: false
    description: "Comma-separated organisation IDs to add"
  removed_organisation_ids:
    type: string
    required: false
    description: "Comma-separated organisation IDs to remove"
  created_by:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
*/
WITH removed_list AS (
    SELECT unnest(string_to_array(NULLIF(:removed_organisation_ids, ''), ','))::BIGINT AS org_id
),
added_list AS (
    SELECT unnest(string_to_array(NULLIF(:added_organisation_ids, ''), ','))::BIGINT AS org_id
),
latest AS (
    SELECT DISTINCT ON (user_group_key)
        user_group_key, name, organisations, permissions
    FROM users.user_group
    WHERE user_group_key = :user_group_id::BIGINT
    ORDER BY user_group_key, created_at DESC
),
kept_ids AS (
    SELECT org_id
    FROM latest,
         UNNEST(organisations) AS org_id
    WHERE org_id NOT IN (SELECT org_id FROM removed_list)
),
new_orgs AS (
    SELECT COALESCE(
        ARRAY_AGG(org_id ORDER BY org_id),
        ARRAY[]::BIGINT[]
    ) AS organisations
    FROM (
        SELECT org_id FROM kept_ids
        UNION ALL
        SELECT org_id FROM added_list
    ) combined
)
INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
SELECT l.user_group_key, l.name, no.organisations, l.permissions, :created_by
FROM latest l, new_orgs no
RETURNING user_group_key AS id;
