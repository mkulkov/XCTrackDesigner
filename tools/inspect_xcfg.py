"""Read-only XCFG inventory. No input values from pilot/sensor/navigation preferences are emitted."""
import argparse
import collections
import hashlib
import json
from pathlib import Path


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def reject_constant(value):
    raise ValueError(f"Non-JSON numeric constant: {value}")


def inspect(source: Path):
    raw = source.read_bytes()
    data = json.loads(raw.decode("utf-8-sig"), object_pairs_hook=unique_object,
                      parse_constant=reject_constant)
    if not isinstance(data, dict):
        raise ValueError("XCFG root must be an object")
    layout = data.get("layout")
    if not isinstance(layout, dict):
        raise ValueError("Missing object: layout")
    classes = collections.Counter()
    parameters = collections.defaultdict(set)
    pages = []
    issues = []
    for orientation in ("landscape", "portrait"):
        sequence = layout.get(orientation, [])
        if not isinstance(sequence, list):
            raise ValueError(f"layout.{orientation} must be an array")
        for index, page in enumerate(sequence):
            path = f"$.layout.{orientation}[{index}]"
            if not isinstance(page, dict) or not isinstance(page.get("widgets"), list):
                raise ValueError(f"{path}: expected page object with widgets array")
            boxes = []
            widgets = []
            for order, widget in enumerate(page["widgets"]):
                widget_path = f"{path}.widgets[{order}]"
                if not isinstance(widget, dict):
                    raise ValueError(f"{widget_path}: expected object")
                cls = widget.get("CLASS", "<missing>")
                if not isinstance(cls, str):
                    raise ValueError(f"{widget_path}.CLASS must be a string")
                classes[cls] += 1
                parameters[cls].update(widget.keys())
                bounds = [widget.get(key) for key in ("X1", "Y1", "X2", "Y2")]
                valid = all(type(v) is int and 0 <= v <= 10000 for v in bounds)
                if valid:
                    valid = bounds[0] < bounds[2] and bounds[1] < bounds[3]
                if not valid:
                    issues.append({"path": widget_path, "issue": "invalid or unsupported rectangle"})
                boxes.append(bounds if valid else None)
                widgets.append({"path": widget_path, "class": cls, "bounds": bounds,
                                "theme": widget.get("_theme"), "background": widget.get("_bg"),
                                "keys": sorted(widget)})
            overlaps = []
            for a, first in enumerate(boxes):
                for b in range(a + 1, len(boxes)):
                    second = boxes[b]
                    if first and second and max(first[0], second[0]) < min(first[2], second[2]) and max(first[1], second[1]) < min(first[3], second[3]):
                        overlaps.append([a, b])
            pages.append({"path": path, "class": page.get("CLASS"),
                          "keys": sorted(page), "widgetCount": len(widgets),
                          "overlapPairs": overlaps, "widgets": widgets})
    preferences = data.get("preferences", {})
    if not isinstance(preferences, dict):
        raise ValueError("preferences must be an object if present")
    info = data.get("info", {})
    if not isinstance(info, dict):
        raise ValueError("info must be an object if present")
    return {
        "sourceName": source.name, "sha256": hashlib.sha256(raw).hexdigest(),
        "byteLength": len(raw), "rootKeys": sorted(data),
        "version": {key: info.get(key) for key in ("versionName", "versionCode", "exportType")},
        "preferenceCount": len(preferences),
        "displayAndUnits": {key: value for key, value in preferences.items()
                            if key.startswith(("Display.", "Unit."))},
        "pageCount": len(pages), "widgetCount": sum(classes.values()),
        "uniqueWidgetClasses": len(classes), "classes": dict(sorted(classes.items())),
        "parameterKeysByClass": {key: sorted(value) for key, value in sorted(parameters.items())},
        "pages": pages, "issues": issues,
        "scope": "Inventory of primary layout only; not a full schema or XCTrack import validation",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--out", type=Path, help="Write inventory JSON; must differ from source")
    args = parser.parse_args()
    if args.out and (args.out.resolve() == args.source.resolve() or
                     (args.out.exists() and args.out.samefile(args.source))):
        parser.error("Output must not overwrite source")
    report = json.dumps(inspect(args.source), ensure_ascii=False, indent=2) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(report, encoding="utf-8")
    else:
        print(report, end="")


if __name__ == "__main__":
    main()
