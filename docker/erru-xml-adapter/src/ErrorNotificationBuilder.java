import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Set;

/**
 * Builds an {@code ErrorNotification} (ErrorNotification.xsd) — the ERRU 3.5 protocol's actual
 * answer for "we cannot give you a real business answer", per ERRU XML Message Reference 2.06
 * §6.2 p.26/§6.4 p.29/§7.7 p.83-87. One implementation for all 5 request types: EN's shape does
 * not depend on the original message type at all (just its Header/@workflowId, Body/@businessCaseId
 * and the raw bytes for {@code OriginalMessage}), unlike a business answer.
 *
 * Replaces the earlier per-type `MessageMapper#buildFallbackXml`, which built a synthetic
 * "NotAvailable" business answer — a protocol violation (`NotAvailable` is reserved for the Hub,
 * see {@link StatusMapper}), not a legitimate degraded response.
 */
final class ErrorNotificationBuilder {
    private static final DateTimeFormatter SENT_AT_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'").withZone(java.time.ZoneOffset.UTC);

    /** errorStatusCodeType (ErrorNotification_Types.xsd) — the full set EN itself allows. */
    static final Set<String> VALID_ERROR_STATUS_CODES = Set.of(
            "InvalidFormat", "InvalidData", "Timeout", "ServerError", "Other",
            "ResponseNotCorrelated", "DuplicateRequest", "DuplicateResponse");

    private final String memberStateCode;

    ErrorNotificationBuilder(String memberStateCode) {
        this.memberStateCode = memberStateCode;
    }

    /**
     * @param statusCode one of {@link #VALID_ERROR_STATUS_CODES} — the caller decides which
     *                    (e.g. a flow's business rejection maps to "InvalidData", an
     *                    unreachable/misbehaving Ruuter or a mapper bug maps to "ServerError").
     * @param statusMessage a short, already-safe-for-the-wire explanation (no stack traces, SQL,
     *                      or internal hostnames — see ProcessingWorker's message sanitisation).
     * @param requestDoc the original, already-validated request — source of workflowId/businessCaseId.
     * @param rawXml the exact bytes originally received, echoed verbatim as {@code OriginalMessage}.
     */
    String build(String statusCode, String statusMessage, Document requestDoc, String rawXml, String freshTechnicalId) {
        if (!VALID_ERROR_STATUS_CODES.contains(statusCode)) {
            throw new IllegalArgumentException("not a valid errorStatusCodeType value: " + statusCode);
        }
        Element reqHeader = XmlUtil.firstChild(requestDoc.getDocumentElement(), "Header");
        Element reqBody = XmlUtil.firstChild(requestDoc.getDocumentElement(), "Body");
        String workflowId = XmlUtil.attr(reqHeader, "workflowId");
        String businessCaseId = XmlUtil.attr(reqBody, "businessCaseId");
        String sentAt = SENT_AT_FORMAT.format(Instant.now());

        StringBuilder xml = new StringBuilder();
        xml.append("<ErrorNotification xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\">\n");
        xml.append("  <Header version=\"3.5\" technicalId=\"").append(XmlUtil.escAttr(freshTechnicalId))
                .append("\" workflowId=\"").append(XmlUtil.escAttr(workflowId))
                .append("\" sentAt=\"").append(XmlUtil.escAttr(sentAt))
                // EN is addressed to the Hub itself, not back to the original sender — "EU", per
                // Global_Types.xsd's own @to documentation ("for EN messages being sent to the
                // hub it will contain 'EU'"), not the originating member state.
                .append("\" from=\"").append(XmlUtil.escAttr(memberStateCode))
                .append("\" to=\"EU\"/>\n");
        xml.append("  <Body businessCaseId=\"").append(XmlUtil.escAttr(businessCaseId))
                .append("\" statusCode=\"").append(XmlUtil.escAttr(statusCode)).append("\"");
        if (statusMessage != null && !statusMessage.isBlank()) {
            xml.append(" statusMessage=\"").append(XmlUtil.escAttr(statusMessage)).append("\"");
        }
        xml.append(">\n");
        xml.append("    <OriginalMessage>").append(escText(rawXml)).append("</OriginalMessage>\n");
        xml.append("  </Body>\n");
        xml.append("</ErrorNotification>");
        return xml.toString();
    }

    /** Escapes text NODE content (not an attribute) — &, < and > only; XmlUtil.escAttr also escapes quotes, which is harmless but not required here. */
    private static String escText(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
