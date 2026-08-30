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
    "--exclude='tools/'",
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

# Runtime essentials should remain available in the source tree and not be blanket-excluded.
for rel in ['index.html', 'about.html', 'game.html', 'auth.html', 'robots.txt', 'sitemap.xml', 'sw.js', 'manifest.webmanifest', 'styles.css', 'js/app.js', 'assets/images/main-menu.webp']:
    if not (ROOT / rel).is_file():
        errors.append(f'Pages必須ファイルがありません: {rel}')

if errors:
    print('PAGES PUBLISH POLICY: FAIL')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)
print('PAGES PUBLISH POLICY: PASS')
