#!/usr/bin/env python3
"""JEWELRY×JEWELRY event-integrity audit.

Checks the failure classes that caused several low-probability events to stall:
- rendered data-action without a click/change handler
- EVENT_ACTIVE_STAGE_MAP stage missing from the event state's valid stages
- recovery config pointing at an unregistered event key
- required hunger-zero escape/progress actions missing
- event audio scene routing drifting back to the generic main scene
- missing static local assets used by event/audio code
- verified loose-shop quiz payload shape/count
- executable save -> JSON -> migrateState() round-trip for every active event stage
- meal atomic commit / meal-event reload recovery / persisted quiz-session round-trip

Run from anywhere:  python scripts/check-event-integrity.py
Exits 0 on PASS, 1 when an integrity error is found.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'js' / 'app.js'
AUDIO_MAP = ROOT / 'js' / 'audio-scene-map.js'
QUIZ = ROOT / 'data' / 'jewelry_quiz_50_verified_2026-08-10.json'

errors: list[str] = []
notes: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def extract_object_block(source: str, marker: str) -> str:
    pos = source.find(marker)
    if pos < 0:
        return ''
    brace = source.find('{', pos)
    if brace < 0:
        return ''
    depth = 0
    quote = ''
    escaped = False
    for i in range(brace, len(source)):
        ch = source[i]
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = ''
            continue
        if ch in "'\"`":
            quote = ch
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return source[brace + 1:i]
    return ''


def function_blocks(source: str, suffix: str = 'EventState') -> dict[str, str]:
    result: dict[str, str] = {}
    for match in re.finditer(rf'function\s+(\w+{re.escape(suffix)})\s*\([^)]*\)\s*\{{', source):
        brace = source.find('{', match.start())
        depth = 0
        quote = ''
        escaped = False
        for i in range(brace, len(source)):
            ch = source[i]
            if quote:
                if escaped:
                    escaped = False
                elif ch == '\\':
                    escaped = True
                elif ch == quote:
                    quote = ''
                continue
            if ch in "'\"`":
                quote = ch
                continue
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    result[match.group(1)] = source[match.start():i + 1]
                    break
    return result


def quoted_values(expr: str) -> set[str]:
    return set(re.findall(r"['\"]([^'\"]+)['\"]", expr))


def parse_local_set_variables(block: str) -> dict[str, set[str]]:
    values: dict[str, set[str]] = {}
    patterns = [
        r'const\s+(\w+)\s*=\s*new Set\(\[([^\]]*)\]\)',
        r'const\s+(\w+)\s*=\s*\[([^\]]*)\]',
    ]
    for pattern in patterns:
        for name, body in re.findall(pattern, block, re.S):
            values.setdefault(name, set()).update(quoted_values(body))
    return values


def parse_active_stage_map(source: str) -> dict[str, set[str]]:
    block = extract_object_block(source, 'const EVENT_ACTIVE_STAGE_MAP')
    result: dict[str, set[str]] = {}
    for key, body in re.findall(r'^\s*(\w+)\s*:\s*new Set\(\[([^\]]*)\]\)', block, re.M | re.S):
        result[key] = quoted_values(body)
    return result


def parse_event_valid_stages(source: str) -> dict[str, set[str]]:
    parsed: dict[str, set[str]] = {}
    for _, block in function_blocks(source).items():
        key_match = re.search(r"simpleEventState\(['\"](\w+)['\"]", block)
        if not key_match:
            key_match = re.search(r'state\.events\.(\w+)', block)
        if not key_match:
            continue
        key = key_match.group(1)
        locals_map = parse_local_set_variables(block)

        valid_match = re.search(r'const\s+validStages\s*=\s*new Set\(\[([^\]]*)\]\)', block, re.S)
        if valid_match:
            body = valid_match.group(1)
            stages = quoted_values(body)
            for spread in re.findall(r'\.\.\.(\w+)', body):
                stages.update(locals_map.get(spread, set()))
            parsed[key] = stages
            continue

        simple_match = re.search(r"simpleEventState\(['\"]\w+['\"]\s*,\s*\[([^\]]*)\]", block, re.S)
        if simple_match:
            parsed[key] = quoted_values(simple_match.group(1))
    return parsed


def parse_named_set(source: str, name: str) -> set[str]:
    match = re.search(rf'const\s+{re.escape(name)}\s*=\s*new Set\(\[([^\]]*)\]\)', source, re.S)
    return quoted_values(match.group(1)) if match else set()


def parse_static_audio_routes(source: str) -> dict[str, str]:
    block = extract_object_block(source, 'export const SCREEN_AUDIO_SCENES')
    routes: dict[str, str] = {}
    for key1, key2, scene in re.findall(r"^\s*(?:(\w+)|['\"]([^'\"]+)['\"])\s*:\s*['\"]([^'\"]+)['\"]\s*,?", block, re.M):
        routes[key1 or key2] = scene
    return routes


app = APP.read_text(encoding='utf-8')
audio = AUDIO_MAP.read_text(encoding='utf-8')

# 1) Static data-action coverage: switch cases OR dedicated selector listeners.
actions = {
    value for value in re.findall(r'data-action=["\']([^"\']+)', app)
    if '${' not in value and '}' not in value
}
switch_cases = set(re.findall(r"case\s+['\"]([^'\"]+)['\"]\s*:", app))
direct_selectors = set(re.findall(r"\[data-action=[\\\"]?['\"]?([^'\"\\\]]+)['\"]?[\\\"]?\]", app))
# Simpler literal selector form used by add/change listeners.
direct_selectors.update(re.findall(r'data-action=\\?"([^"\\]+)\\?"', app))
missing_actions = sorted(actions - switch_cases - direct_selectors)
if missing_actions:
    fail('Unhandled static data-action(s): ' + ', '.join(missing_actions))
else:
    notes.append(f'data-action coverage: {len(actions)} static actions handled')

# 2) EVENT_ACTIVE_STAGE_MAP must be compatible with each parseable EventState validator.
active = parse_active_stage_map(app)
valid = parse_event_valid_stages(app)
for key, active_stages in sorted(active.items()):
    if not active_stages or key not in valid:
        continue
    missing = active_stages - valid[key]
    if missing:
        fail(f'{key}: active stage(s) absent from EventState validStages: {sorted(missing)}')
notes.append(f'event stage validators parsed: {len(valid)} / active maps: {len(active)}')

# 3) Recovery config may only point at registered event keys.
recovery_block = extract_object_block(app, 'const EVENT_SCREEN_RECOVERY_CONFIG')
for key in re.findall(r"eventKey\s*:\s*['\"](\w+)['\"]", recovery_block):
    if key and key not in active:
        fail(f'Recovery config eventKey not in EVENT_ACTIVE_STAGE_MAP: {key}')
for key in re.findall(r"conditionalEventKey\s*:\s*['\"](\w+)['\"]", recovery_block):
    if key and key not in active:
        fail(f'Recovery config conditionalEventKey not in EVENT_ACTIVE_STAGE_MAP: {key}')

# 4) Hunger-zero progress/escape actions that must never be blocked.
progress = parse_named_set(app, 'EVENT_PROGRESS_ACTIONS')
hunger_explicit = parse_named_set(app, 'HUNGER_ALLOWED_ACTIONS')
hunger_effective = progress | hunger_explicit
required_hunger_actions = {
    'cancel-kaitenzushi',
    'terry-california-video-start', 'terry-california-event-next',
    'terry-california-event-buy', 'terry-california-event-decline',
    'kawahara-knowledge-video-start', 'kawahara-knowledge-event-next',
    'event-emergency-recover',
}
for action in sorted(required_hunger_actions - hunger_effective):
    fail(f'Hunger-zero progress/escape action missing: {action}')

# 5) Required event audio routes must stay tied to their location/meal scene.
routes = parse_static_audio_routes(audio)
expected_routes = {
    'ridleyOkazakiSobaEvent': 'meal-soba',
    'emeraldCaptainKebabEvent': 'meal-kebab',
    'grayHoodAquariumEvent': 'meal-korean',
    'terryCaliforniaEvent': 'meal-hamburger',
    'looseShopOriginalQuizEvent': 'looseShop',
    'wristFoundEvent': 'wristFound',
    'kawaharaKnowledgeEvent': 'glab',
}
for screen, expected in expected_routes.items():
    actual = routes.get(screen)
    if actual != expected:
        fail(f'Audio route {screen}: expected {expected!r}, got {actual!r}')
notes.append(f'event audio routes guarded: {len(expected_routes)}')

# 6) Static local assets referenced by event/audio code must exist.
asset_sources = [APP, AUDIO_MAP, ROOT / 'js' / 'game-data.js', ROOT / 'game.html', ROOT / 'styles.css']
asset_refs: set[str] = set()
for path in asset_sources:
    text = path.read_text(encoding='utf-8')
    for ref in re.findall(r"['\"](\./assets/[^'\"]+)['\"]", text):
        ref = ref.split('?', 1)[0]
        if '${' in ref or '`' in ref:
            continue
        asset_refs.add(ref)
for ref in sorted(asset_refs):
    local = ROOT / ref[2:]
    if not local.exists():
        fail(f'Missing static asset: {ref}')
notes.append(f'static asset refs checked: {len(asset_refs)}')

# 7) Loose-shop verified quiz contract.
try:
    quiz = json.loads(QUIZ.read_text(encoding='utf-8'))
    questions = quiz.get('questions') if isinstance(quiz, dict) else None
    if not isinstance(questions, list) or len(questions) != 50:
        fail(f'Loose-shop quiz must contain 50 questions; got {len(questions) if isinstance(questions, list) else "invalid"}')
    else:
        for i, question in enumerate(questions, 1):
            choices = question.get('choices') if isinstance(question, dict) else None
            answer = question.get('answerIndex') if isinstance(question, dict) else None
            if not isinstance(choices, list) or len(choices) != 4 or not isinstance(answer, int) or not (0 <= answer < 4):
                fail(f'Loose-shop quiz question {i} has invalid choices/answerIndex')
                break
        notes.append('loose-shop quiz: 50 questions / 4 choices contract checked')
except Exception as exc:
    fail(f'Loose-shop quiz could not be parsed: {exc}')

# 8) Executable save -> JSON -> migrateState() round-trip for every active event stage.
roundtrip_script = ROOT / 'scripts' / 'check-event-save-roundtrip.py'
roundtrip = subprocess.run(
    [sys.executable, str(roundtrip_script)],
    cwd=ROOT,
    text=True,
    capture_output=True,
)
if roundtrip.returncode != 0:
    details = '\n'.join(line for line in (roundtrip.stdout + '\n' + roundtrip.stderr).splitlines() if line.strip())
    fail('Event save/migration round-trip audit failed' + (f':\n{details}' if details else ''))
else:
    checked_match = re.search(r'OK:\s+(\d+) active event stages', roundtrip.stdout)
    checked = checked_match.group(1) if checked_match else 'all'
    notes.append(f'event save/migration round-trip: {checked} active stages checked')

# 9) Meal transaction / meal-event / quiz-session crash-and-reload recovery audit.
meal_quiz_script = ROOT / 'scripts' / 'check-meal-quiz-recovery.py'
meal_quiz = subprocess.run(
    [sys.executable, str(meal_quiz_script)],
    cwd=ROOT,
    text=True,
    capture_output=True,
)
if meal_quiz.returncode != 0:
    details = '\n'.join(line for line in (meal_quiz.stdout + '\n' + meal_quiz.stderr).splitlines() if line.strip())
    fail('Meal/quiz recovery audit failed' + (f':\n{details}' if details else ''))
else:
    checked_match = re.search(r'quiz session JSON\+migrateState round-trip:\s+(\d+) stages', meal_quiz.stdout)
    checked = checked_match.group(1) if checked_match else 'all'
    notes.append(f'meal/quiz crash-and-reload recovery: PASS ({checked} quiz stages)')

if errors:
    print('EVENT INTEGRITY AUDIT: FAIL')
    for item in errors:
        print(f'ERROR: {item}')
    for item in notes:
        print(f'OK: {item}')
    sys.exit(1)

print('EVENT INTEGRITY AUDIT: PASS')
for item in notes:
    print(f'OK: {item}')
