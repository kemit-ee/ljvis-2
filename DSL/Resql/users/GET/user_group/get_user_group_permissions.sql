/*
declaration:
  version: 0.1
  description: "Get permissions linked to a user group"
  method: get
  namespace: user_group
  returns: json
  allowlist:
    query:
      - field: user_group_id
        type: string
        description: "User group UUID"
  response:
    fields:
      - field: permission_id
        type: string
      - field: code
        type: string
      - field: description
        type: string
*/
SELECT
    p.id AS permission_id,
    p.code,
    p.description
FROM users.user_group_permission ugp
JOIN users.permission p ON p.id = ugp.permission_id
WHERE ugp.user_group_id = :user_group_id::UUID
ORDER BY p.code;
