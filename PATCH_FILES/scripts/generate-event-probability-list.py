#!/usr/bin/env python3
"""Generate the current event probability reference from js/app.js constants.

The output is documentation only. Numeric probabilities are evaluated from the
actual active constants so documentation cannot silently drift from code.
"""
from __future__ import annotations

import argparse
import ast
import operator
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'js' / 'app.js'
VERSION_FILE = ROOT / 'VERSION'
OUTPUT = ROOT / 'EVENT_PROBABILITY_LIST.md'
CONST_RE = re.compile(r'^const\s+([A-Z0-9_]+)\s*=\s*(.+?);\s*$', re.M)

BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
}
UNARY_OPS = {ast.UAdd: operator.pos, ast.USub: operator.neg}


def eval_expr(expr: str, values: dict[str, float]) -> float:
    node = ast.parse(expr, mode='eval').body

    def walk(n: ast.AST) -> float:
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)):
            return float(n.value)
        if isinstance(n, ast.Name) and n.id in values:
            return float(values[n.id])
        if isinstance(n, ast.BinOp) and type(n.op) in BIN_OPS:
            return BIN_OPS[type(n.op)](walk(n.left), walk(n.right))
        if isinstance(n, ast.UnaryOp) and type(n.op) in UNARY_OPS:
            return UNARY_OPS[type(n.op)](walk(n.operand))
        raise ValueError(f'unsupported expression: {expr}')

    return walk(node)


def constants(text: str) -> tuple[dict[str, str], dict[str, int]]:
    exprs: dict[str, str] = {}
    lines: dict[str, int] = {}
    for match in CONST_RE.finditer(text):
        exprs[match.group(1)] = match.group(2).strip()
        lines[match.group(1)] = text.count('\n', 0, match.start()) + 1
    return exprs, lines


def numeric_values(exprs: dict[str, str]) -> dict[str, float]:
    values: dict[str, float] = {}
    pending = dict(exprs)
    for _ in range(len(pending) + 2):
        progressed = False
        for name, expr in list(pending.items()):
            try:
                values[name] = eval_expr(expr, values)
            except Exception:
                continue
            del pending[name]
            progressed = True
        if not progressed:
            break
    return values


def pct(value: float) -> str:
    percent = value * 100
    if abs(percent - round(percent)) < 1e-9:
        return f'{int(round(percent))}%'
    if percent >= 1:
        return f'{percent:.2f}'.rstrip('0').rstrip('.') + '%'
    return f'{percent:.3f}'.rstrip('0').rstrip('.') + '%'


def approx_fraction(value: float) -> str:
    if value <= 0:
        return '—'
    inv = 1 / value
    if abs(inv - round(inv)) < 0.03:
        return f'約1/{int(round(inv))}'
    return f'約1/{inv:.1f}'


