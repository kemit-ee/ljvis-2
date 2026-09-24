import org.postgresql.PGConnection;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/** Processes accepted messages; response expiry never completes an unfinished notification. */
final class ProcessingWorker implements Runnable {
    private static final long BASE_BACKOFF_MS = 5000;
    private static final long MAX_BACKOFF_MS = 45000;
    private static final String EN_MESSAGE = "Unable to produce a business answer for this request";

    private final Config config;
    private final Db db;
    private final SchemaRegistry schemas;
    private final ErrorNotificationBuilder enBuilder;
    private final Map<String, MessageMapper> mappers = new LinkedHashMap<>();
    private final String[] processableTypes;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final Semaphore wake = new Semaphore(0);

    ProcessingWorker(Config config, Db db, SchemaRegistry schemas, List<MessageMapper> mapperList) {
        this.config = config;
        this.db = db;
        this.schemas = schemas;
        this.enBuilder = new ErrorNotificationBuilder(config.memberStateCode);
        for (MessageMapper m : mapperList) {
            this.mappers.put(m.requestRoot(), m);
        }
        this.processableTypes = mappers.keySet().toArray(new String[0]);
    }

    /** Shared with IngressHandler: a type not registered here is rejected at the door with 501. */
    String[] processableTypes() {
        return processableTypes;
    }

