-- liquibase formatted sql
-- changeset ljvis:20260827100000 ignore:true

-- LJVIS2-150/151/152: Riskiskoori moodul (EU rakendusmäärus 2022/695).
-- Insert-only, historical table: a company's score is NEVER updated in place —
-- every recalculation (kontrollvorm avaldamine | öine ümberarvutus | admin) adds
-- a NEW row, so past results remain queryable together with the
-- algorithm_version that produced them (see docs/risk-score/formula.md).
CREATE SCHEMA IF NOT EXISTS risk;

CREATE TABLE IF NOT EXISTS risk.company_risk_score (
    id                   BIGSERIAL      NOT NULL,
    company_reg_code     VARCHAR(20)    NOT NULL,
    company_name         VARCHAR(300),
    risk_score           NUMERIC(12,4),               -- NULL kui r=0 (Hall)
    risk_band_code       VARCHAR(20)    NOT NULL,      -- Hall|Roheline|Kollane|Punane
    total_controls       INTEGER        NOT NULL DEFAULT 0,  -- r
    g_factor             NUMERIC(4,2)   NOT NULL DEFAULT 1.0,
    window_start         DATE           NOT NULL,
    window_end           DATE           NOT NULL,
    calculation_trigger  VARCHAR(50)    NOT NULL,      -- kontrollvorm|admin|ooine_ymberarvutus
    algorithm_version    VARCHAR(30)    NOT NULL DEFAULT '2022-695-v1',
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    created_by           VARCHAR(100)   NOT NULL DEFAULT 'system',
    CONSTRAINT pk_company_risk_score PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_crs_reg_code_ts ON risk.company_risk_score (company_reg_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crs_risk_band   ON risk.company_risk_score (risk_band_code);
