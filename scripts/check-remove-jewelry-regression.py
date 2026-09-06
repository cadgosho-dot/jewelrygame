#!/usr/bin/env python3
"""Protect removeJewelry() current behavior without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-remove-jewelry-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase35-sync-v010924.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async\s+)?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^(?:async\s+)?function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


remove = section('removeJewelry')
checks = {
    'removeJewelry definition exists once': APP.count('function removeJewelry(') == 1,
    'all store branches are scanned': 'for (const branch of state.store.branches || []) {' in remove,
    'showcase slots matching item are cleared': "slot?.jewelryId === itemId ? null : slot" in remove,
    'inventory item lookup retained': "state.inventory.jewelry.find((entry) => entry.id === itemId)" in remove,
    'removed item status becomes sold': "item.status = 'sold';" in remove,
    'removed day normalization retained': 'item.removedDay = Math.max(1, Number(state.game.day) || 1);' in remove,
    'finite sale price gate retained': all(token in remove for token in [
        'const price = Number(saleMeta.price);',
        'if (Number.isFinite(price)) {',
    ]),
    'sale day price and profit metadata retained': all(token in remove for token in [
        'item.soldDay = item.removedDay;',
        'item.soldPrice = Math.round(price);',
        'item.soldProfit = Math.round(price - Math.max(0, Number(item.cost) || 0));',
    ]),
    'branch metadata normalization retained': "item.soldBranchNumber = Math.max(1, Math.floor(Number(saleMeta.branchNumber) || 1));" in remove,
    'channel metadata retained': 'item.soldChannel = String(saleMeta.channel);' in remove,
    'explicit removal reason retained': 'item.removalReason = String(saleMeta.reason);' in remove,
    'stolen fallback reason retained': "else if (item.stolenDay) item.removalReason = 'stolen';" in remove,
    'display branch metadata cleared': 'delete item.displayBranchNumber;' in remove,
    'current store display is mirrored after removal': 'mirrorCurrentStoreDisplay(currentStoreBranch());' in remove,
    'test executes current production function': "const source = extractFunction('removeJewelry');" in TEST and "vm.runInContext(source, ctx" in TEST,
    'registered in audit or pending formal sync': 'check-remove-jewelry-regression.py' in CURRENT or (SYNC.is_file() and 'check-remove-jewelry-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testSaleClearsAllShowcasesAndRecordsMetadata',
    'testStolenRemovalUsesFallbackReasonWithoutSaleFields',
    'testExplicitReasonOverridesStolenAndNormalizesBranch',
    'testInvalidPriceDoesNotCreateSaleAccountingFields',
    'testMissingItemStillClearsDanglingShowcaseReferencesAndMirrors',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('REMOVE JEWELRY PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-remove-jewelry-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('REMOVE JEWELRY PROTECTION: PASS')
