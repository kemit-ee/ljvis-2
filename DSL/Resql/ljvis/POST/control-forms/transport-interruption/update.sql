/*
declaration:
  version: 0.1
  description: "Update transport-interruption sub-form — appends a new snapshot row. sub_form_number and version are always read from the latest snapshot / computed server-side (never trusts client input); uq_kv_sub_form_number_version guards against duplicates."
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: key
        type: string
      - field: status
        type: string
      - field: headerText
        type: string
      - field: residenceCountry
        type: string
      - field: residenceRegion
        type: string
      - field: residenceCity
        type: string
      - field: residenceAddressLine
        type: string
      - field: residencePostalCode
        type: string
      - field: interruptionReason
        type: string
      - field: legalBases
        type: string
      - field: terminationCondition
        type: string
      - field: personApplications
        type: string
      - field: created_by
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: subFormNumber
        type: string
      - field: version
        type: number
*/
WITH latest AS (
  SELECT sub_form_number, version + 1 AS version
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
