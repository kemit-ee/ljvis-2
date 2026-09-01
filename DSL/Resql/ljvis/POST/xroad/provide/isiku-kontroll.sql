/*
declaration:
  version: 0.1
  description: >-
    X-tee IsikuKontroll (v1): tagastab kõik LJVIS kontrollid ja rikkumised ühe
    isikukoodi kohta. Allikad: (1) compound_form kus isik on juht (drivers JSONB),
    (2) labour_inspection_form kus isik on karistatu. Tühjad tulemused on edukad.
    Kustutatud staatuses vormid välistatakse.
  method: post
  accepts: json
  returns: json
  namespace: xroad
  allowlist:
    body:
      - field: isikukood
        type: string
  response:
    fields:
      - field: kuupaev
        type: string
      - field: nimetus
        type: string
      - field: asutus
        type: string
      - field: soiduki_reg_nr
        type: string
      - field: rikkumise_liik
        type: string
      - field: kontrolli_nimetus
        type: string
      - field: juhi_nimi
        type: string
      - field: juhi_perekonnanimi
        type: string
      - field: rikkumised
        type: string
      - field: rikkumised_lopetatud
        type: string
*/

-- 1. Koondvormid kus isik on juht (drivers JSONB sisaldab personalCodeEe;
--    väljanimed on camelCase, tegelik drivers-veeru kuju, mitte snake_case)
-- DISTINCT ON tagab, et iga vormi kohta on ainult viimane versioon (snapshot)
WITH latest_compound AS (
  SELECT DISTINCT ON (compound_form_key)
    compound_form_key,
    control_date,
    form_number,
    vehicle_reg_nr,
    company_name,
    drivers
  FROM forms.compound_form
  WHERE status <> 'deleted'        -- kustutatud vormid jäetakse välja
  ORDER BY compound_form_key, created_at DESC
),
-- Filtreerime juhi isikukoodi järgi JSONB massiivist
compound_hits AS (
  SELECT
    lc.control_date                     AS kuupaev,
    lc.form_number                      AS nimetus,
    lc.company_name                     AS asutus,
    lc.vehicle_reg_nr                   AS soiduki_reg_nr,
    -- Sõiduki tehnoülevaatuse tulemus — LATERAL JOIN viimase snapshoti järgi
    vtf.result_type                     AS rikkumise_liik,
    'KOONDVORM'                         AS kontrolli_nimetus,
    driver->>'firstName'                AS juhi_nimi,
    driver->>'lastName'                 AS juhi_perekonnanimi,
    NULL::TEXT                          AS rikkumised,
    NULL::TEXT                          AS rikkumised_lopetatud
  FROM latest_compound lc,
       jsonb_array_elements(lc.drivers) AS driver   -- lahti pakkimine JSONB massiivist
  LEFT JOIN LATERAL (
    -- Viimane tehnoülevaatuse tulemus sama koondvormi kohta
    SELECT result_type
    FROM forms.vehicle_technical_form
    WHERE compound_form_key = lc.compound_form_key
      AND status <> 'deleted'
    ORDER BY created_at DESC
    LIMIT 1
  ) vtf ON true
  WHERE driver->>'personalCodeEe' = :isikukood   -- isikukoodi järgi filtreerimine
),

-- 2. Tööinspektsiooni aktid kus isik on karistatu
-- DISTINCT ON tagab samuti ainult viimase snapshot-versiooni
latest_labour AS (
  SELECT DISTINCT ON (labour_inspection_form_key)
    inspection_date,
    form_number,
    company_name,
    punished_person_first_name,
    punished_person_last_name,
    proceeding_closure_basis
  FROM forms.labour_inspection_form
  WHERE punished_person_id_code = :isikukood   -- karistatu isikukood
    AND status <> 'deleted'
  ORDER BY labour_inspection_form_key, created_at DESC
)

-- Koonda mõlema allika tulemused ühtseks loendiks, sorteeri kuupäeva järgi
SELECT
  kuupaev, nimetus, asutus, soiduki_reg_nr,
  rikkumise_liik, kontrolli_nimetus,
  juhi_nimi, juhi_perekonnanimi,
  rikkumised, rikkumised_lopetatud
FROM compound_hits

UNION ALL

SELECT
  inspection_date                        AS kuupaev,
  form_number                            AS nimetus,
  company_name                           AS asutus,
  NULL                                   AS soiduki_reg_nr,
  NULL                                   AS rikkumise_liik,
  'TOOINSPEKTION'                        AS kontrolli_nimetus,
  punished_person_first_name             AS juhi_nimi,
  punished_person_last_name              AS juhi_perekonnanimi,
  NULL                                   AS rikkumised,
  proceeding_closure_basis               AS rikkumised_lopetatud
FROM latest_labour

ORDER BY kuupaev DESC NULLS LAST;   -- uuemad kontrollid eespool
