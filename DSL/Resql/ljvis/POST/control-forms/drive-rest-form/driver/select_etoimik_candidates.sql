/*
description: 'Kandidaadid autojuhi sõidu- ja puhkeaja alamvormi öisele e-toimiku otsuse-sünkroonile: iga
  confirmed alamvormi uusim snapshot, millel on väärteomenetluse viitenumber, juhi (drivers[0]) Eesti
  isikukood ja millel enforcement_decision on veel NULL. Read kaovad kandidaatide seast niipea kui update-xroad-fields.sql
  kirjutab otsuse — see teeb töö idempotentseks.'
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
-- `latest_sd` peab lahendama ühe rea per võti (tõeline uusim snapshot) ENNE
-- filtreerimist — filtreerides esmalt saaks stale eelmise oleku (vt labour
-- select_etoimik_candidates.sql sama kommentaari).
WITH latest_sd AS (
  SELECT DISTINCT ON (sp_driver_form_key)
      sp_driver_form_key AS id,
      compound_form_key,
      status,
      proceeding_type,
      proceeding_reference_number,
      enforcement_decision,
      created_at
  FROM forms.sp_driver_form
  ORDER BY sp_driver_form_key, created_at DESC
),
cand AS (
  SELECT s.id, s.compound_form_key, s.proceeding_reference_number
  FROM latest_sd s
  WHERE s.status = 'confirmed'
    AND s.proceeding_type IS NOT NULL AND s.proceeding_type <> 'none'
    AND btrim(coalesce(s.proceeding_reference_number, '')) <> ''
    AND s.enforcement_decision IS NULL
    AND s.created_at >= now() - INTERVAL '365 days'
),
-- koondvormi UUSIM snapshot (üks rida võtme kohta) alampäringuga, mitte JOIN-iga
resolved AS (
  SELECT cand.id, cand.proceeding_reference_number,
         (SELECT c FROM forms.compound_form c WHERE c.compound_form_key = cand.compound_form_key ORDER BY c.created_at DESC LIMIT 1) AS cf
  FROM cand
)
SELECT
  id,
  proceeding_reference_number,
  (COALESCE((cf).drivers -> 0 ->> 'personalCodeEe', (cf).drivers -> 0 ->> 'personal_code_ee')) AS driver_personal_code
FROM resolved
-- ADR-002: TRAM kaardid on nüüd forms.tram_control_card ja neil on oma cron
-- (etoimik-tram-decision-sync). Siin ainult PPA sp_driver alamvormid.
WHERE (cf).authority = 'PPA'
  AND btrim(coalesce(COALESCE((cf).drivers -> 0 ->> 'personalCodeEe', (cf).drivers -> 0 ->> 'personal_code_ee'), '')) <> '';
