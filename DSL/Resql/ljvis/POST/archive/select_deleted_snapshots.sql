/*
description: 'ADR-010: kõik snapshot-read olemitest, mille viimane seis on ''deleted'', üle 11 kontrollvormi-tabeli.
  Kolib arhiiv-andmebaasi (archive.form_snapshot). Tagastab ka copy-time resolutsiooniga looja nime + org,
  sest arhiiv-baasis users.user_account puudub. payload = to_jsonb(rea *). Cron: archive-deleted-forms.'
namespace: archive
params:
  limit:
    type: integer
    required: false
    description: 'Max ridade arv ühes jooksus (vaikimisi 5000).'
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
WITH deleted_snapshots AS (
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
  WHERE f.compound_form_key IN (
    SELECT compound_form_key FROM (
      SELECT DISTINCT ON (compound_form_key) compound_form_key, status
      FROM forms.compound_form ORDER BY compound_form_key, created_at DESC
    ) latest WHERE latest.status = 'deleted'
  )
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
  WHERE f.tram_control_card_key IN (
    SELECT tram_control_card_key FROM (
      SELECT DISTINCT ON (tram_control_card_key) tram_control_card_key, status
      FROM forms.tram_control_card ORDER BY tram_control_card_key, created_at DESC
    ) latest WHERE latest.status = 'deleted'
  )
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
  WHERE f.sp_driver_form_key IN (
    SELECT sp_driver_form_key FROM (
      SELECT DISTINCT ON (sp_driver_form_key) sp_driver_form_key, status
      FROM forms.sp_driver_form ORDER BY sp_driver_form_key, created_at DESC
    ) latest WHERE latest.status = 'deleted'
  )
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
  WHERE f.sp_teammate_form_key IN (
    SELECT sp_teammate_form_key FROM (
      SELECT DISTINCT ON (sp_teammate_form_key) sp_teammate_form_key, status
      FROM forms.sp_teammate_form ORDER BY sp_teammate_form_key, created_at DESC
    ) latest WHERE latest.status = 'deleted'
  )
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
  WHERE f.vehicle_technical_form_key IN (
    SELECT vehicle_technical_form_key FROM (
      SELECT DISTINCT ON (vehicle_technical_form_key) vehicle_technical_form_key, status
      FROM forms.vehicle_technical_form ORDER BY vehicle_technical_form_key, created_at DESC
    ) latest WHERE latest.status = 'deleted'
  )
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
  WHERE f.trailer_technical_form_key IN (
    SELECT trailer_technical_form_key FROM (
      SELECT DISTINCT ON (trailer_technical_form_key) trailer_technical_form_key, status
      FROM forms.trailer_technical_form ORDER BY trailer_technical_form_key, created_at DESC
    ) latest WHERE latest.status = 'deleted'
  )
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
  WHERE f.adr_form_key IN (
    SELECT adr_form_key FROM (
      SELECT DISTINCT ON (adr_form_key) adr_form_key, status
      FROM forms.adr_form ORDER BY adr_form_key, created_at DESC
    ) latest WHERE latest.status = 'deleted'
  )
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
  WHERE f.kv_form_key IN (
    SELECT kv_form_key FROM (
      SELECT DISTINCT ON (kv_form_key) kv_form_key, status
      FROM forms.kv_form ORDER BY kv_form_key, created_at DESC
    ) latest WHERE latest.status = 'deleted'
  )
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
  WHERE f.foreign_violation_form_key IN (
    SELECT foreign_violation_form_key FROM (
      SELECT DISTINCT ON (foreign_violation_form_key) foreign_violation_form_key, status
      FROM forms.foreign_violation_form ORDER BY foreign_violation_form_key, created_at DESC
    ) latest WHERE latest.status = 'deleted'
  )
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
  WHERE f.labour_inspection_form_key IN (
    SELECT labour_inspection_form_key FROM (
      SELECT DISTINCT ON (labour_inspection_form_key) labour_inspection_form_key, status
      FROM forms.labour_inspection_form ORDER BY labour_inspection_form_key, created_at DESC
    ) latest WHERE latest.status = 'deleted'
  )
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
  WHERE f.good_repute_form_key IN (
    SELECT good_repute_form_key FROM (
      SELECT DISTINCT ON (good_repute_form_key) good_repute_form_key, status
      FROM forms.good_repute_form ORDER BY good_repute_form_key, created_at DESC
    ) latest WHERE latest.status = 'deleted'
  )
)
SELECT form_type, id, form_key, form_number, version, status,
       created_at, created_by, created_by_name, org_name, payload
FROM deleted_snapshots
ORDER BY created_at
LIMIT COALESCE(:limit::INTEGER, 5000);
