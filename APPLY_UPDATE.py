#!/usr/bin/env python3
from pathlib import Path
import sys, shutil, json

HERE=Path(__file__).resolve().parent
FILES=HERE/'FILES'
manifest=json.loads((HERE/'UPDATE_MANIFEST.json').read_text(encoding='utf-8'))
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path.cwd().resolve()
version_file=root/'VERSION'
if not version_file.is_file():
    raise SystemExit(f'ERROR: VERSIONが見つかりません: {root}')
base=version_file.read_text(encoding='utf-8').strip()
accepted=set(manifest['acceptedBaseVersions']) | {manifest['targetVersion']}
if base not in accepted:
    raise SystemExit(f'ERROR: 対象外バージョンです: {base} / 対象={sorted(accepted)}')
for item in manifest['files']:
    rel=item['path']
    src=FILES/rel
    dst=root/rel
    dst.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(src,dst)
for rel in manifest.get('deleteFiles',[]):
    p=root/rel
    if p.is_file() or p.is_symlink(): p.unlink()
    elif p.is_dir(): shutil.rmtree(p)
print(f'UPDATE APPLIED: {base} -> {manifest["targetVersion"]}')
print('次に VERIFY_UPDATE.py を実行してください。')
