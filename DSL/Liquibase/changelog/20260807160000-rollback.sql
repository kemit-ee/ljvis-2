-- liquibase formatted sql
-- changeset ljvis:20260807160000-rollback ignore:true

ALTER TABLE forms.vehicle_technical_form
    DROP CONSTRAINT chk_vtf_status;

ALTER TABLE forms.vehicle_technical_form
    ADD CONSTRAINT chk_vtf_status CHECK (status IN ('saved', 'confirmed', 'published'));

ALTER TABLE forms.trailer_technical_form
    DROP CONSTRAINT chk_ttf_status;

ALTER TABLE forms.trailer_technical_form
    ADD CONSTRAINT chk_ttf_status CHECK (status IN ('saved', 'confirmed', 'published'));

ALTER TABLE forms.kv_form
    DROP CONSTRAINT chk_kv_status;

ALTER TABLE forms.kv_form
    ADD CONSTRAINT chk_kv_status CHECK (status IN ('saved', 'confirmed', 'published'));

ALTER TABLE forms.adr_form
    DROP CONSTRAINT chk_adr_status;

ALTER TABLE forms.adr_form
    ADD CONSTRAINT chk_adr_status CHECK (status IN ('saved', 'confirmed', 'published'));

ALTER TABLE forms.labour_inspection_form
    DROP CONSTRAINT chk_lif_status;

ALTER TABLE forms.labour_inspection_form
    ADD CONSTRAINT chk_lif_status CHECK (status IN ('saved', 'confirmed', 'deleted'));
