#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-finish-mining-rock-regression.mjs').read_text(encoding='utf-8')
SYNC_PATH = ROOT / '.github/workflows/phase11-sync-v010900.yml'
SYNC = SYNC_PATH.read_text(encoding='utf-8') if SYNC_PATH.is_file() else ''


def function_source(name: str) -> str:
    marker = f'function {name}('
    start = APP.find(marker)
    if start < 0:
        return ''
    depth = 0
    seen = False
    quote = None
    escaped = False
    template_depth = 0
    i = start
    while i < len(APP):
        ch = APP[i]
        nxt = APP[i + 1] if i + 1 < len(APP) else ''
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif quote == '`' and ch == '$' and nxt == '{':
                template_depth += 1
                i += 1
            elif quote == '`' and ch == '}' and template_depth > 0:
                template_depth -= 1
            elif ch == quote and template_depth == 0:
                quote = None
            i += 1
            continue
        if ch in ('"', "'", '`'):
            quote = ch
        elif ch == '{':
            depth += 1
            seen = True
        elif ch == '}':
            depth -= 1
            if seen and depth == 0:
                return APP[start:i + 1]
        i += 1
    return ''


MINING = function_source('finishMiningRock')
registered_now = "'採掘結果確定処理保護'" in CURRENT and 'check-finish-mining-rock-regression.py' in CURRENT
registered_by_sync = "'採掘結果確定処理保護'" in SYNC and 'check-finish-mining-rock-regression.py' in SYNC
checks = {
    'finishMiningRock definition exists once': APP.count('function finishMiningRock(index, button)') == 1,
    'unresolved mining game guard retained': 'if (!miningGame || miningGame.resolved) return;' in MINING,
    'resolution lock retained': 'miningGame.resolved = true;' in MINING,
    'breaking animation retained': "button.classList.add('breaking');" in MINING,
    'other rocks disabled retained': "root.querySelectorAll('.mining-rock').forEach((rock) => { rock.disabled = true; });" in MINING,
    'location lookup retained': 'const location = miningLocationById(miningGame.locationId);' in MINING,
    'winning rock decision retained': 'const success = miningGame.winningRocks.includes(index);' in MINING,
    'location time cost retained': 'spendHours(location.hours);' in MINING,
    'miss rock image retained': 'let result = { missRockImage: pickRandomMiningBrokenRockImage() };' in MINING,
    'diamond lap availability filter retained': "location.gems.filter((entry) => entry.id !== 'diamond' || toolOwned('diamondPolishingLap'))" in MINING,
    'weighted gem selection retained': 'const gem = weightedPick(availableGemPool);' in MINING,
    'rough inventory increase retained': 'state.inventory.rough[gem] += 1;' in MINING,
    'daily mined record retained': 'state.daily.mined.push({ gem, qty: 1 });' in MINING,
    'successful mining progress retained': 'state.miningProgress.successfulFinds += 1;' in MINING,
    'mining location unlock retained': 'const newlyUnlocked = unlockMiningLocationsIfNeeded();' in MINING,
    'success result retained': "result = { gem, qty: 1, unlockedLocation: newlyUnlocked[0]?.name || '' };" in MINING,
    'save retained': 'saveGame();' in MINING,
    'result delay retained': '}, 560);' in MINING,
    'success sound retained': "playSfx('mining-win', { gain: 1.15 });" in MINING,
    'success vibration retained': 'vibrate([55, 35, 85]);' in MINING,
    'miss sound retained': "playSfx('mining-miss', { gain: 1.12 });" in MINING,
    'mining runtime clear retained': 'miningGame = null;' in MINING,
    'result screen route retained': "setScreen('miningResult', { result }, false);" in MINING,
    'dynamic harness extracts current finishMiningRock': "extractFunctionSource('finishMiningRock')" in TEST,
    'successful mining regression case': 'testSuccessfulMiningFind' in TEST,
    'miss mining regression case': 'testMiningMissStillConsumesTimeAndSaves' in TEST,
    'guard regression case': 'testMiningResolutionGuardRails' in TEST,
    'current audit registration or sync registration': registered_now or registered_by_sync,
}

failed: list[str] = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

syntax = subprocess.run(['node', '--check', 'tools/test-finish-mining-rock-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
if syntax.returncode:
    print(syntax.stderr, end='')
    failed.append('node syntax')

unit = subprocess.run(['node', 'tools/test-finish-mining-rock-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('dynamic regression')

if failed:
    print('FINISH MINING ROCK PROTECTION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)

print('finishMiningRock() の採掘時間・成功判定・ダイヤ条件・原石取得・日次採掘記録・採掘進行・場所解放・保存・結果画面遷移・二重確定防止を固定しました。')
print('FINISH MINING ROCK PROTECTION: PASS')
