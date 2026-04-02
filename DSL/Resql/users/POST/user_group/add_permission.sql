/*
declaration:
  version: 0.1
  description: "Add a permission link to a user group"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: string
      - field: permission_id
        type: string
  response:
    fields:
      - field: id
        type: string
*/
INSERT INTO users.user_group_permission (user_group_id, permission_id)
VALUES (:user_group_id::UUID, :permission_id::UUID)
ON CONFLICT (user_group_id, permission_id) DO NOTHING
RETURNING id, user_group_id, permission_id;
