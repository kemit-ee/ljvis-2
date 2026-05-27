/*
declaration:
  version: 0.1
  description: "Update user group name"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: number
      - field: name
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: user_group_id
        type: number
*/
INSERT INTO ljvis2.user_group_name_state (user_group_id, name, created_by)
VALUES (:user_group_id::BIGINT, :name, :created_by)
RETURNING user_group_id;
