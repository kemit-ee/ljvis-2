/*
description: "Read one CGR request by its logical key (LJVIS2-138). Returns the LATEST snapshot only — current state is always the most recent row for cgr_request_key. Returns zero rows when the key does not exist, which the caller maps to 404. Columns are emitted in snake_case and serialised to camelCase by Resql; member_states is cast to text so the JSONB document is passed through verbatim."
namespace: erru
params:
  id:
    type: number
    required: false
    description: "CGR request logical key (cgr_request_key)"
returns:
  - name: id
    type: number
    nullable: true
  - name: version
    type: number
    nullable: true
  - name: direction
    type: string
    nullable: true
  - name: status
    type: string
    nullable: true
  - name: business_case_id
    type: string
    nullable: true
  - name: technical_id
    type: string
    nullable: true
  - name: workflow_id
    type: string
    nullable: true
  - name: sent_at
    type: string
    nullable: true
  - name: cgr_from
    type: string
    nullable: true
  - name: cgr_to
    type: string
    nullable: true
  - name: originating_authority
    type: string
    nullable: true
  - name: request_source
    type: string
    nullable: true
  - name: request_purpose
    type: string
    nullable: true
  - name: tm_first_name
    type: string
    nullable: true
  - name: tm_family_name
    type: string
    nullable: true
  - name: tm_date_of_birth
    type: string
    nullable: true
  - name: tm_place_of_birth
    type: string
    nullable: true
  - name: tm_first_name_search_key
    type: string
    nullable: true
  - name: tm_family_name_search_key
    type: string
    nullable: true
  - name: certificate_number
    type: string
    nullable: true
  - name: certificate_issue_date
    type: string
    nullable: true
  - name: certificate_issue_country
    type: string
    nullable: true
  - name: member_states
    type: string
    nullable: true
  - name: handler_personal_code
    type: string
    nullable: true
  - name: handler_name
    type: string
    nullable: true
  - name: error_message
    type: string
    nullable: true
  - name: created_at
    type: string
    nullable: true
  - name: created_by
    type: string
    nullable: true
*/
SELECT
  cgr_request_key AS id,
  version,
  direction,
  status,
  business_case_id,
  technical_id,
  workflow_id,
  sent_at,
  cgr_from,
  cgr_to,
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
  member_states::text,
  handler_personal_code,
  handler_name,
  error_message,
  created_at,
  created_by
FROM erru.cgr_request
WHERE cgr_request_key = :id::BIGINT
ORDER BY created_at DESC
LIMIT 1;
