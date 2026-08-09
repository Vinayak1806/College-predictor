from __future__ import annotations

import runpy
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))


def run_unittest_cases() -> bool:
    suite = unittest.defaultTestLoader.discover(str(ROOT / "tests"), pattern="test_*.py")
    result = unittest.TextTestRunner(verbosity=1).run(suite)
    return result.wasSuccessful()


def run_plain_assertion_tests() -> bool:
    passed = True
    for path in sorted((ROOT / "tests").glob("test_*.py")):
        namespace = runpy.run_path(str(path))
        for name, function in sorted(namespace.items()):
            if not name.startswith("test_") or not callable(function):
                continue
            try:
                function()
                print(f"PASS {path.name}::{name}")
            except Exception as error:
                passed = False
                print(f"FAIL {path.name}::{name}: {error}", file=sys.stderr)
    return passed


if __name__ == "__main__":
    if not (run_unittest_cases() and run_plain_assertion_tests()):
        raise SystemExit(1)
