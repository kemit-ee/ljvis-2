import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import eu.cec.move.commonservices.CommonServices;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Minimal HTTP wrapper around the official EC CommonServices.getNYSIISSearchKey, so
 * Ruuter DSL (no JVM) can call it over HTTP. See README.md for why this must be the EC's
 * own binary and not a reimplementation.
 *
 * No JSON library dependency by design (the jar's only requirement is the JDK) — request
 * bodies are always produced by our own DSL templates, so a small tolerant regex extractor
 * is sufficient and keeps the Docker image to "javac + java", no build tool.
 */
public class NysiisService {

    private static final Pattern NAME_FIELD =
        Pattern.compile("\"name\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
    private static final Pattern USE_FULL_NAME_FIELD =
        Pattern.compile("\"useFullName\"\\s*:\\s*(true|false)");

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/health", new HealthHandler());
        server.createContext("/nysiis", new NysiisHandler());
        server.setExecutor(null);
        server.start();
        System.out.println("NYSIIS sidecar listening on :" + port);
    }

    static class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            writeResponse(exchange, 200, "ok");
        }
    }

    static class NysiisHandler implements HttpHandler {
        private final CommonServices commonServices = new CommonServices();

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                writeResponse(exchange, 405, "{\"error\":\"method_not_allowed\"}");
                return;
            }

            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            Matcher nameMatcher = NAME_FIELD.matcher(body);
            if (!nameMatcher.find()) {
                writeResponse(exchange, 400, "{\"error\":\"missing_name\"}");
                return;
            }
            String name = unescape(nameMatcher.group(1));

            Matcher useFullNameMatcher = USE_FULL_NAME_FIELD.matcher(body);
            boolean useFullName = useFullNameMatcher.find() && "true".equals(useFullNameMatcher.group(1));

            if (name.trim().isEmpty()) {
                writeResponse(exchange, 200, "{\"searchKey\":\"\"}");
                return;
            }

            try {
                String searchKey = commonServices.getNYSIISSearchKey(name, useFullName);
                writeResponse(exchange, 200, "{\"searchKey\":\"" + escape(searchKey) + "\"}");
            } catch (Exception e) {
                // eu.cec.move.commonservices.IllegalEncodingException or anything unexpected —
                // the input contains characters outside the transliteration package's
                // supported Latin(extended)/Greek/Cyrillic range (see README.md / the PDF §3).
                writeResponse(exchange, 422, "{\"error\":\"illegal_encoding\",\"message\":\"" + escape(e.getMessage() == null ? "" : e.getMessage()) + "\"}");
            }
        }
    }

    private static String unescape(String s) {
        return s.replace("\\\"", "\"").replace("\\\\", "\\");
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static void writeResponse(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
