/*
declaration:
  version: 0.1
  description: "List all permissions (fixed set)"
  method: post
  namespace: permission
  returns: json
  response:
    fields:
      - field: id
        type: string
      - field: code
        type: string
      - field: description
        type: string
*/
SELECT
    id,
    code,
    description
FROM users.permission
ORDER BY code;
