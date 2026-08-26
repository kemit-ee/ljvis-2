/*
description: "Delete transport-interruption sub-form — copy latest snapshot with status=deleted"
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
  - name: subFormNumber
    type: string
    nullable: true
*/
WITH latest AS (
  SELECT DISTINCT ON (kv_form_key)
    kv_form_key,
    compound_form_key,
    sub_form_number,
    version,
    header_text,
    residence_country,
    residence_region,
    residence_city,
    residence_address_line,
    residence_postal_code,
    interruption_reason,
    legal_bases,
    termination_condition,
    person_applications
  FROM forms.kv_form
  WHERE kv_form_key = :id::BIGINT
  ORDER BY kv_form_key, created_at DESC
)
INSERT INTO forms.kv_form (
  kv_form_key,
  compound_form_key,
  sub_form_number,
  version,
  status,
  header_text,
  residence_country,
  residence_region,
  residence_city,
  residence_address_line,
  residence_postal_code,
  interruption_reason,
  legal_bases,
  termination_condition,
  person_applications,
  created_by
)
SELECT
  l.kv_form_key,
  l.compound_form_key,
  l.sub_form_number,
  l.version,
  :status,
  l.header_text,
  l.residence_country,
  l.residence_region,
  l.residence_city,
  l.residence_address_line,
  l.residence_postal_code,
  l.interruption_reason,
  l.legal_bases,
  l.termination_condition,
  l.person_applications,
  :created_by
FROM latest l
RETURNING kv_form_key AS id, sub_form_number;
