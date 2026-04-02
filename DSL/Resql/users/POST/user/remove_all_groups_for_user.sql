/*
declaration:
  version: 0.1
  description: "Remove all group memberships for a user (used when changing org or by cron)"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: user_id
        type: string
*/
DELETE FROM users.user_user_group
WHERE user_id = :user_id::UUID;
