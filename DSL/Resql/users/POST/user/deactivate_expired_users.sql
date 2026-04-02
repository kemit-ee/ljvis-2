/*
declaration:
  version: 0.1
  description: "Deactivate users with past access_end: remove groups and set status to inactive (cron job)"
  method: post
  accepts: json
  returns: json
  namespace: user
*/
WITH expired_users AS (
    SELECT id FROM users."user"
    WHERE access_end IS NOT NULL
      AND access_end < CURRENT_DATE
      AND status <> 'inactive'
),
removed_groups AS (
    DELETE FROM users.user_user_group
    WHERE user_id IN (SELECT id FROM expired_users)
)
UPDATE users."user"
SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM expired_users)
RETURNING id, first_name, last_name, status;
