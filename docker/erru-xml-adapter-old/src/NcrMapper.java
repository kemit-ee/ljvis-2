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
 * XML <-> JSON mapping for NotifyCheckResult.
 *
 * Inbound direction targets DSL/Ruuter.internal/ljvis/POST/erru/ncr/inbound-request.yml's
 * allowlist exactly: minorInfringement/seriousInfringements travel as JSON-encoded strings,
 * matching the shape documented on erru.ncr_message.minor_infringement /
 * .serious_infringements (DSL/Liquibase/changelog/20260816100000-initial-erru-ncr.sql) — this
 * mapper is the XML-side producer of that same shape: keys = XSD attribute names, arrays for
 * maxOccurs>1, real numbers/booleans, an absent optional attribute is an absent key.
 *
 * Outbound direction is deliberately simple: NCRN_Ack carries only
 * acknowledgementType/statusCode/statusMessage/respondingAuthority — no echoed business content,
 * unlike CGR/CTUD/RSI.
 */
final class NcrMapper implements MessageMapper {
    private static final DateTimeFormatter SENT_AT_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'").withZone(java.time.ZoneOffset.UTC);

    private final String respondingAuthority;
    private final String memberStateCode;

    NcrMapper(String respondingAuthority, String memberStateCode) {
        this.respondingAuthority = respondingAuthority;
        this.memberStateCode = memberStateCode;
    }

    @Override public String requestRoot() { return "NotifyCheckResult_Request"; }
    @Override public String responseRoot() { return "NotifyCheckResult_Acknowledgement"; }
    @Override public String ruuterPath() { return "/ljvis/erru/ncr/inbound-request"; }
    @Override public Duration ruuterTimeout() { return Duration.ofSeconds(20); }
    @Override public boolean requiresBusinessCompletion() { return true; }

    @Override public boolean isAnswer(Map<String, Object> json) {
        return "NCRN_Ack".equals(json.get("acknowledgementType"));
    }

    @Override public Map<String, Object> requestToJson(Document doc, Instant receivedAt) {
        Element root = doc.getDocumentElement();
        Element header = XmlUtil.firstChild(root, "Header");
        Element body = XmlUtil.firstChild(root, "Body");
        Element tu = XmlUtil.firstChild(body, "TransportUndertaking");
        Element vehicle = XmlUtil.firstChild(tu, "Vehicle");
        Element checkSummary = XmlUtil.firstChild(tu, "CheckSummary");
        Element minor = XmlUtil.firstChild(tu, "MinorInfringement");

        Map<String, Object> json = new LinkedHashMap<>();
        json.put("technicalId", XmlUtil.attr(header, "technicalId"));
        json.put("workflowId", XmlUtil.attr(header, "workflowId"));
        json.put("sentAt", XmlUtil.attr(header, "sentAt"));
        json.put("from", XmlUtil.attr(header, "from"));
        json.put("businessCaseId", XmlUtil.attr(body, "businessCaseId"));
        json.put("originatingAuthority", XmlUtil.attr(body, "originatingAuthority"));
        json.put("requestSource", XmlUtil.attr(body, "requestSource"));
        json.put("requestPurpose", XmlUtil.attr(body, "requestPurpose"));
        json.put("transportUndertakingName", XmlUtil.attr(tu, "transportUndertakingName"));
        json.put("communityLicenceNumber", XmlUtil.attr(tu, "communityLicenceNumber"));
        json.put("vehicleRegistrationNumber", XmlUtil.attr(vehicle, "vehicleRegistrationNumber"));
        json.put("vehicleRegistrationCountry", XmlUtil.attr(vehicle, "vehicleRegistrationCountry"));
        json.put("checkResult", XmlUtil.attr(checkSummary, "checkResult"));
        json.put("checkDate", XmlUtil.attr(checkSummary, "dateOfCheck"));

        if (minor != null) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("dateOfInfringement", XmlUtil.attr(minor, "dateOfInfringement"));
            m.put("numberOfInfringements", parseInt(XmlUtil.attr(minor, "numberOfInfringements")));
            json.put("minorInfringement", MiniJson.write(m));
        }

