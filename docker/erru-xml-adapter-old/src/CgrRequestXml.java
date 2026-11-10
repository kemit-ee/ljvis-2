import java.util.Map;

/**
 * Outgoing CheckGoodRepute DTO to ERRU 3.5 XML. SearchedTransportManager is an XSD choice: a
 * complete name block (7A), optionally with the certificate block, or the certificate block (7B)
 * alone. The NYSIIS keys travel on the name block exactly as the XSD defines them.
 */
final class CgrRequestXml {
    private CgrRequestXml() { }

    static String build(Map<String, Object> dto, String memberState) {
        // cgrTo is ZZ for a broadcast and a member state code for a per-country resend.
        StringBuilder x = XmlBuild.open("CheckGoodRepute_Request", dto, memberState, XmlBuild.required(dto, "cgrTo"));
        XmlBuild.body(x, dto);
        x.append("<SearchedTransportManager>");
        boolean name = XmlBuild.has(dto, "tmFirstName") || XmlBuild.has(dto, "tmFamilyName") || XmlBuild.has(dto, "tmDateOfBirth");
        boolean certificate = XmlBuild.has(dto, "certificateNumber") || XmlBuild.has(dto, "certificateIssueDate")
                || XmlBuild.has(dto, "certificateIssueCountry");
        if (!name && !certificate) throw new IllegalArgumentException("Missing search criteria");
        if (name) {
            x.append("<TransportManagerNameDetails");
            XmlBuild.attr(x, "firstName", XmlBuild.required(dto, "tmFirstName"));
            XmlBuild.attr(x, "familyName", XmlBuild.required(dto, "tmFamilyName"));
            String dob = XmlBuild.date(dto.get("tmDateOfBirth"));
            if (dob == null) throw new IllegalArgumentException("Missing tmDateOfBirth");
            XmlBuild.attr(x, "dateOfBirth", dob);
            XmlBuild.optional(x, "placeOfBirth", dto.get("tmPlaceOfBirth"));
            XmlBuild.optional(x, "familyNameSearchKey", dto.get("tmFamilyNameSearchKey"));
            XmlBuild.optional(x, "firstNameSearchKey", dto.get("tmFirstNameSearchKey"));
            x.append("/>");
        }
        if (certificate) {
            x.append("<TransportManagerCertificateDetails");
            XmlBuild.attr(x, "certificateNumber", XmlBuild.required(dto, "certificateNumber"));
            String issued = XmlBuild.date(dto.get("certificateIssueDate"));
            if (issued == null) throw new IllegalArgumentException("Missing certificateIssueDate");
            XmlBuild.attr(x, "certificateIssueDate", issued);
            XmlBuild.attr(x, "certificateIssueCountry", XmlBuild.required(dto, "certificateIssueCountry"));
            x.append("/>");
        }
        return x.append("</SearchedTransportManager></Body></CheckGoodRepute_Request>").toString();
    }
}
