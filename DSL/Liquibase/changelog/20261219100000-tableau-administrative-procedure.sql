-- liquibase formatted sql
-- changeset ljvis:20261219100000 ignore:true splitStatements:false
--
-- Haldusmenetluse andmeplokk analüütikale (andmehalduse oma päringud / Tableau).
-- Plokk elab vormitabelites (VR: 20261101110000; PPA andmevormid ja TRAM-kaart:
-- 20261217100000), mis on append-only — see vaade annab iga vormi KEHTIVA (uusima,
-- mitte-kustutatud) seisu, üks rida per vorm, ühtse kujuga kõigil 7 vormitüübil.
--
-- Liitumine: (form_type, form_key) = tableau.form_overview (form_type, form_key).
-- form_type väärtused on samad mis forms.form_search-is.
--
-- ADR-009 turvamudel: plain view, GRANT ainult tableau skeemile.
--

CREATE VIEW tableau.administrative_procedure AS
SELECT
  'foreign_violation'::text                                  AS form_type,
  latest.foreign_violation_form_key                                  AS form_key,
  NULL::bigint                       AS compound_form_key,
  latest.form_number                                  AS form_number,
  latest.status,
  (latest.status = 'published')                 AS is_published,
  latest.version,
  latest.klim_clarification_date,
  latest.carrier_explanation_date,
  latest.penalty_valid_until,
  latest.penalty_expired_or_processed,
  latest.akvk_next_meeting_date,
  latest.commission_last_decision_date,
  latest.admin_procedure_decision,
  (latest.klim_clarification_date IS NOT NULL
   OR latest.carrier_explanation_date IS NOT NULL
   OR latest.penalty_valid_until IS NOT NULL
   OR latest.penalty_expired_or_processed
   OR latest.akvk_next_meeting_date IS NOT NULL
   OR latest.commission_last_decision_date IS NOT NULL
   OR NULLIF(btrim(latest.admin_procedure_decision), '') IS NOT NULL) AS has_administrative_procedure,
  latest.created_at                             AS updated_at,
  COALESCE(
    (SELECT ua.first_name || ' ' || ua.last_name
     FROM users.user_account ua
     WHERE ua.personal_code = latest.created_by
     ORDER BY ua.id DESC LIMIT 1),
    latest.created_by)                           AS updated_by
FROM (
  SELECT DISTINCT ON (foreign_violation_form_key) *
  FROM forms.foreign_violation_form
  ORDER BY foreign_violation_form_key, created_at DESC, id DESC
) latest
WHERE latest.status <> 'deleted'
UNION ALL
SELECT
  'sp_driver'::text                                  AS form_type,
  latest.sp_driver_form_key                                  AS form_key,
  latest.compound_form_key                       AS compound_form_key,
  latest.sub_form_number                                  AS form_number,
  latest.status,
  (latest.status = 'published')                 AS is_published,
  latest.version,
  latest.klim_clarification_date,
  latest.carrier_explanation_date,
  latest.penalty_valid_until,
  latest.penalty_expired_or_processed,
  latest.akvk_next_meeting_date,
  latest.commission_last_decision_date,
  latest.admin_procedure_decision,
  (latest.klim_clarification_date IS NOT NULL
   OR latest.carrier_explanation_date IS NOT NULL
   OR latest.penalty_valid_until IS NOT NULL
   OR latest.penalty_expired_or_processed
   OR latest.akvk_next_meeting_date IS NOT NULL
   OR latest.commission_last_decision_date IS NOT NULL
   OR NULLIF(btrim(latest.admin_procedure_decision), '') IS NOT NULL) AS has_administrative_procedure,
  latest.created_at                             AS updated_at,
  COALESCE(
    (SELECT ua.first_name || ' ' || ua.last_name
     FROM users.user_account ua
     WHERE ua.personal_code = latest.created_by
     ORDER BY ua.id DESC LIMIT 1),
    latest.created_by)                           AS updated_by
