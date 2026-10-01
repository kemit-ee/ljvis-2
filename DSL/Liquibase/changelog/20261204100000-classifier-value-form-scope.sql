-- liquibase formatted sql
-- changeset ljvis:20261204100000 ignore:true
-- ADR-011: klassifikaatori väärtuste piiramine vormidele.
-- Ridu pole = väärtus on lubatud kõigil vormidel. Ridu on = ainult loetletud vormidel.
-- Seos püsiva classifier_value_key kaudu, mitte snapshot'i id kaudu, et väärtuse
-- muutmine (uus snapshot) piirangut ei kaotaks.

CREATE TABLE IF NOT EXISTS classifier.classifier_value_form_scope (
    classifier_value_key  BIGINT          NOT NULL,
    form_type_code        VARCHAR(100)    NOT NULL,
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by            VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_classifier_value_form_scope PRIMARY KEY (classifier_value_key, form_type_code)
);

COMMENT ON TABLE  classifier.classifier_value_form_scope IS 'ADR-011: vormid, millel klassifikaatori väärtus on valikus nähtav. Väärtusel ridu pole = nähtav kõigil vormidel. Muutmisel asendatakse nimekiri tervikuna; ajalugu auditilogis.';
COMMENT ON COLUMN classifier.classifier_value_form_scope.classifier_value_key IS 'classifier.classifier_value.classifier_value_key (püsiv loogiline võti). FK puudub — veerg pole snapshot-tabelis unikaalne.';
COMMENT ON COLUMN classifier.classifier_value_form_scope.form_type_code       IS 'FORM_TYPE klassifikaatori väärtuse kood (nt TI_KONTROLLKAART, SP_DRIVER_FORM). Olemasolu kontrollib Resql set_classifier_value_form_scope.';
COMMENT ON COLUMN classifier.classifier_value_form_scope.created_at           IS 'Rea loomise aeg';
COMMENT ON COLUMN classifier.classifier_value_form_scope.created_by           IS 'Tegija isikukood või süsteemi tunnus. FK puudub.';

CREATE INDEX IF NOT EXISTS idx_cvfs_form_type_code ON classifier.classifier_value_form_scope (form_type_code);
