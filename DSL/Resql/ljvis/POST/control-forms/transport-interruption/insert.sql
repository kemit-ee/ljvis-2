/*
declaration:
  version: 0.1
  description: "Insert transport-interruption sub-form (autoveo katkestamise kontrollvorm) — first save. Free-text fields are uppercased server-side (LJVIS2-74 §4)."
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: compoundFormKey
        type: number
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
WITH ins AS (
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
  VALUES (
    nextval('forms.seq_kv_form_key'),
    :compoundFormKey::BIGINT,
    'ko-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(currval('forms.seq_kv_form_key')::text, 5, '0'),
    1,
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
  )
  RETURNING kv_form_key, sub_form_number, version
)
SELECT kv_form_key AS id, sub_form_number, version FROM ins;
