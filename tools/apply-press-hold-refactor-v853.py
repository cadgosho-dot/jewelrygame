#!/usr/bin/env python3
from __future__ import annotations

import re
import textwrap
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
    if brace < 0:
        raise SystemExit(f'{name}: opening brace not found')

    depth = 0
    i = brace
    quote: str | None = None
    escaped = False
    line_comment = False
    block_comment = False
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ''
        if line_comment:
            if ch == '\n':
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == '*' and nxt == '/':
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == '/' and nxt == '/':
            line_comment = True
            i += 2
            continue
        if ch == '/' and nxt == '*':
            block_comment = True
            i += 2
            continue
        if ch in ("'", '"', '`'):
            quote = ch
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                while end < len(text) and text[end] in ' \t':
                    end += 1
                if end < len(text) and text[end] == '\r':
                    end += 1
                if end < len(text) and text[end] == '\n':
                    end += 1
                return start, end, text[start:end]
        i += 1
    raise SystemExit(f'{name}: closing brace not found')


def case_region(text: str, action: str) -> tuple[int, int, str]:
    marker = f"    case '{action}':"
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'{action}: click case not found')
    next_case = re.search(r'^    (?:case |default:)', text[start + len(marker):], re.M)
    if not next_case:
        raise SystemExit(f'{action}: next click case boundary not found')
    end = start + len(marker) + next_case.start()
    return start, end, text[start:end]


text = APP.read_text(encoding='utf-8')

# Capture and verify the production selling-price behavior before removing it.
_, _, start_block = extract_function(text, 'startSellingPriceHold')
if start_block.count('adjustShowcaseSellingPrice(button);') != 2:
    raise SystemExit('selling-price: first/repeat adjustment count changed; aborting')
if '}, 110);' not in start_block or '}, 420);' not in start_block:
    raise SystemExit('selling-price: expected 420ms delay / 110ms repeat was not found')
if start_block.count("screen !== 'showcaseDetail'") < 3:
    raise SystemExit('selling-price: showcaseDetail continuation guards changed; aborting')
if start_block.count('button.disabled') < 3:
    raise SystemExit('selling-price: disabled-button continuation guards changed; aborting')

# Preserve the exact normal-tap body (minus the old skip-next-click lifecycle,
# which is now owned by createPressHoldController.handleClick()).
case_start, case_end, selling_case = case_region(text, 'selling-price-step')
prefix = """    case 'selling-price-step': {\n      if (button.dataset.skipNextClick === 'true') {\n        delete button.dataset.skipNextClick;\n        break;\n      }\n"""
suffix = """      break;\n    }\n"""
if not selling_case.startswith(prefix) or not selling_case.endswith(suffix):
    raise SystemExit('selling-price: click case shape changed; aborting')
tap_body = selling_case[len(prefix):-len(suffix)]
tap_body = textwrap.indent(textwrap.dedent(tap_body).rstrip(), '    ')
if 'adjustShowcaseSellingPrice(button)' not in tap_body:
    raise SystemExit('selling-price: normal tap adjustment is missing')
if "showToast('販売価格を変更する商品が見つかりません。', 'error');" not in tap_body:
    raise SystemExit('selling-price: existing missing-item error fallback is missing')

# Remove only the four selling-price lifecycle state variables.
for var in (
    'sellingPriceHoldTimeout',
    'sellingPriceHoldInterval',
    'sellingPriceHoldButton',
    'sellingPriceHoldTriggered',
):
    pattern = rf'^let {re.escape(var)}\s*=\s*[^;]+;\r?\n'
    text, count = re.subn(pattern, '', text, count=1, flags=re.M)
    if count != 1:
        raise SystemExit(f'{var}: expected one legacy declaration, found {count}')

# Remove only the selling-price clear/start/finish lifecycle functions.
for fn in ('clearSellingPriceHold', 'startSellingPriceHold', 'finishSellingPriceHold'):
    start, end, _ = extract_function(text, fn)
    text = text[:start] + text[end:]

