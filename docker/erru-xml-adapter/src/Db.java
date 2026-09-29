import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.Optional;

/**
 * Thin JDBC layer over erru.xml_inbox / erru.xml_outbox (DSL/Liquibase/changelog/
 * 20261201090000-initial-erru-xml-inbox-outbox.sql). One short-lived connection per call: the
 * traffic does not need a pool, and it keeps the "never hold a transaction open across an
 * external HTTP call" rule (docs/architecture/erru-async-xml.md) true by construction.
 *
 * Access boundary: this is the only place outside Resql that holds real database credentials,
 * and it touches only the two transport tables it owns — never a business table.
 */
final class Db {
    private final Config config;
    final String workerId;

    Db(Config config) {
        this.config = config;
        this.workerId = java.util.UUID.randomUUID().toString();
    }

    private Connection open() throws SQLException {
        return DriverManager.getConnection(config.dbUrl, config.dbUser, config.dbPassword);
    }

    /** Hashes the original bytes, not a re-encoded String, so two different byte sequences never
     * collapse to the same digest. */
    static String sha256Hex(byte[] raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(raw);
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    record InboxRow(long id, String status, String payloadDigest) { }

    /**
     * Inserts a new inbox row. On a technical_id collision (uq_xml_inbox_technical_id), does NOT
     * insert a second row — the caller decides completed-replay vs conflicting-replay (docs/
     * architecture/erru-async-xml.md §4) by comparing payload_digest against the returned row.
     */
    InboxRow insertOrGetExisting(String messageType, String transportPeer, String technicalId,
                                  String workflowId, String businessCaseId, String rawXml,
                                  String payloadDigest, Instant deadlineAt) throws SQLException {
        try (Connection c = open()) {
            try (PreparedStatement ps = c.prepareStatement(
                    "INSERT INTO erru.xml_inbox " +
                    "(message_type, transport_peer, technical_id, workflow_id, business_case_id, raw_xml, payload_digest, deadline_at) " +
                    "VALUES (?, ?, ?::uuid, ?::uuid, ?, ?, ?, ?) RETURNING id, status, payload_digest")) {
                ps.setString(1, messageType);
                ps.setString(2, transportPeer);
                ps.setString(3, technicalId);
                if (workflowId == null || workflowId.isBlank()) {
                    ps.setNull(4, Types.OTHER);
                } else {
                    ps.setString(4, workflowId);
                }
                ps.setString(5, businessCaseId);
                ps.setString(6, rawXml);
                ps.setString(7, payloadDigest);
                if (deadlineAt == null) {
                    ps.setNull(8, Types.TIMESTAMP_WITH_TIMEZONE);
                } else {
                    ps.setTimestamp(8, Timestamp.from(deadlineAt));
                }
                try (ResultSet rs = ps.executeQuery()) {
                    rs.next();
                    return new InboxRow(rs.getLong("id"), rs.getString("status"), rs.getString("payload_digest"));
                }
            } catch (SQLException e) {
                if (!"23505".equals(e.getSQLState())) { // unique_violation
                    throw e;
                }
                Optional<InboxRow> existing = findByTechnicalId(c, technicalId);
                if (existing.isEmpty()) {
                    throw e; // lost the race in a way we can't explain; surface the original error
                }
                InboxRow row = existing.get();
                if ("failed".equals(row.status()) && row.payloadDigest().equals(payloadDigest)) {
                    // An exact redelivery (same payload_digest) of a `failed` row revives it: the
                    // attempt budget is short (minutes), and the business flow is idempotent by
                    // technicalId, so a Hub resend is a safe way to recover the row.
                    return revive(c, row.id(), technicalId);
                }
                return row;
            }
        }
    }

    /** Resets the row with a full attempt budget, since this is effectively a new delivery attempt. */
    private InboxRow revive(Connection c, long inboxId, String technicalId) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "UPDATE erru.xml_inbox SET status = 'received', claimed_by = NULL, claimed_at = NULL, " +
                "lease_expires_at = NULL, next_attempt_at = NULL, attempts = 0, " +
                "last_error = COALESCE(last_error || E'\\n', '') || 'revived by exact redelivery at ' || now()::text " +
                "WHERE id = ? AND status = 'failed' RETURNING id, status, payload_digest")) {
            ps.setLong(1, inboxId);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return findByTechnicalId(c, technicalId).orElseThrow(() -> new SQLException("Inbox disappeared during revival"));
                return new InboxRow(rs.getLong("id"), rs.getString("status"), rs.getString("payload_digest"));
            }
        }
    }

    private Optional<InboxRow> findByTechnicalId(Connection c, String technicalId) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT id, status, payload_digest FROM erru.xml_inbox WHERE technical_id = ?::uuid")) {
            ps.setString(1, technicalId);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return Optional.empty();
                return Optional.of(new InboxRow(rs.getLong("id"), rs.getString("status"), rs.getString("payload_digest")));
            }
        }
    }

    record ClaimedInbox(long id, String messageType, String rawXml, String technicalId, String workflowId,
                         Instant receivedAt, Instant deadlineAt, long attemptsBeforeThisClaim) { }

    /**
     * Claims the next processable inbox row: 'received' rows and 'processing' rows whose lease has
     * expired (a crashed worker's claim must not orphan the row), SELECT ... FOR UPDATE SKIP LOCKED
     * so two workers never claim the same row. Filtered to the message types this adapter can
     * process; IngressHandler already rejects other types with 501, so the filter is a second
     * guarantee, not the primary one.
     */
    Optional<ClaimedInbox> claimNextInbox(String[] processableMessageTypes) throws SQLException {
        try (Connection c = open()) {
            c.setAutoCommit(false);
            String placeholders = String.join(",", java.util.Collections.nCopies(processableMessageTypes.length, "?"));
            try (PreparedStatement ps = c.prepareStatement(
                    "SELECT id, message_type, raw_xml, technical_id, workflow_id, received_at, deadline_at, attempts FROM erru.xml_inbox " +
                    "WHERE message_type IN (" + placeholders + ") " +
                    "AND (status = 'received' OR (status = 'processing' AND lease_expires_at < now())) " +
                    "AND (next_attempt_at IS NULL OR next_attempt_at <= now()) " +
                    "ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1")) {
                for (int i = 0; i < processableMessageTypes.length; i++) {
                    ps.setString(i + 1, processableMessageTypes[i]);
                }
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) {
                        c.commit();
                        return Optional.empty();
                    }
                    long id = rs.getLong("id");
                    Timestamp receivedAtTs = rs.getTimestamp("received_at");
                    Timestamp deadlineAtTs = rs.getTimestamp("deadline_at");
                    ClaimedInbox row = new ClaimedInbox(id, rs.getString("message_type"), rs.getString("raw_xml"),
                            rs.getString("technical_id"), rs.getString("workflow_id"),
                            receivedAtTs == null ? null : receivedAtTs.toInstant(),
                            deadlineAtTs == null ? null : deadlineAtTs.toInstant(), rs.getLong("attempts"));
                    try (PreparedStatement upd = c.prepareStatement(
                            "UPDATE erru.xml_inbox SET status = 'processing', claimed_by = ?, claimed_at = now(), " +
                            "lease_expires_at = now() + (? || ' milliseconds')::interval, attempts = attempts + 1 WHERE id = ?")) {
                        upd.setString(1, workerId);
                        upd.setLong(2, config.leaseMs);
                        upd.setLong(3, id);
                        upd.executeUpdate();
                    }
                    c.commit();
                    return Optional.of(row);
                }
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
    }

    /** Thrown when a fenced write finds the row is no longer held by the caller. */
    static final class LeaseLostException extends Exception {
        LeaseLostException(String message) { super(message); }
    }

    /**
     * Atomically inserts the outbox row and marks the inbox row processed (one commit), fenced
     * against a lease that expired mid-call: a slow Ruuter call can outlive lease_expires_at and
     * let a second worker claim the same row. `SELECT ... FOR UPDATE` on the inbox row serialises
     * the two callers; whichever commits first wins, the other sees status != 'processing' (or a
     * different claimed_by) and rolls back instead of inserting a second outbox row.
     * `uq_xml_outbox_inbox_id` is the backstop if this fencing is ever bypassed.
     */
    void storeOutcome(ClaimedInbox row, String xml, String technicalId, Instant deadline,
                      boolean businessComplete, boolean retry, String error, long backoffMs) throws SQLException, LeaseLostException {
        try (Connection c = open()) {
            c.setAutoCommit(false);
            try {
                assertLeaseHeld(c, row.id(), workerId);
                try (PreparedStatement ins = c.prepareStatement(
                        "INSERT INTO erru.xml_outbox (inbox_id, message_type, technical_id, workflow_id, business_case_id, destination, xml_body, deadline_at) " +
                        "SELECT id, message_type, ?::uuid, workflow_id, business_case_id, ?, ?, ? FROM erru.xml_inbox WHERE id = ? " +
                        "ON CONFLICT (inbox_id) WHERE inbox_id IS NOT NULL DO NOTHING")) {
                    ins.setString(1, technicalId);
                    ins.setString(2, config.hubResponseUrl);
                    ins.setString(3, xml);
                    ins.setTimestamp(4, Timestamp.from(deadline));
                    ins.setLong(5, row.id());
                    ins.executeUpdate();
                }
                try (PreparedStatement upd = c.prepareStatement(
                        "UPDATE erru.xml_inbox SET status = ?, last_error = ?, " +
                        "next_attempt_at = CASE WHEN ? THEN now() + (? || ' milliseconds')::interval ELSE NULL END, " +
                        "claimed_by = NULL, lease_expires_at = NULL WHERE id = ?")) {
                    upd.setString(1, businessComplete ? "processed" : retry ? "received" : "failed");
                    upd.setString(2, truncate(error, 4000));
                    upd.setBoolean(3, retry);
                    upd.setLong(4, backoffMs);
                    upd.setLong(5, row.id());
                    upd.executeUpdate();
                }
                c.commit();
            } catch (SQLException | LeaseLostException e) {
                c.rollback();
                throw e;
            }
        }
    }

    /** Fenced: a worker whose lease expired and was reclaimed must not overwrite the new owner's result. */
    void markInboxFailed(long inboxId, String claimedBy, String error) throws SQLException {
        try (Connection c = open();
             PreparedStatement ps = c.prepareStatement(
                     "UPDATE erru.xml_inbox SET status = 'failed', last_error = ? " +
                     "WHERE id = ? AND claimed_by = ? AND status = 'processing'")) {
            ps.setString(1, truncate(error, 4000));
            ps.setLong(2, inboxId);
            ps.setString(3, claimedBy);
            int updated = ps.executeUpdate();
            if (updated == 0) {
                System.err.println("[db] markInboxFailed id=" + inboxId + " was a no-op — lease already reclaimed by another worker, not overwriting its result");
            }
        }
    }

    /**
     * Returns a claimed-but-unfinished inbox row to 'received' for a later retry with backoff.
     * Used for transient errors (network, timeout, 5xx/408/429 from Ruuter); the business flows
     * are idempotent by technicalId, so repeating the call is safe. Parse/mapping errors go to
     * markInboxFailed instead. Fenced like the other finalisation writes.
     */
    void retryInboxLater(long inboxId, String claimedBy, String error, long backoffMs) throws SQLException {
        try (Connection c = open();
             PreparedStatement ps = c.prepareStatement(
                     "UPDATE erru.xml_inbox SET status = 'received', last_error = ?, " +
                     "next_attempt_at = now() + (? || ' milliseconds')::interval, claimed_by = NULL, lease_expires_at = NULL " +
                     "WHERE id = ? AND claimed_by = ? AND status = 'processing'")) {
            ps.setString(1, truncate(error, 4000));
            ps.setLong(2, backoffMs);
            ps.setLong(3, inboxId);
            ps.setString(4, claimedBy);
            int updated = ps.executeUpdate();
            if (updated == 0) {
                System.err.println("[db] retryInboxLater id=" + inboxId + " was a no-op — lease already reclaimed by another worker");
            }
        }
    }

    /**
     * Records a rejected conflicting redelivery against the original row, never as a second row.
     * Appends to last_error so an existing diagnostic (e.g. on a `failed` row) is kept.
     */
    void recordConflictAttempt(long inboxId, String attemptedDigest) throws SQLException {
        try (Connection c = open();
             PreparedStatement ps = c.prepareStatement(
                     "UPDATE erru.xml_inbox SET last_error = COALESCE(last_error || E'\\n', '') || " +
                     "'conflicting redelivery rejected at ' || now()::text || ', attempted payload_digest=' || ? WHERE id = ?")) {
            ps.setString(1, attemptedDigest);
            ps.setLong(2, inboxId);
            ps.executeUpdate();
        }
    }

    private void assertLeaseHeld(Connection c, long inboxId, String claimedBy) throws SQLException, LeaseLostException {
        try (PreparedStatement lock = c.prepareStatement(
                "SELECT status, claimed_by FROM erru.xml_inbox WHERE id = ? FOR UPDATE")) {
            lock.setLong(1, inboxId);
            try (ResultSet rs = lock.executeQuery()) {
                if (!rs.next()) {
                    throw new LeaseLostException("inbox id=" + inboxId + " no longer exists");
                }
                String status = rs.getString("status");
                String rowClaimedBy = rs.getString("claimed_by");
                if (!"processing".equals(status) || !claimedBy.equals(rowClaimedBy)) {
                    throw new LeaseLostException("inbox id=" + inboxId + " lease no longer held (status=" + status + ", claimedBy=" + rowClaimedBy + ")");
                }
            }
        }
    }

    record ClaimedOutbox(long id, long attempts, String technicalId, String destination, String xmlBody, Instant deadlineAt) { }

    /** Only claims rows whose next_attempt_at has elapsed (see markOutboxFailed's backoff). */
    Optional<ClaimedOutbox> claimNextOutbox() throws SQLException {
        try (Connection c = open()) {
            c.setAutoCommit(false);
            try (PreparedStatement ps = c.prepareStatement(
                    "SELECT id, attempts, technical_id, destination, xml_body, deadline_at FROM erru.xml_outbox " +
                    "WHERE (next_attempt_at IS NULL OR next_attempt_at <= now()) " +
                    "AND (status = 'pending' OR (status = 'sending' AND lease_expires_at < now())) " +
                    "ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1")) {
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) {
                        c.commit();
                        return Optional.empty();
                    }
                    Timestamp deadlineAtTs = rs.getTimestamp("deadline_at");
                    ClaimedOutbox row = new ClaimedOutbox(rs.getLong("id"), rs.getLong("attempts"),
                            rs.getString("technical_id"), rs.getString("destination"), rs.getString("xml_body"),
                            deadlineAtTs == null ? null : deadlineAtTs.toInstant());
                    try (PreparedStatement upd = c.prepareStatement(
                            "UPDATE erru.xml_outbox SET status = 'sending', claimed_by = ?, claimed_at = now(), " +
                            "lease_expires_at = now() + (? || ' milliseconds')::interval, attempts = attempts + 1 WHERE id = ?")) {
                        upd.setString(1, workerId);
                        upd.setLong(2, config.leaseMs);
                        upd.setLong(3, row.id());
                        upd.executeUpdate();
                    }
                    c.commit();
                    return Optional.of(row);
                }
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
    }

    /**
     * The Hub does not accept answers after the request's own `timeoutValue` —
     * sending anyway is pointless (and, per §5.1, may itself be flagged as a protocol violation).
     * `expired` is terminal, distinct from `failed`: the answer WAS built successfully, it just
     * could not be delivered in time, which is a different operational situation to alert on.
     */
    void markOutboxExpired(long outboxId, String claimedBy) throws SQLException {
        try (Connection c = open();
             PreparedStatement ps = c.prepareStatement(
                     "UPDATE erru.xml_outbox SET status = 'expired' " +
                     "WHERE id = ? AND claimed_by = ? AND status = 'sending'")) {
            ps.setLong(1, outboxId);
            ps.setString(2, claimedBy);
            int updated = ps.executeUpdate();
            if (updated == 0) {
                System.err.println("[db] markOutboxExpired id=" + outboxId + " was a no-op — lease already reclaimed");
            }
        }
    }

    /** Fenced: a reclaimed-lease worker's late success must not overwrite the new owner's outcome. */
    void markOutboxDelivered(long outboxId, String claimedBy) throws SQLException {
        try (Connection c = open();
             PreparedStatement ps = c.prepareStatement(
                     "UPDATE erru.xml_outbox SET status = 'delivered', delivered_at = now() " +
                     "WHERE id = ? AND claimed_by = ? AND status = 'sending'")) {
            ps.setLong(1, outboxId);
            ps.setString(2, claimedBy);
            int updated = ps.executeUpdate();
            if (updated == 0) {
                System.err.println("[db] markOutboxDelivered id=" + outboxId + " was a no-op — lease already reclaimed");
            }
        }
    }

    /**
     * Schedules a retry with exponential backoff via next_attempt_at, or marks the row 'failed'
     * when the attempt budget is used up. `permanent=true` (a 4xx from the Hub, or any error the
     * caller knows is not worth retrying) goes straight to 'failed'.
     */
    void markOutboxFailed(long outboxId, String claimedBy, String error, int maxAttempts, long backoffMs, boolean permanent) throws SQLException {
        try (Connection c = open();
             PreparedStatement ps = c.prepareStatement(
                     "UPDATE erru.xml_outbox SET " +
                     "status = CASE WHEN ? OR attempts >= ? THEN 'failed' ELSE 'pending' END, " +
                     "next_attempt_at = CASE WHEN ? OR attempts >= ? THEN NULL ELSE now() + (? || ' milliseconds')::interval END, " +
                     "last_error = ? " +
                     "WHERE id = ? AND claimed_by = ? AND status = 'sending'")) {
            ps.setBoolean(1, permanent);
            ps.setInt(2, maxAttempts);
            ps.setBoolean(3, permanent);
            ps.setInt(4, maxAttempts);
            ps.setLong(5, backoffMs);
            ps.setString(6, truncate(error, 4000));
            ps.setLong(7, outboxId);
            ps.setString(8, claimedBy);
            int updated = ps.executeUpdate();
            if (updated == 0) {
                System.err.println("[db] markOutboxFailed id=" + outboxId + " was a no-op — lease already reclaimed");
            }
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
