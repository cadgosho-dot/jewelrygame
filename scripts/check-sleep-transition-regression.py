#!/usr/bin/env python3
"""Protect beginSleepTransition() current behavior without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-sleep-transition-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase36-sync-v010925.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async\s+)?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^(?:async\s+)?function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


sleep = section('beginSleepTransition')
checks = {
    'beginSleepTransition definition exists once': APP.count('async function beginSleepTransition(') == 1,
    'duplicate sleep transition guard retained': 'if (sleepTransitioning) return;' in sleep,
    'normal sleep eligibility guard retained': 'if (!allowEarly && !canSleepNow()) {' in sleep,
    'blocked sleep closes modal and reports restriction': all(token in sleep for token in [
        'closeModal();',
        "showToast(sleepRestrictionMessage(), 'error');",
    ]),
    'transition lock is acquired before work': 'sleepTransitioning = true;' in sleep,
    'sleep curtain starts immediately': "sleepCurtainEl?.classList.add('active', 'sleep-starting');" in sleep,
    'pre-sleep state snapshot retained': 'const stateBeforeSleep = structuredClone(state);' in sleep,
    'night transition checkpoint retained': 'markNightTransitionCheckpoint();' in sleep,
    'local recovery checkpoint retained': "flushAutosaveLocally('sleep-checkpoint');" in sleep,
    'sleep audio route and timeout retained': all(token in sleep for token in [
        "switchAudio(isAlienAbducted() ? 'space' : 'sleep')",
        'wait(700)',
    ]),
    'daily settlement delegation retained': 'const daySave = settleDay({ hospitalCheck: true });' in sleep,
    'daily settlement wait bound retained': 'await Promise.race([daySave, wait(1800)]);' in sleep,
    'sleep curtain release timing retained': all(token in sleep for token in [
        'await wait(420);',
        "sleepCurtainEl?.classList.remove('sleep-starting');",
        "sleepCurtainEl?.classList.remove('active');",
        'await wait(120);',
        'await wait(580);',
    ]),
    'pending day money feedback retained': all(token in sleep for token in [
        'if (pendingDayMoneyDelta) {',
        'startMoneyFeedback(pendingDayMoneyDelta, 1200);',
        'pendingDayMoneyDelta = 0;',
        'render();',
    ]),
    'failure restores pre-sleep state': 'state = stateBeforeSleep;' in sleep,
    'failure returns navigation to main': all(token in sleep for token in [
        "screen = 'main';",
        'screenData = {};',
        'navigation = [];',
    ]),
    'failure clears pending money and persists rollback': all(token in sleep for token in [
        'pendingDayMoneyDelta = 0;',
        'saveGame();',
        'render();',
    ]),
    'failure warning retained': "showToast('翌日の処理を中断し、暗転前の状態へ戻しました。', 'error')" in sleep,
    'finally always clears curtain and lock': all(token in sleep for token in [
        "sleepCurtainEl?.classList.remove('active', 'sleep-starting');",
        'sleepTransitioning = false;',
    ]),
    'test executes current production function': "const source = extractFunction('beginSleepTransition');" in TEST and "vm.runInContext(source, ctx" in TEST,
    'registered in audit or pending formal sync': 'check-sleep-transition-regression.py' in CURRENT or (SYNC.is_file() and 'check-sleep-transition-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testTransitionGuardBlocksDuplicateSleep',
    'testRegularSleepGuardShowsRestriction',
    'testSuccessfulSleepCreatesCheckpointAndSettlesDay',
    'testAllowEarlyBypassesRestrictionAndUsesSpaceAudio',
    'testSettlementFailureRollsBackStateAndUnlocks',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('SLEEP TRANSITION PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-sleep-transition-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('SLEEP TRANSITION PROTECTION: PASS')