FROM (
  SELECT DISTINCT ON (sp_driver_form_key) *
  FROM forms.sp_driver_form
  ORDER BY sp_driver_form_key, created_at DESC, id DESC
) latest
WHERE latest.status <> 'deleted'
UNION ALL
SELECT
  'sp_teammate'::text                                  AS form_type,
  latest.sp_teammate_form_key                                  AS form_key,
  latest.compound_form_key                       AS compound_form_key,
  latest.sub_form_number                                  AS form_number,
  latest.status,
  (latest.status = 'published')                 AS is_published,
  latest.version,
  latest.klim_clarification_date,
  latest.carrier_explanation_date,
  latest.penalty_valid_until,
  latest.penalty_expired_or_processed,
  latest.akvk_next_meeting_date,
  latest.commission_last_decision_date,
  latest.admin_procedure_decision,
  (latest.klim_clarification_date IS NOT NULL
   OR latest.carrier_explanation_date IS NOT NULL
   OR latest.penalty_valid_until IS NOT NULL
   OR latest.penalty_expired_or_processed
   OR latest.akvk_next_meeting_date IS NOT NULL
   OR latest.commission_last_decision_date IS NOT NULL
   OR NULLIF(btrim(latest.admin_procedure_decision), '') IS NOT NULL) AS has_administrative_procedure,
  latest.created_at                             AS updated_at,
  COALESCE(
    (SELECT ua.first_name || ' ' || ua.last_name
     FROM users.user_account ua
     WHERE ua.personal_code = latest.created_by
     ORDER BY ua.id DESC LIMIT 1),
    latest.created_by)                           AS updated_by
FROM (
  SELECT DISTINCT ON (sp_teammate_form_key) *
  FROM forms.sp_teammate_form
  ORDER BY sp_teammate_form_key, created_at DESC, id DESC
) latest
WHERE latest.status <> 'deleted'
UNION ALL
SELECT
  'vehicle_technical'::text                                  AS form_type,
  latest.vehicle_technical_form_key                                  AS form_key,
  latest.compound_form_key                       AS compound_form_key,
  latest.sub_form_number                                  AS form_number,
  latest.status,
  (latest.status = 'published')                 AS is_published,
  latest.version,
  latest.klim_clarification_date,
  latest.carrier_explanation_date,
  latest.penalty_valid_until,
  latest.penalty_expired_or_processed,
  latest.akvk_next_meeting_date,
  latest.commission_last_decision_date,
  latest.admin_procedure_decision,
  (latest.klim_clarification_date IS NOT NULL
   OR latest.carrier_explanation_date IS NOT NULL
   OR latest.penalty_valid_until IS NOT NULL
   OR latest.penalty_expired_or_processed
   OR latest.akvk_next_meeting_date IS NOT NULL
   OR latest.commission_last_decision_date IS NOT NULL
   OR NULLIF(btrim(latest.admin_procedure_decision), '') IS NOT NULL) AS has_administrative_procedure,
  latest.created_at                             AS updated_at,
  COALESCE(
    (SELECT ua.first_name || ' ' || ua.last_name
     FROM users.user_account ua
     WHERE ua.personal_code = latest.created_by
     ORDER BY ua.id DESC LIMIT 1),
    latest.created_by)                           AS updated_by
FROM (
  SELECT DISTINCT ON (vehicle_technical_form_key) *
  FROM forms.vehicle_technical_form
  ORDER BY vehicle_technical_form_key, created_at DESC, id DESC
) latest
WHERE latest.status <> 'deleted'
UNION ALL
SELECT
  'trailer_technical'::text                                  AS form_type,
  latest.trailer_technical_form_key                                  AS form_key,
  latest.compound_form_key                       AS compound_form_key,
  latest.sub_form_number                                  AS form_number,
  latest.status,
  (latest.status = 'published')                 AS is_published,
  latest.version,
  latest.klim_clarification_date,
  latest.carrier_explanation_date,
  latest.penalty_valid_until,
  latest.penalty_expired_or_processed,
  latest.akvk_next_meeting_date,
  latest.commission_last_decision_date,
  latest.admin_procedure_decision,
  (latest.klim_clarification_date IS NOT NULL
   OR latest.carrier_explanation_date IS NOT NULL
   OR latest.penalty_valid_until IS NOT NULL
   OR latest.penalty_expired_or_processed
   OR latest.akvk_next_meeting_date IS NOT NULL
   OR latest.commission_last_decision_date IS NOT NULL
   OR NULLIF(btrim(latest.admin_procedure_decision), '') IS NOT NULL) AS has_administrative_procedure,
  latest.created_at                             AS updated_at,
  COALESCE(
    (SELECT ua.first_name || ' ' || ua.last_name
     FROM users.user_account ua
     WHERE ua.personal_code = latest.created_by
     ORDER BY ua.id DESC LIMIT 1),
    latest.created_by)                           AS updated_by
