-- liquibase formatted sql
-- changeset ljvis:20261205100000 ignore:true
-- ADR-011: klassifikaatori väärtuste piiramine vormidele.
--
-- INSERT-only (append-only), sama muster nagu classifier.classifier_value ja
-- users.user_group: ridu ei uuendata ega kustutata. Iga (väärtus, vorm) paari
-- kehtiv seis = viimane rida (DISTINCT ON (classifier_value_key, form_type_code)
-- ORDER BY created_at DESC, id DESC):
--   is_active = TRUE  → väärtus on sellel vormil lubatud;
--   is_active = FALSE → linnuke eemaldati, paari käsitletakse nagu rida puuduks.
-- Väärtusel pole ühtegi kehtivat is_active = TRUE paari → lubatud kõigil vormidel.
-- Seos püsiva classifier_value_key kaudu, mitte snapshot'i id kaudu, et väärtuse
-- muutmine (uus snapshot) piirangut ei kaotaks.

CREATE TABLE IF NOT EXISTS classifier.classifier_value_form_scope (
    id                    BIGSERIAL       NOT NULL,
    classifier_value_key  BIGINT          NOT NULL,
    form_type_code        VARCHAR(100)    NOT NULL,
    is_active             BOOLEAN         NOT NULL,
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by            VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_classifier_value_form_scope PRIMARY KEY (id)
);

COMMENT ON TABLE  classifier.classifier_value_form_scope IS 'ADR-011: INSERT-only. Vormid, millel klassifikaatori väärtus on valikus nähtav. Kehtiv seis = viimane rida paari (classifier_value_key, form_type_code) kohta; is_active = FALSE tähendab eemaldatud. Väärtusel kehtivaid is_active = TRUE paare pole = nähtav kõigil vormidel.';
COMMENT ON COLUMN classifier.classifier_value_form_scope.id                   IS 'Rea füüsiline primaarvõti; järjestuse viik-murdja sama created_at korral';
COMMENT ON COLUMN classifier.classifier_value_form_scope.classifier_value_key IS 'classifier.classifier_value.classifier_value_key (püsiv loogiline võti). FK puudub — veerg pole snapshot-tabelis unikaalne.';
COMMENT ON COLUMN classifier.classifier_value_form_scope.form_type_code       IS 'FORM_TYPE klassifikaatori väärtuse kood (nt TI_KONTROLLKAART, SP_DRIVER_FORM). Olemasolu kontrollib Resql set_classifier_value_form_scope.';
COMMENT ON COLUMN classifier.classifier_value_form_scope.is_active            IS 'TRUE = vorm lisati piirangusse; FALSE = vorm eemaldati piirangust';
COMMENT ON COLUMN classifier.classifier_value_form_scope.created_at           IS 'Rea loomise aeg; viimase seisu järjestusvõti';
COMMENT ON COLUMN classifier.classifier_value_form_scope.created_by           IS 'Tegija isikukood või süsteemi tunnus. FK puudub.';

CREATE INDEX IF NOT EXISTS idx_cvfs_key_code_ts
    ON classifier.classifier_value_form_scope (classifier_value_key, form_type_code, created_at DESC, id DESC);
