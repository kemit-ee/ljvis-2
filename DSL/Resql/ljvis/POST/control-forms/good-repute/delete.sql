/*
description: "Delete good-repute form — copy latest snapshot with status=deleted"
namespace: control-forms
params:
  id:
    type: string
    required: false
  status:
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
  SELECT DISTINCT ON (good_repute_form_key)
    good_repute_form_key,
    form_number,
    version,
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
    unfit_until_date
  FROM forms.good_repute_form
  WHERE good_repute_form_key = :id::BIGINT
  ORDER BY good_repute_form_key, created_at DESC
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
  l.good_repute_form_key,
  l.form_number,
  l.version,
  :status,
  l.personal_code,
  l.first_name,
  l.last_name,
  l.date_of_birth,
  l.place_of_birth,
  l.certificate_number,
  l.certificate_issue_date,
  l.certificate_country_code,
  l.fitness_status,
  l.unfit_from_date,
  l.unfit_until_date,
  :created_by
FROM latest l
RETURNING good_repute_form_key AS id, form_number, version;
