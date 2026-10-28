import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * A NotifyCheckResult_Response is the substantive answer to our outgoing NCR. It maps to the flat
 * JSON ncr/inbound-response expects and never produces a reply (the Hub acknowledges separately).
 */
final class NcrResponseInMapper implements MessageMapper {
    @Override public String requestRoot() { return "NotifyCheckResult_Response"; }
    @Override public String responseRoot() { return "NotifyCheckResult_Response"; }
    @Override public String ruuterPath() { return "/ljvis/erru/ncr/inbound-response"; }
    @Override public Duration ruuterTimeout() { return Duration.ofSeconds(20); }
    @Override public boolean oneWay() { return true; }

    @Override public Map<String, Object> requestToJson(Document doc, Instant receivedAt) {
        Element header = XmlUtil.firstChild(doc.getDocumentElement(), "Header");
        Element body = XmlUtil.firstChild(doc.getDocumentElement(), "Body");
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("workflowId", XmlUtil.attr(header, "workflowId"));
        json.put("businessCaseId", XmlUtil.attr(body, "businessCaseId"));
        json.put("statusCode", XmlUtil.attr(body, "statusCode"));
        json.put("statusMessage", XmlUtil.attr(body, "statusMessage"));
        json.put("respondingAuthority", XmlUtil.attr(body, "respondingAuthority"));
        Element tu = XmlUtil.firstChild(body, "TransportUndertaking");
        if (tu != null) {
            json.put("transportUndertakingName", XmlUtil.attr(tu, "transportUndertakingName"));
            json.put("numberOfVehicles", XmlUtil.attr(tu, "numberOfVehicles"));
            json.put("communityLicenceStatus", XmlUtil.attr(tu, "communityLicenceStatus"));
            Element address = XmlUtil.firstChild(tu, "TransportUndertakingAddress");
            json.put("address", MiniJson.write(XmlUtil.attrs(address, "address", "postCode", "city", "country")));
        }
        List<Object> penalties = new ArrayList<>();
        Element container = XmlUtil.firstChild(body, "PenaltiesImposed");
        for (Element p : XmlUtil.children(container, "PenaltyImposed")) {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("penaltyRequestedIdentifier", XmlUtil.number(XmlUtil.attr(p, "penaltyRequestedIdentifier")));
            out.put("authorityImposingPenalty", XmlUtil.attr(p, "authorityImposingPenalty"));
            out.put("isImposed", XmlUtil.parseXsdBoolean(XmlUtil.attr(p, "isImposed")));
            out.put("penaltyTypeImposed", XmlUtil.attr(p, "penaltyTypeImposed"));
            out.putAll(XmlUtil.attrs(p, "startDate", "endDate", "reason"));
            penalties.add(out);
        }
        json.put("penaltiesImposed", MiniJson.write(penalties));
        return json;
    }

    @Override public boolean isAnswer(Map<String, Object> json) { return OneWayAnswers.isAnswer(json); }

    @Override public String buildResponseXml(Map<String, Object> json, Document doc, String id) {
        throw new UnsupportedOperationException("NCR responses do not require another response");
    }
}
