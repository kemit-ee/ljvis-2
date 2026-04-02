/*
declaration:
  version: 0.1
  description: "Remove all group links for a user (first step of set-groups)"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: user_id
        type: string
  response:
    fields:
      - field: deleted_count
        type: number
*/
DELETE FROM users.user_user_group
WHERE user_id = :user_id::UUID;