    @Override
    public void run() {
        Thread listener = new Thread(this::listenLoop, "erru-inbox-listen");
        listener.setDaemon(true);
        listener.start();

        while (true) {
            try {
                drainClaims();
            } catch (Exception e) {
                System.err.println("[processing] drain error: " + e);
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

    /** Dedicated LISTEN connection — never used for business work (architecture §6). */
    private void listenLoop() {
        while (true) {
            try (Connection c = DriverManager.getConnection(config.dbUrl, config.dbUser, config.dbPassword)) {
                try (Statement st = c.createStatement()) {
                    st.execute("LISTEN erru_xml_inbox");
                }
                PGConnection pg = c.unwrap(PGConnection.class);
                while (!c.isClosed()) {
                    org.postgresql.PGNotification[] notifications = pg.getNotifications(Math.toIntExact(config.pollIntervalMs) * 5);
                    if (notifications != null && notifications.length > 0) {
                        wake.release();
                    }
                }
            } catch (Exception e) {
                System.err.println("[processing] LISTEN connection lost, reconnecting: " + e);
                sleep(1000);
            }
        }
    }

    private void drainClaims() throws Exception {
        while (true) {
            Optional<Db.ClaimedInbox> claim = db.claimNextInbox(processableTypes);
            if (claim.isEmpty()) {
                return;
            }
            processOne(claim.get());
        }
    }

    private void processOne(Db.ClaimedInbox row) {
        try {
            MessageMapper mapper = mappers.get(row.messageType());
            Document doc = XmlUtil.parseHardened(row.rawXml());
            String to = XmlUtil.attr(XmlUtil.firstChild(doc.getDocumentElement(), "Header"), "to");
            boolean broadcast = "CheckGoodRepute_Request".equals(mapper.requestRoot()) && "ZZ".equals(to);
            if (!config.memberStateCode.equals(to) && !broadcast) {
                errorNotification(row, doc, "InvalidData", "Wrong recipient: " + to, true, false);
                return;
            }
            if (row.attemptsBeforeThisClaim() >= config.processingMaxAttempts) {
                errorNotification(row, doc, "ServerError", "Processing attempt budget exhausted",
                        !mapper.requiresBusinessCompletion(), false);
                return;
            }
            Instant deadline = deadline(row);
            Duration timeout = ResponseBudget.callTimeout(deadline, Instant.now(), mapper.ruuterTimeout());
            if (timeout.isZero()) {
                if (!mapper.requiresBusinessCompletion()) {
                    errorNotification(row, doc, "ServerError", "Response time budget exhausted", true, false);
                    return;
                }
                timeout = mapper.ruuterTimeout();
            }
            Outcome outcome = callRuuter(mapper, mapper.requestToJson(doc, row.receivedAt()), timeout);
            if (outcome.kind() == Kind.ANSWER) {
                completeWithAnswer(row, mapper, doc, outcome.json());
            } else {
                handleFailure(row, mapper, doc, outcome.error(), outcome.kind() == Kind.TRANSIENT);
            }
        } catch (Exception e) {
            // An unclassifiable failure is recoverable by an operator, never marked processed.
            fail(row, "Unexpected processing error: " + e);
        }
    }

    private enum Kind { TRANSIENT, PERMANENT, ANSWER }
    private record Outcome(Kind kind, Map<String, Object> json, String error) { }

    private Outcome callRuuter(MessageMapper mapper, Map<String, Object> requestJson, Duration timeout) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(config.ruuterInternalBaseUrl + mapper.ruuterPath()))
                    .header("Content-Type", "application/json")
                    .timeout(timeout)
                    .POST(HttpRequest.BodyPublishers.ofString(MiniJson.write(requestJson)))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (HttpOutcome.isTransient(response.statusCode())) {
                return new Outcome(Kind.TRANSIENT, null, "Ruuter HTTP " + response.statusCode() + ": " + truncate(response.body()));
            }
            Map<String, Object> envelope = MiniJson.parseObject(response.body());
            Object inner = envelope.get("response");
            @SuppressWarnings("unchecked")
            Map<String, Object> json = inner instanceof String text ? MiniJson.parseObject(text)
                    : inner instanceof Map ? (Map<String, Object>) inner : envelope;
            if (!mapper.isAnswer(json)) {
                return new Outcome(Kind.PERMANENT, null, "Unrecognised Ruuter answer: " + truncate(response.body()));
            }
            return new Outcome(Kind.ANSWER, json, null);
        } catch (java.io.IOException e) {
            return new Outcome(Kind.TRANSIENT, null, "Ruuter unavailable: " + e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new Outcome(Kind.TRANSIENT, null, "Ruuter call interrupted");
        } catch (Exception e) {
            return new Outcome(Kind.PERMANENT, null, "Invalid Ruuter response: " + e);
        }
    }

    private void handleFailure(Db.ClaimedInbox row, MessageMapper mapper, Document doc, String reason, boolean transientError) {
        boolean attemptsLeft = row.attemptsBeforeThisClaim() + 1 < config.processingMaxAttempts;
        long delay = backoffFor(row.attemptsBeforeThisClaim());
        if (transientError && attemptsLeft && ResponseBudget.canRetry(deadline(row), Instant.now(), delay)) {
            try {
                db.retryInboxLater(row.id(), db.workerId, reason, delay);
            } catch (SQLException e) {
                System.err.println("[processing] cannot schedule retry for inbox " + row.id() + ": " + e);
            }
            return;
        }
        boolean needsRecovery = mapper.requiresBusinessCompletion();
        errorNotification(row, doc, "ServerError", reason, !needsRecovery, needsRecovery && attemptsLeft);
    }

    private void completeWithAnswer(Db.ClaimedInbox row, MessageMapper mapper, Document doc, Map<String, Object> json) {
        String xml;
        String technicalId = UUID.randomUUID().toString();
        try {
            xml = mapper.buildResponseXml(json, doc, technicalId);
            schemas.validate(mapper.responseRoot(), xml);
            Document responseDoc = XmlUtil.parseHardened(xml);
            ResponseValidator.validate(responseDoc);
            ResponseValidator.validateCorrelation(doc, responseDoc, config.memberStateCode);
        } catch (StatusMapper.InvalidStatusException e) {
            boolean rejected = "InvalidData".equals(e.rawStatus);
            if (!rejected && mapper.requiresBusinessCompletion()) {
                handleFailure(row, mapper, doc, e.toString(), false);
            } else {
                errorNotification(row, doc, rejected ? "InvalidData" : "ServerError", e.toString(), true, false);
            }
            return;
        } catch (Exception e) {
            // The flow returned a completed business answer; only its XML representation failed.
            errorNotification(row, doc, "ServerError", "Cannot render business answer: " + e, true, false);
            return;
        }
        storeOutcome(row, xml, technicalId, true, false, null);
    }

    private void errorNotification(Db.ClaimedInbox row, Document doc, String status, String reason,
                                   boolean businessComplete, boolean retry) {
        System.err.println("[processing] inbox " + row.id() + ": " + reason);
        try {
            String technicalId = UUID.randomUUID().toString();
            String xml = enBuilder.build(status, EN_MESSAGE + " (correlation id: inbox/" + row.id() + ")",
                    doc, row.rawXml(), technicalId);
            schemas.validate("ErrorNotification", xml);
            storeOutcome(row, xml, technicalId, businessComplete, retry, reason);
        } catch (Exception e) {
            fail(row, "Cannot render ErrorNotification: " + e + "; " + reason);
        }
    }

    private void storeOutcome(Db.ClaimedInbox row, String xml, String technicalId,
                              boolean complete, boolean retry, String reason) {
        try {
            db.storeOutcome(row, xml, technicalId, deadline(row), complete, retry, reason,
                    backoffFor(row.attemptsBeforeThisClaim()));
        } catch (Db.LeaseLostException e) {
            System.err.println("[processing] inbox " + row.id() + " lease lost: " + e.getMessage());
        } catch (SQLException e) {
            // Leave the lease to expire: neither the outcome nor business completion was committed.
            System.err.println("[processing] cannot persist outcome for inbox " + row.id() + ": " + e);
        }
    }

    private static Instant deadline(Db.ClaimedInbox row) {
        return ResponseBudget.deadline(row.deadlineAt(), row.receivedAt());
    }

    private void fail(Db.ClaimedInbox row, String error) {
        System.err.println("[processing] inbox " + row.id() + " failed: " + error);
        try {
            db.markInboxFailed(row.id(), db.workerId, error);
        } catch (SQLException e) {
            System.err.println("[processing] cannot record failure: " + e);
        }
    }

    private static long backoffFor(long attempts) {
        return Math.min((long) (BASE_BACKOFF_MS * Math.pow(3, Math.min(attempts, 10))), MAX_BACKOFF_MS);
    }

    private static String truncate(String text) {
        return text.length() <= 500 ? text : text.substring(0, 500);
    }

    private static void sleep(long ms) {
        try { Thread.sleep(ms); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}
