/*
description: 'X-tee register-job-inspection (v2/v3): vastendab rikkumised.rikkumiste_arv[].rikkumise_kood
  (Tööinspektsiooni täht+number kood, nt "E5") LABOUR_INSPECTION_VIOLATION classifier_value kirjetega.
  Väljanimed vastavad WSDL tüübile RikkumisteArv_v2 (docker/xtr-inbound/wsdl/ljvis/ljvis.wsdl).
  V1 (vana RikkumisteArvud, fikseeritud nimega väljad) ei kasuta seda — vt register-job-inspection.yml.
  Tagastab resolve''itud violations massiivi (level1/level2/level3ValueKey + quantity) ning
  matched_count vs total_count, et Ruuter saaks tuvastada tundmatu koodi enne salvestamist.'
namespace: xroad
params:
  rikkumisedJson:
    type: string
    required: false
returns:
- name: total_count
  type: number
  nullable: true
- name: matched_count
  type: number
  nullable: true
- name: violations_json
  type: string
  nullable: true
- name: unmatched_codes_json
  type: string
  nullable: true
*/

-- rikkumiste_arv on XML-is unbounded-korduv element — SOAP->JSON teisendus annab ühe elemendi
-- korral objekti, mitme korral massiivi (vt tests/xtr/verify.py xml_value()); REST v3 saadab
-- alati massiivi. Normaliseerime mõlemad kujud massiiviks enne lahtipakkimist.
WITH parsed AS (
    SELECT COALESCE(NULLIF(:rikkumisedJson, ''), '{}')::JSONB AS body
),
normalized AS (
    SELECT CASE jsonb_typeof(parsed.body -> 'rikkumiste_arv')
             WHEN 'array' THEN parsed.body -> 'rikkumiste_arv'
             WHEN 'object' THEN jsonb_build_array(parsed.body -> 'rikkumiste_arv')
             ELSE '[]'::JSONB
           END AS items
    FROM parsed
),
input_items AS (
    SELECT
        elem ->> 'rikkumise_kood' AS kood,
        COALESCE((elem ->> 'arv')::INTEGER, 1) AS kogus
    FROM normalized, jsonb_array_elements(normalized.items) AS elem
),
clf AS (
    SELECT classifier_key
    FROM classifier.classifier
    WHERE code = 'LABOUR_INSPECTION_VIOLATION'
),
-- jooksev snapshot (DISTINCT ON classifier_value_key) — vt list_classifier_value_data.sql muster
current_values AS (
    SELECT DISTINCT ON (classifier_value_key)
        classifier_value_key, code, parent_key
    FROM classifier.classifier_value
    WHERE classifier_key = (SELECT classifier_key FROM clf)
      AND (valid_until IS NULL OR valid_until > CURRENT_DATE)
    ORDER BY classifier_value_key, created_at DESC
),
matched AS (
    SELECT
        ii.kogus,
        (SELECT c2.parent_key FROM current_values c2
          WHERE c2.code = 'TI_' || ii.kood) AS level1_key,
        (SELECT c2.classifier_value_key FROM current_values c2
          WHERE c2.code = 'TI_' || ii.kood) AS level2_key,
        (SELECT c3.classifier_value_key FROM current_values c3
          WHERE c3.parent_key = (SELECT c2.classifier_value_key FROM current_values c2
                                   WHERE c2.code = 'TI_' || ii.kood)
          LIMIT 1) AS level3_key
    FROM input_items ii
    WHERE EXISTS (SELECT 1 FROM current_values c2 WHERE c2.code = 'TI_' || ii.kood)
)
SELECT
    (SELECT COUNT(*) FROM input_items) AS total_count,
    (SELECT COUNT(*) FROM matched) AS matched_count,
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'level1ValueKey', level1_key,
            'level2ValueKey', level2_key,
            'level3ValueKey', level3_key,
            'quantity', kogus
        )), '[]'::JSONB)::TEXT
     FROM matched) AS violations_json,
    (SELECT COALESCE(jsonb_agg(ii.kood), '[]'::JSONB)::TEXT
     FROM input_items ii
     WHERE NOT EXISTS (SELECT 1 FROM current_values c2 WHERE c2.code = 'TI_' || ii.kood)
    ) AS unmatched_codes_json;
