#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'js/app.js'
CHANGELOG = ROOT / 'CHANGELOG.md'


def extract_function(text: str, name: str) -> tuple[int, int, str]:
    marker = f'function {name}('
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'{name}: function not found')
    brace = text.find('{', start)
    depth = 0
    i = brace
    quote = None
    escaped = line_comment = block_comment = False
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ''
        if line_comment:
            if ch == '\n': line_comment = False
            i += 1; continue
        if block_comment:
            if ch == '*' and nxt == '/': block_comment = False; i += 2; continue
            i += 1; continue
        if quote:
            if escaped: escaped = False
            elif ch == '\\': escaped = True
            elif ch == quote: quote = None
            i += 1; continue
        if ch == '/' and nxt == '/': line_comment = True; i += 2; continue
        if ch == '/' and nxt == '*': block_comment = True; i += 2; continue
        if ch in ("'", '"', '`'): quote = ch; i += 1; continue
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                while end < len(text) and text[end] in ' \t': end += 1
                if end < len(text) and text[end] == '\r': end += 1
                if end < len(text) and text[end] == '\n': end += 1
                return start, end, text[start:end]
        i += 1
    raise SystemExit(f'{name}: closing brace not found')


def case_region(text: str, action: str) -> tuple[int, int, str]:
    marker = f"    case '{action}':"
    start = text.find(marker)
    if start < 0: raise SystemExit(f'{action}: click case not found')
    next_case = re.search(r'^    (?:case |default:)', text[start + len(marker):], re.M)
    if not next_case: raise SystemExit(f'{action}: next case not found')
    end = start + len(marker) + next_case.start()
    return start, end, text[start:end]


text = APP.read_text(encoding='utf-8')
_, _, start_block = extract_function(text, 'startTropicalShopQuantityHold')
if '}, 320);' not in start_block or '), 65);' not in start_block:
    raise SystemExit('tropical-shop: expected 320ms / 65ms timing not found')
if 'changeTropicalShopQuantityLongPress(delta);' not in start_block:
    raise SystemExit('tropical-shop: long-press adjustment not found')

for var in ('tropicalShopQuantityHoldTimer','tropicalShopQuantityHoldInterval','tropicalShopQuantityHoldTriggered'):
    pattern = rf'^let {re.escape(var)}\s*=\s*[^;]+;\r?\n'
    text, count = re.subn(pattern, '', text, count=1, flags=re.M)
    if count != 1: raise SystemExit(f'{var}: declaration count={count}')

for fn in ('clearTropicalShopQuantityHold','startTropicalShopQuantityHold','finishTropicalShopQuantityHold'):
    start, end, _ = extract_function(text, fn)
    text = text[:start] + text[end:]

marker = 'let speedStarRunTimer = null;\n'
if text.count(marker) != 1: raise SystemExit('controller insertion marker mismatch')
controller = """let speedStarRunTimer = null;\nconst tropicalShopQuantityPressHold = createPressHoldController({\n  onTap(button) {\n    changeTropicalShopQuantity(button.dataset.delta);\n  },\n  onLongPress(button) {\n    changeTropicalShopQuantityLongPress(button.dataset.delta);\n  },\n  holdingClass: null,\n});\n"""
text = text.replace(marker, controller, 1)

pairs = [
    ('    startTropicalShopQuantityHold(tropicalButton);', '    tropicalShopQuantityPressHold.start(tropicalButton);'),
    ('  if (tropicalButton) finishTropicalShopQuantityHold(tropicalButton);', '  if (tropicalButton) tropicalShopQuantityPressHold.finish(tropicalButton);'),
]
for old, new in pairs:
    if text.count(old) != 1: raise SystemExit(f'replacement mismatch: {old}')
    text = text.replace(old, new, 1)

cancel_old = '  clearTropicalShopQuantityHold();\n  tropicalShopQuantityHoldTriggered = false;'
if text.count(cancel_old) != 2: raise SystemExit(f'cancel boundary count={text.count(cancel_old)}')
text = text.replace(cancel_old, '  tropicalShopQuantityPressHold.cancel();')

close_old = 'function closeTropicalShopQuantity(){ if(screenData?.tropicalModal){clearTropicalShopQuantityHold();delete screenData.tropicalModal;render();} }'
close_new = 'function closeTropicalShopQuantity(){ if(screenData?.tropicalModal){tropicalShopQuantityPressHold.cancel();delete screenData.tropicalModal;render();} }'
if text.count(close_old) != 1: raise SystemExit('close tropical quantity boundary mismatch')
text = text.replace(close_old, close_new, 1)

start, end, _ = case_region(text, 'tropical-shop-qty')
replacement = "    case 'tropical-shop-qty':\n      tropicalShopQuantityPressHold.handleClick(button);\n      break;\n"
text = text[:start] + replacement + text[end:]

APP.write_text(text, encoding='utf-8')

changelog = CHANGELOG.read_text(encoding='utf-8')
marker = '## v0.10.853\n'
if changelog.count(marker) != 1: raise SystemExit('CHANGELOG marker mismatch')
entry = """## v0.10.854\n- 熱帯魚屋の数量▲▼ボタンのタップ／長押しライフサイクルを `js/ui/press-hold-controller.js` へ移行。\n- 従来の長押し開始320ms、65ms間隔の連続増減、既存の `longPressQuantityDelta` 加速、長押し後の次クリック抑止、pointercancel／window blur／数量モーダルclose時の解除を維持。\n- 熱帯魚屋では従来 `is-holding` 表示クラスを使っていなかったため、controllerの `holdingClass: null` で見た目を変更しない。既存4領域の既定 `is-holding` は変更なし。\n- 魚・水草・ディスプレイの購入処理、水槽反映、死亡・枯死ロジック、セーブ形式、価格計算、日付、イベントstageには変更なし。\n\n## v0.10.853\n"""
CHANGELOG.write_text(changelog.replace(marker, entry, 1), encoding='utf-8')
print('TROPICAL SHOP PRESS HOLD REFACTOR: PASS')
print('delay=320ms repeat=65ms holdingClass=null')
