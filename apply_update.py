#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, shutil, sys

HERE = Path(__file__).resolve().parent
FILES = HERE / "FILES"
MANIFEST = json.loads((HERE / "UPDATE_MANIFEST.json").read_text(encoding="utf-8"))
TARGET = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()

version_file = TARGET / "VERSION"
if not version_file.exists():
    raise SystemExit("ERROR: VERSION がありません。ゲームのリポジトリ直下を指定してください。")
current = version_file.read_text(encoding="utf-8").strip()
if current != MANIFEST["base_version"]:
    raise SystemExit(f"ERROR: 適用前VERSIONは {MANIFEST['base_version']} 必須です。現在: {current}")

for item in MANIFEST["files"]:
    src = FILES / item["path"]
    if hashlib.sha256(src.read_bytes()).hexdigest() != item["sha256"]:
        raise SystemExit(f"ERROR: 更新パック内ファイル破損: {item['path']}")

for item in MANIFEST["files"]:
    src = FILES / item["path"]
    dst = TARGET / item["path"]
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)

print(f"OK: v{MANIFEST['base_version']} -> v{MANIFEST['target_version']} 差分を適用しました。")
print("次に: python scripts/version-sync.py")
print("その後: python scripts/check-current.py")
