#!/usr/bin/env python3
"""Protect Emerald Captain kebab meal settlement without changing gameplay."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-emerald-captain-kebab-meal-regression.mjs').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
SYNC = ROOT / '.github/workflows/phase46-sync-v010935.yml'


def section(name: str) -> str:
    pattern = re.compile(rf'(?m)^[ \t]*(?:async[ \t]+)?function[ \t]+{re.escape(name)}[ \t]*\(')
    matches = list(pattern.finditer(APP))
    if len(matches) != 1:
        raise AssertionError(f'{name}: expected exactly one declaration')
    start = matches[0].start()
    line_end = APP.find('\n', start)
    if line_end < 0:
        line_end = len(APP)
    brace = APP.rfind('{', matches[0].end(), line_end)
    if brace < 0:
        raise AssertionError(f'{name}: opening brace not found')
    depth = 0
    quote = None
    escaped = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(APP):
        c = APP[i]
        n = APP[i + 1] if i + 1 < len(APP) else ''
        if line_comment:
            if c == '\n':
                line_comment = False
            i += 1
            continue
        if block_comment:
            if c == '*' and n == '/':
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif c == '\\':
                escaped = True
            elif c == quote:
                quote = None
            i += 1
            continue
        if c == '/' and n == '/':
            line_comment = True
            i += 2
            continue
        if c == '/' and n == '*':
            block_comment = True
            i += 2
            continue
        if c in ('"', "'", '`'):
            quote = c
            i += 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return APP[start:i + 1]
        i += 1
    raise AssertionError(f'{name}: unterminated function')


start = section('startEmeraldCaptainKebabMeal')
finish = section('finishEmeraldCaptainKebabMeal')
checks = {
    'start definition exists once': APP.count('async function startEmeraldCaptainKebabMeal(') == 1,
    'finish definition exists once': APP.count('function finishEmeraldCaptainKebabMeal(') == 1,
    'start active stage transition guard retained': "if (!eventState.active || !['purchase', 'eating'].includes(eventState.stage) || mealTransitioning) return;" in start,
    'start state snapshot retained': 'stateBeforeMeal = structuredClone(state);' in start,
    'start asset preload retained': 'await preloadEmeraldCaptainMealAssets();' in start,
    'start full hunger guard retained': "if (before >= 7) throw new Error('空腹度は満タンです。');" in start,
    'start repeated meal guard retained': 'state.wellbeing.mealsEaten > 0 && state.wellbeing.lastMeal === EMERALD_CAPTAIN_KEBAB_EVENT_MEAL_ID' in start,
    'start funds guard retained': "if (state.game.money < meal.price) throw new Error('所持金が足りません。');" in start,
    'start hunger snapshot retained': 'if (!eventState.hungerBefore) eventState.hungerBefore = before;' in start,
    'start payment retained': 'state.game.money -= meal.price;' in start,
    'start finance retained': 'addFinance(`${meal.name}で食事`, 0, meal.price);' in start,
    'start money feedback retained': 'startMoneyFeedback(-meal.price, 1200);' in start,
    'start paid flag retained': 'eventState.mealPaid = true;' in start,
    'start eating stage retained': "eventState.stage = 'eating';" in start,
    'start event screen retained': "state.game.screen = 'emeraldCaptainKebabEvent';" in start,
    'start save retained': 'saveGame();' in start,
    'start render retained': 'render();' in start,
    'start watchdog retained': 'scheduleEmeraldCaptainMealWatchdog();' in start,
    'start paint wait retained': 'await waitForNextPaintWithTimeout();' in start,
    'start stage recheck retained': "if (emeraldCaptainKebabEventState().stage !== 'eating') return;" in start,
    'start eating sound retained': "playSfx('emerald-captain-eat');" in start,
    'start completion handoff retained': 'finishEmeraldCaptainKebabMeal();' in start,
    'start rollback retained': 'if (stateBeforeMeal) state = stateBeforeMeal;' in start,
    'start failure completes event retained': "e.active = false;" in start and "e.stage = 'completed';" in start,
    'start failure main recovery retained': 'goMain();' in start and "showToast('ケバブイベントを安全に終了し、メイン画面へ戻りました。', 'warning');" in start,
    'start transition release retained': 'finally {' in start and 'mealTransitioning = false;' in start,
    'finish stage guard retained': "if (!eventState.active || !['eating', 'farewell'].includes(eventState.stage)) return false;" in finish,
    'finish watchdog clear retained': 'clearEmeraldCaptainMealWatchdog();' in finish,
    'finish idempotency retained': 'if (!eventState.mealCompleted) {' in finish,
    'finish hunger baseline retained': 'const before = Math.max(0, Math.min(7, Number(eventState.hungerBefore) || hungerLevel()));' in finish,
    'finish time spend retained': 'spendMealTime();' in finish,
    'finish hunger recovery retained': 'state.wellbeing.hunger = Math.min(7, hungerLevel() + meal.recovery);' in finish,
    'finish last meal retained': 'state.wellbeing.lastMeal = EMERALD_CAPTAIN_KEBAB_EVENT_MEAL_ID;' in finish,
    'finish meal count retained': 'state.wellbeing.mealsEaten = Math.max(0, Number(state.wellbeing.mealsEaten) || 0) + 1;' in finish,
    'finish hunger after retained': 'eventState.hungerAfter = state.wellbeing.hunger;' in finish,
    'finish daily meal history retained': 'state.daily.meals.push({ id: EMERALD_CAPTAIN_KEBAB_EVENT_MEAL_ID, name: meal.name, price: meal.price, recovery: state.wellbeing.hunger - before });' in finish,
    'finish completed flag retained': 'eventState.mealCompleted = true;' in finish,
    'finish farewell stage retained': "eventState.stage = 'farewell';" in finish,
    'finish transition release retained': 'mealTransitioning = false;' in finish,
    'finish save retained': 'saveGame();' in finish,
    'finish farewell sound retained': "playSfx('emerald-captain-farewell'" in finish,
    'finish render retained': 'render();' in finish,
    'finish true return retained': 'return true;' in finish,
    'payment precedes paid flag': start.index('state.game.money -= meal.price;') < start.index('eventState.mealPaid = true;'),
    'paid flag precedes eating stage': start.index('eventState.mealPaid = true;') < start.index("eventState.stage = 'eating';"),
    'save precedes watchdog': start.index('saveGame();') < start.index('scheduleEmeraldCaptainMealWatchdog();'),
    'time precedes meal completion': finish.index('spendMealTime();') < finish.index('eventState.mealCompleted = true;'),
    'daily history precedes meal completion': finish.index('state.daily.meals.push(') < finish.index('eventState.mealCompleted = true;'),
    'meal completion precedes farewell': finish.index('eventState.mealCompleted = true;') < finish.index("eventState.stage = 'farewell';"),
    'dynamic test extracts production functions': "extractFunction('startEmeraldCaptainKebabMeal')" in TEST and "extractFunction('finishEmeraldCaptainKebabMeal')" in TEST and 'vm.runInContext(productionSource, ctx' in TEST,
    'registered in audit or pending formal sync': 'check-emerald-captain-kebab-meal-regression.py' in CURRENT or (SYNC.is_file() and 'check-emerald-captain-kebab-meal-regression.py' in SYNC.read_text(encoding='utf-8')),
}

for name in [
    'testSuccessfulPurchaseMealLifecycle',
    'testAlreadyPaidMealDoesNotChargeTwice',
    'testTransitionGuardPreventsReentry',
    'testInsufficientFundsRestoresAndClosesEvent',
    'testPreloadFailureRestoresPaymentState',
    'testFinishIsIdempotentForMealSettlement',
    'testFinishRejectsInactiveOrWrongStage',
]:
    checks[f'regression retained: {name}'] = TEST.count(name) >= 2

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('EMERALD CAPTAIN KEBAB MEAL PROTECTION: FAIL')

result = subprocess.run(['node', str(ROOT / 'tools/test-emerald-captain-kebab-meal-regression.mjs')], cwd=ROOT)
if result.returncode:
    sys.exit(result.returncode)
print('EMERALD CAPTAIN KEBAB MEAL PROTECTION: PASS')
