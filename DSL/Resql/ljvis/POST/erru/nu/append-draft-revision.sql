/*
description: "Append a revision of an editable NU draft, preserving its source."
namespace: erru
params:
  key:
    type: integer
    required: false
  nuTo:
    type: string
    required: false
  originatingAuthority:
    type: string
    required: false
  requestSource:
    type: string
    required: false
  requestPurpose:
    type: string
    required: false
  tmFirstName:
    type: string
    required: false
  tmFamilyName:
    type: string
    required: false
  tmDateOfBirth:
    type: string
    required: false
  tmPlaceOfBirth:
    type: string
    required: false
  certificateNumber:
    type: string
    required: false
  certificateIssueDate:
    type: string
    required: false
  certificateIssueCountry:
    type: string
    required: false
  unfitStartDate:
    type: string
    required: false
  created_by:
    type: string
    required: false
returns:
- name: id
  type: number
  nullable: true
- name: business_case_id
  type: string
  nullable: true
- name: version
  type: number
  nullable: true
- name: status
  type: string
  nullable: true
*/
WITH latest AS (
  SELECT *
  FROM erru.nu_message
  WHERE nu_message_key = :key::BIGINT
  ORDER BY created_at DESC, id DESC
  LIMIT 1
), ins AS (
  INSERT INTO erru.nu_message (
    nu_message_key,
    version,
    direction,
    status,
    business_case_id,
    nu_from,
    nu_to,
    originating_authority,
    request_source,
    request_purpose,
    source_good_repute_form_key,
    tm_first_name,
    tm_family_name,
    tm_date_of_birth,
    tm_place_of_birth,
    certificate_number,
    certificate_issue_date,
    certificate_issue_country,
    unfit_start_date,
    created_by
  )
  SELECT
    l.nu_message_key,
    l.version + 1,
    l.direction,
    'initiated',
    l.business_case_id,
    l.nu_from,
    COALESCE(NULLIF(:nuTo, ''), 'ZZ'),
    NULLIF(:originatingAuthority, ''),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
    l.source_good_repute_form_key,
    NULLIF(:tmFirstName, ''),
    NULLIF(:tmFamilyName, ''),
    NULLIF(:tmDateOfBirth, '')::DATE,
    NULLIF(:tmPlaceOfBirth, ''),
    NULLIF(:certificateNumber, ''),
    NULLIF(:certificateIssueDate, '')::DATE,
    NULLIF(:certificateIssueCountry, ''),
    NULLIF(:unfitStartDate, '')::DATE,
    :created_by
  FROM latest l
  WHERE l.status = 'initiated'
    AND l.direction = 'outgoing'
  RETURNING nu_message_key, business_case_id, version, status
)
SELECT nu_message_key AS id, business_case_id, version, status FROM ins;
