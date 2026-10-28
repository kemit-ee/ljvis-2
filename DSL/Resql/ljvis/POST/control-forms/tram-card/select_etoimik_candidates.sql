/*
description: 'Candidates for the nightly e-toimik decision sync (TRAM). Latest snapshot of each confirmed
  TRAM control card that has a väärteomenetlus reference number + an Estonian driver personal code but
  no enforcement_decision yet. Rows drop out once apply_etoimik_decision.sql writes a decision, which
  makes the job idempotent. driver_not_applicable cards are naturally excluded (no driver personal code).'
namespace: control-forms
params: {}
returns:
- name: id
  type: number
  nullable: true
- name: proceeding_reference_number
  type: string
  nullable: true
- name: driver_personal_code
  type: string
  nullable: true
- name: person_first_name
  type: string
  nullable: true
- name: person_last_name
  type: string
  nullable: true
- name: person_birth_date
  type: string
  nullable: true
- name: proceeding_type
  type: string
  nullable: true
*/
-- Kord e-toimikust saadud otsust automaatika enam ei puutu: kui võtme mõnel snapshotil on created_by = 'eToimik öine uuendus', ei ole vorm kandidaat ka siis, kui otsus on vahepeal käsitsi tühjendatud.
-- `latest` must resolve one row per key (the true latest snapshot) BEFORE any
-- filtering - otherwise an already-resolved key keeps reappearing as a candidate.
WITH latest AS (
  SELECT DISTINCT ON (tram_control_card_key)
      tram_control_card_key AS id,
      status,
      proceeding_type,
      proceeding_reference_number,
      drivers,
      enforcement_decision,
      created_at
  FROM forms.tram_control_card
  ORDER BY tram_control_card_key, created_at DESC
)
SELECT
  id,
  proceeding_type,
  proceeding_reference_number,
  btrim(drivers -> 0 ->> 'personalCodeEe') AS driver_personal_code,
  (COALESCE(drivers -> 0 ->> 'firstName', drivers -> 0 ->> 'first_name')) AS person_first_name,
  (COALESCE(drivers -> 0 ->> 'lastName', drivers -> 0 ->> 'last_name')) AS person_last_name,
  (LEFT(COALESCE(drivers -> 0 ->> 'birthDate', drivers -> 0 ->> 'birth_date'), 10)) AS person_birth_date
FROM latest
WHERE status = 'confirmed'
  AND proceeding_reference_number IS NOT NULL AND btrim(proceeding_reference_number) <> ''
  AND (btrim(coalesce(drivers -> 0 ->> 'personalCodeEe', '')) <> ''
    OR (btrim(coalesce(COALESCE(drivers -> 0 ->> 'firstName', drivers -> 0 ->> 'first_name'), '')) <> '' AND btrim(coalesce(COALESCE(drivers -> 0 ->> 'lastName', drivers -> 0 ->> 'last_name'), '')) <> '' AND btrim(coalesce(LEFT(COALESCE(drivers -> 0 ->> 'birthDate', drivers -> 0 ->> 'birth_date'), 10), '')) <> ''))
  AND enforcement_decision IS NULL
  AND NOT EXISTS (SELECT 1 FROM forms.tram_control_card h WHERE h.tram_control_card_key = latest.id AND h.created_by = 'eToimik öine uuendus')
  AND created_at >= now() - INTERVAL '365 days';
