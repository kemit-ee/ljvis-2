-- liquibase formatted sql
-- changeset ljvis:20261021100000 ignore:true splitStatements:false
--
-- LJVIS2-64 laiendus: automaatne NCR (NotifyCheckResult) väljasaatmine.
--
-- Kui autojuhi / meeskonnaliikme sõidu- ja puhkeaja alamvorm on AVALIKUSTATUD
-- (status='published') ja kontrolli tulemus on KORRAS (result_type='ok') ning
-- sõiduk on välisriigi oma (compound_form.vehicle_country_code täidetud ja
-- <> 'EE'), saadab öine CronManager töö automaatselt NCR teate sõiduki
-- registreerimisriiki (DSL/Ruuter.internal/.../cron/erru-ncr-autodispatch.yml).
--
-- See tabel on dispatch-logi = idempotentsuse võti. Üks rida iga alamvormi
-- kohta, mille kohta cron on NCR-i loomist proovinud (õnnestus või mitte).
-- Kandidaadipäring (select-autodispatch-candidates.sql) välistab iga
-- alamvormi, millel on siin juba rida — nii ei saadeta sama kontrolli kohta
-- teist NCR-i. erru.ncr_message skeemi ei muudeta; see logi on eraldiseisev.
--
-- INSERT-only nagu ülejäänud erru skeem; UPDATE/DELETE puuduvad.

CREATE TABLE erru.ncr_autodispatch_log (
    id                  BIGSERIAL       NOT NULL,
    sp_form_key         BIGINT          NOT NULL,
    sp_form_type        VARCHAR(10)     NOT NULL,   -- 'driver' | 'teammate'
    business_case_id    VARCHAR(36),                -- loodud NCR teate äriidentifikaator; NULL kui build ebaõnnestus
    ncr_to              CHAR(2),                    -- sihtriik (sõiduki registreerimisriik)
    outcome             VARCHAR(20)     NOT NULL,   -- 'acknowledged' | 'error' | 'build_failed'
    error_message       TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by          VARCHAR(100)    NOT NULL DEFAULT 'erru-cron',

    CONSTRAINT pk_ncr_autodispatch_log PRIMARY KEY (id)
);

COMMENT ON TABLE  erru.ncr_autodispatch_log IS 'LJVIS2-64: dispatch-logi automaatsele NCR väljasaatmisele. Üks rida per SP alamvorm, mille kohta cron on NCR loomist proovinud. Idempotentsuse võti — kandidaadipäring välistab alamvormid, millel siin juba rida. INSERT-only.';
COMMENT ON COLUMN erru.ncr_autodispatch_log.sp_form_key IS 'forms.sp_driver_form.sp_driver_form_key või forms.sp_teammate_form.sp_teammate_form_key (vastavalt sp_form_type). Loose BIGINT, ilma FK-ta (snapshot-tabel).';
COMMENT ON COLUMN erru.ncr_autodispatch_log.sp_form_type IS 'driver = sp_driver_form; teammate = sp_teammate_form.';
COMMENT ON COLUMN erru.ncr_autodispatch_log.business_case_id IS 'Loodud erru.ncr_message.business_case_id (NCR-EE-AAAA-NNNNN). NULL kui build.sql ei tagastanud rida (outcome=build_failed).';
COMMENT ON COLUMN erru.ncr_autodispatch_log.ncr_to IS 'NCR sihtriik = compound_form.vehicle_country_code kontrolli hetkel.';
COMMENT ON COLUMN erru.ncr_autodispatch_log.outcome IS 'acknowledged = ERRU hub kinnitas vastuvõtu (initiated -> sent -> acknowledged); error = negatiivne ack või transpordiviga (NCR jäi olekusse error, ametnik saadab käsitsi uuesti); build_failed = eeltäitmine ebaõnnestus, NCR teadet ei loodud.';
COMMENT ON COLUMN erru.ncr_autodispatch_log.created_by IS 'Alati erru-cron (süsteemne, kasutajaseansita).';

-- Idempotentsus: üks katse per alamvorm. Transpordivead lahendab ametnik
-- olemasoleva NCR teate käsitsi uuesti-saatmisega (send.yml), mitte cron.
CREATE UNIQUE INDEX uq_ncr_autodispatch_sp_form ON erru.ncr_autodispatch_log (sp_form_key, sp_form_type);
CREATE INDEX idx_ncr_autodispatch_bcid ON erru.ncr_autodispatch_log (business_case_id);
