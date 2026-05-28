/*
declaration:
  version: 0.1
  description: "Insert mutable user data snapshot (first row on create, new row on each update)"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: user_account_id
        type: string
      - field: first_name
        type: string
      - field: last_name
        type: string
      - field: organisation_id
        type: string
      - field: email
        type: string
      - field: phone
        type: string
      - field: structural_unit
        type: string
      - field: job_title
        type: string
      - field: access_start
        type: string
      - field: access_end
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
*/
INSERT INTO ljvis2.user_account_data_state (
    user_account_id, first_name, last_name, organisation_id,
    email, phone, structural_unit, job_title,
    access_start, access_end, created_by
)
VALUES (
    :user_account_id::BIGINT,
    :first_name,
    :last_name,
    :organisation_id::BIGINT,
    :email,
    CASE WHEN COALESCE(:phone, '') = '' THEN NULL ELSE :phone END,
    :structural_unit,
    :job_title,
    :access_start::DATE,
    CASE WHEN COALESCE(:access_end, '') = '' THEN NULL ELSE :access_end::DATE END,
    :created_by
)
RETURNING id;
