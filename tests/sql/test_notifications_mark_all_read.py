#!/usr/bin/env python3
"""Test bulk read events in a disposable PostgreSQL database.

Run with a psql command after --, including its database and user options.
"""
from pathlib import Path
import subprocess
import sys
import uuid

command = sys.argv[sys.argv.index('--') + 1:] + ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
name = 'notifications_test_' + uuid.uuid4().hex[:12]
root = Path(__file__).resolve().parents[2]
query = (root / 'DSL/Resql/ljvis/POST/notification/mark_all_notifications_read.sql').read_text()
query = query.replace(':user_code', "'reader'").replace(':permissions', "'ncr.read'")


def run(sql, database=None):
    args = command.copy()
    if database:
        args[args.index('-d') + 1] = database
    return subprocess.run(args + ['-c', sql], text=True, capture_output=True, check=True).stdout.strip()


run('CREATE DATABASE ' + name)
try:
    run('''
        CREATE SCHEMA notifications;
        CREATE TABLE notifications.notification (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            required_permission TEXT NOT NULL,
            recipients_only BOOLEAN NOT NULL DEFAULT FALSE,
            recipient_personal_codes TEXT[] NOT NULL DEFAULT '{}'
        );
        CREATE TABLE notifications.notification_read (
            notification_id UUID REFERENCES notifications.notification(id),
            user_code TEXT NOT NULL,
            read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (notification_id, user_code)
        );
        INSERT INTO notifications.notification (required_permission)
        SELECT 'ncr.read' FROM generate_series(1, 1201);
        INSERT INTO notifications.notification
            (required_permission, recipients_only, recipient_personal_codes)
        VALUES ('other.read', TRUE, ARRAY['reader']),
               ('other.read', FALSE, ARRAY['reader']),
               ('other.read', FALSE, '{}'),
               ('ncr.read', TRUE, ARRAY['someone-else']);
        INSERT INTO notifications.notification_read (notification_id, user_code)
        SELECT id, 'reader' FROM notifications.notification LIMIT 1;
        INSERT INTO notifications.notification_read (notification_id, user_code)
        SELECT id, 'other-reader' FROM notifications.notification;
    ''', name)
    assert run(query, name).splitlines()[0] == '1202', 'All visible unread notifications must be marked'
    assert run(query, name).splitlines()[0] == '0', 'Repeated calls must be idempotent'
    assert run("SELECT count(*) FROM notifications.notification_read WHERE user_code='reader'", name) == '1203'
    assert run("SELECT count(*) FROM notifications.notification_read WHERE user_code='other-reader'", name) == '1205'
    assert run("SELECT count(*) FROM notifications.notification_read r WHERE r.user_code='reader' AND r.notification_id IN (SELECT id FROM notifications.notification WHERE required_permission='other.read' AND cardinality(recipient_personal_codes)=0 OR recipients_only AND recipient_personal_codes=ARRAY['someone-else'])", name) == '0', 'Hidden notifications must remain unread'
    run('TRUNCATE notifications.notification_read, notifications.notification', name)
    assert run(query, name).splitlines()[0] == '0', 'An empty list must return zero'
    print('PASS: 1202 unread events, visibility, user isolation, idempotency, empty list')
finally:
    run('DROP DATABASE ' + name + ' WITH (FORCE)')
