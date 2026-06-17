/*
declaration:
  version: 0.1
  description: "Create a new user group — snapshot INSERT with name, organisations and permissions"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: name
        type: string
      - field: organisation_ids
        type: string
        description: "Comma-separated organisation IDs"
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
INSERT INTO ljvis2.user_group (user_group_key, name, organisations, permissions, created_by)
VALUES (
    nextval('ljvis2.seq_user_group_key'),
    :name,
    ARRAY(SELECT unnest(string_to_array(NULLIF(:organisation_ids, ''), ','))::BIGINT ORDER BY 1),
    ARRAY(SELECT code FROM ljvis2.permission WHERE id::TEXT = ANY(string_to_array(NULLIF(:permission_ids, ''), ',')) ORDER BY code),
    :created_by
)
RETURNING user_group_key AS id;
