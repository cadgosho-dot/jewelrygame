#!/usr/bin/env python3
from pathlib import Path
import shutil
import re
import sys
import hashlib

ROOT = Path.cwd()
BUNDLE = Path(__file__).resolve().parents[1]
PAYLOAD = BUNDLE / "payload"
BACKUP = ROOT / ".chat_update_backup_20260823"

REQUIRED = [
    ROOT / "js" / "app.js",
    ROOT / "js" / "memories-screen.js",
    ROOT / "js" / "game-data.js",
    ROOT / "game.html",
    ROOT / "index.html",
    ROOT / "sw.js",
    ROOT / "hosting-origin-guard.js",
]

missing = [str(p.relative_to(ROOT)) for p in REQUIRED if not p.exists()]
if missing:
    print("ERROR: リポジトリルートで実行してください。見つからないファイル:")
    for p in missing:
        print(" -", p)
    sys.exit(1)

BACKUP.mkdir(exist_ok=True)

def backup(path: Path):
    rel = path.relative_to(ROOT)
    dst = BACKUP / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not dst.exists():
        shutil.copy2(path, dst)

def write_text(path: Path, text: str):
    backup(path)
    path.write_text(text, encoding="utf-8")

def regex_once(text, pattern, repl, label, flags=0, allow_already=None):
    new, n = re.subn(pattern, repl, text, count=1, flags=flags)
    if n == 1:
        print("OK:", label)
        return new
    if allow_already and re.search(allow_already, text, flags):
        print("SKIP(already):", label)
        return text
    print("WARN: 対象が見つかりません:", label)
    return text

print("=== JEWELRY×JEWELRY v0.10.751 chat update ===")

# 1) Assets
event_dir = ROOT / "assets" / "images" / "events"
event_dir.mkdir(parents=True, exist_ok=True)
for name in ["loose-shop-original-quiz-v751.png", "storyteller-v751.png"]:
    src = PAYLOAD / "assets" / "images" / "events" / name
    dst = event_dir / name
    if not src.exists():
        print("ERROR: payload missing:", src)
        sys.exit(1)
    if dst.exists():
        backup(dst)
    shutil.copy2(src, dst)
    print("OK asset:", dst.relative_to(ROOT))

# 2) app.js: event images + version consistency
app_path = ROOT / "js" / "app.js"
app = app_path.read_text(encoding="utf-8")
app = regex_once(
    app,
    r"const UI_BUILD_VERSION = '0\.10\.\d+';",
    "const UI_BUILD_VERSION = '0.10.751';",
    "app UI_BUILD_VERSION",
    allow_already=r"const UI_BUILD_VERSION = '0\.10\.751';"
)
app = regex_once(
    app,
    r"const LOOSE_SHOP_ORIGINAL_QUIZ_IMAGE = '\./assets/images/events/loose-shop-original-quiz(?:-v\d+)?\.png';",
    "const LOOSE_SHOP_ORIGINAL_QUIZ_IMAGE = './assets/images/events/loose-shop-original-quiz-v751.png';",
    "3Dメガネ イベント画像",
    allow_already=r"LOOSE_SHOP_ORIGINAL_QUIZ_IMAGE = '\./assets/images/events/loose-shop-original-quiz-v751\.png'"
)
app = regex_once(
    app,
    r"const characterSrc=`\./assets/images/events/storyteller(?:-v\d+)?\.png\?v=\$\{VERSION\}`;",
    "const characterSrc=`./assets/images/events/storyteller-v751.png?v=${VERSION}`;",
    "ストーリーテラー イベント画像",
    allow_already=r"characterSrc=`\./assets/images/events/storyteller-v751\.png\?v=\$\{VERSION\}`"
)
for filename in ("audio.js", "audio-scene-map.js", "firebase-service.js"):
    app = re.sub(
        rf"(\./{re.escape(filename)}\?v=)0\.10\.\d+",
        rf"\g<1>0.10.751",
        app
    )
write_text(app_path, app)

# 3) memories-screen.js
mem_path = ROOT / "js" / "memories-screen.js"
mem = mem_path.read_text(encoding="utf-8")
mem = re.sub(
    r"(memories-backgrounds\.js\?v=)0\.10\.\d+",
    r"\g<1>0.10.751",
    mem,
    count=1
)
mem = regex_once(
    mem,
    r"const VERSION = '0\.10\.\d+';",
    "const VERSION = '0.10.751';",
    "memories VERSION",
    allow_already=r"const VERSION = '0\.10\.751';"
)
mem = re.sub(
    r"const STYLE_ID = 'jxj-memories-style-v\d+';",
    "const STYLE_ID = 'jxj-memories-style-v751';",
    mem,
    count=1
)
mem = regex_once(
    mem,
    r"image:'\./assets/images/events/storyteller(?:-v\d+)?\.png'",
    "image:'./assets/images/events/storyteller-v751.png'",
    "ストーリーテラー 思い出画像",
    allow_already=r"image:'\./assets/images/events/storyteller-v751\.png'"
)
mem = regex_once(
    mem,
    r"image:'\./assets/images/events/loose-shop-original-quiz(?:-v\d+)?\.png'",
    "image:'./assets/images/events/loose-shop-original-quiz-v751.png'",
    "3Dメガネ 思い出画像",
    allow_already=r"image:'\./assets/images/events/loose-shop-original-quiz-v751\.png'"
)
write_text(mem_path, mem)

