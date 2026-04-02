/*
declaration:
  version: 0.1
  description: "Delete a user group and all its links (CASCADE handles junction tables)"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: id
        type: string
  response:
    fields:
      - field: id
        type: string
*/
DELETE FROM users.user_group
WHERE id = :id::UUID
RETURNING id;
