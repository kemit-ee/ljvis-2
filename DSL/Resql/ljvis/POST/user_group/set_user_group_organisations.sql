/*
declaration:
  version: 0.1
  description: "Update user group organisations — copy latest snapshot with orgs added or removed (delta)"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: string
        description: "user_group_key of the target group"
      - field: organisation_ids
        type: string
        description: "Comma-separated organisation IDs"
      - field: status
        type: string
        description: "active (add) or removed (remove)"
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
WITH org_ids_list AS (
    SELECT unnest(string_to_array(:organisation_ids, ','))::BIGINT AS org_id
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
    WHERE org_id NOT IN (SELECT org_id FROM org_ids_list)
),
added_ids AS (
    SELECT org_id
    FROM org_ids_list
    WHERE :status = 'active'
),
new_orgs AS (
    SELECT COALESCE(
        ARRAY_AGG(org_id ORDER BY org_id),
        ARRAY[]::BIGINT[]
    ) AS organisations
    FROM (
        SELECT org_id FROM kept_ids
        UNION ALL
        SELECT org_id FROM added_ids
    ) combined
)
INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
SELECT l.user_group_key, l.name, no.organisations, l.permissions, :created_by
FROM latest l, new_orgs no
RETURNING user_group_key AS id;
