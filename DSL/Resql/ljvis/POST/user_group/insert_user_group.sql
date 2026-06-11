/*
declaration:
  version: 0.1
  description: "Create a new user group — snapshot INSERT with name, empty organisations and permissions"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: name
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
INSERT INTO ljvis2.user_group (user_group_key, name, organisations, permissions, created_by)
VALUES (nextval('ljvis2.seq_user_group_key'), :name, '{}'::BIGINT[], '{}'::TEXT[], :created_by)
RETURNING user_group_key AS id;
