/*
declaration:
  version: 0.1
  description: "Replace all permission links for a user group in one transaction"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: string
      - field: permission_ids
        type: string
        description: "Comma-separated permission UUIDs (empty string to clear all)"
  response:
    fields:
      - field: permission_id
        type: string
*/
INSERT INTO users.user_group_permission (user_group_id, permission_id)
SELECT :user_group_id::UUID, unnest(string_to_array(:permission_ids, ','))::UUID
ON CONFLICT (user_group_id, permission_id) DO NOTHING
RETURNING permission_id;
