#!/usr/bin/env python3
from pathlib import Path
import sys, json, hashlib, subprocess

HERE=Path(__file__).resolve().parent
manifest=json.loads((HERE/'UPDATE_MANIFEST.json').read_text(encoding='utf-8'))
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path.cwd().resolve()
errors=[]
if not (root/'VERSION').is_file() or (root/'VERSION').read_text(encoding='utf-8').strip()!=manifest['targetVersion']:
    errors.append('VERSIONが0.10.814ではありません')
for item in manifest['files']:
    p=root/item['path']
    if not p.is_file(): errors.append(f'不足: {item["path"]}'); continue
    got=hashlib.sha256(p.read_bytes()).hexdigest()
    if got!=item['sha256']: errors.append(f'不一致: {item["path"]}')
oyatsu=root/'assets/images/events/oyatsu-daisuki.png'
if oyatsu.is_file() and hashlib.sha256(oyatsu.read_bytes()).hexdigest()!=manifest['oyatsuUserImageSha256']:
    errors.append('お菓子大好き画像がユーザー提供正式画像と一致しません')
if errors:
    print('VERIFY UPDATE: FAIL')
    for e in errors: print('- '+e)
    raise SystemExit(1)
for cmd in [
    [sys.executable, str(root/'scripts/version-sync.py'), '--check'],
    [sys.executable, str(root/'scripts/check-tropical-shop-navigation.py')],
]:
    r=subprocess.run(cmd,cwd=root,text=True)
    if r.returncode:
        raise SystemExit(r.returncode)
print('VERIFY UPDATE: PASS')
print('v0.10.814 の更新ファイル・正式画像・熱帯魚屋カテゴリ導線を確認しました。')
