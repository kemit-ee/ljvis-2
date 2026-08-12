/*
declaration:
  version: 0.1
  description: "Read one CGR request by its logical key (LJVIS2-138). Returns the LATEST snapshot only — current state is always the most recent row for cgr_request_key. Returns zero rows when the key does not exist, which the caller maps to 404. Columns are emitted in snake_case and serialised to camelCase by Resql; member_states is cast to text so the JSONB document is passed through verbatim."
  method: post
  accepts: json
  returns: json
  namespace: erru
  allowlist:
    body:
      - field: id
        type: string
        description: "CGR request logical key (cgr_request_key)"
  response:
    fields:
      - field: id
        type: number
      - field: version
        type: number
      - field: direction
        type: string
      - field: status
        type: string
      - field: business_case_id
        type: string
      - field: technical_id
        type: string
      - field: workflow_id
        type: string
      - field: sent_at
        type: string
      - field: cgr_from
        type: string
      - field: cgr_to
        type: string
      - field: originating_authority
        type: string
      - field: request_source
        type: string
      - field: request_purpose
        type: string
      - field: tm_first_name
        type: string
      - field: tm_family_name
        type: string
      - field: tm_date_of_birth
        type: string
      - field: tm_place_of_birth
        type: string
      - field: tm_first_name_search_key
        type: string
      - field: tm_family_name_search_key
        type: string
      - field: certificate_number
        type: string
      - field: certificate_issue_date
        type: string
      - field: certificate_issue_country
        type: string
      - field: member_states
        type: string
      - field: handler_personal_code
        type: string
      - field: handler_name
        type: string
      - field: error_message
        type: string
      - field: created_at
        type: string
      - field: created_by
        type: string
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
