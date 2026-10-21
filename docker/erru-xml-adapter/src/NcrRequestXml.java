import java.util.List;
import java.util.Map;

/** Outgoing NotifyCheckResult DTO to ERRU 3.5 XML. Missing business data is never invented. */
final class NcrRequestXml {
    private NcrRequestXml() { }

    static String build(Map<String, Object> dto, String memberState) {
        StringBuilder x = XmlBuild.open("NotifyCheckResult_Request", dto, memberState, XmlBuild.required(dto, "ncrTo"));
        XmlBuild.body(x, dto);
        x.append("<TransportUndertaking");
        XmlBuild.attr(x, "transportUndertakingName", XmlBuild.required(dto, "transportUndertakingName"));
        XmlBuild.attr(x, "communityLicenceNumber", XmlBuild.required(dto, "communityLicenceNumber"));
        x.append("><Vehicle");
        XmlBuild.attr(x, "vehicleRegistrationNumber", XmlBuild.required(dto, "vehicleRegistrationNumber"));
        XmlBuild.attr(x, "vehicleRegistrationCountry", XmlBuild.required(dto, "vehicleRegistrationCountry"));
        x.append("/><CheckSummary");
        XmlBuild.attr(x, "checkResult", XmlBuild.required(dto, "checkResult"));
        String checked = XmlBuild.date(dto.get("checkDate"));
        if (checked == null) throw new IllegalArgumentException("Missing checkDate");
        XmlBuild.attr(x, "dateOfCheck", checked);
        x.append("/>");
        if (XmlBuild.has(dto, "minorInfringement")) {
            Map<String, Object> minor = XmlBuild.object(dto.get("minorInfringement"));
            x.append("<MinorInfringement");
            XmlBuild.attr(x, "dateOfInfringement", dateOf(minor, "dateOfInfringement"));
            XmlBuild.attr(x, "numberOfInfringements", integer(minor, "numberOfInfringements"));
            x.append("/>");
        }
        for (Object value : XmlBuild.array(dto.get("seriousInfringements"))) {
            Map<String, Object> si = XmlBuild.object(value);
            x.append("<SeriousInfringement");
            XmlBuild.attr(x, "dateOfInfringement", dateOf(si, "dateOfInfringement"));
            XmlBuild.attr(x, "category", XmlBuild.required(si, "category"));
            XmlBuild.attr(x, "infringementType", XmlBuild.required(si, "infringementType"));
            XmlBuild.attr(x, "appealPossible", XmlBuild.bool(si.get("appealPossible")));
            x.append("><PenaltiesImposed>");
            List<?> imposed = XmlBuild.array(si.get("penaltiesImposed"));
            if (imposed.isEmpty()) throw new IllegalArgumentException("A serious infringement needs at least one imposed penalty");
            for (Object p : imposed) {
                Map<String, Object> penalty = XmlBuild.object(p);
                x.append("<PenaltyImposed");
                XmlBuild.attr(x, "penaltyImposedIdentifier", integer(penalty, "penaltyImposedIdentifier"));
                XmlBuild.attr(x, "finalDecisionDate", dateOf(penalty, "finalDecisionDate"));
                XmlBuild.attr(x, "penaltyTypeImposed", XmlBuild.required(penalty, "penaltyTypeImposed"));
                optionalDate(x, "startDate", penalty);
                optionalDate(x, "endDate", penalty);
                XmlBuild.attr(x, "isExecuted", XmlBuild.required(penalty, "isExecuted"));
                XmlBuild.optional(x, "notExecutedReason", penalty.get("notExecutedReason"));
                x.append("/>");
            }
            x.append("</PenaltiesImposed>");
            List<?> requested = XmlBuild.array(si.get("penaltiesRequested"));
            if (!requested.isEmpty()) {
                x.append("<PenaltiesRequested>");
                for (Object p : requested) {
                    Map<String, Object> penalty = XmlBuild.object(p);
                    x.append("<PenaltyRequested");
                    XmlBuild.attr(x, "penaltyRequestedIdentifier", integer(penalty, "penaltyRequestedIdentifier"));
                    XmlBuild.attr(x, "penaltyTypeRequested", XmlBuild.required(penalty, "penaltyTypeRequested"));
                    if (XmlBuild.has(penalty, "duration")) XmlBuild.attr(x, "duration", integer(penalty, "duration"));
                    x.append("/>");
                }
                x.append("</PenaltiesRequested>");
            }
            x.append("</SeriousInfringement>");
        }
        return x.append("</TransportUndertaking></Body></NotifyCheckResult_Request>").toString();
    }

    static String integer(Map<String, Object> map, String key) {
        XmlBuild.required(map, key);
        return MiniJson.asIntString(map.get(key), 0);
    }

    static String dateOf(Map<String, Object> map, String key) {
        String d = XmlBuild.date(map.get(key));
        if (d == null) throw new IllegalArgumentException("Missing " + key);
        return d;
    }

    static void optionalDate(StringBuilder x, String key, Map<String, Object> map) {
        String d = XmlBuild.date(map.get(key));
        if (d != null) XmlBuild.attr(x, key, d);
    }
}
