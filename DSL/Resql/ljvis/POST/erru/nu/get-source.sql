/*
description: "Read the latest source and eligibility using the inclusive end date in Europe/Tallinn. Future starts are allowed."
namespace: erru
params:
  id:
    type: integer
    required: false
returns:
- name: id
  type: number
  nullable: true
- name: status
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
- name: eligible
  type: boolean
  nullable: false
*/
SELECT
  good_repute_form_key AS id,
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
  unfit_until_date,
  COALESCE(status = 'published' AND fitness_status = 'unfit'
    AND unfit_until_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Tallinn')::DATE, false) AS eligible
FROM forms.good_repute_form g
WHERE good_repute_form_key = :id::BIGINT
ORDER BY g.created_at DESC, g.id DESC
LIMIT 1;
