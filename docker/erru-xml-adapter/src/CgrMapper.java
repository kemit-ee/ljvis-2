import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * XML <-> JSON mapping for CheckGoodRepute.
 *
 * Inbound direction: SearchedTransportManager is an xs:choice of 7A (TransportManagerNameDetails,
 * optionally with TransportManagerCertificateDetails too) and 7B (TransportManagerCertificateDetails
 * alone) — the same "one branch present, the other absent" shape NU's own
 * TransportManagerNameDetails/TransportManagerCertificateDetails choice already uses, mapped onto
 * DSL/Ruuter.internal/ljvis/POST/erru/cgr/inbound-request.yml's existing flat allowlist.
 *
 * Outbound direction: CheckGoodRepute_Response is a broadcast-response shape (globalBodyBroadcastResponseType
 * — no single respondingAuthority on Body itself) with one MemberState per responding country; this
 * adapter only ever answers for its own member state, so exactly one MemberState is built, mirroring
 * cgr/inbound-request.yml's buildFullResponse (`member_states_json`, always a 1-element array).
 * SearchedTransportManager must be echoed back verbatim, like CTUD's SearchedCompany.
 */
final class CgrMapper implements MessageMapper {
    private static final DateTimeFormatter SENT_AT_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'").withZone(java.time.ZoneOffset.UTC);

    private final String memberStateCode;

    CgrMapper(String memberStateCode) {
        this.memberStateCode = memberStateCode;
    }

    @Override public String requestRoot() { return "CheckGoodRepute_Request"; }
    @Override public String responseRoot() { return "CheckGoodRepute_Response"; }
    @Override public String ruuterPath() { return "/ljvis/erru/cgr/inbound-request"; }
    @Override public Duration ruuterTimeout() { return Duration.ofSeconds(45); }


    private static final java.util.Set<String> KNOWN_STATUS_CODES =
            java.util.Set.of("Found", "NotFound", "InvalidData", "Error", "ServerError", "NotAvailable");

    @Override public boolean isAnswer(Map<String, Object> json) {
        return KNOWN_STATUS_CODES.contains(json.get("statusCode"));
    }

    @Override public Map<String, Object> requestToJson(Document doc, Instant receivedAt) {
        Element root = doc.getDocumentElement();
        Element header = XmlUtil.firstChild(root, "Header");
        Element body = XmlUtil.firstChild(root, "Body");
        Element searchedTm = XmlUtil.firstChild(body, "SearchedTransportManager");
        Element nameDetails = XmlUtil.firstChild(searchedTm, "TransportManagerNameDetails");
        Element certDetails = XmlUtil.firstChild(searchedTm, "TransportManagerCertificateDetails");

        Map<String, Object> json = new LinkedHashMap<>();
        json.put("technicalId", XmlUtil.attr(header, "technicalId"));
        json.put("workflowId", XmlUtil.attr(header, "workflowId"));
        json.put("sentAt", XmlUtil.attr(header, "sentAt"));
        json.put("from", XmlUtil.attr(header, "from"));
        json.put("businessCaseId", XmlUtil.attr(body, "businessCaseId"));
        json.put("originatingAuthority", XmlUtil.attr(body, "originatingAuthority"));
        json.put("requestSource", XmlUtil.attr(body, "requestSource"));
        json.put("requestPurpose", XmlUtil.attr(body, "requestPurpose"));
        json.put("tmFirstName", XmlUtil.attr(nameDetails, "firstName"));
        json.put("tmFamilyName", XmlUtil.attr(nameDetails, "familyName"));
        json.put("tmDateOfBirth", XmlUtil.attr(nameDetails, "dateOfBirth"));
        json.put("tmPlaceOfBirth", XmlUtil.attr(nameDetails, "placeOfBirth"));
        json.put("certificateNumber", XmlUtil.attr(certDetails, "certificateNumber"));
        json.put("certificateIssueDate", XmlUtil.attr(certDetails, "certificateIssueDate"));
        json.put("certificateIssueCountry", XmlUtil.attr(certDetails, "certificateIssueCountry"));
        return json;
    }

