#!/usr/bin/env python3
"""Validate that active source folders contain only current code/tools, not historical debris."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []

# Generated Python bytecode should never be part of the working repository/package.
for path in sorted(ROOT.rglob('__pycache__')):
    if path.is_dir():
        errors.append(f'Pythonキャッシュが残っています: {path.relative_to(ROOT)}')
for path in sorted(ROOT.rglob('*.pyc')):
    if path.is_file():
        errors.append(f'Pythonバイトコードが残っています: {path.relative_to(ROOT)}')

# Historical one-shot/update checks belong in docs/archive/verification-code, not active scripts/tools.
active_historical_patterns = [
    ('scripts', re.compile(r'^(?:apply_v\d+|check-v\d+|check-startup-optimization-v\d+|check-save-resilience-v\d+)')),
    ('tools', re.compile(r'^(?:validate-v\d+|validate-kaitenzushi-route-v\d+)')),
]
for folder, pattern in active_historical_patterns:
    base = ROOT / folder
    for path in sorted(base.glob('*')):
        if path.is_file() and pattern.match(path.name):
            errors.append(f'過去専用検証コードが現行{folder}/に残っています: {path.relative_to(ROOT)}')

# Old intake/package manifests and release trigger markers are history/provenance, not current root files.
for pattern in ('TOOL_IMAGE_*_v*.json', 'TRIGGER_V*.txt'):
    for path in sorted(ROOT.glob(pattern)):
        errors.append(f'過去専用ファイルが現行ルートに残っています: {path.name}')

required_archive_dirs = [
    ROOT / 'docs/archive/verification-code/scripts',
    ROOT / 'docs/archive/verification-code/tools',
    ROOT / 'docs/archive/asset-manifests',
    ROOT / 'docs/archive/legacy-markers',
]
for path in required_archive_dirs:
    if not path.is_dir():
        errors.append(f'アーカイブ分類フォルダがありません: {path.relative_to(ROOT)}')

# Preserve expected historical sets so accidental loss is visible.
expected_counts = {
    'docs/archive/verification-code/scripts': 43,
    'docs/archive/verification-code/tools': 30,
    'docs/archive/asset-manifests': 5,
    'docs/archive/legacy-markers': 1,
}
for rel, expected in expected_counts.items():
    count = sum(1 for p in (ROOT / rel).iterdir() if p.is_file()) if (ROOT / rel).is_dir() else 0
    if count != expected:
        errors.append(f'{rel}: 保存件数 {count}（期待 {expected}）')

if errors:
    print('REPOSITORY HYGIENE: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

print('REPOSITORY HYGIENE: PASS')
