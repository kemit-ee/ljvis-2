-- Refuse rollback while the new lifecycle states still exist. Keep classifier history.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM erru.rsi_message WHERE status IN ('sending','send_unknown'))
 OR EXISTS (SELECT 1 FROM erru.xml_rsi_dispatch) THEN
  RAISE EXCEPTION 'RSI send history requires the outbound lifecycle migration';
 END IF;
END $$;
DROP FUNCTION IF EXISTS erru.rsi_begin_send(BIGINT, INTEGER, TEXT);
DROP TRIGGER IF EXISTS trg_guard_rsi_snapshot ON erru.rsi_message;
DROP FUNCTION IF EXISTS erru.guard_rsi_snapshot();
ALTER TABLE erru.rsi_message DROP CONSTRAINT IF EXISTS chk_rsi_status;
ALTER TABLE erru.rsi_message ADD CONSTRAINT chk_rsi_status CHECK
 (status IN ('initiated','sent','responded','received','answered','error'));
ALTER TABLE erru.rsi_message DROP CONSTRAINT IF EXISTS chk_rsi_status_matches_direction;
ALTER TABLE erru.rsi_message ADD CONSTRAINT chk_rsi_status_matches_direction CHECK
 (status = 'error' OR (direction = 'outgoing' AND status IN ('initiated','sent','responded'))
 OR (direction = 'incoming' AND status IN ('received','answered')));

DROP TABLE IF EXISTS erru.xml_rsi_dispatch;
