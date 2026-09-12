#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'js/finance/home-property.js'
APP = ROOT / 'js/app.js'
CORE = ROOT / 'js/game-data-core.js'
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()

required = [
    ROOT / 'assets/images/home-property-b.webp',
    ROOT / 'assets/images/home-property-b-portrait.webp',
]
for path in required:
    if not path.is_file() or path.stat().st_size <= 0:
        raise SystemExit(f'FAIL: missing home property asset: {path.relative_to(ROOT)}')

app = APP.read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
if 'export const HOME_MONTHLY_RENT = 70000;' not in core:
    raise SystemExit('FAIL: property A rent baseline changed')
checks = [
    "./finance/home-property.js?v=",
    "data-action=\"open-home-property\"",
    "data-action=\"select-home-property\"",
    "data-action=\"move-home-property\"",
    "currentHomeMonthlyRent()",
    "homePropertyBackgroundAsset(currentHomePropertyId(), isPortraitLayout())",
]
for marker in checks:
    if marker not in app:
        raise SystemExit(f'FAIL: missing app integration: {marker}')

node_code = r'''import {
  HOME_PROPERTY_UNLOCK_DAY, HOME_MOVE_COST, HOME_PROPERTY_B_MONTHLY_RENT,
  normalizeHomeProperty, homePropertyUnlocked, homePropertyMonthlyRent,
  homePropertyMoveTotal, homePropertyBackgroundAsset,
} from './js/finance/home-property.js';
const fail = (m) => { throw new Error(m); };
if (HOME_PROPERTY_UNLOCK_DAY !== 351) fail('unlock day');
if (HOME_MOVE_COST !== 1000000) fail('move cost');
if (HOME_PROPERTY_B_MONTHLY_RENT !== 200000) fail('B rent');
if (homePropertyUnlocked(350)) fail('350 must be locked');
if (!homePropertyUnlocked(351)) fail('351 must be unlocked');
if (normalizeHomeProperty(undefined) !== 'A') fail('legacy save default');
if (homePropertyMonthlyRent('A', 70000) !== 70000) fail('A rent');
if (homePropertyMonthlyRent('B', 70000) !== 200000) fail('B rent resolver');
if (homePropertyMoveTotal('A', 70000) !== 1070000) fail('A move total');
if (homePropertyMoveTotal('B', 70000) !== 1200000) fail('B move total');
if (homePropertyBackgroundAsset('A', false) !== 'sleep') fail('A landscape');
if (homePropertyBackgroundAsset('A', true) !== 'sleep-portrait') fail('A portrait');
if (homePropertyBackgroundAsset('B', false) !== 'home-property-b') fail('B landscape');
if (homePropertyBackgroundAsset('B', true) !== 'home-property-b-portrait') fail('B portrait');
console.log('HOME PROPERTY MODULE: PASS');'''
result = subprocess.run(['node', '--input-type=module', '-e', node_code], cwd=ROOT, text=True, capture_output=True)
if result.returncode:
    sys.stderr.write(result.stdout + result.stderr)
    raise SystemExit('FAIL: home property module behavior')

if f"./finance/home-property.js?v={VERSION}" not in app:
    raise SystemExit('FAIL: home-property import VERSION mismatch')
print('HOME PROPERTY AUDIT: PASS')
