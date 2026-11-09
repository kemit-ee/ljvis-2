import org.w3c.dom.Document;
import java.time.Instant;
import java.time.Duration;
import java.util.Map;

/** A response completes our outgoing workflow. It must not produce a response to a response. */
final class RsiResponseMapper implements MessageMapper {
    @Override public String requestRoot() { return "RoadSideInspection_Response"; }
    @Override public String responseRoot() { return "RoadSideInspection_Response"; }
    @Override public String ruuterPath() { return "/ljvis/erru/rsi/inbound-response"; }
    @Override public Duration ruuterTimeout() { return Duration.ofSeconds(20); }
    @Override public boolean oneWay() { return true; }
    @Override public Map<String, Object> requestToJson(Document doc, Instant receivedAt) {
        var header = XmlUtil.firstChild(doc.getDocumentElement(), "Header");
        var body = XmlUtil.firstChild(doc.getDocumentElement(), "Body");
        return Map.of("workflowId", XmlUtil.attr(header, "workflowId"),
                "responseStatusCode", XmlUtil.attr(body, "statusCode"),
                "responseStatusMessage", XmlUtil.attr(body, "statusMessage"));
    }
    @Override public boolean isAnswer(Map<String, Object> json) {
        return "responded".equals(json.get("status")) || "already_responded".equals(json.get("status"));
    }
    @Override public String buildResponseXml(Map<String, Object> json, Document doc, String id) {
        throw new UnsupportedOperationException("RSI responses do not require another response");
    }
}
