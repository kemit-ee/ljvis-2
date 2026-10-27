import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** A NotifyUnfitness_Acknowledgement completes (or extends) our outgoing NU. It never produces a reply. */
final class NuAckMapper implements MessageMapper {
    @Override public String requestRoot() { return "NotifyUnfitness_Acknowledgement"; }
    @Override public String responseRoot() { return "NotifyUnfitness_Acknowledgement"; }
    @Override public String ruuterPath() { return "/ljvis/erru/nu/inbound-ack"; }
    @Override public Duration ruuterTimeout() { return Duration.ofSeconds(20); }
    @Override public boolean oneWay() { return true; }

    @Override public Map<String, Object> requestToJson(Document doc, Instant receivedAt) {
        Element header = XmlUtil.firstChild(doc.getDocumentElement(), "Header");
        Element body = XmlUtil.firstChild(doc.getDocumentElement(), "Body");
        List<Object> states = new ArrayList<>();
        for (Element state : XmlUtil.children(body, "MemberState"))
            states.add(XmlUtil.attrs(state, "memberStateCode", "respondingAuthority", "statusCode", "statusMessage"));
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("workflowId", XmlUtil.attr(header, "workflowId"));
        json.put("technicalId", XmlUtil.attr(header, "technicalId"));
        json.put("from", XmlUtil.attr(header, "from"));
        json.put("businessCaseId", XmlUtil.attr(body, "businessCaseId"));
        json.put("memberStates", MiniJson.write(states));
        return json;
    }

    @Override public boolean isAnswer(Map<String, Object> json) { return OneWayAnswers.isAnswer(json); }

    @Override public String buildResponseXml(Map<String, Object> json, Document doc, String id) {
        throw new UnsupportedOperationException("NU acknowledgements do not require another response");
    }
}
