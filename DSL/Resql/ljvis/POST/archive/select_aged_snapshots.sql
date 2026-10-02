/*
description: 'ADR-012 (ajapõhine arhiveerimine): valib arhiivi kõik kontrollvormid, mille VIIMANE tegevus on vanem kui
  retention_years aastat. Üksus = kogu snapshot-ajalugu (kõik versioonid korraga), et ajalugu oleks alati TÄIELIKULT kas
  töö- või arhiivibaasis. Koondvorm ja tema alamvormid (SP juht/kaaslane, tehniline, haagis, ADR, katkestamine) vananevad
  KOOS: kogu juhtumi viimane tegevus on kõigi liikmete maksimum, seega juhtum arhiveeritakse alles siis, kui ükski liige
  pole retention_years aastat muutunud. Iseseisvad vormid (TRAM kaart, välisriigi rikkumine, tööinspektsioon, hea maine)
  vananevad iga ise. Kõik staatused (ka saved/confirmed/deleted). Tagastab sama kuju kui select_deleted_snapshots.sql.
  Ei muuda midagi. Cron: archive-aged-forms.'
namespace: archive
params:
  retention_years:
    type: integer
    required: true
    description: 'Mitu täisaastat tagasi peab viimane tegevus olema (ruuter kontrollib min 3).'
  entity_limit:
    type: integer
    required: false
    description: 'Max juhtumeid/iseseisvaid vorme ühes jooksus (vaikimisi 2000). Üksus võetakse alati tervikuna.'
returns:
- name: form_type
  type: string
  nullable: true
- name: id
  type: number
  nullable: true
- name: form_key
  type: number
  nullable: true
- name: form_number
  type: string
  nullable: true
- name: version
  type: number
  nullable: true
- name: status
  type: string
  nullable: true
- name: created_at
  type: string
  nullable: true
- name: created_by
  type: string
  nullable: true
- name: created_by_name
  type: string
  nullable: true
- name: org_name
  type: string
  nullable: true
- name: payload
  type: object
  nullable: true
*/
WITH cutoff AS (
  SELECT now() - make_interval(years => :retention_years::integer) AS ts
),
case_activity AS (
  SELECT compound_form_key, max(created_at) AS last_activity
  FROM (
    SELECT compound_form_key, created_at FROM forms.compound_form
    UNION ALL
    SELECT compound_form_key, created_at FROM forms.sp_driver_form
    UNION ALL
    SELECT compound_form_key, created_at FROM forms.sp_teammate_form
    UNION ALL
    SELECT compound_form_key, created_at FROM forms.vehicle_technical_form
    UNION ALL
    SELECT compound_form_key, created_at FROM forms.trailer_technical_form
    UNION ALL
    SELECT compound_form_key, created_at FROM forms.adr_form
    UNION ALL
    SELECT compound_form_key, created_at FROM forms.kv_form
  ) a
  GROUP BY compound_form_key
),
eligible AS (
  SELECT 'compound-form'::text AS form_type, l.compound_form_key::bigint AS form_key,
         'case:' || l.compound_form_key AS group_key, ca.last_activity
  FROM (SELECT DISTINCT ON (compound_form_key) compound_form_key
        FROM forms.compound_form ORDER BY compound_form_key, created_at DESC) l
  JOIN case_activity ca ON ca.compound_form_key = l.compound_form_key
  WHERE ca.last_activity < (SELECT ts FROM cutoff)
  UNION ALL
  SELECT 'tram-card'::text AS form_type, l.tram_control_card_key::bigint AS form_key,
         'tram-card:' || l.tram_control_card_key AS group_key, l.created_at AS last_activity
  FROM (SELECT DISTINCT ON (tram_control_card_key) tram_control_card_key, created_at
        FROM forms.tram_control_card ORDER BY tram_control_card_key, created_at DESC) l
  WHERE l.created_at < (SELECT ts FROM cutoff)
  UNION ALL
  SELECT 'drive-rest-form/driver'::text AS form_type, l.sp_driver_form_key::bigint AS form_key,
         'case:' || l.compound_form_key AS group_key, ca.last_activity
  FROM (SELECT DISTINCT ON (sp_driver_form_key) sp_driver_form_key, compound_form_key
        FROM forms.sp_driver_form ORDER BY sp_driver_form_key, created_at DESC) l
  JOIN case_activity ca ON ca.compound_form_key = l.compound_form_key
  WHERE ca.last_activity < (SELECT ts FROM cutoff)
  UNION ALL
  SELECT 'drive-rest-form/teammate'::text AS form_type, l.sp_teammate_form_key::bigint AS form_key,
         'case:' || l.compound_form_key AS group_key, ca.last_activity
  FROM (SELECT DISTINCT ON (sp_teammate_form_key) sp_teammate_form_key, compound_form_key
        FROM forms.sp_teammate_form ORDER BY sp_teammate_form_key, created_at DESC) l
  JOIN case_activity ca ON ca.compound_form_key = l.compound_form_key
  WHERE ca.last_activity < (SELECT ts FROM cutoff)
  UNION ALL
  SELECT 'vehicle-technical'::text AS form_type, l.vehicle_technical_form_key::bigint AS form_key,
         'case:' || l.compound_form_key AS group_key, ca.last_activity
  FROM (SELECT DISTINCT ON (vehicle_technical_form_key) vehicle_technical_form_key, compound_form_key
        FROM forms.vehicle_technical_form ORDER BY vehicle_technical_form_key, created_at DESC) l
  JOIN case_activity ca ON ca.compound_form_key = l.compound_form_key
  WHERE ca.last_activity < (SELECT ts FROM cutoff)
  UNION ALL
  SELECT 'trailer-technical'::text AS form_type, l.trailer_technical_form_key::bigint AS form_key,
         'case:' || l.compound_form_key AS group_key, ca.last_activity
  FROM (SELECT DISTINCT ON (trailer_technical_form_key) trailer_technical_form_key, compound_form_key
        FROM forms.trailer_technical_form ORDER BY trailer_technical_form_key, created_at DESC) l
  JOIN case_activity ca ON ca.compound_form_key = l.compound_form_key
  WHERE ca.last_activity < (SELECT ts FROM cutoff)
  UNION ALL
  SELECT 'adr-form'::text AS form_type, l.adr_form_key::bigint AS form_key,
         'case:' || l.compound_form_key AS group_key, ca.last_activity
  FROM (SELECT DISTINCT ON (adr_form_key) adr_form_key, compound_form_key
        FROM forms.adr_form ORDER BY adr_form_key, created_at DESC) l
  JOIN case_activity ca ON ca.compound_form_key = l.compound_form_key
  WHERE ca.last_activity < (SELECT ts FROM cutoff)
  UNION ALL
  SELECT 'transport-interruption'::text AS form_type, l.kv_form_key::bigint AS form_key,
         'case:' || l.compound_form_key AS group_key, ca.last_activity
  FROM (SELECT DISTINCT ON (kv_form_key) kv_form_key, compound_form_key
        FROM forms.kv_form ORDER BY kv_form_key, created_at DESC) l
  JOIN case_activity ca ON ca.compound_form_key = l.compound_form_key
  WHERE ca.last_activity < (SELECT ts FROM cutoff)
  UNION ALL
  SELECT 'foreign-violation-form'::text AS form_type, l.foreign_violation_form_key::bigint AS form_key,
         'foreign-violation-form:' || l.foreign_violation_form_key AS group_key, l.created_at AS last_activity
  FROM (SELECT DISTINCT ON (foreign_violation_form_key) foreign_violation_form_key, created_at
        FROM forms.foreign_violation_form ORDER BY foreign_violation_form_key, created_at DESC) l
  WHERE l.created_at < (SELECT ts FROM cutoff)
  UNION ALL
  SELECT 'labour-inspection'::text AS form_type, l.labour_inspection_form_key::bigint AS form_key,
         'labour-inspection:' || l.labour_inspection_form_key AS group_key, l.created_at AS last_activity
  FROM (SELECT DISTINCT ON (labour_inspection_form_key) labour_inspection_form_key, created_at
        FROM forms.labour_inspection_form ORDER BY labour_inspection_form_key, created_at DESC) l
  WHERE l.created_at < (SELECT ts FROM cutoff)
  UNION ALL
  SELECT 'good-repute'::text AS form_type, l.good_repute_form_key::bigint AS form_key,
         'good-repute:' || l.good_repute_form_key AS group_key, l.created_at AS last_activity
  FROM (SELECT DISTINCT ON (good_repute_form_key) good_repute_form_key, created_at
        FROM forms.good_repute_form ORDER BY good_repute_form_key, created_at DESC) l
  WHERE l.created_at < (SELECT ts FROM cutoff)
),
picked_groups AS (
  SELECT group_key
  FROM eligible
  GROUP BY group_key
  ORDER BY min(last_activity), group_key
  LIMIT COALESCE(:entity_limit::integer, 2000)
),
picked AS (
  SELECT e.form_type, e.form_key
  FROM eligible e
  JOIN picked_groups g ON g.group_key = e.group_key
),
aged_snapshots AS (
  SELECT
    'compound-form'::text        AS form_type,
    f.id::bigint              AS id,
    f.compound_form_key::bigint           AS form_key,
    f.form_number::text             AS form_number,
    f.version::integer        AS version,
    f.status::text            AS status,
    f.created_at,
    f.created_by::text        AS created_by,
    (SELECT ua.first_name || ' ' || ua.last_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS created_by_name,
    (SELECT ua.organisation_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS org_name,
    to_jsonb(f.*)              AS payload
  FROM forms.compound_form f
  JOIN picked p ON p.form_type = 'compound-form' AND p.form_key = f.compound_form_key
  UNION ALL
  SELECT
    'tram-card'::text        AS form_type,
    f.id::bigint              AS id,
    f.tram_control_card_key::bigint           AS form_key,
    f.form_number::text             AS form_number,
    f.version::integer        AS version,
    f.status::text            AS status,
    f.created_at,
    f.created_by::text        AS created_by,
    (SELECT ua.first_name || ' ' || ua.last_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS created_by_name,
    (SELECT ua.organisation_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS org_name,
    to_jsonb(f.*)              AS payload
  FROM forms.tram_control_card f
  JOIN picked p ON p.form_type = 'tram-card' AND p.form_key = f.tram_control_card_key
  UNION ALL
  SELECT
    'drive-rest-form/driver'::text        AS form_type,
    f.id::bigint              AS id,
    f.sp_driver_form_key::bigint           AS form_key,
    f.sub_form_number::text             AS form_number,
    f.version::integer        AS version,
    f.status::text            AS status,
    f.created_at,
    f.created_by::text        AS created_by,
    (SELECT ua.first_name || ' ' || ua.last_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS created_by_name,
    (SELECT ua.organisation_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS org_name,
    to_jsonb(f.*)              AS payload
  FROM forms.sp_driver_form f
  JOIN picked p ON p.form_type = 'drive-rest-form/driver' AND p.form_key = f.sp_driver_form_key
  UNION ALL
  SELECT
    'drive-rest-form/teammate'::text        AS form_type,
    f.id::bigint              AS id,
    f.sp_teammate_form_key::bigint           AS form_key,
    f.sub_form_number::text             AS form_number,
    f.version::integer        AS version,
    f.status::text            AS status,
    f.created_at,
    f.created_by::text        AS created_by,
    (SELECT ua.first_name || ' ' || ua.last_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS created_by_name,
    (SELECT ua.organisation_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS org_name,
    to_jsonb(f.*)              AS payload
  FROM forms.sp_teammate_form f
  JOIN picked p ON p.form_type = 'drive-rest-form/teammate' AND p.form_key = f.sp_teammate_form_key
  UNION ALL
  SELECT
    'vehicle-technical'::text        AS form_type,
    f.id::bigint              AS id,
    f.vehicle_technical_form_key::bigint           AS form_key,
    f.sub_form_number::text             AS form_number,
    f.version::integer        AS version,
    f.status::text            AS status,
    f.created_at,
    f.created_by::text        AS created_by,
    (SELECT ua.first_name || ' ' || ua.last_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS created_by_name,
    (SELECT ua.organisation_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS org_name,
    to_jsonb(f.*)              AS payload
  FROM forms.vehicle_technical_form f
  JOIN picked p ON p.form_type = 'vehicle-technical' AND p.form_key = f.vehicle_technical_form_key
  UNION ALL
  SELECT
    'trailer-technical'::text        AS form_type,
    f.id::bigint              AS id,
    f.trailer_technical_form_key::bigint           AS form_key,
    f.sub_form_number::text             AS form_number,
    f.version::integer        AS version,
    f.status::text            AS status,
    f.created_at,
    f.created_by::text        AS created_by,
    (SELECT ua.first_name || ' ' || ua.last_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS created_by_name,
    (SELECT ua.organisation_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS org_name,
    to_jsonb(f.*)              AS payload
  FROM forms.trailer_technical_form f
  JOIN picked p ON p.form_type = 'trailer-technical' AND p.form_key = f.trailer_technical_form_key
  UNION ALL
  SELECT
    'adr-form'::text        AS form_type,
    f.id::bigint              AS id,
    f.adr_form_key::bigint           AS form_key,
    f.sub_form_number::text             AS form_number,
    f.version::integer        AS version,
    f.status::text            AS status,
    f.created_at,
    f.created_by::text        AS created_by,
    (SELECT ua.first_name || ' ' || ua.last_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS created_by_name,
    (SELECT ua.organisation_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS org_name,
    to_jsonb(f.*)              AS payload
  FROM forms.adr_form f
  JOIN picked p ON p.form_type = 'adr-form' AND p.form_key = f.adr_form_key
  UNION ALL
  SELECT
    'transport-interruption'::text        AS form_type,
    f.id::bigint              AS id,
    f.kv_form_key::bigint           AS form_key,
    f.sub_form_number::text             AS form_number,
    f.version::integer        AS version,
    f.status::text            AS status,
    f.created_at,
    f.created_by::text        AS created_by,
    (SELECT ua.first_name || ' ' || ua.last_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS created_by_name,
    (SELECT ua.organisation_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS org_name,
    to_jsonb(f.*)              AS payload
  FROM forms.kv_form f
  JOIN picked p ON p.form_type = 'transport-interruption' AND p.form_key = f.kv_form_key
  UNION ALL
  SELECT
    'foreign-violation-form'::text        AS form_type,
    f.id::bigint              AS id,
    f.foreign_violation_form_key::bigint           AS form_key,
    f.form_number::text             AS form_number,
    f.version::integer        AS version,
    f.status::text            AS status,
    f.created_at,
    f.created_by::text        AS created_by,
    (SELECT ua.first_name || ' ' || ua.last_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS created_by_name,
    (SELECT ua.organisation_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS org_name,
    to_jsonb(f.*)              AS payload
  FROM forms.foreign_violation_form f
  JOIN picked p ON p.form_type = 'foreign-violation-form' AND p.form_key = f.foreign_violation_form_key
  UNION ALL
  SELECT
    'labour-inspection'::text        AS form_type,
    f.id::bigint              AS id,
    f.labour_inspection_form_key::bigint           AS form_key,
    f.form_number::text             AS form_number,
    f.version::integer        AS version,
    f.status::text            AS status,
    f.created_at,
    f.created_by::text        AS created_by,
    (SELECT ua.first_name || ' ' || ua.last_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS created_by_name,
    (SELECT ua.organisation_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS org_name,
    to_jsonb(f.*)              AS payload
  FROM forms.labour_inspection_form f
  JOIN picked p ON p.form_type = 'labour-inspection' AND p.form_key = f.labour_inspection_form_key
  UNION ALL
  SELECT
    'good-repute'::text        AS form_type,
    f.id::bigint              AS id,
    f.good_repute_form_key::bigint           AS form_key,
    f.form_number::text             AS form_number,
    f.version::integer        AS version,
    f.status::text            AS status,
    f.created_at,
    f.created_by::text        AS created_by,
    (SELECT ua.first_name || ' ' || ua.last_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS created_by_name,
    (SELECT ua.organisation_name FROM users.user_account ua
      WHERE ua.personal_code = f.created_by ORDER BY ua.id DESC LIMIT 1) AS org_name,
    to_jsonb(f.*)              AS payload
  FROM forms.good_repute_form f
  JOIN picked p ON p.form_type = 'good-repute' AND p.form_key = f.good_repute_form_key
)
SELECT form_type, id, form_key, form_number, version, status,
       created_at, created_by, created_by_name, org_name, payload
FROM aged_snapshots
ORDER BY created_at;
