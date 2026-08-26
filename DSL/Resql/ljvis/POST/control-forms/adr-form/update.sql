/*
description: "Update ADR sub-form — appends a new snapshot row. sub_form_number is always read from the latest snapshot; version is unchanged while the latest snapshot's status is 'saved' (repeat saves do not bump /V) and increments by 1 only when re-saving already-locked (confirmed/published) data. Carries X-tee fields forward from the latest snapshot."
namespace: control-forms
params:
  key:
    type: string
    required: false
  status:
    type: string
    required: false
  driverAssistant:
    type: string
    required: false
  driverAdrCertificateNumber:
    type: string
    required: false
  crewAdrCertificateNumber:
    type: string
    required: false
  assistantAdrCertificateNumber:
    type: string
    required: false
  lastLoadAddress:
    type: string
    required: false
  lastLoadDate:
    type: string
    required: false
  nextLoadAddress:
    type: string
    required: false
  dangerousGoods:
    type: string
    required: false
  exemptionApplied:
    type: boolean
    required: false
  exemptionAdrProvision:
    type: string
    required: false
  containerType:
    type: string
    required: false
  infringements:
    type: string
    required: false
  otherViolations:
    type: string
    required: false
  resultType:
    type: string
    required: false
  proceedingType:
    type: string
    required: false
  proceedingReferenceNumber:
    type: string
    required: false
  correctiveMeasures:
    type: string
    required: false
  sealOpened:
    type: boolean
    required: false
  sealOpenedDate:
    type: string
    required: false
  sealInstalledDate:
    type: string
    required: false
  notes:
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
  SELECT compound_form_key, sub_form_number,
         CASE WHEN status = 'saved' THEN version ELSE version + 1 END AS version,
         enforcement_decision, proceeding_closure_basis
  FROM forms.adr_form
  WHERE adr_form_key = :key::BIGINT
  ORDER BY created_at DESC
  LIMIT 1
)
INSERT INTO forms.adr_form (
  adr_form_key,
  compound_form_key,
  sub_form_number,
  version,
  status,
  driver_assistant,
  driver_adr_certificate_number,
  crew_adr_certificate_number,
  assistant_adr_certificate_number,
  last_load_address,
  last_load_date,
  next_load_address,
  dangerous_goods,
  exemption_applied,
  exemption_adr_provision,
  container_type,
  infringements,
  other_violations,
  result_type,
  proceeding_type,
  proceeding_reference_number,
  corrective_measures,
  seal_opened,
  seal_opened_date,
  seal_installed_date,
  notes,
  enforcement_decision,
  proceeding_closure_basis,
  created_by
)
SELECT
  :key::BIGINT,
  latest.compound_form_key,
  latest.sub_form_number,
  latest.version,
  :status,
  NULLIF(:driverAssistant, '')::jsonb,
  NULLIF(:driverAdrCertificateNumber, ''),
  NULLIF(:crewAdrCertificateNumber, ''),
  NULLIF(:assistantAdrCertificateNumber, ''),
  NULLIF(:lastLoadAddress, '')::jsonb,
  NULLIF(:lastLoadDate, '')::DATE,
  NULLIF(:nextLoadAddress, '')::jsonb,
  COALESCE(NULLIF(:dangerousGoods, '')::jsonb, '[]'::jsonb),
  COALESCE(:exemptionApplied::BOOLEAN, FALSE),
  NULLIF(:exemptionAdrProvision, ''),
  NULLIF(:containerType, ''),
  COALESCE(NULLIF(:infringements, '')::jsonb, '[]'::jsonb),
  NULLIF(:otherViolations, ''),
  COALESCE(NULLIF(:resultType, ''), 'ok'),
  NULLIF(:proceedingType, ''),
  NULLIF(:proceedingReferenceNumber, ''),
  COALESCE(NULLIF(:correctiveMeasures, '')::jsonb, '[]'::jsonb),
  COALESCE(:sealOpened::BOOLEAN, FALSE),
  NULLIF(:sealOpenedDate, '')::DATE,
  NULLIF(:sealInstalledDate, '')::DATE,
  NULLIF(:notes, ''),
  latest.enforcement_decision,
  latest.proceeding_closure_basis,
  :created_by
FROM latest
RETURNING adr_form_key AS id, sub_form_number, version;
