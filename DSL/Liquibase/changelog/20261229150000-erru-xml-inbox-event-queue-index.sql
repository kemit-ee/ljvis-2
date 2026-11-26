-- liquibase formatted sql
-- changeset ljvis:20261229150000 ignore:true splitStatements:false
--
-- ERRU inbox queue scan (#771): xml-inbox/claim-due and xml-inbox/due-oneway read the open events of the last
-- 6 hours from erru.xml_inbox_event instead of the view erru.xml_inbox_current (the view computes max(seq) for
-- every inbox row ever received, so the scan grew with the whole history). This index serves that scan: the key
-- created_at bounds the window, the included columns let the queue conditions and the anti-join run from the index
-- alone (the event table is append-only, so the visibility map stays mostly all-visible).

CREATE INDEX IF NOT EXISTS idx_xml_inbox_event_open_created
    ON erru.xml_inbox_event (created_at)
    INCLUDE (inbox_id, seq, event_type, attempts, claimed_by, lease_expires_at, next_attempt_at)
 WHERE event_type IN ('received', 'processing');
