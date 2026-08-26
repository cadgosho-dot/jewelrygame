#!/usr/bin/env python3
"""Validate all seasonal main-screen background periods and assets."""
from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'js' / 'app.js'
SW = ROOT / 'sw.js'
ASSET_DIR = ROOT / 'assets' / 'images'

SEASONS = [
    {
        'label': 'お正月', 'func': 'isNewYearMainPeriod', 'asset': 'main-menu-new-year',
        'before': '2026-12-31', 'start': '2027-01-01', 'end': '2027-01-03', 'after': '2027-01-04',
    },
    {
        'label': '春', 'func': 'isSpringMainPeriod', 'asset': 'main-menu-spring',
        'before': '2027-03-24', 'start': '2027-03-25', 'end': '2027-03-31', 'after': '2027-04-01',
    },
    {
        'label': '七夕', 'func': 'isTanabataMainPeriod', 'asset': 'main-menu-tanabata',
        'before': '2027-07-06', 'start': '2027-07-07', 'end': '2027-07-07', 'after': '2027-07-08',
    },
    {
        'label': 'お盆', 'func': 'isObonMainPeriod', 'asset': 'main-menu-obon',
        'before': '2027-08-12', 'start': '2027-08-13', 'end': '2027-08-16', 'after': '2027-08-17',
    },
    {
        'label': '晩夏', 'func': 'isLateSummerMainPeriod', 'asset': 'main-menu-late-summer',
        'before': '2027-08-24', 'start': '2027-08-25', 'end': '2027-08-31', 'after': '2027-09-01',
    },
    {
        'label': 'ハロウィン', 'func': 'isHalloweenMainPeriod', 'asset': 'main-menu-halloween',
        'before': '2027-10-30', 'start': '2027-10-31', 'end': '2027-10-31', 'after': '2027-11-01',
    },
    {
        'label': '晩秋', 'func': 'isLateAutumnMainPeriod', 'asset': 'main-menu-late-autumn',
        'before': '2027-11-24', 'start': '2027-11-25', 'end': '2027-11-30', 'after': '2027-12-01',
    },
    {
        'label': 'クリスマス', 'func': 'isChristmasMainPeriod', 'asset': 'main-menu-christmas',
        'before': '2027-12-19', 'start': '2027-12-20', 'end': '2027-12-25', 'after': '2027-12-26',
    },
]


def extract_function(source: str, name: str) -> str:
    marker = re.search(rf'function\s+{re.escape(name)}\s*\(', source)
    if not marker:
        raise RuntimeError(f'function not found: {name}')
    start = marker.start()
    brace = source.find('{', marker.end())
    if brace < 0:
        raise RuntimeError(f'opening brace not found: {name}')
    depth = 0
    quote = None
    escape = False
    for i in range(brace, len(source)):
        ch = source[i]
        if quote:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == quote:
                quote = None
            continue
        if ch in "'\"`":
            quote = ch
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return source[start:i+1]
    raise RuntimeError(f'closing brace not found: {name}')


def fail(message: str) -> None:
    print(f'NG: {message}')
    raise SystemExit(1)


def main() -> None:
    source = APP.read_text(encoding='utf-8')
    sw = SW.read_text(encoding='utf-8')

    function_names = [
        'isValidGameDate', 'isMonthDayRange',
        *(season['func'] for season in SEASONS),
        'seasonalMainBackgroundAsset',
    ]
    try:
        js_functions = '\n\n'.join(extract_function(source, name) for name in function_names)
    except RuntimeError as exc:
        fail(str(exc))

    for season in SEASONS:
        for suffix in ('', '-portrait'):
            filename = f"{season['asset']}{suffix}.webp"
            path = ASSET_DIR / filename
            if not path.is_file() or path.stat().st_size <= 0:
                fail(f"{season['label']}画像がありません: assets/images/{filename}")
            sw_ref = f"./assets/images/{filename}"
            if sw_ref not in sw:
                fail(f"{season['label']}画像がService Workerのキャッシュ対象にありません: {filename}")

    node_cases = []
    for season in SEASONS:
        node_cases.append({
            **season,
            'checks': [
                [season['before'], False],
                [season['start'], True],
                [season['end'], True],
                [season['after'], False],
            ],
        })

    js = f"""
let __portrait = false;
function isPortraitLayout() {{ return __portrait; }}
function gameDate() {{ return new Date(2000, 0, 1, 12, 0, 0, 0); }}
{js_functions}
const seasons = {json.dumps(node_cases, ensure_ascii=False)};
function localDate(iso) {{
  const [y,m,d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}}
let failures = [];
for (const season of seasons) {{
  const fn = globalThis[season.func] || eval(season.func);
  for (const [iso, expected] of season.checks) {{
    const actual = !!fn(localDate(iso));
    if (actual !== expected) failures.push(`${{season.label}} ${{iso}} expected=${{expected}} actual=${{actual}}`);
  }}
  for (const portrait of [false, true]) {{
    __portrait = portrait;
    const expected = season.asset + (portrait ? '-portrait' : '');
    const actual = seasonalMainBackgroundAsset(localDate(season.start), portrait);
    if (actual !== expected) failures.push(`${{season.label}} ${{portrait ? '縦' : '横'}} expected=${{expected}} actual=${{actual}}`);
  }}
  const beforeAsset = seasonalMainBackgroundAsset(localDate(season.before), false);
  const afterAsset = seasonalMainBackgroundAsset(localDate(season.after), false);
  if (beforeAsset) failures.push(`${{season.label}} 前日に季節背景が出ています: ${{beforeAsset}}`);
  if (afterAsset) failures.push(`${{season.label}} 翌日に季節背景が出ています: ${{afterAsset}}`);
}}
if (failures.length) {{
  console.error(failures.join('\\n'));
  process.exit(1);
}}
console.log('季節イベント日付境界: PASS');
"""

    with tempfile.NamedTemporaryFile('w', suffix='.mjs', encoding='utf-8', delete=False) as fh:
        fh.write(js)
        temp_path = Path(fh.name)
    try:
        proc = subprocess.run(['node', str(temp_path)], text=True, capture_output=True)
    finally:
        temp_path.unlink(missing_ok=True)

    if proc.returncode != 0:
        if proc.stdout.strip():
            print(proc.stdout.strip())
        if proc.stderr.strip():
            print(proc.stderr.strip())
        fail('季節イベントの日付・背景切替テストに失敗しました')

    print(proc.stdout.strip())
    print('季節背景画像・Service Worker登録: PASS')
    print('SEASONAL MAIN BACKGROUND AUDIT: PASS')


if __name__ == '__main__':
    main()
