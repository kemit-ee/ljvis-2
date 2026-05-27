/*
declaration:
  version: 0.1
  description: "Insert state for user group permission links"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_permission_ids
        type: string
        description: "Comma-separated user_group_permission IDs"
      - field: status
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
INSERT INTO ljvis2.user_group_permission_state (user_group_permission_id, status, created_by)
SELECT unnest(string_to_array(:user_group_permission_ids, ','))::BIGINT, :status, :created_by
RETURNING id;
