-- liquibase formatted sql
-- changeset ljvis:20261120130000-rollback ignore:true

ALTER TABLE forms.vehicle_technical_form
    DROP COLUMN IF EXISTS transport_interruption_autovs_51_3_1;

ALTER TABLE forms.trailer_technical_form
    DROP COLUMN IF EXISTS transport_interruption_autovs_51_3_1;
