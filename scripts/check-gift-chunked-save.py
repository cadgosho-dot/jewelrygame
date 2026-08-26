#!/usr/bin/env python3
"""Ensure gifts use chunked cloud saves and never re-fail on a raw app-side localStorage write."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FB_PATH = ROOT / 'js/firebase-service.js'
APP_PATH = ROOT / 'js/app.js'
FB = FB_PATH.read_text(encoding='utf-8')
APP = APP_PATH.read_text(encoding='utf-8')
GIFT = FB[FB.index('export async function createGiftCode'):FB.index('export function giftErrorMessage')]
APP_GIFT_PERSIST = APP[APP.index('function persistTransactionalGiftState'):APP.index('function giftStatusLabel')]

checks = {
    'gift reads current saveMeta/current generation': 'readGiftCloudBase(uid)' in GIFT,
    'gift stages a new chunk generation': 'stageGiftChunkedState(uid, nextState)' in FB,
    'gift atomically switches saveMeta/current': 'transaction.set(metaRef, staged.metadata);' in FB,
    'gift checks save-generation conflicts': 'giftMetadataMatches(currentMetadata, expectedMetadata)' in FB,
    'gift protects commit-response-loss': 'giftMetadataMatches(currentMetadata, staged.metadata)' in FB,
    'gift keeps local save quota recovery': "localStorage.removeItem(`${key}-backup`)" in FB and "'single-copy'" in FB,
    'gift never reads legacy inline gameState': 'userSnapshot.data()?.gameState' not in GIFT,
    'gift never writes legacy inline gameState': 'transaction.set(userRef, { gameState:' not in GIFT,
    'gift has explicit save-conflict message': "'gift/save-conflict'" in FB,
    'app does not raw-write localStorage after committed gift': 'localStorage.setItem' not in APP_GIFT_PERSIST,
    'app still adopts committed cloud gift state': 'cloudSave = structuredClone(state);' in APP_GIFT_PERSIST,
}

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

for source in (FB_PATH, APP_PATH):
    syntax = subprocess.run(['node', '--check', str(source)], cwd=ROOT, text=True, capture_output=True)
    if syntax.returncode:
        failed.append(f'{source.name} JavaScript syntax')
        print(syntax.stdout)
        print(syntax.stderr)

if failed:
    print('\nGIFT CHUNKED SAVE POLICY: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nGIFT CHUNKED SAVE POLICY: PASS')
