/*
description: "Update transport-interruption sub-form — appends a new snapshot row. sub_form_number is always read from the latest snapshot; version is unchanged while the latest snapshot's status is 'saved' (repeat saves do not bump /V) and increments by 1 only when re-saving already-locked (confirmed/published) data."
namespace: control-forms
params:
  key:
    type: string
    required: false
  status:
    type: string
    required: false
  headerText:
    type: string
    required: false
  residenceCountry:
    type: string
    required: false
  residenceRegion:
    type: string
    required: false
  residenceCity:
    type: string
    required: false
  residenceAddressLine:
    type: string
    required: false
  residencePostalCode:
    type: string
    required: false
  interruptionReason:
    type: string
    required: false
  legalBases:
    type: string
    required: false
  terminationCondition:
    type: string
    required: false
  personApplications:
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
  - name: version
    type: number
    nullable: true
*/
WITH latest AS (
  SELECT sub_form_number,
         CASE WHEN status = 'saved' THEN version ELSE version + 1 END AS version
  FROM forms.kv_form
  WHERE kv_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
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
  :key::BIGINT,
  (SELECT compound_form_key FROM forms.kv_form WHERE kv_form_key = :key::BIGINT ORDER BY created_at DESC LIMIT 1),
  latest.sub_form_number,
  latest.version,
  :status,
  UPPER(NULLIF(:headerText, '')),
  COALESCE(NULLIF(:residenceCountry, ''), 'EE'),
  NULLIF(:residenceRegion, ''),
  NULLIF(:residenceCity, ''),
  UPPER(NULLIF(:residenceAddressLine, '')),
  NULLIF(:residencePostalCode, ''),
  UPPER(NULLIF(:interruptionReason, '')),
  COALESCE(NULLIF(:legalBases, '')::jsonb, '[]'::jsonb),
  COALESCE(UPPER(NULLIF(:terminationCondition, '')), 'KUNI VEO KATKESTAMISE ALUSE ÄRALANGEMISENI.'),
  UPPER(NULLIF(:personApplications, '')),
  :created_by
FROM latest
RETURNING kv_form_key AS id, sub_form_number, version;
