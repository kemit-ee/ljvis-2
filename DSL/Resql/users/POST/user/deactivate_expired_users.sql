/*
declaration:
  version: 0.1
  description: "Deactivate users with past access_end: insert inactive state (cron job)"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
WITH latest_data AS (
    SELECT DISTINCT ON (user_account_id)
        user_account_id,
        access_end
    FROM ljvis2.user_account_data_state
    ORDER BY user_account_id, created_at DESC
),
latest_status AS (
    SELECT DISTINCT ON (user_account_id)
        user_account_id,
        status
    FROM ljvis2.user_account_state
    ORDER BY user_account_id, created_at DESC
),
expired_users AS (
    SELECT ld.user_account_id
    FROM latest_data ld
    JOIN latest_status ls ON ls.user_account_id = ld.user_account_id
    WHERE ld.access_end IS NOT NULL
      AND ld.access_end < CURRENT_DATE
      AND ls.status <> 'inactive'
)
INSERT INTO ljvis2.user_account_state (user_account_id, status, created_by)
SELECT user_account_id, 'inactive', :created_by
FROM expired_users
RETURNING user_account_id AS id;
