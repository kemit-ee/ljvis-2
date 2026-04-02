/*
declaration:
  version: 0.1
  description: "Insert a new user"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: first_name
        type: string
      - field: last_name
        type: string
      - field: personal_code
        type: string
      - field: organisation_id
        type: string
      - field: email
        type: string
      - field: phone
        type: string
      - field: access_start
        type: string
      - field: access_end
        type: string
  response:
    fields:
      - field: id
        type: string
*/
INSERT INTO users."user" (
    first_name, last_name, personal_code, organisation_id,
    email, phone, access_start, access_end, status
)
VALUES (
    :first_name,
    :last_name,
    :personal_code,
    :organisation_id::UUID,
    :email,
    :phone,
    :access_start::DATE,
    CASE WHEN :access_end = '' THEN NULL ELSE :access_end::DATE END,
    'active'
)
RETURNING id, first_name, last_name, personal_code, organisation_id, email, phone, access_start, access_end, status, created_at;
