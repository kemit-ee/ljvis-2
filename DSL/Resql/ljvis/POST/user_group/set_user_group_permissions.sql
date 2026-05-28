/*
declaration:
  version: 0.1
  description: "Batch-insert user_group_permission link rows and their state rows for comma-separated permission IDs"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: number
      - field: permission_ids
        type: string
        description: "Comma-separated permission IDs"
      - field: status
        type: string
        description: "active or removed"
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
WITH perm_id_list AS (
    SELECT unnest(string_to_array(:permission_ids, ','))::BIGINT AS perm_id
),
existing_links AS (
    SELECT ugp.id, ugp.permission_id
    FROM ljvis2.user_group_permission ugp
    WHERE ugp.user_group_id = :user_group_id::BIGINT
      AND ugp.permission_id = ANY(SELECT perm_id FROM perm_id_list)
),
new_links AS (
    INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by)
    SELECT :user_group_id::BIGINT, p.perm_id, :created_by
    FROM perm_id_list p
    WHERE p.perm_id NOT IN (SELECT permission_id FROM existing_links)
    RETURNING id
),
link_ids AS (
    SELECT id FROM existing_links
    UNION ALL
    SELECT id FROM new_links
)
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by)
SELECT id, :status, :created_by FROM link_ids
RETURNING id;
