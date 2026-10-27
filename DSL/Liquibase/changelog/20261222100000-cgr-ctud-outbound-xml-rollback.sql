-- liquibase formatted sql
-- changeset ljvis:20261222100000-rollback ignore:true splitStatements:false
-- Refuse rollback while the new lifecycle states or transport history exist. Keep classifier history.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM erru.cgr_request WHERE status IN ('sending','send_unknown','responded'))
 OR EXISTS (SELECT 1 FROM erru.ctud_request WHERE status IN ('sending','send_unknown'))
 OR EXISTS (SELECT 1 FROM erru.xml_outbound_dispatch) THEN
  RAISE EXCEPTION 'CGR/CTUD send history requires the outbound XML lifecycle migration';
 END IF;
END $$;
DROP FUNCTION IF EXISTS erru.cgr_apply_response(UUID, JSONB);
DROP FUNCTION IF EXISTS erru.cgr_begin_send(BIGINT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS erru.ctud_begin_send(BIGINT, TEXT);
DROP INDEX IF EXISTS erru.idx_cgr_outgoing_workflow;
DROP INDEX IF EXISTS erru.idx_ctud_outgoing_workflow;
ALTER TABLE erru.cgr_request DROP CONSTRAINT IF EXISTS chk_cgr_status;
ALTER TABLE erru.cgr_request ADD CONSTRAINT chk_cgr_status CHECK
 (status IN ('initiated','sent','received','answered','error'));
ALTER TABLE erru.cgr_request DROP CONSTRAINT IF EXISTS chk_cgr_status_matches_direction;
ALTER TABLE erru.cgr_request ADD CONSTRAINT chk_cgr_status_matches_direction CHECK
 (status = 'error' OR (direction = 'outgoing' AND status IN ('initiated','sent'))
 OR (direction = 'incoming' AND status IN ('received','answered')));
ALTER TABLE erru.ctud_request DROP CONSTRAINT IF EXISTS chk_ctud_status;
ALTER TABLE erru.ctud_request ADD CONSTRAINT chk_ctud_status CHECK
 (status IN ('initiated','sent','responded','received','answered','error'));
ALTER TABLE erru.ctud_request DROP CONSTRAINT IF EXISTS chk_ctud_status_matches_direction;
ALTER TABLE erru.ctud_request ADD CONSTRAINT chk_ctud_status_matches_direction CHECK
 (status = 'error' OR (direction = 'outgoing' AND status IN ('initiated','sent','responded'))
 OR (direction = 'incoming' AND status IN ('received','answered')));
DROP TABLE IF EXISTS erru.xml_outbound_dispatch;
