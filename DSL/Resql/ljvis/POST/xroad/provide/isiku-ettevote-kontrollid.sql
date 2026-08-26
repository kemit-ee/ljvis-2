/*
description: "X-tee IsikuEttevoteKontrollid (v1): tagastab kõik LJVIS kontrollid ettevõtete kohta, millega antud isik on seotud (juhi rollina koondvormis või karistatu tööinspektsiooniaktis). Ainult lokaalne DB — Äriregistri välispäringut ei tehta. Kustutatud staatuses vormid välistatakse."
namespace: xroad
params:
  isikukood:
    type: string
    required: false
returns:
  - name: ettevote_reg_nr
    type: string
    nullable: true
  - name: kuupaev
    type: string
    nullable: true
  - name: kontrolli_nimetus
    type: string
    nullable: true
  - name: asutus
    type: string
    nullable: true
  - name: nimetus
    type: string
    nullable: true
  - name: soiduki_reg_nr
    type: string
    nullable: true
  - name: juhi_nimi
    type: string
    nullable: true
  - name: juhi_perekonnanimi
    type: string
    nullable: true
  - name: rikkumise_liik
    type: string
    nullable: true
  - name: rikkumised
    type: string
    nullable: true
  - name: rikkumised_lopetatud
    type: string
    nullable: true
*/

-- CTE 1: leia kõik ettevõtete registrikoodid, millega isik on seotud
-- Allikad: koondvorm (juht) + tööinspektsiooniakt (karistatu)
WITH person_companies AS (
  -- Koondvormidest: isik on juht (drivers JSONB massiiv sisaldab isikukoodi)
  SELECT DISTINCT cf.company_reg_code
  FROM forms.compound_form cf,
       jsonb_array_elements(cf.drivers) AS driver
  WHERE driver->>'personal_code_ee' = :isikukood
    AND cf.company_reg_code IS NOT NULL
    AND cf.company_reg_code <> ''
    AND cf.status <> 'deleted'   -- kustutatud vormid välja

  UNION

  -- Tööinspektsiooniaktidest: isik on karistatu
  SELECT DISTINCT lif.company_reg_code
  FROM forms.labour_inspection_form lif
  WHERE lif.punished_person_id_code = :isikukood
    AND lif.company_reg_code IS NOT NULL
    AND lif.company_reg_code <> ''
    AND lif.status <> 'deleted'
),

-- CTE 2: viimane snapshot iga koondvormi kohta, millel on seotud ettevõte
-- DISTINCT ON compound_form_key + ORDER BY created_at DESC = ainult uusim versioon
latest_compound AS (
  SELECT DISTINCT ON (compound_form_key)
    compound_form_key,
    company_reg_code,
    control_date,
    company_name,
    form_number,
    vehicle_reg_nr
  FROM forms.compound_form
  WHERE company_reg_code IN (SELECT company_reg_code FROM person_companies)
    AND status <> 'deleted'
  ORDER BY compound_form_key, created_at DESC
),

-- CTE 3: viimane snapshot iga tööinspektsiooniakti kohta, millel on seotud ettevõte
latest_labour AS (
  SELECT DISTINCT ON (labour_inspection_form_key)
    company_reg_code,
    inspection_date,
    company_name,
    form_number,
    punished_person_first_name,
    punished_person_last_name,
    proceeding_closure_basis
  FROM forms.labour_inspection_form
  WHERE company_reg_code IN (SELECT company_reg_code FROM person_companies)
    AND status <> 'deleted'
  ORDER BY labour_inspection_form_key, created_at DESC
)

-- Koonda koondvormid
SELECT
  lc.company_reg_code      AS ettevote_reg_nr,
  lc.control_date          AS kuupaev,
  'KOONDVORM'              AS kontrolli_nimetus,
  lc.company_name          AS asutus,
  lc.form_number           AS nimetus,
  lc.vehicle_reg_nr        AS soiduki_reg_nr,
  NULL::TEXT               AS juhi_nimi,
  NULL::TEXT               AS juhi_perekonnanimi,
  NULL::TEXT               AS rikkumise_liik,
  NULL::TEXT               AS rikkumised,
  NULL::TEXT               AS rikkumised_lopetatud
FROM latest_compound lc

UNION ALL

-- ... ja tööinspektsiooniaktid
SELECT
  ll.company_reg_code               AS ettevote_reg_nr,
  ll.inspection_date                AS kuupaev,
  'TOOINSPEKTION'                   AS kontrolli_nimetus,
  ll.company_name                   AS asutus,
  ll.form_number                    AS nimetus,
  NULL                              AS soiduki_reg_nr,
  ll.punished_person_first_name     AS juhi_nimi,
  ll.punished_person_last_name      AS juhi_perekonnanimi,
  NULL                              AS rikkumise_liik,
  NULL                              AS rikkumised,
  ll.proceeding_closure_basis       AS rikkumised_lopetatud
FROM latest_labour ll

-- Grupeerime ettevõtte järgi, sees uuemad kontrollid eespool
ORDER BY ettevote_reg_nr, kuupaev DESC NULLS LAST;
