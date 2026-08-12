#!/usr/bin/env python3
"""JEWELRY×JEWELRY event save/migration round-trip audit.

For every active stage declared in app.js EVENT_ACTIVE_STAGE_MAP:
1. create a fresh current save via initialState()
2. place the event in that active stage
3. JSON serialize/deserialize it (browser-save equivalent)
4. run migrateState()
5. verify active/stage survive unchanged

Also guards video-resume metadata for the three events whose intro videos must
survive app/PWA reloads.

Run: python scripts/check-event-save-roundtrip.py
Exits 0 on PASS, 1 on any migration regression.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'js' / 'app.js'
GAME_DATA = ROOT / 'js' / 'game-data.js'


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


def parse_active_stage_map(source: str) -> dict[str, list[str]]:
    block = extract_object_block(source, 'const EVENT_ACTIVE_STAGE_MAP')
    result: dict[str, list[str]] = {}
    for key, body in re.findall(r'^\s*(\w+)\s*:\s*new Set\(\[([^\]]*)\]\)', block, re.M | re.S):
        result[key] = re.findall(r"['\"]([^'\"]+)['\"]", body)
    return result


node = shutil.which('node')
if not node:
    print('EVENT SAVE ROUNDTRIP AUDIT: FAIL')
    print('ERROR: Node.js is required for the executable migrateState() audit.')
    sys.exit(1)

active_map = parse_active_stage_map(APP.read_text(encoding='utf-8'))
if not active_map:
    print('EVENT SAVE ROUNDTRIP AUDIT: FAIL')
    print('ERROR: EVENT_ACTIVE_STAGE_MAP could not be parsed.')
    sys.exit(1)

cases = [
    {'eventKey': event_key, 'stage': stage}
    for event_key, stages in active_map.items()
    for stage in stages
]

# Explicit metadata contracts for intro-video events that previously lost their
# resume information during migrateState().
video_meta = {
    'westernUnionEvent': {'stageAfterVideo': 'choice'},
    'tattooWomanAmberEvent': {'stageAfterVideo': 'intro1'},
    'grayHoodAquariumEvent': {'stageAfterVideo': 'intro1'},
}

runner = r'''import { initialState, migrateState } from './game-data-under-test.mjs';
import fs from 'node:fs';
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const failures = [];
let checked = 0;
for (const test of payload.cases) {
  const save = initialState();
  save.events = save.events && typeof save.events === 'object' && !Array.isArray(save.events) ? save.events : {};
  const base = save.events[test.eventKey] && typeof save.events[test.eventKey] === 'object' && !Array.isArray(save.events[test.eventKey])
    ? save.events[test.eventKey] : {};
  save.events[test.eventKey] = { ...base, active: true, stage: test.stage };
  if ('completed' in save.events[test.eventKey]) save.events[test.eventKey].completed = false;
  if (test.eventKey in payload.videoMeta) {
    save.events[test.eventKey].introVideoCompleted = test.stage === 'video' ? false : true;
    save.events[test.eventKey].stageAfterVideo = test.stage === 'video' ? payload.videoMeta[test.eventKey].stageAfterVideo : '';
  }
  const migrated = migrateState(JSON.parse(JSON.stringify(save)));
  const actual = migrated?.events?.[test.eventKey];
  checked += 1;
  if (!actual || actual.active !== true || actual.stage !== test.stage) {
    failures.push(`${test.eventKey}:${test.stage} -> active=${String(actual?.active)} stage=${String(actual?.stage)}`);
    continue;
  }
  if (test.stage === 'video' && test.eventKey in payload.videoMeta) {
    const expectedResume = payload.videoMeta[test.eventKey].stageAfterVideo;
    if (actual.introVideoCompleted !== false || actual.stageAfterVideo !== expectedResume) {
      failures.push(`${test.eventKey}:video metadata -> introVideoCompleted=${String(actual.introVideoCompleted)} stageAfterVideo=${String(actual.stageAfterVideo)} (expected false/${expectedResume})`);
    }
  }
}
process.stdout.write(JSON.stringify({checked, failures}));
'''

with tempfile.TemporaryDirectory(prefix='jj-event-roundtrip-') as temp_name:
    temp = Path(temp_name)
    shutil.copy2(GAME_DATA, temp / 'game-data-under-test.mjs')
    (temp / 'runner.mjs').write_text(runner, encoding='utf-8')
    payload_path = temp / 'cases.json'
    payload_path.write_text(json.dumps({'cases': cases, 'videoMeta': video_meta}, ensure_ascii=False), encoding='utf-8')
    proc = subprocess.run(
        [node, str(temp / 'runner.mjs'), str(payload_path)],
        cwd=temp,
        text=True,
        capture_output=True,
    )

if proc.returncode != 0:
    print('EVENT SAVE ROUNDTRIP AUDIT: FAIL')
    print('ERROR: Node runner failed.')
    if proc.stderr.strip():
        print(proc.stderr.strip())
    sys.exit(1)

try:
    result = json.loads(proc.stdout)
except Exception as exc:
    print('EVENT SAVE ROUNDTRIP AUDIT: FAIL')
    print(f'ERROR: Could not parse runner output: {exc}')
    print(proc.stdout)
    sys.exit(1)

failures = result.get('failures') or []
if failures:
    print('EVENT SAVE ROUNDTRIP AUDIT: FAIL')
    for failure in failures:
        print(f'ERROR: {failure}')
    print(f'CHECKED: {result.get("checked", 0)} active event stages')
    sys.exit(1)

print('EVENT SAVE ROUNDTRIP AUDIT: PASS')
print(f'OK: {result.get("checked", 0)} active event stages survived JSON save + migrateState()')
print('OK: westernUnionEvent video resume metadata preserved')
print('OK: tattooWomanAmberEvent video resume metadata preserved')
print('OK: grayHoodAquariumEvent video resume metadata preserved')
