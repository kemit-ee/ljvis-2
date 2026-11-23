-- liquibase formatted sql
-- changeset ljvis:20261229090000 ignore:true splitStatements:false
--
-- erru.xml_inbox becomes append-only (epic #522 / ADR-013: Resql templates are INSERT + SELECT only).
--
-- The receipt row (erru.xml_inbox) is immutable from now on. Everything that used to be updated in place (status,
-- attempts, claim, lease, retry time, last error) is an event row in erru.xml_inbox_event; the current state is
-- the newest event of a row (view erru.xml_inbox_current). Every state change is a compare-and-swap: an event
-- is inserted with seq = (seq of the event it was decided on) + 1, and the unique index (inbox_id, seq) lets
-- exactly one of two concurrent writers win (INSERT ... ON CONFLICT DO NOTHING returns no row for the loser).
-- attempts is carried from event to event and stays the fencing token of a claim.
--
-- A redelivery with a different payload_digest is recorded in erru.xml_inbox_conflict (one row per digest),
-- not as text appended to a mutable column.

CREATE TABLE erru.xml_inbox_event (
    id                    BIGSERIAL       NOT NULL,
    inbox_id              BIGINT          NOT NULL,
    seq                   INTEGER         NOT NULL,
    event_type            VARCHAR(20)     NOT NULL,
    attempts              INTEGER         NOT NULL DEFAULT 0,
    claimed_by            VARCHAR(100),
    lease_expires_at      TIMESTAMPTZ,
    next_attempt_at       TIMESTAMPTZ,
    error                 TEXT,
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT pk_xml_inbox_event PRIMARY KEY (id),
    CONSTRAINT fk_xml_inbox_event_inbox FOREIGN KEY (inbox_id) REFERENCES erru.xml_inbox (id),
    CONSTRAINT chk_xml_inbox_event_type CHECK (event_type IN ('received', 'processing', 'processed', 'failed')),
    CONSTRAINT chk_xml_inbox_event_attempts CHECK (attempts >= 0),
    CONSTRAINT chk_xml_inbox_event_seq CHECK (seq >= 1)
);

COMMENT ON TABLE  erru.xml_inbox_event IS 'Append-only state history of erru.xml_inbox rows. The newest event (highest seq) is the current state, see erru.xml_inbox_current. Never updated or deleted.';
COMMENT ON COLUMN erru.xml_inbox_event.seq IS 'Position in the history of one inbox row, starting at 1. Unique per inbox row: the compare-and-swap guard against two concurrent writers.';
COMMENT ON COLUMN erru.xml_inbox_event.event_type IS 'The status the row has after this event. received = back in the queue (retry, due at next_attempt_at, or manually reset), processing = claimed (see claimed_by, lease_expires_at), processed = business effects complete, failed = needs manual recovery.';
COMMENT ON COLUMN erru.xml_inbox_event.attempts IS 'Claim counter, the fencing token of a claim: only the holder of the newest claim event (same attempts) may finish it.';

CREATE UNIQUE INDEX uq_xml_inbox_event_inbox_seq ON erru.xml_inbox_event (inbox_id, seq);
-- the queue scans only the open states; processed and failed rows never appear in it
CREATE INDEX idx_xml_inbox_event_open ON erru.xml_inbox_event (event_type, next_attempt_at) WHERE event_type IN ('received', 'processing');

CREATE TABLE erru.xml_inbox_conflict (
    id                    BIGSERIAL       NOT NULL,
    inbox_id              BIGINT          NOT NULL,
    payload_digest        VARCHAR(64)     NOT NULL,
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
    CONSTRAINT pk_xml_inbox_conflict PRIMARY KEY (id),
    CONSTRAINT fk_xml_inbox_conflict_inbox FOREIGN KEY (inbox_id) REFERENCES erru.xml_inbox (id)
);

COMMENT ON TABLE erru.xml_inbox_conflict IS 'Append-only audit of redeliveries that reused a technicalId with a different payload_digest (never merged, never processed). One row per inbox row and digest.';

CREATE UNIQUE INDEX uq_xml_inbox_conflict_digest ON erru.xml_inbox_conflict (inbox_id, payload_digest);

-- Rows that exist already: their state becomes the first event (a 'conflict' row is closed as failed).
INSERT INTO erru.xml_inbox_event (inbox_id, seq, event_type, attempts, claimed_by, lease_expires_at, next_attempt_at, error, created_at)
SELECT id, 1, CASE status WHEN 'conflict' THEN 'failed' ELSE status END, attempts, claimed_by, lease_expires_at, next_attempt_at, last_error, now()
  FROM erru.xml_inbox;

CREATE VIEW erru.xml_inbox_current AS
SELECT i.id, i.message_type, i.transport_peer, i.technical_id, i.workflow_id, i.business_case_id, i.raw_xml, i.payload_digest,
       i.received_at, i.deadline_at, i.request_json,
       e.seq, e.event_type AS status, e.attempts, e.claimed_by, e.lease_expires_at, e.next_attempt_at, e.error AS last_error
  FROM erru.xml_inbox i
  JOIN erru.xml_inbox_event e ON e.inbox_id = i.id
   AND e.seq = (SELECT max(n.seq) FROM erru.xml_inbox_event n WHERE n.inbox_id = i.id);

COMMENT ON VIEW erru.xml_inbox_current IS 'The receipt (erru.xml_inbox) with its current state, the newest erru.xml_inbox_event of each row.';

COMMENT ON COLUMN erru.xml_inbox.status IS 'LEGACY, frozen at the value of the migration 20261229090000: the state lives in erru.xml_inbox_event / erru.xml_inbox_current.';
COMMENT ON COLUMN erru.xml_inbox.attempts IS 'LEGACY, see status.';
COMMENT ON COLUMN erru.xml_inbox.next_attempt_at IS 'LEGACY, see status.';
COMMENT ON COLUMN erru.xml_inbox.claimed_by IS 'LEGACY, see status.';
COMMENT ON COLUMN erru.xml_inbox.claimed_at IS 'LEGACY, see status.';
COMMENT ON COLUMN erru.xml_inbox.lease_expires_at IS 'LEGACY, see status.';
COMMENT ON COLUMN erru.xml_inbox.last_error IS 'LEGACY, see status.';

