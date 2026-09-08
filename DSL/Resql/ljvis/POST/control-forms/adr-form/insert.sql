/*
description: Insert ADR sub-form (ohtlik veos) — first save
namespace: control-forms
params:
  compoundFormKey:
    type: number
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
  exemptionNotes:
    type: string
    required: false
  containerTypes:
    type: string
    required: false
  infringements:
    type: string
    required: false
  otherInfringements:
    type: string
    required: false
  drivingBanApplied:
    type: boolean
    required: false
  transportInterruptionApplied:
    type: boolean
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
  infringementNotesSummary:
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
    exemption_notes,
    container_types,
    infringements,
    other_infringements,
    driving_ban_applied,
    transport_interruption_applied,
    result_type,
    proceeding_type,
    proceeding_reference_number,
    corrective_measures,
    seal_opened,
    seal_opened_date,
    seal_installed_date,
    notes,
    infringement_notes_summary,
    created_by
  )
  VALUES (
    nextval('forms.seq_adr_form_key'),
    :compoundFormKey::BIGINT,
    'ov-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(currval('forms.seq_adr_form_key')::text, 5, '0'),
    1,
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
    NULLIF(:exemptionNotes, ''),
    COALESCE(NULLIF(:containerTypes, '')::jsonb, '[]'::jsonb),
    COALESCE(NULLIF(:infringements, '')::jsonb, '[]'::jsonb),
    COALESCE(NULLIF(:otherInfringements, '')::jsonb, '[]'::jsonb),
    COALESCE(:drivingBanApplied::BOOLEAN, FALSE),
    COALESCE(:transportInterruptionApplied::BOOLEAN, FALSE),
    COALESCE(NULLIF(:resultType, ''), 'ok'),
    NULLIF(:proceedingType, ''),
    NULLIF(:proceedingReferenceNumber, ''),
    COALESCE(NULLIF(:correctiveMeasures, '')::jsonb, '[]'::jsonb),
    COALESCE(:sealOpened::BOOLEAN, FALSE),
    NULLIF(:sealOpenedDate, '')::DATE,
    NULLIF(:sealInstalledDate, '')::DATE,
    NULLIF(:notes, ''),
    NULLIF(:infringementNotesSummary, ''),
    :created_by
  )
  RETURNING adr_form_key, sub_form_number, version
)
SELECT adr_form_key AS id, sub_form_number, version FROM ins;
