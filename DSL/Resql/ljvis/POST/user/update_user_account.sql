/*
declaration:
  version: 0.1
  description: "Update user data — copy latest snapshot with new field values and status (replaces v1 insert_user_account_data_state + insert_user_account_state + rebuild)"
  method: post
  accepts: json
  returns: json
  namespace: user
  allowlist:
    body:
      - field: user_account_id
        type: string
        description: "user_account_key of the target user"
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
      - field: status
        type: string
      - field: created_by
        type: string
      - field: clear_groups
        type: boolean
  response:
    fields:
      - field: id
        type: number
*/
WITH latest AS (
    SELECT DISTINCT ON (user_account_key)
        user_account_key, user_groups
    FROM users.user_account
    WHERE user_account_key = :user_account_id::BIGINT
    ORDER BY user_account_key, created_at DESC
)
INSERT INTO users.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, access_end, status, user_groups, created_by
)
SELECT
    l.user_account_key,
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
    :status,
    CASE WHEN CAST(:clear_groups AS BOOLEAN) THEN ARRAY[]::BIGINT[] ELSE l.user_groups END,
    :created_by
FROM latest l
RETURNING user_account_key AS id;
