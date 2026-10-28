import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * A CheckGoodRepute_Response completes (or extends) our outgoing CGR. It maps every MemberState into
 * the member_states document shape the UI already reads, and it must never produce a reply.
 * A MemberState may list several TransportManagerDetails; the first stays under
 * transportManagerDetails and the rest are kept, not dropped, under additionalTransportManagerDetails.
 */
final class CgrResponseMapper implements MessageMapper {
    @Override public String requestRoot() { return "CheckGoodRepute_Response"; }
    @Override public String responseRoot() { return "CheckGoodRepute_Response"; }
    @Override public String ruuterPath() { return "/ljvis/erru/cgr/inbound-response"; }
    @Override public Duration ruuterTimeout() { return Duration.ofSeconds(20); }
    @Override public boolean oneWay() { return true; }

    @Override public Map<String, Object> requestToJson(Document doc, Instant receivedAt) {
        Element header = XmlUtil.firstChild(doc.getDocumentElement(), "Header");
        Element body = XmlUtil.firstChild(doc.getDocumentElement(), "Body");
        List<Object> states = new ArrayList<>();
        for (Element state : XmlUtil.children(body, "MemberState")) states.add(memberState(state));
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("workflowId", XmlUtil.attr(header, "workflowId"));
        json.put("businessCaseId", XmlUtil.attr(body, "businessCaseId"));
        json.put("memberStates", MiniJson.write(states));
        return json;
    }

    @Override public boolean isAnswer(Map<String, Object> json) { return OneWayAnswers.isAnswer(json); }

    @Override public String buildResponseXml(Map<String, Object> json, Document doc, String id) {
        throw new UnsupportedOperationException("CGR responses do not require another response");
    }

    private static Map<String, Object> memberState(Element state) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("memberStateCode", XmlUtil.attr(state, "memberStateCode"));
        out.put("statusCode", XmlUtil.attr(state, "statusCode"));
        out.putAll(XmlUtil.attrs(state, "statusMessage"));
        List<Element> managers = XmlUtil.children(state, "TransportManagerDetails");
        if (!managers.isEmpty()) {
            out.put("transportManagerDetails", manager(managers.get(0)));
            if (managers.size() > 1) {
                List<Object> more = new ArrayList<>();
                for (Element m : managers.subList(1, managers.size())) more.add(manager(m));
                out.put("additionalTransportManagerDetails", more);
            }
        }
        return out;
    }

    private static Map<String, Object> manager(Element m) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("respondingAuthority", XmlUtil.attr(m, "respondingAuthority"));
        out.put("searchMethod", XmlUtil.attr(m, "searchMethod"));
        Element name = XmlUtil.firstChild(m, "TransportManagerNameDetails");
        if (name != null) out.put("nameDetails", XmlUtil.attrs(name, "firstName", "familyName", "dateOfBirth", "placeOfBirth"));
        Element address = XmlUtil.firstChild(m, "TransportManagerAddressDetails");
        if (address != null) out.put("addressDetails", XmlUtil.attrs(address, "address", "postCode", "city", "country"));
        Element cert = XmlUtil.firstChild(m, "TransportManagerCertificateDetails");
        if (cert != null) {
            Map<String, Object> c = XmlUtil.attrs(cert, "certificateNumber", "certificateIssueDate", "certificateIssueCountry", "certificateValidity");
            Element fitness = XmlUtil.firstChild(cert, "Fitness");
            if (fitness != null) c.put("fitness", XmlUtil.attrs(fitness, "fitnessStatus", "unfitStartDate", "unfitEndDate"));
            out.put("certificateDetails", c);
        }
        Element undertakings = XmlUtil.firstChild(m, "TransportUndertakings");
        if (undertakings != null) {
            Map<String, Object> u = new LinkedHashMap<>();
            u.put("totalManagedUndertakings", XmlUtil.number(XmlUtil.attr(undertakings, "totalManagedUndertakings")));
            u.put("totalManagedVehicles", XmlUtil.number(XmlUtil.attr(undertakings, "totalManagedVehicles")));
            List<Object> list = new ArrayList<>();
            for (Element e : XmlUtil.children(undertakings, "TransportUndertaking")) {
                Map<String, Object> item = XmlUtil.attrs(e, "transportUndertakingName", "communityLicenceNumber", "communityLicenceStatus");
                item.put("numberOfVehicles", XmlUtil.number(XmlUtil.attr(e, "numberOfVehicles")));
                Element a = XmlUtil.firstChild(e, "TransportUndertakingAddress");
                if (a != null) item.put("address", XmlUtil.attrs(a, "address", "postCode", "city", "country"));
                list.add(item);
            }
            u.put("undertaking", list);
            out.put("transportUndertakings", u);
        }
        return out;
    }

}
