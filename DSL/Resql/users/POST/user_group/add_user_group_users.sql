/*
declaration:
  version: 0.1
  description: "Add new users to user group"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: string
      - field: user_ids
        type: string
        description: "Comma-separated user UUIDs (empty string to clear all)"
  response:
    fields:
      - field: user_id
        type: string
*/
INSERT INTO users.user_user_group (user_group_id, user_id)
SELECT :user_group_id::UUID, unnest(string_to_array(:user_ids, ','))::UUID
ON CONFLICT (user_group_id, user_id) DO NOTHING
RETURNING user_id;
