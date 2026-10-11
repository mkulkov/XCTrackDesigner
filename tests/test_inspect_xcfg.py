import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import subprocess
import sys

spec = importlib.util.spec_from_file_location("inspect_xcfg", Path(__file__).parents[1] / "tools" / "inspect_xcfg.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class InventoryTests(unittest.TestCase):
    def inspect_text(self, text):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "synthetic.xcfg"
            path.write_text(text, encoding="utf-8")
            before = path.read_bytes()
            report = module.inspect(path)
            self.assertEqual(before, path.read_bytes())
            return report

    def test_overlays_unknown_keys_and_private_data(self):
        data = {"layout": {"portrait": [{"CLASS": "FuturePage", "widgets": [
            {"CLASS": "FutureWidget", "X1": 0, "Y1": 0, "X2": 10000, "Y2": 10000, "future": {"x": 1}},
            {"CLASS": "KnownWidget", "X1": 0, "Y1": 0, "X2": 2000, "Y2": 2000}]}]},
            "preferences": {"Pilot.Name": "PRIVATE_SENTINEL", "Display.Theme": "WhiteTheme"}}
        report = self.inspect_text(json.dumps(data))
        self.assertEqual(report["pages"][0]["overlapPairs"], [[0, 1]])
        self.assertIn("future", report["parameterKeysByClass"]["FutureWidget"])
        self.assertNotIn("PRIVATE_SENTINEL", json.dumps(report))
        self.assertEqual(report["issues"], [])

    def test_duplicate_keys_rejected(self):
        with self.assertRaises(ValueError):
            self.inspect_text('{"layout": {}, "layout": {}}')

    def test_invalid_rectangle_is_reported(self):
        report = self.inspect_text('{"layout":{"portrait":[{"widgets":[{"CLASS":"W","X1":true,"Y1":0,"X2":10001,"Y2":2}]}]}}')
        self.assertEqual(len(report["issues"]), 1)

    def test_non_json_numbers_rejected(self):
        with self.assertRaises(ValueError):
            self.inspect_text('{"layout":{},"x":NaN}')

    def test_cli_cannot_overwrite_source(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "original.xcfg"
            original = b'{"layout":{}}'
            path.write_bytes(original)
            result = subprocess.run([sys.executable, str(Path(module.__file__)),
                                     str(path), "--out", str(path)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(original, path.read_bytes())


if __name__ == "__main__":
    unittest.main()
