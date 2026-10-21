import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

import java.util.Set;

/** Protocol constraints which the ERRU XSDs cannot express. */
final class ResponseValidator {
    private static final String NS = "https://webgate.ec.testa.eu/move-hub/erru/3.5";
    private static final Set<String> ROOTS = Set.of("CheckGoodRepute_Response", "CheckTransportUndertakingData_Response",
            "RoadSideInspection_Response", "NotifyCheckResult_Acknowledgement", "NotifyUnfitness_Acknowledgement", "ErrorNotification");

    private ResponseValidator() { }

    static void validate(Document doc) {
        Element root = doc.getDocumentElement();
        require(NS.equals(root.getNamespaceURI()) && ROOTS.contains(root.getLocalName()), "Unexpected response QName");
        if ("ErrorNotification".equals(root.getLocalName())) return;
        String from = XmlUtil.attr(XmlUtil.firstChild(root, "Header"), "from");
        var elements = root.getElementsByTagNameNS(NS, "*");
        for (int i = 0; i < elements.getLength(); i++) {
            Element el = (Element) elements.item(i);
            String status = el.getAttribute("statusCode");
            require(!Set.of("NotAvailable", "Timeout").contains(status), "Hub-reserved status in member-state answer");
            if ("MemberState".equals(el.getLocalName())) {
                require(from.equals(el.getAttribute("memberStateCode")), "MemberState differs from Header/from");
                if ("CheckGoodRepute_Response".equals(root.getLocalName())) checkFound(el, "TransportManagerDetails");
            }
            if ("Fitness".equals(el.getLocalName()) && "Unfit".equals(el.getAttribute("fitnessStatus"))) {
                require(!el.getAttribute("unfitEndDate").isBlank(), "Unfit requires unfitEndDate");
            }
            // Do not infer a CGR totals rule from the ambiguous CTUD rule in §6.4.
            // Registry aggregates may cover more undertakings than the returned list.
        }
        if ("CheckTransportUndertakingData_Response".equals(root.getLocalName())) {
            checkFound(XmlUtil.firstChild(root, "Body"), "TransportUndertaking");
        }
    }

    static void validateCorrelation(Document request, Document response, String memberState) {
        Element reqRoot = request.getDocumentElement();
        Element resRoot = response.getDocumentElement();
        Element reqHeader = XmlUtil.firstChild(reqRoot, "Header");
        Element resHeader = XmlUtil.firstChild(resRoot, "Header");
        Element reqBody = XmlUtil.firstChild(reqRoot, "Body");
        Element resBody = XmlUtil.firstChild(resRoot, "Body");
        require(reqHeader.getAttribute("workflowId").equals(resHeader.getAttribute("workflowId")), "Workflow mismatch");
        require(memberState.equals(resHeader.getAttribute("from")), "Sender mismatch");
        require(reqHeader.getAttribute("from").equals(resHeader.getAttribute("to")), "Recipient mismatch");
        require(reqBody.getAttribute("businessCaseId").equals(resBody.getAttribute("businessCaseId")), "Business case mismatch");
        if (resBody.hasAttribute("originatingAuthority")) {
            require(reqBody.getAttribute("originatingAuthority").equals(resBody.getAttribute("originatingAuthority")), "Originating authority mismatch");
        }
        for (String name : new String[]{"SearchedTransportManager", "SearchedCompany"}) {
            Element criteria = XmlUtil.firstChild(reqBody, name);
            if (criteria != null) require(sameElement(criteria, XmlUtil.firstChild(resBody, name)), "Search criteria mismatch");
        }
    }

    private static void checkFound(Element parent, String recordName) {
        boolean records = !XmlUtil.children(parent, recordName).isEmpty();
        require("Found".equals(parent.getAttribute("statusCode")) == records, "Found status and records disagree");
    }

    private static boolean sameElement(Element a, Element b) {
        if (b == null || !a.getLocalName().equals(b.getLocalName()) || !a.getNamespaceURI().equals(b.getNamespaceURI())) return false;
        for (Element source : new Element[]{a, b}) {
            Element target = source == a ? b : a;
            var attrs = source.getAttributes();
            for (int i = 0; i < attrs.getLength(); i++) {
                Node attr = attrs.item(i);
                if ("http://www.w3.org/2000/xmlns/".equals(attr.getNamespaceURI())) continue;
                if (!attr.getNodeValue().equals(target.getAttributeNS(attr.getNamespaceURI(), attr.getLocalName()))) return false;
            }
        }
        var ac = childElements(a);
        var bc = childElements(b);
        if (ac.size() != bc.size()) return false;
        for (int i = 0; i < ac.size(); i++) if (!sameElement(ac.get(i), bc.get(i))) return false;
        return true;
    }

    private static java.util.List<Element> childElements(Element parent) {
        var result = new java.util.ArrayList<Element>();
        for (Node node = parent.getFirstChild(); node != null; node = node.getNextSibling()) {
            if (node instanceof Element element) result.add(element);
        }
        return result;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalArgumentException(message);
    }
}