insert_marker = 'let storeScrollRestoreToken = 0;\n'
if text.count(insert_marker) != 1:
    raise SystemExit(f'selling-price controller insertion marker count={text.count(insert_marker)}')
controller = f"""let storeScrollRestoreToken = 0;\nconst sellingPricePressHold = createPressHoldController({{\n  onTap(button) {{\n{tap_body}\n  }},\n  onLongPress(button) {{\n    adjustShowcaseSellingPrice(button);\n  }},\n  holdDelayMs: 420,\n  repeatMs: 110,\n  canContinue: (button) => !button.disabled && screen === 'showcaseDetail',\n}});\n"""
text = text.replace(insert_marker, controller, 1)

replacements = [
    (
        '  if (sellingPriceButton && !sellingPriceButton.disabled) startSellingPriceHold(sellingPriceButton);',
        '  if (sellingPriceButton && !sellingPriceButton.disabled) sellingPricePressHold.start(sellingPriceButton);',
        1,
    ),
    (
        "  const sellingPriceButton = event.target.closest('[data-action=\"selling-price-step\"]') || sellingPriceHoldButton;\n  if (sellingPriceButton) finishSellingPriceHold(sellingPriceButton);",
        "  const sellingPriceButton = event.target.closest('[data-action=\"selling-price-step\"]') || sellingPricePressHold.activeButton();\n  if (sellingPriceButton) sellingPricePressHold.finish(sellingPriceButton);",
        1,
    ),
]
for old, new, expected in replacements:
    count = text.count(old)
    if count != expected:
        raise SystemExit(f'replacement boundary expected {expected}, found {count}: {old[:100]}')
    text = text.replace(old, new, expected)

cancel_old = '  clearSellingPriceHold();\n  sellingPriceHoldTriggered = false;'
if text.count(cancel_old) != 2:
    raise SystemExit(f'selling-price cancel boundary expected twice, found {text.count(cancel_old)}')
text = text.replace(cancel_old, '  sellingPricePressHold.cancel();')

# Replace the selling-price click case after all earlier edits so the captured
# body above remains the exact production tap behavior.
case_start, case_end, _ = case_region(text, 'selling-price-step')
replacement = (
    "    case 'selling-price-step': {\n"
    '      sellingPricePressHold.handleClick(button);\n'
    '      break;\n'
    '    }\n'
)
text = text[:case_start] + replacement + text[case_end:]

APP.write_text(text, encoding='utf-8')

changelog = CHANGELOG.read_text(encoding='utf-8')
marker = '## v0.10.852\n'
if changelog.count(marker) != 1:
    raise SystemExit(f'CHANGELOG v0.10.852 marker count={changelog.count(marker)}')
entry = """## v0.10.853\n- 販売価格の▲▼ボタンを、最後の第4領域として `js/ui/press-hold-controller.js` へ移行。地金・ルース・ディスプレイケースと合わせ、段階的に対象としていた4領域の長押しライフサイクル共通化を完了。\n- 販売価格固有の長押し開始420ms、110ms間隔の連続増減、長押し後の次クリック抑止を維持。\n- 商品詳細画面を離れた場合やボタンが無効になった場合に連続処理を停止する既存仕様を、controllerの任意 `canContinue` 条件として維持。既存3領域にはこの追加条件を適用せず、従来挙動を変更しない。\n- 熱帯魚屋の数量長押しは今回の4領域とは別実装のため未変更。セーブ形式、価格計算、在庫、日付、イベントstageには変更なし。\n\n## v0.10.852\n"""
CHANGELOG.write_text(changelog.replace(marker, entry, 1), encoding='utf-8')

print('SELLING PRICE PRESS HOLD REFACTOR: PASS')
print('delay=420ms repeat=110ms continuation=showcaseDetail+enabled')
