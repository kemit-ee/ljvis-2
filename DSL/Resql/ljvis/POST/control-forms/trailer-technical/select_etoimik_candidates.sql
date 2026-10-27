/*
description: 'Candidates for the nightly e-toimik decision sync on trailer technical-check sub-forms
  (LJVIS2-72 15 ettepanekut p9): latest snapshot of each confirmed sub-form with a väärteomenetlus
  reference number and no enforcement_decision yet, joined to its parent compound_form''s first driver
  (drivers[0]) Estonian personal code - mirrors vehicle-technical/select_etoimik_candidates.sql. Both
  `latest_ttf` and `latest_cf` resolve one row per key before any filtering, same reason as that file''s
  comment. Rows drop out once update-xroad-fields.sql writes a decision, which makes the nightly job
  idempotent.'
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
*/
-- Kord e-toimikust saadud otsust automaatika enam ei puutu: kui võtme mõnel snapshotil on created_by = 'eToimik öine uuendus', ei ole vorm kandidaat ka siis, kui otsus on vahepeal käsitsi tühjendatud.
WITH latest_ttf AS (
  SELECT DISTINCT ON (trailer_technical_form_key)
      trailer_technical_form_key AS id,
      compound_form_key,
      status,
      proceeding_type,
      proceeding_reference_number,
      enforcement_decision,
      created_at
  FROM forms.trailer_technical_form
  ORDER BY trailer_technical_form_key, created_at DESC
),
cand AS (
  SELECT t.id, t.compound_form_key, t.proceeding_reference_number
  FROM latest_ttf t
  WHERE t.status = 'confirmed'
    AND t.proceeding_type IS NOT NULL AND t.proceeding_type <> 'none'
    AND btrim(coalesce(t.proceeding_reference_number, '')) <> ''
    AND t.enforcement_decision IS NULL
    AND NOT EXISTS (SELECT 1 FROM forms.trailer_technical_form h WHERE h.trailer_technical_form_key = t.id AND h.created_by = 'eToimik öine uuendus')
    AND (t.created_at >= now() - INTERVAL '365 days'
      OR (SELECT c.extra_data->>'legacy_decision' FROM forms.compound_form c
          WHERE c.compound_form_key=t.compound_form_key ORDER BY c.created_at DESC,c.id DESC LIMIT 1)='owner-2026-10-19')
),
resolved AS (
  SELECT cand.id, cand.proceeding_reference_number,
         (SELECT c FROM forms.compound_form c WHERE c.compound_form_key = cand.compound_form_key ORDER BY c.created_at DESC LIMIT 1) AS cf
  FROM cand
)
SELECT
  id,
  proceeding_reference_number,
  (COALESCE((cf).drivers -> 0 ->> 'personalCodeEe', (cf).drivers -> 0 ->> 'personal_code_ee')) AS driver_personal_code,
  (COALESCE((cf).drivers -> 0 ->> 'firstName', (cf).drivers -> 0 ->> 'first_name')) AS person_first_name,
  (COALESCE((cf).drivers -> 0 ->> 'lastName', (cf).drivers -> 0 ->> 'last_name')) AS person_last_name,
  (LEFT(COALESCE((cf).drivers -> 0 ->> 'birthDate', (cf).drivers -> 0 ->> 'birth_date'), 10)) AS person_birth_date
FROM resolved
WHERE (cf).authority = 'PPA'
  AND (btrim(coalesce(COALESCE((cf).drivers -> 0 ->> 'personalCodeEe', (cf).drivers -> 0 ->> 'personal_code_ee'), '')) <> ''
    OR (btrim(coalesce(COALESCE((cf).drivers -> 0 ->> 'firstName', (cf).drivers -> 0 ->> 'first_name'), '')) <> '' AND btrim(coalesce(COALESCE((cf).drivers -> 0 ->> 'lastName', (cf).drivers -> 0 ->> 'last_name'), '')) <> '' AND btrim(coalesce(LEFT(COALESCE((cf).drivers -> 0 ->> 'birthDate', (cf).drivers -> 0 ->> 'birth_date'), 10), '')) <> ''));
