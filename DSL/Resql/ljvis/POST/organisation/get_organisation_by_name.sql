/*
description: "Get organisation ID by name"
namespace: organisation
params:
  name:
    type: string
    required: false
    description: "Organisation name"
returns:
  - name: id
    type: number
    nullable: true
*/
SELECT id
FROM users.organisation
WHERE name = :name
LIMIT 1;
