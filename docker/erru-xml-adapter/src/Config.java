import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * All configuration is via environment variables (docker-compose.yml / docker-compose.ci.yml),
 * following the same convention as every other service in docker/*. No config file, no build
 * tool — see README.md for why.
 *
 * Everything that depends on the environment (DB, service URLs, contracts location, our own
 * identity in ERRU) is required: a missing value stops the process at startup instead of silently
 * pointing at a guessed host or answering as a guessed authority. Only technical tuning knobs
 * (listen port inside the container, poll interval, lease, worker id) have defaults.
 */
final class Config {
    final int port;
    final String dbUrl;
    final String dbUser;
    final String dbPassword;
    final String ruuterInternalBaseUrl;
    final String hubResponseUrl;
    final String contractsDir;
    final long pollIntervalMs;
    final long leaseMs;
    final String workerId;
    final String respondingAuthority;
    final String respondingAuthorityCtud;
    final String respondingAuthorityRsi;
    final String respondingAuthorityNcr;
    final String memberStateCode;
    final int processingMaxAttempts;
    final int deliveryMaxAttempts;

    private Config() {
        List<String> problems = new ArrayList<>();

        dbUrl = required("DB_URL", problems);
        dbUser = required("DB_USER", problems);
        dbPassword = required("DB_PASSWORD", problems);
        ruuterInternalBaseUrl = required("RUUTER_INTERNAL_BASE_URL", problems);
        // One full, directly configurable URL for every answer
        // (business answer or ErrorNotification alike) — ERRU XML Message Reference 2.06 §5.3.1
        // p.12 defines exactly ONE Hub endpoint for all answers
        // (https://movehub.ec.testa.eu/erru/http/response/btshttpreceive.dll), not one per
        // message type. The earlier HUB_BASE_URL + a per-type path segment (`hubPath()`) invented
        // a routing scheme the real Hub does not have.
        hubResponseUrl = required("HUB_RESPONSE_URL", problems);
        contractsDir = required("CONTRACTS_DIR", problems);
        // NU only, used on the error/heartbeat ACK path. The success path takes
        // respondingAuthority from erru.nu_register_ack, which has its own hardcoded 'EE-PPA' —
        // keep the two in sync. NU's own answering authority (EE-PPA vs EE-TRAM) is itself worth
        // re-confirming with the product owner alongside RSI's below — not changed here without
        // that confirmation.
        respondingAuthority = required("RESPONDING_AUTHORITY", problems);
        // CTUD/RSI/NCR each need their own value — a single shared RESPONDING_AUTHORITY was wrong
        // for CTUD (its own flow already computes EE-TRAM, but the mapper was discarding it and
        // sending NU's EE-PPA instead) and had never been confirmed for RSI/NCR at all. CTUD now
        // prefers its flow's own value and only falls back to RESPONDING_AUTHORITY_CTUD when
        // that's absent (a malformed answer or this adapter's own synthetic fallback). RSI/NCR
        // have no per-answer value from their flows at all, so their variable is the only source.
        // EE-TRAM (Transpordiamet) for CTUD/NCR/RSI is confirmed for NCR from its own task's
        // example response; RSI's is an inference (Transpordiamet runs Liiklusregister, which
        // incoming RSI is checked against), not a confirmed product answer — flagged in
        // README.md, not silently treated as settled.
        respondingAuthorityCtud = required("RESPONDING_AUTHORITY_CTUD", problems);
        respondingAuthorityRsi = required("RESPONDING_AUTHORITY_RSI", problems);
        respondingAuthorityNcr = required("RESPONDING_AUTHORITY_NCR", problems);
        memberStateCode = required("MEMBER_STATE_CODE", problems);

        port = (int) positiveNumber("PORT", 8080, problems);
        pollIntervalMs = positiveNumber("POLL_INTERVAL_MS", 1000, problems);
        // Must clearly exceed the worst-case HTTP round trip within ONE claim: CGR/CTUD's 45s
        // Ruuter timeout, possibly followed by one more 45s control-replay/fallback attempt
        // (ProcessingWorker#goToFallback) — up to ~90s of genuine work before a lease should ever
        // be considered stale. Lease fencing in Db is the real correctness guarantee either way;
        // this is just margin so the race stays rare.
        leaseMs = positiveNumber("LEASE_MS", 150000, problems);
        // 3 retries (4 attempts total), then the fallback path — not a longer-running retry
        // budget. See ProcessingWorker#handleFailure.
        processingMaxAttempts = (int) positiveNumber("PROCESSING_MAX_ATTEMPTS", 4, problems);
        // Delivery to the Hub is a separate topic from processing — it has no fallback answer to
        // fall back TO (it IS the answer), so its own budget stays generous.
        deliveryMaxAttempts = (int) positiveNumber("DELIVERY_MAX_ATTEMPTS", 8, problems);
        String id = System.getenv("WORKER_ID");
        workerId = (id == null || id.isBlank()) ? "erru-xml-adapter-" + UUID.randomUUID() : id;

        if (!problems.isEmpty()) {
            throw new IllegalStateException("invalid configuration, refusing to start: " + String.join("; ", problems));
        }
    }

    static Config load() {
        return new Config();
    }

    private static String required(String name, List<String> problems) {
        String v = System.getenv(name);
        if (v == null || v.isBlank()) {
            problems.add(name + " is not set");
            return null;
        }
        return v.trim();
    }

    private static long positiveNumber(String name, long fallback, List<String> problems) {
        String v = System.getenv(name);
        if (v == null || v.isBlank()) {
            return fallback;
        }
        try {
            long n = Long.parseLong(v.trim());
            if (n <= 0) {
                problems.add(name + " must be a positive number, got " + v);
            }
            return n;
        } catch (NumberFormatException e) {
            problems.add(name + " must be a number, got " + v);
            return fallback;
        }
    }
}
