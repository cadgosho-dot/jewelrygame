#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-polish-rough-regression.mjs').read_text(encoding='utf-8')
SYNC_PATH = ROOT / '.github/workflows/phase8-sync-v010897.yml'
SYNC = SYNC_PATH.read_text(encoding='utf-8') if SYNC_PATH.is_file() else ''


def function_source(name: str) -> str:
    marker = f'function {name}('
    start = APP.find(marker)
    if start < 0:
        return ''
    depth = 0
    seen = False
    quote = None
    escaped = False
    template_depth = 0
    i = start
    while i < len(APP):
        ch = APP[i]
        nxt = APP[i + 1] if i + 1 < len(APP) else ''
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif quote == '`' and ch == '$' and nxt == '{':
                template_depth += 1
                i += 1
            elif quote == '`' and ch == '}' and template_depth > 0:
                template_depth -= 1
            elif ch == quote and template_depth == 0:
                quote = None
            i += 1
            continue
        if ch in ('"', "'", '`'):
            quote = ch
        elif ch == '{':
            depth += 1
            seen = True
        elif ch == '}':
            depth -= 1
            if seen and depth == 0:
                return APP[start:i + 1]
        i += 1
    return ''


POLISH = function_source('polishRough')
registered_now = "'原石研磨処理保護'" in CURRENT and 'check-polish-rough-regression.py' in CURRENT
registered_by_sync = "'原石研磨処理保護'" in SYNC and 'check-polish-rough-regression.py' in SYNC
checks = {
    'polishRough definition exists once': APP.count('function polishRough()') == 1,
    'workshop operating guard retained': "if (!workshopOperating()) return showToast('工房は作業停止中です。', 'error');" in POLISH,
    'shape normalization retained': 'selectedPolishingShape = normalizeLooseShape(selectedPolishing, selectedPolishingShape);' in POLISH,
    'polishing machine guard retained': "if (!toolUsable('polishingMachine'))" in POLISH,
    'diamond lap guard retained': "if (selectedPolishing === 'diamond' && !toolUsable('diamondPolishingLap'))" in POLISH,
    'rough inventory guard retained': "if (!gem || state.inventory.rough[selectedPolishing] < 1)" in POLISH,
    'available time guard retained': "if (!canSpendHours(POLISHING_HOURS))" in POLISH,
    'rough inventory consumption retained': 'state.inventory.rough[selectedPolishing] -= 1;' in POLISH,
    'loose inventory increase retained': 'adjustLooseInventory(selectedPolishing, selectedPolishingShape, 1);' in POLISH,
    'polishing time retained': 'spendHours(POLISHING_HOURS);' in POLISH,
    'workshop active hours retained': 'addWorkshopActiveHours(POLISHING_HOURS);' in POLISH,
    'daily polished record retained': 'state.daily.polished.push({ gem: selectedPolishing, looseShape: selectedPolishingShape, qty: 1 });' in POLISH,
    'diamond polished count retained': 'diamondLapEvent.totalPolished = Math.max(0, Number(diamondLapEvent.totalPolished) || 0) + 1;' in POLISH,
    'diamond lap failure chance retained': "selectedPolishing === 'diamond'" in POLISH and 'Math.random() < (1 / 50)' in POLISH,
    'diamond lap unusable transition retained': "diamondLap.status = 'unusable';" in POLISH,
    'diamond lap failure notification retained': 'ダイヤモンド研磨用平面研磨盤が故障しました' in POLISH,
    'artisan xp retained': 'addArtisanXp(1);' in POLISH,
    'save retained': 'saveGame();' in POLISH,
    'completion sfx retained': "playSfx('loose-sparkle', { gain: 1.12 });" in POLISH,
    'completion vibration retained': 'vibrate([35, 25, 55]);' in POLISH,
    'render retained': 'render();' in POLISH,
    'completion modal retained': "className: 'polishing-result-modal'" in POLISH and 'hideActions: true' in POLISH,
    'dynamic harness extracts current polishRough': "extractFunctionSource('polishRough')" in TEST,
    'successful polishing regression case': 'testSuccessfulPolishing' in TEST,
    'diamond lap failure regression case': 'testDiamondLapFailurePath' in TEST,
    'guard regression case': 'testPolishingGuardRails' in TEST,
    'current audit registration or sync registration': registered_now or registered_by_sync,
}

failed: list[str] = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

syntax = subprocess.run(['node', '--check', 'tools/test-polish-rough-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
if syntax.returncode:
    print(syntax.stderr, end='')
    failed.append('node syntax')

unit = subprocess.run(['node', 'tools/test-polish-rough-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('dynamic regression')

if failed:
    print('POLISH ROUGH PROTECTION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)

print('polishRough() の原石消費・ルース生成・時間・工房稼働・研磨記録・研磨盤故障・職人経験値・保存・完了表示・主要ガードを固定しました。')
print('POLISH ROUGH PROTECTION: PASS')
