#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'js/app.js'
CURRENT = ROOT / 'scripts/check-current.py'
CHECK = ROOT / 'scripts/check-cinema-event-state-reference-regression.py'

source = APP.read_text(encoding='utf-8')


def preserve_reference_in_normalizer(text: str, function_name: str, event_key: str) -> str:
    start_marker = f'function {function_name}() {{'
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f'NG: {function_name} が見つかりません')
    end = text.find('\nfunction ', start + len(start_marker))
    if end < 0:
        raise SystemExit(f'NG: {function_name} の終端が見つかりません')
    section = text[start:end]
    assignment_marker = f'  state.events.{event_key} = {{'
    assignment_start = section.find(assignment_marker)
    if assignment_start < 0:
        raise SystemExit(f'NG: {event_key} の置換前代入が見つかりません')
    assignment_end = section.find('\n  };', assignment_start)
    if assignment_end < 0:
        raise SystemExit(f'NG: {event_key} のオブジェクト代入終端が見つかりません')
    assignment_end += len('\n  };')
    assignment = section[assignment_start:assignment_end]
    assignment = assignment.replace(assignment_marker, '  const next = {', 1)
    replacement = assignment + f'\n  Object.assign(saved, next);\n  state.events.{event_key} = saved;'
    suffix = section[assignment_end:]
    suffix = suffix.replace(f'state.events.{event_key}.', 'saved.')
    suffix = suffix.replace(f'return state.events.{event_key};', 'return saved;')
    updated_section = section[:assignment_start] + replacement + suffix
    if updated_section == section:
        raise SystemExit(f'NG: {function_name} が変更されませんでした')
    if f'state.events.{event_key} = {{' in updated_section:
        raise SystemExit(f'NG: {event_key} の参照置換代入が残っています')
    if 'Object.assign(saved, next);' not in updated_section or f'state.events.{event_key} = saved;' not in updated_section or 'return saved;' not in updated_section:
        raise SystemExit(f'NG: {event_key} の参照維持処理が不足しています')
    return text[:start] + updated_section + text[end:]


source = preserve_reference_in_normalizer(source, 'cinemaVisitEventState', 'cinemaVisitEvent')
source = preserve_reference_in_normalizer(source, 'apprenticeCinemaEventState', 'apprenticeCinemaEvent')
APP.write_text(source, encoding='utf-8')

check_source = r'''#!/usr/bin/env python3
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
'''
CHECK.write_text(check_source, encoding='utf-8')

current = CURRENT.read_text(encoding='utf-8')
entry = "    ('映画館イベント状態参照保護', [sys.executable, str(ROOT / 'scripts/check-cinema-event-state-reference-regression.py')]),\n"
anchor = "    ('イベント緊急確定処理保護', [sys.executable, str(ROOT / 'scripts/check-event-emergency-settlement-regression.py')]),\n"
if entry not in current:
    if anchor not in current:
        raise SystemExit('NG: check-current.py の登録位置が見つかりません')
    current = current.replace(anchor, anchor + entry, 1)
    CURRENT.write_text(current, encoding='utf-8')

print('OK: 映画館2イベントの状態オブジェクト参照維持修正と回帰検査を作成しました。')
