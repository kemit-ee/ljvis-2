"""Each epic #502 rule must fail when its fix is reverted (mutation tests on a temp copy)."""
from pathlib import Path
import shutil
import tempfile
import unittest

from check_dsl_security import ROOT, check


class DslSecurityRules(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name)
        shutil.copytree(ROOT / "DSL" / "Ruuter", cls.root / "DSL" / "Ruuter")
        shutil.copytree(ROOT / "frontend" / "src", cls.root / "frontend" / "src")

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def mutate(self, rel, old, new):
        path = self.root / rel
        original = path.read_text(encoding="utf-8")
        self.assertIn(old, original, f"mutation anchor missing in {rel}")
        path.write_text(original.replace(old, new, 1), encoding="utf-8")
        self.addCleanup(path.write_text, original, encoding="utf-8")
        return check(self.root)

    def rules(self, errors):
        return {e.split()[0] for e in errors}

    def test_clean_tree_has_no_violations(self):
        self.assertEqual([], check(self.root))

    def test_r1_actor_field_in_allowlist(self):
        errors = self.mutate("DSL/Ruuter/ljvis/GET/templates/audit/log-audit-event.yml", "      - field: event_type\n", "      - field: actor_personal_code\n        type: string\n      - field: event_type\n")
        self.assertIn("R1", self.rules(errors))

    def test_r2_identity_from_body(self):
        errors = self.mutate("DSL/Ruuter/ljvis/GET/templates/audit/log-audit-event.yml", "${session_personal_code}", "${incoming.body.actor_personal_code}")
        self.assertIn("R2", self.rules(errors))

    def test_r3_missing_allowlist(self):
        errors = self.mutate("DSL/Ruuter/ljvis/GET/v1/classifiers/mock.yml", "  allowlist:\n    params: []\n", "")
        self.assertIn("R3", self.rules(errors))

    def test_r4_template_not_strict(self):
        errors = self.mutate("DSL/Ruuter/ljvis/GET/templates/files/upload.yml", "  strict: true\n", "")
        self.assertIn("R4", self.rules(errors))

    def test_r5_upload_without_prefix(self):
        errors = self.mutate("DSL/Ruuter/ljvis/POST/v1/control-forms/adr-form/edit/files/upload.yml", "    form_number_prefix:", "    form_number_prefix_removed:")
        self.assertIn("R5", self.rules(errors))

    def test_r6_reader_without_ownership_check(self):
        errors = self.mutate("DSL/Ruuter/ljvis/GET/v1/control-forms/adr-form.yml", "checkReadAccess:\n  template:", "checkReadAccess:\n  call: http.post\n  template_removed:")
        self.assertIn("R6", self.rules(errors))

    def test_r6_attachment_download_without_access_type(self):
        errors = self.mutate("DSL/Ruuter/ljvis/GET/v1/control-forms/adr-form/read/files/download.yml", "access_form_type:", "access_form_type_removed:")
        self.assertIn("R6", self.rules(errors))

    def test_r7_caller_sends_undeclared_key(self):
        errors = self.mutate("DSL/Ruuter/ljvis/GET/v1/control-forms/adr-form/read/files/list.yml", "    form_number_prefix:", "    surprise: 1\n    form_number_prefix:")
        self.assertIn("R7", self.rules(errors))

    def test_r8_frontend_sends_identity(self):
        path = self.root / "frontend" / "src" / "zz_mutation.ts"
        path.write_text("export const body = { actor_personal_code: user.pc };\n", encoding="utf-8")
        self.addCleanup(path.unlink)
        self.assertIn("R8", self.rules(check(self.root)))


if __name__ == "__main__":
    unittest.main()
