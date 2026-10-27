import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/** Real HTTP dispatch tests. Run with assertions enabled; use only synthetic fixtures. */
public class RsiSendTest {
    static final class MemoryStore implements RsiDispatchStore {
        final Map<String, String> payloads = new ConcurrentHashMap<>();
        final Map<String, Map<String, Object>> results = new ConcurrentHashMap<>();
        @Override public synchronized Map<String, Object> reserve(String id, String workflow, String xml) throws Exception {
            String previous = payloads.putIfAbsent(id, xml);
            if (previous == null) { results.put(id, Map.of("status", "unknown")); return null; }
            if (!previous.equals(xml)) throw new Conflict();
            return results.get(id);
        }
        @Override public void finish(String id, String status, int code) {
            results.put(id, Map.of("status", status, "httpStatus", code));
        }
    }
    static Map<String, Object> fixture() throws Exception {
        Map<String, Object> dto = new LinkedHashMap<>(MiniJson.parseObject(Files.readString(Path.of("tests/erru-adapter/fixtures/rsi.json"))));
        dto.put("technicalId", UUID.randomUUID().toString());
        dto.put("workflowId", UUID.randomUUID().toString());
        dto.put("rsiTo", "EE");
        dto.put("businessCaseId", "EE-RSI-TEST-001");
        return dto;
    }
    public static void main(String[] args) throws Exception {
        SchemaRegistry schemas = new SchemaRegistry(Path.of("contracts/erru/3.5"));
        AtomicInteger received = new AtomicInteger();
        AtomicInteger mode = new AtomicInteger(202);
        var pool = Executors.newFixedThreadPool(6);
        HttpServer hub = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        hub.setExecutor(pool);
        hub.createContext("/rsi", ex -> {
            try {
                assert ex.getRequestHeaders().getFirst("Content-Type").startsWith("application/xml");
                byte[] xml = ex.getRequestBody().readAllBytes();
                schemas.validate("RoadSideInspection_Request", xml);
                var doc = XmlUtil.parseHardened(xml);
                var header = XmlUtil.firstChild(doc.getDocumentElement(), "Header");
                assert "EE".equals(XmlUtil.attr(header, "from"));
                assert "EE".equals(XmlUtil.attr(header, "to"));
                assert !XmlUtil.attr(header, "technicalId").isEmpty();
                received.incrementAndGet();
                if (mode.get() == 999) Thread.sleep(1200);
                int code = mode.get() == 999 ? 202 : mode.get();
                ex.sendResponseHeaders(code, -1); ex.close();
            } catch (Exception e) { throw new RuntimeException(e); }
        });
        hub.start();
        HttpServer adapter = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        adapter.setExecutor(pool);
        MemoryStore store = new MemoryStore();
        adapter.createContext("/internal/rsi/send", new RsiSendHandler(schemas, "test-token", "EE",
                URI.create("http://127.0.0.1:" + hub.getAddress().getPort() + "/rsi"), Duration.ofMillis(600), store));
        adapter.start();
        URI url = URI.create("http://127.0.0.1:" + adapter.getAddress().getPort() + "/internal/rsi/send");
        HttpClient client = HttpClient.newHttpClient();
        try {
            Map<String, Object> dto = fixture();
            dto.put("originatingAuthority", "TEST & <Authority> \"quoted\"");
            dto.put("inspectionDatetime", "2026-09-23T12:00:00+03:00");
            String xml = RsiRequestXml.build(dto, "EE");
            schemas.validate("RoadSideInspection_Request", xml.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            assert xml.contains("inspectionDateTime=\"2026-09-23T09:00:00Z\"");
            assert xml.contains("TEST &amp; &lt;Authority&gt; &quot;quoted&quot;");
            assert call(client, url, dto, "wrong").statusCode() == 403;
            assert received.get() == 0;
            var accepted = call(client, url, dto, "test-token");
            assert accepted.statusCode() == 200 : accepted.body();
            assert "accepted".equals(MiniJson.parseObject(accepted.body()).get("status")) : accepted.body();
            assert received.get() == 1;
            call(client, url, dto, "test-token");
            assert received.get() == 1 : "Replay resent XML";
            dto.put("inspectionLocation", "different");
            assert call(client, url, dto, "test-token").statusCode() == 409;
            assert received.get() == 1;
            Map<String, Object> invalid = fixture(); invalid.remove("driverFirstName");
            assert call(client, url, invalid, "test-token").statusCode() == 422;
            invalid = fixture(); invalid.put("vehicleCategory", "INVALID");
            assert call(client, url, invalid, "test-token").statusCode() == 422;
            invalid = fixture(); invalid.put("odometerReading", "1.5");
            assert call(client, url, invalid, "test-token").statusCode() == 422;
            assert received.get() == 1 : "Invalid XML reached Hub";
            mode.set(400);
            assert "rejected".equals(MiniJson.parseObject(call(client, url, fixture(), "test-token").body()).get("status"));
            mode.set(200);
            assert "unknown".equals(MiniJson.parseObject(call(client, url, fixture(), "test-token").body()).get("status"));
            mode.set(999);
            Map<String, Object> slow = fixture();
            assert "unknown".equals(MiniJson.parseObject(call(client, url, slow, "test-token").body()).get("status"));
            int before = received.get();
            call(client, url, slow, "test-token");
            assert received.get() == before : "Uncertain request was resent";
            // Holder branches must produce XSD-valid XML too.
            for (String person : new String[]{"company", "natural_person"}) {
                Map<String, Object> holder = fixture();
                holder.put("identificationDetails", Map.of("isVehicleHolder", "owner", "isNaturalPerson", person,
                    "companyName", "TEST OU", "firstName", "TEST", "familyName", "PERSON",
                    "address", Map.of("address", "Test 1", "postCode", "10111", "city", "Tallinn", "country", "EE")));
                schemas.validate("RoadSideInspection_Request", RsiRequestXml.build(holder, "EE").getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
            System.out.println("PASS RSI XML/XSD, escaped data, UTC, integer validation, auth, HTTP 202/400/200, timeout, replay, conflict, holder branches");
        } finally { adapter.stop(0); hub.stop(0); pool.shutdownNow(); }
    }
    static HttpResponse<String> call(HttpClient client, URI url, Map<String, Object> dto, String token) throws Exception {
        return client.send(HttpRequest.newBuilder(url).header("x-internal-service-token", token)
                .header("Content-Type", "application/json").timeout(Duration.ofSeconds(4))
                .POST(HttpRequest.BodyPublishers.ofString(MiniJson.write(dto))).build(), HttpResponse.BodyHandlers.ofString());
    }
}
