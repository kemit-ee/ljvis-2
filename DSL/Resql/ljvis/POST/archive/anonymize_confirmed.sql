/*
description: 'ADR-014 / LJVIS2-51: isikuga seose eemaldamine arhiveeritud (ja töö-baasist
  kinnitatult kustutatud) kontrollvormidelt. Kutsutakse archive-deleted-forms.yml /
  archive-aged-forms.yml-is VAHETULT pärast purge_confirmed.sql õnnestumist, samade
  (form_type, id) paaridega. See on EPICU #522 TEINE lubatud erand append-only reeglile
  (.sql-rule-exemption): REAALNE UPDATE archive.form_snapshot-il (esimene erand,
  purge_confirmed.sql, on DELETE töö-baasis). Põhjus, miks UPDATE on siin ainus variant:
  isikuandmete eemaldamine nõuab olemasoleva rea sisu muutmist, mitte uue rea lisamist —
  INSERT-only alternatiivi pole (vana PII-ga rida jääks muidu füüsiliselt alles).
  Idempotentne: WHERE anonymized_at IS NULL välistab juba töödeldud read.
  Teisendusreeglid (vt docs/workingdocs/architecture-decisions.md ADR-014):
  - nimeväljad -> eesnimi "Anonümiseeritud", perenimi "" (vältimaks topeltsõna kuvamisel)
  - isikukood (11 kohta EE formaadis) -> sajand/sugu-number ja sünniaasta kümnend
    säilivad, kuu/päev "01"/"01", jrk-number "000", kontrollnumber "0"
    (nt 38002025213 -> 38001010000); mitte-EE-formaadis välisriigi kood -> ""
  - sünnikuupäev -> päev/kuu 01/01, aasta kümnendi algusesse (nt 1865-02-02 -> 1860-01-01)
  - sünnikoht (vabatekst) -> jäetakse alles ainult viimane komaga eraldatud osa
    (tüüpiliselt riik, nt "Tallinn, Eesti" -> "Eesti"); kui koma puudub, väärtus jääb
    muutumatuks (teadaolev piirang, vt ADR-014 — vabatekst ilma riigita ei ole
    usaldusväärselt tuvastatav).
  Hõlmatud on ainult need archive.form_snapshot-is esinevad form_type väärtused, mille
  payload-is on teadaolevalt subjekti isikuandmeid: compound-form, tram-card,
  foreign-violation-form, labour-inspection, good-repute, drive-rest-form/teammate.
  Vormi LOONUD ametniku väljad (created_by, created_by_name) jäävad alati puutumata
  (auditjälg). Massiivsed väljad (compound-form/tram-card drivers[]) redigeeritakse
  elemendihaaval, mõlemad kasutusel olevad võtmekonventsioonid (snake_case ja camelCase)
  arvesse võttes.'
namespace: archive
params:
  pairs:
    type: string
    required: false
    description: 'JSON massiiv [{"form_type":"labour-inspection","id":123}, ...] — samad paarid, mis purge_confirmed-ile läksid.'
returns:
- name: anonymized
  type: number
  nullable: true
*/
WITH confirmed AS (
  SELECT form_type, id
  FROM jsonb_to_recordset(COALESCE(:pairs, '[]')::jsonb) AS x(form_type text, id bigint)
  WHERE form_type IS NOT NULL AND id IS NOT NULL
),
targets AS (
  SELECT s.form_type, s.id, s.payload
  FROM archive.form_snapshot s
  WHERE s.anonymized_at IS NULL
    AND EXISTS (SELECT 1 FROM confirmed c WHERE c.form_type = s.form_type AND c.id = s.id)
),
redacted AS (
  SELECT
    t.form_type,
    t.id,
    t.payload
      || jsonb_strip_nulls(jsonb_build_object(
           -- lihtväljad (vormitüübispetsiifilised nimed, puuduvad võtmed ei lisandu)
           'driver_first_name',         CASE WHEN t.payload ? 'driver_first_name' THEN 'Anonümiseeritud' END,
           'driver_last_name',          CASE WHEN t.payload ? 'driver_last_name' THEN '' END,
           'company_owner_first_name',  CASE WHEN t.payload ? 'company_owner_first_name' THEN 'Anonümiseeritud' END,
           'company_owner_last_name',   CASE WHEN t.payload ? 'company_owner_last_name' THEN '' END,
           'punished_person_first_name', CASE WHEN t.payload ? 'punished_person_first_name' THEN 'Anonümiseeritud' END,
           'punished_person_last_name',  CASE WHEN t.payload ? 'punished_person_last_name' THEN '' END,
           'person_first_name',         CASE WHEN t.payload ? 'person_first_name' THEN 'Anonümiseeritud' END,
           'person_last_name',          CASE WHEN t.payload ? 'person_last_name' THEN '' END,
           'personal_code',
             CASE WHEN t.payload ? 'personal_code' THEN
               CASE WHEN (t.payload->>'personal_code') ~ '^[0-9]{11}$' THEN
                 left(t.payload->>'personal_code', 1)
                 || lpad((floor(substring(t.payload->>'personal_code' from 2 for 2)::int / 10) * 10)::text, 2, '0')
                 || '0101000' || '0'
               ELSE '' END
             END,
           'person_birth_date',
             CASE WHEN t.payload ? 'person_birth_date' THEN
               CASE WHEN (t.payload->>'person_birth_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN
                 to_char(make_date((floor(extract(year from (t.payload->>'person_birth_date')::date) / 10) * 10)::int, 1, 1), 'YYYY-MM-DD')
               ELSE '' END
             END,
           'place_of_birth',
             CASE WHEN t.payload ? 'place_of_birth' AND t.payload->>'place_of_birth' IS NOT NULL THEN
               btrim(split_part(t.payload->>'place_of_birth', ',', -1))
             END,
           -- compound-form / tram-card: drivers[] massiiv, mõlemad võtmekonventsioonid
           'drivers',
             CASE WHEN t.payload ? 'drivers' AND jsonb_typeof(t.payload->'drivers') = 'array' THEN
               (
                 SELECT jsonb_agg(
                   elem
                   || jsonb_strip_nulls(jsonb_build_object(
                        'first_name',  CASE WHEN elem ? 'first_name' THEN 'Anonümiseeritud' END,
                        'last_name',   CASE WHEN elem ? 'last_name' THEN '' END,
                        'firstName',   CASE WHEN elem ? 'firstName' THEN 'Anonümiseeritud' END,
                        'lastName',    CASE WHEN elem ? 'lastName' THEN '' END,
                        'personal_code_ee',
                          CASE WHEN elem ? 'personal_code_ee' THEN
                            CASE WHEN (elem->>'personal_code_ee') ~ '^[0-9]{11}$' THEN
                              left(elem->>'personal_code_ee', 1)
                              || lpad((floor(substring(elem->>'personal_code_ee' from 2 for 2)::int / 10) * 10)::text, 2, '0')
                              || '0101000' || '0'
                            ELSE '' END
                          END,
                        'personalCodeEe',
                          CASE WHEN elem ? 'personalCodeEe' THEN
                            CASE WHEN (elem->>'personalCodeEe') ~ '^[0-9]{11}$' THEN
                              left(elem->>'personalCodeEe', 1)
                              || lpad((floor(substring(elem->>'personalCodeEe' from 2 for 2)::int / 10) * 10)::text, 2, '0')
                              || '0101000' || '0'
                            ELSE '' END
                          END,
                        'personal_code_foreign', CASE WHEN elem ? 'personal_code_foreign' THEN '' END,
                        'personalCodeForeign',   CASE WHEN elem ? 'personalCodeForeign' THEN '' END,
                        'birth_date',
                          CASE WHEN elem ? 'birth_date' THEN
                            CASE WHEN (elem->>'birth_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN
                              to_char(make_date((floor(extract(year from (elem->>'birth_date')::date) / 10) * 10)::int, 1, 1), 'YYYY-MM-DD')
                            ELSE '' END
                          END,
                        'birthDate',
                          CASE WHEN elem ? 'birthDate' THEN
                            CASE WHEN (elem->>'birthDate') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN
                              to_char(make_date((floor(extract(year from (elem->>'birthDate')::date) / 10) * 10)::int, 1, 1), 'YYYY-MM-DD')
                            ELSE '' END
                          END
                      ))
                 )
                 FROM jsonb_array_elements(t.payload->'drivers') AS elem
               )
             END
         )) AS new_payload
  FROM targets t
),
upd AS (
  UPDATE archive.form_snapshot s
  SET payload = r.new_payload,
      anonymized_at = now()
  FROM redacted r
  WHERE s.form_type = r.form_type AND s.id = r.id
  RETURNING 1
)
SELECT count(*)::bigint AS anonymized FROM upd;
