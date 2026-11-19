#!/usr/bin/env python3
"""Generates DSL/Ruuter.internal/ljvis/POST/erru/xtr/inbound/<Message>.yml: the backend routes XTR's raw-XML lane
(docker/erru-xml-adapter, `inbound.backend`) POSTs to for the one-way ERRU messages (acknowledgements and responses).

Each route (1) durably accepts the message in erru.xml_inbox (xml-inbox/accept: idempotent by technicalId + SHA-256,
409 on a conflicting redelivery), (2) maps XTR's XSD-shaped JSON to the body the existing /erru/*/inbound-* flow
expects (same JSON the Java adapter's *Mapper.requestToJson built; parity: tests/erru-adapter/xtr_inbound_golden.py),
(3) calls that flow and (4) closes the inbox row. A transient failure answers 503 (XTR relays 502, the Hub redelivers,
the exact redelivery takes the claim over); a permanent one marks the row failed (manual recovery) and still answers 202
as the Java adapter did. Re-run after editing: python3 scripts/generate-erru-xtr-inbound.py
"""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "DSL/Ruuter.internal/ljvis/POST/erru/xtr/inbound"

H = ("var arr = function(x) { return x == null ? [] : (Array.isArray(x) ? x : [x]); }; "
     "var at = function(o, k) { return (o && o[k] != null) ? String(o[k]) : ''; }; "
     "var num = function(v) { return v == null || v === '' ? null : parseInt(v, 10); }; "
     "var bool = function(v) { return v === true || v === 'true' || v === '1' || v === 1; }; "
     "var attrs = function(o, names) { var out = {}; names.forEach(function(n) { var v = at(o, '@' + n); if (v.trim() !== '') { out[n] = v; } }); return out; }; "
     "var hdr = xtr_req.Header || {}; var body = xtr_req.Body || {}; ")

def expr(js):
    return "${(function() { " + H + js + " })()}"

