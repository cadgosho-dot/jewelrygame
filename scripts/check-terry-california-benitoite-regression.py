#!/usr/bin/env python3
"""Protect Terry California benitoite purchase settlement without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-terry-california-benitoite-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase43-sync-v010932.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async\s+)?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^(?:async\s+)?function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


purchase = section('buyTerryCaliforniaBenitoite')
checks = {
    'purchase definition exists once': APP.count('function buyTerryCaliforniaBenitoite(') == 1,
    'event state lookup retained': 'const eventState = terryCaliforniaEventState();' in purchase,
    'active offer guard retained': "if (!eventState.active || eventState.stage !== 'offer') return;" in purchase,
    'insufficient funds guard retained': 'if (state.game.money < TERRY_CALIFORNIA_BENITOITE_PRICE)' in purchase,
    'insufficient stage retained': "eventState.stage = 'insufficientFunds';" in purchase,
    'insufficient branch save retained': 'saveGame();' in purchase,
    'purchase deduction retained': 'state.game.money -= TERRY_CALIFORNIA_BENITOITE_PRICE;' in purchase,
    'purchase finance retained': "addFinance('テリー・カリフォルニアからベニトアイト購入', 0, TERRY_CALIFORNIA_BENITOITE_PRICE);" in purchase,
    'money feedback retained': 'startMoneyFeedback(-TERRY_CALIFORNIA_BENITOITE_PRICE, 1400);' in purchase,
    'loose root normalization retained': "state.inventory.loose = state.inventory.loose && typeof state.inventory.loose === 'object' ? state.inventory.loose : {};" in purchase,
    'gem bucket normalization retained': "state.inventory.loose[TERRY_CALIFORNIA_GEM_ID] = state.inventory.loose[TERRY_CALIFORNIA_GEM_ID] && typeof state.inventory.loose[TERRY_CALIFORNIA_GEM_ID] === 'object' ? state.inventory.loose[TERRY_CALIFORNIA_GEM_ID] : {};" in purchase,
    'loose quantity normalization and increment retained': 'Math.max(0, Math.floor(Number(state.inventory.loose[TERRY_CALIFORNIA_GEM_ID][TERRY_CALIFORNIA_GEM_SHAPE]) || 0)) + 1' in purchase,
    'reward granted retained': 'eventState.rewardGranted = true;' in purchase,
    'purchase outcome retained': "eventState.lastOutcome = 'purchased';" in purchase,
    'purchase stage retained': "eventState.stage = 'purchased';" in purchase,
    'purchase notification retained': "addNotification('ベニトアイトを手に入れた'" in purchase and "'special'" in purchase,
    'purchase save retained': purchase.count('saveGame();') >= 2,
    'success toast retained': "showToast('ベニトアイトを手に入れた', 'success', false);" in purchase,
    'coin feedback retained': "playSfx('coin', { gain: 0.92, rate: 1.02 });" in purchase,
    'sparkle feedback retained': "setTimeout(() => playSfx('loose-sparkle', { gain: 1.08 }), 120);" in purchase,
    'render retained': purchase.count('render();') >= 2,
    'dynamic test extracts production function': "extractFunction('buyTerryCaliforniaBenitoite')" in TEST and 'vm.runInContext(source, ctx' in TEST,
    'registered in audit or pending formal sync': 'check-terry-california-benitoite-regression.py' in CURRENT or (SYNC.is_file() and 'check-terry-california-benitoite-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testInactiveEventDoesNothing',
    'testWrongStageDoesNothing',
    'testInsufficientFundsAdvancesOnlyToInsufficientFunds',
    'testExactFundsPurchaseDeductsAndGrantsOnce',
    'testMissingLooseContainersAreCreated',
    'testExistingLooseCountIsNormalizedBeforeIncrement',
    'testNegativeLooseCountFloorsAtZeroBeforeIncrement',
    'testRepeatedCallDoesNotDoubleChargeOrGrant',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('TERRY CALIFORNIA BENITOITE PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-terry-california-benitoite-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('TERRY CALIFORNIA BENITOITE PROTECTION: PASS')
