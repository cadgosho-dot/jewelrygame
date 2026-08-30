#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, sys
HERE=Path(__file__).resolve().parent
M=json.loads((HERE/'UPDATE_MANIFEST.json').read_text(encoding='utf-8'))
TARGET=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path.cwd().resolve()
errors=[]
for item in M['files']:
    p=TARGET/item['path']
    if not p.exists(): errors.append(f"MISSING {item['path']}"); continue
    h=hashlib.sha256(p.read_bytes()).hexdigest()
    if h!=item['sha256']: errors.append(f"HASH MISMATCH {item['path']}")
if errors:
    print('\n'.join(errors)); raise SystemExit(1)
print(f"PASS: v{M['target_version']} 更新差分ファイルはすべて一致しています。")