FROM (
  SELECT DISTINCT ON (trailer_technical_form_key) *
  FROM forms.trailer_technical_form
  ORDER BY trailer_technical_form_key, created_at DESC, id DESC
) latest
WHERE latest.status <> 'deleted'
UNION ALL
SELECT
  'adr'::text                                  AS form_type,
  latest.adr_form_key                                  AS form_key,
  latest.compound_form_key                       AS compound_form_key,
  latest.sub_form_number                                  AS form_number,
  latest.status,
  (latest.status = 'published')                 AS is_published,
  latest.version,
  latest.klim_clarification_date,
  latest.carrier_explanation_date,
  latest.penalty_valid_until,
  latest.penalty_expired_or_processed,
  latest.akvk_next_meeting_date,
  latest.commission_last_decision_date,
  latest.admin_procedure_decision,
  (latest.klim_clarification_date IS NOT NULL
   OR latest.carrier_explanation_date IS NOT NULL
   OR latest.penalty_valid_until IS NOT NULL
   OR latest.penalty_expired_or_processed
   OR latest.akvk_next_meeting_date IS NOT NULL
   OR latest.commission_last_decision_date IS NOT NULL
   OR NULLIF(btrim(latest.admin_procedure_decision), '') IS NOT NULL) AS has_administrative_procedure,
  latest.created_at                             AS updated_at,
  COALESCE(
    (SELECT ua.first_name || ' ' || ua.last_name
     FROM users.user_account ua
     WHERE ua.personal_code = latest.created_by
     ORDER BY ua.id DESC LIMIT 1),
    latest.created_by)                           AS updated_by
FROM (
  SELECT DISTINCT ON (adr_form_key) *
  FROM forms.adr_form
  ORDER BY adr_form_key, created_at DESC, id DESC
) latest
WHERE latest.status <> 'deleted'
UNION ALL
SELECT
  'tram_control_card'::text                                  AS form_type,
  latest.tram_control_card_key                                  AS form_key,
  NULL::bigint                       AS compound_form_key,
  latest.form_number                                  AS form_number,
  latest.status,
  (latest.status = 'published')                 AS is_published,
  latest.version,
  latest.klim_clarification_date,
  latest.carrier_explanation_date,
  latest.penalty_valid_until,
  latest.penalty_expired_or_processed,
  latest.akvk_next_meeting_date,
  latest.commission_last_decision_date,
  latest.admin_procedure_decision,
  (latest.klim_clarification_date IS NOT NULL
   OR latest.carrier_explanation_date IS NOT NULL
   OR latest.penalty_valid_until IS NOT NULL
   OR latest.penalty_expired_or_processed
   OR latest.akvk_next_meeting_date IS NOT NULL
   OR latest.commission_last_decision_date IS NOT NULL
   OR NULLIF(btrim(latest.admin_procedure_decision), '') IS NOT NULL) AS has_administrative_procedure,
  latest.created_at                             AS updated_at,
  COALESCE(
    (SELECT ua.first_name || ' ' || ua.last_name
     FROM users.user_account ua
     WHERE ua.personal_code = latest.created_by
     ORDER BY ua.id DESC LIMIT 1),
    latest.created_by)                           AS updated_by
FROM (
  SELECT DISTINCT ON (tram_control_card_key) *
  FROM forms.tram_control_card
  ORDER BY tram_control_card_key, created_at DESC, id DESC
) latest
WHERE latest.status <> 'deleted';

COMMENT ON VIEW tableau.administrative_procedure IS 'Haldusmenetluse andmeplokk: üks rida per vorm (VR, PPA andmevormid, TRAM-kaart), kehtiv seis. Veerud: KLIM selgitustaotluse kp, vedaja seletuse kp, karistus kehtib kuni, kehtetu/menetletud märge, AKVK järgmine koosolek, komisjoni viimase otsuse kp, otsuse tekst. has_administrative_procedure filtriks (plokk täidetud). JOIN tableau.form_overview (form_type, form_key). updated_at/updated_by = viimane versioon (võib olla vormi muu muudatus, mitte ainult haldusmenetlus).';

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kemit_andmelaadija') THEN
    EXECUTE 'GRANT SELECT ON tableau.administrative_procedure TO kemit_andmelaadija';
  END IF;
END $$;
