/*
declaration:
  version: 0.1
  description: "Update user status"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: id
        type: string
      - field: status
        type: string
        enum: ['active', 'deactivating', 'inactive']
  response:
    fields:
      - field: id
        type: string
      - field: status
        type: string
*/
UPDATE users."user"
SET
    status = :status,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :id::UUID
RETURNING id, status, updated_at;
