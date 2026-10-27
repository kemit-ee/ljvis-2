import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/** Outgoing CGR/CTUD: XML/XSD, real local HTTP dispatch, replay, and response-to-JSON mapping. Synthetic data only. */
public class CgrCtudSendTest {
    static final class MemoryStore implements DispatchStore {
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

    static Map<String, Object> envelope(String businessCaseId) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("technicalId", UUID.randomUUID().toString());
        dto.put("workflowId", UUID.randomUUID().toString());
        dto.put("sentAt", "2026-12-22T10:00:00Z");
        dto.put("businessCaseId", businessCaseId);
        dto.put("originatingAuthority", "EE-TRAM");
        dto.put("requestSource", "CA");
        dto.put("requestPurpose", "Issue");
        return dto;
    }
    static Map<String, Object> cgr() {
        Map<String, Object> dto = envelope("CGR-EE-2026-00001");
        dto.put("cgrTo", "ZZ");
        dto.put("tmFirstName", "Mari"); dto.put("tmFamilyName", "Maasikas");
        dto.put("tmDateOfBirth", "1980-05-01T00:00:00Z"); dto.put("tmPlaceOfBirth", "Tallinn");
        dto.put("tmFirstNameSearchKey", "MAR"); dto.put("tmFamilyNameSearchKey", "MASACAS");
        return dto;
    }
    static Map<String, Object> ctud() {
        Map<String, Object> dto = envelope("CTUD-EE-2026-00001");
        dto.put("ctudTo", "DE");
        dto.put("transportUndertakingName", "Test & <Transport> OU");
        dto.put("communityLicenceNumber", "EE-1234");
        dto.put("requestAllVehicles", "false");
        return dto;
    }

    static final String NS = "xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\"";
    static final String HEADER = "<Header version=\"3.5\" technicalId=\"" + "00000000-0000-4000-8000-000000000001"
            + "\" workflowId=\"00000000-0000-4000-8000-000000000002\" sentAt=\"2026-12-22T10:05:00Z\" from=\"DE\" to=\"EE\"/>";
    static final String SEARCHED_TM = "<SearchedTransportManager><TransportManagerNameDetails firstName=\"Mari\" familyName=\"Maasikas\" dateOfBirth=\"1980-05-01\"/></SearchedTransportManager>";

    public static void main(String[] args) throws Exception {
        SchemaRegistry schemas = new SchemaRegistry(java.nio.file.Path.of("contracts/erru/3.5"));
        builders(schemas);
        dispatch(schemas);
        responses(schemas);
        System.out.println("PASS CGR/CTUD XML/XSD, search variants, escaping, auth, HTTP 202/400/200, timeout, replay, conflict, resend, response mapping");
    }

