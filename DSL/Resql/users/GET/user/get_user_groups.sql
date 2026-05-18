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
    uug.user_group_id,
    (SELECT ug.name FROM users.user_group ug WHERE ug.id = uug.user_group_id) AS name
FROM users.user_user_group uug
WHERE uug.user_id = :user_id::UUID
ORDER BY name;
