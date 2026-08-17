/*
declaration:
  version: 0.1
  description: >-
    X-tee IsikuEttevoteKontrollid (v1): tagastab kõik LJVIS kontrollid ettevõtete
    kohta, millega antud isik on seotud (juhi rollina koondvormis või karistatu
    tööinspektsiooniaktis). Ainult lokaalne DB — Äriregistri välispäringut ei tehta.
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
      - field: ettevote_reg_nr
        type: string
      - field: kuupaev
        type: string
      - field: kontrolli_nimetus
        type: string
      - field: asutus
        type: string
      - field: nimetus
        type: string
      - field: soiduki_reg_nr
        type: string
      - field: juhi_nimi
        type: string
      - field: juhi_perekonnanimi
        type: string
      - field: rikkumise_liik
        type: string
      - field: rikkumised
        type: string
      - field: rikkumised_lopetatud
        type: string
*/

-- CTE 1: isikuga seotud ettevõtete registrikoodid
WITH person_companies AS (
  -- Koondvormidest: isik on juht
  SELECT DISTINCT cf.company_reg_code
  FROM forms.compound_form cf,
       jsonb_array_elements(cf.drivers) AS driver
  WHERE driver->>'personal_code_ee' = :isikukood
    AND cf.company_reg_code IS NOT NULL
    AND cf.company_reg_code <> ''
    AND cf.status <> 'deleted'

  UNION

  -- Tööinspektsiooniaktidest: isik on karistatu
  SELECT DISTINCT lif.company_reg_code
  FROM forms.labour_inspection_form lif
  WHERE lif.punished_person_id_code = :isikukood
    AND lif.company_reg_code IS NOT NULL
    AND lif.company_reg_code <> ''
    AND lif.status <> 'deleted'
),

-- CTE 2: viimane snapshot iga koondvormi kohta
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

-- CTE 3: viimane snapshot iga tööinspektsiooniakti kohta
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

ORDER BY ettevote_reg_nr, kuupaev DESC NULLS LAST;
