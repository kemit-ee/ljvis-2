import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/** Local test Hub: validates XML and retains replies by workflow for deterministic assertions. */
public final class ErruHubMock {
    private static final String RESPONSE_PATH = System.getenv().getOrDefault("RESPONSE_PATH", "/erru/http/response/btshttpreceive.dll");
    private static final int MAX_BODY_BYTES = 16 * 1024 * 1024;
    private static final Map<String, String> RECEIVED = new LinkedHashMap<>();
    private static final AtomicInteger COUNT = new AtomicInteger();
    private static String last = "";

    public static void main(String[] args) throws Exception {
        var schemas = new SchemaRegistry(Path.of(System.getenv().getOrDefault("CONTRACTS_DIR", "/app/contracts/erru/3.5")));
        var server = HttpServer.create(new InetSocketAddress(Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"))), 0);
        server.createContext("/health", ex -> write(ex, 200, "text/plain", "ok"));
        server.createContext(RESPONSE_PATH, ex -> receive(ex, schemas));
        server.createContext("/_test/count", ex -> write(ex, 200, "application/json", "{\"count\":" + COUNT.get() + "}"));
        server.createContext("/_test/last", ex -> {
            String xml;
            synchronized (RECEIVED) { xml = last; }
            write(ex, xml.isEmpty() ? 404 : 200, "application/xml", xml);
        });
        server.createContext("/_test/workflow/", ex -> {
            String workflow = ex.getRequestURI().getPath().substring("/_test/workflow/".length());
            String xml;
            synchronized (RECEIVED) { xml = RECEIVED.get(workflow); }
            write(ex, xml == null ? 404 : 200, "application/xml", xml == null ? "" : xml);
        });
        server.createContext("/_test/wait/", ErruHubMock::waitForWorkers);
        server.setExecutor(Executors.newFixedThreadPool(8));
        server.start();
        System.out.println("ERRU mock answer path=" + RESPONSE_PATH);
    }

    private static void receive(HttpExchange exchange, SchemaRegistry schemas) throws java.io.IOException {
        if (!RESPONSE_PATH.equals(exchange.getRequestURI().getPath()) || !"POST".equals(exchange.getRequestMethod())) {
            write(exchange, 404, "text/plain", "Unknown endpoint");
            return;
        }
        byte[] bytes = exchange.getRequestBody().readNBytes(MAX_BODY_BYTES + 1);
        if (bytes.length > MAX_BODY_BYTES) {
            write(exchange, 413, "text/plain", "Body too large");
            return;
        }
        String xml = new String(bytes, StandardCharsets.UTF_8);
        String workflow;
        try {
            String root = schemas.peekRootLocalName(bytes);
            if (!Set.of(SchemaRegistry.RESPONSE_ENTRY_FILES).contains(root + ".xsd")) throw new IllegalArgumentException("Not a response");
            schemas.validate(root, bytes);
            var doc = XmlUtil.parseHardened(bytes);
            ResponseValidator.validate(doc);
            workflow = XmlUtil.attr(XmlUtil.firstChild(doc.getDocumentElement(), "Header"), "workflowId");
        } catch (Exception e) {
            write(exchange, 400, "text/plain", "Invalid ERRU response: " + e.getMessage());
            return;
        }
        synchronized (RECEIVED) {
            RECEIVED.put(workflow, xml);
            if (RECEIVED.size() > 500) RECEIVED.remove(RECEIVED.keySet().iterator().next());
            last = xml;
            COUNT.incrementAndGet();
        }
        String query = exchange.getRequestURI().getQuery();
        if ("delayMs=12000".equals(query)) {
            try { Thread.sleep(12000); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }
        write(exchange, 200, "text/plain", "OK");
    }

    private static void waitForWorkers(HttpExchange exchange) throws java.io.IOException {
        try {
            long millis = Long.parseLong(exchange.getRequestURI().getPath().substring("/_test/wait/".length()));
            if (millis < 0 || millis > 30000) throw new IllegalArgumentException();
            Thread.sleep(millis);
            write(exchange, 200, "text/plain", "ok");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            write(exchange, 503, "text/plain", "interrupted");
        } catch (IllegalArgumentException e) {
            write(exchange, 400, "text/plain", "invalid delay");
        }
    }

    private static void write(HttpExchange ex, int status, String type, String body) throws java.io.IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", type + "; charset=utf-8");
        ex.sendResponseHeaders(status, bytes.length);
        try (var out = ex.getResponseBody()) { out.write(bytes); }
    }
}
