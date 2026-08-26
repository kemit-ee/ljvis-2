/*
declaration:
  version: 0.1
  description: "Get a single transport-interruption form snapshot by snapshot ID"
  method: post
  accepts: json
  returns: json
  namespace: control-forms
  allowlist:
    body:
      - field: id
        type: string
        description: "Snapshot ID (primary key)"
      - field: form_key
        type: string
        description: "KV form key"
  response:
    fields:
      - field: id
        type: string
      - field: subFormNumber
        type: string
      - field: version
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
      - field: createdBy
        type: string
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
