/*
description: "Get ADR sub-form by key (latest snapshot)"
namespace: control-forms
params:
  id:
    type: string
    required: false
returns:
  - name: id
    type: number
    nullable: true
  - name: compoundFormKey
    type: number
    nullable: true
  - name: subFormNumber
    type: string
    nullable: true
  - name: version
    type: number
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: driverAssistant
    type: string
    nullable: true
  - name: driverAdrCertificateNumber
    type: string
    nullable: true
  - name: crewAdrCertificateNumber
    type: string
    nullable: true
  - name: assistantAdrCertificateNumber
    type: string
    nullable: true
  - name: lastLoadAddress
    type: string
    nullable: true
  - name: lastLoadDate
    type: string
    nullable: true
  - name: nextLoadAddress
    type: string
    nullable: true
  - name: dangerousGoods
    type: string
    nullable: true
  - name: exemptionApplied
    type: boolean
    nullable: true
  - name: exemptionAdrProvision
    type: string
    nullable: true
  - name: containerType
    type: string
    nullable: true
  - name: infringements
    type: string
    nullable: true
  - name: otherViolations
    type: string
    nullable: true
  - name: resultType
    type: string
    nullable: true
  - name: proceedingType
    type: string
    nullable: true
  - name: proceedingReferenceNumber
    type: string
    nullable: true
  - name: correctiveMeasures
    type: string
    nullable: true
  - name: sealOpened
    type: boolean
    nullable: true
  - name: sealOpenedDate
    type: string
    nullable: true
  - name: sealInstalledDate
    type: string
    nullable: true
  - name: notes
    type: string
    nullable: true
  - name: enforcementDecision
    type: string
    nullable: true
  - name: proceedingClosureBasis
    type: string
    nullable: true
  - name: createdBy
    type: string
    nullable: true
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
  container_type,
  infringements::text,
  other_violations,
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
