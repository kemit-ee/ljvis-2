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
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/** Outgoing NU and NCR (request and response): XML/XSD, real local HTTP dispatch, inbound acknowledgement and response mapping. */
public class NcrNuSendTest {
    static Map<String, Object> envelope(String businessCaseId) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("technicalId", UUID.randomUUID().toString());
        dto.put("workflowId", UUID.randomUUID().toString());
        dto.put("sentAt", "2026-12-23T10:00:00Z");
        dto.put("businessCaseId", businessCaseId);
        dto.put("originatingAuthority", "EE-TRAM");
        dto.put("requestSource", "CA");
        dto.put("requestPurpose", "Control");
        return dto;
    }
    static Map<String, Object> nu() {
        Map<String, Object> dto = envelope("NU-EE-2026-00001");
        dto.put("nuTo", "ZZ");
        dto.put("unfitStartDate", "2026-12-01");
        dto.put("tmFirstName", "Mari"); dto.put("tmFamilyName", "Maasikas");
        dto.put("tmDateOfBirth", "1980-05-01"); dto.put("tmPlaceOfBirth", "Tallinn");
        dto.put("tmFirstNameSearchKey", "MAR"); dto.put("tmFamilyNameSearchKey", "MASACAS");
        return dto;
    }
    static Map<String, Object> ncr() {
        Map<String, Object> dto = envelope("NCR-EE-2026-00001");
        dto.put("ncrTo", "LV");
        dto.put("transportUndertakingName", "Test & <Transport> OU");
        dto.put("communityLicenceNumber", "LV-1234");
        dto.put("vehicleRegistrationNumber", "123ABC"); dto.put("vehicleRegistrationCountry", "LV");
        dto.put("checkResult", "Fail"); dto.put("checkDate", "2026-10-01T00:00:00Z");
        dto.put("minorInfringement", "{\"dateOfInfringement\":\"2026-10-01\",\"numberOfInfringements\":2}");
        dto.put("seriousInfringements", "[{\"dateOfInfringement\":\"2026-10-01\",\"category\":\"SI\",\"infringementType\":\"101\",\"appealPossible\":true,"
                + "\"penaltiesImposed\":[{\"penaltyImposedIdentifier\":1,\"finalDecisionDate\":\"2026-10-02\",\"penaltyTypeImposed\":\"101\",\"startDate\":\"2026-10-03\",\"isExecuted\":\"No\",\"notExecutedReason\":\"Appeal\"}],"
                + "\"penaltiesRequested\":[{\"penaltyRequestedIdentifier\":1,\"penaltyTypeRequested\":\"101\",\"duration\":3}]}]");
        return dto;
    }
    static Map<String, Object> ncrResponse() {
        Map<String, Object> dto = envelope("NCR-LV-2026-00007");
        dto.put("ncrTo", "LV");
        dto.put("respondingAuthority", "EE-TRAM"); dto.put("statusCode", "OK");
        dto.put("transportUndertakingName", "Test OU"); dto.put("communityLicenceNumber", "EE-1");
        dto.put("numberOfVehicles", 4); dto.put("communityLicenceStatus", "Active");
        dto.put("address", "{\"address\":\"Tee 1\",\"postCode\":\"10111\",\"city\":\"Tallinn\",\"country\":\"EE\"}");
        dto.put("penaltiesImposed", "[{\"penaltyRequestedIdentifier\":1,\"authorityImposingPenalty\":\"EE-TRAM\",\"isImposed\":true,\"penaltyTypeImposed\":\"101\",\"startDate\":\"2026-11-01\",\"endDate\":\"2026-12-01\"}]");
        return dto;
    }

    static final String NS = "xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\"";
    static final String HEADER = "<Header version=\"3.5\" technicalId=\"00000000-0000-4000-8000-000000000001\" workflowId=\"00000000-0000-4000-8000-000000000002\" sentAt=\"2026-12-23T10:05:00Z\" from=\"DE\" to=\"EE\"/>";

    public static void main(String[] args) throws Exception {
        SchemaRegistry schemas = new SchemaRegistry(java.nio.file.Path.of("contracts/erru/3.5"));
        builders(schemas);
        dispatch(schemas);
        inbound(schemas);
        System.out.println("PASS NU/NCR XML/XSD, search variants, penalties, escaping, auth, HTTP 202/2xx/400/200, replay, response mapping");
    }

    static void validate(SchemaRegistry schemas, String root, String xml) throws Exception {
        schemas.validate(root, xml.getBytes(StandardCharsets.UTF_8));
    }

    static void builders(SchemaRegistry schemas) throws Exception {
        String xml = NuRequestXml.build(nu(), "EE");
        validate(schemas, "NotifyUnfitness_Request", xml);
        assert xml.contains("to=\"ZZ\"") && xml.contains("unfitStartDate=\"2026-12-01\"") && xml.contains("firstNameSearchKey=\"MAR\"") : xml;
        Map<String, Object> both = nu();
        both.put("certificateNumber", "CPC-1"); both.put("certificateIssueDate", "2020-01-01"); both.put("certificateIssueCountry", "EE");
        String withCertificate = NuRequestXml.build(both, "EE");
        validate(schemas, "NotifyUnfitness_Request", withCertificate);
        assert withCertificate.contains("CertificateOfProfessionalCompetence") && withCertificate.contains("TransportManagerNameDetails");
        Map<String, Object> certificateOnly = envelope("NU-EE-2026-00002");
        certificateOnly.put("nuTo", "LV");
        certificateOnly.put("certificateNumber", "CPC-1"); certificateOnly.put("certificateIssueDate", "2020-01-01"); certificateOnly.put("certificateIssueCountry", "EE");
        String single = NuRequestXml.build(certificateOnly, "EE");
        validate(schemas, "NotifyUnfitness_Request", single);
        assert single.contains("TransportManagerCertificateDetails") && !single.contains("TransportManagerNameDetails");
        for (String missing : List.of("tmFirstName", "tmFamilyName", "tmDateOfBirth", "nuTo", "requestPurpose")) {
            Map<String, Object> bad = nu(); bad.remove(missing);
            assertInvalid(() -> validate(schemas, "NotifyUnfitness_Request", NuRequestXml.build(bad, "EE")), "NU without " + missing);
        }

        String ncrXml = NcrRequestXml.build(ncr(), "EE");
        validate(schemas, "NotifyCheckResult_Request", ncrXml);
        assert ncrXml.contains("dateOfCheck=\"2026-10-01\"") && ncrXml.contains("Test &amp; &lt;Transport&gt; OU")
                && ncrXml.contains("MinorInfringement") && ncrXml.contains("PenaltyRequested") && ncrXml.contains("appealPossible=\"true\"") : ncrXml;
        Map<String, Object> clean = ncr(); clean.put("checkResult", "CleanCheck"); clean.remove("minorInfringement"); clean.remove("seriousInfringements");
        validate(schemas, "NotifyCheckResult_Request", NcrRequestXml.build(clean, "EE"));
        for (String missing : List.of("transportUndertakingName", "communityLicenceNumber", "vehicleRegistrationNumber", "vehicleRegistrationCountry", "checkResult", "checkDate", "ncrTo")) {
            Map<String, Object> bad = ncr(); bad.remove(missing);
            assertInvalid(() -> validate(schemas, "NotifyCheckResult_Request", NcrRequestXml.build(bad, "EE")), "NCR without " + missing);
        }
        Map<String, Object> noPenalty = ncr();
        noPenalty.put("seriousInfringements", "[{\"dateOfInfringement\":\"2026-10-01\",\"category\":\"SI\",\"infringementType\":\"101\",\"appealPossible\":true,\"penaltiesImposed\":[]}]");
        assertInvalid(() -> NcrRequestXml.build(noPenalty, "EE"), "serious infringement without imposed penalty");
        Map<String, Object> badBool = ncr();
        badBool.put("seriousInfringements", ((String) badBool.get("seriousInfringements")).replace("\"appealPossible\":true", "\"appealPossible\":\"maybe\""));
        assertInvalid(() -> NcrRequestXml.build(badBool, "EE"), "non boolean appealPossible");

        String response = NcrResponseXml.build(ncrResponse(), "EE");
        validate(schemas, "NotifyCheckResult_Response", response);
        assert response.contains("numberOfVehicles=\"4\"") && response.contains("isImposed=\"true\"") && response.contains("to=\"LV\"") : response;
        Map<String, Object> notFound = envelope("NCR-LV-2026-00008");
        notFound.put("ncrTo", "LV"); notFound.put("respondingAuthority", "EE-TRAM"); notFound.put("statusCode", "NotFound"); notFound.put("statusMessage", "none");
        String nf = NcrResponseXml.build(notFound, "EE");
        validate(schemas, "NotifyCheckResult_Response", nf);
        assert !nf.contains("TransportUndertaking") && !nf.contains("PenaltiesImposed");
        Map<String, Object> partial = ncrResponse(); partial.remove("communityLicenceStatus");
        assertInvalid(() -> NcrResponseXml.build(partial, "EE"), "partial transport undertaking");
        Map<String, Object> badAddress = ncrResponse(); badAddress.put("address", "{\"address\":\"Tee 1\"}");
        assertInvalid(() -> NcrResponseXml.build(badAddress, "EE"), "incomplete address");
    }

    static void dispatch(SchemaRegistry schemas) throws Exception {
        AtomicInteger received = new AtomicInteger();
        AtomicInteger mode = new AtomicInteger(202);
        var pool = Executors.newFixedThreadPool(8);
        HttpServer hub = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        hub.setExecutor(pool);
        for (String[] route : new String[][]{{"/nu", "NotifyUnfitness_Request"}, {"/ncr", "NotifyCheckResult_Request"}, {"/answer", "NotifyCheckResult_Response"}}) {
            hub.createContext(route[0], ex -> {
                try {
                    assert ex.getRequestHeaders().getFirst("Content-Type").startsWith("application/xml");
                    byte[] xml = ex.getRequestBody().readAllBytes();
                    schemas.validate(route[1], xml);
                    received.incrementAndGet();
                    ex.sendResponseHeaders(mode.get(), -1); ex.close();
                } catch (Exception e) { throw new RuntimeException(e); }
            });
        }
        hub.start();
        HttpServer adapter = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        adapter.setExecutor(pool);
        String hubBase = "http://127.0.0.1:" + hub.getAddress().getPort();
        adapter.createContext("/internal/nu", new OutboundXmlHandler(ErruXmlAdapter.NU_KIND, schemas, "test-token", "EE", URI.create(hubBase + "/nu"), Duration.ofMillis(600), new CgrCtudSendTest.MemoryStore()));
        adapter.createContext("/internal/ncr", new OutboundXmlHandler(ErruXmlAdapter.NCR_KIND, schemas, "test-token", "EE", URI.create(hubBase + "/ncr"), Duration.ofMillis(600), new CgrCtudSendTest.MemoryStore()));
        adapter.createContext("/internal/ncr-response", new OutboundXmlHandler(ErruXmlAdapter.NCR_RESPONSE_KIND, schemas, "test-token", "EE", URI.create(hubBase + "/answer"), Duration.ofMillis(600), new CgrCtudSendTest.MemoryStore()));
        adapter.start();
        String base = "http://127.0.0.1:" + adapter.getAddress().getPort();
        HttpClient client = HttpClient.newHttpClient();
        try {
            Map<String, Object> dto = nu();
            assert CgrCtudSendTest.call(client, URI.create(base + "/internal/nu/send"), dto, "wrong").statusCode() == 403;
            assert received.get() == 0;
            assert "accepted".equals(status(client, base + "/internal/nu/send", dto));
            assert received.get() == 1;
            status(client, base + "/internal/nu/send", dto);
            assert received.get() == 1 : "Replay resent XML";
            assert "valid".equals(status(client, base + "/internal/nu/validate", nu()));
            Map<String, Object> invalid = nu(); invalid.remove("tmDateOfBirth");
            var rejected = CgrCtudSendTest.call(client, URI.create(base + "/internal/nu/validate"), invalid, "test-token");
            assert rejected.statusCode() == 422 && rejected.body().contains("invalid_nu_xml") : rejected.body();
            assert "accepted".equals(status(client, base + "/internal/ncr/send", ncr()));
            assert received.get() == 2;
            // The answer to an incoming NCR is posted to the response URL, which acknowledges with any 2xx.
            mode.set(200);
            var answered = CgrCtudSendTest.call(client, URI.create(base + "/internal/ncr-response/send"), ncrResponse(), "test-token");
            assert "accepted".equals(MiniJson.parseObject(answered.body()).get("status")) : answered.body();
            assert received.get() == 3;
            // ... but a request needs HTTP 202 exactly.
            assert "unknown".equals(status(client, base + "/internal/ncr/send", ncr()));
            mode.set(400);
            assert "rejected".equals(status(client, base + "/internal/nu/send", nu()));
            assert "rejected".equals(status(client, base + "/internal/ncr-response/send", ncrResponse()));
            mode.set(202);
        } finally { adapter.stop(0); hub.stop(0); pool.shutdownNow(); }
    }

    static String status(HttpClient client, String url, Map<String, Object> dto) throws Exception {
        return String.valueOf(MiniJson.parseObject(CgrCtudSendTest.call(client, URI.create(url), dto, "test-token").body()).get("status"));
    }

    static void inbound(SchemaRegistry schemas) throws Exception {
        String nuAck = "<NotifyUnfitness_Acknowledgement " + NS + ">" + HEADER
                + "<Body businessCaseId=\"NU-EE-2026-00001\" originatingAuthority=\"EE-TRAM\">"
                + "<MemberState memberStateCode=\"DE\" respondingAuthority=\"DE-BAG\" statusCode=\"OK\"/>"
                + "<MemberState memberStateCode=\"PL\" respondingAuthority=\"PL-GITD\" statusCode=\"Timeout\" statusMessage=\"slow\"/>"
                + "</Body></NotifyUnfitness_Acknowledgement>";
        validate(schemas, "NotifyUnfitness_Acknowledgement", nuAck);
        var nuMapper = new NuAckMapper();
        Map<String, Object> json = nuMapper.requestToJson(XmlUtil.parseHardened(nuAck), java.time.Instant.now());
        assert "00000000-0000-4000-8000-000000000002".equals(json.get("workflowId")) && "DE".equals(json.get("from"));
        String members = (String) json.get("memberStates");
        assert members.contains("\"respondingAuthority\":\"PL-GITD\"") && members.contains("\"statusMessage\":\"slow\"") : members;
        assert nuMapper.oneWay() && nuMapper.isAnswer(Map.of("status", "acknowledged")) && nuMapper.isAnswer(Map.of("status", "already_acknowledged")) && !nuMapper.isAnswer(Map.of("status", "x"));

        String ncrAck = "<NotifyCheckResult_Acknowledgement " + NS + ">" + HEADER
                + "<Body businessCaseId=\"NCR-EE-2026-00001\" originatingAuthority=\"EE-TRAM\" respondingAuthority=\"LV-CSDD\" acknowledgementType=\"NCRN_Ack\" statusCode=\"Timeout\" statusMessage=\"slow\"/>"
                + "</NotifyCheckResult_Acknowledgement>";
        validate(schemas, "NotifyCheckResult_Acknowledgement", ncrAck);
        Map<String, Object> ack = new NcrAckMapper().requestToJson(XmlUtil.parseHardened(ncrAck), java.time.Instant.now());
        assert "NCRN_Ack".equals(ack.get("acknowledgementType")) && "Timeout".equals(ack.get("statusCode")) && "slow".equals(ack.get("statusMessage"));

        String ncrResponse = "<NotifyCheckResult_Response " + NS + ">" + HEADER
                + "<Body businessCaseId=\"NCR-EE-2026-00001\" originatingAuthority=\"EE-TRAM\" respondingAuthority=\"LV-CSDD\" statusCode=\"OK\">"
                + "<TransportUndertaking transportUndertakingName=\"Rhein &amp; Co\" numberOfVehicles=\"4\" communityLicenceNumber=\"LV-1\" communityLicenceStatus=\"Active\">"
                + "<TransportUndertakingAddress address=\"Tee 1\" postCode=\"LV-1010\" city=\"Riga\" country=\"LV\"/></TransportUndertaking>"
                + "<PenaltiesImposed><PenaltyImposed penaltyRequestedIdentifier=\"1\" authorityImposingPenalty=\"LV-CSDD\" isImposed=\"true\" penaltyTypeImposed=\"101\" startDate=\"2026-11-01\" reason=\"r\"/></PenaltiesImposed>"
                + "</Body></NotifyCheckResult_Response>";
        validate(schemas, "NotifyCheckResult_Response", ncrResponse);
        Map<String, Object> resp = new NcrResponseInMapper().requestToJson(XmlUtil.parseHardened(ncrResponse), java.time.Instant.now());
        assert "OK".equals(resp.get("statusCode")) && "LV-CSDD".equals(resp.get("respondingAuthority")) && "4".equals(resp.get("numberOfVehicles"));
        assert ((String) resp.get("address")).contains("\"city\":\"Riga\"") : resp.get("address");
        String penalties = (String) resp.get("penaltiesImposed");
        assert penalties.contains("\"penaltyRequestedIdentifier\":1") && penalties.contains("\"isImposed\":true") && penalties.contains("\"reason\":\"r\"") : penalties;
        String notFound = "<NotifyCheckResult_Response " + NS + ">" + HEADER
                + "<Body businessCaseId=\"NCR-EE-2026-00001\" originatingAuthority=\"EE-TRAM\" respondingAuthority=\"LV-CSDD\" statusCode=\"NotFound\"/></NotifyCheckResult_Response>";
        validate(schemas, "NotifyCheckResult_Response", notFound);
        Map<String, Object> nf = new NcrResponseInMapper().requestToJson(XmlUtil.parseHardened(notFound), java.time.Instant.now());
        assert "NotFound".equals(nf.get("statusCode")) && !nf.containsKey("transportUndertakingName") && "[]".equals(nf.get("penaltiesImposed"));
    }

    static void assertInvalid(CgrCtudSendTest.ThrowingRunnable action, String what) {
        try { action.run(); } catch (Exception expected) { return; }
        throw new AssertionError("Expected rejection: " + what);
    }
}
