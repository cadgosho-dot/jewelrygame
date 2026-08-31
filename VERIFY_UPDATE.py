#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, subprocess, sys
from pathlib import Path
HERE=Path(__file__).resolve().parent
MANIFEST=json.loads((HERE/'UPDATE_MANIFEST.json').read_text(encoding='utf-8'))
def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''): h.update(chunk)
    return h.hexdigest()
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('repo',nargs='?',default='.'); ap.add_argument('--full-check',action='store_true'); args=ap.parse_args()
    repo=Path(args.repo).resolve(); failed=[]
    if not (repo/'VERSION').exists() or (repo/'VERSION').read_text(encoding='utf-8').strip()!=MANIFEST['targetVersion']:
        failed.append('VERSION')
    expected={x['path']:x['resultSha256'] for x in MANIFEST['changedFiles']}; expected.update(MANIFEST['addedFileHashes'])
    for rel,want in expected.items():
        p=repo/rel
        ok=p.exists() and sha256(p)==want
        print(('OK' if ok else 'NG')+': '+rel)
        if not ok: failed.append(rel)
    if failed:
        print('VERIFY: FAIL'); raise SystemExit(1)
    subprocess.run(['node','--check',str(repo/'js/app.js')],cwd=repo,check=True)
    subprocess.run([sys.executable,str(repo/'scripts/check-gift-cancel-modal.py')],cwd=repo,check=True)
    subprocess.run([sys.executable,str(repo/'scripts/check-aquarium-portrait-center.py')],cwd=repo,check=True)
    if args.full_check: subprocess.run([sys.executable,str(repo/'scripts/check-current.py')],cwd=repo,check=True)
    print('VERIFY: PASS')
if __name__=='__main__': main()