    @Override
    @SuppressWarnings("unchecked")
    public String buildResponseXml(Map<String, Object> json, Document requestDoc, String freshTechnicalId) {
        Element reqRoot = requestDoc.getDocumentElement();
        Element reqHeader = XmlUtil.firstChild(reqRoot, "Header");
        Element reqBody = XmlUtil.firstChild(reqRoot, "Body");
        Element reqSearchedTm = XmlUtil.firstChild(reqBody, "SearchedTransportManager");

        String workflowId = XmlUtil.attr(reqHeader, "workflowId");
        String businessCaseId = XmlUtil.attr(reqBody, "businessCaseId");
        String originatingAuthority = XmlUtil.attr(reqBody, "originatingAuthority");
        String to = XmlUtil.attr(reqHeader, "from");
        String sentAt = SENT_AT_FORMAT.format(Instant.now());

        String rawStatus = MiniJson.asString(json.get("statusCode"));
        String rawMessage = MiniJson.asString(json.get("statusMessage"));
        StatusMapper.Mapped mapped = StatusMapper.map(StatusMapper.Kind.SEARCH, rawStatus, rawMessage);
        Map<String, Object> tmDetails = (Map<String, Object>) json.get("transportManagerDetails");

        // Never emit a "Found" MemberState built from data that could not be fully and truthfully
        // translated (missing/invalid licence status or number, missing address) — this is our
        // own translation failure, not a legitimate business status, so it must become an
        // ErrorNotification (ServerError), never a guessed "Active"/"unknown" or a synthetic
        // NotAvailable (forbidden — see StatusMapper).
        String tmDetailsXml = "";
        if ("Found".equals(mapped.statusCode()) && tmDetails != null) {
            tmDetailsXml = transportManagerDetailsElement(tmDetails);
            if (tmDetailsXml == null) {
                throw new IllegalStateException("Found record could not be fully and accurately translated to the ERRU 3.5 format");
            }
        }

        StringBuilder xml = new StringBuilder();
        xml.append("<CheckGoodRepute_Response xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\">\n");
        xml.append("  <Header version=\"3.5\" technicalId=\"").append(XmlUtil.escAttr(freshTechnicalId))
                .append("\" workflowId=\"").append(XmlUtil.escAttr(workflowId))
                .append("\" sentAt=\"").append(XmlUtil.escAttr(sentAt))
                .append("\" from=\"").append(XmlUtil.escAttr(memberStateCode))
                .append("\" to=\"").append(XmlUtil.escAttr(to)).append("\"/>\n");
        xml.append("  <Body businessCaseId=\"").append(XmlUtil.escAttr(businessCaseId))
                .append("\" originatingAuthority=\"").append(XmlUtil.escAttr(originatingAuthority)).append("\">\n");
        xml.append(echoSearchedTransportManager(reqSearchedTm));
        xml.append("    <MemberState memberStateCode=\"").append(XmlUtil.escAttr(memberStateCode))
                .append("\" statusCode=\"").append(XmlUtil.escAttr(mapped.statusCode())).append("\"");
        if (mapped.statusMessage() != null && !mapped.statusMessage().isBlank()) {
            xml.append(" statusMessage=\"").append(XmlUtil.escAttr(mapped.statusMessage())).append("\"");
        }
        if (!tmDetailsXml.isEmpty()) {
            xml.append(">\n").append(tmDetailsXml).append("    </MemberState>\n");
        } else {
            xml.append("/>\n");
        }
        xml.append("  </Body>\n");
        xml.append("</CheckGoodRepute_Response>");
        return xml.toString();
    }

    /**
     * Echoes SearchedTransportManager exactly as sent, via {@link XmlUtil#serializeElement} — a
     * full DOM re-serialization, not a manual field-by-field rebuild. The manual version silently
     * dropped `TransportManagerAddressDetails` (a valid child of
     * `TransportManagerNameDetails` per `cgrTransportManagerSearchType`) whenever a request
     * actually included one — confirmed live, an address round-tripped in but never came back out.
     */
    private static String echoSearchedTransportManager(Element reqSearchedTm) {
        return "    " + XmlUtil.serializeElement(reqSearchedTm) + "\n";
    }

