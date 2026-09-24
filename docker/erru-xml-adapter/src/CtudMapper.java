import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * XML <-> JSON mapping for CheckTransportUndertakingData.
 *
 * Inbound direction: CheckTransportUndertakingData_Request's SearchedCompany is an
 * xs:choice of 3 search variants (SearchByLicenceAndName / SearchByLicenceAndVehicle /
 * SearchByNameAndVehicle), each populating a subset of the same flat
 * transportUndertakingName/communityLicenceNumber/vehicleRegistration* fields that
 * DSL/Ruuter.internal/ljvis/POST/erru/ctud/inbound-request.yml's allowlist already expects — the
 * unchosen variant's fields are simply absent, exactly like NU's TransportManagerNameDetails vs
 * TransportManagerCertificateDetails choice.
 *
 * Outbound direction: the response must echo SearchedCompany back verbatim (byte-for-byte
 * equivalent, not just equivalent JSON) — {@link #echoSearchedCompany} rebuilds it directly from
 * the request DOM rather than round-tripping through the flow's own (lossy, flattened) DTO.
 * TransportUndertaking (Found) mirrors the existing flow's single-object `resp_content` shape
 * (DSL/Ruuter.internal/ljvis/POST/erru/ctud/inbound-request.yml's buildFoundResponse) — the flow
 * itself only ever returns at most one match, so the response has 0 or 1 TransportUndertaking
 * elements, never more.
 *
 * A real, previously-found bug: a "Found" answer was ALWAYS coming out as "NotAvailable" — the flow's
 * COMMUNITY_LICENCE_TYPE classifier deliberately uses compact codes ("CommunityLicenceGoods" —
 * DSL/Liquibase/changelog/20260828210000-initial-erru-ctud-classifiers.sql's own comment: "kept as
 * the task's own contract, not silently switched to the XSD spelling"), while the ERRU 3.5 wire
 * format requires the long enumeration string ("Community licence for goods transport"). Nowhere
 * else in the system needs this translation — only this mapper, which is the one place actually
 * producing ERRU XML — so {@link #COMMUNITY_LICENCE_TYPE_TO_XSD} exists here, not upstream.
 * `communityLicenceStatus` needs no such table: that classifier's codes already match the XSD
 * enumeration verbatim (both use "Active"/"Suspended"/... — confirmed against
 * globalCommunityLicenceStatusType and COMMUNITY_LICENCE_STATUS's own classifier seed).
 *
 * Also: an unrecognised/missing licence type, status, number or a required address
 * field is never defaulted to something valid-looking ("Active", "unknown", "00000") — a
 * transport authority in another member state acts on this data, and a fabricated "Active"
 * status or "Community licence for goods transport" type would misrepresent Estonia's own
 * register. If any REQUIRED field for a Found answer is missing or unrecognised, this is our own
 * translation failure and {@link #buildResponseXml} throws — the caller sends an
 * ErrorNotification, never a synthetic "NotAvailable" (forbidden by protocol, see
 * {@link StatusMapper}) or a fabricated Found record.
 */
final class CtudMapper implements MessageMapper {
    private static final DateTimeFormatter SENT_AT_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'").withZone(java.time.ZoneOffset.UTC);

    /** COMMUNITY_LICENCE_TYPE classifier code -> globalCommunityLicenceType XSD enumeration string. */
    private static final Map<String, String> COMMUNITY_LICENCE_TYPE_TO_XSD = Map.of(
            "CommunityLicencePassenger", "Community licence for passenger transport",
            "NationalLicencePassenger", "National licence for passenger transport",
            "CommunityLicenceGoods", "Community licence for goods transport",
            "CommunityLicenceGoodsLight", "Community licence for goods transport, exclusively \u22643.5 t",
            "NationalLicenceGoods", "National licence for goods transport"
    );

    /** COMMUNITY_LICENCE_STATUS classifier codes already match globalCommunityLicenceStatusType verbatim. */
    private static final java.util.Set<String> VALID_LICENCE_STATUSES = java.util.Set.of(
            "Active", "Suspended", "Withdrawn", "Expired", "LostOrStolen", "Annulled", "Returned");

    private final String defaultRespondingAuthority;
    private final String memberStateCode;

    /**
     * `defaultRespondingAuthority` is used only as a fallback for our OWN synthetic answers
     * (buildFallbackXml, or a malformed flow response) — a real Found/NotFound answer from
     * ctud/inbound-request.yml always sets its own respondingAuthority (EE-TRAM or whatever MTR
     * returned), and that value is used verbatim when present (it previously wasn't — see the
     * class Javadoc).
     */
    CtudMapper(String defaultRespondingAuthority, String memberStateCode) {
        this.defaultRespondingAuthority = defaultRespondingAuthority;
        this.memberStateCode = memberStateCode;
    }

    @Override public String requestRoot() { return "CheckTransportUndertakingData_Request"; }
    @Override public String responseRoot() { return "CheckTransportUndertakingData_Response"; }
    @Override public String ruuterPath() { return "/ljvis/erru/ctud/inbound-request"; }
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
        Element searchedCompany = XmlUtil.firstChild(body, "SearchedCompany");

        Element byLicenceAndName = XmlUtil.firstChild(searchedCompany, "SearchByLicenceAndName");
        Element byLicenceAndVehicle = XmlUtil.firstChild(searchedCompany, "SearchByLicenceAndVehicle");
        Element byNameAndVehicle = XmlUtil.firstChild(searchedCompany, "SearchByNameAndVehicle");
        Element variant = byLicenceAndName != null ? byLicenceAndName
                : byLicenceAndVehicle != null ? byLicenceAndVehicle : byNameAndVehicle;
        Element vehicle = XmlUtil.firstChild(variant, "Vehicle");

        Map<String, Object> json = new LinkedHashMap<>();
        json.put("technicalId", XmlUtil.attr(header, "technicalId"));
        json.put("workflowId", XmlUtil.attr(header, "workflowId"));
        json.put("sentAt", XmlUtil.attr(header, "sentAt"));
        json.put("from", XmlUtil.attr(header, "from"));
        json.put("businessCaseId", XmlUtil.attr(body, "businessCaseId"));
        json.put("originatingAuthority", XmlUtil.attr(body, "originatingAuthority"));
        json.put("requestSource", XmlUtil.attr(body, "requestSource"));
        json.put("requestPurpose", XmlUtil.attr(body, "requestPurpose"));
        json.put("transportUndertakingName", XmlUtil.attr(variant, "transportUndertakingName"));
        json.put("communityLicenceNumber", XmlUtil.attr(variant, "communityLicenceNumber"));
        json.put("vehicleRegistrationNumber", XmlUtil.attr(vehicle, "vehicleRegistrationNumber"));
        json.put("vehicleRegistrationCountry", XmlUtil.attr(vehicle, "vehicleRegistrationCountry"));
        // the flow's own `all_vehicles` check only recognises the exact
        // string "true" — a valid XSD "1" was silently read as false. Normalizing to the literal
        // "true"/"false" string here (not the raw XML attribute text) fixes it without needing a
        // matching change in ctud/inbound-request.yml's own JS, since every caller of that flow
        // (this adapter and any other) would otherwise need to know the same undocumented quirk.
        json.put("requestAllVehicles", XmlUtil.parseXsdBoolean(XmlUtil.attr(searchedCompany, "requestAllVehicles")) ? "true" : "false");
        return json;
    }

    @Override
    @SuppressWarnings("unchecked")
    public String buildResponseXml(Map<String, Object> json, Document requestDoc, String freshTechnicalId) {
        Element reqRoot = requestDoc.getDocumentElement();
        Element reqHeader = XmlUtil.firstChild(reqRoot, "Header");
        Element reqBody = XmlUtil.firstChild(reqRoot, "Body");
        Element reqSearchedCompany = XmlUtil.firstChild(reqBody, "SearchedCompany");

        String workflowId = XmlUtil.attr(reqHeader, "workflowId");
        String businessCaseId = XmlUtil.attr(reqBody, "businessCaseId");
        String originatingAuthority = XmlUtil.attr(reqBody, "originatingAuthority");
        String to = XmlUtil.attr(reqHeader, "from");
        String sentAt = SENT_AT_FORMAT.format(Instant.now());

        StatusMapper.Mapped mapped = StatusMapper.map(StatusMapper.Kind.SEARCH,
                MiniJson.asString(json.get("statusCode")), MiniJson.asString(json.get("statusMessage")));
        String respondingAuthority = orDefault(MiniJson.asString(json.get("respondingAuthority")), defaultRespondingAuthority);

        // Never emit a "Found" answer built from data we could not fully and truthfully translate
        // (unrecognised/missing licence type or status, missing licence number) — this is our own
        // translation failure, not a legitimate business status, so it must become an
        // ErrorNotification (ServerError), never a guessed value or a synthetic NotAvailable
        // (forbidden — see StatusMapper).
        String transportUndertakingXml = "";
        if ("Found".equals(mapped.statusCode())) {
            transportUndertakingXml = transportUndertakingElement(json);
            if (transportUndertakingXml == null) {
                throw new IllegalStateException("Found record could not be fully and accurately translated to the ERRU 3.5 format");
            }
        }

        StringBuilder xml = new StringBuilder();
        xml.append("<CheckTransportUndertakingData_Response xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\">\n");
        xml.append("  <Header version=\"3.5\" technicalId=\"").append(XmlUtil.escAttr(freshTechnicalId))
                .append("\" workflowId=\"").append(XmlUtil.escAttr(workflowId))
                .append("\" sentAt=\"").append(XmlUtil.escAttr(sentAt))
                .append("\" from=\"").append(XmlUtil.escAttr(memberStateCode))
                .append("\" to=\"").append(XmlUtil.escAttr(to)).append("\"/>\n");
        xml.append("  <Body businessCaseId=\"").append(XmlUtil.escAttr(businessCaseId))
                .append("\" originatingAuthority=\"").append(XmlUtil.escAttr(originatingAuthority))
                .append("\" respondingAuthority=\"").append(XmlUtil.escAttr(respondingAuthority))
                .append("\" statusCode=\"").append(XmlUtil.escAttr(mapped.statusCode())).append("\"");
        if (mapped.statusMessage() != null && !mapped.statusMessage().isBlank()) {
            xml.append(" statusMessage=\"").append(XmlUtil.escAttr(mapped.statusMessage())).append("\"");
        }
        xml.append(">\n");
        xml.append(echoSearchedCompany(reqSearchedCompany));
        xml.append(transportUndertakingXml);
        xml.append("  </Body>\n");
        xml.append("</CheckTransportUndertakingData_Response>");
        return xml.toString();
    }

    /**
     * Echoes SearchedCompany exactly as sent, via {@link XmlUtil#serializeElement} — a full DOM
     * re-serialization, not a manual attribute-by-attribute rebuild that silently drops anything
     * the mapper doesn't explicitly know about (the same fix CGR needed for its own
     * SearchedTransportManager echo, applied here too for consistency).
     */
    private static String echoSearchedCompany(Element reqSearchedCompany) {
        return "    " + XmlUtil.serializeElement(reqSearchedCompany) + "\n";
    }

    /**
     * Mirrors ctud/inbound-request.yml's buildFoundResponse `resp_content` shape exactly (a single
     * flat object, not an array — the flow answers with at most one match).
     *
     * Returns {@code null} (not a best-effort partial element) if any XSD-required field is
     * missing or cannot be translated to a valid ERRU value — the caller downgrades the whole
     * answer to NotAvailable rather than send a "Found" record with fabricated data.
     */
    @SuppressWarnings("unchecked")
    private static String transportUndertakingElement(Map<String, Object> json) {
        String name = MiniJson.asString(json.get("transportUndertakingName"));
        String legalForm = MiniJson.asString(json.get("legalForm"));
        Object numberOfVehicles = json.get("numberOfVehicles");
        Object numberOfEmployees = json.get("numberOfEmployees");
        // riskRating/riskBand: the flow itself always supplies 0/"Grey" today (a pre-existing,
        // already-documented product-owner-open question — README "Known limitations" — not a gap
        // introduced by this mapper), so these two are accepted as-is rather than gated like the
        // fields below, which the flow only omits when it genuinely doesn't have the data.
        Object riskRating = json.get("riskRating");
        String riskBand = MiniJson.asString(json.get("riskBand"));
        String searchMethod = MiniJson.asString(json.get("searchMethod"));
        Map<String, Object> address = (Map<String, Object>) json.get("address");
        List<Object> communityLicences = (List<Object>) json.get("communityLicenceDetails");
        List<Object> trueCopies = (List<Object>) json.get("certifiedTrueCopyDetails");
        List<Object> vehicleRegs = (List<Object>) json.get("vehicleRegistrations");

        if (name == null || name.isBlank() || numberOfVehicles == null || numberOfEmployees == null) {
            return null;
        }
        String addressXml = addressAttrs(address);
        if (addressXml == null) {
            return null;
        }
        if (communityLicences == null || communityLicences.isEmpty()) {
            return null;
        }
        StringBuilder licencesXml = new StringBuilder();
        for (Object cl : communityLicences) {
            String el = communityLicenceElement((Map<String, Object>) cl);
            if (el == null) return null;
            licencesXml.append(el);
        }

        StringBuilder sb = new StringBuilder();
        sb.append("    <TransportUndertaking transportUndertakingName=\"").append(XmlUtil.escAttr(name)).append("\"");
        if (legalForm != null && !legalForm.isBlank()) {
            sb.append(" legalForm=\"").append(XmlUtil.escAttr(legalForm)).append("\"");
        }
        sb.append(" numberOfVehicles=\"").append(XmlUtil.escAttr(MiniJson.asIntString(numberOfVehicles, 0))).append("\"")
                .append(" numberOfEmployees=\"").append(XmlUtil.escAttr(MiniJson.asIntString(numberOfEmployees, 0))).append("\"")
                .append(" riskRating=\"").append(XmlUtil.escAttr(MiniJson.asIntString(riskRating, 0))).append("\"")
                .append(" riskBand=\"").append(XmlUtil.escAttr(riskBand == null ? "Grey" : riskBand)).append("\"")
                .append(" searchMethod=\"").append(XmlUtil.escAttr(searchMethod == null ? "CommunityLicence" : searchMethod)).append("\">\n");

        if (vehicleRegs != null && !vehicleRegs.isEmpty()) {
            sb.append("      <VehicleRegistrations>\n");
            for (Object v : vehicleRegs) {
                // (minor) the request's own vehicle_registration_country isn't
                // threaded through the flow's vehicleRegistrations list (plain registration
                // number strings) — hardcoding EE here matches "vehicles we manage", which are by
                // definition EE-registered in this flow, not a guess.
                sb.append("        <Vehicle vehicleRegistrationNumber=\"").append(XmlUtil.escAttr(MiniJson.asString(v)))
                        .append("\" vehicleRegistrationCountry=\"EE\"/>\n");
            }
            sb.append("      </VehicleRegistrations>\n");
        }
        sb.append("      <TransportUndertakingAddress").append(addressXml).append("/>\n");
        sb.append(licencesXml);
        if (trueCopies != null && !trueCopies.isEmpty()) {
            sb.append("      <CertifiedTrueCopyDetails>\n");
            for (Object tc : trueCopies) {
                String el = trueCopyElement((Map<String, Object>) tc);
                if (el == null) return null;
                sb.append(el);
            }
            sb.append("      </CertifiedTrueCopyDetails>\n");
        }
        sb.append("    </TransportUndertaking>\n");
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

    /** Returns null if the licence number is missing, the status isn't a real XSD value, or the type has no mapping. */
    private static String communityLicenceElement(Map<String, Object> cl) {
        String number = MiniJson.asString(cl.get("communityLicenceNumber"));
        String status = MiniJson.asString(cl.get("communityLicenceStatus"));
        String typeCode = MiniJson.asString(cl.get("communityLicenceType"));
        String startDate = MiniJson.asString(cl.get("startDate"));
        String expiryDate = MiniJson.asString(cl.get("expiryDate"));
        String licencingAuthority = MiniJson.asString(cl.get("licencingAuthority"));
        if (isBlank(number) || isBlank(startDate) || isBlank(expiryDate) || isBlank(licencingAuthority)) return null;
        if (status == null || !VALID_LICENCE_STATUSES.contains(status)) return null;
        String xsdType = COMMUNITY_LICENCE_TYPE_TO_XSD.get(typeCode);
        if (xsdType == null) return null;

        StringBuilder sb = new StringBuilder();
        sb.append("      <CommunityLicenceDetails communityLicenceNumber=\"").append(XmlUtil.escAttr(number))
                .append("\" communityLicenceStatus=\"").append(XmlUtil.escAttr(status))
                .append("\" communityLicenceType=\"").append(XmlUtil.escAttr(xsdType))
                .append("\" startDate=\"").append(XmlUtil.escAttr(startDate))
                .append("\" expiryDate=\"").append(XmlUtil.escAttr(expiryDate));
        // Optional per ctudCommunityLicenceFullDetailsType — pass through when the source (MTR)
        // supplied them; these were previously dropped entirely.
        appendOptional(sb, "withdrawalDate", MiniJson.asString(cl.get("withdrawalDate")));
        appendOptional(sb, "suspensionDate", MiniJson.asString(cl.get("suspensionDate")));
        appendOptional(sb, "suspensionExpiryDate", MiniJson.asString(cl.get("suspensionExpiryDate")));
        appendOptional(sb, "suspensionOrWithdrawalReason", MiniJson.asString(cl.get("suspensionOrWithdrawalReason")));
        sb.append("\" licencingAuthority=\"").append(XmlUtil.escAttr(licencingAuthority)).append("\"/>\n");
        return sb.toString();
    }

    /** Returns null if the true copy number/dates are missing (all required by ctudTrueCopyDetailsType). */
    private static String trueCopyElement(Map<String, Object> tc) {
        String number = MiniJson.asString(tc.get("trueCopyNumber"));
        String issueDate = MiniJson.asString(tc.get("trueCopyIssueDate"));
        String expiryDate = MiniJson.asString(tc.get("trueCopyExpiryDate"));
        if (isBlank(number) || isBlank(issueDate) || isBlank(expiryDate)) return null;

        StringBuilder sb = new StringBuilder();
        sb.append("        <CertifiedTrueCopy trueCopyNumber=\"").append(XmlUtil.escAttr(number))
                .append("\" trueCopyIssueDate=\"").append(XmlUtil.escAttr(issueDate))
                .append("\" trueCopyExpiryDate=\"").append(XmlUtil.escAttr(expiryDate));
        // Optional per ctudTrueCopyDetailsType — previously dropped entirely.
        appendOptional(sb, "trueCopySuspensionDate", MiniJson.asString(tc.get("trueCopySuspensionDate")));
        appendOptional(sb, "trueCopySuspensionExpiryDate", MiniJson.asString(tc.get("trueCopySuspensionExpiryDate")));
        appendOptional(sb, "trueCopyWithdrawalDate", MiniJson.asString(tc.get("trueCopyWithdrawalDate")));
        sb.append("\"/>\n");
        return sb.toString();
    }

    /** Appends ` name="value"` (continuing an already-open attribute string ending mid-quote) only if value is present. */
    private static void appendOptional(StringBuilder sb, String name, String value) {
        if (value != null && !value.isBlank()) {
            sb.append("\" ").append(name).append("=\"").append(XmlUtil.escAttr(value));
        }
    }

    private static String orDefault(String v, String fallback) {
        return (v == null || v.isBlank()) ? fallback : v;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
