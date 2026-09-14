#!/usr/bin/env python3
"""Compare the pinned NU XSD contract with field-specific SQL rules (stdlib only)."""
from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import datetime, timedelta
import json
import uuid
from dataclasses import dataclass
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
XS = '{http://www.w3.org/2001/XMLSchema}'
NAMESPACE = 'https://webgate.ec.testa.eu/move-hub/erru/3.5'
SCHEMAS = ROOT / 'contracts/erru/3.5'
INITIAL = ROOT / 'DSL/Liquibase/changelog/20261116100000-initial-erru-nu.sql'
VALIDATION = ROOT / 'DSL/Liquibase/changelog/20261117120000-erru-nu-validation.sql'
EXCHANGE = ROOT / 'DSL/Liquibase/changelog/20261117121000-erru-nu-exchange.sql'
MIGRATIONS = (INITIAL, VALIDATION, EXCHANGE)


@dataclass(frozen=True)
class Binding:
    owner: str
    attribute: str
    type_name: str
    column: str | None = None


# Field/type bindings, not a second copy of the XSD's numeric limits.
LENGTHS = {
    'tmFirstName': Binding('nurTransportManagerType', 'firstName', 'globalNameType', 'tm_first_name'),
    'tmFamilyName': Binding('nurTransportManagerType', 'familyName', 'globalNameType', 'tm_family_name'),
    'tmPlaceOfBirth': Binding('nurTransportManagerType', 'placeOfBirth', 'globalPlaceOfBirthType', 'tm_place_of_birth'),
    'tmFirstNameSearchKey': Binding('nurTransportManagerType', 'firstNameSearchKey', 'globalNameType', 'tm_first_name_search_key'),
    'tmFamilyNameSearchKey': Binding('nurTransportManagerType', 'familyNameSearchKey', 'globalNameType', 'tm_family_name_search_key'),
    'certificateNumber': Binding('globalCertificateDetailsType', 'certificateNumber', 'globalCertificateNumberType', 'certificate_number'),
    'businessCaseId': Binding('globalBodyRequestType', 'businessCaseId', 'globalBusinessCaseIdType', 'business_case_id'),
    'originatingAuthority': Binding('globalBodyRequestType', 'originatingAuthority', 'globalAuthorityIdentifierType', 'originating_authority'),
    'respondingAuthority': Binding('nurMemberStateType', 'respondingAuthority', 'globalAuthorityIdentifierType'),
    'statusMessage': Binding('nurMemberStateType', 'statusMessage', 'globalStatusMessageType'),
    'enStatusMessage': Binding('errorNotificationType', 'statusMessage', 'globalStatusMessageType'),
}
ENUMS = {
    'requestSource': Binding('globalBodyRequestType', 'requestSource', 'globalRequestSourceType'),
    'requestPurpose': Binding('globalBodyRequestType', 'requestPurpose', 'globalRequestPurposeType'),
    'ackStatusCode': Binding('nurMemberStateType', 'statusCode', 'globalAcknowledgementStatusCodeType'),
    'errorStatusCode': Binding('errorNotificationType', 'statusCode', 'errorStatusCodeType'),
}
DATES = {
    'tmDateOfBirth': Binding('nurTransportManagerType', 'dateOfBirth', 'globalDateType', 'tm_date_of_birth'),
    'certificateIssueDate': Binding('globalCertificateDetailsType', 'certificateIssueDate', 'globalDateType', 'certificate_issue_date'),
    'unfitStartDate': Binding('globalTransportManagerFitnessStartDateType', 'unfitStartDate', 'globalDateType', 'unfit_start_date'),
}


class ContractError(ValueError):
    pass


