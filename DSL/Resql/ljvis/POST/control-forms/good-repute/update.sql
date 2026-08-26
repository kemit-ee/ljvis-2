/*
description: "Update good repute form (hea maine vorm) — appends a new snapshot row. Per LJVIS2-136: version is unchanged while the latest snapshot's status is 'saved' (repeat saves, and the saved->confirmed transition, do not bump /V); version increments only when re-saving already-locked (confirmed) data."
namespace: control-forms
params:
  key:
    type: string
    required: false
  status:
    type: string
    required: false
  personalCode:
    type: string
    required: false
  firstName:
    type: string
    required: false
  lastName:
    type: string
    required: false
  dateOfBirth:
    type: string
    required: false
  placeOfBirth:
    type: string
    required: false
  certificateNumber:
    type: string
    required: false
  certificateIssueDate:
    type: string
    required: false
  certificateCountryCode:
    type: string
    required: false
  fitnessStatus:
    type: string
    required: false
  unfitFromDate:
    type: string
    required: false
  unfitUntilDate:
    type: string
    required: false
  created_by:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
  - name: form_number
    type: string
    nullable: true
  - name: version
    type: number
    nullable: true
*/
WITH latest AS (
  SELECT form_number,
         CASE WHEN status = 'saved' THEN version ELSE version + 1 END AS version
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
