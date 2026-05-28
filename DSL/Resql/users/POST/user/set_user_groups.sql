/*
declaration:
  version: 0.1
  description: "Batch-insert user_account_user_group link rows and their state rows for comma-separated group IDs"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: user_account_id
        type: string
      - field: group_ids
        type: string
        description: "Comma-separated user group IDs"
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
WITH group_id_list AS (
    SELECT unnest(string_to_array(:group_ids, ','))::BIGINT AS group_id
),
existing_links AS (
    SELECT uaug.id, uaug.user_group_id
    FROM ljvis2.user_account_user_group uaug
    WHERE uaug.user_account_id = :user_account_id::BIGINT
      AND uaug.user_group_id = ANY(SELECT group_id FROM group_id_list)
),
new_links AS (
    INSERT INTO ljvis2.user_account_user_group (user_account_id, user_group_id, created_by)
    SELECT :user_account_id::BIGINT, g.group_id, :created_by
    FROM group_id_list g
    WHERE g.group_id NOT IN (SELECT user_group_id FROM existing_links)
    RETURNING id
),
link_ids AS (
    SELECT id FROM existing_links
    UNION ALL
    SELECT id FROM new_links
)
INSERT INTO ljvis2.user_account_user_group_state (user_account_user_group_id, status, created_by)
SELECT id, :status, :created_by FROM link_ids
RETURNING id;
