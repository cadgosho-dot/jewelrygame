#!/usr/bin/env python3
"""Regression guard for event-state object identity where callers retain references."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')

def section(name: str) -> str:
    match = re.search(r'(?m)^(?:async\s+)?function ' + re.escape(name) + r'\([^\n]*\) \{', APP)
    if not match:
        raise AssertionError(f'{name}: declaration not found')
    following = re.search(r'(?m)^(?:async\s+)?function ', APP[match.end():])
    end = match.end() + following.start() if following else len(APP)
    return APP[match.start():end]

checks = {}
for function_name, event_key in [
    ('alienAbductionEventState', 'alienAbductionEvent'),
    ('emeraldCaptainKebabEventState', 'emeraldCaptainKebabEvent'),
]:
    body = section(function_name)
    checks[f'{function_name}: normalized through next object'] = 'const next = {' in body
    checks[f'{function_name}: existing object updated in place'] = 'Object.assign(saved, next);' in body
    checks[f'{function_name}: saved reference restored'] = f'state.events.{event_key} = saved;' in body
    checks[f'{function_name}: same reference returned'] = 'return saved;' in body
    checks[f'{function_name}: replacement assignment removed'] = f'state.events.{event_key} = {{' not in body

alien_complete = section('completeAlienReturnEvent')
checks['alien return grants chip through nested state accessor'] = 'grantAlienBodyChip();' in alien_complete
checks['alien return completes retained reference after grant'] = (
    alien_complete.index('grantAlienBodyChip();') < alien_complete.index("eventState.active = false;")
    and alien_complete.index('grantAlienBodyChip();') < alien_complete.index("eventState.stage = 'completed';")
)

emerald_advance = section('advanceEmeraldCaptainKebabEvent')
checks['emerald purchase uses nested state accessor before retained stage write'] = (
    'applyEmeraldCaptainKebabPurchase()' in emerald_advance
    and emerald_advance.index('applyEmeraldCaptainKebabPurchase()') < emerald_advance.index("eventState.stage = 'purchaseResult';")
)
emerald_meal = section('startEmeraldCaptainKebabMeal')
checks['emerald meal retains event reference across preload await'] = (
    'const eventState = emeraldCaptainKebabEventState();' in emerald_meal
    and 'await preloadEmeraldCaptainMealAssets();' in emerald_meal
    and 'eventState.mealPaid = true;' in emerald_meal
    and emerald_meal.index('await preloadEmeraldCaptainMealAssets();') < emerald_meal.index('eventState.mealPaid = true;')
)

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('EVENT STATE REFERENCE AUDIT PROTECTION: FAIL')
print('EVENT STATE REFERENCE AUDIT PROTECTION: PASS')
