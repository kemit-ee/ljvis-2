import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * A CheckTransportUndertakingData_Response completes our outgoing CTUD. The first TransportUndertaking
 * becomes response_content (the shape the UI reads, licence types as classifier codes); any further
 * undertakings are kept under otherTransportUndertakings instead of being dropped. It must never
 * produce a reply.
 */
final class CtudResponseMapper implements MessageMapper {
    @Override public String requestRoot() { return "CheckTransportUndertakingData_Response"; }
    @Override public String responseRoot() { return "CheckTransportUndertakingData_Response"; }
    @Override public String ruuterPath() { return "/ljvis/erru/ctud/inbound-response"; }
    @Override public Duration ruuterTimeout() { return Duration.ofSeconds(20); }
    @Override public boolean oneWay() { return true; }

    @Override public Map<String, Object> requestToJson(Document doc, Instant receivedAt) {
        Element header = XmlUtil.firstChild(doc.getDocumentElement(), "Header");
        Element body = XmlUtil.firstChild(doc.getDocumentElement(), "Body");
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("workflowId", XmlUtil.attr(header, "workflowId"));
        json.put("businessCaseId", XmlUtil.attr(body, "businessCaseId"));
        json.put("respondingAuthority", XmlUtil.attr(body, "respondingAuthority"));
        json.put("responseStatusCode", XmlUtil.attr(body, "statusCode"));
        json.put("responseStatusMessage", XmlUtil.attr(body, "statusMessage"));
        List<Element> undertakings = XmlUtil.children(body, "TransportUndertaking");
        if (undertakings.isEmpty()) {
            json.put("responseContent", "");
        } else {
            Map<String, Object> content = undertaking(undertakings.get(0));
            if (undertakings.size() > 1) {
                List<Object> more = new ArrayList<>();
                for (Element e : undertakings.subList(1, undertakings.size())) more.add(undertaking(e));
                content.put("otherTransportUndertakings", more);
            }
            json.put("responseContent", MiniJson.write(content));
        }
        return json;
    }

    @Override public boolean isAnswer(Map<String, Object> json) { return OneWayAnswers.isAnswer(json); }

    @Override public String buildResponseXml(Map<String, Object> json, Document doc, String id) {
        throw new UnsupportedOperationException("CTUD responses do not require another response");
    }

    private static Map<String, Object> undertaking(Element e) {
        Map<String, Object> out = XmlUtil.attrs(e, "transportUndertakingName", "legalForm");
        out.put("numberOfEmployees", XmlUtil.number(XmlUtil.attr(e, "numberOfEmployees")));
        out.put("numberOfVehicles", XmlUtil.number(XmlUtil.attr(e, "numberOfVehicles")));
        out.put("riskRating", XmlUtil.number(XmlUtil.attr(e, "riskRating")));
        out.put("riskBand", XmlUtil.attr(e, "riskBand"));
        out.put("searchMethod", XmlUtil.attr(e, "searchMethod"));
        Element address = XmlUtil.firstChild(e, "TransportUndertakingAddress");
        if (address != null) out.put("address", XmlUtil.attrs(address, "address", "postCode", "city", "country"));
        List<Object> licences = new ArrayList<>();
        for (Element l : XmlUtil.children(e, "CommunityLicenceDetails")) {
            Map<String, Object> licence = XmlUtil.attrs(l, "communityLicenceNumber", "communityLicenceStatus",
                    "startDate", "expiryDate", "withdrawalDate", "suspensionDate", "suspensionExpiryDate",
                    "suspensionOrWithdrawalReason", "licencingAuthority");
            licence.put("communityLicenceType", typeCode(XmlUtil.attr(l, "communityLicenceType")));
            licences.add(licence);
        }
        out.put("communityLicenceDetails", licences);
        Element copies = XmlUtil.firstChild(e, "CertifiedTrueCopyDetails");
        if (copies != null) {
            List<Object> list = new ArrayList<>();
            for (Element c : XmlUtil.children(copies, "CertifiedTrueCopy"))
                list.add(XmlUtil.attrs(c, "trueCopyNumber", "trueCopyIssueDate", "trueCopyExpiryDate",
                        "trueCopySuspensionDate", "trueCopySuspensionExpiryDate", "trueCopyWithdrawalDate"));
            out.put("certifiedTrueCopyDetails", list);
        }
        Element vehicles = XmlUtil.firstChild(e, "VehicleRegistrations");
        if (vehicles != null) {
            List<Object> list = new ArrayList<>();
            for (Element v : XmlUtil.children(vehicles, "Vehicle")) list.add(XmlUtil.attr(v, "vehicleRegistrationNumber"));
            out.put("vehicleRegistrations", list);
        }
        return out;
    }

    /** Reverse of CtudMapper's translation: wire label to the COMMUNITY_LICENCE_TYPE classifier code. */
    private static String typeCode(String label) {
        for (Map.Entry<String, String> entry : CtudMapper.COMMUNITY_LICENCE_TYPE_TO_XSD.entrySet())
            if (entry.getValue().equals(label)) return entry.getKey();
        return label;
    }
}
