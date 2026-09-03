/*
declaration:
  version: 0.1
  description: "Update good repute form (hea maine vorm) — appends a new snapshot row. Per LJVIS2-136: version is unchanged while the latest snapshot's status is 'saved' (repeat saves, and the saved->confirmed transition, do not bump /V); version increments only when re-saving already-locked (confirmed) data."
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: key
        type: string
      - field: status
        type: string
      - field: personalCode
        type: string
      - field: firstName
        type: string
      - field: lastName
        type: string
      - field: dateOfBirth
        type: string
      - field: placeOfBirth
        type: string
      - field: certificateNumber
        type: string
      - field: certificateIssueDate
        type: string
      - field: certificateCountryCode
        type: string
      - field: fitnessStatus
        type: string
      - field: unfitFromDate
        type: string
      - field: unfitUntilDate
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: form_number
        type: string
      - field: version
        type: number
*/
WITH latest AS (
  SELECT form_number,
         CASE WHEN status = 'saved' OR :status <> status THEN version ELSE version + 1 END AS version
  FROM forms.good_repute_form
  WHERE good_repute_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO forms.good_repute_form (
  good_repute_form_key,
  form_number,
  version,
  status,
  personal_code,
  first_name,
  last_name,
  date_of_birth,
  place_of_birth,
  certificate_number,
  certificate_issue_date,
  certificate_country_code,
  fitness_status,
  unfit_from_date,
  unfit_until_date,
  created_by
)
SELECT
  :key::BIGINT,
  latest.form_number,
  latest.version,
  :status,
  UPPER(:personalCode),
  UPPER(:firstName),
  UPPER(:lastName),
  :dateOfBirth::DATE,
  UPPER(NULLIF(:placeOfBirth, '')),
  UPPER(:certificateNumber),
  :certificateIssueDate::DATE,
  :certificateCountryCode,
  :fitnessStatus,
  NULLIF(:unfitFromDate, '')::DATE,
  NULLIF(:unfitUntilDate, '')::DATE,
  :created_by
FROM latest
RETURNING good_repute_form_key AS id, form_number, version;
