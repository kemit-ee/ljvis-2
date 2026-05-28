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
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
INSERT INTO ljvis2.user_group (created_by)
VALUES (:created_by)
RETURNING id;
