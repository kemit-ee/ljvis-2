/*
declaration:
  version: 0.1
  description: "Get a single user by ID with organisation and groups"
  method: get
  namespace: user
  returns: json
  allowlist:
    query:
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
      - field: structural_unit_name
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
SELECT
    ua.id,
    (SELECT d.first_name FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) AS first_name,
    (SELECT d.last_name FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) AS last_name,
    ua.personal_code,
    (SELECT d.organisation_id FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) AS organisation_id,
    (SELECT o.name FROM ljvis2.organisation o WHERE o.id = (SELECT d.organisation_id FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1)) AS organisation_name,
    (SELECT d.email FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) AS email,
    (SELECT d.phone FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) AS phone,
    (SELECT d.structural_unit FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) AS structural_unit_name,
    (SELECT d.job_title FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) AS job_title,
    (SELECT d.access_start FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) AS access_start,
    (SELECT d.access_end FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) AS access_end,
    (SELECT s.status FROM ljvis2.user_account_state s WHERE s.user_account_id = ua.id ORDER BY s.created_at DESC LIMIT 1) AS status
FROM ljvis2.user_account ua
WHERE ua.id = :id::BIGINT
  AND (COALESCE(:organisation_id, '') = '' OR (SELECT d.organisation_id FROM ljvis2.user_account_data_state d WHERE d.user_account_id = ua.id ORDER BY d.created_at DESC LIMIT 1) = :organisation_id::BIGINT)
LIMIT 1;
