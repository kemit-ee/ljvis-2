"""The DMapper text-safety check must flag a plain interpolation that is not listed and a stale allowlist entry."""
from pathlib import Path
import tempfile
import unittest

from check_dmapper_text_escape import ALLOWLIST, TEMPLATES, check


class Tree(unittest.TestCase):
    def make(self, template, allowlist):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        (root / TEMPLATES).mkdir(parents=True)
        (root / TEMPLATES / "map_x.handlebars").write_text(template, encoding="utf-8")
        (root / ALLOWLIST).parent.mkdir(parents=True)
        (root / ALLOWLIST).write_text(allowlist, encoding="utf-8")
        return root

    def test_json_helper_is_clean(self):
        root = self.make('"name": {{#if this.name}}{{{json this.name}}}{{else}}""{{/if}},\n', "")
        self.assertEqual([], check(root))

    def test_listed_plain_field_is_clean(self):
        root = self.make('"status": "{{this.status}}",\n', "# comment\nmap_x.handlebars status  # enum\n")
        self.assertEqual([], check(root))

    def test_unlisted_plain_field_is_flagged_with_line(self):
        root = self.make('{\n"companyName": "{{this.companyName}}",\n', "")
        errors = check(root)
        self.assertEqual(1, len(errors))
        self.assertIn("map_x.handlebars:2", errors[0])
        self.assertIn("companyName", errors[0])

    def test_stale_allowlist_entry_is_flagged(self):
        root = self.make('"name": {{{json this.name}}},\n', "map_x.handlebars status\n")
        errors = check(root)
        self.assertEqual(1, len(errors))
        self.assertIn("status", errors[0])

    def test_allowlist_entry_does_not_cover_another_template(self):
        root = self.make('"status": "{{this.status}}",\n', "map_other.handlebars status\n")
        errors = check(root)
        self.assertEqual(2, len(errors))
        self.assertIn("map_x.handlebars:1", errors[0])
        self.assertIn("map_other.handlebars status", errors[1])

    def test_nested_path_is_checked(self):
        root = self.make('"zip": "{{this.address.zip}}",\n', "")
        self.assertIn("address.zip", check(root)[0])

    def test_unquoted_and_triple_stash_are_ignored(self):
        root = self.make('"n": {{this.n}},\n"raw": {{{this.raw}}},\n', "")
        self.assertEqual([], check(root))


if __name__ == "__main__":
    unittest.main()
