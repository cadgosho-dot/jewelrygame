#!/usr/bin/env python3
"""Verify the shared tool brief presenter stays isolated and behavior-compatible."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP_PATH = ROOT / 'js/app.js'
HELPER_PATH = ROOT / 'js/ui/tool-brief.js'
SW_PATH = ROOT / 'sw.js'
VS_PATH = ROOT / 'scripts/version-sync.py'
CURRENT_PATH = ROOT / 'scripts/check-current.py'

APP = APP_PATH.read_text(encoding='utf-8')
HELPER = HELPER_PATH.read_text(encoding='utf-8')
SW = SW_PATH.read_text(encoding='utf-8')
VS = VS_PATH.read_text(encoding='utf-8')
CURRENT = CURRENT_PATH.read_text(encoding='utf-8')

wrapper = """function renderToolBrief(tool, guideAction = 'glab-tool-guide') {
  return renderToolBriefMarkup(tool, guideAction, esc);
}"""

checks = {
    'versioned helper import exists': f"from './ui/tool-brief.js?v={VERSION}';" in APP,
    'app keeps only thin renderToolBrief wrapper': wrapper in APP,
    'tool brief legacy body removed from app': "const description = String(tool?.description || '').trim();" not in APP,
    'existing renderToolBrief call sites retained': APP.count('renderToolBrief(') == 3,
    'wrapper injects existing esc once': APP.count('renderToolBriefMarkup(tool, guideAction, esc)') == 1,
    'workshop guide action retained': "renderToolBrief(tool, 'workshop-tool-guide')" in APP,
    'g-Lab default action retained': '${renderToolBrief(tool)}' in APP,
    'helper exports presenter': 'export function renderToolBriefMarkup(' in HELPER,
    'description trimming retained': "String(tool?.description || '').trim()" in HELPER,
    'detail trimming retained': "String(tool?.detail || '').trim()" in HELPER,
    'duplicate detail suppression retained': 'detail && detail !== description' in HELPER,
    'guide action remains escaped through injected callback': 'data-action="${esc(guideAction)}"' in HELPER,
    'tool id remains escaped through injected callback': 'data-id="${esc(tool.id)}"' in HELPER,
    'service worker precaches helper': f"./js/ui/tool-brief.js?v={VERSION}" in SW,
    'version sync knows helper precache': "'tool-brief.js precache key'" in VS,
    'version sync knows helper import': "'tool-brief.js import key'" in VS,
    'current audit registers checker': "'工具説明UI'" in CURRENT and 'check-tool-brief.py' in CURRENT,
}

for forbidden in (
    'state.', 'state =', 'saveGame', 'localStorage', 'indexedDB', 'firebase',
    'money', 'inventory', 'aquarium', 'eventState', 'screenData', 'WORKSHOP_TOOLS',
    'document.', 'window.', './assets/',
):
    checks[f'helper has no reverse dependency: {forbidden}'] = forbidden not in HELPER

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

for source in (APP_PATH, HELPER_PATH):
    syntax = subprocess.run(['node', '--check', str(source)], cwd=ROOT, text=True, capture_output=True)
    if syntax.returncode:
        failed.append(f'{source.name} JavaScript syntax')
        print(syntax.stdout)
        print(syntax.stderr)

unit = subprocess.run(['node', 'tools/test-tool-brief.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.stderr:
    print(unit.stderr, file=sys.stderr, end='')
if unit.returncode:
    failed.append('tool brief unit test')

if failed:
    print('\nTOOL BRIEF INTEGRATION: FAIL')
    for label in failed:
        print(f'- {label}')
    sys.exit(1)

print('\nTOOL BRIEF INTEGRATION: PASS')
print('工具・設備の共通説明カード生成だけをUI helperへ分離し、購入・修理・所持状態・画像・画面遷移はapp.js側に維持しています。')
