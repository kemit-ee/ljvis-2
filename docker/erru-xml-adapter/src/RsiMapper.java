import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * XML <-> JSON mapping for RoadSideInspection.
 *
 * Inbound direction targets DSL/Ruuter.internal/ljvis/POST/erru/rsi/inbound-request.yml's
 * allowlist, extended with driver/odometer/inspection-identifier/identification-details fields —
 * erru.rsi_message already HAD these columns (added for the
 * national inspection form, DSL/Liquibase/changelog/20260814100000-initial-erru-rsi.sql), the
 * inbound flow just never populated them from the ERRU envelope, so this data was silently
 * discarded on receipt. No schema migration was needed, only wiring the existing columns through
 * the allowlist/extract/pass-through (see also identificationDetailsJson below: the existing
 * chk_rsi_identification_choice CHECK constraint fixes the exact JSON shape this mapper must
 * produce — it is NOT the same generic-discriminator shape the other mappers here use).
 *
 * Outbound direction is deliberately the simplest of the four new types:
 * RoadSideInspection_Response carries only statusCode/statusMessage (rsiBodyResponseType) — the
 * vehicleDetails the flow's own Liiklusregister lookup returns is not part of the XSD response
 * and must not be sent.
 */
final class RsiMapper implements MessageMapper {
    private static final DateTimeFormatter SENT_AT_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'").withZone(java.time.ZoneOffset.UTC);

    private final String respondingAuthority;
    private final String memberStateCode;

    RsiMapper(String respondingAuthority, String memberStateCode) {
        this.respondingAuthority = respondingAuthority;
        this.memberStateCode = memberStateCode;
    }

    @Override public String requestRoot() { return "RoadSideInspection_Request"; }
    @Override public String responseRoot() { return "RoadSideInspection_Response"; }
    @Override public String ruuterPath() { return "/ljvis/erru/rsi/inbound-request"; }
    @Override public Duration ruuterTimeout() { return Duration.ofSeconds(20); }
    @Override public boolean requiresBusinessCompletion() { return true; }

    /** RSI has no acknowledgementType — recognised by a known statusCode. */
    private static final java.util.Set<String> KNOWN_STATUS_CODES =
            java.util.Set.of("OK", "NotFound", "InvalidData", "ServerError", "NotAvailable");

    @Override public boolean isAnswer(Map<String, Object> json) {
        return KNOWN_STATUS_CODES.contains(json.get("statusCode"));
    }

