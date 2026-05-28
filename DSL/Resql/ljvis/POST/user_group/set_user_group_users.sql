/*
declaration:
  version: 0.1
  description: "Batch-insert user_account_user_group link rows and their state rows for comma-separated user IDs"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: number
      - field: user_ids
        type: string
        description: "Comma-separated user account IDs"
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
WITH user_id_list AS (
    SELECT unnest(string_to_array(:user_ids, ','))::BIGINT AS user_account_id
),
existing_links AS (
    SELECT uaug.id, uaug.user_account_id
    FROM ljvis2.user_account_user_group uaug
    WHERE uaug.user_group_id = :user_group_id::BIGINT
      AND uaug.user_account_id = ANY(SELECT user_account_id FROM user_id_list)
),
new_links AS (
    INSERT INTO ljvis2.user_account_user_group (user_account_id, user_group_id, created_by)
    SELECT u.user_account_id, :user_group_id::BIGINT, :created_by
    FROM user_id_list u
    WHERE u.user_account_id NOT IN (SELECT user_account_id FROM existing_links)
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
