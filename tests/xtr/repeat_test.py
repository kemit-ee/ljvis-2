#!/usr/bin/env python3
"""Repeated, changed and concurrent RegisterJobInspection writes; ETL -> SOAP.

Runs against a disposable CI stack with synthetic data only:

python3 tests/xtr/repeat_test.py --soap-url http://localhost:9095 --rest-url http://localhost:9089 \
  --resql-url http://localhost:9087/ljvis \
  -- docker compose -f docker-compose.ci.yml -p ljvis-ci exec -T database \
  psql -X -qAt -v ON_ERROR_STOP=1 -U ljvis -d ljvis_db

Checks (see docs/xtee/09-xtr-soap.md):
- exact repeat: Success, no new snapshot;
- new act is created confirmed (version 1);
- changed repeat of a confirmed act: SOAP Fault (409), nothing written; exact repeat still Success;
- concurrent identical first requests create one act; concurrent changed requests: one act, the first wins, the rest get 409;
- REST v3 keeps its first-write-wins contract but is atomic;
- REST/SOAP v1 inspection_type: passenger only for non-zero passenger-carriage counters (zero, single, mixed, legacy);
- a changed repeat of an act purged by archiving is a 409 Fault, not a 500 or a new act;
- a migrated RavenDB V2 act is found by a later RegisterJobInspection_v2 with the same InspectionId.
"""
import argparse
import json
import subprocess
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUN = str(int(time.time() * 1000))[-9:]
CHECKS = []


def check(condition, message):
    if not condition:
        raise AssertionError(message)
    CHECKS.append(message)


class Db:
    def __init__(self, command):
        self.command = command

    def run(self, sql, *extra):
        result = subprocess.run(self.command + list(extra), input=sql, text=True, capture_output=True)
        if result.returncode:
            raise RuntimeError(f'psql failed ({result.returncode}): {result.stderr.strip()[:2000]}')
        return result.stdout.strip()

    def json(self, sql):
        out = self.run(f"SELECT COALESCE(json_agg(t), '[]') FROM ({sql}) t;")
        return json.loads(out)

    def value(self, sql):
        return self.run(sql + ';')


def lit(value):
    return "'" + str(value).replace("'", "''") + "'"


