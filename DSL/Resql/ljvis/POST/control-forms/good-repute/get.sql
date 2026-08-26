/*
description: "Get good repute form (hea maine vorm) by key — latest snapshot"
namespace: control-forms
params:
  id:
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
  - name: status
    type: string
    nullable: true
  - name: personal_code
    type: string
    nullable: true
  - name: first_name
    type: string
    nullable: true
  - name: last_name
    type: string
    nullable: true
  - name: date_of_birth
    type: string
    nullable: true
  - name: place_of_birth
    type: string
    nullable: true
  - name: certificate_number
    type: string
    nullable: true
  - name: certificate_issue_date
    type: string
    nullable: true
  - name: certificate_country_code
    type: string
    nullable: true
  - name: fitness_status
    type: string
    nullable: true
  - name: unfit_from_date
    type: string
    nullable: true
  - name: unfit_until_date
    type: string
    nullable: true
  - name: created_by
    type: string
    nullable: true
*/
SELECT
  good_repute_form_key AS id,
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
FROM forms.good_repute_form
WHERE good_repute_form_key = :id::BIGINT
ORDER BY created_at DESC
LIMIT 1;
