import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * XML <-> JSON mapping for NotifyUnfitness (docker/erru-xml-adapter/README.md).
 *
 * The inbound direction (XML -> JSON) targets exactly the allowlist of
 * DSL/Ruuter.internal/ljvis/POST/erru/nu/inbound-request.yml. The outbound direction (JSON -> XML)
 * targets NotifyUnfitness_Acknowledgement.xsd / NotifyUnfitness_Types.xsd (nurMemberStateType).
 *
 * erru.nu_register_ack (DSL/Liquibase/changelog/20261117121000-erru-nu-exchange.sql) already
 * returns a fully-formed ack payload (technicalId/workflowId/from/to/businessCaseId/
 * originatingAuthority/memberStates) for the success path — this mapper mostly just re-shapes
 * that JSON into XML. The InvalidData/Heartbeat paths in inbound-request.yml return a much
 * flatter JSON (only acknowledgementType/statusCode/statusMessage); buildResponseXml() falls back
 * to the original request's Header/Body for the missing correlation fields in that case, since the
 * adapter — not Ruuter — owns generating the outbound message's own technicalId (see
 * docs/architecture/erru-async-xml.md §7: never reuse the inbound technicalId for the response).
 */
final class NuMapper implements MessageMapper {
    private static final DateTimeFormatter SENT_AT_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'").withZone(java.time.ZoneOffset.UTC);

    private final String respondingAuthority;
    private final String memberStateCode;

    NuMapper(String respondingAuthority, String memberStateCode) {
        this.respondingAuthority = respondingAuthority;
        this.memberStateCode = memberStateCode;
    }

    @Override public String requestRoot() { return "NotifyUnfitness_Request"; }
    @Override public String responseRoot() { return "NotifyUnfitness_Acknowledgement"; }
    @Override public String ruuterPath() { return "/ljvis/erru/nu/inbound-request"; }
    @Override public Duration ruuterTimeout() { return Duration.ofSeconds(20); }
    @Override public boolean requiresBusinessCompletion() { return true; }

    /** Recognised by acknowledgementType, not by a generic statusCode key. */
    @Override public boolean isAnswer(Map<String, Object> json) {
        return "NotifyUnfitness_Acknowledgement".equals(json.get("acknowledgementType"));
    }

    /**
     * Builds the JSON body for POST .../erru/nu/inbound-request from a validated NU request DOM.
     * `receivedAt` is erru.xml_inbox's immutable first-acceptance timestamp — not the XML's
     * Header/@sentAt (the Hub's clock) and not the processing time: NU's fallback
     * unfitStartDate is the day of first receipt, and a backlog, retry or midnight crossing must
     * not move it. May be null only defensively.
     */
    @Override public Map<String, Object> requestToJson(Document doc, Instant receivedAt) {
        Element root = doc.getDocumentElement();
        Element header = XmlUtil.firstChild(root, "Header");
        Element body = XmlUtil.firstChild(root, "Body");
        Element tm = XmlUtil.firstChild(body, "TransportManager");
        Element nameDetails = XmlUtil.firstChild(tm, "TransportManagerNameDetails");
        Element certDetails = XmlUtil.firstChild(tm, "TransportManagerCertificateDetails");

        Element innerTm;
        Element cert;
        if (nameDetails != null) {
            innerTm = XmlUtil.firstChild(nameDetails, "TransportManager");
            cert = XmlUtil.firstChild(nameDetails, "CertificateOfProfessionalCompetence");
        } else {
            innerTm = XmlUtil.firstChild(certDetails, "TransportManager");
            cert = XmlUtil.firstChild(certDetails, "CertificateOfProfessionalCompetence");
        }

        Map<String, Object> json = new LinkedHashMap<>();
        json.put("technicalId", XmlUtil.attr(header, "technicalId"));
        json.put("workflowId", XmlUtil.attr(header, "workflowId"));
        json.put("sentAt", XmlUtil.attr(header, "sentAt"));
        json.put("from", XmlUtil.attr(header, "from"));
        json.put("businessCaseId", XmlUtil.attr(body, "businessCaseId"));
        json.put("originatingAuthority", XmlUtil.attr(body, "originatingAuthority"));
        json.put("requestSource", XmlUtil.attr(body, "requestSource"));
        json.put("requestPurpose", XmlUtil.attr(body, "requestPurpose"));
        json.put("tmFirstName", XmlUtil.attr(innerTm, "firstName"));
        json.put("tmFamilyName", XmlUtil.attr(innerTm, "familyName"));
        json.put("tmDateOfBirth", XmlUtil.attr(innerTm, "dateOfBirth"));
        json.put("tmPlaceOfBirth", XmlUtil.attr(innerTm, "placeOfBirth"));
        json.put("tmFirstNameSearchKey", XmlUtil.attr(innerTm, "firstNameSearchKey"));
        json.put("tmFamilyNameSearchKey", XmlUtil.attr(innerTm, "familyNameSearchKey"));
        json.put("certificateNumber", XmlUtil.attr(cert, "certificateNumber"));
        json.put("certificateIssueDate", XmlUtil.attr(cert, "certificateIssueDate"));
        json.put("certificateIssueCountry", XmlUtil.attr(cert, "certificateIssueCountry"));
        json.put("unfitStartDate", XmlUtil.attr(tm, "unfitStartDate"));
        json.put("receivedAt", receivedAt == null ? "" : SENT_AT_FORMAT.format(receivedAt));
        return json;
    }