# 4) game-data.js
gd_path = ROOT / "js" / "game-data.js"
gd = gd_path.read_text(encoding="utf-8")
gd = re.sub(
    r"^// v0\.10\.\d+: 正式版のバージョン入口。",
    "// v0.10.751: 正式版のバージョン入口。",
    gd,
    count=1,
    flags=re.M
)
gd = regex_once(
    gd,
    r"export const VERSION = '0\.10\.\d+';",
    "export const VERSION = '0.10.751';",
    "game-data VERSION",
    allow_already=r"export const VERSION = '0\.10\.751';"
)
gd = re.sub(
    r"// 本体側のVERSION依存箇所だけ、\d+の保存バージョンとして整合させる。",
    "// 本体側のVERSION依存箇所だけ、751の保存バージョンとして整合させる。",
    gd,
    count=1
)
write_text(gd_path, gd)

# 5) game.html
game_path = ROOT / "game.html"
game = game_path.read_text(encoding="utf-8")
for target in ("hosting-origin-guard.js", "styles.css", "js/app.js", "js/memories-screen.js"):
    game = re.sub(
        rf"({re.escape(target)}\?v=)0\.10\.\d+",
        rf"\g<1>0.10.751",
        game
    )
write_text(game_path, game)

# 6) index.html
idx_path = ROOT / "index.html"
idx = idx_path.read_text(encoding="utf-8")
for target in ("hosting-origin-guard.js", "viewport-shell.css", "game.html", "viewport-shell.js"):
    idx = re.sub(
        rf"({re.escape(target)}\?v=)0\.10\.\d+",
        rf"\g<1>0.10.751",
        idx
    )
write_text(idx_path, idx)

# 7) sw.js
sw_path = ROOT / "sw.js"
sw = sw_path.read_text(encoding="utf-8")
sw = regex_once(
    sw,
    r"const VERSION = '0\.10\.\d+';",
    "const VERSION = '0.10.751';",
    "service worker VERSION",
    allow_already=r"const VERSION = '0\.10\.751';"
)
for filename in (
    "audio.js", "audio-scene-map.js", "memories-screen.js",
    "memories-backgrounds.js", "google-auth-bridge.js", "firebase-service.js"
):
    sw = re.sub(
        rf"(\./js/{re.escape(filename)}\?v=)0\.10\.\d+",
        rf"\g<1>0.10.751",
        sw
    )
write_text(sw_path, sw)

# 8) Remove temporary v750 loader block from hosting-origin-guard.js
hog_path = ROOT / "hosting-origin-guard.js"
hog = hog_path.read_text(encoding="utf-8")
loader_pattern = re.compile(
    r"\n  // v0\.10\.750: 思い出の3Dメガネ／ストーリーテラー最新透明PNGをゲーム内へ読み込む。\n"
    r"  \(\(\) => \{\n"
    r"    const sources = \[\n"
    r"      '\./memories-3d-image-v750\.js\?v=0\.10\.750',\n"
    r"      '\./memories-storyteller-image-v750\.js\?v=0\.10\.750',\n"
    r"      '\./memories-image-overrides-v750\.js\?v=0\.10\.750',\n"
    r"    \];\n"
    r"    let index = 0;\n"
    r"    const loadNext = \(\) => \{\n"
    r"      if \(index >= sources\.length\) return;\n"
    r"      const script = document\.createElement\('script'\);\n"
    r"      script\.src = sources\[index\+\+\];\n"
    r"      script\.onload = loadNext;\n"
    r"      script\.onerror = loadNext;\n"
    r"      document\.head\?\.appendChild\(script\);\n"
    r"    \};\n"
    r"    loadNext\(\);\n"
    r"  \}\)\(\);\n"
)
hog, n = loader_pattern.subn("\n", hog, count=1)
if n:
    print("OK: v750一時画像ローダー削除")
else:
    print("SKIP: v750一時画像ローダーなし/既に削除")
write_text(hog_path, hog)

# 9) Remove obsolete runtime override files
for name in [
    "memories-3d-image-v750.js",
    "memories-storyteller-image-v750.js",
    "memories-image-overrides-v750.js",
    "memories-event-image-overrides-v751.js",
]:
    p = ROOT / name
    if p.exists():
        backup(p)
        p.unlink()
        print("DELETE:", name)

# 10) Ensure normal metals workflow wasn't touched
metals = ROOT / ".github" / "workflows" / "update-metals.yml"
if metals.exists():
    print("OK: update-metals.yml preserved")
else:
    print("WARN: .github/workflows/update-metals.yml が見つかりません。意図せず削除しないでください。")

print("\n更新処理完了。GitHub DesktopでChangesを確認してください。")
print("バックアップ:", BACKUP)
print("次に scripts/verify_update.py を実行できます。")

# v0.10.751 one-time runner trigger: 2026-08-23