    static void builders(SchemaRegistry schemas) throws Exception {
        String xml = CgrRequestXml.build(cgr(), "EE");
        schemas.validate("CheckGoodRepute_Request", xml.getBytes(StandardCharsets.UTF_8));
        assert xml.contains("to=\"ZZ\"") && xml.contains("dateOfBirth=\"1980-05-01\"") : xml;
        assert xml.contains("firstNameSearchKey=\"MAR\"") && xml.contains("familyNameSearchKey=\"MASACAS\"");
        Map<String, Object> both = cgr();
        both.put("certificateNumber", "CPC-1"); both.put("certificateIssueDate", "2020-01-01"); both.put("certificateIssueCountry", "EE");
        schemas.validate("CheckGoodRepute_Request", CgrRequestXml.build(both, "EE").getBytes(StandardCharsets.UTF_8));
        Map<String, Object> certificateOnly = envelope("CGR-EE-2026-00002");
        certificateOnly.put("cgrTo", "LV");
        certificateOnly.put("certificateNumber", "CPC-1"); certificateOnly.put("certificateIssueDate", "2020-01-01"); certificateOnly.put("certificateIssueCountry", "EE");
        String single = CgrRequestXml.build(certificateOnly, "EE");
        schemas.validate("CheckGoodRepute_Request", single.getBytes(StandardCharsets.UTF_8));
        assert single.contains("to=\"LV\"") && !single.contains("TransportManagerNameDetails");
        for (String missing : List.of("tmFirstName", "tmFamilyName", "tmDateOfBirth", "cgrTo", "businessCaseId", "requestSource")) {
            Map<String, Object> bad = cgr(); bad.remove(missing);
            assertInvalid(() -> schemas.validate("CheckGoodRepute_Request", CgrRequestXml.build(bad, "EE").getBytes(StandardCharsets.UTF_8)), "CGR without " + missing);
        }
        Map<String, Object> noCriteria = envelope("CGR-EE-2026-00003"); noCriteria.put("cgrTo", "ZZ");
        assertInvalid(() -> CgrRequestXml.build(noCriteria, "EE"), "CGR without criteria");

        String licenceAndName = CtudRequestXml.build(ctud(), "EE");
        schemas.validate("CheckTransportUndertakingData_Request", licenceAndName.getBytes(StandardCharsets.UTF_8));
        assert licenceAndName.contains("SearchByLicenceAndName") && licenceAndName.contains("Test &amp; &lt;Transport&gt; OU");
        Map<String, Object> vehicle = ctud();
        vehicle.put("vehicleRegistrationNumber", "123ABC"); vehicle.put("vehicleRegistrationCountry", "EE");
        schemas.validate("CheckTransportUndertakingData_Request", CtudRequestXml.build(vehicle, "EE").getBytes(StandardCharsets.UTF_8));
        Map<String, Object> licenceVehicle = new LinkedHashMap<>(vehicle); licenceVehicle.remove("transportUndertakingName");
        String lv = CtudRequestXml.build(licenceVehicle, "EE");
        schemas.validate("CheckTransportUndertakingData_Request", lv.getBytes(StandardCharsets.UTF_8));
        assert lv.contains("SearchByLicenceAndVehicle");
        Map<String, Object> nameVehicle = new LinkedHashMap<>(vehicle); nameVehicle.remove("communityLicenceNumber"); nameVehicle.put("requestAllVehicles", "true");
        String nv = CtudRequestXml.build(nameVehicle, "EE");
        schemas.validate("CheckTransportUndertakingData_Request", nv.getBytes(StandardCharsets.UTF_8));
        assert nv.contains("SearchByNameAndVehicle") && nv.contains("requestAllVehicles=\"true\"");
        Map<String, Object> onlyName = ctud(); onlyName.remove("communityLicenceNumber");
        assertInvalid(() -> CtudRequestXml.build(onlyName, "EE"), "CTUD with one criterion");
        Map<String, Object> noCountry = new LinkedHashMap<>(vehicle); noCountry.remove("vehicleRegistrationCountry");
        assertInvalid(() -> CtudRequestXml.build(noCountry, "EE"), "CTUD vehicle without country");
        Map<String, Object> fuzzyBoolean = ctud(); fuzzyBoolean.put("requestAllVehicles", "");
        assertInvalid(() -> CtudRequestXml.build(fuzzyBoolean, "EE"), "CTUD without explicit boolean");
    }

