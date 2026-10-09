#!/usr/bin/env python3
"""Verify register-job-inspection-v3 resolves rikkumised_loend TI codes (e.g. "E5", "B1")
into LABOUR_INSPECTION_VIOLATION classifier_value_key references before the act lands in
forms.labour_inspection_form, and rejects unknown codes without creating a row.

Example: python3 tests/sql/register-job-inspection-violation-mapping.py -- psql -U ljvis -d ljvis_db
Set RUUTER_INTERNAL_URL to override the default http://localhost:8089.
Only generated test rows are removed; use an isolated migrated database.
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

PSQL = sys.argv[sys.argv.index('--') + 1:] + ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
BASE_URL = os.environ.get('RUUTER_INTERNAL_URL', 'http://localhost:8089')


def query(sql):
    return subprocess.run(PSQL + ['-c', sql], check=True, text=True, capture_output=True).stdout.strip()


def post(path, body):
    req = urllib.request.Request(
        BASE_URL + path,
        data=json.dumps(body).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'X-Road-Client': 'EE/GOV/70000310/ljvis-test'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def current_value_key(code):
    return int(query(f"""SELECT classifier_value_key FROM classifier.classifier_value
        WHERE classifier_key = (SELECT classifier_key FROM classifier.classifier WHERE code='LABOUR_INSPECTION_VIOLATION')
          AND code = '{code}'
        ORDER BY created_at DESC LIMIT 1"""))


kontrolli_id = 'PW-VIOL-' + str(int(time.time() * 1000))
ext_id = 'v3-' + kontrolli_id
bad_kontrolli_id = kontrolli_id + '-BAD'
bad_ext_id = 'v3-' + bad_kontrolli_id

payload = {
    "kontrollija": "PW Inspector", "kontrolli_id": kontrolli_id, "kontrolli_kp": "2026-06-15",
    "tooandja_nimi": "OÜ PW Test", "tooandja_reg_kood": "12345678", "soidukite_arv": 1,
    "koostatatud_ettekirjutus": False, "kontrollimised": {"kontrollitud_soitjate_veol": False},
    "rikkumised": {"rikkumised_loend": [{"kood": "E5", "kogus": 2}, {"kood": "B1"}]},
}

try:
    status, body = post('/ljvis/xroad/provide/register-job-inspection-v3', payload)
    assert status == 200 and body.get('message') == 'Success', (status, body)
    print('PASS known codes (E5, B1) -> 200 Success')

    row = json.loads(query(f"""SELECT json_build_object('violations', violations, 'status', status)
        FROM forms.labour_inspection_form WHERE external_inspection_id = '{ext_id}'
        ORDER BY created_at DESC LIMIT 1"""))
    violations = row['violations']
    assert isinstance(violations, list) and len(violations) == 2, violations
    assert row['status'] == 'confirmed', row
    for v in violations:
        assert v.get('level1ValueKey') and v.get('level2ValueKey'), v
    print('PASS act created with status=confirmed and 2 resolved violations')

    qty_by_level2 = {v['level2ValueKey']: v['quantity'] for v in violations}
    e5_key = current_value_key('TI_E5')
    b1_key = current_value_key('TI_B1')
    assert qty_by_level2.get(e5_key) == 2, (qty_by_level2, e5_key)
    assert qty_by_level2.get(b1_key) == 1, (qty_by_level2, b1_key)
    print('PASS violations map to correct level2ValueKey (TI_E5, TI_B1) with correct quantities')

    bad_payload = dict(payload, kontrolli_id=bad_kontrolli_id,
                        rikkumised={"rikkumised_loend": [{"kood": "ZZ99"}]})
    status, body = post('/ljvis/xroad/provide/register-job-inspection-v3', bad_payload)
    assert status == 400 and body.get('error') == 'UNKNOWN_VIOLATION_CODE', (status, body)
    assert query(f"SELECT count(*) FROM forms.labour_inspection_form WHERE external_inspection_id = '{bad_ext_id}'") == '0'
    print('PASS unknown code (ZZ99) -> 400 UNKNOWN_VIOLATION_CODE, no row created')
finally:
    query(f"DELETE FROM forms.labour_inspection_form WHERE external_inspection_id IN ('{ext_id}', '{bad_ext_id}')")
    query(f"""DELETE FROM forms.labour_inspection_external_ref
        WHERE source='xroad-v3' AND external_id IN ('{kontrolli_id}', '{bad_kontrolli_id}')""")