EVENT_GROUPS = [
    ('料理・飲食', [
        ('SUSHI_CHEF_EVENT_CHANCE', '回転寿司・店主無料イベント', '対象の回転寿司利用時'),
        ('CYCLOPS_EVENT_CHANCE', 'コンビニ・サイクロプス', '対象のコンビニ利用時'),
        ('WHITE_BUNNY_ICE_EVENT_CHANCE', 'ホワイト・バニー（アイス）', '対象のアイス利用時'),
        ('TERRY_CALIFORNIA_EVENT_CHANCE', 'テリー・カリフォルニア', '対象のハンバーガー利用時'),
        ('GANESHA_TUSK_EVENT_CHANCE', 'ガネーシャ', '対象のインド料理利用時'),
        ('MYSTERY_CHINESE_MEAL_EVENT_CHANCE', '謎の中華料理', '対象の中華料理利用時'),
        ('EMERALD_CAPTAIN_KEBAB_EVENT_CHANCE', 'エメラルド班班長', '対象のケバブ利用時'),
        ('GRAY_HOOD_AQUARIUM_EVENT_CHANCE', '韓国料理・水槽解放', '366日目以降・水槽未解放などの条件を満たす時'),
        ('RIDLEY_OKAZAKI_SOBA_EVENT_CHANCE', 'リドリー岡崎（そば）', '対象の立ち食いそば利用時'),
    ]),
    ('御徒町・街', [
        ('OKACHIMACHI_TOLL_EVENT_CHANCE', '御徒町・通行料', '御徒町の対象判定時'),
        ('PANDA_MUSIC_EVENT_CHANCE', 'パンダ音楽', '御徒町の新規イベント判定時'),
        ('CINEMA_VISIT_EVENT_CHANCE', '映画館', '映画館の対象判定時'),
        ('APPRENTICE_CINEMA_EVENT_CHANCE', '見習い職人・映画館', '映画館の対象判定時'),
        ('WRIST_FOUND_EVENT_CHANCE', '手首を拾った', '御徒町の対象判定時'),
        ('OYATSU_DAISUKI_EVENT_CHANCE', 'おやつ大好き', '水槽解放済み・18:00まで・1日1回など'),
        ('SPEED_STAR_EVENT_CHANCE', 'スピード・スター', '御徒町の対象判定時'),
        ('STORYTELLER_EVENT_CHANCE', 'ストーリーテラー', '18:00以降などの条件を満たす時'),
        ('CLOCK_TOWER_DONATION_EVENT_CHANCE', '時計塔寄付', '対象条件を満たす時'),
    ]),
    ('店舗・g-Lab.・工房', [
        ('STORE_THEFT_EVENT_CHANCE', '店舗・老婆の窃盗', '店舗の対象判定時'),
        ('ROBBERY_DAILY_CHANCE', '店舗・強盗', '日次対象判定。木刀効果中はこの確率の50%'),
        ('GLAB_VISIT_VIDEO_EVENT_CHANCE', 'g-Lab.訪問動画', 'g-Lab.の新規イベント判定時'),
        ('KAWAHARA_KNOWLEDGE_EVENT_CHANCE', 'カワハラ加工知識', 'g-Lab.の新規イベント判定時'),
        ('KAPPA_JADE_EVENT_CHANCE', '河原の河童・翡翠', '河原選択・1日1回など'),
        ('WORKSHOP_KAPPA_JADE_EVENT_CHANCE', '工房の河童・翡翠', '河原の河童経験後・クールダウン等'),
        ('YOWAMUSHI_ROSE_QUARTZ_EVENT_CHANCE', '弱虫ローズクォーツ', '工房の対象判定時'),
        ('ONE_LOVE_EVENT_CHANCE', 'ONE LOVE', '181日目以降・180日クールダウンなど'),
    ]),
    ('その他', [
        ('TATTOO_WOMAN_AMBER_EVENT_CHANCE', 'タトゥー女性・琥珀', '対象施設の判定時'),
        ('HAUNTING_EVENT_DAILY_CHANCE', '怪異', '日次対象判定'),
        ('ALIEN_ABDUCTION_DAILY_CHANCE', '宇宙人誘拐', '日次対象判定'),
    ]),
]


