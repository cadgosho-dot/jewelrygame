#!/usr/bin/env python3
"""Protect conveyor-belt sushi start and settlement processing without modifying gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-kaitenzushi-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase30-sync-v010919.yml'


def section(name):
    matches = list(re.finditer(r'^function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^function |^async function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


start = section('startKaitenzushi')
finish_parent = section('finishKaitenzushiFromParent')
complete = section('completeKaitenzushi')
message = section('handleKaitenzushiMessage')
checks = {
    'resume active sushi event before normal guards': (
        "savedSushiEvent.active && !['idle', 'completed'].includes(savedSushiEvent.stage)" in start
        and start.index('const savedSushiEvent = sushiChefEventState();') < start.index('const current = hungerLevel();')
    ),
    'playing event restores free session': all(token in start for token in [
        "if (savedSushiEvent.stage === 'playing')", 'budget: Number.MAX_SAFE_INTEGER,', 'free: true,', "setScreen('kaitenzushi', {}, true);",
    ]),
    'hunger repeat money and time guards retained': all(token in start for token in [
        "if (current >= (state.wellbeing.maxHunger || 7))", "state.wellbeing.lastMeal === 'kaitenzushi'",
        'if (!free && state.game.money < 190)', 'if (!canSpendMealTime())',
    ]),
    'event check remains before paid session creation': start.index('maybeStartSushiChefEvent()') < start.index('const eventFree ='),
    'paid budget snapshots current money': 'Math.max(0, Math.floor(Number(state.game.money) || 0))' in start,
    'event-free session gets unlimited budget': 'eventFree ? Number.MAX_SAFE_INTEGER' in start,
    'parent finish delegates tracked totals': 'completeKaitenzushi(session.total, session.plates);' in finish_parent,
    'missing parent session returns to meal': "if (!session) {\n    setScreen('meal', {}, false);\n    return;\n  }" in finish_parent,
    'settlement rejects missing settled or wrong screen': "if (!session || session.settled || screen !== 'kaitenzushi') return;" in complete,
    'settlement lock set before validation': complete.index('session.settled = true;') < complete.index('const total ='),
    'checkout values normalized': all(token in complete for token in [
        'Math.max(0, Math.floor(Number(totalValue) || 0))', 'Math.max(0, Math.floor(Number(plateValue) || 0))',
    ]),
    'checkout must match tracked progress': 'total === session.total && plates === session.plates' in complete,
    'plate amount plausibility retained': 'total >= plates * 190 && total <= plates * 850' in complete,
    'free checkout requires zero total': "session.free\n    ? total === 0" in complete,
    'budget and live money rechecked': 'total > session.budget || total > state.game.money' in complete,
    'invalid checkout unlocks for retry': 'session.settled = false;' in complete and 'お会計金額を確認できませんでした。もう一度お試しください。' in complete,
    'money charged only when total positive': 'if (total > 0) {' in complete and "addFinance('回転寿司で食事', 0, total);" in complete,
    'meal time spent only with plates': 'if (plates > 0) spendMealTime();' in complete,
    'hunger recovers by plate count with cap': 'Math.min(maxHunger, hungerLevel() + plates)' in complete,
    'meal history written only with plates': "if (plates > 0) {\n    state.wellbeing.lastMeal = 'kaitenzushi';" in complete and "id: 'kaitenzushi'" in complete,
    'free event returns to farewell and records result': all(token in complete for token in [
        'eventState.active = true;', "eventState.stage = 'farewell';", 'eventState.lastPlates = plates;',
        'eventState.lastHungerBefore = before;', 'eventState.lastHungerAfter = state.wellbeing.hunger;',
        "state.game.screen = 'sushiChefEvent';", "setScreen('sushiChefEvent', {}, false);",
    ]),
    'regular settlement saves then clears session': (
        complete.count("state.game.screen = 'main';") == 1
        and complete.count('saveGame();') == 2
        and complete.count('kaitenzushiSession = null;') == 2
        and complete.index("state.game.screen = 'main';") < complete.rindex('saveGame();') < complete.rindex('kaitenzushiSession = null;')
    ),
    'zero plate exit remains no-meal path': "showToast('何も食べずにお店を出ました。', 'info', false);" in complete,
    'message source and frame are authenticated': all(token in message for token in [
        "if (screen !== 'kaitenzushi' || !kaitenzushiSession) return;",
        'event.source !== frame.contentWindow', "message.source !== 'jxj-kaitenzushi'",
    ]),
    'message progress cannot exceed budget': 'if (total <= kaitenzushiSession.budget)' in message,
    'checkout message delegates normalized totals': "if (message.type === 'checkout')" in message and 'completeKaitenzushi(total, plates);' in message,
    'test executes current production source': "names.map(extractFunction).join('\\n')" in TEST and 'vm.runInContext(source, ctx' in TEST,
    'registered in audit or pending formal sync': 'check-kaitenzushi-regression.py' in CURRENT or (SYNC.is_file() and 'check-kaitenzushi-regression.py' in SYNC.read_text(encoding='utf-8')),
}
for name in [
    'testStartGuardsAndBudget', 'testResumeAndFreeStart', 'testAmountPlateValidation',
    'testNormalSettlementAndDoubleSettlement', 'testZeroPlateExit', 'testFreeSettlementReturnsEvent',
    'testMessageProgressAndCheckout', 'testParentFinishUsesTrackedProgress',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('KAITENZUSHI PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-kaitenzushi-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('KAITENZUSHI PROTECTION: PASS')
