/*
description: "Insert good repute form (hea maine vorm) — first save"
namespace: control-forms
params:
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
