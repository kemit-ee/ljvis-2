/*
declaration:
  version: 0.1
  description: "Get good repute form (hea maine vorm) by key — latest snapshot"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: form_number
        type: string
      - field: version
        type: number
      - field: status
        type: string
      - field: personal_code
        type: string
      - field: first_name
        type: string
      - field: last_name
        type: string
      - field: date_of_birth
        type: string
      - field: place_of_birth
        type: string
      - field: certificate_number
        type: string
      - field: certificate_issue_date
        type: string
      - field: certificate_country_code
        type: string
      - field: fitness_status
        type: string
      - field: unfit_from_date
        type: string
      - field: unfit_until_date
        type: string
      - field: created_by
        type: string
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
