/*
declaration:
  version: 0.1
  description: "Insert user group permission links"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: user_group_id
        type: number
      - field: permission_ids
        type: string
        description: "Comma-separated permission IDs"
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
INSERT INTO ljvis2.user_group_permission (user_group_id, permission_id, created_by)
SELECT :user_group_id::BIGINT, unnest(string_to_array(:permission_ids, ','))::BIGINT, :created_by
RETURNING id;
