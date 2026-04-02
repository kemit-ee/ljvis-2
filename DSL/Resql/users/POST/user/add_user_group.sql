/*
declaration:
  version: 0.1
  description: "Add a single group link for a user"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: user_id
        type: string
      - field: user_group_id
        type: string
  response:
    fields:
      - field: id
        type: string
*/
INSERT INTO users.user_user_group (user_id, user_group_id)
VALUES (:user_id::UUID, :user_group_id::UUID)
ON CONFLICT (user_id, user_group_id) DO NOTHING
RETURNING id, user_id, user_group_id;
