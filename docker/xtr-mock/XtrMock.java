import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

/**
 * Minimal stand-in for XTR (X-tee Translator) — CI ONLY.
 *
 * The real XTR (turnerrainer/xtr:rc, see docker-compose.yml) needs an X-tee
 * security server and a registered subsystem, neither of which exists in the
 * isolated CI stack. Without something answering on http://xtr:8080 the citizen
 * representation DSLs' `http.post [#LJVIS_XTR]/ar/esindus_v1` call fails at the
 * transport layer and Rust Ruuter aborts the whole DSL with 500 instead of the
 * DSL's own "AR unavailable / not a representative" handling (403).
 *
 * This mock is wired ONLY in docker-compose.ci.yml. constants.ini is untouched:
 * dev keeps the real xtr container, prod keeps whatever its ConfigMap sets.
 *
 * Behaviour:
 *   GET  /health          -> 200 "ok"
 *   POST /ar/esindus_v1    -> 200, esindus_v1-shaped response with an EMPTY
 *                             represented-company list (keha.ettevotjad.item=[])
 *                             => callers resolve "not a representative" => 403
 *   anything else          -> 404 (callers already treat a non-2xx XTR reply as
 *                             "X-tee unavailable" and degrade gracefully; the
 *                             cron resilience tests explicitly accept 200/500/502)
 *
 * No JSON library: the one response body is a constant.
 */
public class XtrMock {

    private static final String ESINDUS_EMPTY =
        "{\"body\":{\"esindus_v1Response\":{\"keha\":{\"ettevotjad\":{\"item\":[]}}}}}";

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/health", ex -> write(ex, 200, "ok"));
        server.createContext("/ar/esindus_v1", new EsindusHandler());
        server.createContext("/", ex -> write(ex, 404, "{\"error\":\"xtr-mock: no stub for this path\"}"));
        server.setExecutor(null);
        server.start();
        System.out.println("XTR mock listening on :" + port);
    }

    static class EsindusHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            // drain the request body so the connection can be reused
            exchange.getRequestBody().readAllBytes();
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                write(exchange, 405, "{\"error\":\"method_not_allowed\"}");
                return;
            }
            write(exchange, 200, ESINDUS_EMPTY);
        }
    }

    private static void write(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
