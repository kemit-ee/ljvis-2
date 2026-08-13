-- liquibase formatted sql
-- changeset ljvis:20260803160000 ignore:true
--
-- Test/dev-only seed for LJVIS2-72 (vehicle/trailer technical-check sub-forms).
--
-- TECHNICAL_CHECK level-1 (the 12 part/assembly rows, real codes+names from the
-- LJVIS2-72 analysis document) is seeded in the PRODUCTION changelog
-- (20260803150000-initial-technical-check-form.sql).
--
-- The rows below are level-2 DEFECTS (2. taseme rikked, shown in the "Ei vasta
-- nõuetele" modal). The source document does not enumerate the full EU Directive
-- 2014/47/EU Annex II item list, so this is a PLACEHOLDER subset (a few
-- representative defects per part) sufficient to exercise the UI/automation
-- logic end-to-end in dev/test. Real Annex II item codes/names must be entered
-- via the classifier admin UI before go-live — do NOT copy this file into the
-- production changelog as-is.
--
-- classifier_value.description stores the comma-separated list of severities
-- (VO/OV/EOV) applicable to that defect (same convention as EU_INFRINGEMENT's
-- description column storing MSI/VSI/SI category) — "Osal riketel on kohaldatav
-- ainult üks raskusaste, osal mitu" (LJVIS2-72 §4).

INSERT INTO classifier.classifier_value (classifier_value_key, classifier_key, code, name, description, parent_key, valid_from, valid_until, created_by)
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
    ('CAA_0', 'CAA_0.1', '1.1 Sõiduki tunnusandmed ei ühti dokumentidega [PLACEHOLDER]', 'VO,OV,EOV'),
    ('CAA_0', 'CAA_0.2', '1.2 Registreerimismärk puudub või on loetamatu [PLACEHOLDER]', 'VO,OV'),
    ('CAA_1', 'CAA_1.1', '1.2.1 Toimimine (S) [PLACEHOLDER]', 'VO,OV,EOV'),
    ('CAA_1', 'CAA_1.2', '1.2.2 Seisund (S) [PLACEHOLDER]', 'VO,OV,EOV'),
    ('CAA_1', 'CAA_1.3', '1.3 Piduritoru lekib [PLACEHOLDER]', 'OV,EOV'),
    ('CAA_2', 'CAA_2.1', '2.1 Roolihoovastiku mehaaniline seisund [PLACEHOLDER]', 'VO,OV,EOV'),
    ('CAA_2', 'CAA_2.2', '2.2 Roolivõimendi rikkis [PLACEHOLDER]', 'OV,EOV'),
    ('CAA_3', 'CAA_3.1', '3.1 Klaasipuhastid ei tööta [PLACEHOLDER]', 'VO,OV'),
    ('CAA_3', 'CAA_3.2', '3.2 Vaateväli piiratud [PLACEHOLDER]', 'OV,EOV'),
    ('CAA_4', 'CAA_4.1', '4.1 Esituled ei tööta nõuetekohaselt [PLACEHOLDER]', 'VO,OV,EOV'),
    ('CAA_4', 'CAA_4.2', '4.2 Elektrijuhtmestik on kahjustatud [PLACEHOLDER]', 'OV,EOV'),
    ('CAA_5', 'CAA_5.1', '5.1 Rehvi mustri sügavus ei vasta nõuetele [PLACEHOLDER]', 'VO,OV,EOV'),
    ('CAA_5', 'CAA_5.2', '5.2 Vedrustuse osa on murdunud [PLACEHOLDER]', 'OV,EOV'),
    ('CAA_6', 'CAA_6.1', '6.1 Šassii on korrodeerunud [PLACEHOLDER]', 'VO,OV,EOV'),
    ('CAA_6', 'CAA_6.2', '6.2 Kinnitus on lahti tulnud [PLACEHOLDER]', 'OV,EOV'),
    ('CAA_7', 'CAA_7.1', '7.1 Sõidumeerik ei ole plommitud [PLACEHOLDER]', 'OV,EOV'),
    ('CAA_7', 'CAA_7.2', '7.2 Kiiruspiirik ei vasta nõuetele [PLACEHOLDER]', 'OV,EOV'),
    ('CAA_8', 'CAA_8.1', '8.1 Heitgaaside tase ületab piirmäära [PLACEHOLDER]', 'VO,OV,EOV'),
    ('CAA_8', 'CAA_8.2', '8.2 Kütuse- või õlileke [PLACEHOLDER]', 'OV,EOV'),
    ('CAA_9', 'CAA_9.1', '9.1 Hädaväljapääs ei ole kasutuskõlblik [PLACEHOLDER]', 'OV,EOV'),
    ('CAA_9', 'CAA_9.2', '9.2 Tulekustuti puudub [PLACEHOLDER]', 'VO,OV'),
    ('CAA_11', 'CAA_11.1', '11.1 Veos ei ole nõuetekohaselt kinnitatud [PLACEHOLDER]', 'VO,OV,EOV'),
    ('CAA_11', 'CAA_11.2', '11.2 Kinnitusvahend on kahjustatud [PLACEHOLDER]', 'VO,OV'),
    ('CAA_10', 'CAA_10.1', '10.1 Muu tuvastatud puudus [PLACEHOLDER]', 'VO,OV,EOV')
) AS t(part_code, defect_code, defect_name, severities)
JOIN classifier.classifier_value parent
    ON parent.code = t.part_code
   AND parent.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1)
   AND parent.parent_key IS NULL
WHERE NOT EXISTS (
    SELECT 1 FROM classifier.classifier_value existing
    WHERE existing.code = t.defect_code
      AND existing.classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code = 'TECHNICAL_CHECK' ORDER BY created_at DESC LIMIT 1)
);