class Schema:
    def __init__(self, directory: Path):
        self.types = {}
        self.roots = {}
        for path in sorted(directory.glob('*.xsd')):
            root = ET.parse(path).getroot()
            if root.get('targetNamespace') != NAMESPACE:
                raise ContractError(f'{path.name}: expected namespace {NAMESPACE}, got {root.get("targetNamespace")}')
            self.roots[path.name] = root
            for include in root.findall(XS + 'include'):
                location = include.get('schemaLocation', '')
                if Path(location).name != location.removeprefix('./') or not (directory / location).is_file():
                    raise ContractError(f'{path.name}: unresolved local include {location}')
            for node in root:
                if node.get('name') and node.tag in (XS + 'simpleType', XS + 'complexType', XS + 'attributeGroup'):
                    name = node.get('name')
                    if name in self.types:
                        raise ContractError(f'duplicate XSD definition: {name}')
                    self.types[name] = node
        if not self.types:
            raise ContractError('no XSD types found')

    def facets(self, name, seen=()):
        if name in seen or name not in self.types:
            raise ContractError(f'unresolved/cyclic XSD type: {name}')
        restriction = self.types[name].find(XS + 'restriction')
        if restriction is None:
            raise ContractError(f'no simple restriction for {name}')
        base = restriction.get('base', '')
        result = {} if base.startswith('xs:') else self.facets(base, seen + (name,))
        for key in ('minLength', 'maxLength', 'length', 'minInclusive', 'pattern'):
            values = [n.get('value') for n in restriction.findall(XS + key)]
            if len(values) > 1:
                raise ContractError(f'{name}: multiple {key} facets require review')
            if values:
                result[key] = int(values[0]) if key.endswith('Length') or key == 'length' else values[0]
        enums = [n.get('value') for n in restriction.findall(XS + 'enumeration')]
        if enums:
            result['enum'] = sorted(enums)
        return result

    def attributes(self, name, seen=()):
        if name in seen or name not in self.types:
            raise ContractError(f'unresolved/cyclic XSD owner: {name}')
        node = self.types[name]
        result = {}
        for ext in node.findall('.//' + XS + 'extension'):
            result.update(self.attributes(ext.get('base'), seen + (name,)))
        for group in node.findall('.//' + XS + 'attributeGroup'):
            result.update(self.attributes(group.get('ref'), seen + (name,)))
        for attr in node.findall('.//' + XS + 'attribute'):
            result[attr.get('name')] = dict(attr.attrib)
        return result

    def binding(self, binding):
        attr = self.attributes(binding.owner).get(binding.attribute)
        if attr is None or attr.get('type') != binding.type_name:
            raise ContractError(f'{binding.owner}/@{binding.attribute}: expected type {binding.type_name}, got {attr}')
        return attr


def sql_code(path):
    # Keep strings intact; numbers and enums in comments cannot satisfy a rule.
    text = path.read_text(encoding='utf-8')
    return re.sub(r"'(?:''|[^'])*'|/\*.*?\*/|--[^\n]*", lambda m: m[0] if m[0].startswith("'") else ' ', text, flags=re.S)


def one(pattern, text, label):
    matches = list(re.finditer(pattern, text, re.S | re.I))
    if len(matches) != 1:
        raise ContractError(f'{label}: expected one SQL rule, found {len(matches)}; review changed SQL shape')
    return matches[0]


def strings(text):
    return [value.replace("''", "'") for value in re.findall(r"'((?:''|[^'])*)'", text)]


def sql_lengths(sql, exchange):
    loop = one(r"FOREACH f IN ARRAY ARRAY\[([^\]]*)\] LOOP\s*lim\s*:=\s*CASE f\s+(.*?)\s+END;\s*IF length\(COALESCE\(p->>f,''\)\) > lim THEN", sql, 'NU length loop')
    fields = strings(loop[1])
    cases = dict((field, int(value)) for field, value in re.findall(r"WHEN '([^']+)' THEN (\d+)", loop[2]))
    default = int(one(r'ELSE (\d+)\s*$', loop[2], 'default name/key limit')[1])
    limits = {field: cases.get(field, default) for field in fields}
    limits['respondingAuthority'] = int(one(r"length\(btrim\(COALESCE\(item->>'respondingAuthority',''\)\)\) NOT BETWEEN 1 AND (\d+)", sql, 'ACK authority limit')[1])
    limits['statusMessage'] = int(one(r"length\(COALESCE\(item->>'statusMessage',''\)\) > (\d+)", sql, 'ACK statusMessage limit')[1])
    limits['enStatusMessage'] = int(one(r"length\(COALESCE\(p->>'statusMessage',''\)\)>(\d+)", exchange, 'EN statusMessage limit')[1])
    return limits


def sql_enums(sql, exchange):
    result = {}
    for field in ('requestSource', 'requestPurpose'):
        result[field] = sorted(strings(one(r"COALESCE\(p->>'" + field + r"',''\) NOT IN \(([^)]+)\)", sql, field)[1]))
    result['ackStatusCode'] = sorted(strings(one(r"COALESCE\(item->>'statusCode',''\) NOT IN \(([^)]+)\)", sql, 'ACK statusCode')[1]))
    result['errorStatusCode'] = sorted(strings(one(r'code NOT IN \(([^)]+)\)', exchange, 'EN statusCode')[1]))
    return result


