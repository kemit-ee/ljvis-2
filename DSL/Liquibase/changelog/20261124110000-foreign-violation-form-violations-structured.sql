-- liquibase formatted sql
-- changeset ljvis:20261124110000 ignore:true splitStatements:false
--
-- VR-kontrollkaart: rikkumisepõhine "Kontrolli tulemus" (NCR->kaart andmeülekande
-- testimise plaan, p.2). `violations` JSONB kuju muutub lamedast koodide
-- string-massiivist objektide massiiviks, kus igal rikkumisel on oma sanktsioon:
--   ["MSI101","VSI800"]
--   -->
--   [{"code":"MSI101","sanctionCode":"...","sanctionNotes":"...",
--     "recommendedMeasureCode":"...","recommendedMeasureNotes":"..."}, ...]
--
-- Top-level sanction_code/sanction_notes/additional_sanction_codes/
-- recommended_measure_code/recommended_measure_notes JÄÄVAD ALLES kui "üldine
-- kontrolli tulemus" fallback, kasutusel kui violations on tühi (nt ainult
-- kergemad rikkumised või rikkumisi pole).
--
-- Migreerib olemasolevad read lamedast kujust struktureeritud kujule.
--

UPDATE forms.foreign_violation_form
SET violations = (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('code', v)), '[]'::JSONB)
    FROM jsonb_array_elements_text(violations) v
)
WHERE jsonb_typeof(violations) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(violations) e
    WHERE jsonb_typeof(e) = 'string'
  );

COMMENT ON COLUMN forms.foreign_violation_form.violations IS
    'JSONB array of per-violation objects: [{"code":"MSI101","sanctionCode":"...",'
    '"sanctionNotes":"...","recommendedMeasureCode":"...","recommendedMeasureNotes":"..."}].'
    ' code = EU 1071/2009 violation code (MSI/VSI/SI + number), same value space as the'
    ' previous flat string array. Front-end still groups by severity using the'
    ' EU_VIOLATION_GROUPS classifier-backed constant. Empty array = no violations selected,'
    ' in which case sanction_code/recommended_measure_code (top-level, "general result")'
    ' apply as fallback. Migrated from a flat string array 2026-11-21 (NCR transfer test plan p.2).';
