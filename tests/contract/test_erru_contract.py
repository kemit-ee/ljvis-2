"""Mutations must fail even when the old number/enum remains elsewhere in SQL."""
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

from check_erru_contract import SCHEMAS, VALIDATION, EXCHANGE, INITIAL, check, strings, unregistered_migrations


class SqlStrings(unittest.TestCase):
    def test_doubled_apostrophes(self):
        self.assertEqual(['CA', "O'Brien", '', "'"], strings("('CA', 'O''Brien', '', '''')"))


class ContractMutations(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.schemas = self.root / 'schemas'
        shutil.copytree(SCHEMAS, self.schemas)
        self.validation = self.root / 'validation.sql'
        self.exchange = self.root / 'exchange.sql'
        self.initial = self.root / 'initial.sql'
        for src, dst in [(VALIDATION, self.validation), (EXCHANGE, self.exchange), (INITIAL, self.initial)]:
            shutil.copyfile(src, dst)

    def errors(self):
        return check(self.schemas, self.validation, self.exchange, self.initial)[0]

    def replace(self, path, old, new):
        text = path.read_text()
        self.assertIn(old, text)
        path.write_text(text.replace(old, new, 1))

    def test_baseline(self):
        self.assertEqual([], self.errors())

    def test_sql_emission_uses_migrated_database_and_includes_exchange_tests(self):
        cli = subprocess.run([sys.executable, str(Path(__file__).with_name('check_erru_contract.py')),
                              '--emit-sql'], capture_output=True, text=True)
        self.assertEqual(0, cli.returncode, cli.stderr)
        self.assertIn('125 XSD-derived NU behavior checks', cli.stdout)
        self.assertIn('EN correlated with ACK', cli.stdout)
        self.assertNotIn('\\i ', cli.stdout)
        self.assertNotIn('CREATE TABLE', cli.stdout)
        self.assertNotIn('29 NU contract checks', cli.stdout)

    def test_sql_emission_fails_before_output_on_contract_mismatch(self):
        self.replace(self.validation, "WHEN 'tmPlaceOfBirth' THEN 50", "WHEN 'tmPlaceOfBirth' THEN 51")
        cli = subprocess.run([sys.executable, str(Path(__file__).with_name('check_erru_contract.py')),
                              '--emit-sql', '--validation-sql', str(self.validation)], capture_output=True, text=True)
        self.assertEqual(1, cli.returncode)
        self.assertEqual('', cli.stdout)
        self.assertIn('MISMATCH:', cli.stderr)

    def test_two_xsd_changes(self):
        path = self.schemas / 'Global_Types.xsd'
        text = path.read_text()
        text, count = re.subn(r'(<xs:simpleType name="globalPlaceOfBirthType">.*?<xs:maxLength value=")50', r'\g<1>51', text, flags=re.S)
        self.assertEqual(1, count)
        text, count = re.subn(r'(<xs:simpleType name="globalRequestSourceType">.*?)(</xs:restriction>)', r'\1<xs:enumeration value="NewSource"/>\2', text, flags=re.S)
        self.assertEqual(1, count)
        path.write_text(text)
        errors = '\n'.join(self.errors())
        self.assertIn('tmPlaceOfBirth (globalPlaceOfBirthType) maxLength: XSD=51, SQL=50', errors)
        self.assertIn('requestSource (globalRequestSourceType)', errors)
        self.assertIn('NewSource', errors)
        cli = subprocess.run([sys.executable, str(Path(__file__).with_name('check_erru_contract.py')),
                              '--schemas', str(self.schemas)], capture_output=True, text=True)
        self.assertEqual(1, cli.returncode)
        self.assertIn('MISMATCH:', cli.stdout)
        self.assertIn('globalPlaceOfBirthType', cli.stdout)
        self.assertIn('globalRequestSourceType', cli.stdout)

    def test_sql_limit_changed_but_old_number_still_exists(self):
        self.replace(self.validation, "WHEN 'tmPlaceOfBirth' THEN 50", "WHEN 'tmPlaceOfBirth' THEN 51")
        self.assertIn('50', self.validation.read_text())
        self.assertTrue(any('tmPlaceOfBirth' in e and 'SQL=51' in e for e in self.errors()))

    def test_sql_enum_changed(self):
        self.replace(self.validation, "COALESCE(p->>'requestSource','') NOT IN ('CA','RSI','Hub','Other')", "COALESCE(p->>'requestSource','') NOT IN ('CA','RSI','Hub')")
        self.assertTrue(any('requestSource (globalRequestSourceType)' in e for e in self.errors()))

    def test_en_enum_changed_in_separate_migration(self):
        self.replace(self.exchange, "'ServerError','Other','ResponseNotCorrelated'", "'ServerError','ResponseNotCorrelated'")
        self.assertTrue(any('errorStatusCode (errorStatusCodeType)' in e for e in self.errors()))

    def test_nysiis_storage_too_narrow(self):
        self.replace(self.validation, 'ALTER COLUMN tm_first_name_search_key TYPE VARCHAR(100)', 'ALTER COLUMN tm_first_name_search_key TYPE VARCHAR(20)')
        self.assertTrue(any('tmFirstNameSearchKey' in e and 'DB maximum' in e for e in self.errors()))

    def test_changed_date_minimum(self):
        self.replace(self.validation, "v::TIMESTAMPTZ < '1753-01-01T00:00:00Z'", "v::TIMESTAMPTZ < '1800-01-01T00:00:00Z'")
        self.assertTrue(any('sentAt' in e and '1800-' in e for e in self.errors()))

    def test_missing_length_guard_fails_closed(self):
        self.replace(self.validation, "IF length(COALESCE(p->>f,'')) > lim THEN", "IF false THEN")
        self.assertTrue(any('NU length loop' in e for e in self.errors()))

    def test_changed_field_type(self):
        self.replace(self.schemas / 'Global_Types.xsd', 'name="placeOfBirth" type="globalPlaceOfBirthType"', 'name="placeOfBirth" type="globalNameType"')
        self.assertTrue(any('placeOfBirth' in e and 'expected type' in e for e in self.errors()))

    def test_new_nu_migration_requires_mapping_review(self):
        (self.root / 'new-nu-rules.sql').write_text('ALTER TABLE erru.nu_message ADD COLUMN test TEXT;')
        self.assertTrue(any('new-nu-rules.sql' in e for e in unregistered_migrations(self.root)))

    def test_missing_schema(self):
        (self.schemas / 'Global_Types.xsd').unlink()
        self.assertTrue(self.errors())

    def test_wrong_namespace(self):
        p = self.schemas / 'NotifyUnfitness_Request.xsd'
        self.replace(p, 'targetNamespace="https://webgate.ec.testa.eu/move-hub/erru/3.5"', 'targetNamespace="https://webgate.ec.testa.eu/move-hub/erru/3.0"')
        self.assertTrue(any('namespace' in e for e in self.errors()))

    def test_comments_cannot_supply_a_removed_rule(self):
        self.replace(self.validation, "length(tm_place_of_birth) <= 50", "length(tm_place_of_birth) <= 51 /* length(tm_place_of_birth) <= 50 */")
        self.assertTrue(any('tmPlaceOfBirth' in e and 'DB maximum' in e for e in self.errors()))


if __name__ == '__main__':
    unittest.main()
