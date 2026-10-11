"""Make a private browser font copy; never change APK or source font files."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import zipfile


def checksum(data):
    data += b"\0" * (-len(data) % 4)
    return sum(struct.unpack(f">{len(data) // 4}I", data)) & 0xFFFFFFFF


def browser_copy(source):
    count = struct.unpack_from(">H", source, 4)[0]
    tables = []
    removed = 0
    for i in range(count):
        tag, _, offset, length = struct.unpack_from(">4sIII", source, 12 + i * 16)
        data = source[offset:offset + length]
        if tag == b"cmap":
            version, subcount = struct.unpack_from(">HH", data)
            records = []
            for j in range(subcount):
                platform, encoding, start = struct.unpack_from(">HHI", data, 4 + j * 8)
                fmt = struct.unpack_from(">H", data, start)[0]
                size = struct.unpack_from(">I" if fmt in (12, 13) else ">H", data, start + (4 if fmt in (12, 13) else 2))[0]
                sub = data[start:start + size]
                if fmt == 12:
                    groups = []
                    for k in range(struct.unpack_from(">I", sub, 12)[0]):
                        first, last, glyph = struct.unpack_from(">III", sub, 16 + k * 12)
                        if first > 0x10FFFF:
                            removed += 1
                        else:
                            groups.append((first, min(last, 0x10FFFF), glyph))
                    sub = sub[:4] + struct.pack(">III", 16 + 12 * len(groups), struct.unpack_from(">I", sub, 8)[0], len(groups)) + b"".join(struct.pack(">III", *g) for g in groups)
                records.append((platform, encoding, sub))
            header = struct.pack(">HH", version, subcount)
            payload = b""
            for platform, encoding, sub in records:
                header += struct.pack(">HHI", platform, encoding, 4 + subcount * 8 + len(payload))
                payload += sub
            data = header + payload
        if tag == b"head":
            data = data[:8] + b"\0" * 4 + data[12:]
        tables.append((tag, data))
    header = source[:12]
    payload = b""
    head_offset = 0
    for tag, data in tables:
        offset = 12 + count * 16 + len(payload)
        header += struct.pack(">4sIII", tag, checksum(data), offset, len(data))
        if tag == b"head":
            head_offset = offset
        payload += data + b"\0" * (-len(data) % 4)
    result = bytearray(header + payload)
    struct.pack_into(">I", result, head_offset + 8, (0xB1B0AFBA - checksum(bytes(result))) & 0xFFFFFFFF)
    return bytes(result), removed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apk", type=Path, required=True)
    parser.add_argument("--title", type=Path, required=True)
    args = parser.parse_args()
    target = Path(__file__).resolve().parent.parent / ".local" / "fonts"
    target.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.apk) as apk:
        original = apk.read("res/H5.ttf")
    if hashlib.sha256(original).hexdigest() != "883a56015aff9902b472661b67afdd27e243616f1a0d9cae16c6e0b8cec4111c":
        raise ValueError("Unexpected XCTrack value font; profile 91260 required")
    value, removed = browser_copy(original)
    title = args.title.read_bytes()
    for name, data in (("xc-value.ttf", value), ("xc-title.ttf", title)):
        destination = target / name
        if destination.resolve() in (args.apk.resolve(), args.title.resolve()):
            raise ValueError("Refusing to overwrite source")
        destination.write_bytes(data)
    report = {"removedInvalidCmapGroups": removed, "valueSourceSHA256": hashlib.sha256(original).hexdigest(), "valueBrowserSHA256": hashlib.sha256(value).hexdigest(), "titleSHA256": hashlib.sha256(title).hexdigest()}
    (target / "provenance.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
