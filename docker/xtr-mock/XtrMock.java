import com.sun.net.httpserver.HttpExchange;
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
 * representation DSLs' `http.post [#LJVIS_XTR]/ar/esindus_v{1,2}` call fails at
 * the transport layer and Rust Ruuter aborts the whole DSL with 500.
 *
 * Wired ONLY in docker-compose.ci.yml (service name `xtr`, the DNS alias
 * LJVIS_XTR already resolves to). constants.ini is untouched: dev keeps the
 * real xtr container, prod keeps whatever its ConfigMap sets.
 *
 * Behaviour:
 *   GET  /health   -> 200 "ok"
 *   POST /ar/...    -> 200 "{}"  (Äriregister group: esindus_v1/v2, lihtandmed,
 *                     detailandmed, ...). An empty JSON object is parsed by the
 *                     callers as "no represented companies" / "no data", so the
 *                     representation checks resolve to 403 NOT_REPRESENTATIVE
 *                     instead of 500 (DSL abort) or 503 (a non-2xx reply is
 *                     treated as "Äriregister unavailable").
 *   anything else   -> 404 (etoimik/*, liiklusregister/* — their callers already
 *                     treat a non-2xx XTR reply as "X-tee unavailable" and the
 *                     cron resilience tests explicitly accept 200/404/500/502).
 *
 * No JSON library: every response body is a constant.
 */
public class XtrMock {

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/health", ex -> write(ex, 200, "ok"));
        server.createContext("/ar/", XtrMock::handleArireg);
        server.createContext("/", ex -> write(ex, 404, "{\"error\":\"xtr-mock: no stub for this path\"}"));
        server.setExecutor(null);
        server.start();
        System.out.println("XTR mock listening on :" + port);
    }

    private static void handleArireg(HttpExchange exchange) throws IOException {
        // drain the request body so the connection can be reused
        exchange.getRequestBody().readAllBytes();
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            write(exchange, 405, "{\"error\":\"method_not_allowed\"}");
            return;
        }
        write(exchange, 200, "{}");
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
