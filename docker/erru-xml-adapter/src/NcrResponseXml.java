import java.util.List;
import java.util.Map;

/**
 * Outgoing NotifyCheckResult_Response (our answer to an incoming NCR) to ERRU 3.5 XML. The
 * TransportUndertaking block is optional in the XSD but all of its attributes are required once
 * present, so it is written only when the register data is complete.
 */
final class NcrResponseXml {
    private NcrResponseXml() { }

    static String build(Map<String, Object> dto, String memberState) {
        StringBuilder x = XmlBuild.open("NotifyCheckResult_Response", dto, memberState, XmlBuild.required(dto, "ncrTo"));
        x.append("<Body");
        for (String key : List.of("businessCaseId", "originatingAuthority", "respondingAuthority", "statusCode"))
            XmlBuild.attr(x, key, XmlBuild.required(dto, key));
        XmlBuild.optional(x, "statusMessage", dto.get("statusMessage"));
        x.append('>');
        if (XmlBuild.has(dto, "transportUndertakingName")) {
            x.append("<TransportUndertaking");
            XmlBuild.attr(x, "transportUndertakingName", dto.get("transportUndertakingName").toString());
            XmlBuild.attr(x, "numberOfVehicles", MiniJson.asIntString(requiredValue(dto, "numberOfVehicles"), 0));
            XmlBuild.attr(x, "communityLicenceNumber", XmlBuild.required(dto, "communityLicenceNumber"));
            XmlBuild.attr(x, "communityLicenceStatus", XmlBuild.required(dto, "communityLicenceStatus"));
            Map<String, Object> address = XmlBuild.object(requiredValue(dto, "address"));
            x.append("><TransportUndertakingAddress");
            for (String key : List.of("address", "postCode", "city", "country")) XmlBuild.attr(x, key, XmlBuild.required(address, key));
            x.append("/></TransportUndertaking>");
        }
        List<?> penalties = XmlBuild.array(dto.get("penaltiesImposed"));
        if (!penalties.isEmpty()) {
            x.append("<PenaltiesImposed>");
            for (Object value : penalties) {
                Map<String, Object> p = XmlBuild.object(value);
                x.append("<PenaltyImposed");
                XmlBuild.attr(x, "penaltyRequestedIdentifier", NcrRequestXml.integer(p, "penaltyRequestedIdentifier"));
                XmlBuild.attr(x, "authorityImposingPenalty", XmlBuild.required(p, "authorityImposingPenalty"));
                XmlBuild.attr(x, "isImposed", XmlBuild.bool(p.get("isImposed")));
                XmlBuild.attr(x, "penaltyTypeImposed", XmlBuild.required(p, "penaltyTypeImposed"));
                NcrRequestXml.optionalDate(x, "startDate", p);
                NcrRequestXml.optionalDate(x, "endDate", p);
                XmlBuild.optional(x, "reason", p.get("reason"));
                x.append("/>");
            }
            x.append("</PenaltiesImposed>");
        }
        return x.append("</Body></NotifyCheckResult_Response>").toString();
    }

    private static Object requiredValue(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null || v.toString().isBlank()) throw new IllegalArgumentException("Missing " + key);
        return v;
    }
}