def unregistered_migrations(directory):
    known = {p.name for p in MIGRATIONS}
    pattern = r'(?:ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?erru\.nu_message\b|CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+erru\.nu_)'
    return [f'{p.name}: new NU DDL; review the static contract mapping before proceeding'
            for p in sorted(directory.glob('*.sql'))
            if p.name not in known and not p.name.endswith('-rollback.sql')
            and re.search(pattern, sql_code(p), re.I)]


def check(schemas=SCHEMAS, validation=VALIDATION, exchange=EXCHANGE, initial=INITIAL):
    errors, checked = unregistered_migrations(VALIDATION.parent), 0
    try:
        schema = Schema(Path(schemas))
        sql, en, base = map(sql_code, (Path(validation), Path(exchange), Path(initial)))
        limits, enums = sql_lengths(sql, en), sql_enums(sql, en)
        def compare(label, expected, actual):
            nonlocal checked
            checked += 1
            if expected != actual:
                errors.append(f'{label}: XSD={expected!r}, SQL={actual!r}')
        for field, binding in LENGTHS.items():
            schema.binding(binding)
            expected = schema.facets(binding.type_name)['maxLength']
            compare(f'{field} ({binding.type_name}) maxLength', expected, limits.get(field))
            if binding.column:
                column = re.escape(binding.column)
                width = int(one(r'\b' + column + r'\s+VARCHAR\((\d+)\)', base, field + ' storage')[1])
                altered = re.findall(r'ALTER COLUMN ' + column + r' TYPE VARCHAR\((\d+)\)', sql, re.I)
                if altered:
                    width = int(altered[-1])
                checks = re.findall(r'length\(' + column + r'\)\s*<=\s*(\d+)', sql, re.I)
                compare(f'{field} ({binding.type_name}) effective DB maximum', expected, min([width] + list(map(int, checks))))
        for field, binding in ENUMS.items():
            schema.binding(binding)
            expected = schema.facets(binding.type_name)['enum']
            compare(f'{field} ({binding.type_name}) enum', expected, enums[field])
        for field, column in [('requestSource', 'request_source'), ('requestPurpose', 'request_purpose')]:
            actual = sorted(strings(one(r'\b' + column + r' IN \(([^)]+)\)', sql, column + ' CHECK')[1]))
            compare(field + ' DB enum', schema.facets(ENUMS[field].type_name)['enum'], actual)
        minimum = schema.facets('globalDateTimeType')['minInclusive']
        for label, text in [('Request', sql), ('EN', en)]:
            actual = one(r"::TIMESTAMPTZ < '([^']+)'::TIMESTAMPTZ", text, label + ' sentAt minimum')[1]
            compare(label + ' sentAt (globalDateTimeType) minInclusive', minimum, actual)
        version = schema.attributes('globalHeaderType')['version']['fixed']
        compare('Header version', '3.5', version)
        compare('outbound Header versions', {version}, set(re.findall(r"'version','([^']+)'", en)))
        return errors, checked
    except (ContractError, ET.ParseError, KeyError, OSError) as exc:
        return errors + [str(exc)], checked


REQUEST = {
    'technicalId': '11111111-2222-4333-8444-555555555555',
    'workflowId': '11111111-2222-4333-8444-555555555556',
    'sentAt': '2026-01-01T12:00:00Z', 'from': 'DE',
    'businessCaseId': 'NU-CONTRACT', 'originatingAuthority': 'DE-CA',
    'requestSource': 'CA', 'requestPurpose': 'Issue',
    'tmFirstName': 'Test', 'tmFamilyName': 'Manager', 'tmDateOfBirth': '1980-01-01',
    'certificateNumber': 'CERT-1', 'certificateIssueDate': '2020-01-01', 'certificateIssueCountry': 'EE',
}
ACK = {'memberStates': [{'memberStateCode': 'DE', 'respondingAuthority': 'DE-CA', 'statusCode': 'OK'}]}


def literal(value):
    return "'" + str(value).replace("'", "''") + "'"


