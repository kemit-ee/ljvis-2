/*
description: "List all permissions (fixed set)"
namespace: permission
params: {}
returns:
  - name: id
    type: string
    nullable: true
  - name: code
    type: string
    nullable: true
  - name: description
    type: string
    nullable: true
*/
SELECT
    id,
    code,
    description
FROM users.permission
ORDER BY code;
