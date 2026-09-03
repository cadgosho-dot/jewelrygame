#!/usr/bin/env python3
"""Ensure GitHub Pages publishes runtime assets only, not repository archaeology/dev files."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
workflow = ROOT / '.github/workflows/update-metals.yml'
errors: list[str] = []
if not workflow.is_file():
    errors.append('.github/workflows/update-metals.yml がありません')
    text = ''
else:
    text = workflow.read_text(encoding='utf-8')

required_excludes = [
    "--exclude='.git/'",
    "--exclude='.github/'",
    "--exclude='_site/'",
    "--exclude='scripts/'",
    "--exclude='/tools/'",
    "--exclude='docs/'",
    "--exclude='*.md'",
    "--exclude='.firebaserc'",
    "--exclude='.gitignore'",
    "--exclude='firebase.json'",
    "--exclude='firestore.rules'",
    "--exclude='HANDOFF_MANDATORY_REGRESSION_RULES.txt'",
    "--exclude='quiz-layout-test.html'",
]
for marker in required_excludes:
    if marker not in text:
        errors.append(f'Pages公開除外がありません: {marker}')

# v0.10.848: 開発用toolsはリポジトリ直下だけを除外する。
# unanchoredなtools/除外は assets/images/tools/ にも一致して工具画像を公開から落とすため禁止する。
if "--exclude='tools/'" in text:
    errors.append("危険なPages除外が残っています: --exclude='tools/'（assets/images/tools/ まで除外します）")

# Runtime essentials should remain available in the source tree and not be blanket-excluded.
for rel in ['index.html', 'about.html', 'game.html', 'auth.html', 'robots.txt', 'sitemap.xml', 'sw.js', 'manifest.webmanifest', 'styles.css', 'js/app.js', 'assets/images/main-menu.webp']:
    if not (ROOT / rel).is_file():
        errors.append(f'Pages必須ファイルがありません: {rel}')

# 工房の工具・設備画像23枚はPages公開対象でなければならない。
tool_images = [
    'bench-peg.png', 'buffer.png', 'diamond-polishing-lap.png', 'dividers.png',
    'electronic-scale.png', 'engraving-block.png', 'file.png', 'gem-polishing-machine.png',
    'graver.png', 'hammer.png', 'jewelry-bench.png', 'loupe.png', 'magnifier.png',
    'milgrain-tool.png', 'nipper.png', 'piercing-saw.png', 'pliers.png', 'rolling-mill.png',
    'rotary-tool.png', 'stamps.png', 'torch.png', 'ultrasonic-cleaner.png', 'wood-block.png',
]
for name in tool_images:
    rel = Path('assets/images/tools') / name
    if not (ROOT / rel).is_file():
        errors.append(f'工具・設備画像がありません: {rel.as_posix()}')

if '工具・設備画像23枚の公開漏れを検査' not in text:
    errors.append('Pagesアップロード前の工具・設備画像23枚検査がありません')

if errors:
    print('PAGES PUBLISH POLICY: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)
print('PAGES PUBLISH POLICY: PASS')
