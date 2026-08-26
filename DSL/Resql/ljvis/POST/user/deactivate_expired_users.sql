/*
description: "Deactivate users with past access_end: insert inactive state (cron job)"
namespace: user
params:
  created_by:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
*/
WITH expired AS (
    SELECT DISTINCT ON (user_account_key)
        user_account_key, personal_code, first_name, last_name,
        organisation_id, organisation_name, structural_unit, job_title,
        email, phone, access_start, access_end, user_groups
    FROM users.user_account
    WHERE access_end IS NOT NULL
      AND access_end < CURRENT_DATE
      AND status <> 'inactive'
    ORDER BY user_account_key, created_at DESC
)
INSERT INTO users.user_account (
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, access_end, status, user_groups, created_by
)
SELECT
    user_account_key, personal_code, first_name, last_name,
    organisation_id, organisation_name, structural_unit, job_title,
    email, phone, access_start, access_end, 'inactive', user_groups, :created_by
FROM expired
RETURNING user_account_key AS id;