    /**
     * Returns {@code null} (not a best-effort partial element) if any XSD-required field in a
     * listed TransportUndertaking is missing or not a real globalCommunityLicenceStatusType
     * value — the caller downgrades the whole answer to NotAvailable rather than send a "Found"
     * record with a fabricated "Active"/"unknown".
     * respondingAuthority/searchMethod/certificateValidity are NOT gated this way: the flow
     * itself always supplies real values for those today (never absent in practice), so a
     * fallback there is genuinely just a fallback, not a mask for missing data.
     */
    @SuppressWarnings("unchecked")
    private static String transportManagerDetailsElement(Map<String, Object> d) {
        String respondingAuthority = orDefault(MiniJson.asString(d.get("respondingAuthority")), "EE-TRAM");
        String searchMethod = orDefault(MiniJson.asString(d.get("searchMethod")), "NYSIIS");
        Map<String, Object> nameDetails = (Map<String, Object>) d.get("nameDetails");
        Map<String, Object> addressDetails = (Map<String, Object>) d.get("addressDetails");
        Map<String, Object> certificateDetails = (Map<String, Object>) d.get("certificateDetails");
        Map<String, Object> transportUndertakings = (Map<String, Object>) d.get("transportUndertakings");

        StringBuilder sb = new StringBuilder();
        sb.append("      <TransportManagerDetails respondingAuthority=\"").append(XmlUtil.escAttr(respondingAuthority))
                .append("\" searchMethod=\"").append(XmlUtil.escAttr(searchMethod)).append("\">\n");
        if (nameDetails != null) {
            sb.append("        <TransportManagerNameDetails firstName=\"").append(XmlUtil.escAttr(MiniJson.asString(nameDetails.get("firstName"))))
                    .append("\" familyName=\"").append(XmlUtil.escAttr(MiniJson.asString(nameDetails.get("familyName"))))
                    .append("\" dateOfBirth=\"").append(XmlUtil.escAttr(MiniJson.asString(nameDetails.get("dateOfBirth")))).append("\"");
            String placeOfBirth = MiniJson.asString(nameDetails.get("placeOfBirth"));
            if (placeOfBirth != null && !placeOfBirth.isBlank()) {
                sb.append(" placeOfBirth=\"").append(XmlUtil.escAttr(placeOfBirth)).append("\"");
            }
            sb.append("/>\n");
        }
        if (addressDetails != null) {
            String addressXml = addressAttrs(addressDetails);
            if (addressXml == null) return null;
            sb.append("        <TransportManagerAddressDetails").append(addressXml).append("/>\n");
        }
        if (certificateDetails != null) {
            Map<String, Object> fitness = (Map<String, Object>) certificateDetails.get("fitness");
            sb.append("        <TransportManagerCertificateDetails certificateNumber=\"").append(XmlUtil.escAttr(MiniJson.asString(certificateDetails.get("certificateNumber"))))
                    .append("\" certificateIssueDate=\"").append(XmlUtil.escAttr(MiniJson.asString(certificateDetails.get("certificateIssueDate"))))
                    .append("\" certificateIssueCountry=\"").append(XmlUtil.escAttr(MiniJson.asString(certificateDetails.get("certificateIssueCountry"))))
                    .append("\" certificateValidity=\"").append(XmlUtil.escAttr(orDefault(MiniJson.asString(certificateDetails.get("certificateValidity")), "Valid"))).append("\">\n");
            if (fitness != null) {
                sb.append("          <Fitness fitnessStatus=\"").append(XmlUtil.escAttr(MiniJson.asString(fitness.get("fitnessStatus"))));
                String unfitStart = MiniJson.asString(fitness.get("unfitStartDate"));
                String unfitEnd = MiniJson.asString(fitness.get("unfitEndDate"));
                if (unfitStart != null && !unfitStart.isBlank()) {
                    sb.append("\" unfitStartDate=\"").append(XmlUtil.escAttr(unfitStart));
                }
                if (unfitEnd != null && !unfitEnd.isBlank()) {
                    sb.append("\" unfitEndDate=\"").append(XmlUtil.escAttr(unfitEnd));
                }
                sb.append("\"/>\n");
            }
            sb.append("        </TransportManagerCertificateDetails>\n");
        }
        sb.append("        <TransportUndertakings")
                .append(" totalManagedUndertakings=\"").append(XmlUtil.escAttr(MiniJson.asIntString(
                        transportUndertakings == null ? null : transportUndertakings.get("totalManagedUndertakings"), 0))).append("\"")
                .append(" totalManagedVehicles=\"").append(XmlUtil.escAttr(MiniJson.asIntString(
                        transportUndertakings == null ? null : transportUndertakings.get("totalManagedVehicles"), 0))).append("\">\n");
        if (transportUndertakings != null) {
            java.util.List<Object> list = (java.util.List<Object>) transportUndertakings.get("undertaking");
            if (list != null) {
                for (Object o : list) {
                    Map<String, Object> u = (Map<String, Object>) o;
                    String el = transportUndertakingElement(u);
                    if (el == null) return null;
                    sb.append(el);
                }
            }
        }
        sb.append("        </TransportUndertakings>\n");
        sb.append("      </TransportManagerDetails>\n");
        return sb.toString();
    }

