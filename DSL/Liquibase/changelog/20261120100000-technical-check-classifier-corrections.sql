-- liquibase formatted sql
-- changeset ljvis:20261120100000 splitStatements:false
--
-- TECHNICAL_CHECK klassifikaatori parandused vastavalt majandus- ja
-- kommunikatsiooniministri 15.12.2011 määrusele nr 114 "Politseiametniku
-- poolt liiklusjärelevalve käigus sõiduki tehnonõuetele vastavuse
-- kontrollimise ulatus ja kord" Lisa 1 (majandus- ja taristuministri
-- 07.09.2022 nr 68 sõnastuses) ja Lisa 2 (16.04.2020 nr 9 sõnastuses).
-- Parandab seemned 20260803150000 ja 20261020110000, mis on juba dev-is
-- avaldatud — seetõttu UPDATE/DELETE/INSERT, mitte varasemate failide muutmine.
--
-- 1) CAA_10/CAA_11 nimed olid vahetusse pandud (Lisa 1 p 11: (10) veose
--    kinnitamine, (10) muu on tegelikult (11)). Vt kasutaja tagasiside p1/12/13.
-- 2) CAA_0.3/CAA_0.4 kustutatud — Lisa 2 punktis 0 on ainult 0.1 ja 0.2.
-- 3) Grupp 2 (rooliseade): Lisa 2-s puudub "2.4" (nummerdus hüppab 2.3-lt
--    2.5-le); seemnes oli see auk kokku surutud, mistõttu "2.5 Elektrooniline
--    roolivõimendi (EPS)" kandis koodi 2.4 ja tegelik "2.6" puudus üldse.
--    Parandus: kood 'CAA_2.4' saab õige koodi 'CAA_2.5' (nimi jääb samaks,
--    "Haagise esitelje pöördering"), kood 'CAA_2.5' saab õige koodi 'CAA_2.6'.
-- 4) Grupp 3 (nähtavus): Lisa 2 lõpeb punktiga 3.6 (Tuuleklaasi soojendi).
--    Seemnes oli lisatud fabritseeritud "3.7 Aknaklaasi tõstukid" — kustutatud.
-- 5) Grupp 4: "4.2.x" oli ekslikult nimetatud "Ääre- ja päevatulelaternad",
--    kuigi Lisa 2-s on need kaks eraldi punkti: 4.2 (ääretulelaternad) ja
--    4.14 (päevatulelaternad, punktid 4.14.1–4.14.2), viimane seemnest
--    täielikult puudus. Nimed parandatud, 4.14.1/4.14.2 lisatud.
-- 6) Grupp 7: Lisa 2 lõpeb punktiga 7.12 (ESC). Seemnes oli fabritseeritud
--    "7.13.1–7.13.3 eCall" — kustutatud (Lisa 2-s eCall'i ei ole).
-- 7) Grupp 8: Lisa 2-s on 8.4.1 "Nähtav suits" ja 8.4.2 "Vedelikulekked" kaks
--    eraldi punkti; seemnes oli ainult üks kirje koodiga 8.4.1, aga nimega
--    "Vedelikulekked" (s.o tegelikult 8.4.2 sisu). Kood parandatud 8.4.2-ks,
--    8.4.1 "Nähtav suits" lisatud uue kirjena.
-- 8) CAA_10 (veose kinnitamine) 2. taseme rikked lisatud eraldi changeset'is
--    20261120100001 (vt sealt) — Lisa 2 annab vaid koondrea "10.1 Veose
--    kinnitamise nõude rikkumine", detailistruktuur pärineb vana süsteemi
--    ekspordist (kasutaja p1/5/12/13 otsus: täismaht vana süsteemi järgi).
-- 9) Changeset 20260910224500 (RSI-teate järgi tehtud, LJVIS2-72) nimetas
--    CAA_10 ümber "sõiduki sobivuseks", aegus CAA_11 ("muu") ja lisas UUE
--    1. taseme grupi CAA_20 ("kinnitusmeetodid") — see on täpselt kasutaja
--    p1 kirjeldatud viga ("Arendatud on punktid 10 ja 20"; "ei saa lähtuda
--    RSI teates toodud sõnastustest"). Parandus: CAA_10 nimi juba parandatud
--    ülal (punkt 1); CAA_11 taasaktiveeritakse; CAA_20 aegub (soft-delete,
--    kuna vormide JSONB-snapshotid võivad ajalooliselt sellele viidata —
--    kinnitusmeetodid on nüüd CAA_10 2. taseme alamstruktuur, vt 20261120100001).

-- CAA_11 taasaktiveerimine (RSI-põhine changeset 20260910224500 aegustas selle)
UPDATE classifier.classifier_value
SET valid_until = NULL
WHERE code = 'CAA_11'
  AND parent_key IS NULL
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- CAA_20 (fabritseeritud RSI-põhine 1. taseme grupp) aegumine
UPDATE classifier.classifier_value
SET valid_until = CURRENT_DATE + 1
WHERE code = 'CAA_20'
  AND parent_key IS NULL
  AND (valid_until IS NULL OR valid_until > CURRENT_DATE + 1)
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);
--
-- NB: uute/parandatud kirjete raskusastmed (description = VO/OV/EOV loend)
-- on tuletatud analoogia korras olemasolevast mustrist ja vajavad enne
-- toodangut Transpordiameti / valdkonnaeksperdi ülevaatust, samamoodi nagu
-- kogu 20261020110000 seeme.

