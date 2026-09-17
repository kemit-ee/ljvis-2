/*
description: 'Haldus > eToimiku X-tee logid: eToimiku AnnaIsikuKvalifikatsioonid
  integratsioonipäringute logi (xroad.xroad_integration_log, service_code
  ''etoimik.%''). Filtrid: date_from/date_to (created_at, poolavatud
  intervall nagu list_outbound_log.sql-is), ja kolm sõltumatut
  include_found/include_not_found/include_error lippu (checkbox-grupi
  filter, mitte massiiv-parameeter — Resql-is puudub sellele siiani
  eeskuju). Kolme lipu OR-kombinatsioon; kui kõik kolm on false, ei tagasta
  midagi. Leheküljed: page + page_size. total sisaldab filtreerimata
  koguarvu (samas date-range piires, ilma staatusfiltrita rakendamata).
  xroad.log.read õiguse kontroll on Ruuter DSL-i tasemel.'
namespace: xroad
params:
  date_from:
    type: string
    required: false
  date_to:
    type: string
    required: false
  include_found:
    type: boolean
    required: false
  include_not_found:
    type: boolean
    required: false
  include_error:
    type: boolean
    required: false
  page:
    type: integer
    required: false
  page_size:
    type: integer
    required: false
returns:
- name: id
  type: string
  nullable: true
- name: service_code
  type: string
  nullable: true
- name: request_xml
  type: string
  nullable: true
- name: response_xml
  type: string
  nullable: true
- name: duration_ms
  type: number
  nullable: true
- name: success
  type: boolean
  nullable: true
- name: error_message
  type: string
  nullable: true
- name: result_status
  type: string
  nullable: true
- name: person_identifier
  type: string
  nullable: true
- name: source_type
  type: string
  nullable: true
- name: source_record_id
  type: string
  nullable: true
- name: created_at
  type: string
  nullable: true
- name: total
  type: number
  nullable: true
*/
SELECT
    id,
    service_code,
    request_xml,
    response_xml,
    duration_ms,
    success,
    error_message,
    result_status,
    person_identifier,
    source_type,
    source_record_id,
    created_at,
    (COUNT(*) OVER ())::INTEGER AS total
FROM xroad.xroad_integration_log
WHERE service_code LIKE 'etoimik.%'
  AND created_at >= COALESCE(NULLIF(:date_from, '')::TIMESTAMPTZ, '-infinity'::TIMESTAMPTZ)
  AND created_at <  COALESCE(NULLIF(:date_to, '')::TIMESTAMPTZ + INTERVAL '1 day', 'infinity'::TIMESTAMPTZ)
  AND (
    (COALESCE(:include_found::BOOLEAN, false)     AND result_status = 'found')
    OR (COALESCE(:include_not_found::BOOLEAN, false) AND result_status = 'not_found')
    OR (COALESCE(:include_error::BOOLEAN, false)     AND result_status = 'error')
  )
ORDER BY created_at DESC
LIMIT  COALESCE(NULLIF(:page_size::TEXT, ''), '20')::INTEGER
OFFSET ((GREATEST(COALESCE(NULLIF(:page::TEXT, ''), '1')::INTEGER, 1) - 1)
         * COALESCE(NULLIF(:page_size::TEXT, ''), '20')::INTEGER);
