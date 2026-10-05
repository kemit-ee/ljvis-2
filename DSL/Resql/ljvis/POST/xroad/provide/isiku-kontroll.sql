/*
description: 'X-tee IsikuKontroll (v1): tagastab kõik LJVIS kontrollid ja rikkumised ühe isikukoodi kohta.
  Allikad: (1) compound_form kus isik on juht (drivers JSONB), (2) labour_inspection_form kus isik on
  karistatu, (3) sp_teammate_form kus isik on meeskonnaliige (person_code_ee). Tühjad tulemused on edukad. Kustutatud staatuses vormid välistatakse.'
namespace: xroad
params:
  isikukood:
    type: string
    required: false
returns:
- name: kuupaev
  type: string
  nullable: true
- name: nimetus
  type: string
  nullable: true
- name: asutus
  type: string
  nullable: true
- name: soiduki_reg_nr
  type: string
  nullable: true
- name: rikkumise_liik
  type: string
  nullable: true
- name: kontrolli_nimetus
  type: string
  nullable: true
- name: juhi_nimi
  type: string
  nullable: true
- name: juhi_perekonnanimi
  type: string
  nullable: true
- name: rikkumised
  type: string
  nullable: true
- name: rikkumised_lopetatud
  type: string
  nullable: true
*/

-- 1. Koondvormid kus isik on juht (drivers JSONB sisaldab personalCodeEe;
--    väljanimed on camelCase, tegelik drivers-veeru kuju, mitte snake_case)
-- DISTINCT ON tagab, et iga vormi kohta on ainult viimane versioon (snapshot)
-- Eelfilter: GIN-indeks idx_cf_drivers_gin leiab võtmed, mille MÕNI versioon
-- sisaldab juhti antud isikukoodiga — väldib kogu tabeli skaneerimist.
WITH person_compound_keys AS (
  SELECT DISTINCT compound_form_key
  FROM forms.compound_form
  WHERE status <> 'deleted'
    AND drivers @> jsonb_build_array(jsonb_build_object('personalCodeEe', :isikukood))
),
latest_compound AS (
  SELECT DISTINCT ON (compound_form_key)
    compound_form_key,
    control_date,
    form_number,
    vehicle_reg_nr,
    company_name,
    drivers
  FROM forms.compound_form
  WHERE compound_form_key IN (SELECT compound_form_key FROM person_compound_keys)
    AND status <> 'deleted'        -- kustutatud vormid jäetakse välja
  ORDER BY compound_form_key, created_at DESC
),
-- Filtreerime juhi isikukoodi järgi JSONB massiivist
compound_drivers AS (
  -- juhtide massiiv lahti pakitud SRF-ina select-listis (mitte LATERAL JOIN-iga)
  SELECT
    lc.compound_form_key,
    lc.control_date,
    lc.form_number,
    lc.company_name,
    lc.vehicle_reg_nr,
    jsonb_array_elements(lc.drivers) AS driver
  FROM latest_compound lc
),
compound_hits AS (
  SELECT
    cd.control_date                     AS kuupaev,
    cd.form_number                      AS nimetus,
    cd.company_name                     AS asutus,
    cd.vehicle_reg_nr                   AS soiduki_reg_nr,
    -- Sõiduki tehnoülevaatuse tulemus — viimase snapshoti järgi (alampäring, mitte LATERAL JOIN)
    (SELECT v.result_type
       FROM forms.vehicle_technical_form v
      WHERE v.compound_form_key = cd.compound_form_key
        AND v.status <> 'deleted'
      ORDER BY v.created_at DESC
      LIMIT 1)                          AS rikkumise_liik,
    'KOONDVORM'                         AS kontrolli_nimetus,
    cd.driver->>'firstName'             AS juhi_nimi,
    cd.driver->>'lastName'              AS juhi_perekonnanimi,
    NULL::TEXT                          AS rikkumised,
    NULL::TEXT                          AS rikkumised_lopetatud
  FROM compound_drivers cd
  WHERE cd.driver->>'personalCodeEe' = :isikukood   -- isikukoodi järgi filtreerimine
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
),

-- 3. Meeskonnaliikme sõidu- ja puhkeaja alamvormid (isik on vormil person_code_ee)
latest_teammate AS (
  SELECT DISTINCT ON (sp_teammate_form_key)
    compound_form_key,
    sub_form_number,
    result_type,
    proceeding_closure_basis,
    person_first_name,
    person_last_name,
    status
  FROM forms.sp_teammate_form
  WHERE person_code_ee = :isikukood
  ORDER BY sp_teammate_form_key, created_at DESC
),
teammate_resolved AS (
  SELECT
    lt.*,
    (SELECT c FROM forms.compound_form c
      WHERE c.compound_form_key = lt.compound_form_key
      ORDER BY c.created_at DESC
      LIMIT 1) AS cf                     -- koondvormi uusim snapshot (alampäring, mitte LATERAL JOIN)
  FROM latest_teammate lt
  WHERE lt.status <> 'deleted'
),
teammate_hits AS (
  SELECT
    (tr.cf).control_date                AS kuupaev,
    tr.sub_form_number                  AS nimetus,
    (tr.cf).company_name                AS asutus,
    (tr.cf).vehicle_reg_nr              AS soiduki_reg_nr,
    tr.result_type                      AS rikkumise_liik,
    'MEESKONNALIIGE_SOIDU_PUHKEAEG'     AS kontrolli_nimetus,
    tr.person_first_name                AS juhi_nimi,
    tr.person_last_name                 AS juhi_perekonnanimi,
    NULL::TEXT                          AS rikkumised,
    tr.proceeding_closure_basis         AS rikkumised_lopetatud
  FROM teammate_resolved tr
  WHERE (tr.cf).status <> 'deleted'
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

UNION ALL

SELECT
  kuupaev, nimetus, asutus, soiduki_reg_nr,
  rikkumise_liik, kontrolli_nimetus,
  juhi_nimi, juhi_perekonnanimi,
  rikkumised, rikkumised_lopetatud
FROM teammate_hits

ORDER BY kuupaev DESC NULLS LAST;   -- uuemad kontrollid eespool
