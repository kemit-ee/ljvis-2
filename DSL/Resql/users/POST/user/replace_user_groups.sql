/*
declaration:
  version: 0.1
  description: "Batch insert group memberships for a user from comma-separated IDs"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: user_id
        type: string
      - field: group_ids
        type: string
        description: "Comma-separated user group UUIDs"
  response:
    fields:
      - field: user_group_id
        type: string
*/
INSERT INTO users.user_user_group (user_id, user_group_id)
SELECT :user_id::UUID, unnest(string_to_array(:group_ids, ','))::UUID
ON CONFLICT (user_id, user_group_id) DO NOTHING
RETURNING user_group_id;
