/*
declaration:
  version: 0.1
  description: "Get user group detail by ID"
  method: get
  namespace: user_group
  returns: json
  allowlist:
    query:
      - field: id
        type: string
        description: "User group UUID"
  response:
    fields:
      - field: id
        type: string
      - field: name
        type: string
      - field: created_at
        type: string
      - field: updated_at
        type: string
*/
SELECT
    id,
    name,
    created_at,
    updated_at
FROM users.user_group
WHERE id = :id::UUID
LIMIT 1;