    static void dispatch(SchemaRegistry schemas) throws Exception {
        AtomicInteger received = new AtomicInteger();
        AtomicInteger mode = new AtomicInteger(202);
        var pool = Executors.newFixedThreadPool(8);
        HttpServer hub = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        hub.setExecutor(pool);
        for (String[] route : new String[][]{{"/cgr", "CheckGoodRepute_Request"}, {"/ctud", "CheckTransportUndertakingData_Request"}}) {
            hub.createContext(route[0], ex -> {
                try {
                    assert ex.getRequestHeaders().getFirst("Content-Type").startsWith("application/xml");
                    byte[] xml = ex.getRequestBody().readAllBytes();
                    schemas.validate(route[1], xml);
                    var header = XmlUtil.firstChild(XmlUtil.parseHardened(xml).getDocumentElement(), "Header");
                    assert "EE".equals(XmlUtil.attr(header, "from"));
                    received.incrementAndGet();
                    if (mode.get() == 999) Thread.sleep(1200);
                    ex.sendResponseHeaders(mode.get() == 999 ? 202 : mode.get(), -1); ex.close();
                } catch (Exception e) { throw new RuntimeException(e); }
            });
        }
        hub.start();
        HttpServer adapter = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        adapter.setExecutor(pool);
        String hubBase = "http://127.0.0.1:" + hub.getAddress().getPort();
        var cgrSender = new OutboundXmlHandler(ErruXmlAdapter.CGR_KIND, schemas, "test-token", "EE", URI.create(hubBase + "/cgr"), Duration.ofMillis(600), new MemoryStore());
        var ctudSender = new OutboundXmlHandler(ErruXmlAdapter.CTUD_KIND, schemas, "test-token", "EE", URI.create(hubBase + "/ctud"), Duration.ofMillis(600), new MemoryStore());
        var unconfigured = new OutboundXmlHandler(ErruXmlAdapter.CGR_KIND, schemas, "test-token", "EE", null, Duration.ofMillis(600), new MemoryStore());
        adapter.createContext("/internal/cgr", cgrSender);
        adapter.createContext("/internal/ctud", ctudSender);
        adapter.start();
        HttpServer offline = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        offline.setExecutor(pool);
        offline.createContext("/internal/cgr", unconfigured);
        offline.start();
        String base = "http://127.0.0.1:" + adapter.getAddress().getPort();
        HttpClient client = HttpClient.newHttpClient();
        try {
            URI cgrSend = URI.create(base + "/internal/cgr/send"), cgrValidate = URI.create(base + "/internal/cgr/validate");
            URI ctudSend = URI.create(base + "/internal/ctud/send");
            Map<String, Object> dto = cgr();
            assert call(client, cgrSend, dto, "wrong").statusCode() == 403;
            assert received.get() == 0;
            var accepted = call(client, cgrSend, dto, "test-token");
            assert "accepted".equals(MiniJson.parseObject(accepted.body()).get("status")) : accepted.body();
            assert received.get() == 1;
            call(client, cgrSend, dto, "test-token");
            assert received.get() == 1 : "Replay resent XML";
            Map<String, Object> changed = new LinkedHashMap<>(dto); changed.put("tmPlaceOfBirth", "Tartu");
            assert call(client, cgrSend, changed, "test-token").statusCode() == 409;
            // Resend to one member state: same workflow, new technicalId, new XML.
            Map<String, Object> resend = new LinkedHashMap<>(dto);
            resend.put("technicalId", UUID.randomUUID().toString()); resend.put("cgrTo", "LV");
            assert "accepted".equals(MiniJson.parseObject(call(client, cgrSend, resend, "test-token").body()).get("status"));
            assert received.get() == 2;
            // validate never reaches the Hub and needs no identifiers.
            Map<String, Object> draft = cgr(); draft.remove("technicalId"); draft.remove("workflowId"); draft.remove("sentAt");
            assert "valid".equals(MiniJson.parseObject(call(client, cgrValidate, draft, "test-token").body()).get("status"));
            Map<String, Object> invalid = cgr(); invalid.remove("tmDateOfBirth");
            var rejected = call(client, cgrValidate, invalid, "test-token");
            assert rejected.statusCode() == 422 && rejected.body().contains("invalid_cgr_xml") : rejected.body();
            assert received.get() == 2 : "Invalid XML reached Hub";
            mode.set(400);
            assert "rejected".equals(MiniJson.parseObject(call(client, ctudSend, ctud(), "test-token").body()).get("status"));
            mode.set(200);
            assert "unknown".equals(MiniJson.parseObject(call(client, ctudSend, ctud(), "test-token").body()).get("status"));
            mode.set(202);
            var ctudAccepted = call(client, ctudSend, ctud(), "test-token");
            assert "accepted".equals(MiniJson.parseObject(ctudAccepted.body()).get("status")) : ctudAccepted.body();
            mode.set(999);
            Map<String, Object> slow = ctud();
            assert "unknown".equals(MiniJson.parseObject(call(client, ctudSend, slow, "test-token").body()).get("status"));
            int before = received.get();
            call(client, ctudSend, slow, "test-token");
            assert received.get() == before : "Uncertain request was resent";
            mode.set(202);
            var off = call(client, URI.create("http://127.0.0.1:" + offline.getAddress().getPort() + "/internal/cgr/send"), cgr(), "test-token");
            assert off.statusCode() == 503 && off.body().contains("cgr_endpoint_not_configured") : off.body();
            assert call(client, URI.create(base + "/internal/cgr/other"), cgr(), "test-token").statusCode() == 404;
        } finally { adapter.stop(0); offline.stop(0); hub.stop(0); pool.shutdownNow(); }
    }

