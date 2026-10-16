"""The parallel plan must run every collection exactly once and reject drift."""
import importlib.util
import json
from pathlib import Path
import re
import os
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('api_groups', ROOT / 'groups.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class TestGroups(unittest.TestCase):
    def test_runner_and_plan_cover_the_same_collections(self):
        plan = module.groups()
        planned = [name for names in plan.values() for name in names]
        calls = re.findall(r'^\s*run_collection ([\w-]+)', (ROOT / 'run-all.sh').read_text(), re.M)
        self.assertEqual(sorted(planned), sorted(calls))
        self.assertEqual(len(calls), len(set(calls)))

    def test_new_collection_requires_assignment(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'collections').mkdir()
            (root / 'collections/new.collection.json').write_text('{}')
            (root / 'groups.json').write_text(json.dumps({'core': []}))
            with patch.object(module, 'ROOT', root), self.assertRaises(SystemExit):
                module.groups()

    def test_duplicate_collection_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'collections').mkdir()
            (root / 'collections/one.collection.json').write_text('{}')
            (root / 'groups.json').write_text(json.dumps({'core': ['one'], 'erru': ['one']}))
            with patch.object(module, 'ROOT', root), self.assertRaises(SystemExit):
                module.groups()


class TestRunnerDispatch(unittest.TestCase):
    def run_group(self, group, fail=''):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            log = root / 'calls.jsonl'
            stub = '#!' + sys.executable + "\n" + r'''import json, os, sys
from pathlib import Path
name = Path(sys.argv[0]).name
if name == 'python3' and len(sys.argv) > 1 and sys.argv[1].endswith('/groups.py'):
    os.execv(sys.executable, [sys.executable] + sys.argv[1:])
with open(os.environ['TEST_CALL_LOG'], 'a') as output:
    output.write(json.dumps([name] + sys.argv[1:]) + '\n')
if name == 'python3' and sys.argv[1:] == ['-']:
    sys.stdin.read()
if name == 'newman' and os.environ.get('TEST_FAIL_COLLECTION'):
    if sys.argv[2].endswith('/' + os.environ['TEST_FAIL_COLLECTION'] + '.collection.json'):
        sys.exit(1)
'''
            for name in ('python3', 'docker', 'curl', 'newman'):
                target = root / name
                target.write_text(stub)
                target.chmod(0o755)
            env = dict(os.environ, PATH=str(root) + os.pathsep + os.environ['PATH'],
                       TEST_CALL_LOG=str(log), TEST_FAIL_COLLECTION=fail,
                       E2E_REPORT_DIR=str(root / 'reports'))
            result = subprocess.run(['bash', str(ROOT / 'run-all.sh'), str(ROOT / 'ci-stack-environment.json'), group],
                                    env=env, capture_output=True, text=True)
            calls = [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
            return result, calls

    def test_each_group_dispatches_only_its_collections(self):
        for group, expected in module.groups().items():
            with self.subTest(group=group):
                result, calls = self.run_group(group)
                self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
                actual = [Path(c[2]).name.removesuffix('.collection.json') for c in calls if c[0] == 'newman']
                self.assertEqual(sorted(actual), sorted(expected))
                xtr = [c for c in calls if any('xml_entities_test.py' in arg for arg in c)]
                self.assertEqual(bool(xtr), group == 'xroad')

    def test_failure_does_not_skip_remaining_collections(self):
        result, calls = self.run_group('core', fail='permissions')
        self.assertEqual(result.returncode, 1)
        self.assertEqual(sum(c[0] == 'newman' for c in calls), len(module.groups()['core']))

    def test_unknown_group_fails_before_touching_stack(self):
        result, calls = self.run_group('unknown')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(calls, [])