MAPS = {
"NotifyUnfitness_Acknowledgement": ("nu/inbound-ack", expr(
 "return {workflowId: at(hdr, '@workflowId'), technicalId: at(hdr, '@technicalId'), from: at(hdr, '@from'), businessCaseId: at(body, '@businessCaseId'), "
 "memberStates: JSON.stringify(arr(body.MemberState).map(function(s) { return attrs(s, ['memberStateCode', 'respondingAuthority', 'statusCode', 'statusMessage']); }))};")),
"NotifyCheckResult_Acknowledgement": ("ncr/inbound-ack", expr(
 "return {workflowId: at(hdr, '@workflowId'), businessCaseId: at(body, '@businessCaseId'), acknowledgementType: at(body, '@acknowledgementType'), statusCode: at(body, '@statusCode'), statusMessage: at(body, '@statusMessage')};")),
"NotifyCheckResult_Response": ("ncr/inbound-response", expr(
 "var out = {workflowId: at(hdr, '@workflowId'), businessCaseId: at(body, '@businessCaseId'), statusCode: at(body, '@statusCode'), statusMessage: at(body, '@statusMessage'), respondingAuthority: at(body, '@respondingAuthority')}; "
 "var tu = body.TransportUndertaking; "
 "if (tu) { out.transportUndertakingName = at(tu, '@transportUndertakingName'); out.numberOfVehicles = at(tu, '@numberOfVehicles'); out.communityLicenceStatus = at(tu, '@communityLicenceStatus'); "
 "out.address = JSON.stringify(attrs(tu.TransportUndertakingAddress, ['address', 'postCode', 'city', 'country'])); } "
 "out.penaltiesImposed = JSON.stringify(arr((body.PenaltiesImposed || {}).PenaltyImposed).map(function(p) { "
 "var o = {penaltyRequestedIdentifier: num(at(p, '@penaltyRequestedIdentifier')), authorityImposingPenalty: at(p, '@authorityImposingPenalty'), isImposed: bool(at(p, '@isImposed')), penaltyTypeImposed: at(p, '@penaltyTypeImposed')}; "
 "return Object.assign(o, attrs(p, ['startDate', 'endDate', 'reason'])); })); return out;")),
"RoadSideInspection_Response": ("rsi/inbound-response", expr(
 "return {workflowId: at(hdr, '@workflowId'), responseStatusCode: at(body, '@statusCode'), responseStatusMessage: at(body, '@statusMessage')};")),
"CheckGoodRepute_Response": ("cgr/inbound-response", expr(
 "var addr = function(o) { return attrs(o, ['address', 'postCode', 'city', 'country']); }; "
 "var manager = function(m) { var out = {respondingAuthority: at(m, '@respondingAuthority'), searchMethod: at(m, '@searchMethod')}; "
 "if (m.TransportManagerNameDetails) { out.nameDetails = attrs(m.TransportManagerNameDetails, ['firstName', 'familyName', 'dateOfBirth', 'placeOfBirth']); } "
 "if (m.TransportManagerAddressDetails) { out.addressDetails = addr(m.TransportManagerAddressDetails); } "
 "var cert = m.TransportManagerCertificateDetails; "
 "if (cert) { var c = attrs(cert, ['certificateNumber', 'certificateIssueDate', 'certificateIssueCountry', 'certificateValidity']); if (cert.Fitness) { c.fitness = attrs(cert.Fitness, ['fitnessStatus', 'unfitStartDate', 'unfitEndDate']); } out.certificateDetails = c; } "
 "var us = m.TransportUndertakings; "
 "if (us) { out.transportUndertakings = {totalManagedUndertakings: num(at(us, '@totalManagedUndertakings')), totalManagedVehicles: num(at(us, '@totalManagedVehicles')), undertaking: arr(us.TransportUndertaking).map(function(e) { "
 "var item = attrs(e, ['transportUndertakingName', 'communityLicenceNumber', 'communityLicenceStatus']); item.numberOfVehicles = num(at(e, '@numberOfVehicles')); if (e.TransportUndertakingAddress) { item.address = addr(e.TransportUndertakingAddress); } return item; })}; } "
 "return out; }; "
 "return {workflowId: at(hdr, '@workflowId'), businessCaseId: at(body, '@businessCaseId'), memberStates: JSON.stringify(arr(body.MemberState).map(function(s) { "
 "var out = {memberStateCode: at(s, '@memberStateCode'), statusCode: at(s, '@statusCode')}; Object.assign(out, attrs(s, ['statusMessage'])); "
 "var ms = arr(s.TransportManagerDetails); if (ms.length > 0) { out.transportManagerDetails = manager(ms[0]); if (ms.length > 1) { out.additionalTransportManagerDetails = ms.slice(1).map(manager); } } return out; }))};")),
"CheckTransportUndertakingData_Response": ("ctud/inbound-response", expr(
 "var addr = function(o) { return attrs(o, ['address', 'postCode', 'city', 'country']); }; "
 "var types = {'Community licence for passenger transport': 'CommunityLicencePassenger', 'National licence for passenger transport': 'NationalLicencePassenger', 'Community licence for goods transport': 'CommunityLicenceGoods', 'Community licence for goods transport, exclusively \\u22643.5 t': 'CommunityLicenceGoodsLight', 'National licence for goods transport': 'NationalLicenceGoods'}; "
 "var undertaking = function(e) { var out = attrs(e, ['transportUndertakingName', 'legalForm']); out.numberOfEmployees = num(at(e, '@numberOfEmployees')); out.numberOfVehicles = num(at(e, '@numberOfVehicles')); out.riskRating = num(at(e, '@riskRating')); out.riskBand = at(e, '@riskBand'); out.searchMethod = at(e, '@searchMethod'); "
 "if (e.TransportUndertakingAddress) { out.address = addr(e.TransportUndertakingAddress); } "
 "out.communityLicenceDetails = arr(e.CommunityLicenceDetails).map(function(l) { var o = attrs(l, ['communityLicenceNumber', 'communityLicenceStatus', 'startDate', 'expiryDate', 'withdrawalDate', 'suspensionDate', 'suspensionExpiryDate', 'suspensionOrWithdrawalReason', 'licencingAuthority']); var t = at(l, '@communityLicenceType'); o.communityLicenceType = types[t] || t; return o; }); "
 "if (e.CertifiedTrueCopyDetails) { out.certifiedTrueCopyDetails = arr(e.CertifiedTrueCopyDetails.CertifiedTrueCopy).map(function(c) { return attrs(c, ['trueCopyNumber', 'trueCopyIssueDate', 'trueCopyExpiryDate', 'trueCopySuspensionDate', 'trueCopySuspensionExpiryDate', 'trueCopyWithdrawalDate']); }); } "
 "if (e.VehicleRegistrations) { out.vehicleRegistrations = arr(e.VehicleRegistrations.Vehicle).map(function(v) { return at(v, '@vehicleRegistrationNumber'); }); } return out; }; "
 "var us = arr(body.TransportUndertaking); var content = ''; "
 "if (us.length > 0) { var first = undertaking(us[0]); if (us.length > 1) { first.otherTransportUndertakings = us.slice(1).map(undertaking); } content = JSON.stringify(first); } "
 "return {workflowId: at(hdr, '@workflowId'), businessCaseId: at(body, '@businessCaseId'), respondingAuthority: at(body, '@respondingAuthority'), responseStatusCode: at(body, '@statusCode'), responseStatusMessage: at(body, '@statusMessage'), responseContent: content};")),
}