def http(url, body, headers):
    request = urllib.request.Request(url, data=body.encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.status, response.read().decode('utf-8')
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode('utf-8')


def soap_header(operation, version):
    return ('<xrd:client id:objectType="SUBSYSTEM"><id:xRoadInstance>ee-dev</id:xRoadInstance><id:memberClass>GOV</id:memberClass>'
            '<id:memberCode>70000310</id:memberCode><id:subsystemCode>ljvis-test</id:subsystemCode></xrd:client>'
            '<xrd:service id:objectType="SERVICE"><id:xRoadInstance>ee-dev</id:xRoadInstance><id:memberClass>GOV</id:memberClass>'
            '<id:memberCode>70001231</id:memberCode><id:subsystemCode>ljvis2</id:subsystemCode>'
            f'<id:serviceCode>{operation}</id:serviceCode><id:serviceVersion>{version}</id:serviceVersion></xrd:service>'
            f'<xrd:id>repeat-{operation}-{time.time_ns()}</xrd:id><xrd:userId>EE38001085718</xrd:userId>'
            '<xrd:protocolVersion>4.0</xrd:protocolVersion>')


def envelope(operation, version, request_xml):
    return ('<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" '
            'xmlns:xrd="http://x-road.eu/xsd/xroad.xsd" xmlns:id="http://x-road.eu/xsd/identifiers" '
            f'xmlns:tns="http://ljvis.x-road.eu"><SOAP-ENV:Header>{soap_header(operation, version)}</SOAP-ENV:Header>'
            f'<SOAP-ENV:Body><tns:{operation}><request>{request_xml}</request></tns:{operation}></SOAP-ENV:Body>'
            '</SOAP-ENV:Envelope>')


def counters(names, values, v2):
    extra = ('arv_nutimeerik', 'tp_nutimeerik') if v2 else ()
    keys = ('arv_analoogmeerik', 'arv_digitaalmeerik') + extra[:1] + ('tp_analoogmeerik', 'tp_digitaalmeerik') + extra[1:]
    return ''.join(f'<{name}>' + ''.join(f'<{k}>{values.get(name, {}).get(k, 0)}</{k}>' for k in keys) + f'</{name}>'
                   for name in names)


TRANSPORT = ('kontrollitud_soitjate_veol', 'kontrollitud_veose_veol', 'kontrollitud_ok_veol', 'kontrollitud_tasulisel_veol')
V1_SIMPLE = ('maarus_3821_85_art15_p1', 'maarus_3821_85_art15_lg2', 'maarus_3821_85_art15_lg3', 'maarus_3821_85_art15_lg5')
V1_PAIRS = ('maarus_561_2006_a10_lg5', 'maarus_561_2006_a6_oop_aeg', 'maarus_561_2006_a6_nadal_aeg',
            'maarus_561_2006_a6_2nadal_aeg', 'maarus_561_2006_a7_vaheaeg_45', 'maarus_561_2006_a7_vaheaeg_min',
            'maarus_561_2006_a8_oop_puhkus', 'maarus_561_2006_a8_nadal_puhkus')


def v1_request(kontrolli_id, goods=2, violation=0):
    return (f'<kontrollija>Repeat Inspektor</kontrollija><kontrolli_id>{kontrolli_id}</kontrolli_id>'
            '<kontrolli_kp>2026-06-15T10:00:00</kontrolli_kp><tooandja_nimi>OÜ Repeat</tooandja_nimi>'
            '<tooandja_reg_kood>12345678</tooandja_reg_kood><soidukite_arv>3</soidukite_arv>'
            '<koostatatud_ettekirjutus>false</koostatatud_ettekirjutus>'
            f'<kontrollimised><kontrollitud_kokku>{goods}</kontrollitud_kokku>'
            + counters(TRANSPORT, {'kontrollitud_veose_veol': {'arv_digitaalmeerik': goods}}, False) +
            '</kontrollimised><rikkumised>'
            + ''.join(f'<{n}>{violation if n.endswith("p1") else 0}</{n}>' for n in V1_SIMPLE)
            + ''.join(f'<{n}><soitjateveol>0</soitjateveol><veoseveol>0</veoseveol></{n}>' for n in V1_PAIRS)
            + '<maarus_561_2006_a16_puudulik_gr>0</maarus_561_2006_a16_puudulik_gr>'
              '<maarus_561_2006_a16_gr_eiramine>0</maarus_561_2006_a16_gr_eiramine></rikkumised>'
              '<vaarteomenetlus>Ei</vaarteomenetlus>')


def v2_request(kontrolli_id, code='CODE_A', count=1, reference=None):
    proceeding = ''
    if reference:
        proceeding = (f'<vaarteomenetlus><viitenumber>{reference}</viitenumber><karistatud_isiku_kood>39001010001'
                      '</karistatud_isiku_kood><karistatud_isiku_eesnimi>Demo</karistatud_isiku_eesnimi>'
                      '<karistatud_isiku_nimi>Test</karistatud_isiku_nimi></vaarteomenetlus>')
    return (f'<kontrollija>Repeat Inspektor</kontrollija><kontrolli_id>{kontrolli_id}</kontrolli_id>'
            '<kontrolli_kp>2026-06-15T10:00:00</kontrolli_kp><kontrolli_tyyp>V</kontrolli_tyyp>'
            '<tooandja_nimi>OÜ Repeat</tooandja_nimi><tooandja_reg_kood>12345678</tooandja_reg_kood>'
            '<soidukite_arv>3</soidukite_arv><koostatud_ettekirjutus>false</koostatud_ettekirjutus>'
            '<kontrollimised><kontrollitud_kokku>2</kontrollitud_kokku>'
            + counters(TRANSPORT, {'kontrollitud_veose_veol': {'arv_digitaalmeerik': 2}}, True) +
            f'</kontrollimised><rikkumised><rikkumiste_arv><rikkumise_kood>{code}</rikkumise_kood><arv>{count}</arv>'
            f'</rikkumiste_arv></rikkumised>{proceeding}')


class Client:
    def __init__(self, args, db):
        self.soap_url = args.soap_url.rstrip('/') + '/soap-in/ljvis/ljvis'
        self.rest_url = args.rest_url.rstrip('/')
        self.resql_url = args.resql_url.rstrip('/')
        self.db = db

    def soap(self, operation, request_xml):
        version = 'v2' if operation == 'RegisterJobInspection_v2' else 'v1'
        status, text = http(self.soap_url, envelope(operation, version, request_xml),
                            {'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '""'})
        success = status == 200 and '<message>Success</message>' in text
        fault = '<faultcode>' in text or ':Fault>' in text
        return status, success, fault, text

    def v3(self, body):
        return http(self.rest_url + '/ljvis/xroad/provide/register-job-inspection-v3', json.dumps(body),
                    {'Content-Type': 'application/json', 'X-Road-Client': 'ee-dev/GOV/70000310/ljvis-test'})

    def resql(self, path, body):
        return http(self.resql_url + path, json.dumps(body), {'Content-Type': 'application/json'})

    def act(self, source, external_id):
        rows = self.db.json(f"""SELECT r.labour_inspection_form_key AS key, r.payload_hash,
            (SELECT count(*) FROM forms.labour_inspection_form f WHERE f.labour_inspection_form_key = r.labour_inspection_form_key) AS snapshots
            FROM forms.labour_inspection_external_ref r WHERE r.source = {lit(source)} AND r.external_id = {lit(external_id)}""")
        if len(rows) > 1:
            raise AssertionError(f'{source}/{external_id}: registry is not unique')
        return rows[0] if rows else None

    def snapshots(self, key):
        return self.db.json(f"""SELECT id, form_number, version, status, external_inspection_id, inspection_type, violations, controls_matrix,
            proceeding_reference_number FROM forms.labour_inspection_form WHERE labour_inspection_form_key = {int(key)}
            ORDER BY created_at, id""")

    def forms_with_external_id(self, value):
        return int(self.db.value(f"""SELECT count(DISTINCT labour_inspection_form_key) FROM forms.labour_inspection_form
            WHERE external_inspection_id = {lit(value)}"""))


def lifecycle(client, operation, source, external_id, first, changed, other):
    status, ok, _, text = client.soap(operation, first)
    check(ok, f'{operation}: first request Success ({status} {text[:300]})')
    act = client.act(source, external_id)
    check(act and act['snapshots'] == 1, f'{operation}: first request created one act with one snapshot')
    key = act['key']
    created = client.snapshots(key)[0]
    check(created['status'] == 'confirmed' and created['version'] == 1, f'{operation}: new act is confirmed, version 1')
    check(created['external_inspection_id'] == external_id, f'{operation}: external_inspection_id is the sender ID without prefix')

    _, ok, _, _ = client.soap(operation, first)
    check(ok and client.act(source, external_id)['snapshots'] == 1, f'{operation}: exact repeat is Success without a new snapshot')

    for label, body in (('changed', changed), ('other', other)):
        status, ok, fault, text = client.soap(operation, body)
        check(not ok and fault and '<faultcode>SOAP-ENV:Client</faultcode>' in text and 'HTTP 409' in text,
              f'{operation}: {label} repeat of a confirmed act is a Client SOAP Fault (HTTP 409), not Success')
        check(len(client.snapshots(key)) == 1, f'{operation}: rejected {label} repeat wrote nothing')
    check(client.act(source, external_id)['key'] == key, f'{operation}: registry still points to the same act')
    _, ok, _, _ = client.soap(operation, first)
    check(ok and len(client.snapshots(key)) == 1, f'{operation}: exact repeat of the first data is still Success after a rejected change')
    return key


def parallel(function, payloads, workers=16):
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(function, payloads))


def concurrency(client):
    for operation, source, external_id, build in [
        ('RegisterJobInspection', 'xroad-v1', str(1500000000 + int(RUN) % 100000000), lambda i: v1_request(i)),
        ('RegisterJobInspection_v2', 'xroad-v2', f'PAR-V2-{RUN}', lambda i: v2_request(i)),
    ]:
        payload = build(external_id)
        results = parallel(lambda body: client.soap(operation, body), [payload] * 16)
        check(all(r[1] for r in results), f'{operation}: 16 concurrent identical first requests all Success')
        act = client.act(source, external_id)
        check(act['snapshots'] == 1 and client.forms_with_external_id(external_id) == 1,
              f'{operation}: concurrent identical first requests created exactly one act and one snapshot')

    external_id = f'PAR-CHG-{RUN}'
    payloads = [v2_request(external_id, code=f'CODE_{n}', count=n + 1) for n in range(8)]
    results = parallel(lambda body: client.soap('RegisterJobInspection_v2', body), payloads, workers=8)
    successes = [r for r in results if r[1]]
    check(len(successes) == 1 and all('HTTP 409' in r[3] for r in results if not r[1]),
          'v2: of 8 concurrent different first requests exactly one is Success, the others get 409 (act is confirmed)')
    act = client.act('xroad-v2', external_id)
    check(act['snapshots'] == 1 and client.forms_with_external_id(external_id) == 1,
          'v2: concurrent different first requests created one act with one snapshot')
    latest_hash = client.db.value(f"""SELECT forms.lif_external_payload_hash(inspector_name, inspection_date, inspection_type,
        company_name, company_reg_code, vehicle_count, prescription_composed, controls_matrix, violations,
        punished_person_id_code, punished_person_first_name, punished_person_last_name, proceeding_reference_number)
        FROM forms.labour_inspection_form WHERE labour_inspection_form_key = {act['key']} ORDER BY created_at DESC, id DESC LIMIT 1""")
    check(latest_hash == act['payload_hash'], 'v2: registry hash matches the stored snapshot after concurrent writes')


def rest_v3(client):
    kontrolli_id = f'V3-{RUN}'
    body = {'kontrollija': 'Repeat Inspektor', 'kontrolli_id': kontrolli_id, 'kontrolli_kp': '2026-06-15',
            'tooandja_nimi': 'OÜ Repeat', 'tooandja_reg_kood': '12345678', 'soidukite_arv': '1',
            'koostatatud_ettekirjutus': 'false', 'kontrollimised': {'kontrollitud_kaubaveol': True},
            'rikkumised': {'a': 1}, 'vaarteomenetlus': ''}
    results = parallel(lambda b: client.v3(b), [body] * 12, workers=12)
    check(all(r[0] == 200 for r in results), 'v3: 12 concurrent identical requests all 200')
    act = client.act('xroad-v3', kontrolli_id)
    check(act['snapshots'] == 1 and client.forms_with_external_id('v3-' + kontrolli_id) == 1,
          'v3: concurrent requests created one act; external_inspection_id keeps the v3- form')
    status, _ = client.v3(dict(body, rikkumised={'a': 2}))
    check(status == 200 and client.act('xroad-v3', kontrolli_id)['snapshots'] == 1,
          'v3: changed repeat keeps the existing first-write-wins REST contract')


def archived(client, db):
    """Archive purge removes all snapshots of an act from the working DB; the registry row stays."""
    external_id = f'ARC-V2-{RUN}'
    first = v2_request(external_id)
    _, ok, _, _ = client.soap('RegisterJobInspection_v2', first)
    act = client.act('xroad-v2', external_id)
    check(ok and act is not None, 'archive: act created')
    db.run(f"DELETE FROM forms.labour_inspection_form WHERE labour_inspection_form_key = {int(act['key'])};")
    _, ok, _, _ = client.soap('RegisterJobInspection_v2', first)
    check(ok and client.forms_with_external_id(external_id) == 0, 'archive: exact repeat of a purged act is Success and recreates nothing')
    status, ok, fault, text = client.soap('RegisterJobInspection_v2', v2_request(external_id, code='CODE_X'))
    check(not ok and '<faultcode>SOAP-ENV:Client</faultcode>' in text and 'archived' in text,
          'archive: changed repeat of a purged act is a Client SOAP Fault (409, archived), not a 500')
    check(client.forms_with_external_id(external_id) == 0 and client.act('xroad-v2', external_id)['key'] == act['key'],
          'archive: no new act is created; registry keeps pointing to the archived key')


def v1_classification(client):
    """inspection_type of RegisterJobInspection v1 (REST and SOAP share the handler): passenger only when
    the passenger-carriage driver counters are non-zero; legacy boolean/number inputs keep working."""
    def counts(analog, digital):
        return {'arv_analoogmeerik': analog, 'arv_digitaalmeerik': digital, 'tp_analoogmeerik': 0, 'tp_digitaalmeerik': 0}
    cases = [
        ('zero', {'kontrollitud_soitjate_veol': counts(0, 0), 'kontrollitud_veose_veol': counts(0, 3)}, 'cargo'),
        ('analog', {'kontrollitud_soitjate_veol': counts(2, 0), 'kontrollitud_veose_veol': counts(0, 0)}, 'passenger'),
        ('digital', {'kontrollitud_soitjate_veol': counts(0, 1), 'kontrollitud_veose_veol': counts(0, 0)}, 'passenger'),
        ('mixed', {'kontrollitud_soitjate_veol': counts(1, 0), 'kontrollitud_veose_veol': counts(0, 4)}, 'passenger'),
        ('string-counts', {'kontrollitud_soitjate_veol': {'arv_analoogmeerik': '0', 'arv_digitaalmeerik': '2'}}, 'passenger'),
        ('legacy-true', {'kontrollitud_soitjate_veol': True}, 'passenger'),
        ('legacy-false', {'kontrollitud_soitjate_veol': False, 'kontrollitud_kaubaveol': True}, 'cargo'),
        ('absent', {'kontrollitud_veose_veol': counts(1, 1)}, 'cargo'),
    ]
    for name, controls, expected in cases:
        kontrolli_id = str(1800000000 + int(RUN) % 10000000 * 10 + cases.index((name, controls, expected)))
        status, text = http(client.rest_url + '/ljvis/xroad/provide/register-job-inspection', json.dumps({
            'kontrollija': 'Repeat Inspektor', 'kontrolli_id': kontrolli_id, 'kontrolli_kp': '2026-06-15',
            'tooandja_nimi': 'OÜ Repeat', 'tooandja_reg_kood': '12345678', 'koostatatud_ettekirjutus': 'false',
            'kontrollimised': controls, 'rikkumised': {}}),
            {'Content-Type': 'application/json', 'X-Road-Client': 'ee-dev/GOV/70000310/ljvis-test'})
        act = client.act('xroad-v1', kontrolli_id)
        actual = client.snapshots(act['key'])[0]['inspection_type'] if act else None
        check(status == 200 and actual == expected, f'REST v1 inspection_type, {name} counters -> {expected} (got {actual})')


def etl_to_soap(client, db):
    db.run((ROOT / 'DSL/migration/sql/00-staging-schema.sql').read_text())
    run_id = db.value("SELECT gen_random_uuid()")
    db.run(f"""INSERT INTO migration.run (migration_run_id, source_cutoff_from, form_types, mode, source_label)
        VALUES ({lit(run_id)}, DATE '2026-01-01', ARRAY['JobInspectionV2'], 'rehearsal', 'repeat-test');""")
    inspection_id = f'ETL-V2-{RUN}'
    numeric_id = str(1700000000 + int(RUN) % 100000000)
    for raven_id in (inspection_id, numeric_id):
        document = {'InspectionId': raven_id, 'Stage': 'Confirmed', 'Inspector': 'ETL Inspektor',
                    'InspectionDate': '2026-06-15T10:00:00', 'InspectionType': 'V', 'CompanyName': 'OÜ ETL',
                    'CompanyRegNumber': '12345678', 'VehicleCount': 1, 'Controls': {'Count': 1}}
        db.run(f"""INSERT INTO staging.raw_job_inspection (raven_id, schema_version, document_json, last_modified_at)
            VALUES ({lit(raven_id)}, 2, {lit(json.dumps(document))}::jsonb, now());""")
    db.run((ROOT / 'DSL/migration/sql/07-transform-labour-inspection.sql').read_text(), '-1',
           '-v', f'run_id={run_id}', '-v', 'cutoff_from=2026-01-01')
    act = client.act('xroad-v2', inspection_id)
    check(act is not None and act['snapshots'] == 1, 'ETL: migrated RavenDB V2 act is linked as xroad-v2/InspectionId')
    migrated = client.snapshots(act['key'])[0]
    check(migrated['status'] == 'confirmed' and migrated['external_inspection_id'] == inspection_id,
          'ETL: migrated act is confirmed and keeps the InspectionId')

    status, ok, fault, text = client.soap('RegisterJobInspection_v2', v2_request(inspection_id))
    check(not ok and fault, f'ETL -> SOAP: v2 repeat of a migrated act finds it and is refused (confirmed), not duplicated ({status})')
    check(client.forms_with_external_id(inspection_id) == 1 and client.act('xroad-v2', inspection_id)['snapshots'] == 1,
          'ETL -> SOAP: no second act and no new snapshot for the migrated InspectionId')

    _, ok, _, _ = client.soap('RegisterJobInspection', v1_request(numeric_id))
    v1 = client.act('xroad-v1', numeric_id)
    check(ok and v1 and v1['key'] != client.act('xroad-v2', numeric_id)['key'],
          'ETL -> SOAP: the same numeric ID in v1 and v2 contracts stays two different acts')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--soap-url', required=True)
    parser.add_argument('--rest-url', required=True)
    parser.add_argument('--resql-url', required=True)
    parser.add_argument('db_command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.db_command[1:] if args.db_command[:1] == ['--'] else args.db_command
    if not command:
        parser.error('Provide the psql command for the disposable test database after --')
    if '-qAt' not in command:
        command = command + ['-qAt']
    db = Db(command)
    client = Client(args, db)
    lifecycle(client, 'RegisterJobInspection_v2', 'xroad-v2', f'RPT-V2-{RUN}',
              v2_request(f'RPT-V2-{RUN}'), v2_request(f'RPT-V2-{RUN}', code='CODE_B', count=3, reference='M-1'),
              v2_request(f'RPT-V2-{RUN}', code='CODE_C', count=4))
    v1_id = str(1400000000 + int(RUN) % 100000000)
    lifecycle(client, 'RegisterJobInspection', 'xroad-v1', v1_id,
              v1_request(v1_id), v1_request(v1_id, violation=2), v1_request(v1_id, violation=5))
    concurrency(client)
    rest_v3(client)
    v1_classification(client)
    archived(client, db)
    etl_to_soap(client, db)
    print(f'PASS: {len(CHECKS)} checks')
    for message in CHECKS:
        print('  ✓', message)


if __name__ == '__main__':
    main()
