import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Outgoing RSI DTO to ERRU 3.5 XML. Missing business data is never invented. */
final class RsiRequestXml {
    private RsiRequestXml() { }

    static String build(Map<String, Object> dto, String memberState) {
        UUID.fromString(XmlBuild.required(dto, "technicalId"));
        UUID.fromString(XmlBuild.required(dto, "workflowId"));
        StringBuilder x = new StringBuilder("<RoadSideInspection_Request xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\">");
        x.append("<Header");
        XmlBuild.attr(x, "version", "3.5");
        XmlBuild.attr(x, "technicalId", XmlBuild.required(dto, "technicalId"));
        XmlBuild.attr(x, "workflowId", XmlBuild.required(dto, "workflowId"));
        XmlBuild.attr(x, "sentAt", XmlBuild.utc(XmlBuild.required(dto, "sentAt")));
        XmlBuild.attr(x, "from", memberState);
        XmlBuild.attr(x, "to", XmlBuild.required(dto, "rsiTo"));
        x.append("/><Body");
        for (String key : List.of("businessCaseId", "originatingAuthority", "requestSource", "requestPurpose"))
            XmlBuild.attr(x, key, XmlBuild.required(dto, key));
        x.append("><InspectionDetails");
        XmlBuild.optional(x, "inspectionIdentifier", dto.get("inspectionIdentifier"));
        XmlBuild.attr(x, "inspectionLocation", XmlBuild.required(dto, "inspectionLocation"));
        XmlBuild.attr(x, "inspectionDateTime", XmlBuild.utc(XmlBuild.required(dto, "inspectionDatetime")));
        XmlBuild.attr(x, "inspectionAuthorityOrName", XmlBuild.required(dto, "inspectionAuthorityOrName"));
        x.append("><InspectionResult");
        for (String key : List.of("inspectionPassed", "ptiRequested", "vehicleProhibitionOrRestriction"))
            XmlBuild.attr(x, key, bool(dto.get(key)));
        x.append("/></InspectionDetails><IdentificationDetails><VehicleDetails");
        for (String key : List.of("vehicleRegistrationNumber", "vehicleRegistrationCountry", "vehicleIdentificationNumber", "vehicleCategory"))
            XmlBuild.attr(x, key, XmlBuild.required(dto, key));
        XmlBuild.required(dto, "odometerReading");
        XmlBuild.attr(x, "odometerReading", MiniJson.asIntString(dto.get("odometerReading"), 0));
        x.append("/><DriverDetails");
        XmlBuild.attr(x, "firstName", XmlBuild.required(dto, "driverFirstName"));
        XmlBuild.attr(x, "familyName", XmlBuild.required(dto, "driverFamilyName"));
        XmlBuild.optional(x, "drivingLicenceNumber", dto.get("driverLicenceNumber"));
        XmlBuild.optional(x, "drivingLicenceCountry", dto.get("driverLicenceCountry"));
        x.append("/>");
        Map<String, Object> id = object(dto.get("identificationDetails"));
        String kind = XmlBuild.required(id, "isVehicleHolder");
        if (kind.equals("transport_undertaking")) {
            x.append("<TransportUndertakingDetails");
            XmlBuild.attr(x, "transportUndertakingName", XmlBuild.required(id, "transportUndertakingName"));
            XmlBuild.attr(x, "communityLicenceNumber", XmlBuild.required(id, "communityLicenceNumber"));
            x.append("><TransportUndertakingAddress");
            address(x, object(id.get("address")));
            x.append("/></TransportUndertakingDetails>");
        } else if (kind.equals("owner")) {
            x.append("<HolderDetails");
            XmlBuild.optional(x, "registrationCertificate", id.get("registrationCertificate"));
            String person = XmlBuild.required(id, "isNaturalPerson");
            if (person.equals("company")) {
                x.append("><Company");
                XmlBuild.attr(x, "companyName", XmlBuild.required(id, "companyName"));
            } else if (person.equals("natural_person")) {
                x.append("><NaturalPerson");
                XmlBuild.attr(x, "firstName", XmlBuild.required(id, "firstName"));
                XmlBuild.attr(x, "familyName", XmlBuild.required(id, "familyName"));
            } else throw new IllegalArgumentException("Invalid holder type");
            address(x, object(id.get("address")));
            x.append("/></HolderDetails>");
        } else throw new IllegalArgumentException("Invalid identificationDetails choice");
        x.append("</IdentificationDetails><CheckedItems>");
        for (Object value : array(dto.get("checkedItems"))) {
            Map<String, Object> item = object(value);
            x.append("<CheckedItem");
            XmlBuild.required(item, "itemType");
            XmlBuild.attr(x, "itemType", MiniJson.asIntString(item.get("itemType"), 0));
            String failed = bool(item.get("itemFailed"));
            XmlBuild.attr(x, "itemFailed", failed);
            x.append(">");
            List<?> failures = item.get("failedChecks") == null ? List.of() : array(item.get("failedChecks"));
            if (failed.equals("true") != !failures.isEmpty())
                throw new IllegalArgumentException("Failed items require failedChecks; passed items must not contain failedChecks");
            if (!failures.isEmpty()) {
                x.append("<FailedChecks>");
                for (Object f : failures) {
                    Map<String, Object> failure = object(f);
                    x.append("<FailedCheck");
                    XmlBuild.attr(x, "failedReason", XmlBuild.required(failure, "failedReason"));
                    XmlBuild.attr(x, "failedAssessment", XmlBuild.required(failure, "failedAssessment"));
                    if (failure.get("isRectified") != null) XmlBuild.attr(x, "isRectified", bool(failure.get("isRectified")));
                    x.append("/>");
                }
                x.append("</FailedChecks>");
            }
            x.append("</CheckedItem>");
        }
        return x.append("</CheckedItems></Body></RoadSideInspection_Request>").toString();
    }

    private static String bool(Object value) {
        String s = MiniJson.asString(value);
        if ("true".equals(s) || "1".equals(s)) return "true";
        if ("false".equals(s) || "0".equals(s)) return "false";
        throw new IllegalArgumentException("Expected an explicit boolean");
    }
    private static void address(StringBuilder x, Map<String, Object> a) {
        for (String key : List.of("address", "postCode", "city", "country")) XmlBuild.attr(x, key, XmlBuild.required(a, key));
    }
    @SuppressWarnings("unchecked")
    private static Map<String, Object> object(Object value) {
        if (value instanceof String s) return MiniJson.parseObject(s);
        if (value instanceof Map<?, ?>) return (Map<String, Object>) value;
        throw new IllegalArgumentException("Expected a JSON object");
    }
    private static List<?> array(Object value) {
        if (value instanceof String s) value = MiniJson.parseObject("{\"items\":" + s + "}").get("items");
        if (value instanceof List<?> list) return list;
        throw new IllegalArgumentException("Expected a JSON array");
    }
}
