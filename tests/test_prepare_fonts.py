import importlib.util
from pathlib import Path
import struct
import unittest

spec = importlib.util.spec_from_file_location("prepare_fonts", Path(__file__).parents[1] / "tools" / "prepare_fonts.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class FontCopyTests(unittest.TestCase):
    def test_invalid_unicode_removed_without_changing_glyph_data(self):
        sub = struct.pack(">HHIII", 12, 0, 40, 0, 2) + struct.pack(">III", 48, 57, 2) + struct.pack(">III", 0x1100BF, 0x1100BF, 99)
        cmap = struct.pack(">HHHHI", 0, 1, 3, 10, 12) + sub
        tables = [(b"head", b"\0" * 54), (b"cmap", cmap), (b"glyf", b"immutable glyph shapes"), (b"hmtx", b"immutable advances")]
        header = struct.pack(">IHHHH", 0x10000, 4, 64, 2, 0)
        payload = b""
        for tag, data in tables:
            header += struct.pack(">4sIII", tag, 0, 12 + 64 + len(payload), len(data))
            payload += data + b"\0" * (-len(data) % 4)
        original = header + payload
        result, removed = module.browser_copy(original)
        self.assertEqual(removed, 1)
        self.assertEqual(module.checksum(result), 0xB1B0AFBA)
        extracted = {}
        for i in range(4):
            tag, check, offset, length = struct.unpack_from(">4sIII", result, 12 + i * 16)
            extracted[tag] = result[offset:offset + length]
            if tag != b"head":
                self.assertEqual(check, module.checksum(extracted[tag]))
        self.assertEqual(extracted[b"glyf"], tables[2][1])
        self.assertEqual(extracted[b"hmtx"], tables[3][1])
        self.assertEqual(struct.unpack_from(">III", extracted[b"cmap"], 28), (48, 57, 2))
        self.assertEqual(original, header + payload)


if __name__ == "__main__":
    unittest.main()
