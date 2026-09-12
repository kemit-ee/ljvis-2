/*
description: "List incoming and outgoing NU messages with filters and pagination."
namespace: erru
params:
  businessCaseId:
    type: string
    required: false
  dateFrom:
    type: string
    required: false
  dateUntil:
    type: string
    required: false
  country:
    type: string
    required: false
  tmFirstName:
    type: string
    required: false
  tmFamilyName:
    type: string
    required: false
  handlerPersonalCode:
    type: string
    required: false
  status:
    type: string
    required: false
  direction:
    type: string
    required: false
  sorting:
    type: string
    required: false
  page:
    type: string
    required: false
  page_size:
    type: string
    required: false
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
- name: message_date
  type: string
  nullable: true
- name: country_code
  type: string
  nullable: true
- name: tm_first_name
  type: string
  nullable: true
- name: tm_family_name
  type: string
  nullable: true
- name: handler_name
  type: string
  nullable: true
- name: total
  type: number
  nullable: true
*/
WITH latest AS (
  SELECT DISTINCT ON (nu_message_key)
    nu_message_key,
    version,
    direction,
    status,
    business_case_id,
    CASE WHEN direction = 'outgoing' THEN sent_at ELSE received_at END AS message_date,
    CASE WHEN direction = 'outgoing' THEN nu_to ELSE nu_from END AS country_code,
    tm_first_name,
    tm_family_name,
    handler_personal_code,
    handler_name
  FROM erru.nu_message
  ORDER BY nu_message_key, created_at DESC, id DESC
)
SELECT
  l.nu_message_key AS id,
  l.version,
  l.direction,
  l.status,
  l.business_case_id,
  l.message_date,
  l.country_code,
  l.tm_first_name,
  l.tm_family_name,
  l.handler_name,
  (COUNT(*) OVER ())::INTEGER AS total
FROM latest l
WHERE (COALESCE(:businessCaseId, '') = '' OR l.business_case_id ILIKE '%' || :businessCaseId || '%')
  AND (COALESCE(:dateFrom, '') = '' OR l.message_date >= (:dateFrom)::DATE)
  AND (COALESCE(:dateUntil, '') = '' OR l.message_date < ((:dateUntil)::DATE + INTERVAL '1 day'))
  AND (COALESCE(:country, '') = '' OR l.country_code = :country)
  AND (COALESCE(:tmFirstName, '') = '' OR l.tm_first_name ILIKE '%' || :tmFirstName || '%')
  AND (COALESCE(:tmFamilyName, '') = '' OR l.tm_family_name ILIKE '%' || :tmFamilyName || '%')
  AND (COALESCE(:handlerPersonalCode, '') = '' OR l.handler_personal_code = :handlerPersonalCode)
  AND (COALESCE(:status, '') = '' OR l.status = :status)
  AND (COALESCE(:direction, '') = '' OR l.direction = :direction)
ORDER BY
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'business_case_id asc'  THEN l.business_case_id END ASC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'business_case_id desc' THEN l.business_case_id END DESC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'direction asc'        THEN l.direction END ASC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'direction desc'       THEN l.direction END DESC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'message_date asc'     THEN l.message_date END ASC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'message_date desc'    THEN l.message_date END DESC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'country_code asc'     THEN l.country_code END ASC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'country_code desc'    THEN l.country_code END DESC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'tm_first_name asc'    THEN l.tm_first_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'tm_first_name desc'   THEN l.tm_first_name COLLATE "et-EE-x-icu" END DESC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'tm_family_name asc'   THEN l.tm_family_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'tm_family_name desc'  THEN l.tm_family_name COLLATE "et-EE-x-icu" END DESC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'handler_name asc'     THEN l.handler_name COLLATE "et-EE-x-icu" END ASC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'handler_name desc'    THEN l.handler_name COLLATE "et-EE-x-icu" END DESC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'status asc'           THEN l.status END ASC,
  CASE WHEN COALESCE(:sorting, 'message_date desc') = 'status desc'          THEN l.status END DESC,
  l.nu_message_key DESC
LIMIT  COALESCE(NULLIF(:page_size, ''), '20')::INTEGER
OFFSET ((GREATEST(COALESCE(NULLIF(:page, ''), '1')::INTEGER, 1) - 1) * COALESCE(NULLIF(:page_size, ''), '20')::INTEGER);