TEMPLATE = '''# GENERATED by scripts/generate-erru-xtr-inbound.py - edit the generator, not this file.
declaration:
  internal: false
  returns: []
  version: "1.0"
  description: "XTR (erru-xml-adapter) backend for the one-way {msg}. Durably accepts it in erru.xml_inbox (idempotent by technicalId + SHA-256, 409 on a conflicting redelivery), maps XTR's XSD-shaped JSON to the body of /erru/{flow} and closes the inbox row. 202 = handled (or permanently failed, row marked failed for manual recovery), 503 = transient, the Hub redelivers. Wrong recipient (Header/@to is not EE) = 422."
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
    xtr_req: "${{incoming.body.request || {{}}}}"
    raw_xml: "${{incoming.body.rawXml || ''}}"
    digest: "${{incoming.body.sha256 || ''}}"
  next: extractHeader

extractHeader:
  assign:
    hdr: "${{xtr_req.Header || {{}}}}"
    bdy: "${{xtr_req.Body || {{}}}}"
  next: extractIds

extractIds:
  assign:
    technical_id: "${{hdr['@technicalId'] || ''}}"
    workflow_id: "${{hdr['@workflowId'] || ''}}"
    to_state: "${{hdr['@to'] || ''}}"
    from_state: "${{hdr['@from'] || ''}}"
    business_case_id: "${{bdy['@businessCaseId'] || ''}}"
  next: checkEnvelope

checkEnvelope:
  switch:
    - condition: ${{!technical_id || !raw_xml || !digest}}
      next: returnBadEnvelope
    - condition: ${{!(/^[0-9a-f-]+$/i.test(technical_id) && technical_id.split('-').map(p => p.length).join() === '8,4,4,4,12') || (workflow_id && !(/^[0-9a-f-]+$/i.test(workflow_id) && workflow_id.split('-').map(p => p.length).join() === '8,4,4,4,12')) || business_case_id.length > 36 || from_state.length > 100}}
      next: returnBadEnvelope
    - condition: ${{to_state !== 'EE'}}
      next: returnWrongRecipient
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
      messageType: "{msg}"
      technicalId: ${{technical_id}}
      workflowId: ${{workflow_id}}
      businessCaseId: ${{business_case_id}}
      transportPeer: ${{from_state}}
      rawXml: ${{raw_xml}}
      digest: ${{digest}}
      requestJson: ${{JSON.stringify(xtr_req)}}
  result: accept_res
  error: returnUnavailable
  next: parseAccepted

parseAccepted:
  assign:
    accepted: "${{accept_res.response.body != null && accept_res.response.body.length === 1 ? JSON.parse(accept_res.response.body[0].result) : null}}"
  next: decideAccepted

decideAccepted:
  switch:
    - condition: ${{accepted == null}}
      next: returnUnavailable
    - condition: ${{accepted.digestMatches !== true}}
      next: returnConflict
    - condition: ${{accepted.status === 'processed'}}
      next: returnHandled
    - condition: ${{accepted.claimed !== true}}
      next: returnBusy
    - condition: ${{accepted.attempts > 10}}
      next: markBudgetExhausted
  next: mapBody

mapBody:
  assign:
    inbound_body: "{mapping}"
  next: callInbound

callInbound:
  call: http.post
  error: markRetry
  args:
    url: "[#LJVIS_RUUTER_INTERNAL]/erru/{flow}"
    headers:
      x-internal-service-token: "[#INTERNAL_COMMUNICATION_KEY]"
      type: json
    body: ${{inbound_body}}
  result: inbound_res
  timeout: 20000
  next: classify

# The flow answers {{status: responded|already_responded|acknowledged|already_acknowledged|ignored}} when handled.
classify:
  assign:
    inbound_status: "${{inbound_res.response == null ? 0 : inbound_res.response.status}}"
    inbound_json: "${{inbound_res.response == null || inbound_res.response.body == null ? {{}} : (typeof inbound_res.response.body === 'string' ? JSON.parse(inbound_res.response.body) : (typeof inbound_res.response.body.response === 'string' ? JSON.parse(inbound_res.response.body.response) : (inbound_res.response.body.response != null && typeof inbound_res.response.body.response === 'object' ? inbound_res.response.body.response : inbound_res.response.body)))}}"
  next: decideInbound

decideInbound:
  switch:
    - condition: ${{['responded', 'already_responded', 'acknowledged', 'already_acknowledged', 'ignored'].indexOf(inbound_json.status) >= 0}}
      next: markProcessed
    - condition: ${{inbound_status === 0 || inbound_status === 408 || inbound_status === 429 || inbound_status >= 500}}
      next: markRetry
    - condition: ${{inbound_status === 404}}
      next: buildNotCorrelated
  next: markFailed

# The flow found no outgoing message for this workflowId (stale, spurious or foreign response): tell the Hub with an
# ErrorNotification ResponseNotCorrelated (ERRU 7.7), then close the row as failed (nothing to apply, kept for inspection).
buildNotCorrelated:
  assign:
    en_body: "${{(function() {{ var msg = 'Message does not correlate to a request sent by this member state (correlation id: inbox/' + accepted.inboxId + ')'; return {{Header: {{'@version': '3.5', '@technicalId': accepted.errorTechnicalId, '@workflowId': workflow_id, '@sentAt': new Date().toISOString().substring(0, 19) + 'Z', '@from': 'EE', '@to': 'EU'}}, Body: {{'@businessCaseId': business_case_id, '@statusCode': 'ResponseNotCorrelated', '@statusMessage': msg, OriginalMessage: raw_xml}}}}; }})()}}"
  next: sendNotCorrelated

sendNotCorrelated:
  call: http.post
  error: markFailed
  args:
    url: "${{('[#ERRU_XTR_BRIDGE]'.indexOf('ERRU_XTR_BRIDGE') >= 0 ? 'http://erru-xml-adapter:8080' : '[#ERRU_XTR_BRIDGE]') + '/xml-out/erru/erru/ErrorNotification'}}"
    headers:
      type: json
      Authorization: "Bearer [#INTERNAL_COMMUNICATION_KEY]"
    body: ${{en_body}}
  result: en_res
  timeout: 25000
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
      inboxId: ${{accepted.inboxId}}
      attempts: ${{accepted.attempts}}
      outcome: "processed"
      error: ""
  result: finish_res
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
      inboxId: ${{accepted.inboxId}}
      attempts: ${{accepted.attempts}}
      outcome: "retry"
      error: "${{'inbound flow unavailable or transient failure (HTTP ' + (typeof inbound_status === 'undefined' ? 0 : inbound_status) + ')'}}"
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
      inboxId: ${{accepted.inboxId}}
      attempts: ${{accepted.attempts}}
      outcome: "failed"
      error: "${{'inbound flow answered HTTP ' + inbound_status + ': ' + JSON.stringify(inbound_json).substring(0, 400)}}"
  result: failed_res
  error: returnHandled
  next: returnHandled

markBudgetExhausted:
  call: http.post
  args:
    url: "[#LJVIS_RESQL]/erru/xml-inbox/finish"
    headers:
      Authorization: "Bearer [#RESQL_INTER_SERVICE_TOKEN]"
      x-internal-service-token: "[#INTERNAL_COMMUNICATION_KEY]"
      type: json
    body:
      inboxId: ${{accepted.inboxId}}
      attempts: ${{accepted.attempts}}
      outcome: "failed"
      error: "Response processing attempt budget exhausted"
  result: budget_res
  error: returnHandled
  next: returnHandled

returnHandled:
  status: 202
  return: '{{"status":"accepted"}}'
  next: end

returnBadEnvelope:
  status: 400
  return: '{{"error":"bad_envelope"}}'
  next: end

returnWrongRecipient:
  status: 422
  return: '{{"error":"wrong_recipient"}}'
  next: end

returnConflict:
  status: 409
  return: '{{"error":"conflicting_technical_id"}}'
  next: end

returnBusy:
  status: 503
  return: '{{"error":"processing_in_progress"}}'
  next: end

returnUnavailable:
  status: 503
  return: '{{"error":"unavailable"}}'
  next: end
'''

