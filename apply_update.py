#!/usr/bin/env python3
from pathlib import Path
import sys, shutil, hashlib, json

if len(sys.argv)!=2:
    raise SystemExit('usage: python3 apply_update.py /path/to/jewelrygame')
root=Path(sys.argv[1]).resolve()
pkg=Path(__file__).resolve().parent
version_file=root/'VERSION'
if not version_file.is_file():
    raise SystemExit(f'ERROR: VERSION not found: {version_file}')
current=version_file.read_text(encoding='utf-8-sig').strip()
if current!='0.10.799':
    raise SystemExit(f'ERROR: expected base VERSION 0.10.799, found {current!r}. No files changed.')
manifest=json.loads((pkg/'manifest.json').read_text(encoding='utf-8'))
# verify package before touching repo
for item in manifest['files']:
    f=pkg/'PATCH_FILES'/item['path']
    if not f.is_file(): raise SystemExit(f'ERROR: package file missing: {item["path"]}')
    h=hashlib.sha256(f.read_bytes()).hexdigest()
    if h!=item['sha256']: raise SystemExit(f'ERROR: package hash mismatch: {item["path"]}')
# delete old paths
for raw in (pkg/'DELETE_FILES.txt').read_text(encoding='utf-8-sig').splitlines():
    s=raw.strip()
    if not s or s.startswith('#'): continue
    p=(root/s).resolve()
    try: p.relative_to(root)
    except ValueError: raise SystemExit(f'ERROR: unsafe delete path: {s}')
    if p.is_dir(): shutil.rmtree(p)
    elif p.exists(): p.unlink()
# copy final files
for item in manifest['files']:
    rel=Path(item['path'])
    src=pkg/'PATCH_FILES'/rel
    dst=root/rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src,dst)
final=(root/'VERSION').read_text(encoding='utf-8-sig').strip()
if final!='0.10.811':
    raise SystemExit(f'ERROR: final VERSION is {final!r}, expected 0.10.811')
print('UPDATE APPLIED: v0.10.799 -> v0.10.811')
print(f'patched files: {len(manifest["files"])}')
print(f'delete entries: {len(manifest["delete_paths"])}')
print('Next: python3 scripts/version-sync.py --check')
print('Next: python3 scripts/check-current.py')
