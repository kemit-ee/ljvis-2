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
*/
-- `latest` must resolve one row per key (the true latest snapshot) BEFORE any
-- filtering — otherwise an already-resolved key keeps reappearing as a candidate.
WITH latest AS (
  SELECT DISTINCT ON (tram_control_card_key)
      tram_control_card_key AS id,
      status,
      proceeding_reference_number,
      drivers,
      enforcement_decision,
      created_at
  FROM forms.tram_control_card
  ORDER BY tram_control_card_key, created_at DESC
)
SELECT
  id,
  proceeding_reference_number,
  btrim(drivers -> 0 ->> 'personalCodeEe') AS driver_personal_code
FROM latest
WHERE status = 'confirmed'
  AND proceeding_reference_number IS NOT NULL AND btrim(proceeding_reference_number) <> ''
  AND btrim(coalesce(drivers -> 0 ->> 'personalCodeEe', '')) <> ''
  AND enforcement_decision IS NULL
  AND created_at >= now() - INTERVAL '365 days';
