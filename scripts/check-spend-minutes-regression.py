#!/usr/bin/env python3
"""Protect the shared in-game time consumption path without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-spend-minutes-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase34-sync-v010923.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async\s+)?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^(?:async\s+)?function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


spend = section('spendMinutes')
hours = section('spendHours')

checks = {
    'shared time functions exist once': APP.count('function spendMinutes(') == 1 and APP.count('function spendHours(') == 1,
    'minutes normalize nonnegative rounded elapsed and hunger cost': all(token in spend for token in [
        'const elapsedMinutes = Math.max(0, Math.round(Number(minutes) || 0));',
        'const hungerCost = consumeHunger ? Math.floor(elapsedMinutes / 60) : 0;',
        'const before = hungerLevel();',
        'const beforeMinutes = state.game.minutes;',
    ]),
    'time advances with day-end clamp': 'state.game.minutes = Math.min(DAY_END_MINUTES, state.game.minutes + elapsedMinutes);' in spend,
    'store operating minutes use open-close overlap only': all(token in spend for token in [
        'const storeOpenStart = Math.max(beforeMinutes, STORE_OPEN_MINUTES);',
        'const storeOpenEnd = Math.min(state.game.minutes, STORE_CLOSE_MINUTES);',
        'const storeElapsed = Math.max(0, storeOpenEnd - storeOpenStart);',
        'if (storeElapsed > 0) contractedStoreBranches().filter((branch) => storeBranchOperating(branch)).forEach((branch) => { branch.openMinutesToday = Math.max(0, Number(branch.openMinutesToday) || 0) + storeElapsed; });',
    ]),
    'workshop staff receives exact elapsed interval': 'processWorkshopStaffElapsedTime(beforeMinutes, state.game.minutes);' in spend,
    'crossing store close ends visiting customers': 'if (beforeMinutes < STORE_CLOSE_MINUTES && state.game.minutes >= STORE_CLOSE_MINUTES) closeVisitingCustomersAtStoreClosing();' in spend,
    'hunger is reduced and clamped at zero': 'state.wellbeing.hunger = Math.max(0, before - hungerCost);' in spend,
    'birthday low-energy rest is scheduled only on hunger-consuming time': all(token in spend for token in [
        'if (consumeHunger && birthdaySleepAvailableToday() && state.wellbeing.hunger <= 1) {',
        'const birthdayEvent = birthdaySleepEventState();',
        'birthdayEvent.restPending = true;',
        "birthdayEvent.triggerReason = 'energy';",
    ]),
    'hours wrapper rounds nonnegative hours and delegates': 'spendMinutes(Math.max(0, Math.round(Number(hours) || 0)) * 60);' in hours,
    'test executes current production functions': "names.map(extractFunction).join('\\n')" in TEST and 'vm.runInContext(source, ctx' in TEST,
    'registered in audit or pending formal sync': 'check-spend-minutes-regression.py' in CURRENT or (SYNC.is_file() and 'check-spend-minutes-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testSpendMinutesAdvancesTimeHungerAndOperatingStoreMinutes',
    'testSpendMinutesClampsAtDayEnd',
    'testSpendMinutesClosesVisitorsWhenCrossingStoreClose',
    'testSpendMinutesCanSkipHungerAndBirthdayRest',
    'testSpendMinutesMarksBirthdayRestPendingAtLowHunger',
    'testSpendMinutesNormalizesNegativeAndFractionalInput',
    'testSpendHoursRoundsAndDelegatesToMinutes',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('SPEND MINUTES PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-spend-minutes-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('SPEND MINUTES PROTECTION: PASS')