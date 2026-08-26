/*
declaration:
  version: 0.1
  description: "Insert good repute form (hea maine vorm) — first save"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
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
WITH ins AS (
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
  VALUES (
    nextval('forms.seq_good_repute_form_key'),
    'mv-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(currval('forms.seq_good_repute_form_key')::text, 5, '0'),
    1,
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
  )
  RETURNING good_repute_form_key, form_number, version
)
SELECT good_repute_form_key AS id, form_number, version FROM ins;
