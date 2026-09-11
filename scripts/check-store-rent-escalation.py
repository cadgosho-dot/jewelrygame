#!/usr/bin/env python3
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'js/app.js').read_text(encoding='utf-8')

required = [
    'const STORE_RENT_ESCALATION_PERIOD_DAYS = 360;',
    'const STORE_RENT_ESCALATION_MAX_YEARS = 10;',
    'const STORE_RENT_ESCALATION_RATE = 1.2;',
    'const STORE_RENT_ESCALATION_ROUNDING_UNIT = 1000;',
    'Math.floor(elapsedDays / STORE_RENT_ESCALATION_PERIOD_DAYS)',
    'Math.ceil((rent * STORE_RENT_ESCALATION_RATE) / STORE_RENT_ESCALATION_ROUNDING_UNIT)',
    '(state?.store?.branches || []).find',
    'Number(branch?.rentedDay)',
]
for needle in required:
    if needle not in APP:
        raise SystemExit(f'STORE RENT ESCALATION: missing {needle}')

def rent_for(base, elapsed_days):
    years = min(10, max(0, elapsed_days) // 360)
    rent = base
    for _ in range(years):
        rent = math.ceil((rent * 1.2) / 1000) * 1000
    return rent

cases = {
    150000: [150000, 180000, 216000, 260000, 312000, 375000, 450000, 540000, 648000, 778000, 934000],
    400000: [400000, 480000, 576000, 692000, 831000, 998000, 1198000, 1438000, 1726000, 2072000, 2487000],
    700000: [700000, 840000, 1008000, 1210000, 1452000, 1743000, 2092000, 2511000, 3014000, 3617000, 4341000],
}
for base, expected in cases.items():
    actual = [rent_for(base, year * 360) for year in range(11)]
    if actual != expected:
        raise SystemExit(f'STORE RENT ESCALATION: {base} sequence mismatch: {actual}')

boundary = [
    (150000, 359, 150000),
    (150000, 360, 180000),
    (150000, 719, 180000),
    (150000, 720, 216000),
    (150000, 3599, 778000),
    (150000, 3600, 934000),
    (150000, 99999, 934000),
]
for base, elapsed, expected in boundary:
    actual = rent_for(base, elapsed)
    if actual != expected:
        raise SystemExit(f'STORE RENT ESCALATION boundary failed: {base}, {elapsed}: {actual} != {expected}')

print('STORE RENT ESCALATION: PASS')
