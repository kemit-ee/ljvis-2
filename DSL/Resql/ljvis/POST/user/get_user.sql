/*
declaration:
  version: 0.1
  description: "Get a single user by ID with organisation and groups"
  method: post
  namespace: user
  returns: json
  allowlist:
    body:
      - field: id
        type: string
        description: "User UUID"
      - field: organisation_id
        type: string
        description: "Optional organisation filter"
  response:
    fields:
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
      - field: organisation_name
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
