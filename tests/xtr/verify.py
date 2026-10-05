#!/usr/bin/env python3
"""Check Newman failures, SOAP bodies against the vendored WSDL, and persisted test data.

python3 tests/xtr/verify.py --report tests/postman/reports/xroad-soap-inbound.json \
  -- docker compose -f docker-compose.ci.yml -p ljvis-ci exec -T database \
  psql -X -qAt -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db
Requires xmllint. The SQL checks are for a disposable, synthetic CI database only.
"""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path
from xml.dom import minidom
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SOAP_NS = 'http://schemas.xmlsoap.org/soap/envelope/'
XSD_NS = 'http://www.w3.org/2001/XMLSchema'


def content(response):
    return bytes(response['stream']['data']).decode('utf-8')


def xml_value(element):
    if not list(element):
        return element.text or ''
    result = {}
    for child in element:
        value = xml_value(child)
        if child.tag in result:
            if not isinstance(result[child.tag], list):
                result[child.tag] = [result[child.tag]]
            result[child.tag].append(value)
        else:
            result[child.tag] = value
    return result


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', required=True, type=Path)
    parser.add_argument('db_command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    report = json.loads(args.report.read_text())
    assert not report['run']['failures'], 'Newman failures must be resolved before contract verification'
    stats = report['run']['stats']['assertions']
    assert stats['total'] >= 100 and stats['pending'] == 0 and stats['failed'] == 0, stats
    command = args.db_command
    if command and command[0] == '--':
        command = command[1:]
    assert command, 'Provide the psql command for the disposable test database'
    # The CI sidecar may differ from the deployed one only by the loopback outbound.url.
    import yaml
    deployed = yaml.safe_load((ROOT / 'docker/xtr-inbound/wsdl/ljvis/ljvis.soap.yaml').read_text())
    ci = yaml.safe_load((ROOT / 'docker/xtr-inbound/ci/ljvis.soap.yaml').read_text())
    ci['outbound'].pop('url', None)
    assert ci == deployed, 'CI and deployed ljvis.soap.yaml differ beyond outbound.url'
    wsdl = minidom.parse(str(ROOT / 'docker/xtr-inbound/wsdl/ljvis/ljvis.wsdl'))
    schema = wsdl.getElementsByTagNameNS(XSD_NS, 'schema')[0]
    schema.setAttribute('xmlns:tns', 'http://ljvis.x-road.eu')
    schema.setAttribute('xmlns:xrd', 'http://x-road.eu/xsd/xroad.xsd')
    # X-Road import is used for SOAP headers/appinfo only. Validate message bodies offline.
    for node in list(schema.getElementsByTagNameNS(XSD_NS, 'import')):
        node.parentNode.removeChild(node)
    valid = 0
    writes = {}
    with tempfile.TemporaryDirectory(prefix='ljvis-soap-contract-') as directory:
        directory = Path(directory)
        xsd = directory / 'body.xsd'
        xsd.write_text(schema.toxml())
        for execution in report['run']['executions']:
            request = execution['request']
            response = execution['response']
            if request['method'] != 'POST' or response['code'] != 200:
                continue
            path = request['url']['path']
            if 'soap-in' in path:
                doc = minidom.parseString(content(response))
                body = doc.getElementsByTagNameNS(SOAP_NS, 'Body')[0]
                message = next(node for node in body.childNodes if node.nodeType == node.ELEMENT_NODE)
                xml = directory / 'response.xml'
                xml.write_text(message.toxml())
                subprocess.run(['xmllint', '--nonet', '--noout', '--schema', str(xsd), str(xml)],
                               check=True, capture_output=True)
                # Validate the echoed successful request too (same operation-specific WSDL types).
                original = ET.fromstring(request['body']['raw'])
                operation = list(original.find('{' + SOAP_NS + '}Body'))[0]
                ET.register_namespace('tns', 'http://ljvis.x-road.eu')
                xml.write_bytes(ET.tostring(operation))
                subprocess.run(['xmllint', '--nonet', '--noout', '--schema', str(xsd), str(xml)],
                               check=True, capture_output=True)
                valid += 1
                operation_name = operation.tag.split('}')[-1]
                payload = xml_value(operation.find('request'))
            elif 'soap-out' in path:
                operation_name = path[-1]
                payload = json.loads(content(response))['response']['request']
            else:
                continue
            if operation_name in ('RegisterJobInspection', 'RegisterJobInspection_v2'):
                # Identity is (contract, sender ID); the last successful payload is the expected act state.
                source = 'xroad-v2' if operation_name.endswith('_v2') else 'xroad-v1'
                writes[(source, payload['kontrolli_id'])] = (operation_name, payload)
    assert valid >= 8, f'Only {valid} successful SOAP replies checked'
    assert len(writes) >= 3, 'Both write contracts and outbound write must have persisted examples'
    keys = ' OR '.join(f'(r.source = {literal(source)} AND r.external_id = {literal(external_id)})'
                       for source, external_id in writes)
    sql = '''SELECT COALESCE(json_agg(t), '[]') FROM (SELECT DISTINCT ON (r.source, r.external_id)
      r.source, r.external_id, f.external_inspection_id, f.inspection_type, f.prescription_composed, f.controls_matrix,
      f.violations, f.punished_person_id_code, f.punished_person_first_name, f.punished_person_last_name,
      f.proceeding_reference_number,
      (SELECT count(DISTINCT d.labour_inspection_form_key) FROM forms.labour_inspection_form d
        WHERE d.external_inspection_id = f.external_inspection_id AND d.created_by = 'xroad') AS acts
      FROM forms.labour_inspection_external_ref r
      JOIN forms.labour_inspection_form f ON f.labour_inspection_form_key = r.labour_inspection_form_key
      WHERE ''' + keys + ''' ORDER BY r.source, r.external_id, f.created_at DESC, f.id DESC) t;'''
    rows = json.loads(subprocess.check_output(command, input=sql, text=True))
    assert len(rows) == len(writes), 'A successful write has no linked act'
    for row in rows:
        assert row['acts'] == 1, f"Repeated requests created {row['acts']} acts for {row['source']}"
        op, expected = writes[(row['source'], row['external_id'])]
        assert row['violations'] == expected['rikkumised'], 'Nested/repeated violations were lost'
        for key, value in expected['kontrollimised'].items():
            assert row['controls_matrix'][key] == value, f'Counter lost: {key}'
        if op.endswith('_v2'):
            assert row['inspection_type'] == ('passenger' if expected['kontrolli_tyyp'] == 'S' else 'cargo')
            assert row['prescription_composed'] == (expected['koostatud_ettekirjutus'] in ('true', '1'))
            proceeding = expected.get('vaarteomenetlus', {})
            assert row['controls_matrix']['vaarteomenetlus'] == (proceeding or None)
            for target, source in [('punished_person_id_code', 'karistatud_isiku_kood'),
                                   ('punished_person_first_name', 'karistatud_isiku_eesnimi'),
                                   ('punished_person_last_name', 'karistatud_isiku_nimi'),
                                   ('proceeding_reference_number', 'viitenumber')]:
                assert row[target] == (proceeding.get(source) or None), f'Proceeding field lost: {source}'
        else:
            counts = expected['kontrollimised']['kontrollitud_soitjate_veol']
            passenger = int(counts['arv_analoogmeerik']) + int(counts['arv_digitaalmeerik']) > 0
            assert row['inspection_type'] == ('passenger' if passenger else 'cargo')
    result = subprocess.check_output(command, input="SELECT json_build_object('decision',enforcement_decision,'closure',proceeding_closure_basis) FROM forms.vehicle_technical_form WHERE vehicle_technical_form_key=900000001;", text=True)
    assert json.loads(result) == {'decision': 'CI decision', 'closure': 'CI closure'}
    print(f'PASS: {stats["total"]} assertions; {valid} request/response pairs match XSD; {len(rows)} persisted inspections checked, no lost counters/violations/proceeding fields or repeated-write duplicates')


if __name__ == '__main__':
    main()
