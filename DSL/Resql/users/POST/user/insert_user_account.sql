/*
declaration:
  version: 0.1
  description: "Insert a new user account (immutable identity row)"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: personal_code
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
INSERT INTO ljvis2.user_account (personal_code, created_by)
VALUES (:personal_code, :created_by)
RETURNING id;