# ErrorNotification from the Hub (it rejected or could not correlate one of our messages): no business flow exists for it
# (the Java adapter answered 501). Durably recorded in erru.xml_inbox with the Hub's code and text in last_error, so an operator
# can find it; the technicalId makes a redelivery idempotent.
EN_TEMPLATE = '''# GENERATED by scripts/generate-erru-xtr-inbound.py - edit the generator, not this file.
declaration:
  internal: false
  returns: []
  version: "1.0"
  description: "XTR (erru-xml-adapter) backend for the incoming ErrorNotification (the Hub rejected or could not correlate one of our messages). No business flow: durably records it in erru.xml_inbox (idempotent by technicalId + SHA-256, 409 on a conflicting redelivery) with the Hub's status code and message in last_error, marks it processed and answers 202."
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
    en_text: "${('ErrorNotification received: ' + (bdy['@statusCode'] || '') + ' ' + String(bdy['@statusMessage'] || '').split(String.fromCharCode(10)).join(' ').split(String.fromCharCode(13)).join(' ')).substring(0, 500)}"
  next: checkEnvelope

checkEnvelope:
  switch:
    - condition: ${!technical_id || !raw_xml || !digest}
      next: returnBadEnvelope
    - condition: ${!(/^[0-9a-f-]+$/i.test(technical_id) && technical_id.split('-').map(p => p.length).join() === '8,4,4,4,12') || (workflow_id && !(/^[0-9a-f-]+$/i.test(workflow_id) && workflow_id.split('-').map(p => p.length).join() === '8,4,4,4,12')) || business_case_id.length > 36 || from_state.length > 100}
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
      messageType: "ErrorNotification"
      technicalId: ${technical_id}
      workflowId: ${workflow_id}
      businessCaseId: ${business_case_id}
      transportPeer: ${from_state}
      rawXml: ${raw_xml}
      digest: ${digest}
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
  next: markProcessed

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
      error: ${en_text}
  result: finish_res
  error: returnUnavailable
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

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for msg, (flow, mapping) in MAPS.items():
        assert '"' not in mapping.replace('\\"', ''), msg
        (OUT / f"{msg}.yml").write_text(TEMPLATE.format(msg=msg, flow=flow, mapping=mapping))
        print("wrote", f"{msg}.yml")
    (OUT / "ErrorNotification.yml").write_text(EN_TEMPLATE)
    print("wrote ErrorNotification.yml")

if __name__ == "__main__":
    main()
