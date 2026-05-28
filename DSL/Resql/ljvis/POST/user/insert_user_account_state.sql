/*
declaration:
  version: 0.1
  description: "Insert user account status row"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: user_account_id
        type: string
      - field: status
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
INSERT INTO ljvis2.user_account_state (user_account_id, status, created_by)
VALUES (:user_account_id::BIGINT, :status, :created_by)
RETURNING id;
