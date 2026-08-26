/*
description: "Get a single user by ID with organisation and groups"
namespace: user
params:
  id:
    type: string
    required: false
    description: "User UUID"
  organisation_id:
    type: string
    required: false
    description: "Optional organisation filter"
returns:
  - name: id
    type: string
    nullable: true
  - name: first_name
    type: string
    nullable: true
  - name: last_name
    type: string
    nullable: true
  - name: personal_code
    type: string
    nullable: true
  - name: organisation_id
    type: string
    nullable: true
  - name: organisation_name
    type: string
    nullable: true
  - name: email
    type: string
    nullable: true
  - name: phone
    type: string
    nullable: true
  - name: structural_unit
    type: string
    nullable: true
  - name: job_title
    type: string
    nullable: true
  - name: access_start
    type: string
    nullable: true
  - name: access_end
    type: string
    nullable: true
  - name: status
    type: string
    nullable: true
*/
SELECT DISTINCT ON (ua.user_account_key)
    ua.user_account_key AS id,
    ua.first_name,
    ua.last_name,
    ua.personal_code,
    ua.organisation_id,
    ua.organisation_name,
    ua.email,
    ua.phone,
    ua.structural_unit,
    ua.job_title,
    ua.access_start,
    ua.access_end,
    ua.status
FROM users.user_account ua
WHERE ua.user_account_key = :id::BIGINT
  AND (COALESCE(:organisation_id::TEXT, '') = '' OR ua.organisation_id::TEXT = :organisation_id::TEXT)
ORDER BY ua.user_account_key, ua.created_at DESC
LIMIT 1;
