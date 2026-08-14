-- liquibase formatted sql
-- changeset ljvis:20260820100000 ignore:true splitStatements:false
--
-- LJVIS2-64 §4.3 "Korduva vastuse käsitlus": if an identical substantive response arrives
-- twice for the same outgoing NCR request (correlated by workflow_id), the second delivery
-- must be acknowledged but NOT stored as a second snapshot. This partial unique index
-- enforces that at the database level, mirroring uq_rsi_outbound_response_workflow_id.
--
CREATE UNIQUE INDEX uq_ncr_outbound_response_workflow_id
    ON erru.ncr_message (workflow_id)
    WHERE status = 'responded' AND direction = 'outgoing';

COMMENT ON INDEX erru.uq_ncr_outbound_response_workflow_id IS 'Idempotency for the asynchronous substantive NCR response (LJVIS2-64 §4.3). At most one responded snapshot per workflow_id — a duplicate delivery is detected by inbound-response.yml before the INSERT and acknowledged without re-applying.';
