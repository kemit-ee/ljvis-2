-- liquibase formatted sql
-- changeset ljvis:20261112100000 ignore:true

DROP TABLE IF EXISTS forms.tram_control_card CASCADE;
DROP SEQUENCE IF EXISTS forms.seq_tram_control_card_number;
DROP SEQUENCE IF EXISTS forms.seq_tram_control_card_key;
