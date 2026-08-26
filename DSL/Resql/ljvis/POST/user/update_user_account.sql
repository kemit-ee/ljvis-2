/*
description: "Update user data — copy latest snapshot with new field values and status (replaces v1 insert_user_account_data_state + insert_user_account_state + rebuild)"
namespace: user
params:
  user_account_id:
    type: string
    required: false
    description: "user_account_key of the target user"
  personal_code:
    type: string
    required: false
  first_name:
    type: string
    required: false
  last_name:
    type: string
    required: false
  organisation_id:
    type: string
    required: false
  email:
    type: string
    required: false
  phone:
    type: string
    required: false
  structural_unit:
    type: string
    required: false
  job_title:
    type: string
    required: false
  access_start:
    type: string
    required: false
  access_end:
    type: string
    required: false
  status:
    type: string
    required: false
  created_by:
    type: string
    required: false
  clear_groups:
    type: boolean
    required: false
returns:
  - name: id
    type: number
    nullable: true
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
    NULLIF(:structural_unit,''),
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