def generate() -> str:
    text = APP.read_text(encoding='utf-8')
    exprs, lines = constants(text)
    values = numeric_values(exprs)
    version = VERSION_FILE.read_text(encoding='utf-8').strip()

    required = {name for _, events in EVENT_GROUPS for name, _, _ in events}
    missing = sorted(name for name in required if name not in values)
    if missing:
        raise RuntimeError('numeric event constants could not be evaluated: ' + ', '.join(missing))

    multiplier = values['MEAL_EVENT_RATE_MULTIPLIER']
    lines_out = [
        '# EVENT_PROBABILITY_LIST — JEWELRY×JEWELRY',
        '',
        f'> 現行実装基準: **v{version}**',
        '> 数値は `js/app.js` の有効な定数から自動生成する。手入力で確率を書き換えない。',
        '> 条件を満たした各判定での確率であり、「N回目に必ず発生」を意味しない。',
        '',
        '## 共通倍率',
        '',
        f'- `MEAL_EVENT_RATE_MULTIPLIER` = **{multiplier:g}倍**。',
        f'- 従来の `1/30` 系料理イベントは **{pct(values["MEAL_RANDOM_EVENT_CHANCE"])}**。',
        f'- 韓国料理の水槽解放イベントは `1/15 × {multiplier:g}` = **{pct(values["GRAY_HOOD_AQUARIUM_EVENT_CHANCE"])}**。',
        f'- ホワイト・バニーは個別指定で **{pct(values["WHITE_BUNNY_ICE_EVENT_CHANCE"])}**。',
        '',
    ]

    for heading, events in EVENT_GROUPS:
        lines_out.extend([f'## {heading}', '', '| イベント | 現行確率 | 目安 | 主な前提 | コード定数 |', '|---|---:|---:|---|---|'])
        for const, label, condition in events:
            value = values[const]
            lines_out.append(
                f'| {label} | **{pct(value)}** | {approx_fraction(value)} | {condition} | `{const}` (`js/app.js:{lines[const]}`) |'
            )
        lines_out.append('')

    lines_out.extend([
        '## 回数・日数レンジで決まる代表イベント',
        '',
        f'- 御徒町4択: **{int(values["OKACHIMACHI_QUIZ_TRIGGER_MIN"])}〜{int(values["OKACHIMACHI_QUIZ_TRIGGER_MAX"])}回来訪**。',
        f'- ルース屋3Dメガネ: **{int(values["LOOSE_SHOP_ORIGINAL_QUIZ_TRIGGER_MIN"])}〜{int(values["LOOSE_SHOP_ORIGINAL_QUIZ_TRIGGER_MAX"])}回来訪**。',
        f'- 病院イベント初回: **401日目以降**、初回待ち **{int(values["HOSPITAL_EVENT_FIRST_WAIT_MIN_DAYS"])}〜{int(values["HOSPITAL_EVENT_FIRST_WAIT_MAX_DAYS"])}日**。',
        f'- 病院イベント2回目以降: **{int(values["HOSPITAL_EVENT_REPEAT_MIN_DAYS"])}〜{int(values["HOSPITAL_EVENT_REPEAT_MAX_DAYS"])}日**間隔。',
        f'- Blues Juke 初回: **{int(values["BLUES_JUKE_EVENT_FIRST_TRIGGER_MIN"])}〜{int(values["BLUES_JUKE_EVENT_FIRST_TRIGGER_MAX"])}日目**。以後 **{int(values["BLUES_JUKE_EVENT_REPEAT_MIN_DAYS"])}〜{int(values["BLUES_JUKE_EVENT_REPEAT_MAX_DAYS"])}日**間隔。',
        '',
        '## 判定順',
        '',
        '- 新規イベント同士が競合する主要箇所では候補順をシャッフルし、コード上の並び順による偏りを減らす。',
        '- 進行中イベントの再開と誕生日優先は固定順を維持する。',
        '- 個別確率や発生条件は、候補順のシャッフルとは別に判定される。',
        '',
        '## 更新方法',
        '',
        '```bash',
        'python3 scripts/generate-event-probability-list.py --write',
        'python3 scripts/generate-event-probability-list.py --check',
        '```',
        '',
        '`--check` は現行コードから再生成した内容とこの文書が一致しなければFAILする。',
        '',
    ])
    return '\n'.join(lines_out)


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    try:
        rendered = generate()
        if args.write:
            OUTPUT.write_text(rendered, encoding='utf-8')
            print(f'WROTE: {OUTPUT.relative_to(ROOT)}')
            return 0
        current = OUTPUT.read_text(encoding='utf-8') if OUTPUT.is_file() else ''
        if current != rendered:
            print('EVENT PROBABILITY DOC: FAIL')
            print('- EVENT_PROBABILITY_LIST.md が現行 js/app.js と一致しません')
            return 1
        print('EVENT PROBABILITY DOC: PASS')
        return 0
    except (OSError, RuntimeError, ValueError) as exc:
        print(f'EVENT PROBABILITY DOC: FAIL\n- {exc}')
        return 1


if __name__ == '__main__':
    sys.exit(main())
