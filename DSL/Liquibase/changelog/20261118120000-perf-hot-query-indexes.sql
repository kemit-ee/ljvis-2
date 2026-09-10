-- liquibase formatted sql
-- changeset ljvis:20261118120000 splitStatements:false
--
-- Jõudlus (Faas 4f): osalised indeksid kuumadele päringutele, mis muidu
-- skaneerivad kogu snapshot-tabelit.

-- risk_score/calculate_risk_score.sql — enforcement_dates CTE ja lõpp-subquery:
-- WHERE company_reg_code = :x AND status = 'published', MIN(created_at) per key.
-- Olemasolev idx_cf_company_reg_code on mitte-osaline ega kata created_at'i.
CREATE INDEX IF NOT EXISTS idx_cf_company_published
  ON forms.compound_form (company_reg_code, compound_form_key, created_at)
  WHERE status = 'published';

-- erru/cgr/search.sql — `latest` CTE: DISTINCT ON (cgr_request_key)
-- WHERE direction = 'outgoing' ORDER BY cgr_request_key, created_at DESC.
-- Ühendab idx_cgr_key_ts + idx_cgr_direction ühte osalisse indeksisse.
CREATE INDEX IF NOT EXISTS idx_cgr_outgoing_key_ts
  ON erru.cgr_request (cgr_request_key, created_at DESC)
  WHERE direction = 'outgoing';