    /** Returns null if the licence number is missing, the status isn't a real XSD value, or the address is incomplete. */
    @SuppressWarnings("unchecked")
    private static String transportUndertakingElement(Map<String, Object> u) {
        String name = MiniJson.asString(u.get("transportUndertakingName"));
        Object numberOfVehicles = u.get("numberOfVehicles");
        String licenceNumber = MiniJson.asString(u.get("communityLicenceNumber"));
        String licenceStatus = MiniJson.asString(u.get("communityLicenceStatus"));
        Map<String, Object> addr = (Map<String, Object>) u.get("address");
        if (isBlank(name) || numberOfVehicles == null || isBlank(licenceNumber)
                || licenceStatus == null || !VALID_LICENCE_STATUSES.contains(licenceStatus)) {
            return null;
        }
        String addressXml = addressAttrs(addr);
        if (addressXml == null) return null;

        StringBuilder sb = new StringBuilder();
        sb.append("          <TransportUndertaking transportUndertakingName=\"").append(XmlUtil.escAttr(name))
                .append("\" numberOfVehicles=\"").append(XmlUtil.escAttr(MiniJson.asIntString(numberOfVehicles, 0)))
                .append("\" communityLicenceNumber=\"").append(XmlUtil.escAttr(licenceNumber))
                .append("\" communityLicenceStatus=\"").append(XmlUtil.escAttr(licenceStatus))
                .append("\">\n");
        sb.append("            <TransportUndertakingAddress").append(addressXml).append("/>\n");
        sb.append("          </TransportUndertaking>\n");
        return sb.toString();
    }

    /** Returns null (not a placeholder) if the address is absent or any required sub-field is missing. */
    private static String addressAttrs(Map<String, Object> address) {
        if (address == null) return null;
        String a = MiniJson.asString(address.get("address"));
        String postCode = MiniJson.asString(address.get("postCode"));
        String city = MiniJson.asString(address.get("city"));
        String country = MiniJson.asString(address.get("country"));
        if (isBlank(a) || isBlank(postCode) || isBlank(city) || isBlank(country)) return null;
        return " address=\"" + XmlUtil.escAttr(a) + "\" postCode=\"" + XmlUtil.escAttr(postCode)
                + "\" city=\"" + XmlUtil.escAttr(city) + "\" country=\"" + XmlUtil.escAttr(country) + "\"";
    }

    /** COMMUNITY_LICENCE_STATUS classifier codes already match globalCommunityLicenceStatusType verbatim (see CtudMapper). */
    private static final java.util.Set<String> VALID_LICENCE_STATUSES = java.util.Set.of(
            "Active", "Suspended", "Withdrawn", "Expired", "LostOrStolen", "Annulled", "Returned");

    private static String orDefault(String v, String fallback) {
        return (v == null || v.isBlank()) ? fallback : v;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