    static void responses(SchemaRegistry schemas) throws Exception {
        String undertaking = "<TransportUndertaking transportUndertakingName=\"Rhein &amp; Co\" communityLicenceNumber=\"DE-1\" communityLicenceStatus=\"Active\" numberOfVehicles=\"3\">"
                + "<TransportUndertakingAddress address=\"Str 1\" postCode=\"10115\" city=\"Berlin\" country=\"DE\"/></TransportUndertaking>";
        String manager = "<TransportManagerDetails respondingAuthority=\"DE-BAG\" searchMethod=\"NYSIIS\">"
                + "<TransportManagerNameDetails firstName=\"Mari\" familyName=\"Maasikas\" dateOfBirth=\"1980-05-01\"/>"
                + "<TransportManagerAddressDetails address=\"Str 2\" postCode=\"10115\" city=\"Berlin\" country=\"DE\"/>"
                + "<TransportManagerCertificateDetails certificateNumber=\"CPC-1\" certificateIssueDate=\"2020-01-01\" certificateIssueCountry=\"EE\" certificateValidity=\"Valid\">"
                + "<Fitness fitnessStatus=\"Fit\"/></TransportManagerCertificateDetails>"
                + "<TransportUndertakings totalManagedUndertakings=\"1\" totalManagedVehicles=\"3\">" + undertaking + "</TransportUndertakings></TransportManagerDetails>";
        String cgrResponse = "<CheckGoodRepute_Response " + NS + ">" + HEADER
                + "<Body businessCaseId=\"CGR-EE-2026-00001\" originatingAuthority=\"EE-TRAM\">" + SEARCHED_TM
                + "<MemberState memberStateCode=\"DE\" statusCode=\"Found\">" + manager + manager + "</MemberState>"
                + "<MemberState memberStateCode=\"LV\" statusCode=\"NotFound\" statusMessage=\"none\"/>"
                + "</Body></CheckGoodRepute_Response>";
        schemas.validate("CheckGoodRepute_Response", cgrResponse.getBytes(StandardCharsets.UTF_8));
        var mapper = new CgrResponseMapper();
        Map<String, Object> json = mapper.requestToJson(XmlUtil.parseHardened(cgrResponse), java.time.Instant.now());
        assert "00000000-0000-4000-8000-000000000002".equals(json.get("workflowId"));
        assert "CGR-EE-2026-00001".equals(json.get("businessCaseId"));
        @SuppressWarnings("unchecked")
        List<Object> states = (List<Object>) MiniJson.parseObject("{\"a\":" + json.get("memberStates") + "}").get("a");
        assert states.size() == 2 : json.get("memberStates");
        @SuppressWarnings("unchecked")
        Map<String, Object> de = (Map<String, Object>) states.get(0);
        assert "DE".equals(de.get("memberStateCode")) && "Found".equals(de.get("statusCode"));
        @SuppressWarnings("unchecked")
        Map<String, Object> details = (Map<String, Object>) de.get("transportManagerDetails");
        assert "DE-BAG".equals(details.get("respondingAuthority")) && details.containsKey("nameDetails") && details.containsKey("addressDetails");
        assert de.containsKey("additionalTransportManagerDetails") : "Second manager was dropped";
        String shaped = MiniJson.write(details);
        assert shaped.contains("\"totalManagedVehicles\":3") && shaped.contains("\"fitnessStatus\":\"Fit\"") && shaped.contains("Rhein & Co") : shaped;
        @SuppressWarnings("unchecked")
        Map<String, Object> lv = (Map<String, Object>) states.get(1);
        assert "NotFound".equals(lv.get("statusCode")) && "none".equals(lv.get("statusMessage")) && !lv.containsKey("transportManagerDetails");
        assert mapper.oneWay() && mapper.isAnswer(Map.of("status", "responded")) && !mapper.isAnswer(Map.of("status", "x"));

        String ctudResponse = "<CheckTransportUndertakingData_Response " + NS + ">" + HEADER
                + "<Body businessCaseId=\"CTUD-EE-2026-00001\" originatingAuthority=\"EE-TRAM\" respondingAuthority=\"DE-BAG\" statusCode=\"Found\">"
                + "<SearchedCompany requestAllVehicles=\"false\"><SearchByLicenceAndName transportUndertakingName=\"X\" communityLicenceNumber=\"EE-1234\"/></SearchedCompany>"
                + "<TransportUndertaking transportUndertakingName=\"Rhein &amp; Co\" legalForm=\"GmbH\" numberOfVehicles=\"3\" numberOfEmployees=\"7\" riskRating=\"0\" riskBand=\"Grey\" searchMethod=\"CommunityLicence\">"
                + "<VehicleRegistrations><Vehicle vehicleRegistrationNumber=\"B-XY 1\" vehicleRegistrationCountry=\"DE\"/></VehicleRegistrations>"
                + "<TransportUndertakingAddress address=\"Str 1\" postCode=\"10115\" city=\"Berlin\" country=\"DE\"/>"
                + "<CommunityLicenceDetails communityLicenceNumber=\"DE-1\" communityLicenceStatus=\"Active\" communityLicenceType=\"Community licence for goods transport\" startDate=\"2020-01-01\" expiryDate=\"2030-01-01\" licencingAuthority=\"DE-BAG\"/>"
                + "<CertifiedTrueCopyDetails><CertifiedTrueCopy trueCopyNumber=\"TC-1\" trueCopyIssueDate=\"2020-01-01\" trueCopyExpiryDate=\"2030-01-01\"/></CertifiedTrueCopyDetails>"
                + "</TransportUndertaking></Body></CheckTransportUndertakingData_Response>";
        schemas.validate("CheckTransportUndertakingData_Response", ctudResponse.getBytes(StandardCharsets.UTF_8));
        var ctudMapper = new CtudResponseMapper();
        Map<String, Object> ctudJson = ctudMapper.requestToJson(XmlUtil.parseHardened(ctudResponse), java.time.Instant.now());
        assert "Found".equals(ctudJson.get("responseStatusCode")) && "DE-BAG".equals(ctudJson.get("respondingAuthority"));
        String content = (String) ctudJson.get("responseContent");
        assert content.contains("\"communityLicenceType\":\"CommunityLicenceGoods\"") : content;
        assert content.contains("\"vehicleRegistrations\":[\"B-XY 1\"]") && content.contains("\"numberOfVehicles\":3") && content.contains("TC-1") : content;
        String notFound = "<CheckTransportUndertakingData_Response " + NS + ">" + HEADER
                + "<Body businessCaseId=\"CTUD-EE-2026-00001\" originatingAuthority=\"EE-TRAM\" respondingAuthority=\"LV-CSDD\" statusCode=\"NotFound\">"
                + "<SearchedCompany requestAllVehicles=\"false\"><SearchByLicenceAndName transportUndertakingName=\"X\" communityLicenceNumber=\"EE-1234\"/></SearchedCompany></Body></CheckTransportUndertakingData_Response>";
        schemas.validate("CheckTransportUndertakingData_Response", notFound.getBytes(StandardCharsets.UTF_8));
        assert "".equals(ctudMapper.requestToJson(XmlUtil.parseHardened(notFound), java.time.Instant.now()).get("responseContent"));
    }

    static void assertInvalid(ThrowingRunnable action, String what) {
        try { action.run(); } catch (Exception expected) { return; }
        throw new AssertionError("Expected rejection: " + what);
    }
    interface ThrowingRunnable { void run() throws Exception; }

    static HttpResponse<String> call(HttpClient client, URI url, Map<String, Object> dto, String token) throws Exception {
        return client.send(HttpRequest.newBuilder(url).header("x-internal-service-token", token)
                .header("Content-Type", "application/json").timeout(Duration.ofSeconds(4))
                .POST(HttpRequest.BodyPublishers.ofString(MiniJson.write(dto))).build(), HttpResponse.BodyHandlers.ofString());
    }
}