        List<Object> serious = new ArrayList<>();
        for (Element si : XmlUtil.children(tu, "SeriousInfringement")) {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("dateOfInfringement", XmlUtil.attr(si, "dateOfInfringement"));
            s.put("category", XmlUtil.attr(si, "category"));
            s.put("infringementType", XmlUtil.attr(si, "infringementType"));
            s.put("appealPossible", XmlUtil.parseXsdBoolean(XmlUtil.attr(si, "appealPossible")));

            List<Object> imposed = new ArrayList<>();
            Element imposedContainer = XmlUtil.firstChild(si, "PenaltiesImposed");
            for (Element p : XmlUtil.children(imposedContainer, "PenaltyImposed")) {
                Map<String, Object> pi = new LinkedHashMap<>();
                pi.put("penaltyImposedIdentifier", parseInt(XmlUtil.attr(p, "penaltyImposedIdentifier")));
                pi.put("finalDecisionDate", XmlUtil.attr(p, "finalDecisionDate"));
                pi.put("penaltyTypeImposed", XmlUtil.attr(p, "penaltyTypeImposed"));
                if (XmlUtil.hasAttr(p, "startDate")) pi.put("startDate", XmlUtil.attr(p, "startDate"));
                if (XmlUtil.hasAttr(p, "endDate")) pi.put("endDate", XmlUtil.attr(p, "endDate"));
                pi.put("isExecuted", XmlUtil.attr(p, "isExecuted"));
                if (XmlUtil.hasAttr(p, "notExecutedReason")) pi.put("notExecutedReason", XmlUtil.attr(p, "notExecutedReason"));
                imposed.add(pi);
            }
            s.put("penaltiesImposed", imposed);

            Element requestedContainer = XmlUtil.firstChild(si, "PenaltiesRequested");
            if (requestedContainer != null) {
                List<Object> requested = new ArrayList<>();
                for (Element p : XmlUtil.children(requestedContainer, "PenaltyRequested")) {
                    Map<String, Object> pr = new LinkedHashMap<>();
                    pr.put("penaltyRequestedIdentifier", parseInt(XmlUtil.attr(p, "penaltyRequestedIdentifier")));
                    pr.put("penaltyTypeRequested", XmlUtil.attr(p, "penaltyTypeRequested"));
                    if (XmlUtil.hasAttr(p, "duration")) pr.put("duration", parseInt(XmlUtil.attr(p, "duration")));
                    requested.add(pr);
                }
                s.put("penaltiesRequested", requested);
            }
            serious.add(s);
        }
        json.put("seriousInfringements", MiniJson.write(serious));
        return json;
    }

    @Override public String buildResponseXml(Map<String, Object> ack, Document requestDoc, String freshTechnicalId) {
        Element reqRoot = requestDoc.getDocumentElement();
        Element reqHeader = XmlUtil.firstChild(reqRoot, "Header");
        Element reqBody = XmlUtil.firstChild(reqRoot, "Body");

        String workflowId = orDefault(MiniJson.asString(ack.get("workflowId")), XmlUtil.attr(reqHeader, "workflowId"));
        String businessCaseId = orDefault(MiniJson.asString(ack.get("businessCaseId")), XmlUtil.attr(reqBody, "businessCaseId"));
        String originatingAuthority = orDefault(MiniJson.asString(ack.get("originatingAuthority")), XmlUtil.attr(reqBody, "originatingAuthority"));
        String to = orDefault(MiniJson.asString(ack.get("to")), XmlUtil.attr(reqHeader, "from"));
        String sentAt = orDefault(MiniJson.asString(ack.get("sentAt")), SENT_AT_FORMAT.format(Instant.now()));

        StatusMapper.Mapped mapped = StatusMapper.map(StatusMapper.Kind.ACK,
                MiniJson.asString(ack.get("statusCode")), MiniJson.asString(ack.get("statusMessage")));

        StringBuilder xml = new StringBuilder();
        xml.append("<NotifyCheckResult_Acknowledgement xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\">\n");
        xml.append("  <Header version=\"3.5\" technicalId=\"").append(XmlUtil.escAttr(freshTechnicalId))
                .append("\" workflowId=\"").append(XmlUtil.escAttr(workflowId))
                .append("\" sentAt=\"").append(XmlUtil.escAttr(sentAt))
                .append("\" from=\"").append(XmlUtil.escAttr(memberStateCode))
                .append("\" to=\"").append(XmlUtil.escAttr(to)).append("\"/>\n");
        xml.append("  <Body businessCaseId=\"").append(XmlUtil.escAttr(businessCaseId))
                .append("\" originatingAuthority=\"").append(XmlUtil.escAttr(originatingAuthority))
                .append("\" respondingAuthority=\"").append(XmlUtil.escAttr(respondingAuthority))
                .append("\" acknowledgementType=\"NCRN_Ack\"")
                .append(" statusCode=\"").append(XmlUtil.escAttr(mapped.statusCode())).append("\"");
        if (mapped.statusMessage() != null && !mapped.statusMessage().isBlank()) {
            xml.append(" statusMessage=\"").append(XmlUtil.escAttr(mapped.statusMessage())).append("\"");
        }
        xml.append("/>\n");
        xml.append("</NotifyCheckResult_Acknowledgement>");
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

    private static String orDefault(String v, String fallback) {
        return (v == null || v.isBlank()) ? fallback : v;
    }
}
