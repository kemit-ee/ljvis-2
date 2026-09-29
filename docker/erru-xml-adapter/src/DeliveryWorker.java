import org.postgresql.PGConnection;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * Delivery role (docs/architecture/erru-async-xml.md §2): claims a pending outbox row and POSTs
 * the pre-rendered, pre-validated xml_body byte-for-byte to the Hub's one answer endpoint
 * (`destination`, always HUB_RESPONSE_URL — the same URL for every message type, per ERRU XML
 * Message Reference 2.06 §5.3.1; in dev/CI the mock Hub, docker/erru-hub-mock). Never regenerates
 * xml_body between attempts (§9): a retry
 * always sends the exact same bytes under the same technical_id.
 *
 * Exactly-once delivery over the network is not promised (§9, explicit non-goal) — a 2xx response
 * from the Hub is treated as delivered; transient failures are retried with backoff, bounded by
 * config.deliveryMaxAttempts — a separate, more generous budget than ProcessingWorker's, since
 * delivery has no fallback answer to fall back TO: it IS the answer —
 * after which the row is marked 'failed' for manual recovery.
 */
final class DeliveryWorker implements Runnable {
    private static final long BASE_BACKOFF_MS = 2000;
    private static final long MAX_BACKOFF_MS = 60000;

    private final Config config;
    private final Db db;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final Semaphore wake = new Semaphore(0);

    DeliveryWorker(Config config, Db db) {
        this.config = config;
        this.db = db;
    }

    @Override
    public void run() {
        Thread listener = new Thread(this::listenLoop, "erru-outbox-listen");
        listener.setDaemon(true);
        listener.start();

        while (true) {
            try {
                drainClaims();
            } catch (Exception e) {
                System.err.println("[delivery] drain error: " + e);
            }
            try {
                wake.tryAcquire(config.pollIntervalMs, TimeUnit.MILLISECONDS);
                wake.drainPermits();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    private void listenLoop() {
        while (true) {
            try (Connection c = DriverManager.getConnection(config.dbUrl, config.dbUser, config.dbPassword)) {
                try (Statement st = c.createStatement()) {
                    st.execute("LISTEN erru_xml_outbox");
                }
                PGConnection pg = c.unwrap(PGConnection.class);
                while (!c.isClosed()) {
                    org.postgresql.PGNotification[] notifications = pg.getNotifications(Math.toIntExact(config.pollIntervalMs) * 5);
                    if (notifications != null && notifications.length > 0) {
                        wake.release();
                    }
                }
            } catch (Exception e) {
                System.err.println("[delivery] LISTEN connection lost, reconnecting: " + e);
                sleep(1000);
            }
        }
    }

    private void drainClaims() throws Exception {
        while (true) {
            Optional<Db.ClaimedOutbox> claim = db.claimNextOutbox();
            if (claim.isEmpty()) {
                return;
            }
            deliverOne(claim.get());
        }
    }

    private void deliverOne(Db.ClaimedOutbox row) {
        Duration timeout = row.deadlineAt() == null ? Duration.ZERO
                : ResponseBudget.deliveryTimeout(row.deadlineAt(), java.time.Instant.now());
        if (timeout.isZero()) {
            // the Hub's own timeoutValue has passed — sending now would be
            // pointless at best. The answer itself (business or EN) was already built and
            // XSD-validated by ProcessingWorker; only its delivery is skipped.
            System.err.println("[delivery] outbox id=" + row.id() + " deadline (" + row.deadlineAt() + ") already passed, not delivering — marking expired");
            try {
                db.markOutboxExpired(row.id(), db.workerId);
            } catch (Exception dbErr) {
                System.err.println("[delivery] failed to mark outbox id=" + row.id() + " expired: " + dbErr);
            }
            return;
        }
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(row.destination()))
                    .header("Content-Type", "application/xml; charset=utf-8")
                    .timeout(timeout)
                    .POST(HttpRequest.BodyPublishers.ofString(row.xmlBody()))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status >= 200 && status < 300) {
                db.markOutboxDelivered(row.id(), db.workerId);
            } else if (HttpOutcome.isTransient(status)) {
                // 5xx/408/429: transient, retry with backoff (same classification as
                // ProcessingWorker, via HttpOutcome).
                recordFailure(row, "Hub returned HTTP " + status + ": " + response.body(),
                        config.deliveryMaxAttempts, backoffFor(row.attempts()), false);
            } else if (status >= 400 && status < 500) {
                // Any other 4xx is the Hub permanently rejecting this exact xml_body — retrying
                // byte-identical content will never succeed, so don't burn the retry budget.
                recordFailure(row, "Hub returned HTTP " + status + ": " + response.body(),
                        config.deliveryMaxAttempts, 0, true);
            } else {
                // An unexpected non-4xx/5xx status (e.g. a 3xx this HttpClient didn't follow) —
                // treat like any other transient-looking failure, retry with backoff.
                recordFailure(row, "Hub returned HTTP " + status + ": " + response.body(),
                        config.deliveryMaxAttempts, backoffFor(row.attempts()), false);
            }
        } catch (Exception e) {
            System.err.println("[delivery] outbox id=" + row.id() + " failed: " + e);
            try {
                recordFailure(row, e.toString(), config.deliveryMaxAttempts, backoffFor(row.attempts()), false);
            } catch (Exception dbErr) {
                System.err.println("[delivery] failed to record failure for outbox id=" + row.id() + ": " + dbErr);
            }
        }
    }

    private void recordFailure(Db.ClaimedOutbox row, String reason, int maxAttempts, long delay, boolean permanent) throws java.sql.SQLException {
        if (!permanent && (row.deadlineAt() == null || !java.time.Instant.now().plusMillis(delay).isBefore(row.deadlineAt()))) {
            db.markOutboxExpired(row.id(), db.workerId);
        } else {
            db.markOutboxFailed(row.id(), db.workerId, reason, maxAttempts, delay, permanent);
        }
    }

    /** Exponential backoff, capped. */
    private static long backoffFor(long attempts) {
        long backoff = BASE_BACKOFF_MS * (1L << Math.min(attempts, 10));
        return Math.min(backoff, MAX_BACKOFF_MS);
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
