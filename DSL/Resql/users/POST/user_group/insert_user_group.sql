/*
declaration:
  version: 0.1
  description: "Insert a new user group"
  method: post
  accepts: json
  returns: json
  namespace: user_group
  allowlist:
    body:
      - field: name
        type: string
  response:
    fields:
      - field: id
        type: string
      - field: name
        type: string
*/
INSERT INTO users.user_group (name)
VALUES (:name)
RETURNING id, name, created_at;
