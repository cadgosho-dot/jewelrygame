#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
MODULE = (ROOT / 'js/finance/store-rent.js').read_text(encoding='utf-8')
SW = (ROOT / 'sw.js').read_text(encoding='utf-8')
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
VERSION_SYNC = (ROOT / 'scripts/version-sync.py').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
CHANGELOG = (ROOT / 'CHANGELOG.md').read_text(encoding='utf-8')

checks = {
    'versioned module import': f"./finance/store-rent.js?v={VERSION}" in APP,
    'thin app wrapper delegates': 'return calculateStoreMonthlyRent(STORE_MONTHLY_RENTS[branchNumber], state?.game?.day, branch?.rentedDay);' in APP,
    'inline escalation constants removed from app': 'STORE_RENT_ESCALATION_PERIOD_DAYS' not in APP,
    'module period 360': 'STORE_RENT_ESCALATION_PERIOD_DAYS = 360' in MODULE,
    'module maximum 10 years': 'STORE_RENT_ESCALATION_MAX_YEARS = 10' in MODULE,
    'module rate 1.2': 'STORE_RENT_ESCALATION_RATE = 1.2' in MODULE,
    'module rounding 1000': 'STORE_RENT_ESCALATION_ROUNDING_UNIT = 1000' in MODULE,
    'module per-year rounding': 'Math.ceil((rent * STORE_RENT_ESCALATION_RATE) / STORE_RENT_ESCALATION_ROUNDING_UNIT)' in MODULE,
    'missing legacy rentedDay stays at base rent': 'if (!Number.isFinite(rented) || rented <= 0) return base;' in MODULE,
    'module independent of game state': 'state.' not in MODULE and 'state?.' not in MODULE,
    'module independent of persistence': all(token not in MODULE for token in ('saveGame', 'localStorage', 'sessionStorage', 'indexedDB', 'firebase')),
    'module independent of browser UI': all(token not in MODULE for token in ('document.', 'window.', 'navigator.')),
    'service worker precaches module': f'./js/finance/store-rent.js?v={VERSION}' in SW,
    'version sync tracks module precache': 'store-rent.js precache key' in VERSION_SYNC,
    'version sync tracks module import': 'store-rent.js import key' in VERSION_SYNC,
    'current audit registers check': 'check-store-rent-escalation.py' in CURRENT,
    'changelog records v0.10.941': '## v0.10.941' in CHANGELOG,
    'changelog records 360-day escalation': '360日ごとに1.2倍' in CHANGELOG and '1,000円単位で切り上げ' in CHANGELOG,
    'changelog records finance module split': 'js/finance/store-rent.js' in CHANGELOG,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + name)
if failed:
    raise SystemExit('STORE RENT ESCALATION: static checks failed: ' + ', '.join(failed))

subprocess.run(['node', str(ROOT / 'tools/test-store-rent-escalation.mjs')], check=True)
print('STORE RENT ESCALATION: PASS')
