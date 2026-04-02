/*
declaration:
  version: 0.1
  description: "Remove all permission links for a user group (first step of set-permissions)"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: string
*/
DELETE FROM users.user_group_permission
WHERE user_group_id = :user_group_id::UUID;
