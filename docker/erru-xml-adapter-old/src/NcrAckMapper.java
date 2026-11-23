import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * A NotifyCheckResult_Acknowledgement answers either our request (NCRN_Ack) or the response we sent
 * (NCRR_Ack). It never produces a reply.
 */
final class NcrAckMapper implements MessageMapper {
    @Override public String requestRoot() { return "NotifyCheckResult_Acknowledgement"; }
    @Override public String responseRoot() { return "NotifyCheckResult_Acknowledgement"; }
    @Override public String ruuterPath() { return "/ljvis/erru/ncr/inbound-ack"; }
    @Override public Duration ruuterTimeout() { return Duration.ofSeconds(20); }
    @Override public boolean oneWay() { return true; }

    @Override public Map<String, Object> requestToJson(Document doc, Instant receivedAt) {
        Element header = XmlUtil.firstChild(doc.getDocumentElement(), "Header");
        Element body = XmlUtil.firstChild(doc.getDocumentElement(), "Body");
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("workflowId", XmlUtil.attr(header, "workflowId"));
        json.put("businessCaseId", XmlUtil.attr(body, "businessCaseId"));
        json.put("acknowledgementType", XmlUtil.attr(body, "acknowledgementType"));
        json.put("statusCode", XmlUtil.attr(body, "statusCode"));
        json.put("statusMessage", XmlUtil.attr(body, "statusMessage"));
        return json;
    }

    @Override public boolean isAnswer(Map<String, Object> json) { return OneWayAnswers.isAnswer(json); }

    @Override public String buildResponseXml(Map<String, Object> json, Document doc, String id) {
        throw new UnsupportedOperationException("NCR acknowledgements do not require another response");
    }
}
