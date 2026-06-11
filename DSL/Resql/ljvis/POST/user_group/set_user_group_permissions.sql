/*
declaration:
  version: 0.1
  description: "Update user group permissions — copy latest snapshot with permission codes added or removed (delta; IDs resolved to codes)"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: string
        description: "user_group_key of the target group"
      - field: permission_ids
        type: string
        description: "Comma-separated permission catalogue IDs"
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
WITH perm_ids_list AS (
    SELECT unnest(string_to_array(:permission_ids, ','))::BIGINT AS perm_id
),
perm_codes_list AS (
    SELECT p.code
    FROM perm_ids_list pil
    JOIN ljvis2.permission p ON p.id = pil.perm_id
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
    WHERE perm_code NOT IN (SELECT code FROM perm_codes_list)
),
added_perms AS (
    SELECT code AS perm_code
    FROM perm_codes_list
    WHERE :status = 'active'
),
new_perms AS (
    SELECT COALESCE(
        ARRAY_AGG(perm_code ORDER BY perm_code),
        ARRAY[]::TEXT[]
    ) AS permissions
    FROM (
        SELECT perm_code FROM kept_perms
        UNION ALL
        SELECT perm_code FROM added_perms
    ) combined
)
INSERT INTO ljvis2.user_group (user_group_key, name, organisations, permissions, created_by)
SELECT l.user_group_key, l.name, l.organisations, np.permissions, :created_by
FROM latest l, new_perms np
RETURNING user_group_key AS id;
