import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Map;

/**
 * Internal, synchronous dispatch of one outgoing ERRU request type. No redirects and no automatic
 * application retries. Only a Hub HTTP 202 is reported as accepted.
 */
class OutboundXmlHandler implements HttpHandler {
    /** One outgoing message type: its internal path prefix, XSD root, builder and error codes. */
    record Kind(String pathPrefix, String xsdRoot, java.util.function.BiFunction<Map<String, Object>, String, String> builder,
                String invalidCode, String invalidMessage, String notConfiguredCode) { }

    private final SchemaRegistry schemas;
    private final String token;
    private final String memberState;
    private final URI endpoint;
    private final Duration timeout;
    private final HttpClient client;
    private final DispatchStore store;
    private final Kind kind;

    OutboundXmlHandler(Kind kind, SchemaRegistry schemas, String token, String memberState, URI endpoint, Duration timeout, DispatchStore store) {
        this.kind = kind;
        this.store = store;
        this.schemas = schemas;
        this.token = token;
        this.memberState = memberState;
        this.endpoint = endpoint;
        this.timeout = timeout;
        this.client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NEVER).build();
    }

    @Override public void handle(HttpExchange ex) throws IOException {
        boolean validateOnly = ex.getRequestURI().getPath().equals(kind.pathPrefix() + "/validate");
        if (!validateOnly && !ex.getRequestURI().getPath().equals(kind.pathPrefix() + "/send")) {
            reply(ex, 404, Map.of("status", "rejected", "code", "not_found")); return;
        }
        if (!ex.getRequestMethod().equals("POST")) {
            reply(ex, 405, Map.of("status", "rejected", "code", "method_not_allowed")); return;
        }
        String supplied = ex.getRequestHeaders().getFirst("x-internal-service-token");
        if (supplied == null || !MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8))) {
            reply(ex, 403, Map.of("status", "rejected", "code", "forbidden")); return;
        }
        String xml;
        Map<String, Object> dto;
        try {
            byte[] raw = ex.getRequestBody().readNBytes(2 * 1024 * 1024 + 1);
            if (raw.length > 2 * 1024 * 1024) {
                reply(ex, 413, Map.of("status", "rejected", "code", "payload_too_large")); return;
            }
            dto = MiniJson.parseObject(new String(raw, StandardCharsets.UTF_8));
            if (validateOnly) {
                dto.put("technicalId", java.util.UUID.randomUUID().toString());
                dto.put("workflowId", java.util.UUID.randomUUID().toString());
                dto.put("sentAt", java.time.Instant.now().toString());
            }
            xml = kind.builder().apply(dto, memberState);
            schemas.validate(kind.xsdRoot(), xml.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            reply(ex, 422, Map.of("status", "rejected", "code", kind.invalidCode(), "message", kind.invalidMessage())); return;
        }
        if (endpoint == null) {
            reply(ex, 503, Map.of("status", "rejected", "code", kind.notConfiguredCode())); return;
        }
        if (validateOnly) { reply(ex, 200, Map.of("status", "valid")); return; }
        try {
            Map<String, Object> previous = store.reserve(dto.get("technicalId").toString(), dto.get("workflowId").toString(), xml);
            if (previous != null) { reply(ex, 200, previous); return; }
        } catch (DispatchStore.Conflict e) {
            reply(ex, 409, Map.of("status", "rejected", "code", "conflicting_dispatch")); return;
        } catch (Exception e) {
            reply(ex, 503, Map.of("status", "rejected", "code", "dispatch_journal_unavailable")); return;
        }
        Map<String, Object> result;
        // Keep reply outside the dispatch try. A lost response to Ruuter must not trigger a second reply or send.
        try {
            HttpRequest request = HttpRequest.newBuilder(endpoint).timeout(timeout)
                    .header("Content-Type", "application/xml; charset=utf-8")
                    .POST(HttpRequest.BodyPublishers.ofString(xml, StandardCharsets.UTF_8)).build();
            HttpResponse<Void> response = client.send(request, HttpResponse.BodyHandlers.discarding());
            boolean accepted = response.statusCode() == 202;
            // 5xx and unexpected 2xx/3xx do not prove whether the remote side persisted the request.
            String status = accepted ? "accepted" : response.statusCode() >= 400 && response.statusCode() < 500 ? "rejected" : "unknown";
            result = Map.of("status", status, "httpStatus", response.statusCode(),
                    "technicalId", dto.get("technicalId"), "workflowId", dto.get("workflowId"));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            result = Map.of("status", "unknown", "code", "transport_interrupted");
        } catch (IOException e) {
            result = Map.of("status", "unknown", "code", "transport_failure");
        }
        try {
            store.finish(dto.get("technicalId").toString(), result.get("status").toString(),
                    result.containsKey("httpStatus") ? ((Number) result.get("httpStatus")).intValue() : 0);
        } catch (Exception e) {
            result = Map.of("status", "unknown", "code", "dispatch_confirmation_not_persisted");
        }
        // HTTP 200 is the adapter contract. Only status=accepted means the Hub returned 202.
        reply(ex, 200, result);
    }

    private static void reply(HttpExchange ex, int status, Map<String, Object> result) throws IOException {
        byte[] body = MiniJson.write(result).getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(status, body.length);
        try (var out = ex.getResponseBody()) { out.write(body); }
    }
}
