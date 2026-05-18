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
    ugp.permission_id,
    (SELECT p.code FROM users.permission p WHERE p.id = ugp.permission_id) AS code,
    (SELECT p.description FROM users.permission p WHERE p.id = ugp.permission_id) AS description
FROM users.user_group_permission ugp
WHERE ugp.user_group_id = :user_group_id::UUID
ORDER BY code;
