#!/usr/bin/env python3
"""Regression guard for cinema event state object identity across async start checks."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')


def section(name: str) -> str:
    match = re.search(r'^function ' + re.escape(name) + r'\(\) \{', APP, re.M)
    if not match:
        raise AssertionError(f'{name}: declaration not found')
    following = re.search(r'^function ', APP[match.end():], re.M)
    end = match.end() + following.start() if following else len(APP)
    return APP[match.start():end]


def async_section(name: str) -> str:
    match = re.search(r'^async function ' + re.escape(name) + r'\(\) \{', APP, re.M)
    if not match:
        raise AssertionError(f'{name}: declaration not found')
    following = re.search(r'^(?:async\s+)?function ', APP[match.end():], re.M)
    end = match.end() + following.start() if following else len(APP)
    return APP[match.start():end]


checks = {}
for function_name, event_key in [
    ('cinemaVisitEventState', 'cinemaVisitEvent'),
    ('apprenticeCinemaEventState', 'apprenticeCinemaEvent'),
]:
    body = section(function_name)
    checks[f'{function_name}: next object normalized'] = 'const next = {' in body
    checks[f'{function_name}: existing object updated in place'] = 'Object.assign(saved, next);' in body
    checks[f'{function_name}: saved reference restored'] = f'state.events.{event_key} = saved;' in body
    checks[f'{function_name}: same reference returned'] = 'return saved;' in body
    checks[f'{function_name}: replacement assignment removed'] = f'state.events.{event_key} = {{' not in body

cinema_start = async_section('maybeStartCinemaVisitEvent')
apprentice_start = async_section('maybeStartApprenticeCinemaEvent')
checks['cinema async start holds event reference across video await'] = (
    'const eventState = cinemaVisitEventState();' in cinema_start
    and 'await loadCinemaEventVideos();' in cinema_start
    and 'eventState.active = true;' in cinema_start
)
checks['apprentice cinema async start holds event reference across video await'] = (
    'const eventState = apprenticeCinemaEventState();' in apprentice_start
    and 'await loadCinemaEventVideos();' in apprentice_start
    and 'eventState.active = true;' in apprentice_start
)

for name, ok in checks.items():
    print(f"{'OK' if ok else 'NG'}: {name}")
if not all(checks.values()):
    sys.exit('CINEMA EVENT STATE REFERENCE PROTECTION: FAIL')
print('CINEMA EVENT STATE REFERENCE PROTECTION: PASS')
