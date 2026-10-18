-- liquibase formatted sql
-- changeset ljvis:20261217100000 ignore:true splitStatements:false
--
-- Haldusmenetluse andmeplokk ("Haldusmenetlus seoses raskete autoveoalaste
-- rikkumistega") PPA andmevormidele (juht, meeskonnaliige, sõiduk, haagis, ADR)
-- ja Transpordiameti kontrollkaardile. VR-kontrollkaardil jäävad plokiväljad
-- oma vormitabelisse (20261101110000).
--
-- Plokk on vormi versioonidest sõltumatu: üks rida vormi võtme kohta, muudetav
-- sõltumata vormi staatusest. Nähtav ja täidetav Transpordiameti (TRAM) ja Kliimaministeeriumi (KLIM)
-- ametnikule ja administraatorile; PPA ametnik plokki ei näe (use-case I-44).

CREATE TABLE IF NOT EXISTS forms.administrative_procedure (
    form_type                      TEXT        NOT NULL,
    form_key                       BIGINT      NOT NULL,
    klim_clarification_date        DATE,
    carrier_explanation_date       DATE,
    penalty_valid_until            DATE,
    penalty_expired_or_processed   BOOLEAN     NOT NULL DEFAULT FALSE,
    akvk_next_meeting_date         DATE,
    commission_last_decision_date  DATE,
    admin_procedure_decision       TEXT,
    created_by                     TEXT        NOT NULL,
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by                     TEXT        NOT NULL,
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (form_type, form_key),
    CONSTRAINT administrative_procedure_form_type_check CHECK (form_type IN (
        'adr-form', 'drive-rest-form/driver', 'drive-rest-form/teammate',
        'trailer-technical', 'tram-card', 'vehicle-technical'))
);

COMMENT ON TABLE forms.administrative_procedure IS 'Haldusmenetluse andmeplokk PPA andmevormidele ja Transpordiameti kontrollkaardile; form_key = vormi *_key veerg';
