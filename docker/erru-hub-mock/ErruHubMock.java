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
        server.createContext("/rsi/http/request/BTSHTTPReceive.dll", ex -> receiveRsi(ex, schemas));
        server.createContext("/cgr/http/request/BTSHTTPReceive.dll", ex -> receiveRequest(ex, schemas, "CheckGoodRepute_Request"));
        server.createContext("/ctud/http/request/BTSHTTPReceive.dll", ex -> receiveRequest(ex, schemas, "CheckTransportUndertakingData_Request"));
        server.createContext("/nu/http/request/BTSHTTPReceive.dll", ex -> receiveRequest(ex, schemas, "NotifyUnfitness_Request"));
        server.createContext("/ncr/http/request/BTSHTTPReceive.dll", ex -> receiveRequest(ex, schemas, "NotifyCheckResult_Request"));
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

    private static void receiveRsi(HttpExchange ex, SchemaRegistry schemas) throws java.io.IOException {
        if (!"POST".equals(ex.getRequestMethod()) || !"/rsi/http/request/BTSHTTPReceive.dll".equals(ex.getRequestURI().getPath())) {
            write(ex, 404, "text/plain", "Unknown endpoint"); return;
        }
        byte[] bytes = ex.getRequestBody().readNBytes(MAX_BODY_BYTES + 1);
        if (bytes.length > MAX_BODY_BYTES) { write(ex, 413, "text/plain", "Body too large"); return; }
        try {
            schemas.validate("RoadSideInspection_Request", bytes);
            var doc = XmlUtil.parseHardened(bytes);
            String workflow = XmlUtil.attr(XmlUtil.firstChild(doc.getDocumentElement(), "Header"), "workflowId");
            String to = XmlUtil.attr(XmlUtil.firstChild(doc.getDocumentElement(), "Header"), "to");
            if ("FI".equals(to)) { write(ex, 400, "text/plain", "Synthetic rejection"); return; }
            synchronized (RECEIVED) {
                last = new String(bytes, StandardCharsets.UTF_8);
                RECEIVED.put(workflow, last);
                COUNT.incrementAndGet();
            }
            write(ex, 202, "text/plain", "");
        } catch (Exception e) { write(ex, 400, "text/plain", "Invalid RSI XML"); }
    }

    /**
     * Outgoing CGR/CTUD/NU/NCR: validate, retain, answer 202 and, when AUTO_REPLY_URL is set, deliver a
     * canned asynchronous Response or Acknowledgement to the adapter's ingress so the dev stack completes
     * end to end. NU: a ZZ broadcast is acknowledged by DE OK, SE Timeout and PL NotAvailable, LV Timeout,
     * PL NotAvailable, anything else OK. NCR: only the acknowledgement (NO Timeout, IS NotAvailable, else OK).
     * The substantive NCR response is not simulated. FI is rejected with HTTP 400 for every type.
     * Scenarios follow the Header/@to code: FI is rejected (HTTP 400). CTUD: LV NotFound, PL Timeout,
     * GR NotAvailable, anything else Found. CGR: FR and LV NotFound, SE Timeout, PL and GR NotAvailable,
     * anything else Found. A CGR broadcast (ZZ) is answered by DE, FR, SE and PL, one message each.
     */
    private static void receiveRequest(HttpExchange ex, SchemaRegistry schemas, String root) throws java.io.IOException {
        if (!"POST".equals(ex.getRequestMethod())) { write(ex, 404, "text/plain", "Unknown endpoint"); return; }
        byte[] bytes = ex.getRequestBody().readNBytes(MAX_BODY_BYTES + 1);
        if (bytes.length > MAX_BODY_BYTES) { write(ex, 413, "text/plain", "Body too large"); return; }
        org.w3c.dom.Document doc;
        try {
            schemas.validate(root, bytes);
            doc = XmlUtil.parseHardened(bytes);
        } catch (Exception e) { write(ex, 400, "text/plain", "Invalid " + root); return; }
        var header = XmlUtil.firstChild(doc.getDocumentElement(), "Header");
        String workflow = XmlUtil.attr(header, "workflowId");
        String to = XmlUtil.attr(header, "to");
        if ("FI".equals(to)) { write(ex, 400, "text/plain", "Synthetic rejection"); return; }
        // Retained for /_test/workflow only; /_test/count and /_test/last keep describing the adapter's answers.
        synchronized (RECEIVED) {
            RECEIVED.put(workflow, new String(bytes, StandardCharsets.UTF_8));
            if (RECEIVED.size() > 500) RECEIVED.remove(RECEIVED.keySet().iterator().next());
        }
        write(ex, 202, "text/plain", "");
        String replyUrl = System.getenv("AUTO_REPLY_URL");
        if (replyUrl == null || replyUrl.isBlank()) return;
        Thread.ofVirtual().start(() -> {
            try {
                Thread.sleep(300);
                // A CGR broadcast is answered by each member state in its own message.
                String[] answering = root.startsWith("CheckGood") && "ZZ".equals(to) ? new String[]{"DE", "FR", "SE", "PL"} : new String[]{to};
                for (String code : answering) {
                    String reply = switch (root) {
                        case "CheckGoodRepute_Request" -> cgrReply(doc, code);
                        case "NotifyUnfitness_Request" -> nuReply(doc, to);
                        case "NotifyCheckResult_Request" -> ncrReply(doc, to);
                        default -> ctudReply(doc, code);
                    };
                    var request = java.net.http.HttpRequest.newBuilder(java.net.URI.create(replyUrl))
                            .header("Content-Type", "application/xml; charset=utf-8")
                            .POST(java.net.http.HttpRequest.BodyPublishers.ofString(reply, StandardCharsets.UTF_8)).build();
                    var response = java.net.http.HttpClient.newHttpClient().send(request, java.net.http.HttpResponse.BodyHandlers.discarding());
                    System.out.println("ERRU mock auto reply " + root + " workflow=" + workflow + " from=" + code + " -> HTTP " + response.statusCode());
                }
            } catch (Exception e) { System.out.println("ERRU mock auto reply failed: " + e); }
        });
    }

    private static String replyHeader(org.w3c.dom.Element requestHeader, String from) {
        return "<Header version=\"3.5\" technicalId=\"" + java.util.UUID.randomUUID() + "\" workflowId=\""
                + XmlUtil.attr(requestHeader, "workflowId") + "\" sentAt=\""
                + java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'").withZone(java.time.ZoneOffset.UTC).format(java.time.Instant.now())
                + "\" from=\"" + from + "\" to=\"" + XmlUtil.attr(requestHeader, "from") + "\"/>";
    }

    private static String nuMember(String code, String status, String message) {
        return "<MemberState memberStateCode=\"" + code + "\" respondingAuthority=\"" + code + "-CA\" statusCode=\"" + status + "\""
                + (message.isEmpty() ? "" : " statusMessage=\"" + message + "\"") + "/>";
    }

    private static String nuReply(org.w3c.dom.Document request, String to) {
        var body = XmlUtil.firstChild(request.getDocumentElement(), "Body");
        var header = XmlUtil.firstChild(request.getDocumentElement(), "Header");
        var out = new StringBuilder("<NotifyUnfitness_Acknowledgement xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\">");
        out.append(replyHeader(header, "ZZ".equals(to) ? "EU" : to));
        out.append("<Body businessCaseId=\"").append(XmlUtil.escAttr(XmlUtil.attr(body, "businessCaseId")))
                .append("\" originatingAuthority=\"").append(XmlUtil.escAttr(XmlUtil.attr(body, "originatingAuthority"))).append("\">");
        switch (to) {
            case "ZZ" -> out.append(nuMember("DE", "OK", "")).append(nuMember("SE", "Timeout", "Member state did not respond within the allowed time"))
                    .append(nuMember("PL", "NotAvailable", "Member state is not yet available on ERRU 3.5"));
            case "LV" -> out.append(nuMember("LV", "Timeout", "Member state did not respond within the allowed time"));
            case "PL" -> out.append(nuMember("PL", "NotAvailable", "Member state is not yet available on ERRU 3.5"));
            default -> out.append(nuMember(to, "OK", ""));
        }
        return out.append("</Body></NotifyUnfitness_Acknowledgement>").toString();
    }

    private static String ncrReply(org.w3c.dom.Document request, String to) {
        var body = XmlUtil.firstChild(request.getDocumentElement(), "Body");
        var header = XmlUtil.firstChild(request.getDocumentElement(), "Header");
        String status = switch (to) { case "NO" -> "Timeout"; case "IS" -> "NotAvailable"; default -> "OK"; };
        return "<NotifyCheckResult_Acknowledgement xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\">" + replyHeader(header, to)
                + "<Body businessCaseId=\"" + XmlUtil.escAttr(XmlUtil.attr(body, "businessCaseId"))
                + "\" originatingAuthority=\"" + XmlUtil.escAttr(XmlUtil.attr(body, "originatingAuthority"))
                + "\" respondingAuthority=\"" + to + "-CA\" acknowledgementType=\"NCRN_Ack\" statusCode=\"" + status + "\"/>"
                + "</NotifyCheckResult_Acknowledgement>";
    }

    private static String cgrStatus(String code) {
        return switch (code) { case "FR", "LV" -> "NotFound"; case "SE" -> "Timeout"; case "PL", "GR" -> "NotAvailable"; default -> "Found"; };
    }

    private static String ctudStatus(String code) {
        return switch (code) { case "LV" -> "NotFound"; case "PL" -> "Timeout"; case "GR" -> "NotAvailable"; default -> "Found"; };
    }

    private static String cgrReply(org.w3c.dom.Document request, String code) {
        var body = XmlUtil.firstChild(request.getDocumentElement(), "Body");
        var header = XmlUtil.firstChild(request.getDocumentElement(), "Header");
        var out = new StringBuilder("<CheckGoodRepute_Response xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\">");
        out.append(replyHeader(header, code));
        out.append("<Body businessCaseId=\"").append(XmlUtil.escAttr(XmlUtil.attr(body, "businessCaseId")))
                .append("\" originatingAuthority=\"").append(XmlUtil.escAttr(XmlUtil.attr(body, "originatingAuthority"))).append("\">");
        out.append(XmlUtil.serializeElement(XmlUtil.firstChild(body, "SearchedTransportManager")));
        {
            String status = cgrStatus(code);
            out.append("<MemberState memberStateCode=\"").append(code).append("\" statusCode=\"").append(status).append("\"");
            if (!"Found".equals(status)) out.append("/>");
            else out.append("><TransportManagerDetails respondingAuthority=\"").append(code).append("-BAG\" searchMethod=\"NYSIIS\">")
                    .append("<TransportManagerNameDetails firstName=\"Hans\" familyName=\"Mueller\" dateOfBirth=\"1975-03-12\" placeOfBirth=\"Berlin\"/>")
                    .append("<TransportManagerAddressDetails address=\"Hauptstrasse 12\" postCode=\"50667\" city=\"Koeln\" country=\"").append(code).append("\"/>")
                    .append("<TransportManagerCertificateDetails certificateNumber=\"").append(code).append("-CPC-2018-44512\" certificateIssueDate=\"2018-06-01\" certificateIssueCountry=\"")
                    .append(code).append("\" certificateValidity=\"Valid\"><Fitness fitnessStatus=\"Fit\"/></TransportManagerCertificateDetails>")
                    .append("<TransportUndertakings totalManagedUndertakings=\"1\" totalManagedVehicles=\"18\">")
                    .append("<TransportUndertaking transportUndertakingName=\"Rhein Spedition GmbH\" numberOfVehicles=\"18\" communityLicenceNumber=\"")
                    .append(code).append("-CL-2019-55821\" communityLicenceStatus=\"Active\"><TransportUndertakingAddress address=\"Hauptstrasse 12\" postCode=\"50667\" city=\"Koeln\" country=\"")
                    .append(code).append("\"/></TransportUndertaking></TransportUndertakings></TransportManagerDetails></MemberState>");
        }
        return out.append("</Body></CheckGoodRepute_Response>").toString();
    }

    private static String ctudReply(org.w3c.dom.Document request, String to) {
        var body = XmlUtil.firstChild(request.getDocumentElement(), "Body");
        var header = XmlUtil.firstChild(request.getDocumentElement(), "Header");
        String status = ctudStatus(to);
        var out = new StringBuilder("<CheckTransportUndertakingData_Response xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\">");
        out.append(replyHeader(header, to));
        out.append("<Body businessCaseId=\"").append(XmlUtil.escAttr(XmlUtil.attr(body, "businessCaseId")))
                .append("\" originatingAuthority=\"").append(XmlUtil.escAttr(XmlUtil.attr(body, "originatingAuthority")))
                .append("\" respondingAuthority=\"").append(to).append("-BAG\" statusCode=\"").append(status).append("\">");
        out.append(XmlUtil.serializeElement(XmlUtil.firstChild(body, "SearchedCompany")));
        if ("Found".equals(status)) {
            out.append("<TransportUndertaking transportUndertakingName=\"Rhein Spedition GmbH\" legalForm=\"GmbH\" numberOfVehicles=\"18\" numberOfEmployees=\"42\" riskRating=\"74\" riskBand=\"Green\" searchMethod=\"CommunityLicence\">")
                    .append("<VehicleRegistrations><Vehicle vehicleRegistrationNumber=\"K-RS-4412\" vehicleRegistrationCountry=\"").append(to)
                    .append("\"/><Vehicle vehicleRegistrationNumber=\"K-RS-4413\" vehicleRegistrationCountry=\"").append(to).append("\"/></VehicleRegistrations>")
                    .append("<TransportUndertakingAddress address=\"Hauptstrasse 12\" postCode=\"50667\" city=\"Koeln\" country=\"").append(to).append("\"/>")
                    .append("<CommunityLicenceDetails communityLicenceNumber=\"").append(to).append("-CL-2019-55821\" communityLicenceStatus=\"Active\" communityLicenceType=\"Community licence for goods transport\" startDate=\"2019-04-01\" expiryDate=\"2029-03-31\" licencingAuthority=\"").append(to).append("-BAG\"/>")
                    .append("<CommunityLicenceDetails communityLicenceNumber=\"").append(to).append("-CL-2015-11002\" communityLicenceStatus=\"Expired\" communityLicenceType=\"Community licence for passenger transport\" startDate=\"2015-01-01\" expiryDate=\"2025-01-01\" licencingAuthority=\"").append(to).append("-BAG\"/>")
                    .append("<CertifiedTrueCopyDetails><CertifiedTrueCopy trueCopyNumber=\"").append(to).append("-CL-2019-55821-004\" trueCopyIssueDate=\"2019-04-01\" trueCopyExpiryDate=\"2029-03-31\"/></CertifiedTrueCopyDetails>")
                    .append("</TransportUndertaking>");
        }
        return out.append("</Body></CheckTransportUndertakingData_Response>").toString();
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
