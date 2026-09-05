#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')
CURRENT = (ROOT / 'scripts/check-current.py').read_text(encoding='utf-8')
TEST = (ROOT / 'tools/test-craft-regression.mjs').read_text(encoding='utf-8')

def function_source(name: str) -> str:
    lines = APP.splitlines()
    marker = f'function {name}('
    for start, line in enumerate(lines):
        if marker not in line:
            continue
        depth = 0
        seen = False
        for end in range(start, len(lines)):
            row = lines[end]
            depth += row.count('{') - row.count('}')
            if '{' in row:
                seen = True
            if seen and depth <= 0:
                return '\n'.join(lines[start:end + 1])
    return ''

CRAFT = function_source('craft')
checks = {
    'craft definition exists once': APP.count('function craft(') == 1,
    'workshop operating guard retained': "if (!workshopOperating()) return showToast('工房は作業停止中です。'" in CRAFT,
    'jewelry bench guard retained': "if (!toolUsable('jewelryBench'))" in CRAFT,
    'loose mode selection guard retained': "typeof craftDraft.useLoose !== 'boolean'" in CRAFT,
    'available time guard retained': 'if (!canSpendHours(hours))' in CRAFT,
    'material guard retained': 'if (!requirements.enoughLoose || !requirements.enoughMetal)' in CRAFT,
    'capacity guard retained': "item.status !== 'sold'" in CRAFT and 'state.inventory.capacity' in CRAFT,
    'loose inventory consumption retained': 'adjustLooseInventory(craftDraft.gem, craftDraft.looseShape, -requirements.requiredLooseQuantity)' in CRAFT,
    'metal inventory consumption retained': 'requirements.ownedMetalWeight - requirements.requiredMetalWeight' in CRAFT,
    'craft time retained': 'spendHours(hours);' in CRAFT,
    'workshop active hours retained': 'addWorkshopActiveHours(hours);' in CRAFT,
    'quality and craftsmanship retained': 'qualityRoll()' in CRAFT and 'craftProductionProfile(craftDraft)' in CRAFT,
    'jewelry item creation retained': 'const jewelry = {' in CRAFT and 'createdDay: state.game.day' in CRAFT,
    'jewelry inventory push retained': 'state.inventory.jewelry.push(jewelry);' in CRAFT,
    'daily crafted record retained': 'state.daily.crafted.push(jewelry.id);' in CRAFT,
    'player crafted count retained': 'state.store.playerCraftedCount' in CRAFT,
    'artisan xp retained': 'addArtisanXp(xp);' in CRAFT,
    'order completion retained': "order.status = '完成';" in CRAFT and 'order.jewelryId = jewelry.id;' in CRAFT,
    'order completion notification retained': "addNotification('注文品が完成しました'" in CRAFT,
    'tool failure check retained': 'checkWorkshopToolFailure()' in CRAFT,
    'completion id retained': 'completionId = jewelry.id;' in CRAFT,
    'save retained': 'saveGame();' in CRAFT,
    'completion screen route retained': "setScreen('completion'" in CRAFT,
    'dynamic harness extracts current craft': "extractFunctionSource('craft')" in TEST,
    'standalone craft regression case': 'testSuccessfulStandaloneCraft' in TEST,
    'no loose regression case': 'testCraftWithoutLooseDoesNotConsumeLoose' in TEST,
    'order craft regression case': 'testOrderCraftMarksOrderComplete' in TEST,
    'guard regression case': 'testCraftGuardRails' in TEST,
    'current audit registration': "'ジュエリー制作処理保護'" in CURRENT and 'check-craft-regression.py' in CURRENT,
}

failed = []
for label, ok in checks.items():
    print(('OK' if ok else 'NG') + ': ' + label)
    if not ok:
        failed.append(label)

syntax = subprocess.run(['node', '--check', 'tools/test-craft-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
if syntax.returncode:
    print(syntax.stderr, end='')
    failed.append('node syntax')

unit = subprocess.run(['node', 'tools/test-craft-regression.mjs'], cwd=ROOT, text=True, capture_output=True)
print(unit.stdout, end='')
if unit.returncode:
    print(unit.stderr, end='')
    failed.append('dynamic regression')

if failed:
    print('CRAFT PROTECTION: FAIL')
    for label in failed:
        print('- ' + label)
    sys.exit(1)

print('CRAFT PROTECTION: PASS')