    /**
     * Builds the outbound NotifyUnfitness_Acknowledgement XML. `ack` is whatever Ruuter.internal
     * returned; `requestDoc` is the original validated request, used only as a fallback source
     * for correlation fields the flat error-path ack JSON doesn't carry.
     */
    @Override
    @SuppressWarnings("unchecked")
    public String buildResponseXml(Map<String, Object> ack, Document requestDoc, String freshTechnicalId) {
        Element reqRoot = requestDoc.getDocumentElement();
        Element reqHeader = XmlUtil.firstChild(reqRoot, "Header");
        Element reqBody = XmlUtil.firstChild(reqRoot, "Body");

        String workflowId = orDefault(MiniJson.asString(ack.get("workflowId")), XmlUtil.attr(reqHeader, "workflowId"));
        String businessCaseId = orDefault(MiniJson.asString(ack.get("businessCaseId")), XmlUtil.attr(reqBody, "businessCaseId"));
        String originatingAuthority = orDefault(MiniJson.asString(ack.get("originatingAuthority")), XmlUtil.attr(reqBody, "originatingAuthority"));
        String to = orDefault(MiniJson.asString(ack.get("to")), XmlUtil.attr(reqHeader, "from"));
        String sentAt = orDefault(MiniJson.asString(ack.get("sentAt")), SENT_AT_FORMAT.format(Instant.now()));

        List<Object> memberStates = (List<Object>) ack.get("memberStates");
        StringBuilder memberStatesXml = new StringBuilder();
        if (memberStates != null) {
            for (Object o : memberStates) {
                memberStatesXml.append(memberStateElement((Map<String, Object>) o));
            }
        } else {
            StatusMapper.Mapped mapped = StatusMapper.map(StatusMapper.Kind.ACK,
                    MiniJson.asString(ack.get("statusCode")), MiniJson.asString(ack.get("statusMessage")));
            Map<String, Object> single = new LinkedHashMap<>();
            single.put("memberStateCode", memberStateCode);
            single.put("respondingAuthority", respondingAuthority);
            single.put("statusCode", mapped.statusCode());
            single.put("statusMessage", mapped.statusMessage());
            memberStatesXml.append(memberStateElement(single));
        }

        StringBuilder xml = new StringBuilder();
        xml.append("<NotifyUnfitness_Acknowledgement xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\">\n");
        xml.append("  <Header version=\"3.5\" technicalId=\"").append(XmlUtil.escAttr(freshTechnicalId))
                .append("\" workflowId=\"").append(XmlUtil.escAttr(workflowId))
                .append("\" sentAt=\"").append(XmlUtil.escAttr(sentAt))
                .append("\" from=\"").append(XmlUtil.escAttr(memberStateCode))
                .append("\" to=\"").append(XmlUtil.escAttr(to)).append("\"/>\n");
        xml.append("  <Body businessCaseId=\"").append(XmlUtil.escAttr(businessCaseId))
                .append("\" originatingAuthority=\"").append(XmlUtil.escAttr(originatingAuthority)).append("\">\n");
        xml.append(memberStatesXml);
        xml.append("  </Body>\n");
        xml.append("</NotifyUnfitness_Acknowledgement>");
        return xml.toString();
    }

    private String memberStateElement(Map<String, Object> m) {
        String statusMessage = MiniJson.asString(m.get("statusMessage"));
        StringBuilder sb = new StringBuilder();
        sb.append("    <MemberState memberStateCode=\"").append(XmlUtil.escAttr(MiniJson.asString(m.get("memberStateCode"))))
                .append("\" respondingAuthority=\"").append(XmlUtil.escAttr(MiniJson.asString(m.get("respondingAuthority"))))
                .append("\" statusCode=\"").append(XmlUtil.escAttr(MiniJson.asString(m.get("statusCode")))).append("\"");
        // globalStatusMessageType has minLength="1" — omit, never emit statusMessage="".
        if (statusMessage != null && !statusMessage.isBlank()) {
            sb.append(" statusMessage=\"").append(XmlUtil.escAttr(statusMessage)).append("\"");
        }
        sb.append("/>\n");
        return sb.toString();
    }

    static String freshTechnicalId() {
        return UUID.randomUUID().toString();
    }

    private static String orDefault(String v, String fallback) {
        return (v == null || v.isBlank()) ? fallback : v;
    }
}
