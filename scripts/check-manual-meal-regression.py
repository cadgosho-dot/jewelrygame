#!/usr/bin/env python3
"""Protect manual meal transactions without modifying gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-manual-meal-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase29-sync-v010918.yml'


def section(name):
    matches = list(re.finditer(r'^(?:async )?function ' + re.escape(name) + r'\(', APP, re.M))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    following = re.search(r'^function |^async function ', APP[matches[0].end():], re.M)
    return APP[start:matches[0].end() + following.start()] if following else APP[start:]


meal = section('eatMeal')
resume = section('resumeActiveMealEvent')
spend = section('spendMealTime')
checks = {
    'invalid meal and in-flight guards': 'if (!meal || mealTransitioning) return;' in meal,
    'resume before hunger/money/time guards': meal.index('resumeActiveMealEvent(mealId)') < meal.index('const before = hungerLevel();'),
    'full hunger gate': "if (before >= 7) return showToast('空腹度は満タンです。', 'error');" in meal,
    'repeat meal gate and ice exception': "mealId !== 'ice' && state.wellbeing.mealsEaten > 0 && state.wellbeing.lastMeal === mealId" in meal,
    'normalized override/default price': 'Math.max(0, Math.floor(Number(priceOverride ?? meal.price) || 0))' in meal,
    'money gate': 'if (state.game.money < actualPrice)' in meal,
    'time gate': 'if (!canSpendMealTime())' in meal,
    'time gate before new events': meal.index('if (!canSpendMealTime())') < meal.index('maybeStartCyclopsEvent()'),
    'lock before preload': meal.index('mealTransitioning = true;') < meal.index('await preloadMealAssets(mealId);'),
    'snapshot before mutation': meal.index('const stateBeforeMeal = structuredClone(state);') < meal.index('state.game.money -= actualPrice;'),
    'meal state transaction': all(token in meal for token in [
        'state.game.money -= actualPrice;', 'addFinance(`${meal.name}で食事`, 0, actualPrice);',
        'spendMealTime();', 'state.wellbeing.hunger = Math.min(7, hungerLevel() + meal.recovery);',
        'state.wellbeing.lastMeal = mealId;', 'state.wellbeing.mealsEaten += 1;',
        'state.daily.meals.push({ id: mealId, name: meal.name, price: actualPrice, recovery: state.wellbeing.hunger - before });',
    ]),
    'commit saved before presentation': meal.index('saveGame();') < meal.index('mealCommitted = true;') < meal.index("setScreen('meal'"),
    'precommit rollback': 'if (!mealCommitted)' in meal and 'state = stateBeforeMeal;' in meal,
    'rollback/recovery save and feedback': meal.count('saveGame();') == 3 and '食事は完了しています。画面を復旧しました。' in meal,
    'cleanup always releases guard/controller': 'finally {\n    mealEatingCompletionController = null;\n    mealTransitioning = false;' in meal,
    'meal duration delegates without hunger consumption': 'spendMinutes(MEAL_DURATION_MINUTES, { consumeHunger: false });' in spend,
    'meal time delegates to shared boundary': 'return canSpendMinutes(MEAL_DURATION_MINUTES);' in section('canSpendMealTime'),
    'active event stage gate': "eventState?.active && !['idle', 'completed'].includes(stage)" in resume,
    'resume does not charge/save/consume time': all(token not in resume for token in ['addFinance(', 'saveGame(', 'spendMealTime(', 'state.game.money -=']),
    'test executes current production source': 'vm.runInContext(source, ctx' in TEST and 'names.map(extractFunction)' in TEST,
    'registered in audit or pending formal sync': 'check-manual-meal-regression.py' in CURRENT or (SYNC.is_file() and 'check-manual-meal-regression.py' in SYNC.read_text(encoding='utf-8')),
}
for name in ['testGuardsAndTimeBoundary', 'testAtomicCommitBeforePresentation', 'testConcurrentPreloadGuard',
             'testPriceNormalizationAndHungerCap', 'testActiveEventResumePrecedesGuards', 'testNewEventRoutesAndSkipOption',
             'testPreCommitRollbackAndPostCommitRecovery', 'testIceReturnAndFeedbackTimer']:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2
for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('MANUAL MEAL PROTECTION: FAIL')
result = subprocess.run(['node', str(ROOT / 'tools/test-manual-meal-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('MANUAL MEAL PROTECTION: PASS')
