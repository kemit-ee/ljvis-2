/*
description: "Create a new user — single snapshot INSERT (replaces v1 insert_user_account + insert_user_account_data_state + insert_user_account_state + rebuild)"
namespace: user
params:
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
  created_by:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
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
    NULLIF(:structural_unit, ''),
    :job_title,
    :email,
    CASE WHEN COALESCE(:phone, '') = '' THEN NULL ELSE :phone END,
    :access_start::DATE,
    CASE WHEN COALESCE(:access_end, '') = '' THEN NULL ELSE :access_end::DATE END,
    'active',
    '{}'::BIGINT[],
    :created_by
RETURNING user_account_key AS id;
