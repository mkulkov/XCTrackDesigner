"""Compare native XCTrack exports, reporting paths/hashes without private setting values."""
import argparse
import hashlib
import json
from pathlib import Path


def differences(before, after, path=""):
    if type(before) is not type(after):
        return [{"pointer": path, "kind": "type"}]
    if isinstance(before, dict):
        result = []
        for key in sorted(before.keys() | after.keys()):
            child = path + "/" + key.replace("~", "~0").replace("/", "~1")
            if key not in before or key not in after:
                result.append({"pointer": child, "kind": "added" if key not in before else "removed"})
            else:
                result.extend(differences(before[key], after[key], child))
        return result
    if isinstance(before, list):
        result = ([{"pointer": path, "kind": "length"}] if len(before) != len(after) else [])
        for index, (first, second) in enumerate(zip(before, after)):
            result.extend(differences(first, second, path + "/" + str(index)))
        return result
    return [] if before == after else [{"pointer": path, "kind": "changed"}]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("source", "export1", "export2", "export3", "pages"):
        parser.add_argument(name, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    inputs = [getattr(args, name) for name in ("source", "export1", "export2", "export3", "pages")]
    if any(args.out.resolve() == path.resolve() or (args.out.exists() and args.out.samefile(path)) for path in inputs):
        parser.error("Output must not overwrite any input")
    data = [json.loads(path.read_text(encoding="utf-8-sig")) for path in inputs]
    report = {"files": [{"role": role, "name": path.name, "bytes": path.stat().st_size,
                         "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                         "rootKeys": sorted(value), "versionName": value["info"].get("versionName"),
                         "versionCode": value["info"].get("versionCode"), "exportType": value["info"].get("exportType")}
                        for role, path, value in zip(("source", "export1", "export2", "export3", "pages"), inputs, data)],
              "comparisons": {}}
    for label, a, b in (("source_to_export1", 0, 1), ("export1_to_export2", 1, 2),
                        ("export2_to_export3_after_pages_import", 2, 3)):
        report["comparisons"][label] = {
            "layoutEqual": data[a].get("layout") == data[b].get("layout"),
            "preferencesEqual": data[a].get("preferences") == data[b].get("preferences"),
            "differences": differences(data[a], data[b])}
    report["pagesLayoutEqualsExport2"] = data[4].get("layout") == data[2].get("layout")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for label, value in report["comparisons"].items():
        print(label, "layoutEqual", value["layoutEqual"], "preferencesEqual", value["preferencesEqual"],
              "differences", len(value["differences"]))
    print("pages layout equal:", report["pagesLayoutEqualsExport2"])


if __name__ == "__main__":
    main()
