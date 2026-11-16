#!/usr/bin/env python3
"""Generates the ruuter-internal flows that XTR (erru-xml-adapter, `inbound.backend`) POSTs to for the ERRU request
messages (NU first; NCR/RSI/CGR/CTUD follow the same shape).

One route per request message, synchronous (hybrid design, stage 5):
  envelope check -> durable accept in erru.xml_inbox (xml-inbox/accept, claimed) -> recipient check -> map XSD-shaped JSON
  to the body of the existing /erru/<flow> -> call it -> build the answer as XSD-shaped JSON -> POST it to the Hub through
  /xml-out (XTR) -> close the inbox row.
Failures that cannot produce a business answer become an ErrorNotification (InvalidData / ServerError) sent the same way.
202 = handled, 503 = transient (Hub redelivers; the claim is taken over by the redelivery), 409 = conflicting redelivery.

Run: python3 scripts/generate-erru-xtr-requests.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "DSL/Ruuter.internal/ljvis/POST/erru/xtr/inbound"

# Common JS helpers, prefixed to every expression (kept on one line, single quotes only).
AT = "var at = function(o, k) { return o != null && o[k] != null ? String(o[k]) : ''; }; "

TYPES = {
    "NotifyUnfitness_Request": {
        "flow": "nu/inbound-request",
        "response": "NotifyUnfitness_Acknowledgement",
        "answer_check": "inbound_json.acknowledgementType === 'NotifyUnfitness_Acknowledgement'",
        # JSON for POST /erru/nu/inbound-request (same keys as the Java NuMapper.requestToJson)
        "map": ("(function() { " + AT +
                "var tm = bdy.TransportManager || {}; var d = tm.TransportManagerNameDetails || tm.TransportManagerCertificateDetails || {}; "
                "var im = d.TransportManager || {}; var c = d.CertificateOfProfessionalCompetence || {}; "
                "return {technicalId: at(hdr, '@technicalId'), workflowId: at(hdr, '@workflowId'), sentAt: at(hdr, '@sentAt'), from: at(hdr, '@from'), "
                "businessCaseId: at(bdy, '@businessCaseId'), originatingAuthority: at(bdy, '@originatingAuthority'), requestSource: at(bdy, '@requestSource'), "
                "requestPurpose: at(bdy, '@requestPurpose'), tmFirstName: at(im, '@firstName'), tmFamilyName: at(im, '@familyName'), "
                "tmDateOfBirth: at(im, '@dateOfBirth'), tmPlaceOfBirth: at(im, '@placeOfBirth'), tmFirstNameSearchKey: at(im, '@firstNameSearchKey'), "
                "tmFamilyNameSearchKey: at(im, '@familyNameSearchKey'), certificateNumber: at(c, '@certificateNumber'), "
                "certificateIssueDate: at(c, '@certificateIssueDate'), certificateIssueCountry: at(c, '@certificateIssueCountry'), "
                "unfitStartDate: at(tm, '@unfitStartDate'), receivedAt: accepted.receivedAt}; })()"),
        # flow answer is usable (status OK or an explicit member-state list); else InvalidData / ServerError EN
        "answer_ok": "Array.isArray(inbound_json.memberStates) || inbound_json.statusCode === 'OK'",
        # XSD-shaped JSON of NotifyUnfitness_Acknowledgement (same content as Java NuMapper.buildResponseXml)
        "build": ("(function() { var ans = inbound_json; var s = function(v) { return v == null ? '' : String(v); }; "
                  "var d = function(v, f) { var x = s(v); return x === '' ? f : x; }; "
                  "var ms = Array.isArray(ans.memberStates) ? ans.memberStates : "
                  "[{memberStateCode: 'EE', respondingAuthority: '[#@@AUTH@@]', statusCode: ans.statusCode, statusMessage: ans.statusMessage}]; "
                  "var mem = ms.map(function(m) { var o = {'@memberStateCode': s(m.memberStateCode), '@respondingAuthority': s(m.respondingAuthority), '@statusCode': s(m.statusCode)}; "
                  "if (s(m.statusMessage).trim() !== '') { o['@statusMessage'] = s(m.statusMessage); } return o; }); "
                  "return {Header: {'@version': '3.5', '@technicalId': accepted.responseTechnicalId, '@workflowId': d(ans.workflowId, workflow_id), "
                  "'@sentAt': d(ans.sentAt, new Date().toISOString().substring(0, 19) + 'Z'), '@from': 'EE', '@to': d(ans.to, from_state)}, "
                  "Body: {'@businessCaseId': d(ans.businessCaseId, business_case_id), '@originatingAuthority': d(ans.originatingAuthority, s(bdy['@originatingAuthority'])), MemberState: mem}}; })()"),
        # a request that needs business completion must not be dropped as processed on a ServerError EN
        "requires_business_completion": True,
    },
}

# More helpers for the NCR / RSI mappers (Java: parseInt -> null when blank, XmlUtil.parseXsdBoolean, firstChild/children).
PI = "var pi = function(v) { var t = String(v == null ? '' : v).trim(); if (t === '') { return null; } var n = parseInt(t, 10); return isNaN(n) ? null : n; }; "
XB = "var xb = function(v) { var t = String(v == null ? '' : v).trim().split(String.fromCharCode(32)).join(''); return t === 'true' || t === '1'; }; "
AR = "var ar = function(v) { return v == null || v === '' ? [] : (Array.isArray(v) ? v : [v]); }; "
ONE = "var one = function(v) { return Array.isArray(v) ? (v.length > 0 ? v[0] : {}) : (v != null && typeof v === 'object' ? v : {}); }; "
HELP = AT + PI + XB + AR + ONE
HAS = "var has = function(o, k) { return o != null && o[k] != null; }; "

HDR_JS = ("technicalId: at(hdr, '@technicalId'), workflowId: at(hdr, '@workflowId'), sentAt: at(hdr, '@sentAt'), from: at(hdr, '@from'), "
          "businessCaseId: at(bdy, '@businessCaseId'), originatingAuthority: at(bdy, '@originatingAuthority'), requestSource: at(bdy, '@requestSource'), "
          "requestPurpose: at(bdy, '@requestPurpose')")

NCR_MAP = ("(function() { " + HELP + HAS +
           "var tu = one(bdy.TransportUndertaking); var veh = one(tu.Vehicle); var cs = one(tu.CheckSummary); "
           "var out = {" + HDR_JS + ", transportUndertakingName: at(tu, '@transportUndertakingName'), communityLicenceNumber: at(tu, '@communityLicenceNumber'), "
           "vehicleRegistrationNumber: at(veh, '@vehicleRegistrationNumber'), vehicleRegistrationCountry: at(veh, '@vehicleRegistrationCountry'), "
           "checkResult: at(cs, '@checkResult'), checkDate: at(cs, '@dateOfCheck')}; "
           "if (tu.MinorInfringement != null) { var mi = one(tu.MinorInfringement); "
           "out.minorInfringement = JSON.stringify({dateOfInfringement: at(mi, '@dateOfInfringement'), numberOfInfringements: pi(at(mi, '@numberOfInfringements'))}); } "
           "out.seriousInfringements = JSON.stringify(ar(tu.SeriousInfringement).map(function(si) { "
           "var s = {dateOfInfringement: at(si, '@dateOfInfringement'), category: at(si, '@category'), infringementType: at(si, '@infringementType'), appealPossible: xb(at(si, '@appealPossible'))}; "
           "s.penaltiesImposed = ar(one(si.PenaltiesImposed).PenaltyImposed).map(function(p) { "
           "var o = {penaltyImposedIdentifier: pi(at(p, '@penaltyImposedIdentifier')), finalDecisionDate: at(p, '@finalDecisionDate'), penaltyTypeImposed: at(p, '@penaltyTypeImposed')}; "
           "if (has(p, '@startDate')) { o.startDate = at(p, '@startDate'); } if (has(p, '@endDate')) { o.endDate = at(p, '@endDate'); } o.isExecuted = at(p, '@isExecuted'); "
           "if (has(p, '@notExecutedReason')) { o.notExecutedReason = at(p, '@notExecutedReason'); } return o; }); "
           "if (si.PenaltiesRequested != null) { s.penaltiesRequested = ar(one(si.PenaltiesRequested).PenaltyRequested).map(function(p) { "
           "var o = {penaltyRequestedIdentifier: pi(at(p, '@penaltyRequestedIdentifier')), penaltyTypeRequested: at(p, '@penaltyTypeRequested')}; "
           "if (has(p, '@duration')) { o.duration = pi(at(p, '@duration')); } return o; }); } return s; })); "
           "return out; })()")

RSI_MAP = ("(function() { " + HELP + HAS +
           "var ins = one(bdy.InspectionDetails); var res = one(ins.InspectionResult); var idd = one(bdy.IdentificationDetails); var veh = one(idd.VehicleDetails); "
           "var drv = one(idd.DriverDetails); "
           "var addr = function(e) { return e == null ? null : {address: at(e, '@address'), postCode: at(e, '@postCode'), city: at(e, '@city'), country: at(e, '@country')}; }; "
           "var out = {" + HDR_JS + ", vehicleRegistrationNumber: at(veh, '@vehicleRegistrationNumber'), vehicleRegistrationCountry: at(veh, '@vehicleRegistrationCountry'), "
           "vehicleCategory: at(veh, '@vehicleCategory'), vehicleIdentificationNumber: at(veh, '@vehicleIdentificationNumber'), inspectionLocation: at(ins, '@inspectionLocation'), "
           "inspectionDatetime: at(ins, '@inspectionDateTime'), inspectionAuthorityOrName: at(ins, '@inspectionAuthorityOrName'), inspectionPassed: at(res, '@inspectionPassed'), "
           "ptiRequested: at(res, '@ptiRequested'), vehicleProhibitionOrRestriction: at(res, '@vehicleProhibitionOrRestriction'), driverFirstName: at(drv, '@firstName'), "
           "driverFamilyName: at(drv, '@familyName'), driverLicenceNumber: at(drv, '@drivingLicenceNumber'), driverLicenceCountry: at(drv, '@drivingLicenceCountry'), "
           "odometerReading: at(veh, '@odometerReading'), inspectionIdentifier: at(ins, '@inspectionIdentifier')}; "
           "var idj = null; "
           "if (idd.TransportUndertakingDetails != null) { var tud = one(idd.TransportUndertakingDetails); "
           "idj = {isVehicleHolder: 'transport_undertaking', transportUndertakingName: at(tud, '@transportUndertakingName'), communityLicenceNumber: at(tud, '@communityLicenceNumber'), address: addr(one(tud.TransportUndertakingAddress))}; } "
           "else if (idd.HolderDetails != null) { var hd = one(idd.HolderDetails); "
           "idj = {isVehicleHolder: 'owner', registrationCertificate: at(hd, '@registrationCertificate') === '' ? null : at(hd, '@registrationCertificate')}; "
           "if (hd.Company != null) { var co = one(hd.Company); idj.isNaturalPerson = 'company'; idj.companyName = at(co, '@companyName'); idj.address = addr(co); } "
           "else { var np = one(hd.NaturalPerson); idj.isNaturalPerson = 'natural_person'; idj.firstName = at(np, '@firstName'); idj.familyName = at(np, '@familyName'); idj.address = addr(np); } } "
           "if (idj != null) { out.identificationDetails = JSON.stringify(idj); } "
           "out.checkedItems = JSON.stringify(ar(one(bdy.CheckedItems).CheckedItem).map(function(it) { "
           "var ci = {itemType: pi(at(it, '@itemType')), itemFailed: xb(at(it, '@itemFailed'))}; "
           "if (it.FailedChecks != null) { ci.failedChecks = ar(one(it.FailedChecks).FailedCheck).map(function(fc) { "
           "var f = {failedReason: at(fc, '@failedReason'), failedAssessment: at(fc, '@failedAssessment')}; if (has(fc, '@isRectified')) { f.isRectified = xb(at(fc, '@isRectified')); } return f; }); } "
           "return ci; })); "
           "return out; })()")

# Header + Body of the answer, with the fixed correlation values taken from the request (Java ResponseValidator parity).
ANS_HDR = ("var s = function(v) { return v == null ? '' : String(v); }; var d = function(v, f) { var x = s(v); return x === '' ? f : x; }; ")
NCR_BUILD = ("(function() { var ans = inbound_json; " + ANS_HDR +
             "var body = {'@businessCaseId': d(ans.businessCaseId, business_case_id), '@originatingAuthority': d(ans.originatingAuthority, s(bdy['@originatingAuthority'])), "
             "'@respondingAuthority': '[#@@AUTH@@]', '@acknowledgementType': 'NCRN_Ack', '@statusCode': s(ans.statusCode)}; "
             "if (s(ans.statusMessage).trim() !== '') { body['@statusMessage'] = s(ans.statusMessage); } "
             "return {Header: {'@version': '3.5', '@technicalId': accepted.responseTechnicalId, '@workflowId': d(ans.workflowId, workflow_id), "
             "'@sentAt': d(ans.sentAt, new Date().toISOString().substring(0, 19) + 'Z'), '@from': 'EE', '@to': d(ans.to, from_state)}, Body: body}; })()")
RSI_BUILD = ("(function() { var ans = inbound_json; " + ANS_HDR +
             "var body = {'@businessCaseId': business_case_id, '@originatingAuthority': s(bdy['@originatingAuthority']), "
             "'@respondingAuthority': '[#@@AUTH@@]', '@statusCode': s(ans.statusCode)}; "
             "if (s(ans.statusMessage).trim() !== '') { body['@statusMessage'] = s(ans.statusMessage); } "
             "return {Header: {'@version': '3.5', '@technicalId': accepted.responseTechnicalId, '@workflowId': workflow_id, "
             "'@sentAt': new Date().toISOString().substring(0, 19) + 'Z', '@from': 'EE', '@to': from_state}, Body: body}; })()")

TYPES["NotifyCheckResult_Request"] = {
    "authority": "ERRU_RESPONDING_AUTHORITY_NCR",
    "flow": "ncr/inbound-request",
    "response": "NotifyCheckResult_Acknowledgement",
    "answer_check": "inbound_json.acknowledgementType === 'NCRN_Ack'",
    "map": NCR_MAP,
    "answer_ok": "inbound_json.statusCode === 'OK'",
    "build": NCR_BUILD,
}
TYPES["RoadSideInspection_Request"] = {
    "authority": "ERRU_RESPONDING_AUTHORITY_RSI",
    "flow": "rsi/inbound-request",
    "response": "RoadSideInspection_Response",
    "answer_check": "['OK', 'NotFound', 'InvalidData', 'ServerError', 'NotAvailable'].indexOf(inbound_json.statusCode) >= 0",
    "map": RSI_MAP,
    "answer_ok": "inbound_json.statusCode === 'OK' || inbound_json.statusCode === 'NotFound'",
    "build": RSI_BUILD,
}

# ---- CGR / CTUD: answered asynchronously (MTR takes up to 35 s) -------------------------------------------------------
BLANK = ("var s = function(v) { return v == null ? '' : String(v); }; var blank = function(v) { return v == null || String(v).trim() === ''; }; "
         "var ii = function(v) { var x = s(v).trim(); if (x === '') { return '0'; } var n = Number(x); return isNaN(n) ? '0' : String(Math.trunc(n)); }; "
         "var addr = function(a) { if (a == null || blank(a.address) || blank(a.postCode) || blank(a.city) || blank(a.country)) { return null; } "
         "return {'@address': s(a.address), '@postCode': s(a.postCode), '@city': s(a.city), '@country': s(a.country)}; }; "
         "var opt = function(o, k, v) { if (!blank(v)) { o[k] = s(v); } }; ")
HEADER_OUT = ("Header: {'@version': '3.5', '@technicalId': accepted.responseTechnicalId, '@workflowId': workflow_id, "
              "'@sentAt': new Date().toISOString().substring(0, 19) + 'Z', '@from': 'EE', '@to': from_state}")

CGR_MAP = ("(function() { " + HELP +
           "var stm = one(bdy.SearchedTransportManager); var nd = one(stm.TransportManagerNameDetails); var cd = one(stm.TransportManagerCertificateDetails); "
           "return {" + HDR_JS + ", tmFirstName: at(nd, '@firstName'), tmFamilyName: at(nd, '@familyName'), tmDateOfBirth: at(nd, '@dateOfBirth'), "
           "tmPlaceOfBirth: at(nd, '@placeOfBirth'), certificateNumber: at(cd, '@certificateNumber'), certificateIssueDate: at(cd, '@certificateIssueDate'), "
           "certificateIssueCountry: at(cd, '@certificateIssueCountry')}; })()")

CTUD_MAP = ("(function() { " + HELP +
            "var sc = one(bdy.SearchedCompany); "
            "var variant = sc.SearchByLicenceAndName != null ? one(sc.SearchByLicenceAndName) : (sc.SearchByLicenceAndVehicle != null ? one(sc.SearchByLicenceAndVehicle) : one(sc.SearchByNameAndVehicle)); "
            "var veh = one(variant.Vehicle); "
            "return {" + HDR_JS + ", transportUndertakingName: at(variant, '@transportUndertakingName'), communityLicenceNumber: at(variant, '@communityLicenceNumber'), "
            "vehicleRegistrationNumber: at(veh, '@vehicleRegistrationNumber'), vehicleRegistrationCountry: at(veh, '@vehicleRegistrationCountry'), "
            "requestAllVehicles: xb(at(sc, '@requestAllVehicles')) ? 'true' : 'false'}; })()")

LICENCE_STATUSES = "['Active', 'Suspended', 'Withdrawn', 'Expired', 'LostOrStolen', 'Annulled', 'Returned']"

CGR_BUILD = ("(function() { var ans = inbound_json; " + BLANK +
             "var licenceOk = " + LICENCE_STATUSES + "; "
             "var details = function(d) { var out = {'@respondingAuthority': blank(d.respondingAuthority) ? 'EE-TRAM' : s(d.respondingAuthority), '@searchMethod': blank(d.searchMethod) ? 'NYSIIS' : s(d.searchMethod)}; "
             "if (d.nameDetails != null) { var n = d.nameDetails; var no = {'@firstName': s(n.firstName), '@familyName': s(n.familyName), '@dateOfBirth': s(n.dateOfBirth)}; opt(no, '@placeOfBirth', n.placeOfBirth); out.TransportManagerNameDetails = no; } "
             "if (d.addressDetails != null) { var ad = addr(d.addressDetails); if (ad === null) { return null; } out.TransportManagerAddressDetails = ad; } "
             "if (d.certificateDetails != null) { var c = d.certificateDetails; var co = {'@certificateNumber': s(c.certificateNumber), '@certificateIssueDate': s(c.certificateIssueDate), "
             "'@certificateIssueCountry': s(c.certificateIssueCountry), '@certificateValidity': blank(c.certificateValidity) ? 'Valid' : s(c.certificateValidity)}; "
             "if (c.fitness != null) { var fo = {'@fitnessStatus': s(c.fitness.fitnessStatus)}; opt(fo, '@unfitStartDate', c.fitness.unfitStartDate); opt(fo, '@unfitEndDate', c.fitness.unfitEndDate); co.Fitness = fo; } "
             "out.TransportManagerCertificateDetails = co; } "
             "var tu = d.transportUndertakings; var tus = {'@totalManagedUndertakings': ii(tu == null ? null : tu.totalManagedUndertakings), '@totalManagedVehicles': ii(tu == null ? null : tu.totalManagedVehicles)}; "
             "if (tu != null && Array.isArray(tu.undertaking)) { var list = []; for (var i = 0; i < tu.undertaking.length; i++) { var u = tu.undertaking[i]; var ua = addr(u.address); "
             "if (blank(u.transportUndertakingName) || u.numberOfVehicles == null || blank(u.communityLicenceNumber) || u.communityLicenceStatus == null || licenceOk.indexOf(u.communityLicenceStatus) < 0 || ua === null) { return null; } "
             "list.push({'@transportUndertakingName': s(u.transportUndertakingName), '@numberOfVehicles': ii(u.numberOfVehicles), '@communityLicenceNumber': s(u.communityLicenceNumber), "
             "'@communityLicenceStatus': s(u.communityLicenceStatus), TransportUndertakingAddress: ua}); } if (list.length > 0) { tus.TransportUndertaking = list; } } "
             "out.TransportUndertakings = tus; return out; }; "
             "var st = s(ans.statusCode); var ms = {'@memberStateCode': 'EE', '@statusCode': st}; "
             "if (s(ans.statusMessage).trim() !== '') { ms['@statusMessage'] = s(ans.statusMessage); } "
             "if (st === 'Found' && ans.transportManagerDetails != null) { var det = details(ans.transportManagerDetails); if (det === null) { return null; } ms.TransportManagerDetails = det; } "
             "return {" + HEADER_OUT + ", Body: {'@businessCaseId': business_case_id, '@originatingAuthority': s(bdy['@originatingAuthority']), "
             "SearchedTransportManager: bdy.SearchedTransportManager, MemberState: ms}}; })()")

CTUD_BUILD = ("(function() { var ans = inbound_json; " + BLANK +
              "var licenceOk = " + LICENCE_STATUSES + "; var gt = String.fromCharCode(8804); "
              "var types = {CommunityLicencePassenger: 'Community licence for passenger transport', NationalLicencePassenger: 'National licence for passenger transport', "
              "CommunityLicenceGoods: 'Community licence for goods transport', CommunityLicenceGoodsLight: 'Community licence for goods transport, exclusively ' + gt + '3.5 t', "
              "NationalLicenceGoods: 'National licence for goods transport'}; "
              "var typeValues = Object.keys(types).map(function(k) { return types[k]; }); "
              "var licence = function(cl) { var tc = s(cl.communityLicenceType); var xt = typeValues.indexOf(tc) >= 0 ? tc : types[tc]; "
              "if (blank(cl.communityLicenceNumber) || blank(cl.startDate) || blank(cl.expiryDate) || blank(cl.licencingAuthority) || cl.communityLicenceStatus == null || licenceOk.indexOf(cl.communityLicenceStatus) < 0 || xt == null) { return null; } "
              "var o = {'@communityLicenceNumber': s(cl.communityLicenceNumber), '@communityLicenceStatus': s(cl.communityLicenceStatus), '@communityLicenceType': xt, '@startDate': s(cl.startDate), '@expiryDate': s(cl.expiryDate)}; "
              "opt(o, '@withdrawalDate', cl.withdrawalDate); opt(o, '@suspensionDate', cl.suspensionDate); opt(o, '@suspensionExpiryDate', cl.suspensionExpiryDate); "
              "opt(o, '@suspensionOrWithdrawalReason', cl.suspensionOrWithdrawalReason); o['@licencingAuthority'] = s(cl.licencingAuthority); return o; }; "
              "var copy = function(tc) { if (blank(tc.trueCopyNumber) || blank(tc.trueCopyIssueDate) || blank(tc.trueCopyExpiryDate)) { return null; } "
              "var o = {'@trueCopyNumber': s(tc.trueCopyNumber), '@trueCopyIssueDate': s(tc.trueCopyIssueDate), '@trueCopyExpiryDate': s(tc.trueCopyExpiryDate)}; "
              "opt(o, '@trueCopySuspensionDate', tc.trueCopySuspensionDate); opt(o, '@trueCopySuspensionExpiryDate', tc.trueCopySuspensionExpiryDate); "
              "opt(o, '@trueCopyWithdrawalDate', tc.trueCopyWithdrawalDate); return o; }; "
              "var found = function() { var a = addr(ans.address); if (blank(ans.transportUndertakingName) || ans.numberOfVehicles == null || ans.numberOfEmployees == null || a === null "
              "|| !Array.isArray(ans.communityLicenceDetails) || ans.communityLicenceDetails.length === 0) { return null; } "
              "var lic = []; for (var i = 0; i < ans.communityLicenceDetails.length; i++) { var l = licence(ans.communityLicenceDetails[i]); if (l === null) { return null; } lic.push(l); } "
              "var o = {'@transportUndertakingName': s(ans.transportUndertakingName)}; opt(o, '@legalForm', ans.legalForm); o['@numberOfVehicles'] = ii(ans.numberOfVehicles); "
              "o['@numberOfEmployees'] = ii(ans.numberOfEmployees); o['@riskRating'] = ii(ans.riskRating); o['@riskBand'] = ans.riskBand == null ? 'Grey' : s(ans.riskBand); "
              "o['@searchMethod'] = ans.searchMethod == null ? 'CommunityLicence' : s(ans.searchMethod); "
              "if (Array.isArray(ans.vehicleRegistrations) && ans.vehicleRegistrations.length > 0) { o.VehicleRegistrations = {Vehicle: ans.vehicleRegistrations.map(function(v) { return {'@vehicleRegistrationNumber': s(v), '@vehicleRegistrationCountry': 'EE'}; })}; } "
              "o.TransportUndertakingAddress = a; o.CommunityLicenceDetails = lic; "
              "if (Array.isArray(ans.certifiedTrueCopyDetails) && ans.certifiedTrueCopyDetails.length > 0) { var cps = []; for (var j = 0; j < ans.certifiedTrueCopyDetails.length; j++) { var c = copy(ans.certifiedTrueCopyDetails[j]); if (c === null) { return null; } cps.push(c); } o.CertifiedTrueCopyDetails = {CertifiedTrueCopy: cps}; } "
              "return o; }; "
              "var st = s(ans.statusCode); var body = {'@businessCaseId': business_case_id, '@originatingAuthority': s(bdy['@originatingAuthority']), "
              "'@respondingAuthority': blank(ans.respondingAuthority) ? '[#@@AUTH@@]' : s(ans.respondingAuthority), '@statusCode': st}; "
              "if (s(ans.statusMessage).trim() !== '') { body['@statusMessage'] = s(ans.statusMessage); } body.SearchedCompany = bdy.SearchedCompany; "
              "if (st === 'Found') { var tu = found(); if (tu === null) { return null; } body.TransportUndertaking = tu; } "
              "return {" + HEADER_OUT + ", Body: body}; })()")

SEARCH_CODES = "['Found', 'NotFound', 'InvalidData', 'Error', 'ServerError', 'NotAvailable']"
TYPES["CheckGoodRepute_Request"] = {
    "async": True, "broadcast": True, "flow": "cgr/inbound-request", "response": "CheckGoodRepute_Response",
    "answer_check": SEARCH_CODES + ".indexOf(inbound_json.statusCode) >= 0",
    "map": CGR_MAP, "answer_ok": "inbound_json.statusCode === 'Found' || inbound_json.statusCode === 'NotFound'", "build": CGR_BUILD,
}
TYPES["CheckTransportUndertakingData_Request"] = {
    "authority": "ERRU_RESPONDING_AUTHORITY_CTUD",
    "async": True, "flow": "ctud/inbound-request", "response": "CheckTransportUndertakingData_Response",
    "answer_check": SEARCH_CODES + ".indexOf(inbound_json.statusCode) >= 0",
    "map": CTUD_MAP, "answer_ok": "inbound_json.statusCode === 'Found' || inbound_json.statusCode === 'NotFound'", "build": CTUD_BUILD,
}
ASYNC_MESSAGES = [m for m, t in TYPES.items() if t.get("async")]

EN_BUILD = ("(function() { var msg = String(en_message || '').split(String.fromCharCode(10)).join(' ').trim(); if (msg.length > 400) { msg = msg.substring(0, 400); } "
            "msg = (msg === '' ? 'Unable to produce a business answer for this request' : msg) + ' (correlation id: inbox/' + accepted.inboxId + ')'; "
            "return {Header: {'@version': '3.5', '@technicalId': accepted.errorTechnicalId, '@workflowId': workflow_id, "
            "'@sentAt': new Date().toISOString().substring(0, 19) + 'Z', '@from': 'EE', '@to': 'EU'}, "
            "Body: {'@businessCaseId': business_case_id, '@statusCode': en_status, '@statusMessage': msg, OriginalMessage: raw_xml}}; })()")

TEMPLATE = '''# GENERATED by scripts/generate-erru-xtr-requests.py - edit the generator, not this file.
declaration:
  internal: false
  returns: []
  version: "1.0"
  description: "XTR (erru-xml-adapter) backend for the incoming @@MSG@@. Durably accepts it in erru.xml_inbox (idempotent by technicalId + SHA-256, 409 on a conflicting redelivery), calls /erru/@@FLOW@@, posts the @@RESPONSE@@ to the Hub through XTR (/xml-out) and closes the inbox row. A request that cannot get a business answer is answered with an ErrorNotification (InvalidData for a wrong recipient or a rejected request, ServerError otherwise). 202 = handled, 503 = transient, the Hub redelivers."
  namespace: erru
  allowlist:
    body:
      - field: request
        type: object
      - field: sha256
        type: string
      - field: rawXml
        type: string

extractEnvelope:
  assign:
    xtr_req: "${incoming.body.request || {}}"
    raw_xml: "${incoming.body.rawXml || ''}"
    digest: "${incoming.body.sha256 || ''}"
  next: extractHeader

extractHeader:
  assign:
    hdr: "${xtr_req.Header || {}}"
    bdy: "${xtr_req.Body || {}}"
  next: extractIds

extractIds:
  assign:
    technical_id: "${hdr['@technicalId'] || ''}"
    workflow_id: "${hdr['@workflowId'] || ''}"
    to_state: "${hdr['@to'] || ''}"
    from_state: "${hdr['@from'] || ''}"
    business_case_id: "${bdy['@businessCaseId'] || ''}"
    deadline_iso: "${hdr['@timeoutValue'] && !isNaN(Date.parse(hdr['@timeoutValue'])) ? new Date(Date.parse(hdr['@timeoutValue'])).toISOString() : ''}"
  next: checkEnvelope

checkEnvelope:
  switch:
    - condition: ${!technical_id || !raw_xml || !digest}
      next: returnBadEnvelope
    - condition: ${!(/^[0-9a-f-]+$/i.test(technical_id) && technical_id.split('-').map(p => p.length).join() === '8,4,4,4,12') || (workflow_id && !(/^[0-9a-f-]+$/i.test(workflow_id) && workflow_id.split('-').map(p => p.length).join() === '8,4,4,4,12')) || business_case_id.length > 200}
      next: returnBadEnvelope
  next: accept

accept:
  call: http.post
  args:
    url: "[#LJVIS_RESQL]/erru/xml-inbox/accept"
    headers:
      Authorization: "Bearer [#RESQL_INTER_SERVICE_TOKEN]"
      x-internal-service-token: "[#INTERNAL_COMMUNICATION_KEY]"
      type: json
    body:
      messageType: "@@MSG@@"
      technicalId: ${technical_id}
      workflowId: ${workflow_id}
      businessCaseId: ${business_case_id}
      transportPeer: ${from_state}
      rawXml: ${raw_xml}
      digest: ${digest}
      deadlineAt: ${deadline_iso}
  result: accept_res
  error: returnUnavailable
  next: parseAccepted

parseAccepted:
  assign:
    accepted: "${accept_res.response.body != null && accept_res.response.body.length === 1 ? JSON.parse(accept_res.response.body[0].result) : null}"
  next: decideAccepted

decideAccepted:
  switch:
    - condition: ${accepted == null}
      next: returnUnavailable
    - condition: ${accepted.digestMatches !== true}
      next: returnConflict
    - condition: ${accepted.status === 'processed'}
      next: returnHandled
    - condition: ${accepted.claimed !== true}
      next: returnBusy
    - condition: ${accepted.attempts > 10}
      next: enBudget
    - condition: ${@@WRONG_TO@@}
      next: enWrongRecipient
  next: mapBody

enBudget:
  assign:
    en_status: "ServerError"
    en_message: "Processing attempt budget exhausted"
    en_complete: false
  next: buildEn

enWrongRecipient:
  assign:
    en_status: "InvalidData"
    en_message: "Request is not addressed to this member state"
    en_complete: true
  next: buildEn

mapBody:
  assign:
    inbound_body: "${@@MAP@@}"
  next: preCallDeadline

# The Hub's response window already closed: do not spend an MTR call on an answer nobody can receive.
preCallDeadline:
  switch:
    - condition: ${accepted.deadlineAtMs != null && accepted.deadlineAtMs <= new Date().getTime()}
      next: markExpired
  next: callInbound

callInbound:
  call: http.post
  error: markRetry
  args:
    url: "[#LJVIS_RUUTER_INTERNAL]/erru/@@FLOW@@"
    headers:
      x-internal-service-token: "[#INTERNAL_COMMUNICATION_KEY]"
      type: json
    body: ${inbound_body}
  result: inbound_res
  timeout: @@CALL_TIMEOUT@@
  next: classify

# A 5xx / 408 / 429 / no response is transient whatever the body says (a flow answers 502 + statusCode ServerError/Error when MTR
# is down, the Hub must be able to retry). Below that a flow answer is recognised by its content: a business rejection can arrive on a 4xx.
classify:
  assign:
    inbound_status: "${inbound_res.response == null ? 0 : inbound_res.response.status}"
    inbound_json: "${inbound_res.response == null || inbound_res.response.body == null ? {} : (typeof inbound_res.response.body === 'string' ? JSON.parse(inbound_res.response.body) : (inbound_res.response.body.response != null && typeof inbound_res.response.body.response === 'object' ? inbound_res.response.body.response : inbound_res.response.body))}"
  next: decideInbound

decideInbound:
  switch:
    - condition: ${inbound_status === 0 || inbound_status === 408 || inbound_status === 429 || inbound_status >= 500}
      next: markRetry
    - condition: ${@@ANSWER_CHECK@@}
      next: checkAnswerStatus
  next: enUnrecognised

enUnrecognised:
  assign:
    en_status: "ServerError"
    en_message: "Unable to produce a business answer for this request"
    en_complete: false
  next: buildEn

checkAnswerStatus:
  switch:
    - condition: ${@@ANSWER_OK@@}
      next: checkDeadline
    - condition: ${inbound_json.statusCode === 'InvalidData'}
      next: enRejected
  next: enUnrecognised

enRejected:
  assign:
    en_status: "InvalidData"
    en_message: "${inbound_json.statusMessage || 'Request rejected as invalid data'}"
    en_complete: true
  next: buildEn

# The Hub's own response window: an answer built after it is not delivered (the business effects are already done).
checkDeadline:
  switch:
    - condition: ${accepted.deadlineAtMs != null && accepted.deadlineAtMs <= new Date().getTime()}
      next: markExpired
  next: buildAnswer

buildAnswer:
  assign:
    answer_body: "${@@BUILD@@}"
  next: checkBuilt

# A Found answer that cannot be translated to ERRU 3.5 completely and truthfully is our own failure: never a guessed value
# or a synthetic NotAvailable, but an ErrorNotification (build returns null).
checkBuilt:
  switch:
    - condition: ${answer_body == null}
      next: enUntranslatable
  next: sendAnswer

enUntranslatable:
  assign:
    en_status: "ServerError"
    en_message: "Found record could not be fully and accurately translated to the ERRU 3.5 format"
    en_complete: false
  next: buildEn

sendAnswer:
  call: http.post
  error: markRetry
  args:
    url: "${('[#ERRU_XTR_BRIDGE]'.indexOf('ERRU_XTR_BRIDGE') >= 0 ? 'http://erru-xml-adapter:8080' : '[#ERRU_XTR_BRIDGE]') + '/xml-out/erru/erru/@@RESPONSE@@'}"
    headers:
      type: json
      x-internal-service-token: "[#INTERNAL_COMMUNICATION_KEY]"
    body: ${answer_body}
  result: out_res
  timeout: 20000
  next: checkSent

# XTR answers 200 with the Hub's own HTTP status in body.status (2xx = delivered). 4xx / 422 schema_invalid: the Hub (or
# XSD) rejects this exact answer, retrying the same bytes cannot help -> failed for manual recovery. Anything else: retry.
checkSent:
  switch:
    - condition: ${out_res.response != null && out_res.response.status === 200 && out_res.response.body != null && out_res.response.body.status >= 200 && out_res.response.body.status < 300}
      next: markProcessed
    - condition: ${out_res.response != null && (out_res.response.status === 422 || (out_res.response.status === 200 && out_res.response.body != null && out_res.response.body.status >= 400 && out_res.response.body.status < 500))}
      next: markFailed
  next: markRetry

buildEn:
  assign:
    en_body: "${@@EN_BUILD@@}"
  next: sendEn

sendEn:
  call: http.post
  error: markRetry
  args:
    url: "${('[#ERRU_XTR_BRIDGE]'.indexOf('ERRU_XTR_BRIDGE') >= 0 ? 'http://erru-xml-adapter:8080' : '[#ERRU_XTR_BRIDGE]') + '/xml-out/erru/erru/ErrorNotification'}"
    headers:
      type: json
      x-internal-service-token: "[#INTERNAL_COMMUNICATION_KEY]"
    body: ${en_body}
  result: en_res
  timeout: 20000
  next: checkEnSent

checkEnSent:
  switch:
    - condition: ${en_res.response != null && en_res.response.status === 200 && en_res.response.body != null && en_res.response.body.status >= 200 && en_res.response.body.status < 300}
      next: afterEn
    - condition: ${en_res.response != null && (en_res.response.status === 422 || (en_res.response.status === 200 && en_res.response.body != null && en_res.response.body.status >= 400 && en_res.response.body.status < 500))}
      next: markFailed
  next: markRetry

afterEn:
  switch:
    - condition: ${en_complete === true}
      next: markProcessed
  next: markFailed

markProcessed:
  call: http.post
  args:
    url: "[#LJVIS_RESQL]/erru/xml-inbox/finish"
    headers:
      Authorization: "Bearer [#RESQL_INTER_SERVICE_TOKEN]"
      x-internal-service-token: "[#INTERNAL_COMMUNICATION_KEY]"
      type: json
    body:
      inboxId: ${accepted.inboxId}
      attempts: ${accepted.attempts}
      outcome: "processed"
      error: ""
  result: finish_res
  error: returnHandled
  next: returnHandled

markExpired:
  call: http.post
  args:
    url: "[#LJVIS_RESQL]/erru/xml-inbox/finish"
    headers:
      Authorization: "Bearer [#RESQL_INTER_SERVICE_TOKEN]"
      x-internal-service-token: "[#INTERNAL_COMMUNICATION_KEY]"
      type: json
    body:
      inboxId: ${accepted.inboxId}
      attempts: ${accepted.attempts}
      outcome: "processed"
      error: "response deadline passed, answer not delivered"
  result: expired_res
  error: returnHandled
  next: returnHandled

markRetry:
  call: http.post
  args:
    url: "[#LJVIS_RESQL]/erru/xml-inbox/finish"
    headers:
      Authorization: "Bearer [#RESQL_INTER_SERVICE_TOKEN]"
      x-internal-service-token: "[#INTERNAL_COMMUNICATION_KEY]"
      type: json
    body:
      inboxId: ${accepted.inboxId}
      attempts: ${accepted.attempts}
      outcome: "@@RETRY@@"
      error: "inbound flow or XTR unavailable, transient failure"
  result: retry_res
  error: returnUnavailable
  next: returnUnavailable

markFailed:
  call: http.post
  args:
    url: "[#LJVIS_RESQL]/erru/xml-inbox/finish"
    headers:
      Authorization: "Bearer [#RESQL_INTER_SERVICE_TOKEN]"
      x-internal-service-token: "[#INTERNAL_COMMUNICATION_KEY]"
      type: json
    body:
      inboxId: ${accepted.inboxId}
      attempts: ${accepted.attempts}
      outcome: "failed"
      error: "${typeof en_message === 'undefined' ? 'answer rejected by the Hub or XSD, needs manual recovery' : 'ErrorNotification sent: ' + en_message}"
  result: failed_res
  error: returnHandled
  next: returnHandled

returnHandled:
  status: 202
  return: '{"status":"accepted"}'
  next: end

returnBadEnvelope:
  status: 400
  return: '{"error":"bad_envelope"}'
  next: end

returnConflict:
  status: 409
  return: '{"error":"conflicting_technical_id"}'
  next: end

returnBusy:
  status: 503
  return: '{"error":"processing_in_progress"}'
  next: end

returnUnavailable:
  status: 503
  return: '{"error":"unavailable"}'
  next: end
'''


ASYNC_REQUEST = '''# GENERATED by scripts/generate-erru-xtr-requests.py - edit the generator, not this file.
declaration:
  internal: false
  returns: []
  version: "1.0"
  description: "XTR (erru-xml-adapter) backend for the incoming @@MSG@@. Answered asynchronously (MTR takes up to 35 s, longer than a safe Hub HTTP wait): durably accepts the request in erru.xml_inbox (idempotent by technicalId + SHA-256, 409 on a conflicting redelivery), parks it for the cron worker (cron/erru-xtr-async-requests -> xtr/worker/@@MSG@@) and returns 202 at once. 202 = durably accepted, 503 = not stored, the Hub redelivers."
  namespace: erru
  allowlist:
    body:
      - field: request
        type: object
      - field: sha256
        type: string
      - field: rawXml
        type: string

extractEnvelope:
  assign:
    xtr_req: "${incoming.body.request || {}}"
    raw_xml: "${incoming.body.rawXml || ''}"
    digest: "${incoming.body.sha256 || ''}"
  next: extractHeader

extractHeader:
  assign:
    hdr: "${xtr_req.Header || {}}"
    bdy: "${xtr_req.Body || {}}"
  next: extractIds

extractIds:
  assign:
    technical_id: "${hdr['@technicalId'] || ''}"
    workflow_id: "${hdr['@workflowId'] || ''}"
    from_state: "${hdr['@from'] || ''}"
    business_case_id: "${bdy['@businessCaseId'] || ''}"
    deadline_iso: "${hdr['@timeoutValue'] && !isNaN(Date.parse(hdr['@timeoutValue'])) ? new Date(Date.parse(hdr['@timeoutValue'])).toISOString() : ''}"
    request_json: "${JSON.stringify(xtr_req)}"
  next: checkEnvelope

checkEnvelope:
  switch:
    - condition: ${!technical_id || !raw_xml || !digest}
      next: returnBadEnvelope
    - condition: ${!(/^[0-9a-f-]+$/i.test(technical_id) && technical_id.split('-').map(p => p.length).join() === '8,4,4,4,12') || (workflow_id && !(/^[0-9a-f-]+$/i.test(workflow_id) && workflow_id.split('-').map(p => p.length).join() === '8,4,4,4,12')) || business_case_id.length > 200}
      next: returnBadEnvelope
  next: accept

accept:
  call: http.post
  args:
    url: "[#LJVIS_RESQL]/erru/xml-inbox/accept"
    headers:
      Authorization: "Bearer [#RESQL_INTER_SERVICE_TOKEN]"
      x-internal-service-token: "[#INTERNAL_COMMUNICATION_KEY]"
      type: json
    body:
      messageType: "@@MSG@@"
      technicalId: ${technical_id}
      workflowId: ${workflow_id}
      businessCaseId: ${business_case_id}
      transportPeer: ${from_state}
      rawXml: ${raw_xml}
      digest: ${digest}
      deadlineAt: ${deadline_iso}
      async: "true"
      requestJson: ${request_json}
  result: accept_res
  error: returnUnavailable
  next: parseAccepted

parseAccepted:
  assign:
    accepted: "${accept_res.response.body != null && accept_res.response.body.length === 1 ? JSON.parse(accept_res.response.body[0].result) : null}"
  next: decideAccepted

# Already queued, being worked on or answered: the redelivery is simply acknowledged (the worker owns the answer).
decideAccepted:
  switch:
    - condition: ${accepted == null}
      next: returnUnavailable
    - condition: ${accepted.digestMatches !== true}
      next: returnConflict
  next: returnQueued

returnQueued:
  status: 202
  return: '{"status":"accepted"}'
  next: end

returnBadEnvelope:
  status: 400
  return: '{"error":"bad_envelope"}'
  next: end

returnConflict:
  status: 409
  return: '{"error":"conflicting_technical_id"}'
  next: end

returnUnavailable:
  status: 503
  return: '{"error":"unavailable"}'
  next: end
'''

WORKER_HEAD = '''# GENERATED by scripts/generate-erru-xtr-requests.py - edit the generator, not this file.
declaration:
  internal: false
  returns: []
  version: "1.0"
  description: "Cron worker step for one parked @@MSG@@ (cron/erru-xtr-async-requests claims the erru.xml_inbox row, xml-inbox/claim-due, and calls this flow). Calls /erru/@@FLOW@@, posts the @@RESPONSE@@ to the Hub through XTR (/xml-out) and closes the inbox row. A request that cannot get a business answer is answered with an ErrorNotification (InvalidData for a wrong recipient or a rejected request, ServerError otherwise). A transient failure puts the row back in the async queue (xml-inbox/finish requeue, due in 30 s)."
  namespace: erru
  allowlist:
    body:
      - field: inboxId
        type: number
      - field: attempts
        type: number
      - field: requestJson
        type: string
      - field: rawXml
        type: string
      - field: receivedAt
        type: string
      - field: deadlineAtMs
        type: number
      - field: responseTechnicalId
        type: string
      - field: errorTechnicalId
        type: string

extractEnvelope:
  assign:
    xtr_req: "${JSON.parse(incoming.body.requestJson || '{}')}"
    raw_xml: "${incoming.body.rawXml || ''}"
    accepted: "${({inboxId: incoming.body.inboxId, attempts: incoming.body.attempts, receivedAt: incoming.body.receivedAt, deadlineAtMs: incoming.body.deadlineAtMs, responseTechnicalId: incoming.body.responseTechnicalId, errorTechnicalId: incoming.body.errorTechnicalId})}"
  next: extractHeader

extractHeader:
  assign:
    hdr: "${xtr_req.Header || {}}"
    bdy: "${xtr_req.Body || {}}"
  next: extractIds

extractIds:
  assign:
    workflow_id: "${hdr['@workflowId'] || ''}"
    to_state: "${hdr['@to'] || ''}"
    from_state: "${hdr['@from'] || ''}"
    business_case_id: "${bdy['@businessCaseId'] || ''}"
  next: decideAccepted

decideAccepted:
  switch:
    - condition: ${accepted.attempts > 10}
      next: enBudget
    - condition: ${@@WRONG_TO@@}
      next: enWrongRecipient
  next: mapBody

'''

CRON_FLOW = '''# GENERATED by scripts/generate-erru-xtr-requests.py - edit the generator, not this file.
declaration:
  internal: false
  returns: []
  version: "1.0"
  description: "Cron worker for the asynchronously answered ERRU requests (CGR, CTUD): claims the oldest due parked row (xml-inbox/claim-due) and runs xtr/worker/<message> for it. One row per tick; CronManager calls it every 5 seconds (DSL/CronManager/erru-xtr-async-requests.yaml). Nothing due = no-op."
  namespace: cron
  allowlist:
    body: []

claim:
  call: http.post
  args:
    url: "[#LJVIS_RESQL]/erru/xml-inbox/claim-due"
    headers:
      Authorization: "Bearer [#RESQL_INTER_SERVICE_TOKEN]"
      x-internal-service-token: "[#INTERNAL_COMMUNICATION_KEY]"
      type: json
    body:
      messageTypes: "@@TYPES@@"
  result: claim_res
  error: returnIdle
  next: parseClaimed

parseClaimed:
  assign:
    claimed: "${claim_res.response.body != null && claim_res.response.body.length === 1 ? JSON.parse(claim_res.response.body[0].result) : null}"
  next: decideClaimed

decideClaimed:
  switch:
    - condition: ${claimed == null}
      next: returnIdle
  next: callWorker

callWorker:
  call: http.post
  error: returnDone
  args:
    url: "${'[#LJVIS_RUUTER_INTERNAL]/erru/xtr/worker/' + claimed.messageType}"
    headers:
      x-internal-service-token: "[#INTERNAL_COMMUNICATION_KEY]"
      type: json
    body:
      inboxId: ${claimed.inboxId}
      attempts: ${claimed.attempts}
      requestJson: ${claimed.requestJson}
      rawXml: ${claimed.rawXml}
      receivedAt: ${claimed.receivedAt}
      deadlineAtMs: ${claimed.deadlineAtMs}
      responseTechnicalId: ${claimed.responseTechnicalId}
      errorTechnicalId: ${claimed.errorTechnicalId}
  result: worker_res
  timeout: 150000
  next: returnDone

returnIdle:
  status: 200
  return: '{"status":"idle"}'
  next: end

returnDone:
  status: 200
  return: '{"status":"done"}'
  next: end
'''

CRON_YAML = '''# Asynchronously answered ERRU requests (CGR, CTUD): picks up one parked erru.xml_inbox row per tick.
# Generated by scripts/generate-erru-xtr-requests.py.
erru_xtr_async_requests:
  trigger: "*/5 * * * * ?"
  type: http
  method: POST
  url: http://ruuter-internal:8080/ljvis/cron/erru-xtr-async-requests
  headerEnvs:
    x-internal-service-token: INTERNAL_COMMUNICATION_KEY
  retryCount: 0
  ignoreFailures: true
'''

# Async worker: a transient failure goes back to the queue, unless the Hub's response window has closed by now (then the
# answer can no longer be delivered: close the row).
REQUEUE = "${accepted.deadlineAtMs != null && accepted.deadlineAtMs <= new Date().getTime() ? 'processed' : 'requeue'}"

WORKER_OUT = ROOT / "DSL/Ruuter.internal/ljvis/POST/erru/xtr/worker"


def fill(tpl, msg, t, retry):
    return (tpl.replace("@@MSG@@", msg).replace("@@FLOW@@", t["flow"]).replace("@@RESPONSE@@", t["response"])
            .replace("@@MAP@@", t["map"]).replace("@@ANSWER_CHECK@@", t["answer_check"]).replace("@@ANSWER_OK@@", t["answer_ok"])
            .replace("@@BUILD@@", t["build"]).replace("@@EN_BUILD@@", EN_BUILD).replace("@@RETRY@@", retry)
            .replace("@@AUTH@@", t.get("authority", "ERRU_RESPONDING_AUTHORITY"))
            .replace("@@CALL_TIMEOUT@@", "45000" if t.get("async") else "20000")
            .replace("@@WRONG_TO@@", "to_state !== 'EE' && to_state !== 'ZZ'" if t.get("broadcast") else "to_state !== 'EE'"))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    common = TEMPLATE[TEMPLATE.index("enBudget:"):]
    # the worker has no envelope / conflict / busy outcome
    for step in ("returnBadEnvelope", "returnConflict", "returnBusy"):
        a = common.index(f"\n{step}:\n"); b = common.index("\n\n", a + 1)
        common = common[:a] + common[b:]
    for msg, t in TYPES.items():
        assert '"' not in t["map"] + t["build"] + EN_BUILD, msg
        if t.get("async"):
            (OUT / f"{msg}.yml").write_text(ASYNC_REQUEST.replace("@@MSG@@", msg))
            WORKER_OUT.mkdir(parents=True, exist_ok=True)
            (WORKER_OUT / f"{msg}.yml").write_text(fill(WORKER_HEAD + common, msg, t, REQUEUE))
        else:
            (OUT / f"{msg}.yml").write_text(fill(TEMPLATE, msg, t, "retry"))
        print("wrote", f"{msg}.yml")
    cron = ROOT / "DSL/Ruuter.internal/ljvis/POST/cron/erru-xtr-async-requests.yml"
    cron.write_text(CRON_FLOW.replace("@@TYPES@@", ",".join(ASYNC_MESSAGES)))
    (ROOT / "DSL/CronManager/erru-xtr-async-requests.yaml").write_text(CRON_YAML)


if __name__ == "__main__":
    main()
