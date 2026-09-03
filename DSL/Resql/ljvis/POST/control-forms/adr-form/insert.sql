/*
declaration:
  version: 0.1
  description: "Insert ADR sub-form (ohtlik veos) — first save"
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
    :created_by
  )
  RETURNING adr_form_key, sub_form_number, version
)
SELECT adr_form_key AS id, sub_form_number, version FROM ins;
