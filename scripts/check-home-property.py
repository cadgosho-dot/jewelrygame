#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'js/finance/home-property.js'
CONTROLLER = ROOT / 'js/finance/home-property-controller.js'
APP = ROOT / 'js/app.js'
CORE = ROOT / 'js/game-data-core.js'
VERSION = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()

required = [
    ROOT / 'assets/images/home-property-b.png',
    ROOT / 'assets/images/home-property-b-portrait.png',
]
for path in required:
    if not path.is_file() or path.stat().st_size <= 0:
        raise SystemExit(f'FAIL: missing home property asset: {path.relative_to(ROOT)}')

app = APP.read_text(encoding='utf-8')
controller = CONTROLLER.read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
if 'export const HOME_MONTHLY_RENT = 70000;' not in core:
    raise SystemExit('FAIL: property A rent baseline changed')

app_checks = [
    './finance/home-property-controller.js?v=',
    'homePropertyController.isUnlocked()',
    'homePropertyController.renderView()',
    'homePropertyController.currentRent()',
    'homePropertyController.backgroundAsset()',
    'homePropertyController.processRent()',
    "case 'open-home-property'",
    "case 'select-home-property'",
    "case 'move-home-property'",
]
controller_checks = [
    'data-action="select-home-property"',
    'data-action="move-home-property"',
    '物件A',
    '物件Ｂ',
    '${asset}.png',
    "const selectorTopGap = isPortraitLayout() ? '72px' : '32px';",
    'margin:${selectorTopGap} 0 14px;',
    'border:1.25px solid rgba(232,196,117,.82);',
    'background:transparent!important;',
    'box-shadow:none!important;',
    'backdrop-filter:none!important;',
    "const HOME_PROPERTY_MENU_STYLE_ID = 'home-property-menu-spacing-style';",
    'button[data-action="open-home-property"]{margin-top:18px;}',
    'class="home-property-contract-badge"',
    'background:transparent;color:#fff7e6;',
    '>契約中</div>',
    "${selected === 'A' ? '✓ ' : ''}物件A",
    "${selected === 'B' ? '✓ ' : ''}物件Ｂ",
    'home-property-move-placeholder',
    'visibility:hidden;pointer-events:none;',
    'aria-hidden="true" tabindex="-1"',
    "lastProcessedHomeRentMonth = `${moveDate.getFullYear()}-${String(moveDate.getMonth() + 1).padStart(2, '0')}`",
    'HOME_MOVE_COST',
    'homePropertyMoveTotal',
    'homePropertyMonthlyRent',
]
for marker in app_checks:
    if marker not in app:
        raise SystemExit(f'FAIL: missing app integration: {marker}')
for marker in controller_checks:
    if marker not in controller:
        raise SystemExit(f'FAIL: missing controller integration: {marker}')

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

if f"./finance/home-property-controller.js?v={VERSION}" not in app:
    raise SystemExit('FAIL: home-property controller import VERSION mismatch')
print('HOME PROPERTY AUDIT: PASS')
