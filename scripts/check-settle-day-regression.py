#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-settle-day-regression.mjs').read_text(encoding='utf-8')

checks = {
    'settleDay definition exists once': APP.count('function settleDay(') == 1,
    'day advances': 'state.game.day += 1;' in APP,
    'morning time resets': 'state.game.minutes = DAY_START_MINUTES;' in APP,
    'hunger resets': 'state.wellbeing.hunger = 7;' in APP,
    'daily state resets': 'state.daily = { mined: [], polished: [], roughSold: [], looseSold: [], crafted: [], workshopStaffCrafted: [], sold: [], meals: [], visitors: 0, income: 0, expense: 0 };' in APP,
    'loose inventory guard retained': "restoreLooseInventory(looseBeforeSettlement, 'settleDay');" in APP,
    'morning transition marker retained': 'markMorningTransitionPending();' in APP,
    'day result route retained': "if (showResult) setScreen('dayResult', {}, false);" in APP,
    'save routing retained': 'return save ? (showResult ? saveGameAfterPaint() : saveGame()) : Promise.resolve();' in APP,
    'dynamic harness extracts current settleDay': "extractFunctionSource('settleDay')" in TEST,
    'basic rollover case': 'testBasicRolloverAndGuards' in TEST,
    'showcase sale case': 'testDeterministicShowcaseSale' in TEST,
    'illness suppression case': 'testIllnessSuppressesStoreSettlementAndRobbery' in TEST,
    'save route case': 'testSaveAndResultRouting' in TEST,
    'current audit registration': "'1日終了処理保護'" in CURRENT and 'check-settle-day-regression.py' in CURRENT,
}

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

syntax = subprocess.run(['node', '--check', 'tools/test-settle-day-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
if syntax.returncode:
    print(syntax.stderr, end='')
    failed.append('node syntax')

unit = subprocess.run(['node', 'tools/test-settle-day-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('dynamic regression')

if failed:
    print('SETTLE DAY PROTECTION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)

print('SETTLE DAY PROTECTION: PASS')
