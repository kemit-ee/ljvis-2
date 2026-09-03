/*
declaration:
  version: 0.1
  description: "Get ADR sub-form by key (latest snapshot)"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
  response:
    fields:
      - field: id
        type: number
      - field: compoundFormKey
        type: number
      - field: subFormNumber
        type: string
      - field: version
        type: number
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
      - field: exemptionNotes
        type: string
      - field: containerTypes
        type: string
      - field: infringements
        type: string
      - field: otherInfringements
        type: string
      - field: drivingBanApplied
        type: boolean
      - field: transportInterruptionApplied
        type: boolean
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
      - field: enforcementDecision
        type: string
      - field: proceedingClosureBasis
        type: string
      - field: createdBy
        type: string
*/
SELECT
  adr_form_key AS id,
  compound_form_key,
  sub_form_number,
  version,
  status,
  driver_assistant::text,
  driver_adr_certificate_number,
  crew_adr_certificate_number,
  assistant_adr_certificate_number,
  last_load_address::text,
  last_load_date,
  next_load_address::text,
  dangerous_goods::text,
  exemption_applied,
  exemption_adr_provision,
  exemption_notes,
  container_types::text,
  infringements::text,
  other_infringements::text,
  driving_ban_applied,
  transport_interruption_applied,
  result_type,
  proceeding_type,
  proceeding_reference_number,
  corrective_measures::text,
  seal_opened,
  seal_opened_date,
  seal_installed_date,
  notes,
  enforcement_decision,
  proceeding_closure_basis,
  created_by
FROM forms.adr_form
WHERE adr_form_key = :id::BIGINT
ORDER BY created_at DESC
LIMIT 1;
