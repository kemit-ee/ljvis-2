/*
description: "List all organisations"
namespace: organisation
params: {}
returns:
  - name: id
    type: string
    nullable: true
  - name: name
    type: string
    nullable: true
  - name: code
    type: string
    nullable: true
*/
SELECT
    id,
    name,
    code
FROM users.organisation
ORDER BY name COLLATE "et-EE-x-icu";
