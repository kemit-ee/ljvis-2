/*
description: "Store incoming received and acknowledged snapshots atomically; ignore duplicate deliveries."
namespace: erru
params:
  technicalId:
    type: string
    required: false
  workflowId:
    type: string
    required: false
  sentAt:
    type: string
    required: false
  nuFrom:
    type: string
    required: false
  businessCaseId:
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
  tmFirstNameSearchKey:
    type: string
    required: false
  tmFamilyNameSearchKey:
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
WITH ins_received AS (
  INSERT INTO erru.nu_message (
    nu_message_key,
    version,
    direction,
    status,
    business_case_id,
    technical_id,
    workflow_id,
    sent_at,
    received_at,
    nu_from,
    nu_to,
    originating_authority,
    request_source,
    request_purpose,
    tm_first_name,
    tm_family_name,
    tm_date_of_birth,
    tm_place_of_birth,
    tm_first_name_search_key,
    tm_family_name_search_key,
    certificate_number,
    certificate_issue_date,
    certificate_issue_country,
    unfit_start_date,
    created_by
  )
  VALUES (
    nextval('erru.seq_nu_message_key'),
    1,
    'incoming',
    'received',
    :businessCaseId,
    NULLIF(:technicalId, '')::UUID,
    NULLIF(:workflowId, '')::UUID,
    NULLIF(:sentAt, '')::TIMESTAMPTZ,
    now(),
    NULLIF(:nuFrom, ''),
    'EE',
    NULLIF(:originatingAuthority, ''),
    NULLIF(:requestSource, ''),
    NULLIF(:requestPurpose, ''),
    NULLIF(:tmFirstName, ''),
    NULLIF(:tmFamilyName, ''),
    NULLIF(:tmDateOfBirth, '')::DATE,
    NULLIF(:tmPlaceOfBirth, ''),
    NULLIF(:tmFirstNameSearchKey, ''),
    NULLIF(:tmFamilyNameSearchKey, ''),
    NULLIF(:certificateNumber, ''),
    NULLIF(:certificateIssueDate, '')::DATE,
    NULLIF(:certificateIssueCountry, ''),
    NULLIF(:unfitStartDate, '')::DATE,
    :created_by
  )
  ON CONFLICT (technical_id) WHERE (direction = 'incoming' AND status = 'received')
  DO NOTHING
  RETURNING
    nu_message_key, business_case_id, technical_id, workflow_id, sent_at, received_at,
    nu_from, nu_to, originating_authority, request_source, request_purpose,
    tm_first_name, tm_family_name, tm_date_of_birth, tm_place_of_birth,
    tm_first_name_search_key, tm_family_name_search_key,
    certificate_number, certificate_issue_date, certificate_issue_country, unfit_start_date
), ins_acknowledged AS (
  INSERT INTO erru.nu_message (
    nu_message_key,
    version,
    direction,
    status,
    business_case_id,
    technical_id,
    workflow_id,
    sent_at,
    received_at,
    nu_from,
    nu_to,
    originating_authority,
    request_source,
    request_purpose,
    tm_first_name,
    tm_family_name,
    tm_date_of_birth,
    tm_place_of_birth,
    tm_first_name_search_key,
    tm_family_name_search_key,
    certificate_number,
    certificate_issue_date,
    certificate_issue_country,
    unfit_start_date,
    created_by
  )
  SELECT
    r.nu_message_key,
    2,
    'incoming',
    'acknowledged',
    r.business_case_id,
    r.technical_id,
    r.workflow_id,
    r.sent_at,
    r.received_at,
    r.nu_from,
    r.nu_to,
    r.originating_authority,
    r.request_source,
    r.request_purpose,
    r.tm_first_name,
    r.tm_family_name,
    r.tm_date_of_birth,
    r.tm_place_of_birth,
    r.tm_first_name_search_key,
    r.tm_family_name_search_key,
    r.certificate_number,
    r.certificate_issue_date,
    r.certificate_issue_country,
    r.unfit_start_date,
    :created_by
  FROM ins_received r
  RETURNING nu_message_key, business_case_id, version, status
)
SELECT nu_message_key AS id, business_case_id, version, status FROM ins_acknowledged;
