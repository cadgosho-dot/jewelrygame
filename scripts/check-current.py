#!/usr/bin/env python3
"""One-command validation entry point for the current JEWELRY×JEWELRY build."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKS = [
    ('バージョン同期', [sys.executable, str(ROOT / 'scripts/version-sync.py'), '--check']),
    ('回帰防止基準', [sys.executable, str(ROOT / 'scripts/check-regression-baseline.py')]),
    ('季節メイン背景', [sys.executable, str(ROOT / 'scripts/check-seasonal-main-background.py')]),
    ('PWAキャッシュ更新', [sys.executable, str(ROOT / 'scripts/check-pwa-cache-policy.py')]),
    ('長期セーブ容量対策', [sys.executable, str(ROOT / 'scripts/check-save-storage-policy.py')]),
    ('IndexedDB端末セーブ', [sys.executable, str(ROOT / 'scripts/check-indexeddb-save-policy.py')]),
    ('プレゼント分割セーブ', [sys.executable, str(ROOT / 'scripts/check-gift-chunked-save.py')]),
    ('加工知識データ', [sys.executable, str(ROOT / 'scripts/check-processing-knowledge.py')]),
    ('ショーケース画像', [sys.executable, str(ROOT / 'scripts/check-showcase-jewelry-visuals.py')]),
    ('完成画面縦余白', [sys.executable, str(ROOT / 'scripts/check-completion-portrait-header-clearance.py')]),
    ('見習い映画館中央配置', [sys.executable, str(ROOT / 'scripts/check-apprentice-cinema-center.py')]),
]

failed = []
for label, command in CHECKS:
    print(f'\n===== {label} =====', flush=True)
    try:
        proc = subprocess.run(command, cwd=ROOT, text=True, timeout=90)
    except subprocess.TimeoutExpired:
        print(f'NG: {label} が90秒以内に完了しませんでした。', flush=True)
        failed.append(f'{label}（タイムアウト）')
        continue
    if proc.returncode != 0:
        failed.append(label)

if failed:
    print('\nCURRENT BUILD AUDIT: FAIL', flush=True)
    for label in failed:
        print(f'- {label}', flush=True)
    sys.exit(1)

print('\nCURRENT BUILD AUDIT: PASS', flush=True)
print('現行仕様の自動検査をすべて通過しました。', flush=True)
