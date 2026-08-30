#!/usr/bin/env python3
"""Validate current management docs and historical archive separation."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
errors: list[str] = []

required_current = {
    'README.md': f'**v{version}**',
    'CHANGELOG.md': f'**v{version}**',
    'GAME_RULES.md': f'**v{version}**',
    'ASSETS.md': f'**v{version}**',
    'TODO.md': f'**v{version}**',
    'EVENT_PROBABILITY_LIST.md': f'**v{version}**',
}
for rel, marker in required_current.items():
    path = ROOT / rel
    if not path.is_file():
        errors.append(f'現行管理ファイルがありません: {rel}')
        continue
    text = path.read_text(encoding='utf-8')
    if marker not in text[:1200]:
        errors.append(f'{rel}: 現行VERSION {version} のヘッダーを確認できません')

archive_required = [
    'docs/archive/INDEX.md',
    'docs/archive/README_v0.10.356.md',
    'docs/archive/EVENT_PROBABILITY_LIST_v0.10.581.md',
    'docs/archive/README_FIRST.txt',
    'docs/archive/README_UPDATE_v0.10.728.txt',
    'docs/archive/README_UPDATE_v0.10.729.txt',
    'docs/archive/README_#U6700#U521d#U306b#U8aad#U3093#U3067#U304f#U3060#U3055#U3044.txt',
    'docs/archive/JEWELRYxJEWELRY_#U5f15#U304d#U7d99#U304e#U8cc7#U6599.md',
    'docs/archive/legacy-code/auth-cache-recovery-v707.js',
]
for rel in archive_required:
    if not (ROOT / rel).is_file():
        errors.append(f'アーカイブ資料がありません: {rel}')

must_not_be_root = [
    'EVENT_PROBABILITY_LIST_v0.10.581.md',
    'README_FIRST.txt',
    'README_UPDATE_v0.10.728.txt',
    'README_UPDATE_v0.10.729.txt',
    'README_#U6700#U521d#U306b#U8aad#U3093#U3067#U304f#U3060#U3055#U3044.txt',
    'JEWELRYxJEWELRY_#U5f15#U304d#U7d99#U304e#U8cc7#U6599.md',
]
for rel in must_not_be_root:
    if (ROOT / rel).exists():
        errors.append(f'旧資料が現行ルートに残っています: {rel}')

if (ROOT / 'auth-cache-recovery-v707.js').exists():
    errors.append('旧PWA復旧コードが現行ルートに残っています: auth-cache-recovery-v707.js')

root_verification_docs = sorted(ROOT.glob('v0.10.*.md'))
if root_verification_docs:
    errors.append(
        '旧バージョン確認資料が現行ルートに残っています: ' +
        ', '.join(path.name for path in root_verification_docs[:5]) +
        (' ...' if len(root_verification_docs) > 5 else '')
    )

verification_archive = ROOT / 'docs/archive/verification'
verification_index = verification_archive / 'INDEX.md'
if not verification_index.is_file():
    errors.append('確認資料アーカイブ索引がありません: docs/archive/verification/INDEX.md')
else:
    archived_verification_docs = sorted(verification_archive.glob('v0.10.*.md'))
    if len(archived_verification_docs) != 36:
        errors.append(
            f'確認資料アーカイブ件数が {len(archived_verification_docs)} 件です（期待 36 件）'
        )

assets_proc = subprocess.run(
    [sys.executable, str(ROOT / 'scripts/generate-assets-manifest.py'), '--check'],
    cwd=ROOT, capture_output=True, text=True, encoding='utf-8'
)
if assets_proc.returncode != 0:
    errors.append((assets_proc.stdout + assets_proc.stderr).strip() or 'ASSETS資料の自動照合に失敗')

proc = subprocess.run(
    [sys.executable, str(ROOT / 'scripts/generate-event-probability-list.py'), '--check'],
    cwd=ROOT, capture_output=True, text=True, encoding='utf-8'
)
if proc.returncode != 0:
    errors.append((proc.stdout + proc.stderr).strip() or 'イベント確率資料の自動照合に失敗')

if errors:
    print('MANAGEMENT DOCS: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

print(f'MANAGEMENT DOCS: PASS (v{version})')
