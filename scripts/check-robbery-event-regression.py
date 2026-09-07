#!/usr/bin/env python3
"""Protect robbery event settlement without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-robbery-event-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase45-sync-v010934.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async\s+)?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^(?:async\s+)?function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


robbery = section('maybeTriggerRobberyEvent')
checks = {
    'maybeTriggerRobberyEvent definition exists once': APP.count('function maybeTriggerRobberyEvent(') == 1,
    'illness suppression retained': 'if (illnessEventSuppressionActive()) return false;' in robbery,
    'robbery state lookup retained': 'const robbery = robberyEventState();' in robbery,
    'pending-report idempotency retained': 'if (robbery.pendingReport) return null;' in robbery,
    'contracted branch candidate scan retained': 'const candidates = contractedStoreBranches()' in robbery and 'robberyItemsInBranch(branch)' in robbery,
    'empty branch filtering retained': '.filter((entry) => entry.products.length > 0);' in robbery,
    'wood sword chance reduction retained': 'hasBokuto() ? ROBBERY_DAILY_CHANCE * WOOD_SWORD_ROBBERY_MULTIPLIER : ROBBERY_DAILY_CHANCE' in robbery,
    'failed roll guard retained': 'if (!candidates.length || Number(randomValue) >= robberyChance) return null;' in robbery,
    'candidate selection retained': 'const target = randomFrom(candidates, candidates[0]);' in robbery,
    'invalid target guard retained': 'if (!target?.branch || !target.products.length) return null;' in robbery,
    'branch number normalization retained': 'const branchNumber = Math.max(1, Number(target.branch.number) || 1);' in robbery,
    'branch label retained': 'const branchLabel = storeBranchLabel(branchNumber);' in robbery,
    'loss total retained': 'const lossAmount = target.products.reduce((sum, entry) => sum + Math.max(0, Number(entry.sellingPrice) || 0), 0);' in robbery,
    'incident day retained': 'const incidentDay = Math.max(1, Number(state.game.day) - 1);' in robbery,
    'report id retained': 'id: `robbery-${state.game.day}-${uid()}`' in robbery,
    'report day retained': 'reportDay: state.game.day' in robbery,
    'branch fallback id retained': "branchId: target.branch.id || `branch-${branchNumber}`" in robbery,
    'item count retained': 'itemCount: target.products.length' in robbery,
    'loss rounding retained': 'lossAmount: Math.round(lossAmount)' in robbery,
    'item name snapshot retained': 'itemNames: target.products.map(({ item }) => item.name)' in robbery,
    'waiting morning stage retained': "stage: 'waitingMorning'" in robbery,
    'stolen day metadata retained': 'item.stolenDay = state.game.day;' in robbery,
    'stolen branch metadata retained': 'item.stolenBranchNumber = branchNumber;' in robbery,
    'stolen value metadata retained': 'item.stolenLossValue = Math.max(0, Math.round(Number(sellingPrice) || 0));' in robbery,
    'completed jewelry removal retained': 'removeJewelry(item.id);' in robbery,
    'store display mirror retained': 'mirrorCurrentStoreDisplay(currentStoreBranch());' in robbery,
    'last trigger day retained': 'robbery.lastTriggeredDay = state.game.day;' in robbery,
    'pending report retained': 'robbery.pendingReport = report;' in robbery,
    'history snapshot retained': 'robbery.history.push(structuredClone(report));' in robbery,
    'history limit retained': 'robbery.history = robbery.history.slice(-ROBBERY_HISTORY_LIMIT);' in robbery,
    'notification retained': "addNotification(\n    '強盗事件が発生しました'" in robbery and "'warning'" in robbery,
    'report return retained': 'return report;' in robbery,
    'pending guard precedes candidate scan': robbery.index('if (robbery.pendingReport) return null;') < robbery.index('const candidates = contractedStoreBranches()'),
    'stolen metadata precedes removal': robbery.index('item.stolenLossValue =') < robbery.index('removeJewelry(item.id);'),
    'inventory removal precedes pending report': robbery.index('removeJewelry(item.id);') < robbery.index('robbery.pendingReport = report;'),
    'pending report precedes history append': robbery.index('robbery.pendingReport = report;') < robbery.index('robbery.history.push('),
    'history append precedes notification': robbery.index('robbery.history.push(') < robbery.index('addNotification('),
    'dynamic test extracts production function': "extractFunction('maybeTriggerRobberyEvent')" in TEST and 'vm.runInContext(source, ctx' in TEST,
    'registered in audit or pending formal sync': 'check-robbery-event-regression.py' in CURRENT or (SYNC.is_file() and 'check-robbery-event-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testIllnessSuppressionReturnsFalseWithoutMutation',
    'testPendingReportPreventsSecondRobbery',
    'testNoCandidatesOrFailedRollDoesNothing',
    'testWoodSwordChanceMultiplierIsApplied',
    'testSuccessfulRobberyRemovesAllItemsAndBuildsReport',
    'testHistoryIsTrimmedToConfiguredLimit',
    'testImmediateSecondCallCannotDoubleRemoveOrNotify',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('ROBBERY EVENT PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-robbery-event-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('ROBBERY EVENT PROTECTION: PASS')