def generate(schema_dir=SCHEMAS):
    schema = Schema(Path(schema_dir))
    sql = ['\\set ON_ERROR_STOP on', 'BEGIN;']
    sql.append('''CREATE FUNCTION pg_temp.contract_assert(ok BOOLEAN, label TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'XSD contract mismatch: %',label; END IF; END $$;''')
    count = 0

    def validate(label, payload, valid, kind='inbound'):
        nonlocal count
        expr = f"erru.nu_validate({literal(json.dumps(payload))}::JSONB,{literal(kind)})->>'valid'"
        expr += " = 'true'" if valid else " IS DISTINCT FROM 'true'"
        sql.append(f'SELECT pg_temp.contract_assert({expr},{literal(label)});')
        count += 1

    def en_validate(label, field, value, valid):
        nonlocal count
        p = dict(technicalId=str(uuid.uuid5(uuid.NAMESPACE_URL, label)), workflowId=REQUEST['workflowId'],
                 sentAt=REQUEST['sentAt'], to='EE', businessCaseId='NU-CONTRACT-EN',
                 statusCode='InvalidFormat', originalMessage='<unparseable')
        p['from'] = 'DE'
        p[field] = value
        expr = f"erru.nu_record_exchange_result({literal(json.dumps(p))}::JSONB,'ErrorNotification')->>'httpStatus'"
        expr += " = '202'" if valid else " = '400'"
        sql.append(f'SELECT pg_temp.contract_assert({expr},{literal(label)});')
        count += 1

    def db_length(field, value, valid):
        nonlocal count
        binding = LENGTHS[field]
        values = {'direction': 'incoming', 'status': 'received', 'nu_from': 'DE', 'nu_to': 'EE',
                  'technical_id': str(uuid.uuid5(uuid.NAMESPACE_URL, f'db-{field}-{len(value)}')),
                  'workflow_id': REQUEST['workflowId'], 'sent_at': REQUEST['sentAt'],
                  'request_source': 'CA', 'request_purpose': 'Issue', 'created_by': 'contract-test',
                  'certificate_issue_country': 'EE'}
        for f, b in (LENGTHS | DATES).items():
            if b.column and f in REQUEST:
                values[b.column] = REQUEST[f]
        values[binding.column] = value
        columns = ','.join(['nu_message_key'] + list(values))
        row = ','.join(["nextval('erru.seq_nu_message_key')"] + [literal(v) for v in values.values()])
        label = literal(f'DB {field} length {len(value)}, expected accepted={valid}')
        sql.append(f'''DO $$ BEGIN
  BEGIN
    INSERT INTO erru.nu_message({columns}) VALUES({row});
    PERFORM pg_temp.contract_assert({str(valid).lower()},{label});
  EXCEPTION WHEN check_violation OR string_data_right_truncation THEN
    PERFORM pg_temp.contract_assert({str(not valid).lower()},{label});
  END;
END $$;''')
        count += 1

    validate('baseline Request', REQUEST, True)
    validate('baseline ACK', ACK, True, 'ack')
    for field, b in LENGTHS.items():
        attr = schema.binding(b)
        facets = schema.facets(b.type_name)
        limit, minimum = facets['maxLength'], facets.get('minLength', 0)
        low_valid = minimum == 1 and attr.get('use', 'optional') != 'required'
        boundaries = dict([(minimum, True), (limit, True), (limit + 1, False)])
        if minimum:
            boundaries[minimum - 1] = low_valid
        for size, valid in boundaries.items():
            label = f'{field} {b.type_name} length={size}'
            if field == 'enStatusMessage':
                en_validate(label, 'statusMessage', 'A' * size, valid)
            elif b.owner == 'nurMemberStateType':
                payload = deepcopy(ACK)
                payload['memberStates'][0][field] = 'A' * size
                validate(label, payload, valid, 'ack')
            else:
                validate(label, REQUEST | {field: 'A' * size}, valid)
            if b.column and size > 0:
                db_length(field, 'A' * size, valid)

    for field, b in ENUMS.items():
        values = schema.facets(b.type_name)['enum']
        for value in values + ['UNRECOGNIZED-CONTRACT-VALUE']:
            valid = value in values
            label = f'{field} {b.type_name} enum={value}'
            if field == 'errorStatusCode':
                en_validate(label, 'statusCode', value, valid)
            elif field == 'ackStatusCode':
                payload = deepcopy(ACK)
                payload['memberStates'][0]['statusCode'] = value
                validate(label, payload, valid, 'ack')
            else:
                validate(label, REQUEST | {field: value}, valid)

    for field, b in (LENGTHS | DATES).items():
        if b.owner in ('nurMemberStateType', 'errorNotificationType'):
            continue
        attr = schema.binding(b)
        payload = REQUEST.copy()
        payload.pop(field, None)
        validate(field + ' omitted', payload, attr.get('use', 'optional') != 'required')
    for field, attr in schema.attributes('nurMemberStateType').items():
        payload = deepcopy(ACK)
        payload['memberStates'][0].pop(field, None)
        validate('ACK ' + field + ' omitted', payload, attr.get('use', 'optional') != 'required', 'ack')

    minimum = schema.facets('globalDateTimeType')['minInclusive']
    before = (datetime.fromisoformat(minimum.replace('Z', '+00:00')) - timedelta(seconds=1)).strftime('%Y-%m-%dT%H:%M:%SZ')
    for value, valid in [(minimum, True), (before, False), ('2026-02-30T12:00:00Z', False)]:
        validate('Request sentAt=' + value, REQUEST | {'sentAt': value}, valid)
        en_validate('EN sentAt=' + value, 'sentAt', value, valid)
    sent_at = schema.attributes('globalHeaderType')['sentAt']
    validate('sentAt omitted', {k: v for k, v in REQUEST.items() if k != 'sentAt'}, sent_at.get('use') != 'required')
    for field in DATES:
        validate(field + ' invalid calendar date', REQUEST | {field: '2026-02-30'}, False)
        validate(field + ' leap day', REQUEST | {field: '2028-02-29'}, True)

    # Fail explicitly if the currently supported wire choice changes shape.
    choice = schema.roots['NotifyUnfitness_Request.xsd'].find('.//' + XS + 'choice')
    if choice is None:
        raise ValueError('NU Request no longer has the supported identity choice')
    actual = {branch.get('name'): [(n.get('name'), n.get('minOccurs', '1'))
              for n in branch.findall('./' + XS + 'complexType/' + XS + 'sequence/' + XS + 'element')]
              for branch in choice}
    expected = {
        'TransportManagerNameDetails': [('TransportManager', '1'), ('CertificateOfProfessionalCompetence', '0')],
        'TransportManagerCertificateDetails': [('CertificateOfProfessionalCompetence', '1'), ('TransportManager', '0')],
    }
    if actual != expected:
        raise ValueError(f'NU identity choice changed: {actual}; review DTO mapping')
    name_fields = ['tmFirstName', 'tmFamilyName', 'tmDateOfBirth']
    cert_fields = ['certificateNumber', 'certificateIssueDate', 'certificateIssueCountry']
    validate('name-only choice', {k: v for k, v in REQUEST.items() if k not in cert_fields}, True)
    validate('certificate-only choice', {k: v for k, v in REQUEST.items() if k not in name_fields}, True)
    validate('neither choice', {k: v for k, v in REQUEST.items() if k not in name_fields + cert_fields}, False)
    validate('empty ACK member states', {'memberStates': []}, False, 'ack')
    sql.extend(['ROLLBACK;', f'\\echo OK - {count} XSD-derived NU behavior checks'])
    return '\n'.join(sql) + ''.join(
        '\n' + p.read_text(encoding='utf-8')
        for p in sorted((ROOT / 'tests/sql').glob('*.sql'))
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--schemas', type=Path, default=SCHEMAS)
    parser.add_argument('--validation-sql', type=Path, default=VALIDATION)
    parser.add_argument('--exchange-sql', type=Path, default=EXCHANGE)
    parser.add_argument('--initial-sql', type=Path, default=INITIAL)
    parser.add_argument('--emit-sql', action='store_true', help='Emit XSD and exchange tests for an already migrated E2E database')
    args = parser.parse_args()
    errors, count = check(args.schemas, args.validation_sql, args.exchange_sql, args.initial_sql)
    output = sys.stderr if args.emit_sql else sys.stdout
    for error in errors:
        print('MISMATCH:', error, file=output)
    print(f'{"FAILED" if errors else "OK"} — {count} NU contract checks', file=output)
    if args.emit_sql and not errors:
        print(generate(args.schemas), end='')
    return bool(errors)


if __name__ == '__main__':
    sys.exit(main())
