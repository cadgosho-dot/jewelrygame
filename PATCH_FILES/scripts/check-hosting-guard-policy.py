#!/usr/bin/env python3
"""Validate that the compatibility guard is event-driven and game-document scoped."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
text = (ROOT / 'hosting-origin-guard.js').read_text(encoding='utf-8')
errors = []
required = [
    "if (path.endsWith('/') || path.endsWith('/index.html')) return;",
    'let repairQueued = false;',
    'new MutationObserver(scheduleRepair).observe(target',
    "attributeFilter: ['class', 'data-screen', 'style']",
]
for token in required:
    if token not in text:
        errors.append(f'軽量化・スコープ制限が不足しています: {token}')
if 'setInterval(repairInvisibleBlockers' in text:
    errors.append('1.2秒周期の常時DOM監視が残っています。')
if 'document.documentElement' in text and 'MutationObserver' in text:
    errors.append('MutationObserverがdocumentElement全体を監視しています。')

if errors:
    print('HOSTING GUARD POLICY: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)
print('HOSTING GUARD POLICY: PASS')
print('互換ガードはgame.html側だけで、DOM変化時に限定して修復処理を行います。')
