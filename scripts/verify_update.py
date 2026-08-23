#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import re, sys

ROOT = Path.cwd()
errors = []
checks = []

def check(label, condition):
    checks.append((label, condition))
    if not condition:
        errors.append(label)

app = (ROOT/"js"/"app.js").read_text(encoding="utf-8")
mem = (ROOT/"js"/"memories-screen.js").read_text(encoding="utf-8")
gd = (ROOT/"js"/"game-data.js").read_text(encoding="utf-8")
sw = (ROOT/"sw.js").read_text(encoding="utf-8")
hog = (ROOT/"hosting-origin-guard.js").read_text(encoding="utf-8")
game = (ROOT/"game.html").read_text(encoding="utf-8")
idx = (ROOT/"index.html").read_text(encoding="utf-8")

check("3Dイベント v751", "loose-shop-original-quiz-v751.png" in app)
check("Storyイベント v751", "storyteller-v751.png" in app)
check("3D思い出 v751", "loose-shop-original-quiz-v751.png" in mem)
check("Story思い出 v751", "storyteller-v751.png" in mem)
check("game-data 0.10.751", "export const VERSION = '0.10.751';" in gd)
check("sw 0.10.751", "const VERSION = '0.10.751';" in sw)
check("game app query 751", "js/app.js?v=0.10.751" in game)
check("index game query 751", "game.html?v=0.10.751" in idx)
check("v750 loader removed", "memories-3d-image-v750.js" not in hog)
check("v749 old Android fix preserved", "古いAndroid/WebViewでも3Dメガネ人物画像が巨大化しない" in hog or "jxj-quiz-character-v2" in hog)

for rel in [
    "assets/images/events/loose-shop-original-quiz-v751.png",
    "assets/images/events/storyteller-v751.png",
]:
    p = ROOT/rel
    check(rel+" exists", p.exists())
    if p.exists():
        im = Image.open(p)
        check(rel+" RGBA/alpha", "A" in im.mode and im.getextrema()[-1][0] == 0)

for name in [
    "memories-3d-image-v750.js",
    "memories-storyteller-image-v750.js",
    "memories-image-overrides-v750.js",
]:
    check(name+" removed", not (ROOT/name).exists())

print("=== verify ===")
for label, ok in checks:
    print(("OK   " if ok else "NG   ") + label)

if errors:
    print("\nNGがあります。Commit/Push前に確認してください。")
    sys.exit(1)

print("\nすべてOKです。GitHub Desktopで差分確認→Commit→Pushできます。")
