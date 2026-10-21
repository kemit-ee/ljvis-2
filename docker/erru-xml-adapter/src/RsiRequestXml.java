import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Outgoing RSI DTO to ERRU 3.5 XML. Missing business data is never invented. */
final class RsiRequestXml {
    private RsiRequestXml() { }

    static String build(Map<String, Object> dto, String memberState) {
        UUID.fromString(required(dto, "technicalId"));
        UUID.fromString(required(dto, "workflowId"));
        StringBuilder x = new StringBuilder("<RoadSideInspection_Request xmlns=\"https://webgate.ec.testa.eu/move-hub/erru/3.5\">");
        x.append("<Header");
        attr(x, "version", "3.5");
        attr(x, "technicalId", required(dto, "technicalId"));
        attr(x, "workflowId", required(dto, "workflowId"));
        attr(x, "sentAt", utc(required(dto, "sentAt")));
        attr(x, "from", memberState);
        attr(x, "to", required(dto, "rsiTo"));
        x.append("/><Body");
        for (String key : List.of("businessCaseId", "originatingAuthority", "requestSource", "requestPurpose"))
            attr(x, key, required(dto, key));
        x.append("><InspectionDetails");
        optional(x, "inspectionIdentifier", dto.get("inspectionIdentifier"));
        attr(x, "inspectionLocation", required(dto, "inspectionLocation"));
        attr(x, "inspectionDateTime", utc(required(dto, "inspectionDatetime")));
        attr(x, "inspectionAuthorityOrName", required(dto, "inspectionAuthorityOrName"));
        x.append("><InspectionResult");
        for (String key : List.of("inspectionPassed", "ptiRequested", "vehicleProhibitionOrRestriction"))
            attr(x, key, bool(dto.get(key)));
        x.append("/></InspectionDetails><IdentificationDetails><VehicleDetails");
        for (String key : List.of("vehicleRegistrationNumber", "vehicleRegistrationCountry", "vehicleIdentificationNumber", "vehicleCategory"))
            attr(x, key, required(dto, key));
        required(dto, "odometerReading");
        attr(x, "odometerReading", MiniJson.asIntString(dto.get("odometerReading"), 0));
        x.append("/><DriverDetails");
        attr(x, "firstName", required(dto, "driverFirstName"));
        attr(x, "familyName", required(dto, "driverFamilyName"));
        optional(x, "drivingLicenceNumber", dto.get("driverLicenceNumber"));
        optional(x, "drivingLicenceCountry", dto.get("driverLicenceCountry"));
        x.append("/>");
        Map<String, Object> id = object(dto.get("identificationDetails"));
        String kind = required(id, "isVehicleHolder");
        if (kind.equals("transport_undertaking")) {
            x.append("<TransportUndertakingDetails");
            attr(x, "transportUndertakingName", required(id, "transportUndertakingName"));
            attr(x, "communityLicenceNumber", required(id, "communityLicenceNumber"));
            x.append("><TransportUndertakingAddress");
            address(x, object(id.get("address")));
            x.append("/></TransportUndertakingDetails>");
        } else if (kind.equals("owner")) {
            x.append("<HolderDetails");
            optional(x, "registrationCertificate", id.get("registrationCertificate"));
            String person = required(id, "isNaturalPerson");
            if (person.equals("company")) {
                x.append("><Company");
                attr(x, "companyName", required(id, "companyName"));
            } else if (person.equals("natural_person")) {
                x.append("><NaturalPerson");
                attr(x, "firstName", required(id, "firstName"));
                attr(x, "familyName", required(id, "familyName"));
            } else throw new IllegalArgumentException("Invalid holder type");
            address(x, object(id.get("address")));
            x.append("/></HolderDetails>");
        } else throw new IllegalArgumentException("Invalid identificationDetails choice");
        x.append("</IdentificationDetails><CheckedItems>");
        for (Object value : array(dto.get("checkedItems"))) {
            Map<String, Object> item = object(value);
            x.append("<CheckedItem");
            required(item, "itemType");
            attr(x, "itemType", MiniJson.asIntString(item.get("itemType"), 0));
            String failed = bool(item.get("itemFailed"));
            attr(x, "itemFailed", failed);
            x.append(">");
            List<?> failures = item.get("failedChecks") == null ? List.of() : array(item.get("failedChecks"));
            if (failed.equals("true") != !failures.isEmpty())
                throw new IllegalArgumentException("Failed items require failedChecks; passed items must not contain failedChecks");
            if (!failures.isEmpty()) {
                x.append("<FailedChecks>");
                for (Object f : failures) {
                    Map<String, Object> failure = object(f);
                    x.append("<FailedCheck");
                    attr(x, "failedReason", required(failure, "failedReason"));
                    attr(x, "failedAssessment", required(failure, "failedAssessment"));
                    if (failure.get("isRectified") != null) attr(x, "isRectified", bool(failure.get("isRectified")));
                    x.append("/>");
                }
                x.append("</FailedChecks>");
            }
            x.append("</CheckedItem>");
        }
        return x.append("</CheckedItems></Body></RoadSideInspection_Request>").toString();
    }

    private static String utc(String value) {
        return OffsetDateTime.parse(value.replace(' ', 'T')).withOffsetSameInstant(ZoneOffset.UTC)
                .format(DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss'Z'"));
    }
    private static String bool(Object value) {
        String s = MiniJson.asString(value);
        if ("true".equals(s) || "1".equals(s)) return "true";
        if ("false".equals(s) || "0".equals(s)) return "false";
        throw new IllegalArgumentException("Expected an explicit boolean");
    }
    private static void address(StringBuilder x, Map<String, Object> a) {
        for (String key : List.of("address", "postCode", "city", "country")) attr(x, key, required(a, key));
    }
    static String required(Map<String, Object> map, String key) {
        String s = MiniJson.asString(map.get(key));
        if (s == null || s.isBlank()) throw new IllegalArgumentException("Missing " + key);
        return s;
    }
    private static void attr(StringBuilder x, String key, String value) {
        x.append(' ').append(key).append("=\"").append(XmlUtil.escAttr(value)).append('"');
    }
    private static void optional(StringBuilder x, String key, Object value) {
        if (value != null && !value.toString().isBlank()) attr(x, key, value.toString());
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
