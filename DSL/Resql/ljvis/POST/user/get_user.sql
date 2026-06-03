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
SELECT
    ual.user_account_id AS id,
    ual.first_name,
    ual.last_name,
    ual.personal_code,
    ual.organisation_id,
    (SELECT o.name FROM ljvis2.organisation o WHERE o.id = ual.organisation_id) AS organisation_name,
    ual.email,
    ual.phone,
    ual.structural_unit,
    ual.job_title,
    ual.access_start,
    ual.access_end,
    ual.status
FROM ljvis2.user_account_latest ual
WHERE ual.user_account_id = :id::BIGINT
  AND (COALESCE(:organisation_id, '') = '' OR ual.organisation_id = :organisation_id::BIGINT)
  AND ual.id = (
    SELECT MAX(id) FROM ljvis2.user_account_latest WHERE user_account_id = :id::BIGINT
  );
