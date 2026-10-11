"""Capture UI diagnostics on an explicitly selected emulator; never targets a physical phone."""
import argparse
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--serial", default="emulator-5554")
    parser.add_argument("--adb", default=r"C:\opt\AndroidSDK\platform-tools\adb.exe")
    parser.add_argument("--capture", type=Path)
    args = parser.parse_args()
    if not re.fullmatch(r"emulator-\d+", args.serial):
        parser.error("Only emulator serials are supported")
    sys.stdout.reconfigure(encoding="utf-8")
    base = [args.adb, "-s", args.serial]
    def adb(*command):
        return subprocess.run([*base, *command], check=True, capture_output=True, timeout=30).stdout
    if args.capture:
        args.capture.parent.mkdir(parents=True, exist_ok=True)
        args.capture.write_bytes(adb("exec-out", "screencap", "-p"))
        print(f"Screenshot: {args.capture}")
    adb("shell", "uiautomator", "dump", "/sdcard/xct-qa-window.xml")
    xml = adb("exec-out", "cat", "/sdcard/xct-qa-window.xml")
    local = Path(".local/android-qa/window.xml")
    local.parent.mkdir(parents=True, exist_ok=True)
    local.write_bytes(xml)
    for node in ET.fromstring(xml).iter("node"):
        label = node.get("text") or node.get("content-desc")
        if label:
            print(label[:250], node.get("bounds"))


if __name__ == "__main__":
    main()
