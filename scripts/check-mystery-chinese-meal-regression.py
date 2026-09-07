#!/usr/bin/env python3
"""Protect mystery Chinese meal settlement without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-mystery-chinese-meal-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase44-sync-v010933.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async\s+)?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^(?:async\s+)?function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


meal = section('applyMysteryChineseMeal')
checks = {
    'applyMysteryChineseMeal definition exists once': APP.count('function applyMysteryChineseMeal(') == 1,
    'event state lookup retained': 'const eventState = mysteryChineseMealEventState();' in meal,
    'Chinese meal lookup retained': 'const meal = MEALS.chinese;' in meal,
    'inactive or missing meal guard retained': 'if (!eventState.active || !meal) return false;' in meal,
    'already-applied idempotency retained': 'if (eventState.mealApplied) return true;' in meal,
    'money normalization guard retained': 'Math.max(0, Math.floor(Number(state?.game?.money) || 0)) < MYSTERY_CHINESE_MEAL_EVENT_COST' in meal,
    'insufficient funds toast retained': "showToast('所持金が足りません。', 'warning');" in meal,
    'hunger snapshot retained': 'const before = hungerLevel();' in meal,
    'meal applied lock retained before charge': 'eventState.mealApplied = true;' in meal,
    'hunger before snapshot retained': 'eventState.hungerBefore = before;' in meal,
    'selected dish snapshot retained': 'eventState.lastDish = eventState.selectedDish;' in meal,
    'money deduction retained': 'state.game.money = Math.max(0, Math.floor(Number(state.game.money) || 0) - MYSTERY_CHINESE_MEAL_EVENT_COST);' in meal,
    'finance record retained': "addFinance('謎の中華料理', 0, MYSTERY_CHINESE_MEAL_EVENT_COST);" in meal,
    'money feedback retained': 'startMoneyFeedback(-MYSTERY_CHINESE_MEAL_EVENT_COST, 1200);' in meal,
    'meal time retained': 'spendMealTime();' in meal,
    'hunger recovery cap retained': 'state.wellbeing.hunger = Math.min(7, hungerLevel() + meal.recovery);' in meal,
    'last meal retained': 'state.wellbeing.lastMeal = meal.id;' in meal,
    'meals eaten normalization retained': 'state.wellbeing.mealsEaten = Math.max(0, Math.floor(Number(state.wellbeing.mealsEaten) || 0)) + 1;' in meal,
    'hunger after snapshot retained': 'eventState.hungerAfter = state.wellbeing.hunger;' in meal,
    'daily meals normalization retained': 'state.daily.meals = Array.isArray(state.daily.meals) ? state.daily.meals : [];' in meal,
    'daily meal history retained': "state.daily.meals.push({ id: meal.id, name: '謎の中華料理', price: MYSTERY_CHINESE_MEAL_EVENT_COST, recovery: state.wellbeing.hunger - before });" in meal,
    'notification retained': "addNotification('謎の中華料理を食べた'" in meal and "'special'" in meal,
    'save retained': 'saveGame();' in meal,
    'successful return retained': 'return true;' in meal,
    'idempotency lock precedes charge': meal.index('eventState.mealApplied = true;') < meal.index('state.game.money = Math.max'),
    'time spend follows financial commit': meal.index('addFinance(') < meal.index('spendMealTime();'),
    'history follows hunger settlement': meal.index('state.wellbeing.hunger = Math.min') < meal.index('state.daily.meals.push('),
    'save follows notification': meal.index('addNotification(') < meal.index('saveGame();'),
    'dynamic test extracts production function': "extractFunction('applyMysteryChineseMeal')" in TEST and 'vm.runInContext(source, ctx' in TEST,
    'registered in audit or pending formal sync': 'check-mystery-chinese-meal-regression.py' in CURRENT or (SYNC.is_file() and 'check-mystery-chinese-meal-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testInactiveOrMissingMealDoesNothing',
    'testAlreadyAppliedIsIdempotent',
    'testInsufficientFundsDoesNotPartiallyCommit',
    'testSuccessfulMealCommitsMoneyTimeHungerAndHistory',
    'testHungerRecoveryCapsAtSeven',
    'testDailyMealsAndMealsEatenAreNormalized',
    'testRepeatedCallCannotDoubleChargeSpendTimeOrRecordHistory',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('MYSTERY CHINESE MEAL PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-mystery-chinese-meal-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('MYSTERY CHINESE MEAL PROTECTION: PASS')
