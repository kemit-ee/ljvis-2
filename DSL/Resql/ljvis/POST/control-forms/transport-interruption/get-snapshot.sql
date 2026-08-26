/*
description: "Get a single transport-interruption form snapshot by snapshot ID"
namespace: control-forms
params:
  id:
    type: string
    required: false
    description: "Snapshot ID (primary key)"
  form_key:
    type: string
    required: false
    description: "KV form key"
returns:
  - name: id
    type: string
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
  - name: headerText
    type: string
    nullable: true
  - name: residenceCountry
    type: string
    nullable: true
  - name: residenceRegion
    type: string
    nullable: true
  - name: residenceCity
    type: string
    nullable: true
  - name: residenceAddressLine
    type: string
    nullable: true
  - name: residencePostalCode
    type: string
    nullable: true
  - name: interruptionReason
    type: string
    nullable: true
  - name: legalBases
    type: string
    nullable: true
  - name: terminationCondition
    type: string
    nullable: true
  - name: personApplications
    type: string
    nullable: true
  - name: createdBy
    type: string
    nullable: true
*/
SELECT
  kv_form_key AS id,
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
  legal_bases::text,
  termination_condition,
  person_applications,
  created_by
FROM forms.kv_form
WHERE id = :id::BIGINT
  AND kv_form_key = :form_key::BIGINT;
