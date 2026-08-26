/*
description: "Get a single good repute form snapshot by snapshot ID (for the read-only historical version view)"
namespace: control-forms
params:
  id:
    type: string
    required: false
    description: "Snapshot ID (primary key)"
  form_key:
    type: string
    required: false
    description: "Good repute form key"
returns:
  - name: id
    type: string
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
  id,
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
WHERE id = :id::BIGINT
  AND good_repute_form_key = :form_key::BIGINT;
