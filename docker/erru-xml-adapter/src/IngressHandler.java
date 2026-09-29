import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Set;

/**
 * POST /erru/xml — the durable-acceptance boundary (docs/architecture/erru-async-xml.md §8).
 * XSD-validates against the matching per-type Schema, then durably commits an erru.xml_inbox row
 * BEFORE returning any success status: a DB write failure must never be reported as accepted.
 *
 * Three outcomes at the transport boundary (architecture §4): a fresh technicalId is accepted
 * (202); an exact redelivery (same technicalId, same payload_digest) is accepted again,
 * idempotently, without creating a second row (202); a conflicting redelivery (same technicalId,
 * different payload_digest) is rejected (409) — the Hub owns the meaning of a technicalId, this
 * adapter must never silently merge or overwrite it.
 */
final class IngressHandler implements HttpHandler {
    private final Set<String> processableTypes;

    private final SchemaRegistry schemas;
    private final Db db;

    IngressHandler(SchemaRegistry schemas, Db db, String[] processableTypes) {
        this.schemas = schemas;
        this.db = db;
        this.processableTypes = Set.of(processableTypes);
    }

    /** A single oversized body must not be able to OOM the whole process. */
    private static final long MAX_BODY_BYTES = 2L * 1024 * 1024; // 2 MiB

    @Override
    public void handle(HttpExchange exchange) throws java.io.IOException {
        try {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                writeJson(exchange, 405, "{\"error\":\"method_not_allowed\"}");
                return;
            }
            byte[] raw = readBounded(exchange.getRequestBody(), MAX_BODY_BYTES);
            if (raw == null) {
                writeJson(exchange, 413, "{\"error\":\"payload_too_large\",\"maxBytes\":" + MAX_BODY_BYTES + "}");
                return;
            }

            // Peek/validate/parse straight off the bytes, not a pre-decoded String, so the XML
            // parser itself sees the BOM / encoding declaration (non-UTF-8 is rejected in the peek).
            String rootLocalName;
            try {
                rootLocalName = schemas.peekRootLocalName(raw);
            } catch (Exception e) {
                writeJson(exchange, 400, "{\"error\":\"malformed_xml\",\"detail\":" + jsonStr(e.getMessage()) + "}");
                return;
            }
            if (!schemas.isKnownRoot(rootLocalName)) {
                // Not durable: nothing safe to resume for a type we don't recognise at all.
                writeJson(exchange, 400, "{\"error\":\"unsupported_root_element\",\"rootElement\":" + jsonStr(rootLocalName) + "}");
                return;
            }
            try {
                schemas.validate(rootLocalName, raw);
            } catch (Exception e) {
                writeJson(exchange, 400, "{\"error\":\"xsd_validation_failed\",\"detail\":" + jsonStr(e.getMessage()) + "}");
                return;
            }
            if (!processableTypes.contains(rootLocalName)) {
                // No mapper registered for this type (ProcessingWorker's registry). From the
                // Hub's point of view these are requests waiting for an answer: an immediate
                // "not implemented" is better than a 202 that is never answered. Nothing is stored.
                writeJson(exchange, 501, "{\"error\":\"not_yet_implemented\",\"rootElement\":" + jsonStr(rootLocalName) + "}");
                return;
            }

            // Defence in depth: a DOM re-parse failure here must still be a 400 ("nothing safe to
            // resume"), never the generic 500 below, which the Hub could read as "try again later".
            Document doc;
            try {
                doc = XmlUtil.parseHardened(raw);
            } catch (Exception e) {
                writeJson(exchange, 400, "{\"error\":\"malformed_xml\",\"detail\":" + jsonStr(e.getMessage()) + "}");
                return;
            }
            Element root = doc.getDocumentElement();
            Element header = XmlUtil.firstChild(root, "Header");
            Element body = XmlUtil.firstChild(root, "Body");
            String technicalId = XmlUtil.attr(header, "technicalId");
            String workflowId = XmlUtil.attr(header, "workflowId");
            String from = XmlUtil.attr(header, "from");
            String businessCaseId = XmlUtil.attr(body, "businessCaseId");
            String timeoutValue = XmlUtil.attr(header, "timeoutValue");

            Instant deadlineAt = Instant.now().plus(ResponseBudget.DEFAULT_WINDOW);
            if (!timeoutValue.isBlank()) {
                try {
                    deadlineAt = Instant.parse(timeoutValue);
                } catch (DateTimeParseException e) {
                    // No decided policy yet for a malformed timeoutValue (architecture §8/§10):
                    // retain the default response window rather than rejecting an otherwise valid
                    // message, but log it.
                    System.err.println("[ingress] technicalId=" + technicalId + " has an unparseable timeoutValue=" + timeoutValue + ": " + e.getMessage());
                }
            }

            // peekRootLocalName() has already rejected anything that is not UTF-8, so decoding
            // the raw bytes as UTF-8 for the TEXT column is lossless.
            String xmlForStorage = decodeForStorage(raw);
            String payloadDigest = Db.sha256Hex(raw);
            Db.InboxRow row = db.insertOrGetExisting(rootLocalName, from, technicalId, workflowId,
                    businessCaseId, xmlForStorage, payloadDigest, deadlineAt);

            if (!row.payloadDigest().equals(payloadDigest)) {
                // Record the rejected attempt on the original row so a conflicting redelivery can be
                // investigated later, without ever creating a second row.
                System.err.println("[ingress] conflicting redelivery: technicalId=" + technicalId
                        + " existing payload_digest=" + row.payloadDigest() + " attempted=" + payloadDigest);
                try {
                    db.recordConflictAttempt(row.id(), payloadDigest);
                } catch (Exception recordErr) {
                    System.err.println("[ingress] failed to record conflict attempt for inbox id=" + row.id() + ": " + recordErr);
                }
                writeJson(exchange, 409, "{\"error\":\"conflicting_technical_id\",\"technicalId\":" + jsonStr(technicalId) + "}");
                return;
            }
            writeJson(exchange, 202, "{\"status\":\"accepted\",\"inboxId\":" + row.id() + "}");
        } catch (Exception e) {
            e.printStackTrace();
            writeJson(exchange, 500, "{\"error\":\"internal_error\"}");
        }
    }

    /** Reads at most {@code maxBytes}; returns null (caller sends 413) if the body is larger. */
    private static byte[] readBounded(java.io.InputStream in, long maxBytes) throws java.io.IOException {
        java.io.ByteArrayOutputStream buf = new java.io.ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        long total = 0;
        int n;
        while ((n = in.read(chunk)) != -1) {
            total += n;
            if (total > maxBytes) {
                return null;
            }
            buf.write(chunk, 0, n);
        }
        return buf.toByteArray();
    }

    private static String decodeForStorage(byte[] raw) {
        int offset = (raw.length >= 3 && (raw[0] & 0xFF) == 0xEF && (raw[1] & 0xFF) == 0xBB && (raw[2] & 0xFF) == 0xBF) ? 3 : 0;
        return new String(raw, offset, raw.length - offset, StandardCharsets.UTF_8);
    }

    private static String jsonStr(String s) {
        if (s == null) return "null";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ") + "\"";
    }

    private static void writeJson(HttpExchange exchange, int status, String body) throws java.io.IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
