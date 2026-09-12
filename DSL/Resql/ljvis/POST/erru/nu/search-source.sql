/*
description: "Find eligible declarations by full name and birth date, or certificate number."
namespace: erru
params:
  firstName:
    type: string
    required: false
  lastName:
    type: string
    required: false
  dateOfBirth:
    type: string
    required: false
  certificateNumber:
    type: string
    required: false
returns:
- name: snapshot_id
  type: number
  nullable: false
- name: id
  type: number
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
- name: unfit_from_date
  type: string
  nullable: true
- name: unfit_until_date
  type: string
  nullable: true
*/
WITH latest AS (
  SELECT DISTINCT ON (good_repute_form_key)
    id AS snapshot_id,
    good_repute_form_key,
    status,
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
  ORDER BY good_repute_form_key, created_at DESC, id DESC
)
SELECT
  good_repute_form_key AS id,
  snapshot_id,
  first_name,
  last_name,
  date_of_birth,
  place_of_birth,
  certificate_number,
  certificate_issue_date,
  certificate_country_code,
  unfit_from_date,
  unfit_until_date
FROM latest
WHERE status = 'published'
  AND fitness_status = 'unfit'
  AND unfit_until_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Tallinn')::DATE
  AND (
    (
      NULLIF(:firstName, '') IS NOT NULL
      AND NULLIF(:lastName, '') IS NOT NULL
      AND NULLIF(:dateOfBirth, '') IS NOT NULL
      AND UPPER(first_name) = UPPER(:firstName)
      AND UPPER(last_name) = UPPER(:lastName)
      AND date_of_birth = (:dateOfBirth)::DATE
    )
    OR
    (
      NULLIF(:certificateNumber, '') IS NOT NULL
      AND UPPER(certificate_number) = UPPER(:certificateNumber)
    )
  )
ORDER BY last_name COLLATE "et-EE-x-icu", first_name COLLATE "et-EE-x-icu"
LIMIT 50;
