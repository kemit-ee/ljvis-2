/*
description: "Create an outgoing NU draft with identity data from its source declaration."
namespace: erru
params:
  sourceGoodReputeFormKey:
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
WITH ins AS (
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
  VALUES (
    nextval('erru.seq_nu_message_key'),
    1,
    'outgoing',
    'initiated',
    'NU-EE-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('erru.seq_nu_business_case_no')::text, 5, '0'),
    'EE',
    COALESCE(NULLIF(:nuTo, ''), 'ZZ'),
    NULLIF(:originatingAuthority, ''),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
    :sourceGoodReputeFormKey::BIGINT,
    NULLIF(:tmFirstName, ''),
    NULLIF(:tmFamilyName, ''),
    NULLIF(:tmDateOfBirth, '')::DATE,
    NULLIF(:tmPlaceOfBirth, ''),
    NULLIF(:certificateNumber, ''),
    NULLIF(:certificateIssueDate, '')::DATE,
    NULLIF(:certificateIssueCountry, ''),
    NULLIF(:unfitStartDate, '')::DATE,
    :created_by
  )
  RETURNING nu_message_key, business_case_id, version, status
)
SELECT nu_message_key AS id, business_case_id, version, status FROM ins;
