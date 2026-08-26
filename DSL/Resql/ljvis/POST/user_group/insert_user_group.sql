/*
description: "Create a new user group — snapshot INSERT with name, organisations and permissions"
namespace: user_group
params:
  name:
    type: string
    required: false
  organisation_ids:
    type: string
    required: false
    description: "Comma-separated organisation IDs"
  permission_ids:
    type: string
    required: false
    description: "Comma-separated permission IDs"
  created_by:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
*/
INSERT INTO users.user_group (user_group_key, name, organisations, permissions, created_by)
VALUES (
    nextval('users.seq_user_group_key'),
    :name,
    ARRAY(SELECT unnest(string_to_array(NULLIF(:organisation_ids, ''), ','))::BIGINT ORDER BY 1),
    ARRAY(SELECT code FROM users.permission WHERE id::TEXT = ANY(string_to_array(NULLIF(:permission_ids, ''), ',')) ORDER BY code),
    :created_by
)
RETURNING user_group_key AS id;
