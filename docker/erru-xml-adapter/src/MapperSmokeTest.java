import java.nio.file.Path;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Offline smoke test for the {@link MessageMapper} implementations — no Docker, no database, no
 * Ruuter.internal, just XSD validation against contracts/erru/3.5 (the same schema bundle the
 * real service loads). Not a unit test framework (this project has none — see README.md's "Why no
 * build tool"), just a runnable class: `javac src/*.java && java -cp out MapperSmokeTest`.
 *
 * This exists because it is materially cheaper and faster than a live docker-compose round trip
 * for catching mapper-level XSD-conformance bugs, and it already has: a genuine CTUD "Found"
 * branch fixture (the tests/postman collection's own fixtures happen to land on NotFound, so this
 * class was the only thing that ever exercised CTUD's/CGR's actual Found-branch XML), the
 * COMMUNITY_LICENCE_TYPE code-vs-XSD-string mismatch (this class is what found it — a "Found"
 * answer had been silently downgrading to NotAvailable), the "never fabricate a
 * status/type/address" rejection path (now an exception, since a synthetic NotAvailable is
 * itself forbidden by protocol — see StatusMapper), and (via {@link #roundTripJson}) MiniJson always parsing a
 * JSON number as a Double — a "Found" answer's numeric fields built from Java-native `int`
 * literals looked fine here but produced `numberOfVehicles="0.0"` (invalid xs:integer) once real
 * JSON parsed off a live Ruuter response was involved; every JSON built from a Ruuter answer in
 * this file is round-tripped through {@link MiniJson#write}/{@link MiniJson#parseObject} for
 * exactly this reason, not built and used directly as Java objects.
 */
public class MapperSmokeTest {
    static SchemaRegistry schemas;

    public static void main(String[] args) throws Exception {
        schemas = new SchemaRegistry(Path.of("/app/contracts/erru/3.5".equals(System.getenv("CONTRACTS_DIR"))
                ? System.getenv("CONTRACTS_DIR") : firstExisting(
                        "/app/contracts/erru/3.5", "contracts/erru/3.5", "../../contracts/erru/3.5")));
        testNcr();
        testRsi();
        testCtud();
        testCgr();
        testErrorNotification();
        testStatusMapperRejectsHubReservedValues();
        testResponseBudget();
        System.out.println("ALL MAPPER SMOKE TESTS PASSED");
    }

    private static String firstExisting(String... candidates) {
        for (String c : candidates) {
            if (Path.of(c).toFile().isDirectory()) return c;
        }
        return candidates[candidates.length - 1];
    }

    /** Simulates the real code path: every "Ruuter answer" here goes through JSON text, not a direct Java Map. */
    @SuppressWarnings("unchecked")
    private static Map<String, Object> roundTripJson(Map<String, Object> json) {
        return MiniJson.parseObject(MiniJson.write(json));
    }

    static void testNcr() throws Exception {
        System.out.println("== NCR ==");
        String xml = """
            <NotifyCheckResult_Request xmlns="https://webgate.ec.testa.eu/move-hub/erru/3.5">
              <Header version="3.5" technicalId="11111111-1111-1111-1111-111111111111" workflowId="22222222-2222-2222-2222-222222222222" sentAt="2026-01-01T10:00:00Z" from="DE" to="EE"/>
              <Body businessCaseId="DE-NCR-0001" originatingAuthority="DE-BAG" requestSource="CA" requestPurpose="Control">
                <TransportUndertaking transportUndertakingName="ACME OU" communityLicenceNumber="EE-CL-001">
                  <Vehicle vehicleRegistrationNumber="123ABC" vehicleRegistrationCountry="EE"/>
                  <CheckSummary checkResult="Fail" dateOfCheck="2026-01-01"/>
                  <MinorInfringement dateOfInfringement="2026-01-01" numberOfInfringements="2"/>
                  <SeriousInfringement dateOfInfringement="2026-01-01" category="MSI" infringementType="101" appealPossible="true">
                    <PenaltiesImposed>
                      <PenaltyImposed penaltyImposedIdentifier="1" finalDecisionDate="2026-01-02" penaltyTypeImposed="101" isExecuted="Yes"/>
                    </PenaltiesImposed>
                    <PenaltiesRequested>
                      <PenaltyRequested penaltyRequestedIdentifier="1" penaltyTypeRequested="301" duration="30"/>
                    </PenaltiesRequested>
                  </SeriousInfringement>
                </TransportUndertaking>
              </Body>
            </NotifyCheckResult_Request>
            """;
        schemas.validate("NotifyCheckResult_Request", xml.getBytes("UTF-8"));
        var doc = XmlUtil.parseHardened(xml);
        NcrMapper mapper = new NcrMapper("EE-TRAM", "EE");
        Map<String, Object> json = mapper.requestToJson(doc, Instant.now());
        if (!"Fail".equals(json.get("checkResult"))) throw new AssertionError("checkResult");
        if (!((String) json.get("seriousInfringements")).contains("\"penaltyImposedIdentifier\":1")) {
            throw new AssertionError("seriousInfringements JSON round trip lost a real number: " + json.get("seriousInfringements"));
        }

        Map<String, Object> ack = new LinkedHashMap<>();
        ack.put("acknowledgementType", "NCRN_Ack");
        ack.put("statusCode", "OK");
        ack.put("statusMessage", "");
        String ackXml = mapper.buildResponseXml(roundTripJson(ack), doc, "33333333-3333-3333-3333-333333333333");
        schemas.validate("NotifyCheckResult_Acknowledgement", ackXml.getBytes("UTF-8"));
        ResponseValidator.validate(XmlUtil.parseHardened(ackXml));
        if (!ackXml.contains("respondingAuthority=\"EE-TRAM\"")) throw new AssertionError("NCR respondingAuthority not threaded through");
        System.out.println("NCR OK");
    }

    static void testRsi() throws Exception {
        System.out.println("== RSI ==");
        String xml = """
            <RoadSideInspection_Request xmlns="https://webgate.ec.testa.eu/move-hub/erru/3.5">
              <Header version="3.5" technicalId="11111111-1111-1111-1111-111111111112" workflowId="22222222-2222-2222-2222-222222222223" sentAt="2026-01-01T10:00:00Z" from="DE" to="EE"/>
              <Body businessCaseId="DE-RSI-0001" originatingAuthority="DE-BAG" requestSource="RSI" requestPurpose="Control">
                <InspectionDetails inspectionIdentifier="INSP-1" inspectionLocation="Autobahn A1" inspectionDateTime="2026-01-01T09:00:00Z" inspectionAuthorityOrName="DE-Polizei">
                  <InspectionResult inspectionPassed="false" vehicleProhibitionOrRestriction="true" ptiRequested="true"/>
                </InspectionDetails>
                <IdentificationDetails>
                  <VehicleDetails vehicleRegistrationNumber="123ABC" vehicleRegistrationCountry="EE" vehicleIdentificationNumber="WVW1234567890ABCD" vehicleCategory="N2" odometerReading="123456"/>
                  <DriverDetails firstName="HANS" familyName="MUELLER" drivingLicenceNumber="DL123" drivingLicenceCountry="DE"/>
                  <TransportUndertakingDetails transportUndertakingName="ACME OU" communityLicenceNumber="EE-CL-001">
                    <TransportUndertakingAddress address="Main St 1" postCode="10111" city="Tallinn" country="EE"/>
                  </TransportUndertakingDetails>
                </IdentificationDetails>
                <CheckedItems>
                  <CheckedItem itemType="1" itemFailed="1">
                    <FailedChecks>
                      <FailedCheck failedReason="1.1.1.a" failedAssessment="Major" isRectified="0"/>
                    </FailedChecks>
                  </CheckedItem>
                  <CheckedItem itemType="5" itemFailed="false"/>
                </CheckedItems>
              </Body>
            </RoadSideInspection_Request>
            """;
        schemas.validate("RoadSideInspection_Request", xml.getBytes("UTF-8"));
        var doc = XmlUtil.parseHardened(xml);
        RsiMapper mapper = new RsiMapper("EE-TRAM", "EE");
        Map<String, Object> json = mapper.requestToJson(doc, Instant.now());
        if (!"WVW1234567890ABCD".equals(json.get("vehicleIdentificationNumber"))) throw new AssertionError("vin");
        if (!"HANS".equals(json.get("driverFirstName"))) throw new AssertionError("driver");
        // xs:boolean "1" must be read as true, not false (Boolean.parseBoolean("1") == false).
        if (!((String) json.get("checkedItems")).contains("\"itemFailed\":true")) {
            throw new AssertionError("xs:boolean '1' was not read as true — checkedItems=" + json.get("checkedItems"));
        }
        if (!((String) json.get("checkedItems")).contains("\"isRectified\":false")) {
            throw new AssertionError("xs:boolean '0' was not read as false — checkedItems=" + json.get("checkedItems"));
        }
        if (!((String) json.get("identificationDetails")).contains("\"isVehicleHolder\":\"transport_undertaking\"")) {
            throw new AssertionError("identificationDetails must match chk_rsi_identification_choice's shape: " + json.get("identificationDetails"));
        }

        Map<String, Object> answer = new LinkedHashMap<>();
        answer.put("statusCode", "OK");
        answer.put("statusMessage", "");
        String responseXml = mapper.buildResponseXml(roundTripJson(answer), doc, "55555555-5555-5555-5555-555555555555");
        schemas.validate("RoadSideInspection_Response", responseXml.getBytes("UTF-8"));
        ResponseValidator.validate(XmlUtil.parseHardened(responseXml));
        if (!responseXml.contains("respondingAuthority=\"EE-TRAM\"")) throw new AssertionError("RSI respondingAuthority missing");
        System.out.println("RSI OK");
    }

    static void testCtud() throws Exception {
        System.out.println("== CTUD ==");
        String xml = """
            <CheckTransportUndertakingData_Request xmlns="https://webgate.ec.testa.eu/move-hub/erru/3.5">
              <Header version="3.5" technicalId="11111111-1111-1111-1111-111111111113" workflowId="22222222-2222-2222-2222-222222222224" sentAt="2026-01-01T10:00:00Z" from="DE" to="EE"/>
              <Body businessCaseId="DE-CTUD-0001" originatingAuthority="DE-BAG" requestSource="CA" requestPurpose="Control">
                <SearchedCompany requestAllVehicles="false">
                  <SearchByLicenceAndName transportUndertakingName="AS EESTI VEOD" communityLicenceNumber="EE-CL-2020-11111">
                    <Vehicle vehicleRegistrationNumber="123ABC" vehicleRegistrationCountry="EE"/>
                  </SearchByLicenceAndName>
                </SearchedCompany>
              </Body>
            </CheckTransportUndertakingData_Request>
            """;
        schemas.validate("CheckTransportUndertakingData_Request", xml.getBytes("UTF-8"));
        var doc = XmlUtil.parseHardened(xml);
        CtudMapper mapper = new CtudMapper("EE-TRAM", "EE");
        Map<String, Object> json = mapper.requestToJson(doc, Instant.now());
        if (!"AS EESTI VEOD".equals(json.get("transportUndertakingName"))) throw new AssertionError("name");

        // Real MTR mock shape (DSL/Ruuter/ljvis/POST/v1/erru/mock/mtr/check-community-licence.yml's
        // returnFound), including the compact COMMUNITY_LICENCE_TYPE code this table must translate.
        Map<String, Object> found = new LinkedHashMap<>();
        found.put("statusCode", "Found");
        found.put("statusMessage", "");
        found.put("respondingAuthority", "EE-TRAM");
        found.put("transportUndertakingName", "AS EESTI VEOD");
        found.put("numberOfEmployees", 63);
        found.put("numberOfVehicles", 0);
        found.put("riskRating", 0);
        found.put("riskBand", "Grey");
        found.put("searchMethod", "CommunityLicence");
        Map<String, Object> address = new LinkedHashMap<>();
        address.put("address", "Tartu mnt 12");
        address.put("postCode", "10145");
        address.put("city", "Tallinn");
        address.put("country", "EE");
        found.put("address", address);
        Map<String, Object> cl = new LinkedHashMap<>();
        cl.put("communityLicenceNumber", "EE-CL-2020-11111");
        cl.put("communityLicenceStatus", "Active");
        cl.put("communityLicenceType", "CommunityLicenceGoods");
        cl.put("licencingAuthority", "EE-TRAM");
        cl.put("startDate", "2020-06-01");
        cl.put("expiryDate", "2030-05-31");
        found.put("communityLicenceDetails", List.of(cl));
        found.put("certifiedTrueCopyDetails", List.of());
        found.put("vehicleRegistrations", List.of());
        String foundXml = mapper.buildResponseXml(roundTripJson(found), doc, "77777777-7777-7777-7777-777777777777");
        schemas.validate("CheckTransportUndertakingData_Response", foundXml.getBytes("UTF-8"));
        ResponseValidator.validate(XmlUtil.parseHardened(foundXml));
        if (!foundXml.contains("statusCode=\"Found\"")) {
            throw new AssertionError("expected a real Found answer, got: " + foundXml);
        }
        if (!foundXml.contains("communityLicenceType=\"Community licence for goods transport\"")) {
            throw new AssertionError("CommunityLicenceGoods was not translated to the XSD long-form string: " + foundXml);
        }
        if (!foundXml.contains("respondingAuthority=\"EE-TRAM\"")) {
            throw new AssertionError("CTUD must use the flow's own respondingAuthority, not a hardcoded default: " + foundXml);
        }

        // An unrecognised/missing licence type or status must NOT produce a fabricated Found
        // record, or a synthetic NotAvailable (forbidden by protocol) — it must throw, so the
        // caller (ProcessingWorker) sends an ErrorNotification instead.
        Map<String, Object> foundBadType = new LinkedHashMap<>(found);
        Map<String, Object> clBadType = new LinkedHashMap<>(cl);
        clBadType.put("communityLicenceType", "SomeUnmappedFutureCode");
        foundBadType.put("communityLicenceDetails", List.of(clBadType));
        try {
            mapper.buildResponseXml(roundTripJson(foundBadType), doc, "12121212-1212-1212-1212-121212121212");
            throw new AssertionError("an unmapped licence type must throw, not silently produce an answer");
        } catch (IllegalStateException expected) {
            // expected: the caller downgrades this to an ErrorNotification.
        }

        Map<String, Object> notFound = new LinkedHashMap<>();
        notFound.put("statusCode", "NotFound");
        notFound.put("statusMessage", "not found");
        String notFoundXml = mapper.buildResponseXml(notFound, doc, "88888888-8888-8888-8888-888888888888");
        schemas.validate("CheckTransportUndertakingData_Response", notFoundXml.getBytes("UTF-8"));
        ResponseValidator.validate(XmlUtil.parseHardened(notFoundXml));
        System.out.println("CTUD OK");
    }

    static void testCgr() throws Exception {
        System.out.println("== CGR 7A/7B ==");
        String xml7a = """
            <CheckGoodRepute_Request xmlns="https://webgate.ec.testa.eu/move-hub/erru/3.5">
              <Header version="3.5" technicalId="11111111-1111-1111-1111-111111111114" workflowId="22222222-2222-2222-2222-222222222225" sentAt="2026-01-01T10:00:00Z" from="DE" to="ZZ"/>
              <Body businessCaseId="DE-CGR-0001" originatingAuthority="DE-BAG" requestSource="CA" requestPurpose="Issue">
                <SearchedTransportManager>
                  <TransportManagerNameDetails firstName="MART" familyName="TAMM" dateOfBirth="1980-05-15" placeOfBirth="Tallinn"/>
                </SearchedTransportManager>
              </Body>
            </CheckGoodRepute_Request>
            """;
        schemas.validate("CheckGoodRepute_Request", xml7a.getBytes("UTF-8"));
        var doc7a = XmlUtil.parseHardened(xml7a);
        CgrMapper mapper = new CgrMapper("EE");
        Map<String, Object> json7a = mapper.requestToJson(doc7a, Instant.now());
        if (!"MART".equals(json7a.get("tmFirstName"))) throw new AssertionError("firstName");

        String xml7b = """
            <CheckGoodRepute_Request xmlns="https://webgate.ec.testa.eu/move-hub/erru/3.5">
              <Header version="3.5" technicalId="11111111-1111-1111-1111-111111111115" workflowId="22222222-2222-2222-2222-222222222226" sentAt="2026-01-01T10:00:00Z" from="DE" to="ZZ"/>
              <Body businessCaseId="DE-CGR-0002" originatingAuthority="DE-BAG" requestSource="CA" requestPurpose="Issue">
                <SearchedTransportManager>
                  <TransportManagerCertificateDetails certificateNumber="EE-CPC-2020-00111" certificateIssueDate="2020-06-01" certificateIssueCountry="EE"/>
                </SearchedTransportManager>
              </Body>
            </CheckGoodRepute_Request>
            """;
        schemas.validate("CheckGoodRepute_Request", xml7b.getBytes("UTF-8"));
        var doc7b = XmlUtil.parseHardened(xml7b);
        Map<String, Object> json7b = mapper.requestToJson(doc7b, Instant.now());
        if (!"EE-CPC-2020-00111".equals(json7b.get("certificateNumber"))) throw new AssertionError("certNumber");

        // Real MTR mock shape (returnFound / check-transport-manager-good-repute.yml), matching
        // cgr/inbound-request.yml's own assignMtrFoundResponse mapping.
        Map<String, Object> found = new LinkedHashMap<>();
        found.put("memberStateCode", "EE");
        found.put("statusCode", "Found");
        found.put("statusMessage", "");
        Map<String, Object> tmDetails = new LinkedHashMap<>();
        tmDetails.put("respondingAuthority", "EE-TRAM");
        tmDetails.put("searchMethod", "NYSIIS");
        Map<String, Object> nameDetails = new LinkedHashMap<>();
        nameDetails.put("firstName", "Mart");
        nameDetails.put("familyName", "Tamm");
        nameDetails.put("dateOfBirth", "1980-05-15");
        nameDetails.put("placeOfBirth", "Tallinn");
        tmDetails.put("nameDetails", nameDetails);
        Map<String, Object> certDetails = new LinkedHashMap<>();
        certDetails.put("certificateNumber", "EE-CPC-2020-00111");
        certDetails.put("certificateIssueDate", "2020-06-01");
        certDetails.put("certificateIssueCountry", "EE");
        certDetails.put("certificateValidity", "Valid");
        Map<String, Object> fitness = new LinkedHashMap<>();
        fitness.put("fitnessStatus", "Fit");
        certDetails.put("fitness", fitness);
        tmDetails.put("certificateDetails", certDetails);
        Map<String, Object> tu = new LinkedHashMap<>();
        tu.put("totalManagedUndertakings", 1);
        tu.put("totalManagedVehicles", 8);
        Map<String, Object> undertaking = new LinkedHashMap<>();
        undertaking.put("transportUndertakingName", "AS EESTI VEOD");
        undertaking.put("communityLicenceNumber", "EE-CL-2020-11111");
        undertaking.put("communityLicenceStatus", "Active");
        undertaking.put("numberOfVehicles", 8);
        Map<String, Object> addr = new LinkedHashMap<>();
        addr.put("address", "Tartu mnt 12");
        addr.put("postCode", "10145");
        addr.put("city", "Tallinn");
        addr.put("country", "EE");
        undertaking.put("address", addr);
        tu.put("undertaking", List.of(undertaking));
        tmDetails.put("transportUndertakings", tu);
        found.put("transportManagerDetails", tmDetails);

        String foundXml = mapper.buildResponseXml(roundTripJson(found), doc7a, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        schemas.validate("CheckGoodRepute_Response", foundXml.getBytes("UTF-8"));
        ResponseValidator.validate(XmlUtil.parseHardened(foundXml));
        if (!foundXml.contains("statusCode=\"Found\"")) throw new AssertionError("expected a real Found answer: " + foundXml);

        // A missing/unrecognised communityLicenceStatus on an undertaking must throw, not
        // fabricate "Active" or a synthetic NotAvailable (forbidden by protocol).
        Map<String, Object> foundBadStatus = new LinkedHashMap<>(found);
        Map<String, Object> tmDetailsBadStatus = new LinkedHashMap<>(tmDetails);
        Map<String, Object> tuBad = new LinkedHashMap<>(tu);
        Map<String, Object> undertakingBadStatus = new LinkedHashMap<>(undertaking);
        undertakingBadStatus.remove("communityLicenceStatus");
        tuBad.put("undertaking", List.of(undertakingBadStatus));
        tmDetailsBadStatus.put("transportUndertakings", tuBad);
        foundBadStatus.put("transportManagerDetails", tmDetailsBadStatus);
        try {
            mapper.buildResponseXml(roundTripJson(foundBadStatus), doc7a, "dddddddd-dddd-dddd-dddd-dddddddddddd");
            throw new AssertionError("a missing communityLicenceStatus must throw, not silently produce an answer");
        } catch (IllegalStateException expected) {
            // expected: the caller downgrades this to an ErrorNotification.
        }

        Map<String, Object> notFound = new LinkedHashMap<>();
        notFound.put("statusCode", "NotFound");
        notFound.put("statusMessage", "not found");
        String notFoundXml = mapper.buildResponseXml(notFound, doc7a, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        schemas.validate("CheckGoodRepute_Response", notFoundXml.getBytes("UTF-8"));
        ResponseValidator.validate(XmlUtil.parseHardened(notFoundXml));
        String empty = mapper.buildResponseXml(Map.of("statusCode", "Found"), doc7a, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        schemas.validate(mapper.responseRoot(), empty);
        expectSemanticRejection(empty);
        expectSemanticRejection(foundXml.replace("fitnessStatus=\"Fit\"", "fitnessStatus=\"Unfit\""));
        // Aggregate counts are not required to equal the CGR detail-list counts.
        String aggregateXml = foundXml.replace("totalManagedVehicles=\"8\"", "totalManagedVehicles=\"17\"")
                .replace("totalManagedUndertakings=\"1\"", "totalManagedUndertakings=\"3\"");
        schemas.validate("CheckGoodRepute_Response", aggregateXml);
        ResponseValidator.validate(XmlUtil.parseHardened(aggregateXml));
        ResponseValidator.validateCorrelation(doc7a, XmlUtil.parseHardened(foundXml), "EE");
        System.out.println("CGR OK");
    }

    /** ErrorNotificationBuilder is shared across all 5 types — one test covers all of them. */
    static void testErrorNotification() throws Exception {
        System.out.println("== ErrorNotification ==");
        String xml = """
            <NotifyUnfitness_Request xmlns="https://webgate.ec.testa.eu/move-hub/erru/3.5">
              <Header version="3.5" technicalId="e1111111-1111-1111-1111-111111111111" workflowId="e2222222-2222-2222-2222-222222222222" sentAt="2026-01-01T10:00:00Z" from="DE" to="EE"/>
              <Body businessCaseId="DE-EN-0001" originatingAuthority="DE-BAG" requestSource="CA" requestPurpose="Issue">
                <TransportManager unfitStartDate="2026-01-01">
                  <TransportManagerNameDetails>
                    <TransportManager firstName="HANS" familyName="MUELLER" dateOfBirth="1975-04-12"/>
                    <CertificateOfProfessionalCompetence certificateNumber="DE-CPC-1" certificateIssueDate="2010-05-01" certificateIssueCountry="DE"/>
                  </TransportManagerNameDetails>
                </TransportManager>
              </Body>
            </NotifyUnfitness_Request>
            """;
        var doc = XmlUtil.parseHardened(xml);
        schemas.validate("NotifyUnfitness_Request", xml);
        var nu = new NuMapper("EE-PPA", "EE");
        nu.requestToJson(doc, Instant.now());
        String ack = nu.buildResponseXml(Map.of("statusCode", "OK"), doc, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        schemas.validate(nu.responseRoot(), ack);
        ResponseValidator.validate(XmlUtil.parseHardened(ack));
        ResponseValidator.validateCorrelation(doc, XmlUtil.parseHardened(ack), "EE");
        ErrorNotificationBuilder en = new ErrorNotificationBuilder("EE");
        for (String statusCode : ErrorNotificationBuilder.VALID_ERROR_STATUS_CODES) {
            String enXml = en.build(statusCode, "test message for " + statusCode, doc, xml, "f1111111-1111-1111-1111-111111111111");
            schemas.validate("ErrorNotification", enXml.getBytes("UTF-8"));
            if (!enXml.contains("to=\"EU\"")) throw new AssertionError("EN must address the Hub ('EU'), not the original sender: " + enXml);
            if (!enXml.contains("workflowId=\"e2222222-2222-2222-2222-222222222222\"")) {
                throw new AssertionError("EN must correlate via the original request's workflowId: " + enXml);
            }
            if (!enXml.contains("<OriginalMessage>")) throw new AssertionError("EN must echo the original message: " + enXml);
        }
        try {
            en.build("NotARealStatus", "x", doc, xml, "f2222222-2222-2222-2222-222222222222");
            throw new AssertionError("an invalid errorStatusCodeType value must be rejected before even building XML");
        } catch (IllegalArgumentException expected) {
            // expected
        }
        System.out.println("ErrorNotification OK");
    }

    /** StatusMapper must never allow a member-state answer to claim Timeout/NotAvailable — those are Hub-reserved. */
    static void testStatusMapperRejectsHubReservedValues() {
        System.out.println("== StatusMapper ==");
        for (StatusMapper.Kind kind : StatusMapper.Kind.values()) {
            for (String forbidden : new String[]{"NotAvailable", "Timeout", "InvalidData", "ServerError", "bogus", null}) {
                try {
                    StatusMapper.map(kind, forbidden, "x");
                    throw new AssertionError(kind + " must reject '" + forbidden + "', not silently accept it");
                } catch (StatusMapper.InvalidStatusException expected) {
                    // expected
                }
            }
        }
        System.out.println("StatusMapper OK");
    }
    private static void expectSemanticRejection(String xml) throws Exception {
        var doc = XmlUtil.parseHardened(xml);
        try {
            ResponseValidator.validate(doc);
            throw new AssertionError("Expected semantic rejection: " + xml);
        } catch (IllegalArgumentException expected) { }
    }

    private static void testResponseBudget() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        if (ResponseBudget.canRetry(now.plusSeconds(2), now, 5000)) throw new AssertionError("Retry exceeds deadline");
        if (!ResponseBudget.canRetry(now.plusSeconds(10), now, 5000)) throw new AssertionError("Retry fits deadline");
        if (!ResponseBudget.callTimeout(now.plusSeconds(1), now, java.time.Duration.ofSeconds(45)).isZero()) throw new AssertionError("No call budget");
        if (!ResponseBudget.deliveryTimeout(now.plusSeconds(1), now).equals(java.time.Duration.ofSeconds(1))) throw new AssertionError("Delivery budget");
        if (!"12".equals(MiniJson.asIntString(12.0, 0))) throw new AssertionError("Integer conversion");
        try { MiniJson.asIntString(12.5, 0); throw new AssertionError("Fraction truncated"); }
        catch (IllegalArgumentException expected) { }
        System.out.println("Response budgets and integer validation OK");
    }
}
