/*
description: 'Haldus > eToimiku X-tee logid: eToimiku AnnaIsikuKvalifikatsioonid
  integratsioonipäringute logi (xroad.xroad_integration_log, service_code
  ''etoimik.%''). Filtrid: date_from/date_to (created_at, poolavatud
  intervall nagu list_outbound_log.sql-is), ja kolm sõltumatut
  include_found/include_not_found/include_error lippu (checkbox-grupi
  filter, mitte massiiv-parameeter - Resql-is puudub sellele siiani
  eeskuju). Kolme lipu OR-kombinatsioon; kui kõik kolm on false, ei tagasta
  midagi. all_services=true eemaldab nii service_code ''etoimik.%'' filtri
  kui ka staatusfiltri (teised allikad, nt erru_cgr, ei täida result_status''i
  üldse, seega found/not_found/error semantika neile ei kehti). Leheküljed:
  page + page_size. total sisaldab filtreerimata koguarvu (samas date-range
  piires, ilma staatusfiltrita rakendamata). xroad.log.read õiguse kontroll
  on Ruuter DSL-i tasemel.'
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
  all_services:
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
- name: form_number
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
    CASE
      WHEN source_record_id !~ '^[0-9]+$' THEN NULL
      WHEN source_type = 'compound_form' THEN (
        SELECT f.form_number || '/' || f.version FROM forms.compound_form f
        WHERE f.compound_form_key = source_record_id::BIGINT
        ORDER BY f.created_at DESC LIMIT 1)
      WHEN source_type = 'labour_inspection_form' THEN (
        SELECT f.form_number || '/' || f.version FROM forms.labour_inspection_form f
        WHERE f.labour_inspection_form_key = source_record_id::BIGINT
        ORDER BY f.created_at DESC LIMIT 1)
      WHEN source_type = 'vehicle_technical_form' THEN (
        SELECT f.sub_form_number || '/' || f.version FROM forms.vehicle_technical_form f
        WHERE f.vehicle_technical_form_key = source_record_id::BIGINT
        ORDER BY f.created_at DESC LIMIT 1)
      WHEN source_type = 'trailer_technical_form' THEN (
        SELECT f.sub_form_number || '/' || f.version FROM forms.trailer_technical_form f
        WHERE f.trailer_technical_form_key = source_record_id::BIGINT
        ORDER BY f.created_at DESC LIMIT 1)
      WHEN source_type = 'sp_driver_form' THEN (
        SELECT f.sub_form_number || '/' || f.version FROM forms.sp_driver_form f
        WHERE f.sp_driver_form_key = source_record_id::BIGINT
        ORDER BY f.created_at DESC LIMIT 1)
      WHEN source_type = 'sp_teammate_form' THEN (
        SELECT f.sub_form_number || '/' || f.version FROM forms.sp_teammate_form f
        WHERE f.sp_teammate_form_key = source_record_id::BIGINT
        ORDER BY f.created_at DESC LIMIT 1)
      WHEN source_type = 'tram_control_card' THEN (
        SELECT f.form_number || '/' || f.version FROM forms.tram_control_card f
        WHERE f.tram_control_card_key = source_record_id::BIGINT
        ORDER BY f.created_at DESC LIMIT 1)
    END AS form_number,
    (COUNT(*) OVER ())::INTEGER AS total
FROM xroad.xroad_integration_log
WHERE (COALESCE(:all_services::BOOLEAN, false) OR service_code LIKE 'etoimik.%')
  AND created_at >= COALESCE(NULLIF(:date_from, '')::TIMESTAMPTZ, '-infinity'::TIMESTAMPTZ)
  AND created_at <  COALESCE(NULLIF(:date_to, '')::TIMESTAMPTZ + INTERVAL '1 day', 'infinity'::TIMESTAMPTZ)
  AND (
    COALESCE(:all_services::BOOLEAN, false)
    OR (
      (COALESCE(:include_found::BOOLEAN, false)     AND result_status = 'found')
      OR (COALESCE(:include_not_found::BOOLEAN, false) AND result_status = 'not_found')
      OR (COALESCE(:include_error::BOOLEAN, false)     AND result_status = 'error')
    )
  )
ORDER BY created_at DESC
LIMIT  COALESCE(NULLIF(:page_size::TEXT, ''), '20')::INTEGER
OFFSET ((GREATEST(COALESCE(NULLIF(:page::TEXT, ''), '1')::INTEGER, 1) - 1)
         * COALESCE(NULLIF(:page_size::TEXT, ''), '20')::INTEGER);
