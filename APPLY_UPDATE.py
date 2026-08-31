#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, shutil, subprocess, sys
from datetime import datetime
from pathlib import Path

HERE=Path(__file__).resolve().parent
MANIFEST=json.loads((HERE/'UPDATE_MANIFEST.json').read_text(encoding='utf-8'))

def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''): h.update(chunk)
    return h.hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('repo', nargs='?', default='.')
    ap.add_argument('--full-check', action='store_true')
    args=ap.parse_args()
    repo=Path(args.repo).resolve()
    version=(repo/'VERSION')
    if not version.exists(): raise SystemExit('NG: VERSIONが見つかりません。リポジトリ直下を指定してください。')
    current=version.read_text(encoding='utf-8').strip()
    if current != MANIFEST['baseVersion']:
        raise SystemExit(f"NG: 基準VERSIONが違います。必要={MANIFEST['baseVersion']} 現在={current}")
    conflicts=[]
    already=[]
    for item in MANIFEST['changedFiles']:
        dst=repo/item['path']
        if not dst.exists(): conflicts.append(f"{item['path']}: ファイルなし"); continue
        got=sha256(dst)
        if got == item['resultSha256']: already.append(item['path']); continue
        if got != item['baseSha256']: conflicts.append(f"{item['path']}: 基準SHAと不一致 ({got})")
    for rel, expected in MANIFEST['addedFileHashes'].items():
        dst=repo/rel
        if dst.exists() and sha256(dst) != expected:
            conflicts.append(f'{rel}: 既存ファイルが更新パッケージと異なる')
    if conflicts:
        print('NG: 別の変更を上書きする可能性があるため停止します。')
        for c in conflicts: print('- '+c)
        raise SystemExit(2)

    backup=HERE/'BACKUP'/datetime.now().strftime('%Y%m%d_%H%M%S')
    backup.mkdir(parents=True,exist_ok=True)
    paths=[x['path'] for x in MANIFEST['changedFiles']] + list(MANIFEST['addedFileHashes'])
    for rel in paths:
        src=HERE/'FILES'/rel; dst=repo/rel
        if dst.exists():
            b=backup/rel; b.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(dst,b)
        dst.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(src,dst)
        print('APPLY:',rel)

    subprocess.run(['node','--check',str(repo/'js/app.js')],cwd=repo,check=True)
    subprocess.run([sys.executable,str(repo/'scripts/check-gift-cancel-modal.py')],cwd=repo,check=True)
    subprocess.run([sys.executable,str(repo/'scripts/check-aquarium-portrait-center.py')],cwd=repo,check=True)
    if args.full_check:
        subprocess.run([sys.executable,str(repo/'scripts/check-current.py')],cwd=repo,check=True)
    print('OK: 未公開実装データを適用しました。VERSION/GitHubは変更していません。')
    print('BACKUP:',backup)

if __name__=='__main__': main()
