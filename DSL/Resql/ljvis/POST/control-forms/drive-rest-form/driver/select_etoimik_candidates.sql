/*
declaration:
  version: 0.1
  description: "Kandidaadid autojuhi sõidu- ja puhkeaja alamvormi öisele e-toimiku otsuse-sünkroonile: iga confirmed alamvormi uusim snapshot, millel on väärteomenetluse viitenumber, juhi (drivers[0]) Eesti isikukood ja millel enforcement_decision on veel NULL. Read kaovad kandidaatide seast niipea kui update-xroad-fields.sql kirjutab otsuse — see teeb töö idempotentseks."
  method: post
  namespace: control-forms
  returns: json
  response:
    fields:
      - field: id
        type: number
      - field: proceeding_reference_number
        type: string
      - field: driver_personal_code
        type: string
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
latest_cf AS (
  SELECT DISTINCT ON (compound_form_key)
      compound_form_key,
      drivers
  FROM forms.compound_form
  ORDER BY compound_form_key, created_at DESC
)
SELECT
  s.id,
  s.proceeding_reference_number,
  (c.drivers -> 0 ->> 'personal_code_ee') AS driver_personal_code
FROM latest_sd s
JOIN latest_cf c ON c.compound_form_key = s.compound_form_key
WHERE s.status = 'confirmed'
  AND s.proceeding_type IS NOT NULL AND s.proceeding_type <> 'none'
  AND btrim(coalesce(s.proceeding_reference_number, '')) <> ''
  AND s.enforcement_decision IS NULL
  AND btrim(coalesce(c.drivers -> 0 ->> 'personal_code_ee', '')) <> ''
  AND s.created_at >= now() - INTERVAL '365 days';