    @Override public Map<String, Object> requestToJson(Document doc, Instant receivedAt) {
        Element root = doc.getDocumentElement();
        Element header = XmlUtil.firstChild(root, "Header");
        Element body = XmlUtil.firstChild(root, "Body");
        Element inspectionDetails = XmlUtil.firstChild(body, "InspectionDetails");
        Element inspectionResult = XmlUtil.firstChild(inspectionDetails, "InspectionResult");
        Element idDetails = XmlUtil.firstChild(body, "IdentificationDetails");
        Element vehicle = XmlUtil.firstChild(idDetails, "VehicleDetails");
        Element driver = XmlUtil.firstChild(idDetails, "DriverDetails");
        Element tuDetails = XmlUtil.firstChild(idDetails, "TransportUndertakingDetails");
        Element holderDetails = XmlUtil.firstChild(idDetails, "HolderDetails");
        Element checkedItemsEl = XmlUtil.firstChild(body, "CheckedItems");

        Map<String, Object> json = new LinkedHashMap<>();
        json.put("technicalId", XmlUtil.attr(header, "technicalId"));
        json.put("workflowId", XmlUtil.attr(header, "workflowId"));
        json.put("sentAt", XmlUtil.attr(header, "sentAt"));
        json.put("from", XmlUtil.attr(header, "from"));
        json.put("businessCaseId", XmlUtil.attr(body, "businessCaseId"));
        json.put("originatingAuthority", XmlUtil.attr(body, "originatingAuthority"));
        json.put("requestSource", XmlUtil.attr(body, "requestSource"));
        json.put("requestPurpose", XmlUtil.attr(body, "requestPurpose"));
        json.put("vehicleRegistrationNumber", XmlUtil.attr(vehicle, "vehicleRegistrationNumber"));
        json.put("vehicleRegistrationCountry", XmlUtil.attr(vehicle, "vehicleRegistrationCountry"));
        json.put("vehicleCategory", XmlUtil.attr(vehicle, "vehicleCategory"));
        json.put("vehicleIdentificationNumber", XmlUtil.attr(vehicle, "vehicleIdentificationNumber"));
        json.put("inspectionLocation", XmlUtil.attr(inspectionDetails, "inspectionLocation"));
        json.put("inspectionDatetime", XmlUtil.attr(inspectionDetails, "inspectionDateTime"));
        json.put("inspectionAuthorityOrName", XmlUtil.attr(inspectionDetails, "inspectionAuthorityOrName"));
        json.put("inspectionPassed", XmlUtil.attr(inspectionResult, "inspectionPassed"));
        json.put("ptiRequested", XmlUtil.attr(inspectionResult, "ptiRequested"));
        json.put("vehicleProhibitionOrRestriction", XmlUtil.attr(inspectionResult, "vehicleProhibitionOrRestriction"));

        json.put("driverFirstName", XmlUtil.attr(driver, "firstName"));
        json.put("driverFamilyName", XmlUtil.attr(driver, "familyName"));
        json.put("driverLicenceNumber", XmlUtil.attr(driver, "drivingLicenceNumber"));
        json.put("driverLicenceCountry", XmlUtil.attr(driver, "drivingLicenceCountry"));
        json.put("odometerReading", XmlUtil.attr(vehicle, "odometerReading"));
        json.put("inspectionIdentifier", XmlUtil.attr(inspectionDetails, "inspectionIdentifier"));

        // erru.rsi_message.identification_details's EXISTING shape (chk_rsi_identification_choice,
        // 20260814100000-initial-erru-rsi.sql) is a flat discriminator, not the generic D5 "type"
        // shape used elsewhere in this adapter — isVehicleHolder is REQUIRED to be exactly
        // "transport_undertaking" or "owner" or the INSERT is rejected by the CHECK constraint.
        Map<String, Object> idJson = null;
        if (tuDetails != null) {
            idJson = new LinkedHashMap<>();
            idJson.put("isVehicleHolder", "transport_undertaking");
            idJson.put("transportUndertakingName", XmlUtil.attr(tuDetails, "transportUndertakingName"));
            idJson.put("communityLicenceNumber", XmlUtil.attr(tuDetails, "communityLicenceNumber"));
            idJson.put("address", addressJson(XmlUtil.firstChild(tuDetails, "TransportUndertakingAddress")));
        } else if (holderDetails != null) {
            Element company = XmlUtil.firstChild(holderDetails, "Company");
            Element naturalPerson = XmlUtil.firstChild(holderDetails, "NaturalPerson");
            idJson = new LinkedHashMap<>();
            idJson.put("isVehicleHolder", "owner");
            idJson.put("registrationCertificate", nullIfBlank(XmlUtil.attr(holderDetails, "registrationCertificate")));
            if (company != null) {
                idJson.put("isNaturalPerson", "company");
                idJson.put("companyName", XmlUtil.attr(company, "companyName"));
                idJson.put("address", addressJson(company));
            } else {
                idJson.put("isNaturalPerson", "natural_person");
                idJson.put("firstName", XmlUtil.attr(naturalPerson, "firstName"));
                idJson.put("familyName", XmlUtil.attr(naturalPerson, "familyName"));
                idJson.put("address", addressJson(naturalPerson));
            }
        }
        if (idJson != null) {
            json.put("identificationDetails", MiniJson.write(idJson));
        }

        List<Object> checkedItems = new ArrayList<>();
        for (Element item : XmlUtil.children(checkedItemsEl, "CheckedItem")) {
            Map<String, Object> ci = new LinkedHashMap<>();
            ci.put("itemType", parseInt(XmlUtil.attr(item, "itemType")));
            boolean failed = XmlUtil.parseXsdBoolean(XmlUtil.attr(item, "itemFailed"));
            ci.put("itemFailed", failed);
            Element failedChecksEl = XmlUtil.firstChild(item, "FailedChecks");
            if (failedChecksEl != null) {
                List<Object> failedChecks = new ArrayList<>();
                for (Element fc : XmlUtil.children(failedChecksEl, "FailedCheck")) {
                    Map<String, Object> f = new LinkedHashMap<>();
                    f.put("failedReason", XmlUtil.attr(fc, "failedReason"));
                    f.put("failedAssessment", XmlUtil.attr(fc, "failedAssessment"));
                    if (XmlUtil.hasAttr(fc, "isRectified")) {
                        f.put("isRectified", XmlUtil.parseXsdBoolean(XmlUtil.attr(fc, "isRectified")));
                    }
                    failedChecks.add(f);
                }
                ci.put("failedChecks", failedChecks);
            }
            checkedItems.add(ci);
        }
        json.put("checkedItems", MiniJson.write(checkedItems));
        return json;
    }

    private static Map<String, Object> addressJson(Element addressEl) {
        if (addressEl == null) return null;
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("address", XmlUtil.attr(addressEl, "address"));
        a.put("postCode", XmlUtil.attr(addressEl, "postCode"));
        a.put("city", XmlUtil.attr(addressEl, "city"));
        a.put("country", XmlUtil.attr(addressEl, "country"));
        return a;
    }

    @Override public String buildResponseXml(Map<String, Object> json, Document requestDoc, String freshTechnicalId) {
        Element reqRoot = requestDoc.getDocumentElement();
        Element reqHeader = XmlUtil.firstChild(reqRoot, "Header");
        Element reqBody = XmlUtil.firstChild(reqRoot, "Body");

        String workflowId = XmlUtil.attr(reqHeader, "workflowId");
        String businessCaseId = XmlUtil.attr(reqBody, "businessCaseId");
        String originatingAuthority = XmlUtil.attr(reqBody, "originatingAuthority");
        String to = XmlUtil.attr(reqHeader, "from");
        String sentAt = SENT_AT_FORMAT.format(Instant.now());

        StatusMapper.Mapped mapped = StatusMapper.map(StatusMapper.Kind.RSI,
                MiniJson.asString(json.get("statusCode")), MiniJson.asString(json.get("statusMessage")));

        StringBuilder xml = new StringBuilder();
        xml.append("<RoadSideInspection_Response xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\">\n");
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
        xml.append("/>\n");
        xml.append("</RoadSideInspection_Response>");
        return xml.toString();
    }

    private static Integer parseInt(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
