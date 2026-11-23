-- liquibase formatted sql
-- changeset ljvis:20261228100000 ignore:true splitStatements:false
--
-- erru-xml-adapter (XTR): CGR / CTUD requests are answered asynchronously (MTR takes up to 35 s). The request flow
-- accepts the message durably and returns 202 at once; a ruuter-internal cron worker later builds the answer. The
-- worker needs the parsed request (XTR hands it over as JSON, the answer echoes parts of it), so it is stored here.

ALTER TABLE erru.xml_inbox ADD COLUMN request_json TEXT;

COMMENT ON COLUMN erru.xml_inbox.request_json IS 'XTR (erru-xml-adapter) JSON form of the request, stored only for asynchronously answered messages (CGR/CTUD). Never mutated. NULL for rows handled synchronously.';

CREATE INDEX idx_xml_inbox_async_due ON erru.xml_inbox (next_attempt_at)
    WHERE status = 'processing' AND claimed_by = 'erru-xml-adapter-xtr-async';
