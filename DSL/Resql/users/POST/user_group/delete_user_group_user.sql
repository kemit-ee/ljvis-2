/*
declaration:
  version: 0.1
  description: "Delete a user from a user group"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: id
        type: string
      - field: user_id
        type: string
  response:
    fields:
      - field: user_group_id
        type: string
      - field: user_id
        type: string
*/
DELETE FROM users.user_user_group
WHERE user_group_id = :id::UUID AND user_id = :user_id::UUID
RETURNING user_group_id, user_id;
