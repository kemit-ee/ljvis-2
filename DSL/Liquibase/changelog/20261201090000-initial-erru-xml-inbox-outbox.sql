-- liquibase formatted sql
-- changeset ljvis:20261201090000 ignore:true splitStatements:false
--
-- Durable transport-level inbox/outbox for the asynchronous ERRU 3.5 XML over HTTP exchange
-- (erru-xml-adapter, docs/architecture/erru-async-xml.md).
--
-- Design notes (traceable to docs/architecture/erru-async-xml.md):
--   - One inbox table for all 5 message types; message_type is the ERRU root element local name
--     (e.g. 'NotifyUnfitness_Request'), not a per-type table, since the Java ingress dispatches by
--     type in-process and doesn't need per-type DB schemas to do so.
--   - technical_id is globally unique per the ERRU spec ("A UUID uniquely identifying each
--     individual message" — Global_Types.xsd globalHeaderType/@technicalId).
--   - payload_digest (sha256 of the raw XML bytes) distinguishes an exact redelivery of the same
--     message from a NEW message that reused an already-seen technicalId with different content
--     (the "conflicting replay" case).
--   - status values follow the replay outcomes: 'received'
--     (durably accepted, business processing not yet complete — resume from here on redelivery),
--     'processing' (claimed by a worker, see lease columns), 'processed' (business effects
--     complete, response/ack persisted — replay from here returns the same result), 'failed'
--     (attempts exhausted, needs manual recovery), 'conflict' (same technical_id, different
--     payload_digest — never auto-resolved).
--   - claimed_by/claimed_at/lease_expires_at implement the claim/lease pattern
--     (SELECT ... FOR UPDATE SKIP LOCKED + owner token), so a
--     worker that resumes after its lease expired cannot clobber a result already produced by
--     whichever worker claimed it next.
--   - deadline_at is populated from Header/@timeoutValue when present; a ten-second
--     local response window is used when the sender omits it.
--   - raw_xml is stored verbatim so a Java-side reprocessing/replay can re-run the exact mapper
--     logic against the exact original bytes if a mapping bug is fixed later.
--
-- Outbox mirrors the same claim/lease/retry shape for the OUTGOING XML response/ack, with its own
-- fresh technical_id (never the inbound message's technical_id — reusing it would be a correlation
-- bug).

CREATE SCHEMA IF NOT EXISTS erru;

CREATE TABLE erru.xml_inbox (
    id                    BIGSERIAL       NOT NULL,
    message_type          VARCHAR(50)     NOT NULL,
    schema_version        VARCHAR(10)     NOT NULL DEFAULT '3.5',
    transport_peer        VARCHAR(100),
    technical_id          UUID            NOT NULL,
    workflow_id           UUID,
    business_case_id      VARCHAR(36),
    raw_xml               TEXT            NOT NULL,
    payload_digest        VARCHAR(64)     NOT NULL,
    received_at           TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deadline_at           TIMESTAMPTZ,
    status                VARCHAR(20)     NOT NULL DEFAULT 'received',
    attempts              INTEGER         NOT NULL DEFAULT 0,
    next_attempt_at       TIMESTAMPTZ,
    claimed_by            VARCHAR(100),
    claimed_at            TIMESTAMPTZ,
    lease_expires_at      TIMESTAMPTZ,
    last_error            TEXT,
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by            VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_xml_inbox PRIMARY KEY (id)
);

COMMENT ON TABLE  erru.xml_inbox IS 'Durable transport-level inbox for all incoming ERRU 3.5 XML messages (CGR/CTUD/RSI/NCR/NU requests). See docs/architecture/erru-async-xml.md.';
COMMENT ON COLUMN erru.xml_inbox.message_type IS 'ERRU root element local name, e.g. NotifyUnfitness_Request, CheckGoodRepute_Request.';
COMMENT ON COLUMN erru.xml_inbox.transport_peer IS 'Claimed sender identity at the transport layer (NOT a trusted business identity — the Hub may relay messages on behalf of any member state).';
COMMENT ON COLUMN erru.xml_inbox.technical_id IS 'globalHeaderType/@technicalId. Globally unique per ERRU spec; see uq_xml_inbox_technical_id.';
COMMENT ON COLUMN erru.xml_inbox.raw_xml IS 'Exact received bytes (decoded as text). Never mutated. Enables replay/reprocessing independent of the parsed columns.';
COMMENT ON COLUMN erru.xml_inbox.payload_digest IS 'sha256(raw_xml), hex-encoded. Distinguishes an exact redelivery from a conflicting payload reusing the same technical_id.';
COMMENT ON COLUMN erru.xml_inbox.received_at IS 'Immutable timestamp of first durable acceptance. Never updated by a redelivery.';
COMMENT ON COLUMN erru.xml_inbox.deadline_at IS 'Derived from globalHeaderType/@timeoutValue when present. Ingress defaults to a ten-second response window when omitted.';
COMMENT ON COLUMN erru.xml_inbox.status IS 'received = durably accepted, business processing not complete (resume from here). processing = claimed by a worker (see claimed_by/lease_expires_at). processed = business effects complete, response persisted (replay returns the same result). failed = attempts exhausted, needs manual recovery. conflict = same technical_id, different payload_digest — never auto-resolved.';
COMMENT ON COLUMN erru.xml_inbox.claimed_by IS 'Opaque worker/process identifier holding the current lease. NULL when unclaimed.';
COMMENT ON COLUMN erru.xml_inbox.lease_expires_at IS 'A worker whose lease has expired must not act on stale claim state; a later claimant is authoritative.';

CREATE UNIQUE INDEX uq_xml_inbox_technical_id ON erru.xml_inbox (technical_id);
CREATE INDEX idx_xml_inbox_status_next_attempt ON erru.xml_inbox (status, next_attempt_at);
CREATE INDEX idx_xml_inbox_message_type ON erru.xml_inbox (message_type);
CREATE INDEX idx_xml_inbox_workflow_id ON erru.xml_inbox (workflow_id);
CREATE INDEX idx_xml_inbox_lease_expires_at ON erru.xml_inbox (lease_expires_at) WHERE status = 'processing';

ALTER TABLE erru.xml_inbox
    ADD CONSTRAINT chk_xml_inbox_status CHECK (status IN ('received', 'processing', 'processed', 'failed', 'conflict')),
    ADD CONSTRAINT chk_xml_inbox_attempts_non_negative CHECK (attempts >= 0);

CREATE TABLE erru.xml_outbox (
    id                    BIGSERIAL       NOT NULL,
    inbox_id              BIGINT,
    message_type          VARCHAR(50)     NOT NULL,
    technical_id          UUID            NOT NULL,
    workflow_id           UUID            NOT NULL,
    business_case_id      VARCHAR(36),
    destination           VARCHAR(100)    NOT NULL,
    xml_body              TEXT            NOT NULL,
    status                VARCHAR(20)     NOT NULL DEFAULT 'pending',
    attempts              INTEGER         NOT NULL DEFAULT 0,
    next_attempt_at       TIMESTAMPTZ,
    claimed_by            VARCHAR(100),
    claimed_at            TIMESTAMPTZ,
    lease_expires_at      TIMESTAMPTZ,
    deadline_at           TIMESTAMPTZ,
    delivered_at          TIMESTAMPTZ,
    last_error            TEXT,
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    created_by            VARCHAR(100)    NOT NULL DEFAULT 'system',
    CONSTRAINT pk_xml_outbox PRIMARY KEY (id),
    CONSTRAINT fk_xml_outbox_inbox FOREIGN KEY (inbox_id) REFERENCES erru.xml_inbox (id)
);

COMMENT ON TABLE  erru.xml_outbox IS 'Durable transport-level outbox for the XML Response/Acknowledgement produced in answer to one erru.xml_inbox row. See docs/architecture/erru-async-xml.md.';
COMMENT ON COLUMN erru.xml_outbox.inbox_id IS 'The inbound message this response answers. Nullable to allow future non-request-triggered outbound messages (none in the current 5-message scope), but always set in practice today.';
COMMENT ON COLUMN erru.xml_outbox.technical_id IS 'A FRESH technicalId generated for this outbound message. Never copied from the inbound row — reusing the inbound technical_id would be a correlation bug.';
COMMENT ON COLUMN erru.xml_outbox.workflow_id IS 'Copied from the inbound message''s workflowId — this is how the Hub correlates the response to the original request.';
COMMENT ON COLUMN erru.xml_outbox.xml_body IS 'Fully rendered, XSD-validated XML ready to send byte-for-byte on retry. Never regenerated between attempts.';
COMMENT ON COLUMN erru.xml_outbox.status IS 'pending = queued for delivery. sending = claimed by a delivery worker. delivered = Hub accepted delivery. failed = attempts exhausted. expired = deadline passed before successful delivery.';

CREATE UNIQUE INDEX uq_xml_outbox_technical_id ON erru.xml_outbox (technical_id);
-- One inbox row must never complete to more than one outbox row. Db#completeWithOutbox already
-- fences on the lease owner; this index is the backstop against two workers racing past an
-- expired lease (e.g. a slow Ruuter call outliving lease_expires_at) and producing two ACKs with
-- different outbound technicalIds for one inbound message.
CREATE UNIQUE INDEX uq_xml_outbox_inbox_id ON erru.xml_outbox (inbox_id) WHERE inbox_id IS NOT NULL;
CREATE INDEX idx_xml_outbox_status_next_attempt ON erru.xml_outbox (status, next_attempt_at);
CREATE INDEX idx_xml_outbox_lease_expires_at ON erru.xml_outbox (lease_expires_at) WHERE status = 'sending';

ALTER TABLE erru.xml_outbox
    ADD CONSTRAINT chk_xml_outbox_status CHECK (status IN ('pending', 'sending', 'delivered', 'failed', 'expired')),
    ADD CONSTRAINT chk_xml_outbox_attempts_non_negative CHECK (attempts >= 0);

-- LISTEN/NOTIFY wake-up signal. The payload is the row id only — never the XML body or any
-- personal data: the table is the source of truth, the notification is only a "go look" signal. A
-- worker that misses the notification (restart, disconnect) must still find the row via the
-- fallback scan on idx_xml_inbox_status_next_attempt.
CREATE OR REPLACE FUNCTION erru.notify_xml_inbox() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('erru_xml_inbox', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_xml_inbox
    AFTER INSERT ON erru.xml_inbox
    FOR EACH ROW EXECUTE FUNCTION erru.notify_xml_inbox();

CREATE OR REPLACE FUNCTION erru.notify_xml_outbox() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('erru_xml_outbox', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_xml_outbox
    AFTER INSERT ON erru.xml_outbox
    FOR EACH ROW EXECUTE FUNCTION erru.notify_xml_outbox();

COMMENT ON FUNCTION erru.notify_xml_inbox() IS 'Wakes up an idle Java worker via LISTEN erru_xml_inbox. Payload is the row id only.';
COMMENT ON FUNCTION erru.notify_xml_outbox() IS 'Wakes up an idle Java delivery worker via LISTEN erru_xml_outbox. Payload is the row id only.';
