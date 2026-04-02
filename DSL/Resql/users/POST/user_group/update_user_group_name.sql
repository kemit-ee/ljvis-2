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
      - field: id
        type: string
      - field: name
        type: string
  response:
    fields:
      - field: id
        type: string
      - field: name
        type: string
*/
UPDATE users.user_group
SET
    name = :name,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :id::UUID
RETURNING id, name, updated_at;
