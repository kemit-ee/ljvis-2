/*
description: 'X-tee register-job-inspection (v1/v2/v3): vastendab rikkumised_loend (Tööinspektsiooni
  täht+number koodid, nt "E5") LABOUR_INSPECTION_VIOLATION classifier_value kirjetega. Tagastab
  resolve''itud violations massiivi (level1/level2/level3ValueKey + quantity) ning matched_count vs
  total_count, et Ruuter saaks tuvastada tundmatu koodi enne kontrollvormi salvestamist.'
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

-- Iga rikkumised_loend element on kujul {"kood": "E5", "kogus": 2}. Kood vastendub meie level2
-- classifier_value'le koodiga 'TI_' || kood (vt 20261209110000 struktuuriparandus — iga
-- raskusaste on nüüd oma eraldi level2 kirje, mitte peidetud ühise koodi laps). level3 (ametlik
-- ERRU kood, kui eksisteerib — MI-tasemel seda pole) tuletatakse level2 ainsa lapse kaudu.
WITH parsed AS (
    SELECT COALESCE(NULLIF(:rikkumisedJson, ''), '{}')::JSONB AS body
),
input_items AS (
    SELECT
        elem ->> 'kood' AS kood,
        COALESCE((elem ->> 'kogus')::INTEGER, 1) AS kogus
    FROM parsed, jsonb_array_elements(COALESCE(parsed.body -> 'rikkumised_loend', '[]'::JSONB)) AS elem
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
        level2.parent_key AS level1_key,
        level2.classifier_value_key AS level2_key,
        (SELECT c3.classifier_value_key FROM current_values c3
          WHERE c3.parent_key = level2.classifier_value_key
          LIMIT 1) AS level3_key
    FROM input_items ii
    JOIN current_values level2 ON level2.code = 'TI_' || ii.kood
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
