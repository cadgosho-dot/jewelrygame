#!/usr/bin/env python3
from __future__ import annotations
import subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
HELPER = (ROOT / 'js/ui/install-status-text.js').read_text(encoding='utf-8')
SW = (ROOT / 'sw.js').read_text(encoding='utf-8')
VS = (ROOT / 'scripts/version-sync.py').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')

checks = {
    'versioned helper import': f"from './ui/install-status-text.js?v={VERSION}';" in APP,
    'active references retained': APP.count('installStatusText(') == 2,
    'standalone check stays in app': 'standalone: isStandaloneApp(),' in APP,
    'install availability stays in app': 'directInstallAvailable: Boolean(deferredInstallPrompt || shellInstallAvailable),' in APP,
    'thin wrapper delegates': 'return formatInstallStatusText({' in APP,
    'legacy standalone text removed from app': "if (isStandaloneApp()) return 'ホーム画面へ追加済みです。';" not in APP,
    'helper export': 'export function formatInstallStatusText({ standalone = false, directInstallAvailable = false } = {})' in HELPER,
    'helper standalone branch': "if (standalone) return 'ホーム画面へ追加済みです。';" in HELPER,
    'helper direct-install branch': "if (directInstallAvailable) return 'この端末へ直接追加できます。ブラウザのメニューを開く必要はありません。';" in HELPER,
    'helper fallback': "return '追加ボタンを押してください。直接追加できない環境では、Chromeで開くボタンを表示します。';" in HELPER,
    'service worker precache': f"./js/ui/install-status-text.js?v={VERSION}" in SW,
    'version sync precache': "'install-status-text.js precache key'" in VS,
    'version sync import': "'install-status-text.js import key'" in VS,
    'current audit registration': "'ホーム画面追加表示'" in CURRENT and 'check-install-status-text.py' in CURRENT,
}
for forbidden in ('state.','state?.','isStandaloneApp','deferredInstallPrompt','shellInstallAvailable','window.','document.','navigator.','localStorage','sessionStorage','indexedDB','firebase','saveGame','loadState','money','inventory','eventState','Math.random','./assets/'):
    checks[f'helper independent: {forbidden}'] = forbidden not in HELPER

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

for source in (ROOT / 'js/app.js', ROOT / 'js/ui/install-status-text.js'):
    result = subprocess.run(['node', '--check', str(source)], cwd=ROOT, text=True, capture_output=True)
    if result.returncode:
        print(result.stderr, end='')
        failed.append(source.name + ' syntax')

unit = subprocess.run(['node', 'tools/test-install-status-text.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('unit test')

if failed:
    print('INSTALL STATUS TEXT INTEGRATION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)
print('INSTALL STATUS TEXT INTEGRATION: PASS')
