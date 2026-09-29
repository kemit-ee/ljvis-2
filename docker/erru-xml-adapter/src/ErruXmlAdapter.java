import com.sun.net.httpserver.HttpServer;

import java.net.InetSocketAddress;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.List;
import java.util.concurrent.Executors;

/**
 * Entry point. Wires the four roles described in docs/architecture/erru-async-xml.md §2 as
 * threads inside one JVM process (not four separate processes/containers):
 *
 *   - HTTP ingress   : IngressHandler, on the main HttpServer.
 *   - LISTEN client  : a dedicated connection inside each worker (never shared with business work).
 *   - Processing role: ProcessingWorker (inbox -> Ruuter.internal -> outbox).
 *   - Delivery role  : DeliveryWorker (outbox -> Hub).
 *
 * See README.md for what is and is not implemented, and docs/architecture/erru-async-xml.md for
 * the design.
 */
public final class ErruXmlAdapter {
    public static void main(String[] args) throws Exception {
        Config config = Config.load();
        System.out.println("erru-xml-adapter starting: port=" + config.port
                + " dbUrl=" + config.dbUrl
                + " ruuterInternal=" + config.ruuterInternalBaseUrl
                + " hub=" + config.hubResponseUrl
                + " workerId=" + config.workerId);

        SchemaRegistry schemas = new SchemaRegistry(Path.of(config.contractsDir));
        Db db = new Db(config);
        // One MessageMapper per processable type — adding a type is just adding it to this list,
        // ProcessingWorker/IngressHandler take the registry from here.
        List<MessageMapper> mappers = List.of(
                new NuMapper(config.respondingAuthority, config.memberStateCode),
                new NcrMapper(config.respondingAuthorityNcr, config.memberStateCode),
                new CgrMapper(config.memberStateCode),
                new CtudMapper(config.respondingAuthorityCtud, config.memberStateCode),
                new RsiMapper(config.respondingAuthorityRsi, config.memberStateCode)
        );

        List<Thread> workers = new java.util.ArrayList<>();
        for (MessageMapper mapper : mappers) {
            workers.add(startWorker(new ProcessingWorker(config, new Db(config), schemas, List.of(mapper)),
                    "erru-processing-" + mapper.requestRoot()));
        }
        for (int i = 0; i < 2; i++) {
            workers.add(startWorker(new DeliveryWorker(config, new Db(config)), "erru-delivery-" + i));
        }
        HttpServer server = HttpServer.create(new InetSocketAddress(config.port), 0);
        server.createContext("/health", new HealthHandler(config, workers));
        server.createContext("/erru/xml", new IngressHandler(schemas, db,
                mappers.stream().map(MessageMapper::requestRoot).toArray(String[]::new)));
        // A small bounded pool instead of the default single thread, so one slow client cannot
        // block every other request (including /health). It does not add read/idle timeouts: the
        // JDK's built-in HttpServer has no hook for that, so a slowloris-style connection can still
        // occupy one pool thread. Acceptable only while the port is internal/localhost; revisit
        // before any non-local deployment.
        server.setExecutor(Executors.newFixedThreadPool(16));
        server.start();
        System.out.println("erru-xml-adapter listening on :" + config.port);
    }

    private static Thread startWorker(Runnable runnable, String name) {
        Thread thread = new Thread(runnable, name);
        thread.setDaemon(true);
        thread.start();
        return thread;
    }

    /** Checks DB reachability and all processing/delivery threads. */
    private static final class HealthHandler implements com.sun.net.httpserver.HttpHandler {
        private final Config config;
        private final List<Thread> workers;

        HealthHandler(Config config, List<Thread> workers) {
            this.config = config;
            this.workers = workers;
        }

        @Override
        public void handle(com.sun.net.httpserver.HttpExchange ex) throws java.io.IOException {
            String problem = null;
            if (workers.stream().anyMatch(worker -> !worker.isAlive())) {
                problem = "worker thread is dead";
            } else {
                try (var c = DriverManager.getConnection(config.dbUrl, config.dbUser, config.dbPassword);
                     var st = c.createStatement()) {
                    st.execute("SELECT 1");
                } catch (Exception e) {
                    problem = "database unreachable: " + e;
                }
            }
            byte[] body = (problem == null ? "ok" : "not ok: " + problem).getBytes(java.nio.charset.StandardCharsets.UTF_8);
            ex.sendResponseHeaders(problem == null ? 200 : 503, body.length);
            try (var os = ex.getResponseBody()) { os.write(body); }
        }
    }
}
