/*
description: "Insert transport-interruption sub-form (autoveo katkestamise kontrollvorm) — first save. Free-text fields are uppercased server-side (LJVIS2-74 §4)."
namespace: control-forms
params:
  compoundFormKey:
    type: number
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
