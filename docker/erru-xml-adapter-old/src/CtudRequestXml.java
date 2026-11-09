import java.util.Map;

/**
 * Outgoing CheckTransportUndertakingData DTO to ERRU 3.5 XML. SearchedCompany carries exactly one
 * of three search variants; at least two of name, licence number and vehicle must be supplied.
 */
final class CtudRequestXml {
    private CtudRequestXml() { }

    static String build(Map<String, Object> dto, String memberState) {
        StringBuilder x = XmlBuild.open("CheckTransportUndertakingData_Request", dto, memberState, XmlBuild.required(dto, "ctudTo"));
        XmlBuild.body(x, dto);
        boolean name = XmlBuild.has(dto, "transportUndertakingName");
        boolean licence = XmlBuild.has(dto, "communityLicenceNumber");
        boolean vehicle = XmlBuild.has(dto, "vehicleRegistrationNumber") || XmlBuild.has(dto, "vehicleRegistrationCountry");
        String all = MiniJson.asString(dto.get("requestAllVehicles"));
        if (!"true".equals(all) && !"false".equals(all)) throw new IllegalArgumentException("Expected an explicit boolean");
        x.append("<SearchedCompany");
        XmlBuild.attr(x, "requestAllVehicles", all);
        x.append('>');
        String element;
        if (name && licence) element = "SearchByLicenceAndName";
        else if (licence && vehicle) element = "SearchByLicenceAndVehicle";
        else if (name && vehicle) element = "SearchByNameAndVehicle";
        else throw new IllegalArgumentException("At least two search criteria are required");
        x.append('<').append(element);
        // The name is optional only for licence+vehicle, the licence only for name+vehicle.
        XmlBuild.optional(x, "transportUndertakingName", dto.get("transportUndertakingName"));
        XmlBuild.optional(x, "communityLicenceNumber", dto.get("communityLicenceNumber"));
        x.append('>');
        if (vehicle) {
            x.append("<Vehicle");
            XmlBuild.attr(x, "vehicleRegistrationNumber", XmlBuild.required(dto, "vehicleRegistrationNumber"));
            XmlBuild.attr(x, "vehicleRegistrationCountry", XmlBuild.required(dto, "vehicleRegistrationCountry"));
            x.append("/>");
        }
        x.append("</").append(element).append("></SearchedCompany></Body></CheckTransportUndertakingData_Request>");
        return x.toString();
    }
}
