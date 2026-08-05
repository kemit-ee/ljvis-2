/*
declaration:
  version: 0.1
  description: "Update ADR sub-form — appends a new snapshot row. sub_form_number is always read from the latest snapshot; version is unchanged while the latest snapshot's status is 'saved' (repeat saves do not bump /V) and increments by 1 only when re-saving already-locked (confirmed/published) data. Carries X-tee fields forward from the latest snapshot."
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
      - field: driverAssistant
        type: string
      - field: driverAdrCertificateNumber
        type: string
      - field: crewAdrCertificateNumber
        type: string
      - field: assistantAdrCertificateNumber
        type: string
      - field: lastLoadAddress
        type: string
      - field: lastLoadDate
        type: string
      - field: nextLoadAddress
        type: string
      - field: dangerousGoods
        type: string
      - field: exemptionApplied
        type: boolean
      - field: exemptionAdrProvision
        type: string
      - field: containerType
        type: string
      - field: infringements
        type: string
      - field: otherViolations
        type: string
      - field: resultType
        type: string
      - field: proceedingType
        type: string
      - field: proceedingReferenceNumber
        type: string
      - field: correctiveMeasures
        type: string
      - field: sealOpened
        type: boolean
      - field: sealOpenedDate
        type: string
      - field: sealInstalledDate
        type: string
      - field: notes
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
