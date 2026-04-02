/*
declaration:
  version: 0.1
  description: "Update user fields"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: id
        type: string
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
UPDATE users."user"
SET
    first_name = :first_name,
    last_name = :last_name,
    personal_code = :personal_code,
    organisation_id = :organisation_id::UUID,
    email = :email,
    phone = :phone,
    access_start = :access_start::DATE,
    access_end = CASE WHEN :access_end = '' THEN NULL ELSE :access_end::DATE END,
    status = CASE
        WHEN :access_end <> '' AND :access_end::DATE < CURRENT_DATE THEN 'deactivating'
        ELSE 'active'
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :id::UUID
RETURNING id, first_name, last_name, personal_code, organisation_id, email, phone, access_start, access_end, status, updated_at;