-- 1) CAA_10/CAA_11 nimede vahetus
UPDATE classifier.classifier_value
SET name = 'veose kinnitamine'
WHERE code = 'CAA_10'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET name = 'muu'
WHERE code = 'CAA_11'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- 2) CAA_0.3 / CAA_0.4 kustutamine (Lisa 2 punktis 0 ei eksisteeri)
DELETE FROM classifier.classifier_value
WHERE code IN ('CAA_0.3', 'CAA_0.4')
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- 3) Grupp 2 nummerduse nihe (2.6 enne 2.5, et vältida unikaalsuse konflikti)
UPDATE classifier.classifier_value
SET code = 'CAA_2.6'
WHERE code = 'CAA_2.5'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET code = 'CAA_2.5'
WHERE code = 'CAA_2.4'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- 4) Grupp 3 fabritseeritud kirje kustutamine
DELETE FROM classifier.classifier_value
WHERE code = 'CAA_3.7'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- 5) Grupp 4 nimede parandus (ääretulelaternad eraldi päevatulelaternatest)
UPDATE classifier.classifier_value
SET name = '4.2.1 Ääretulelaternad — seisund ja toimimine'
WHERE code = 'CAA_4.2.1'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET name = '4.2.2 Ääretulelaternad — lülitamine'
WHERE code = 'CAA_4.2.2'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET name = '4.2.3 Ääretulelaternad — vastavus nõuetele'
WHERE code = 'CAA_4.2.3'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

UPDATE classifier.classifier_value
SET name = '4.12 Mittekohustuslikud laternad, valgustusseadmed ja helkurid'
WHERE code = 'CAA_4.12'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- 6) Grupp 7 fabritseeritud eCall-kirjete kustutamine
DELETE FROM classifier.classifier_value
WHERE code IN ('CAA_7.13.1', 'CAA_7.13.2', 'CAA_7.13.3')
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- 7) Grupp 8: 8.4.1 -> 8.4.2, uus 8.4.1 lisatud allpool
UPDATE classifier.classifier_value
SET code = 'CAA_8.4.2', name = '8.4.2 Vedelikulekked'
WHERE code = 'CAA_8.4.1'
  AND classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1);

-- Uued kirjed (4.14.1/4.14.2, 8.4.1)
INSERT INTO classifier.classifier_value (
    classifier_value_key, classifier_key, code, name, description,
    parent_key, valid_from, valid_until, created_by
)
SELECT
    nextval('classifier.seq_classifier_value_key'),
    parent.classifier_key,
    t.defect_code,
    t.defect_name,
    t.severities,
    parent.classifier_value_key,
    CURRENT_DATE,
    NULL,
    'system'
FROM (VALUES
        ('CAA_4', 'CAA_4.14.1', '4.14.1 Päevatulelaternad — seisund ja toimimine', 'VO,OV'),
        ('CAA_4', 'CAA_4.14.2', '4.14.2 Päevatulelaternad — vastavus nõuetele', 'VO,OV'),
        ('CAA_8', 'CAA_8.4.1', '8.4.1 Nähtav suits', 'VO,OV')
) AS t(parent_code, defect_code, defect_name, severities)
JOIN classifier.classifier_value parent
  ON parent.code = t.parent_code
 AND parent.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1)
 AND parent.parent_key IS NULL
WHERE NOT EXISTS (
    SELECT 1 FROM classifier.classifier_value existing
    WHERE existing.code = t.defect_code
      AND existing.classifier_key = parent.classifier_key
);
