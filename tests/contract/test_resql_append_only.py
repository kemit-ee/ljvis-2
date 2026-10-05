"""The SQL append-only lint (epic #522 T4) must flag each forbidden construct and honour the exemption."""
from pathlib import Path
import tempfile
import unittest

from check_resql_append_only import ROOT, check, header_problem, strip_sql, violations

HEADER = "/*\ndescription: test\nnamespace: t\nparams: {}\n*/\n"
PURGE = "DSL/Resql/ljvis/POST/archive/purge.sql"


def rules(sql):
    return {v[0] for v in violations(HEADER + sql)}


class Constructs(unittest.TestCase):
    def test_select_and_insert_are_clean(self):
        self.assertEqual(set(), rules("WITH x AS (SELECT 1) INSERT INTO t SELECT * FROM x WHERE a = ANY(SELECT b FROM c)"))
        self.assertEqual(set(), rules("INSERT INTO t (a) SELECT 1 ON CONFLICT (a) DO NOTHING"))

    def test_mutating_statements(self):
        for sql in ("UPDATE t SET a = 1", "DELETE FROM t", "TRUNCATE t", "MERGE INTO t USING s ON true WHEN MATCHED THEN DELETE",
                    "WITH d AS (DELETE FROM t RETURNING 1) SELECT 1", "INSERT INTO t SELECT 1 ON CONFLICT (a) DO UPDATE SET a = 2"):
            self.assertIn("A1", rules(sql), sql)

    def test_joins_and_lateral(self):
        for sql in ("SELECT 1 FROM a JOIN b ON true", "SELECT 1 FROM a LEFT JOIN b ON true", "SELECT 1 FROM a CROSS JOIN LATERAL f(a) x",
                    "SELECT 1 FROM a, LATERAL f(a) x"):
            self.assertIn("A2", rules(sql), sql)

    def test_for_update_lock_is_not_a_write(self):
        self.assertEqual(set(), rules("SELECT * FROM t FOR UPDATE"))
        self.assertEqual(set(), rules("SELECT * FROM t FOR NO KEY UPDATE"))

    def test_comments_literals_and_identifiers_are_ignored(self):
        self.assertEqual(set(), rules("-- UPDATE x JOIN y\nSELECT 'DELETE FROM t JOIN u' AS note, last_update_at, deleted_at FROM t /* TRUNCATE */"))

    def test_line_numbers_survive_stripping(self):
        text = "/* a\nb */\n-- c\nSELECT 1\nFROM a JOIN b ON true"
        self.assertEqual(5, violations(text)[0][1])
        self.assertEqual(text.count("\n"), strip_sql(text).count("\n"))

    def test_header_must_parse(self):
        self.assertIsNone(header_problem(HEADER))
        self.assertIn("does not parse", header_problem("/*\ndescription: a: b\n*/\nSELECT 1"))
        self.assertIn("missing", header_problem("SELECT 1"))


class Tree(unittest.TestCase):
    def make(self, files, exemption=None):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        for rel, text in files.items():
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            (root / rel).write_text(HEADER + text, encoding="utf-8")
        if exemption is not None:
            (root / ".sql-rule-exemption").write_text(exemption, encoding="utf-8")
        return root

    def test_real_repository_is_clean(self):
        self.assertEqual([], check(ROOT))

    def test_violation_is_reported_with_path_and_line(self):
        root = self.make({"DSL/Resql/ljvis/POST/x/a.sql": "UPDATE t SET a = 1"})
        errors = check(root)
        self.assertEqual(1, len(errors))
        self.assertIn("DSL/Resql/ljvis/POST/x/a.sql:", errors[0])

    def test_exemption_allows_only_the_retention_delete(self):
        root = self.make({PURGE: "DELETE FROM t WHERE id = 1"}, f"{PURGE}  # retention purge\n")
        self.assertEqual([], check(root))
        root = self.make({PURGE: "DELETE FROM t WHERE id = 1;\nUPDATE t SET a = 1"}, f"{PURGE}  # retention purge\n")
        self.assertTrue(any("more than the retention DELETE" in e for e in check(root)))

    def test_exemption_needs_rationale_archive_path_and_a_real_violation(self):
        self.assertTrue(any("no rationale" in e for e in check(self.make({PURGE: "DELETE FROM t"}, f"{PURGE}\n"))))
        other = "DSL/Resql/ljvis/POST/x/a.sql"
        self.assertTrue(any("outside" in e for e in check(self.make({other: "DELETE FROM t"}, f"{other}  # no\n"))))
        stale = self.make({PURGE: "SELECT 1"}, f"{PURGE}  # purge\n")
        self.assertTrue(any("no violation" in e for e in check(stale)))

    def test_unparseable_header_fails(self):
        root = self.make({"DSL/Resql/ljvis/POST/x/a.sql": "SELECT 1"})
        (root / "DSL/Resql/ljvis/POST/x/a.sql").write_text("/*\ndescription: a: b\n*/\nSELECT 1", encoding="utf-8")
        self.assertTrue(any("A4" in e for e in check(root)))


if __name__ == "__main__":
    unittest.main()
