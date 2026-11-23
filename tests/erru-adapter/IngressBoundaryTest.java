import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/** Invalid ingress must be rejected before any database access. */
public class IngressBoundaryTest {
    static void expect(HttpClient client, URI uri, String method, byte[] body, int status, String error) throws Exception {
        var request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10))
                .method(method, HttpRequest.BodyPublishers.ofByteArray(body)).build();
        var response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assert response.statusCode() == status : response.statusCode() + ": " + response.body();
        assert response.headers().firstValue("Content-Type").orElse("").startsWith("application/json");
        assert error.equals(MiniJson.parseObject(response.body()).get("error")) : response.body();
    }

    public static void main(String[] args) throws Exception {
        var schemas = new SchemaRegistry(Path.of("contracts/erru/3.5"));
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        // Deliberately no database: every tested request must stop before durable acceptance.
        server.createContext("/erru/xml", new IngressHandler(schemas, null, new String[0]));
        server.start();
        try (var client = HttpClient.newHttpClient()) {
            URI uri = URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/erru/xml");
            expect(client, uri, "GET", new byte[0], 405, "method_not_allowed");
            expect(client, uri, "POST", new byte[2 * 1024 * 1024 + 1], 413, "payload_too_large");
            expect(client, uri, "POST", new byte[0], 400, "malformed_xml");
            expect(client, uri, "POST", "<Unknown/>".getBytes(StandardCharsets.UTF_8), 400, "unsupported_root_element");
            expect(client, uri, "POST", "<RoadSideInspection_Request/>".getBytes(StandardCharsets.UTF_8), 400, "xsd_validation_failed");
            byte[] valid = RsiRequestXml.build(RsiSendTest.fixture(), "EE").getBytes(StandardCharsets.UTF_8);
            expect(client, uri, "POST", valid, 501, "not_yet_implemented");
            String entity = "<!DOCTYPE root [<!ENTITY leak SYSTEM 'file:///synthetic-private-file'>]><Unknown>&leak;</Unknown>";
            expect(client, uri, "POST", entity.getBytes(StandardCharsets.UTF_8), 400, "malformed_xml");
        } finally {
            server.stop(0);
        }
        var mapper = new RsiResponseMapper();
        var doc = XmlUtil.parseHardened(("<RoadSideInspection_Response><Header workflowId='test-workflow'/>"
                + "<Body statusCode='Found' statusMessage='Received &amp; stored'/></RoadSideInspection_Response>")
                .getBytes(StandardCharsets.UTF_8));
        assert mapper.requestToJson(doc, Instant.EPOCH).equals(Map.of("workflowId", "test-workflow",
                "responseStatusCode", "Found", "responseStatusMessage", "Received & stored"));
        assert mapper.oneWay() && mapper.ruuterTimeout().equals(Duration.ofSeconds(20));
        assert mapper.requestRoot().equals("RoadSideInspection_Response");
        assert mapper.responseRoot().equals("RoadSideInspection_Response");
        assert mapper.ruuterPath().equals("/ljvis/erru/rsi/inbound-response");
        assert mapper.isAnswer(Map.of("status", "responded"));
        assert mapper.isAnswer(Map.of("status", "already_responded"));
        assert !mapper.isAnswer(Map.of("status", "received")) && !mapper.isAnswer(Map.of());
        try {
            mapper.buildResponseXml(Map.of(), doc, "test");
            throw new AssertionError("A response must not produce another response");
        } catch (UnsupportedOperationException expected) {
            // One-way messages must never create a response loop.
        }
        System.out.println("PASS ingress size, method, malformed XML, XSD, unsupported types, XXE and one-way RSI response");
    }
}
