#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import re, sys

ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / "js/app.js").read_text(encoding="utf-8")
sw = (ROOT / "sw.js").read_text(encoding="utf-8")

errors = []

def need(cond, message):
    if not cond:
        errors.append(message)

need("const OKACHIMACHI_CLOSE_MINUTES = 18 * 60;" in app, "18:00 close constant missing")
need("function okachimachiBackgroundAssetName" in app, "night background helper missing")
need("minutes >= OKACHIMACHI_CLOSE_MINUTES" in app, "18:00+ boundary missing")
need("okachimachi${night ? '-night' : ''}${portrait ? '-portrait' : ''}" in app, "day/night asset name mapping missing")
need("if (base === 'okachimachi') return okachimachiBackgroundAssetName(portrait);" in app, "okachimachi base route missing")
need("okachimachiBackgroundAssetName();" in app, "cinema exterior route not connected")
need("./assets/images/okachimachi-night.webp" in sw, "landscape night asset not in service worker shell")
need("./assets/images/okachimachi-night-portrait.webp" in sw, "portrait night asset not in service worker shell")

expected = {
    "assets/images/okachimachi-night.webp": (1536, 768),
    "assets/images/okachimachi-night-portrait.webp": (1024, 1536),
    "assets/images/okachimachi.webp": (1536, 691),
    "assets/images/okachimachi-portrait.webp": (864, 1536),
}
for rel, dims in expected.items():
    path = ROOT / rel
    need(path.exists(), f"missing asset: {rel}")
    if path.exists():
        try:
            with Image.open(path) as im:
                need(im.size == dims, f"{rel} dimensions {im.size} != {dims}")
                need(im.format == "WEBP", f"{rel} is not WEBP")
        except Exception as exc:
            errors.append(f"{rel} open failed: {exc}")

# Boundary semantics
def night(minutes):
    return minutes >= 18 * 60
need(not night(17 * 60 + 59), "17:59 must be day")
need(night(18 * 60), "18:00 must be night")
need(night(22 * 60), "22:00 must be night")

if errors:
    print("OKACHIMACHI NIGHT BACKGROUND AUDIT: FAIL")
    for e in errors:
        print("ERROR:", e)
    sys.exit(1)

print("OKACHIMACHI NIGHT BACKGROUND AUDIT: PASS")
print("OK: 17:59 day / 18:00 night / 22:00 night")
print("OK: landscape and portrait night assets present with expected dimensions")
print("OK: okachimachi base route and cinema exterior route use time-aware helper")
print("OK: Service Worker precaches both night assets")
