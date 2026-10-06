/*
description: 'Kandidaadid meeskonnaliikme sõidu- ja puhkeaja alamvormi öisele e-toimiku otsuse-sünkroonile: iga
  confirmed alamvormi uusim snapshot, millel on väärteomenetluse viitenumber, meeskonnaliikme (sp_teammate_form.person_code_ee) Eesti
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
- name: person_personal_code
  type: string
  nullable: true
*/
-- `latest_st` peab lahendama ühe rea per võti (tõeline uusim snapshot) ENNE
-- filtreerimist — filtreerides esmalt saaks stale eelmise oleku (vt labour
-- select_etoimik_candidates.sql sama kommentaari).
WITH latest_st AS (
  SELECT DISTINCT ON (sp_teammate_form_key)
      sp_teammate_form_key AS id,
      compound_form_key,
      status,
      proceeding_type,
      person_code_ee,
      proceeding_reference_number,
      enforcement_decision,
      created_at
  FROM forms.sp_teammate_form
  ORDER BY sp_teammate_form_key, created_at DESC
),
cand AS (
  SELECT s.id, s.compound_form_key, s.proceeding_reference_number, s.person_code_ee
  FROM latest_st s
  WHERE s.status = 'confirmed'
    AND s.proceeding_type IS NOT NULL AND s.proceeding_type <> 'none'
    AND btrim(coalesce(s.proceeding_reference_number, '')) <> ''
    AND s.enforcement_decision IS NULL
    AND btrim(coalesce(s.person_code_ee, '')) <> ''
    AND s.created_at >= now() - INTERVAL '365 days'
),
resolved AS (
  SELECT cand.id, cand.proceeding_reference_number, cand.person_code_ee,
         (SELECT c FROM forms.compound_form c WHERE c.compound_form_key = cand.compound_form_key ORDER BY c.created_at DESC LIMIT 1) AS cf
  FROM cand
)
SELECT
  id,
  proceeding_reference_number,
  person_code_ee AS person_personal_code
FROM resolved
-- ADR-002: TRAM kaardid on nüüd forms.tram_control_card ja neil on oma cron
-- (etoimik-tram-decision-sync). Siin ainult PPA sp_driver alamvormid.
WHERE (cf).authority = 'PPA';
