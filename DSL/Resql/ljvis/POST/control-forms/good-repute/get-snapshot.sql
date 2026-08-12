/*
declaration:
  version: 0.1
  description: "Get a single good repute form snapshot by snapshot ID (for the read-only historical version view)"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
        description: "Snapshot ID (primary key)"
      - field: form_key
        type: string
        description: "Good repute form key"
  response:
    fields:
      - field: id
        type: string
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
