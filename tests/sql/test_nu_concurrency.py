#!/usr/bin/env python3
"""Exercise real NU transaction interleavings. Pass a psql command after --.

Example: python3 tests/sql/test_nu_concurrency.py -- psql -U ljvis -d ljvis_db
Only generated test rows are removed; use an isolated migrated database.
"""
import json
import subprocess
import sys
import time
import uuid

PSQL = sys.argv[sys.argv.index('--') + 1:] + ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1']

def query(sql):
    return subprocess.run(PSQL + ['-c', sql], check=True, text=True, capture_output=True).stdout.strip()

payload = "'{\"nuTo\":\"DE\",\"originatingAuthority\":\"EE-PPA\",\"requestSource\":\"CA\",\"requestPurpose\":\"Issue\",\"unfitStartDate\":\"2026-01-01\"}'::jsonb"
source = json.loads(query("""INSERT INTO forms.good_repute_form(good_repute_form_key,form_number,status,personal_code,
 first_name,last_name,date_of_birth,certificate_number,certificate_issue_date,certificate_country_code,
 fitness_status,unfit_from_date,unfit_until_date)
 VALUES(nextval('forms.seq_good_repute_form_key'),'NU-RACE','published','NU-RACE','Test','Manager','1980-01-01',
 'CERT','2020-01-01','EE','unfit',current_date-1,current_date+30)
 RETURNING json_build_object('key',good_repute_form_key,'id',id)"""))
keys = []

def draft():
    result = json.loads(query(f"SELECT erru.nu_save_draft(NULL,NULL,{source['key']},{source['id']},{payload},'test')"))
    keys.append(int(result['id']))
    return keys[-1]

def save(k, version):
    return f"SELECT erru.nu_save_draft({k},{version},NULL,NULL,{payload},'test')"

def send(k, version):
    return f"SELECT erru.nu_begin_send({k},{version},'A','B','test','Test')"

def race(k, first, second):
    """Hold first transaction's lock; ensure second is waiting before committing first."""
    holder = subprocess.Popen(PSQL, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    waiter = None
    try:
        holder.stdin.write(f"BEGIN; SELECT pg_advisory_xact_lock({k}); SELECT 'locked';\n"); holder.stdin.flush()
        while holder.stdout.readline().strip() != 'locked':
            if holder.poll() is not None:
                raise AssertionError(holder.stderr.read())
        app = 'nu-race-' + uuid.uuid4().hex
        waiter = subprocess.Popen(PSQL + ['-c', f"SET application_name='{app}'; " + second], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        deadline = time.monotonic() + 10
        while query(f"SELECT count(*) FROM pg_stat_activity WHERE application_name='{app}' AND wait_event='advisory'") != '1':
            if time.monotonic() > deadline or waiter.poll() is not None:
                raise AssertionError('Second transaction did not wait on the message lock')
            time.sleep(0.02)
        # The waiter began before this write. Its eventual timestamp must still sort last.
        out, err = holder.communicate(first + '; COMMIT;\n', timeout=10)
        assert holder.returncode == 0, err
        result, err = waiter.communicate(timeout=10)
        assert waiter.returncode == 0, err
        return json.loads(out.strip()), json.loads(result.strip())
    finally:
        for proc in [holder, waiter]:
            if proc and proc.poll() is None:
                proc.kill(); proc.wait()

try:
    k = draft()
    a, b = race(k, save(k, 1), save(k, 1))
    assert a['version'] == 2 and b['code'] == 'version_conflict', (a, b)
    print('PASS simultaneous save/save: one revision and one conflict')
    k = draft()
    a, b = race(k, send(k, 1), save(k, 1))
    assert a['technicalId'] and b['code'] == 'not_editable', (a, b)
    print('PASS send/save: sent message stays locked')
    k = draft()
    a, b = race(k, save(k, 1), send(k, 1))
    assert a['version'] == 2 and b['code'] == 'version_conflict', (a, b)
    assert query(f"SELECT count(*) FROM erru.nu_exchange_event WHERE nu_message_key={k}") == '0'
    print('PASS save/send: stale payload is never reserved')
    k = draft()
    a, b = race(k, send(k, 1), send(k, 1))
    assert a['technicalId'] and b['code'] == 'not_sendable', (a, b)
    assert query(f"SELECT count(*) FROM erru.nu_exchange_event WHERE nu_message_key={k} AND kind='Request'") == '1'
    print('PASS simultaneous send/send: one external request reservation')
    k = draft()
    a, b = race(k, send(k, 1), f"SELECT erru.nu_finish_send({k},NULL,'transport failure')")
    assert b['status'] == 'error', (a, b)
    assert query(f"SELECT status FROM erru.nu_message WHERE nu_message_key={k} ORDER BY created_at DESC,id DESC LIMIT 1") == 'error'
    print('PASS waiting result: transaction start time cannot hide terminal error')
finally:
    if keys:
        ids = ','.join(map(str, keys))
        query(f"DELETE FROM erru.nu_exchange_event WHERE nu_message_key IN ({ids}); DELETE FROM erru.nu_message WHERE nu_message_key IN ({ids})")
    query(f"DELETE FROM forms.good_repute_form WHERE good_repute_form_key={source['key']}")
