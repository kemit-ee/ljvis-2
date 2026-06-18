/*
declaration:
  version: 0.1
  description: "Update user group permissions — apply added and removed permission IDs in a single insert"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: string
        description: "user_group_key of the target group"
      - field: added_permission_ids
        type: string
        description: "Comma-separated permission catalogue IDs to add"
      - field: removed_permission_ids
        type: string
        description: "Comma-separated permission catalogue IDs to remove"
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
WITH removed_ids_list AS (
    SELECT unnest(string_to_array(NULLIF(:removed_permission_ids, ''), ','))::BIGINT AS perm_id
),
added_ids_list AS (
    SELECT unnest(string_to_array(NULLIF(:added_permission_ids, ''), ','))::BIGINT AS perm_id
),
removed_codes_list AS (
    SELECT code
    FROM ljvis2.permission
    WHERE id IN (SELECT perm_id FROM removed_ids_list)
),
added_codes_list AS (
    SELECT code
    FROM ljvis2.permission
    WHERE id IN (SELECT perm_id FROM added_ids_list)
),
latest AS (
    SELECT DISTINCT ON (user_group_key)
        user_group_key, name, organisations, permissions
    FROM ljvis2.user_group
    WHERE user_group_key = :user_group_id::BIGINT
    ORDER BY user_group_key, created_at DESC
),
kept_perms AS (
    SELECT perm_code
    FROM latest,
         UNNEST(permissions) AS perm_code
    WHERE perm_code NOT IN (SELECT code FROM removed_codes_list)
),
new_perms AS (
    SELECT COALESCE(
        ARRAY_AGG(perm_code ORDER BY perm_code),
        ARRAY[]::TEXT[]
    ) AS permissions
    FROM (
        SELECT perm_code FROM kept_perms
        UNION ALL
        SELECT code AS perm_code FROM added_codes_list
    ) combined
)
INSERT INTO ljvis2.user_group (user_group_key, name, organisations, permissions, created_by)
SELECT l.user_group_key, l.name, l.organisations, np.permissions, :created_by
FROM latest l, new_perms np
RETURNING user_group_key AS id;
