/*
declaration:
  version: 0.1
  description: "Get all user groups assigned to a specific user"
  method: get
  namespace: user
  returns: json
  allowlist:
    query:
      - field: user_id
        type: string
        description: "User UUID"
  response:
    fields:
      - field: user_group_id
        type: string
      - field: name
        type: string
*/
SELECT
    ug.id AS user_group_id,
    ug.name
FROM users.user_user_group uug
JOIN users.user_group ug ON ug.id = uug.user_group_id
WHERE uug.user_id = :user_id::UUID
ORDER BY ug.name;
