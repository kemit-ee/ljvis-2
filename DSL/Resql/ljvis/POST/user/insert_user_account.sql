/*
declaration:
  version: 0.1
  description: "Create a new user — single snapshot INSERT (replaces v1 insert_user_account + insert_user_account_data_state + insert_user_account_state + rebuild)"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: personal_code
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
INSERT INTO users.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, access_end, status, user_groups, created_by
)
SELECT
    nextval('users.seq_user_account_key'),
    :personal_code,
    :first_name,
    :last_name,
    :organisation_id::BIGINT,
    (SELECT name FROM users.organisation WHERE id = :organisation_id::BIGINT),
    :structural_unit,
    :job_title,
    :email,
    CASE WHEN COALESCE(:phone, '') = '' THEN NULL ELSE :phone END,
    :access_start::DATE,
    CASE WHEN COALESCE(:access_end, '') = '' THEN NULL ELSE :access_end::DATE END,
    'active',
    '{}'::BIGINT[],
    :created_by
RETURNING user_account_key AS id;
