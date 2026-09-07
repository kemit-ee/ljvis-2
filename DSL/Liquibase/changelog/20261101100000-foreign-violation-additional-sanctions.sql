-- liquibase formatted sql
-- changeset ljvis:20261101100000 ignore:true splitStatements:false
--
-- VR-kontrollkaart: lisasanktsioonide JSONB veerg.
-- RS ettepanek (18.05.2026, rida 10): lisada võimalus märkida mitu erinevat
-- sanktsiooni. Primaarne sanktsioon jääb sanction_code veergu (kohustuslik,
-- üks väärtus). Lisasanktsioonid salvestatakse siia JSONB string-massiivina,
-- nt ["TRAHV","LIIKLEMISKEELD"]. Tühi massiiv = pole lisasanktsioone.
--

ALTER TABLE forms.foreign_violation_form
    ADD COLUMN IF NOT EXISTS additional_sanction_codes JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN forms.foreign_violation_form.additional_sanction_codes IS
    'Optional additional sanction codes beyond the primary sanction_code. '
    'JSON string array, e.g. [\"TRAHV\",\"LIIKLEMISKEELD\"]. Empty by default. '
    'RS proposal 18.05.2026 rida 10: multiple sanctions support.';
