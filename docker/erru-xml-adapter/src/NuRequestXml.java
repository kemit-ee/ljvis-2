import java.util.Map;

/**
 * Outgoing NotifyUnfitness DTO to ERRU 3.5 XML. The TransportManager block is an XSD choice: a
 * complete name block (optionally with the certificate) or the certificate block alone.
 */
final class NuRequestXml {
    private NuRequestXml() { }

    static String build(Map<String, Object> dto, String memberState) {
        // nuTo is ZZ for a broadcast and a member state code otherwise.
        StringBuilder x = XmlBuild.open("NotifyUnfitness_Request", dto, memberState, XmlBuild.required(dto, "nuTo"));
        XmlBuild.body(x, dto);
        boolean name = XmlBuild.has(dto, "tmFirstName") || XmlBuild.has(dto, "tmFamilyName") || XmlBuild.has(dto, "tmDateOfBirth");
        boolean certificate = XmlBuild.has(dto, "certificateNumber") || XmlBuild.has(dto, "certificateIssueDate")
                || XmlBuild.has(dto, "certificateIssueCountry");
        if (!name && !certificate) throw new IllegalArgumentException("Missing transport manager details");
        x.append("<TransportManager");
        String unfitStart = XmlBuild.date(dto.get("unfitStartDate"));
        if (unfitStart != null) XmlBuild.attr(x, "unfitStartDate", unfitStart);
        x.append('>');
        if (name) {
            x.append("<TransportManagerNameDetails><TransportManager");
            XmlBuild.attr(x, "firstName", XmlBuild.required(dto, "tmFirstName"));
            XmlBuild.attr(x, "familyName", XmlBuild.required(dto, "tmFamilyName"));
            String dob = XmlBuild.date(dto.get("tmDateOfBirth"));
            if (dob == null) throw new IllegalArgumentException("Missing tmDateOfBirth");
            XmlBuild.attr(x, "dateOfBirth", dob);
            XmlBuild.optional(x, "placeOfBirth", dto.get("tmPlaceOfBirth"));
            XmlBuild.optional(x, "familyNameSearchKey", dto.get("tmFamilyNameSearchKey"));
            XmlBuild.optional(x, "firstNameSearchKey", dto.get("tmFirstNameSearchKey"));
            x.append("/>");
            if (certificate) certificate(x, dto);
            x.append("</TransportManagerNameDetails>");
        } else {
            x.append("<TransportManagerCertificateDetails>");
            certificate(x, dto);
            x.append("</TransportManagerCertificateDetails>");
        }
        return x.append("</TransportManager></Body></NotifyUnfitness_Request>").toString();
    }

    private static void certificate(StringBuilder x, Map<String, Object> dto) {
        x.append("<CertificateOfProfessionalCompetence");
        XmlBuild.attr(x, "certificateNumber", XmlBuild.required(dto, "certificateNumber"));
        String issued = XmlBuild.date(dto.get("certificateIssueDate"));
        if (issued == null) throw new IllegalArgumentException("Missing certificateIssueDate");
        XmlBuild.attr(x, "certificateIssueDate", issued);
        XmlBuild.attr(x, "certificateIssueCountry", XmlBuild.required(dto, "certificateIssueCountry"));
        x.append("/>");
    }
}
